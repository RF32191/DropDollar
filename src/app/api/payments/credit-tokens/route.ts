import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { UserService } from '@/lib/supabase/userService';
import { ActivityService } from '@/lib/supabase/activityService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

/**
 * Manual token credit endpoint for failed token updates after successful payments
 * This endpoint verifies the payment and credits the tokens if they weren't already credited
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [CreditTokens] Starting manual token credit...');
    
    const body = await request.json();
    const { paymentIntentId, userId } = body;

    if (!paymentIntentId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: paymentIntentId and userId' },
        { status: 400 }
      );
    }

    console.log('🔧 [CreditTokens] Payment Intent ID:', paymentIntentId);
    console.log('🔧 [CreditTokens] User ID:', userId);

    // Step 1: Verify the payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment was not successful', status: paymentIntent.status },
        { status: 400 }
      );
    }

    console.log('✅ [CreditTokens] Payment verified as successful');
    console.log('💰 [CreditTokens] Amount paid:', paymentIntent.amount, 'cents');

    // Step 2: Calculate tokens to credit (1 token = $1 = 100 cents)
    const tokensToCredit = Math.floor(paymentIntent.amount / 100);
    
    console.log('💰 [CreditTokens] Tokens to credit:', tokensToCredit);

    // Step 3: Check if this payment was already processed
    const existingTransactions = await UserService.getUserTokenTransactions(userId);
    const alreadyProcessed = existingTransactions.some(
      tx => tx.stripePaymentIntentId === paymentIntentId
    );

    if (alreadyProcessed) {
      console.log('⚠️ [CreditTokens] Payment already processed');
      
      // Get current user profile
      const userProfile = await UserService.getUserProfile(userId);
      
      return NextResponse.json({
        success: true,
        message: 'Tokens were already credited for this payment',
        alreadyProcessed: true,
        currentBalance: userProfile?.tokens || 0
      });
    }

    console.log('✅ [CreditTokens] Payment not yet processed, crediting tokens...');

    // Step 4: Get current user profile
    const currentProfile = await UserService.getUserProfile(userId);
    if (!currentProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const currentTokens = currentProfile.tokens;
    const newBalance = currentTokens + tokensToCredit;

    console.log(`💰 [CreditTokens] Current balance: ${currentTokens}`);
    console.log(`💰 [CreditTokens] New balance: ${newBalance}`);

    // Step 5: Update tokens
    const updateResult = await UserService.updateUserTokens(userId, newBalance);
    if (!updateResult) {
      throw new Error('Failed to update tokens');
    }

    console.log('✅ [CreditTokens] Tokens updated successfully');

    // Step 6: Record transaction
    await UserService.addTokenTransaction({
      userId,
      type: 'purchase',
      amount: tokensToCredit,
      description: `Manual credit for payment ${paymentIntentId} - ${tokensToCredit} tokens`,
      stripePaymentIntentId: paymentIntentId,
      metadata: {
        payment_intent_id: paymentIntentId,
        amount_paid: paymentIntent.amount / 100,
        manual_credit: true,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ [CreditTokens] Transaction recorded');

    // Step 7: Save purchase history
    await UserService.savePurchaseHistory({
      userId,
      purchaseType: 'tokens',
      amount: paymentIntent.amount / 100,
      tokensPurchased: tokensToCredit,
      stripePaymentIntentId: paymentIntentId,
      status: 'completed',
      description: `Manual credit - Purchased ${tokensToCredit} tokens`,
      metadata: {
        payment_intent_id: paymentIntentId,
        tokens: tokensToCredit,
        manual_credit: true,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ [CreditTokens] Purchase history saved');

    // Step 8: Log activity
    await ActivityService.logActivity(userId, 'token_purchase', {
      tokens: tokensToCredit,
      amount: paymentIntent.amount / 100,
      payment_intent_id: paymentIntentId,
      manual_credit: true,
      timestamp: new Date().toISOString()
    });

    console.log('✅ [CreditTokens] Activity logged');

    // Step 9: Verify final balance
    const updatedProfile = await UserService.getUserProfile(userId);
    
    console.log('✅ [CreditTokens] Manual credit completed successfully!');
    console.log('💰 [CreditTokens] Final balance:', updatedProfile?.tokens);

    return NextResponse.json({
      success: true,
      message: `Successfully credited ${tokensToCredit} tokens`,
      tokensAdded: tokensToCredit,
      newBalance: updatedProfile?.tokens || newBalance,
      paymentAmount: paymentIntent.amount / 100
    });

  } catch (error: any) {
    console.error('❌ [CreditTokens] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to credit tokens',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

