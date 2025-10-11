import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Simple Payment Intent API: Starting...');
    
    // Check environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey || stripeSecretKey.length < 50) {
      console.error('❌ STRIPE_SECRET_KEY not properly configured');
      return NextResponse.json(
        { error: 'Stripe configuration error: Secret key not found or too short' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { amount, currency = 'usd', metadata } = body;

    console.log('🔧 Simple API: Request data:', { amount, currency, metadata });

    // Validate required fields
    if (!amount || !metadata?.userId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount and userId' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount < 50) {
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      );
    }

    console.log('🔧 Simple API: Creating Stripe instance...');
    
    // Create Stripe instance directly
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    console.log('🔧 Simple API: Creating payment intent...');

    // Create payment intent directly
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        userId: metadata.userId,
        type: metadata.type || 'tokens',
        gameType: metadata.gameType || 'token_purchase'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ Simple API: Payment intent created:', paymentIntent.id);

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    });

  } catch (error: any) {
    console.error('❌ Simple API: Payment intent creation failed');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Check if it's a Stripe-specific error
    if (error.type) {
      console.error('❌ Stripe error type:', error.type);
      console.error('❌ Stripe error code:', error.code);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create payment intent',
        details: error.message,
        type: error.type || 'unknown',
        code: error.code || 'unknown'
      },
      { status: 500 }
    );
  }
}
