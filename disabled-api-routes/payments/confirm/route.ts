import { NextRequest, NextResponse } from 'next/server';
import StripePaymentService from '@/lib/payments/stripeService';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentIntentId }: { paymentIntentId: string } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Confirm payment with Stripe
    const paymentIntent = await StripePaymentService.confirmPaymentIntent(paymentIntentId);

    // Update payment status in database
    const { error: dbError } = await supabase
      .from('payment_transactions')
      .update({
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'failed',
        completed_at: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null
      })
      .eq('stripe_payment_intent_id', paymentIntentId);

    if (dbError) {
      console.error('Failed to update payment status in database:', dbError);
    }

    // If payment succeeded, process the purchase
    if (paymentIntent.status === 'succeeded') {
      await processSuccessfulPayment(paymentIntent);
    }

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      }
    });

  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}

/**
 * Process successful payment based on type
 */
async function processSuccessfulPayment(paymentIntent: any) {
  const metadata = paymentIntent.metadata;
  
  try {
    switch (metadata.type) {
      case 'listing':
        await processListingPayment(metadata);
        break;
      case 'tournament':
        await processTournamentPayment(metadata);
        break;
      case 'match':
        await processMatchPayment(metadata);
        break;
      case 'hotsell':
        await processHotSellPayment(metadata);
        break;
      case 'ad_campaign':
        await processAdCampaignPayment(metadata);
        break;
      default:
        console.warn('Unknown payment type:', metadata.type);
    }
  } catch (error) {
    console.error('Failed to process successful payment:', error);
    // Log the error but don't fail the payment confirmation
  }
}

async function processListingPayment(metadata: any) {
  // Update listing status to active/paid
  const { error } = await supabase
    .from('listings')
    .update({ 
      payment_status: 'paid',
      is_active: true,
      paid_at: new Date().toISOString()
    })
    .eq('id', metadata.listingId);

  if (error) {
    throw new Error(`Failed to update listing: ${error.message}`);
  }
}

async function processTournamentPayment(metadata: any) {
  // Add user to tournament participants
  const { error } = await supabase
    .from('tournament_participants')
    .insert({
      tournament_id: metadata.tournamentId,
      user_id: metadata.userId,
      payment_status: 'paid',
      entry_time: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to add tournament participant: ${error.message}`);
  }
}

async function processMatchPayment(metadata: any) {
  // Update match status or create match entry
  const { error } = await supabase
    .from('pvp_matches')
    .update({ 
      payment_status: 'paid',
      status: 'waiting_for_opponent'
    })
    .eq('id', metadata.matchId);

  if (error) {
    throw new Error(`Failed to update match: ${error.message}`);
  }
}

async function processHotSellPayment(metadata: any) {
  // Add user to hot sell competition
  const { error } = await supabase
    .from('hotsell_participants')
    .insert({
      competition_id: metadata.listingId, // Hot sell competitions use listing structure
      user_id: metadata.userId,
      payment_status: 'paid',
      entry_time: new Date().toISOString(),
      entry_number: metadata.entryNumber || 1
    });

  if (error) {
    throw new Error(`Failed to add hot sell participant: ${error.message}`);
  }
}

async function processAdCampaignPayment(metadata: any) {
  // Update ad campaign status to active
  const { error } = await supabase
    .from('ad_campaign_submissions')
    .update({ 
      status: 'active',
      payment_status: 'paid',
      activated_at: new Date().toISOString()
    })
    .eq('id', metadata.listingId); // Ad campaigns use listingId field

  if (error) {
    throw new Error(`Failed to update ad campaign: ${error.message}`);
  }
}
