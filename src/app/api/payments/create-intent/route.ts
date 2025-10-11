import { NextRequest, NextResponse } from 'next/server';
import StripePaymentService from '@/lib/payments/stripeService';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 API Route: Starting payment intent creation...');
    
    // Check environment variables first
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    console.log('🔧 Environment check:');
    console.log('🔧 STRIPE_SECRET_KEY exists:', !!stripeSecretKey);
    console.log('🔧 STRIPE_SECRET_KEY length:', stripeSecretKey?.length || 0);
    console.log('🔧 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY exists:', !!stripePublishableKey);
    
    if (!stripeSecretKey || stripeSecretKey.length < 50) {
      console.error('❌ STRIPE_SECRET_KEY not properly configured');
      return NextResponse.json(
        { error: 'Stripe configuration error: Secret key not found or too short' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { amount, currency = 'usd', metadata } = body;

    console.log('🔧 API Route: Request data:');
    console.log('🔧 Amount:', amount);
    console.log('🔧 Currency:', currency);
    console.log('🔧 Metadata:', metadata);

    // Validate required fields
    if (!amount || !metadata?.userId) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: amount and userId' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount < 50) { // Minimum $0.50
      console.error('❌ Amount too small:', amount);
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      );
    }

    console.log('🔧 API Route: Creating payment intent with StripePaymentService...');

    // Create payment intent using server-side Stripe service
    const paymentIntent = await StripePaymentService.createPaymentIntent(
      amount,
      currency,
      metadata
    );

    console.log('✅ API Route: Payment intent created successfully');
    console.log('✅ Payment Intent ID:', paymentIntent.id);
    console.log('✅ Client Secret:', paymentIntent.client_secret?.substring(0, 20) + '...');

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
    console.error('❌ API Route: Payment intent creation failed');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Check if it's a Stripe-specific error
    if (error.type) {
      console.error('❌ Stripe error type:', error.type);
      console.error('❌ Stripe error code:', error.code);
    }
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create payment intent';
    let statusCode = 500;
    
    if (error.message.includes('connection')) {
      errorMessage = 'Stripe connection error. Please try again in a moment.';
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
      statusCode = 429; // Too Many Requests
    } else if (error.message.includes('authentication')) {
      errorMessage = 'Payment system configuration error.';
      statusCode = 500;
    } else if (error.message.includes('invalid')) {
      errorMessage = 'Invalid payment data provided.';
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
