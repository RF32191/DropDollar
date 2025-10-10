import { NextRequest, NextResponse } from 'next/server';
import StripePaymentService from '@/lib/payments/stripeService';

export async function POST(request: NextRequest) {
  try {
    const { amount, userId, email, name } = await request.json();

    // Validate input
    if (!amount || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, userId' },
        { status: 400 }
      );
    }

    // Create payment intent for token purchase
    const paymentIntent = await StripePaymentService.createPaymentIntent(
      amount,
      'usd',
      {
        userId,
        type: 'tokens',
        gameType: 'token_purchase'
      }
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error: any) {
    console.error('Token purchase API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
