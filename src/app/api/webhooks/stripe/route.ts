// Stripe Webhook Handler - COMPLETE WITH COMPREHENSIVE BACKUP
// Logs all events, retrieves payment data from Stripe, backs up to 4+ tables

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

    // Log the webhook event to database
    await logWebhookEvent(event);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'charge.succeeded':
        console.log('💳 [Webhook] Charge succeeded:', (event.data.object as any).id);
        break;
      
      case 'charge.failed':
        console.log('❌ [Webhook] Charge failed:', (event.data.object as any).id);
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

/**
 * Log webhook event to database for audit trail
 */
async function logWebhookEvent(event: Stripe.Event) {
  try {
    const paymentIntent = event.data.object as any;
    
    await supabase!.rpc('log_stripe_webhook', {
      event_id_param: event.id,
      event_type_param: event.type,
      payment_intent_id_param: paymentIntent.id || null,
      customer_id_param: paymentIntent.customer || null,
      amount_param: paymentIntent.amount ? paymentIntent.amount / 100 : null,
      currency_param: paymentIntent.currency || null,
      status_param: paymentIntent.status || null,
      user_id_param: paymentIntent.metadata?.userId || paymentIntent.metadata?.user_id || null,
      raw_data_param: event.data.object as any
    });
    
    console.log('✅ [Webhook] Event logged to database');
  } catch (err: any) {
    console.error('⚠️ [Webhook] Could not log event:', err.message);
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
    const amountPaidCents = paymentIntent.amount; // Amount in cents
    
    // Calculate tokens: $1 = 1 token (exact match with frontend)
    const tokensToCredit = Math.floor(amountPaidCents / 100);
    
    console.log(`💵 [Webhook] Payment Intent Amount: ${amountPaidCents} cents ($${amountPaid})`);
    console.log(`💵 [Webhook] Calculated: $${amountPaid} = ${tokensToCredit} tokens ($${amountPaid} / $1 per token)`);
    
    // Check if tokens were already added by frontend
    const { data: existingPurchase } = await supabase!
      .from('purchase_history')
      .select('id, tokens_purchased')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();
    
    if (existingPurchase) {
      console.log(`⚠️ [Webhook] Purchase already processed by frontend! Skipping duplicate credit.`);
      console.log(`⚠️ [Webhook] Existing purchase ID: ${existingPurchase.id}, Tokens: ${existingPurchase.tokens_purchased}`);
      
      // Mark webhook as processed but skipped
      await supabase!
        .from('stripe_webhook_log')
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString(),
          notes: 'Skipped - already processed by frontend'
        })
        .eq('payment_intent_id', paymentIntent.id);
      
      return; // Exit early to prevent duplicate credits
    }

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
      
      // Log failed attempt
      await logFailedPayment(paymentIntent, 'Could not determine userId');
      return;
    }

    console.log(`💵 [Webhook] Adding ${tokensToCredit} tokens to user ${userId}`);

    // Get payment method details
    let paymentMethod = 'card';
    if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'string') {
      try {
        const pm = await stripe!.paymentMethods.retrieve(paymentIntent.payment_method);
        paymentMethod = pm.type || 'card';
      } catch (err) {
        console.log('⚠️ [Webhook] Could not retrieve payment method');
      }
    }

    // Call comprehensive backup function
    const { data, error } = await supabase!.rpc('add_tokens_from_purchase', {
      user_id_param: userId,
      token_amount_param: tokensToCredit,
      payment_amount_param: amountPaid,
      stripe_payment_intent_id_param: paymentIntent.id,
      payment_method_param: paymentMethod
    });

    if (error) {
      console.error('❌ [Webhook] Error calling add_tokens_from_purchase:', error);
      
      // Fallback: Add tokens directly
      console.log('🔄 [Webhook] Using fallback method to add tokens');
      await addTokensDirectly(userId, tokensToCredit, amountPaid, paymentIntent.id, paymentMethod);
    } else {
      console.log('✅ [Webhook] Tokens added successfully:', data);
    }

    // Mark webhook as processed
    await supabase!
      .from('stripe_webhook_log')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('payment_intent_id', paymentIntent.id);

  } catch (error: any) {
    console.error('❌ [Webhook] Error handling payment success:', error.message);
    await logFailedPayment(paymentIntent, error.message);
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ [Webhook] Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message);
  
  // Log the failure
  try {
    await supabase!.from('payment_audit_log').insert({
      user_id: paymentIntent.metadata.userId || paymentIntent.metadata.user_id || 'unknown',
      action: 'payment_failed',
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      status: 'failed',
      error_message: paymentIntent.last_payment_error?.message || 'Unknown error',
      metadata: {
        payment_intent: paymentIntent.id,
        error: paymentIntent.last_payment_error
      },
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('⚠️ [Webhook] Could not log payment failure:', err);
  }
}

/**
 * Log failed payment attempt
 */
async function logFailedPayment(paymentIntent: Stripe.PaymentIntent, errorMessage: string) {
  try {
    await supabase!.from('payment_audit_log').insert({
      user_id: paymentIntent.metadata.userId || paymentIntent.metadata.user_id || 'unknown',
      action: 'payment_processing_error',
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      status: 'error',
      error_message: errorMessage,
      metadata: {
        receipt_email: paymentIntent.receipt_email,
        customer: paymentIntent.customer,
        metadata: paymentIntent.metadata
      },
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('⚠️ [Webhook] Could not log failed payment:', err);
  }
}

/**
 * Fallback method to add tokens directly if RPC function fails
 */
async function addTokensDirectly(
  userId: string,
  tokenAmount: number,
  paymentAmount: number,
  stripePaymentIntentId: string,
  paymentMethod: string
) {
  try {
    console.log('🔄 [Webhook] Direct token addition for user:', userId);

    // Get user's current purchased_tokens balance
    const { data: userData, error: userError } = await supabase!
      .from('users')
      .select('purchased_tokens, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ [Webhook] Error fetching user:', userError);
      return;
    }

    const currentBalance = userData?.purchased_tokens || 0;
    const newBalance = currentBalance + tokenAmount;

    console.log(`💵 [Webhook] Balance: ${currentBalance} → ${newBalance}`);

    // Update user's purchased_tokens balance (not tokens field)
    const { error: updateError } = await supabase!
      .from('users')
      .update({ 
        purchased_tokens: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ [Webhook] Error updating user tokens:', updateError);
      return;
    }

    console.log('✅ [Webhook] User tokens updated');

    // Record in all backup tables
    const backupTasks = [
      // token_transactions
      supabase!.from('token_transactions').insert({
        user_id: userId,
        amount: tokenAmount,
        type: 'purchase',
        balance_before: currentBalance,
        balance_after: newBalance,
        transaction_type: 'token_purchase',
        description: `Purchased ${tokenAmount} tokens for $${paymentAmount.toFixed(2)}`,
        stripe_payment_intent_id: stripePaymentIntentId,
        created_at: new Date().toISOString()
      }),
      
      // purchase_history
      supabase!.from('purchase_history').insert({
        user_id: userId,
        transaction_type: 'purchase',
        amount: paymentAmount,
        tokens_received: tokenAmount,
        stripe_payment_intent_id: stripePaymentIntentId,
        payment_method: paymentMethod,
        status: 'completed',
        description: `Token purchase - ${tokenAmount} tokens`,
        metadata: {
          payment_intent_id: stripePaymentIntentId,
          amount_paid: paymentAmount,
          tokens_received: tokenAmount,
          balance_before: currentBalance,
          balance_after: newBalance
        },
        created_at: new Date().toISOString()
      }),
      
      // payment_audit_log
      supabase!.from('payment_audit_log').insert({
        user_id: userId,
        action: 'token_purchase',
        payment_intent_id: stripePaymentIntentId,
        amount: paymentAmount,
        tokens_amount: tokenAmount,
        balance_before: currentBalance,
        balance_after: newBalance,
        status: 'completed',
        metadata: {
          payment_method: paymentMethod,
          user_email: userData.email,
          source: 'stripe_webhook_fallback'
        },
        created_at: new Date().toISOString()
      })
    ];

    await Promise.all(backupTasks);
    console.log('✅ [Webhook] All backup records created');

  } catch (error: any) {
    console.error('❌ [Webhook] Error in direct token addition:', error.message);
  }
}
