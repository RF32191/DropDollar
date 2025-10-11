import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

/**
 * Simple payment intent creation with customer support and card saving
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [SimpleIntent] Starting payment intent creation...');
    
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey || stripeSecretKey.length < 50) {
      console.error('❌ [SimpleIntent] STRIPE_SECRET_KEY not properly configured');
      return NextResponse.json(
        { error: 'Stripe configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { amount, currency = 'usd', metadata, customerId, saveCard = false } = body;

    console.log('🔧 [SimpleIntent] Request data:');
    console.log('🔧 Amount:', amount);
    console.log('🔧 Currency:', currency);
    console.log('🔧 Metadata:', metadata);
    console.log('🔧 Customer ID:', customerId);
    console.log('🔧 Save Card:', saveCard);

    if (!amount || !metadata?.userId) {
      console.error('❌ [SimpleIntent] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: amount and userId' },
        { status: 400 }
      );
    }

    if (amount < 50) {
      console.error('❌ [SimpleIntent] Amount too small:', amount);
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      );
    }

    // Build payment intent parameters
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      metadata: {
        userId: metadata.userId,
        type: metadata.type || 'tokens',
        gameType: metadata.gameType || 'token_purchase',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Add customer if provided
    if (customerId) {
      paymentIntentParams.customer = customerId;
      console.log('✅ [SimpleIntent] Using customer ID:', customerId);
    }

    // Add setup_future_usage for card saving
    if (saveCard) {
      paymentIntentParams.setup_future_usage = 'off_session';
      console.log('✅ [SimpleIntent] Card saving enabled');
    }

    console.log('🔧 [SimpleIntent] Creating payment intent...');

    // Create payment intent with retry logic
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔧 [SimpleIntent] Attempt ${attempt}/${maxRetries}...`);
        
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        console.log('✅ [SimpleIntent] Payment intent created:', paymentIntent.id);

        return NextResponse.json({
          success: true,
          paymentIntent: {
            id: paymentIntent.id,
            client_secret: paymentIntent.client_secret,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            customer: paymentIntent.customer
          }
        });
        
      } catch (error: any) {
        lastError = error;
        console.error(`❌ [SimpleIntent] Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries && (
          error.message.includes('connection') ||
          error.message.includes('timeout') ||
          error.message.includes('network')
        )) {
          console.log(`⏳ [SimpleIntent] Waiting before retry ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;

  } catch (error: any) {
    console.error('❌ [SimpleIntent] Payment intent creation failed:', error);
    
    let errorMessage = 'Failed to create payment intent';
    let statusCode = 500;
    
    if (error.message.includes('connection')) {
      errorMessage = 'Stripe connection error. Please try again.';
      statusCode = 503;
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Too many requests. Please wait and try again.';
      statusCode = 429;
    } else if (error.message.includes('authentication')) {
      errorMessage = 'Payment system configuration error.';
      statusCode = 500;
    } else if (error.message.includes('invalid')) {
      errorMessage = 'Invalid payment data.';
      statusCode = 400;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message,
        type: error.type || 'unknown',
        code: error.code || 'unknown'
      },
      { status: statusCode }
    );
  }
}
