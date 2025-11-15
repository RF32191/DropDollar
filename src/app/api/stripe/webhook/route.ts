import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/server';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Stripe webhook event:', event.type);

    // Log event to database
    await supabase.from('stripe_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      account_id: event.account,
      data: event.data.object,
      processed: false
    });

    // Handle different event types
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'transfer.created':
      case 'transfer.updated':
        await handleTransferUpdate(event.data.object as Stripe.Transfer);
        break;

      case 'payout.created':
      case 'payout.paid':
      case 'payout.failed':
        await handlePayoutUpdate(event.data.object as Stripe.Payout);
        break;

      case 'account.external_account.created':
      case 'account.external_account.updated':
        console.log('External account updated:', event.account);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    // Mark event as processed
    await supabase
      .from('stripe_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  try {
    // Find seller with this Stripe account
    const { data: seller } = await supabase
      .from('seller_profiles')
      .select('id, user_id')
      .eq('stripe_account_id', account.id)
      .single();

    if (!seller) {
      console.log('No seller found for account:', account.id);
      return;
    }

    // Update account status
    const accountStatus = account.details_submitted ? 'connected' : 'pending';
    
    await supabase.rpc('save_stripe_account_info', {
      p_stripe_account_id: account.id,
      p_account_status: accountStatus,
      p_details_submitted: account.details_submitted,
      p_payouts_enabled: account.payouts_enabled || false,
      p_charges_enabled: account.charges_enabled || false,
      p_onboarding_completed: account.details_submitted
    });

    console.log('Account updated for seller:', seller.id);
  } catch (error) {
    console.error('Error handling account update:', error);
  }
}

async function handleTransferUpdate(transfer: Stripe.Transfer) {
  try {
    const payoutRequestId = transfer.metadata?.payout_request_id;
    if (!payoutRequestId) {
      console.log('No payout_request_id in transfer metadata');
      return;
    }

    let status = 'processing';
    if (transfer.reversed) {
      status = 'failed';
    } else if (transfer.amount_reversed > 0) {
      status = 'failed';
    }

    await supabase.rpc('update_payout_status', {
      p_payout_request_id: payoutRequestId,
      p_status: status,
      p_stripe_transfer_id: transfer.id,
      p_failure_reason: transfer.reversed ? 'Transfer reversed' : null
    });

    console.log('Transfer updated:', transfer.id, 'Status:', status);
  } catch (error) {
    console.error('Error handling transfer update:', error);
  }
}

async function handlePayoutUpdate(payout: Stripe.Payout) {
  try {
    // Find payout request by destination account
    const { data: seller } = await supabase
      .from('seller_profiles')
      .select('id')
      .eq('stripe_account_id', payout.destination)
      .single();

    if (!seller) {
      console.log('No seller found for payout destination');
      return;
    }

    // Get the most recent pending/processing payout for this seller
    const { data: payoutRequest } = await supabase
      .from('seller_payout_requests')
      .select('id')
      .eq('seller_id', seller.id)
      .in('status', ['pending', 'processing'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .single();

    if (!payoutRequest) {
      console.log('No matching payout request found');
      return;
    }

    let status = 'processing';
    let failureReason = null;

    if (payout.status === 'paid') {
      status = 'completed';
    } else if (payout.status === 'failed') {
      status = 'failed';
      failureReason = payout.failure_message || 'Payout failed';
    } else if (payout.status === 'canceled') {
      status = 'cancelled';
      failureReason = 'Payout cancelled';
    }

    await supabase.rpc('update_payout_status', {
      p_payout_request_id: payoutRequest.id,
      p_status: status,
      p_stripe_payout_id: payout.id,
      p_failure_reason: failureReason
    });

    console.log('Payout updated:', payout.id, 'Status:', status);
  } catch (error) {
    console.error('Error handling payout update:', error);
  }
}

