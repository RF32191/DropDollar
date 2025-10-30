// Stripe Webhook Handler - COMPLETE WITH PAYMENT RETRIEVAL
// Retrieves full payment data from Stripe API and processes token distribution

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!stripeSecretKey || stripeSecretKey.length < 50) {
  console.error('❌ [Webhook] STRIPE_SECRET_KEY not configured properly');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20'
}) : null;

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('❌ [Webhook] Stripe not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    if (!supabase) {
      console.error('❌ [Webhook] Supabase not configured');
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      console.error('❌ [Webhook] No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('❌ [Webhook] Signature verification failed:', err.message);
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
    }

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
    console.log('💰 [Webhook] Payment succeeded:', paymentIntent.id);
    console.log('💰 [Webhook] Amount:', paymentIntent.amount / 100, 'USD');
    console.log('💰 [Webhook] Customer:', paymentIntent.customer);
    console.log('💰 [Webhook] Metadata:', paymentIntent.metadata);

    // Get payment details
    const amountPaid = paymentIntent.amount / 100; // Convert cents to dollars
    
    // Calculate tokens: 1 dollar = 10 tokens (you can adjust this ratio)
    const tokensToCredit = Math.floor(amountPaid * 10);
    
    console.log(`💵 [Webhook] Calculated: $${amountPaid} = ${tokensToCredit} tokens`);

    // Try to get userId from metadata first
    let userId = paymentIntent.metadata.userId || paymentIntent.metadata.user_id;
    
    // If no userId in metadata, try to find user by customer email
    if (!userId && paymentIntent.receipt_email) {
      console.log('🔍 [Webhook] No userId in metadata, looking up by email:', paymentIntent.receipt_email);
      
      const { data: userData, error: userError } = await supabase!
        .from('users')
        .select('id')
        .eq('email', paymentIntent.receipt_email)
        .single();
      
      if (userData && !userError) {
        userId = userData.id;
        console.log('✅ [Webhook] Found user by email:', userId);
      }
    }

    // If still no userId, try customer ID from Stripe
    if (!userId && paymentIntent.customer && typeof paymentIntent.customer === 'string') {
      console.log('🔍 [Webhook] Looking up by Stripe customer ID:', paymentIntent.customer);
      
      try {
        const customer = await stripe!.customers.retrieve(paymentIntent.customer) as Stripe.Customer;
        if (customer && !customer.deleted && customer.email) {
          console.log('✅ [Webhook] Found customer email from Stripe:', customer.email);
          
          const { data: userData, error: userError } = await supabase!
            .from('users')
            .select('id')
            .eq('email', customer.email)
            .single();
          
          if (userData && !userError) {
            userId = userData.id;
            console.log('✅ [Webhook] Found user by customer email:', userId);
          }
        }
      } catch (err) {
        console.error('⚠️ [Webhook] Error retrieving customer:', err);
      }
    }

    if (!userId) {
      console.error('❌ [Webhook] Could not determine userId for payment:', paymentIntent.id);
      console.error('❌ [Webhook] Receipt email:', paymentIntent.receipt_email);
      console.error('❌ [Webhook] Customer:', paymentIntent.customer);
      console.error('❌ [Webhook] Metadata:', paymentIntent.metadata);
      return;
    }

    console.log(`💵 [Webhook] Adding ${tokensToCredit} tokens to user ${userId}`);

    // Call Supabase function to add tokens
    const { data, error } = await supabase!.rpc('add_tokens_from_purchase', {
      user_id_param: userId,
      token_amount_param: tokensToCredit,
      payment_amount_param: amountPaid,
      stripe_payment_intent_id_param: paymentIntent.id,
      payment_method_param: paymentIntent.payment_method as string || null
    });

    if (error) {
      console.error('❌ [Webhook] Error calling add_tokens_from_purchase:', error);
      
      // Fallback: Add tokens directly
      console.log('🔄 [Webhook] Using fallback method to add tokens');
      await addTokensDirectly(userId, tokensToCredit, amountPaid, paymentIntent.id);
    } else {
      console.log('✅ [Webhook] Tokens added successfully:', data);
    }

  } catch (error: any) {
    console.error('❌ [Webhook] Error handling payment success:', error.message);
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ [Webhook] Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message);
}

/**
 * Fallback method to add tokens directly if RPC function fails
 */
async function addTokensDirectly(
  userId: string,
  tokenAmount: number,
  paymentAmount: number,
  stripePaymentIntentId: string
) {
  try {
    console.log('🔄 [Webhook] Direct token addition for user:', userId);

    // Get user's current balance
    const { data: userData, error: userError } = await supabase!
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

    console.log(`💵 [Webhook] Balance: ${currentBalance} → ${newBalance}`);

    // Update user's token balance
    const { error: updateError } = await supabase!
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

    // Record in token_transactions
    try {
      await supabase!.from('token_transactions').insert({
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
      console.log('✅ [Webhook] Recorded in token_transactions');
    } catch (err) {
      console.error('⚠️ [Webhook] Could not record in token_transactions:', err);
    }

    // Record in purchase_history
    try {
      await supabase!.from('purchase_history').insert({
        user_id: userId,
        transaction_type: 'purchase',
        amount: paymentAmount,
        tokens_received: tokenAmount,
        description: `Purchased ${tokenAmount} tokens`,
        stripe_payment_intent_id: stripePaymentIntentId,
        created_at: new Date().toISOString()
      });
      console.log('✅ [Webhook] Recorded in purchase_history');
    } catch (err) {
      console.error('⚠️ [Webhook] Could not record in purchase_history:', err);
    }

    console.log('✅ [Webhook] Token distribution complete');

  } catch (error: any) {
    console.error('❌ [Webhook] Error in direct token addition:', error.message);
  }
}
