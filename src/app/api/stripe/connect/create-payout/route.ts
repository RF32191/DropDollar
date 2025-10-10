import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    const { accountId, amount, currency = 'usd' } = await request.json();

    if (!accountId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, amount' },
        { status: 400 }
      );
    }

    // Create payout to the connected account
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      destination: accountId,
    });

    return NextResponse.json({
      payoutId: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: payout.arrival_date,
    });

  } catch (error: any) {
    console.error('Stripe payout creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payout' },
      { status: 500 }
    );
  }
}
