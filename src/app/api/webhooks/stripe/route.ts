// Stripe Webhook Handler - COMPLETE WITH TOKEN DISTRIBUTION
// Processes completed payments, adds tokens to user wallet, and maintains full transaction history

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { getEnvironmentConfig } from '@/lib/config';
import { createClient } from '@supabase/supabase-js';

// Get environment configuration
const config = getEnvironmentConfig();

// Initialize Stripe only if secret key is available
const stripe = config.stripe.enabled ? new Stripe(config.stripe.secretKey!, {
  apiVersion: '2024-06-20'
}) : null;

const webhookSecret = config.stripe.webhookSecret || '';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin operations
);

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('❌ [Webhook] Stripe not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      console.error('❌ [Webhook] No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('✅ [Webhook] Received event:', event.type, 'ID:', event.id);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      
      default:
        console.log(`ℹ️ [Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('❌ [Webhook] Error:', error.message);
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { status: 400 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    const { 
      userId,
      tokenAmount,
      type,
      gameType
    } = paymentIntent.metadata;

    console.log('💰 [Webhook] Payment succeeded:', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      tokenAmount,
      userId,
      type
    });

    if (!userId) {
      console.error('❌ [Webhook] No userId in payment metadata');
      return;
    }

    // Calculate token amount (if not in metadata, calculate from payment amount)
    const tokensToAdd = tokenAmount ? parseInt(tokenAmount) : Math.floor(paymentIntent.amount / 100);

    console.log(`💵 [Webhook] Adding ${tokensToAdd} tokens to user ${userId}`);

    // Call Supabase function to add tokens and record transaction
    const { data, error } = await supabase.rpc('add_tokens_from_purchase', {
      user_id_param: userId,
      token_amount_param: tokensToAdd,
      payment_amount_param: paymentIntent.amount / 100,
      stripe_payment_intent_id_param: paymentIntent.id,
      payment_method_param: paymentIntent.payment_method as string || null
    });

    if (error) {
      console.error('❌ [Webhook] Error adding tokens:', error);
      
      // If function doesn't exist, use direct INSERT (fallback)
      await addTokensDirectly(
        userId,
        tokensToAdd,
        paymentIntent.amount / 100,
        paymentIntent.id
      );
    } else {
      console.log('✅ [Webhook] Tokens added successfully:', data);
    }

    // Send confirmation email (optional)
    if (paymentIntent.receipt_email) {
      console.log(`📧 [Webhook] Would send confirmation to: ${paymentIntent.receipt_email}`);
      // TODO: Implement email sending
    }

  } catch (error: any) {
    console.error('❌ [Webhook] Error handling payment success:', error.message);
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ [Webhook] Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message);
  
  // TODO: Optionally record failed payment attempt
  // await supabase.from('payment_attempts').insert({
  //   user_id: paymentIntent.metadata.userId,
  //   payment_intent_id: paymentIntent.id,
  //   status: 'failed',
  //   error_message: paymentIntent.last_payment_error?.message
  // });
}

/**
 * Fallback method to add tokens directly if RPC function doesn't exist
 */
async function addTokensDirectly(
  userId: string,
  tokenAmount: number,
  paymentAmount: number,
  stripePaymentIntentId: string
) {
  try {
    console.log('🔄 [Webhook] Using direct INSERT fallback method');

    // Get user's current balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tokens')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ [Webhook] Error fetching user:', userError);
      return;
    }

    const currentBalance = userData?.tokens || 0;
    const newBalance = currentBalance + tokenAmount;

    console.log(`💵 [Webhook] Current balance: ${currentBalance}, New balance: ${newBalance}`);

    // Update user's token balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        tokens: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ [Webhook] Error updating user tokens:', updateError);
      return;
    }

    console.log('✅ [Webhook] User tokens updated');

    // Record in token_transactions table
    const { error: transactionError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount: tokenAmount,
        type: 'purchase',
        balance_before: currentBalance,
        balance_after: newBalance,
        transaction_type: 'token_purchase',
        description: `Purchased ${tokenAmount} tokens for $${paymentAmount.toFixed(2)}`,
        stripe_payment_intent_id: stripePaymentIntentId,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('❌ [Webhook] Error recording transaction:', transactionError);
    } else {
      console.log('✅ [Webhook] Transaction recorded in token_transactions');
    }

    // Record in purchase_history table
    const { error: purchaseError } = await supabase
      .from('purchase_history')
      .insert({
        user_id: userId,
        transaction_type: 'purchase',
        amount: paymentAmount,
        tokens_received: tokenAmount,
        description: `Purchased ${tokenAmount} tokens`,
        stripe_payment_intent_id: stripePaymentIntentId,
        created_at: new Date().toISOString()
      });

    if (purchaseError) {
      console.error('❌ [Webhook] Error recording purchase:', purchaseError);
    } else {
      console.log('✅ [Webhook] Purchase recorded in purchase_history');
    }

    console.log('✅ [Webhook] Token distribution complete via direct method');

  } catch (error: any) {
    console.error('❌ [Webhook] Error in direct token addition:', error.message);
  }
}
