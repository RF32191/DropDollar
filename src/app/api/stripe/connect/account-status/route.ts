import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId parameter' },
        { status: 400 }
      );
    }

    // Retrieve account details
    const account = await stripe.accounts.retrieve(accountId);

    // Check if account is fully onboarded
    const isOnboarded = account.details_submitted && account.charges_enabled;

    return NextResponse.json({
      accountId: account.id,
      isOnboarded,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      country: account.country,
      email: account.email,
      businessType: account.business_type,
      requirements: account.requirements,
    });

  } catch (error: any) {
    console.error('Stripe Connect account retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve account information' },
      { status: 500 }
    );
  }
}
