import { NextRequest, NextResponse } from 'next/server';
import StripePaymentService from '@/lib/payments/stripeService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency = 'usd', metadata } = body;

    console.log('🔧 API Route: Creating payment intent...');
    console.log('🔧 Amount:', amount);
    console.log('🔧 Currency:', currency);
    console.log('🔧 Metadata:', metadata);

    // Validate required fields
    if (!amount || !metadata?.userId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount and userId' },
        { status: 400 }
      );
    }

    // Create payment intent using server-side Stripe service
    const paymentIntent = await StripePaymentService.createPaymentIntent(
      amount,
      currency,
      metadata
    );

    console.log('✅ API Route: Payment intent created:', paymentIntent.id);

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
    console.error('❌ API Route: Payment intent creation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create payment intent',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
