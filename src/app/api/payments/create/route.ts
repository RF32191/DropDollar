// Payment API - Handles all payment methods
// POST /api/payments/create

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { dropCoinContract } from '@/lib/dropCoinContract';

// Initialize Stripe only if secret key is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20'
}) : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      paymentMethod, 
      tokenAmount, 
      customerEmail, 
      customerAddress, 
      userId,
      useWebsiteWallet = false 
    } = body;

    // Validate input
    if (!paymentMethod || !tokenAmount || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current token price
    const stats = await dropCoinContract.getContractStats();
    const currentPrice = (stats?.currentPriceUSD && !isNaN(stats.currentPriceUSD)) ? stats.currentPriceUSD : 1.0;
    const totalCostUSD = tokenAmount * currentPrice;

    let paymentResult;

    switch (paymentMethod) {
      case 'stripe-card':
      case 'apple-pay':
        paymentResult = await handleStripePayment(
          paymentMethod,
          totalCostUSD,
          tokenAmount,
          customerEmail,
          customerAddress,
          useWebsiteWallet,
          userId
        );
        break;

      case 'paypal':
        paymentResult = await handlePayPalPayment(
          totalCostUSD,
          tokenAmount,
          customerEmail,
          customerAddress,
          useWebsiteWallet,
          userId
        );
        break;

      case 'crypto-eth':
        // ETH payments are handled directly by the frontend
        return NextResponse.json({
          error: 'ETH payments should be handled directly through MetaMask'
        }, { status: 400 });

      default:
        return NextResponse.json(
          { error: 'Unsupported payment method' },
          { status: 400 }
        );
    }

    return NextResponse.json(paymentResult);

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle Stripe payments (Credit Cards, Apple Pay)
async function handleStripePayment(
  paymentMethod: string,
  totalCostUSD: number,
  tokenAmount: number,
  customerEmail: string,
  customerAddress: string | null,
  useWebsiteWallet: boolean,
  userId: string
) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe not configured'
      };
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalCostUSD * 100), // Convert to cents
      currency: 'usd',
      payment_method_types: paymentMethod === 'apple-pay' ? ['card'] : ['card'],
      receipt_email: customerEmail,
      metadata: {
        tokenAmount: tokenAmount.toString(),
        customerAddress: customerAddress || '',
        useWebsiteWallet: useWebsiteWallet.toString(),
        userId: userId
      }
    });

    // Store payment in database for webhook processing
    await storePaymentRecord({
      paymentIntentId: paymentIntent.id,
      paymentMethod,
      tokenAmount,
      totalCostUSD,
      customerEmail,
      customerAddress,
      useWebsiteWallet,
      userId,
      status: 'pending'
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };

  } catch (error) {
    console.error('Stripe payment error:', error);
    return {
      success: false,
      error: 'Failed to create Stripe payment'
    };
  }
}

// Handle PayPal payments
async function handlePayPalPayment(
  totalCostUSD: number,
  tokenAmount: number,
  customerEmail: string,
  customerAddress: string | null,
  useWebsiteWallet: boolean,
  userId: string
) {
  try {
    // Create PayPal order
    const paypalOrder = await createPayPalOrder(totalCostUSD);

    // Store payment record
    await storePaymentRecord({
      paymentIntentId: paypalOrder.id,
      paymentMethod: 'paypal',
      tokenAmount,
      totalCostUSD,
      customerEmail,
      customerAddress,
      useWebsiteWallet,
      userId,
      status: 'pending'
    });

    return {
      success: true,
      paypalOrderId: paypalOrder.id,
      approvalUrl: paypalOrder.links.find((link: any) => link.rel === 'approve')?.href
    };

  } catch (error) {
    console.error('PayPal payment error:', error);
    return {
      success: false,
      error: 'Failed to create PayPal payment'
    };
  }
}

// Create PayPal order
async function createPayPalOrder(amount: number) {
  // Safety check for amount
  const safeAmount = (amount && !isNaN(amount) && amount > 0) ? amount : 0;
  
  const response = await fetch(`${process.env.PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getPayPalAccessToken()}`
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: safeAmount.toFixed(2)
        },
        description: `DROP Tokens Purchase`
      }]
    })
  });

  return await response.json();
}

// Get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
  const response = await fetch(`${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

// Store payment record in database
async function storePaymentRecord(payment: any) {
  // TODO: Implement database storage
  // This should store the payment details for webhook processing
  console.log('Storing payment record:', payment);
}

// Distribute tokens to user
async function distributeTokens(
  tokenAmount: number,
  customerAddress: string | null,
  useWebsiteWallet: boolean,
  userId: string
) {
  try {
    if (customerAddress) {
      // Send to user's external wallet (MetaMask, etc.)
      // This would require your contract owner to send tokens
      // For now, just log it - you'll implement the actual transfer
      console.log('Sending tokens to external wallet:', customerAddress, tokenAmount);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Token distribution error:', error);
    return false;
  }
}
