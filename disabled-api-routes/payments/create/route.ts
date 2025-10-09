// Payment API - Handles all payment methods
// POST /api/payments/create

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getEnvironmentConfig } from '@/lib/config';

// Get environment configuration
const config = getEnvironmentConfig();

// Initialize Stripe only if secret key is available
const stripe = config.stripe.enabled ? new Stripe(config.stripe.secretKey!, {
  apiVersion: '2024-06-20'
}) : null;

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Payment API called');
    console.log('🔧 Stripe enabled:', config.stripe.enabled);
    console.log('🔧 Stripe secret key exists:', !!config.stripe.secretKey);
    
    const body = await request.json();
    const { 
      paymentMethod, 
      tokenAmount, 
      customerEmail, 
      customerAddress, 
      userId,
      useWebsiteWallet = false 
    } = body;

    console.log('🔧 Payment method:', paymentMethod);
    console.log('🔧 Token amount:', tokenAmount);
    console.log('🔧 Customer email:', customerEmail);

    // Validate input
    if (!paymentMethod || !tokenAmount || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current token price (fallback to $1 if not available)
    const currentPrice = 1.0; // Default price
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
    console.log('🔧 handleStripePayment called');
    console.log('🔧 Stripe instance exists:', !!stripe);
    
    // Check if Stripe is configured
    if (!stripe) {
      console.error('❌ Stripe not configured - missing secret key');
      return {
        success: false,
        error: 'Stripe not configured - please check environment variables'
      };
    }

    console.log('🔧 Creating Stripe payment intent...');
    console.log('🔧 Amount (cents):', Math.round(totalCostUSD * 100));
    
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

    console.log('✅ Stripe payment intent created:', paymentIntent.id);

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
    console.error('❌ Stripe payment error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      name: error instanceof Error ? error.name : undefined,
      code: (error as any)?.code,
      statusCode: (error as any)?.statusCode,
      type: (error as any)?.type
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create Stripe payment';
    if (error instanceof Error) {
      if (error.message.includes('Invalid API Key')) {
        errorMessage = 'Stripe API key is invalid or missing';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Network error connecting to Stripe. Please try again.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Too many requests to Stripe. Please wait a moment and try again.';
      } else {
        errorMessage = `Stripe error: ${error.message}`;
      }
    }
    
    return {
      success: false,
      error: errorMessage
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
