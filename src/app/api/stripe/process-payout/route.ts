import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount < 25) {
      return NextResponse.json({ error: 'Minimum payout amount is $25' }, { status: 400 });
    }

    // Create payout request in database
    const { data: payoutResult, error: payoutError } = await supabase
      .rpc('request_stripe_payout', {
        p_amount: amount
      });

    if (payoutError) {
      return NextResponse.json({ error: payoutError.message }, { status: 400 });
    }

    if (!payoutResult.success) {
      return NextResponse.json({ error: payoutResult.error }, { status: 400 });
    }

    // Get seller profile with Stripe account
    const { data: sellerProfile } = await supabase
      .from('seller_profiles')
      .select('stripe_account_id, stripe_payouts_enabled')
      .eq('user_id', user.id)
      .single();

    if (!sellerProfile || !sellerProfile.stripe_account_id) {
      return NextResponse.json({ error: 'Stripe account not found' }, { status: 404 });
    }

    if (!sellerProfile.stripe_payouts_enabled) {
      return NextResponse.json({ error: 'Stripe payouts not enabled' }, { status: 400 });
    }

    try {
      // Create Stripe transfer
      const transfer = await getStripe().transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        destination: sellerProfile.stripe_account_id,
        description: `Payout for seller wallet`,
        metadata: {
          payout_request_id: payoutResult.payout_id,
          seller_id: user.id
        }
      });

      // Update payout request with Stripe details
      await supabase.rpc('update_payout_status', {
        p_payout_request_id: payoutResult.payout_id,
        p_status: 'processing',
        p_stripe_transfer_id: transfer.id
      });

      return NextResponse.json({
        success: true,
        payoutId: payoutResult.payout_id,
        transferId: transfer.id,
        amount: amount,
        message: 'Payout is being processed. Funds will arrive in 2-7 business days.'
      });

    } catch (stripeError: any) {
      // Stripe transfer failed - update status and refund
      await supabase.rpc('update_payout_status', {
        p_payout_request_id: payoutResult.payout_id,
        p_status: 'failed',
        p_failure_reason: stripeError.message
      });

      return NextResponse.json({
        error: `Stripe error: ${stripeError.message}`,
        refunded: true
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error processing payout:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payout' },
      { status: 500 }
    );
  }
}

