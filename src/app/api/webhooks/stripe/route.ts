// Stripe Webhook Handler
// Processes completed payments and distributes tokens

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

// Initialize Stripe only if secret key is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20'
}) : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    const { 
      tokenAmount, 
      customerAddress, 
      useWebsiteWallet, 
      userId 
    } = paymentIntent.metadata;

    console.log('Payment succeeded:', {
      amount: paymentIntent.amount,
      tokenAmount,
      customerAddress,
      useWebsiteWallet,
      userId
    });

    // Distribute tokens to user
    const success = await distributeTokensToUser(
      parseInt(tokenAmount),
      customerAddress || null,
      useWebsiteWallet === 'true',
      userId
    );

    if (success) {
      // Update payment status in database
      await updatePaymentStatus(paymentIntent.id, 'completed');
      
      // Send confirmation email
      await sendConfirmationEmail(
        paymentIntent.receipt_email || '',
        parseInt(tokenAmount),
        paymentIntent.amount / 100
      );
    } else {
      console.error('Failed to distribute tokens for payment:', paymentIntent.id);
      await updatePaymentStatus(paymentIntent.id, 'failed');
    }

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  await updatePaymentStatus(paymentIntent.id, 'failed');
}

async function distributeTokensToUser(
  tokenAmount: number,
  customerAddress: string | null,
  useWebsiteWallet: boolean,
  userId: string
): Promise<boolean> {
  try {
    // TODO: Implement actual token distribution
    // This is where you'd interact with your DROP contract
    // to transfer tokens from the contract to the user
    
    console.log('Distributing tokens:', {
      tokenAmount,
      customerAddress,
      useWebsiteWallet,
      userId
    });

    // For now, just return success
    // In production, you'd:
    // 1. Call your DROP contract's transfer function
    // 2. Send tokens from contract to user's address
    // 3. Update user's balance in your database
    
    return true;
  } catch (error) {
    console.error('Token distribution error:', error);
    return false;
  }
}

async function updatePaymentStatus(paymentIntentId: string, status: string) {
  // TODO: Update payment status in your database
  console.log('Updating payment status:', paymentIntentId, status);
}

async function sendConfirmationEmail(email: string, tokenAmount: number, amountPaid: number) {
  // TODO: Send confirmation email to user
  console.log('Sending confirmation email:', {
    email,
    tokenAmount,
    amountPaid
  });
}
