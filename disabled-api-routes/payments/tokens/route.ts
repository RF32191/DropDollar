import { NextRequest, NextResponse } from 'next/server';
import StripePaymentService from '@/lib/payments/stripeService';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { userId, tokenAmount } = await request.json();

    if (!userId || !tokenAmount || tokenAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid request: userId and positive tokenAmount required' },
        { status: 400 }
      );
    }

    // Calculate amount in cents (1 DropToken = $1.00)
    const amountInCents = tokenAmount * 100;

    // Create payment intent for token purchase
    const paymentIntent = await StripePaymentService.createPaymentIntent(
      amountInCents,
      'usd',
      {
        userId,
        type: 'listing', // Using 'listing' as the closest match for token purchase
        gameType: 'token_purchase'
      }
    );

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      },
      tokenAmount,
      amountInDollars: tokenAmount
    });

  } catch (error: any) {
    console.error('Token purchase error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create token purchase' },
      { status: 500 }
    );
  }
}

// Handle successful token purchase (webhook or confirmation)
export async function PUT(request: NextRequest) {
  try {
    const { paymentIntentId, userId, tokenAmount } = await request.json();

    if (!paymentIntentId || !userId || !tokenAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify payment with Stripe
    const paymentIntent = await StripePaymentService.confirmPaymentIntent(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Add tokens to user balance
    const { data: currentBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('drop_tokens')
      .eq('user_id', userId)
      .single();

    if (balanceError) {
      console.error('Error fetching current balance:', balanceError);
      return NextResponse.json(
        { error: 'Failed to fetch current balance' },
        { status: 500 }
      );
    }

    const newTokenBalance = (currentBalance?.drop_tokens || 0) + tokenAmount;

    // Update user balance
    const { error: updateError } = await supabase
      .from('user_balances')
      .upsert({
        user_id: userId,
        drop_tokens: newTokenBalance,
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      console.error('Error updating balance:', updateError);
      return NextResponse.json(
        { error: 'Failed to update token balance' },
        { status: 500 }
      );
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('user_transactions')
      .insert({
        user_id: userId,
        type: 'purchase',
        amount: tokenAmount,
        description: `Purchased ${tokenAmount} DropTokens`,
        status: 'completed',
        stripe_payment_intent_id: paymentIntentId
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
    }

    return NextResponse.json({
      success: true,
      newTokenBalance,
      tokensAdded: tokenAmount,
      message: `Successfully added ${tokenAmount} DropTokens to your account`
    });

  } catch (error: any) {
    console.error('Token confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm token purchase' },
      { status: 500 }
    );
  }
}
