import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(failedPayment);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const paymentId = paymentIntent.metadata.payment_id;
  
  if (!paymentId) {
    console.error('No payment_id found in metadata');
    return;
  }

  try {
    // Update payment status in Supabase
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        transaction_hash: paymentIntent.id,
        payment_data: {
          stripe_intent_id: paymentIntent.id,
          stripe_client_secret: paymentIntent.client_secret,
          stripe_status: paymentIntent.status
        }
      })
      .eq('id', paymentId);

    if (error) {
      console.error('Failed to update payment status:', error);
      return;
    }

    // Get payment details for token distribution
    const { data: paymentData, error: fetchError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !paymentData) {
      console.error('Failed to fetch payment data:', fetchError);
      return;
    }

    // Trigger token distribution (in production, this would call your smart contract)
    await distributeTokens(paymentData);

    console.log(`✅ Payment ${paymentId} completed successfully`);

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const paymentId = paymentIntent.metadata.payment_id;
  
  if (!paymentId) {
    console.error('No payment_id found in metadata');
    return;
  }

  try {
    // Update payment status in Supabase
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        status: 'failed',
        payment_data: {
          stripe_intent_id: paymentIntent.id,
          stripe_status: paymentIntent.status,
          failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
        }
      })
      .eq('id', paymentId);

    if (error) {
      console.error('Failed to update payment status:', error);
    }

    console.log(`❌ Payment ${paymentId} failed`);

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function distributeTokens(paymentData: any) {
  try {
    // In production, this would:
    // 1. Call your smart contract to mint/distribute tokens
    // 2. Update user balance in Supabase
    // 3. Send confirmation email to customer
    // 4. Log the transaction

    console.log(`🎁 Distributing ${paymentData.token_amount} tokens to ${paymentData.customer_email}`);
    
    // For now, just log the successful distribution
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        payment_data: {
          ...paymentData.payment_data,
          tokens_distributed: true,
          distribution_timestamp: new Date().toISOString()
        }
      })
      .eq('id', paymentData.id);

    if (error) {
      console.error('Failed to update token distribution status:', error);
    }

  } catch (error) {
    console.error('Error distributing tokens:', error);
  }
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};
