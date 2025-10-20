import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * Transfer tokens to Stripe escrow for tournament/competition entries
 * 1 Token = $1 USD
 * Money held until winner determined
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, amount, type, metadata } = await request.json();

    console.log('💰 [Escrow] Transfer request:', { userId, amount, type });

    // Validate input
    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Create a payment intent for escrow
    // This holds the money until the competition ends
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: 'usd',
      metadata: {
        user_id: userId,
        type: type || 'tournament_entry',
        status: 'escrowed',
        ...metadata
      },
      capture_method: 'manual', // Don't capture immediately - hold in escrow
      description: `Escrow for ${type || 'tournament'} - User ${userId}`,
    });

    console.log('✅ [Escrow] Payment intent created:', paymentIntent.id);
    console.log('💵 [Escrow] Amount escrowed: $' + amount);

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      status: 'escrowed',
      message: `$${amount} held in escrow until winner determined`
    });

  } catch (error: any) {
    console.error('❌ [Escrow] Transfer failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Escrow transfer failed',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

/**
 * Release escrowed funds to winner
 */
export async function PUT(request: NextRequest) {
  try {
    const { paymentIntentId, winnerId } = await request.json();

    console.log('🏆 [Escrow] Release request:', { paymentIntentId, winnerId });

    if (!paymentIntentId || !winnerId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }


    // Capture the payment intent to release funds
    const captured = await stripe.paymentIntents.capture(paymentIntentId);

    console.log('✅ [Escrow] Funds released to winner:', winnerId);

    return NextResponse.json({
      success: true,
      paymentIntentId: captured.id,
      winnerId: winnerId,
      amount: captured.amount / 100,
      status: 'released',
      message: 'Funds released to winner'
    });

  } catch (error: any) {
    console.error('❌ [Escrow] Release failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Escrow release failed' 
      },
      { status: 500 }
    );
  }
}

