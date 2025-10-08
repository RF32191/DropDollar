import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import StripePaymentService from '@/lib/payments/stripeService';
import { supabase } from '@/lib/supabase/client';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = StripePaymentService.verifyWebhookSignature(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('Received Stripe webhook event:', event.type, event.id);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object as Stripe.Dispute);
        break;
      
      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 400 }
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  // Update payment status in database
  const { error } = await supabase
    .from('payment_transactions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      stripe_charge_id: paymentIntent.latest_charge as string
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Failed to update payment status:', error);
  }

  // Process the successful payment based on metadata
  const metadata = paymentIntent.metadata;
  await processPaymentByType(metadata, 'completed');
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);

  // Update payment status in database
  const { error } = await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Failed to update payment status:', error);
  }

  // Handle failed payment cleanup
  const metadata = paymentIntent.metadata;
  await processPaymentByType(metadata, 'failed');
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment canceled:', paymentIntent.id);

  // Update payment status in database
  const { error } = await supabase
    .from('payment_transactions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Failed to update payment status:', error);
  }
}

async function handleChargeDispute(dispute: Stripe.Dispute) {
  console.log('Charge dispute created:', dispute.id);

  // Log dispute in database
  const { error } = await supabase
    .from('payment_disputes')
    .insert({
      stripe_dispute_id: dispute.id,
      charge_id: dispute.charge as string,
      amount: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason,
      status: dispute.status,
      created_at: new Date(dispute.created * 1000).toISOString()
    });

  if (error) {
    console.error('Failed to log dispute:', error);
  }

  // TODO: Send notification to admin about dispute
}

async function processPaymentByType(metadata: Record<string, string>, status: 'completed' | 'failed') {
  const { type, userId, listingId, tournamentId, matchId } = metadata;

  try {
    switch (type) {
      case 'listing':
        if (status === 'completed') {
          await supabase
            .from('listings')
            .update({ 
              payment_status: 'paid',
              is_active: true,
              paid_at: new Date().toISOString()
            })
            .eq('id', listingId);
        } else {
          await supabase
            .from('listings')
            .update({ payment_status: 'failed' })
            .eq('id', listingId);
        }
        break;

      case 'tournament':
        if (status === 'completed') {
          await supabase
            .from('tournament_participants')
            .upsert({
              tournament_id: tournamentId,
              user_id: userId,
              payment_status: 'paid',
              entry_time: new Date().toISOString()
            });
        }
        break;

      case 'match':
        if (status === 'completed') {
          await supabase
            .from('pvp_matches')
            .update({ 
              payment_status: 'paid',
              status: 'waiting_for_opponent'
            })
            .eq('id', matchId);
        }
        break;

      case 'hotsell':
        if (status === 'completed') {
          await supabase
            .from('hotsell_participants')
            .upsert({
              competition_id: listingId,
              user_id: userId,
              payment_status: 'paid',
              entry_time: new Date().toISOString()
            });
        }
        break;

      default:
        console.warn('Unknown payment type in webhook:', type);
    }
  } catch (error) {
    console.error(`Failed to process ${type} payment:`, error);
  }
}
