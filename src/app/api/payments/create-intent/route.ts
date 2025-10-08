import { NextRequest, NextResponse } from 'next/server';
import StripePaymentService, { PaymentMetadata } from '@/lib/payments/stripeService';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency = 'usd', metadata }: {
      amount: number;
      currency?: string;
      metadata: PaymentMetadata;
    } = body;

    // Validate required fields
    if (!amount || !metadata.userId || !metadata.type) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, userId, or type' },
        { status: 400 }
      );
    }

    // Create payment intent with Stripe
    const paymentIntent = await StripePaymentService.createPaymentIntent(
      amount,
      currency,
      metadata
    );

    // Log payment attempt in database
    const { error: dbError } = await supabase
      .from('payment_transactions')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        user_id: metadata.userId,
        amount: amount / 100, // Convert cents to dollars for storage
        currency,
        type: metadata.type,
        status: 'pending',
        metadata: {
          listingId: metadata.listingId,
          tournamentId: metadata.tournamentId,
          matchId: metadata.matchId,
          gameType: metadata.gameType,
          entryNumber: metadata.entryNumber
        }
      });

    if (dbError) {
      console.error('Failed to log payment in database:', dbError);
      // Don't fail the payment creation, just log the error
    }

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
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
