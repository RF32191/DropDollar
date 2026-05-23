import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
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

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !sellerProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    if (!sellerProfile.stripe_account_id) {
      return NextResponse.json({
        success: true,
        connected: false,
        message: 'No Stripe account connected'
      });
    }

    // Get account details from Stripe
    const account = await getStripe().accounts.retrieve(sellerProfile.stripe_account_id);

    // Determine account status
    const accountStatus = account.details_submitted ? 'connected' : 'pending';
    const payoutsEnabled = account.payouts_enabled || false;
    const chargesEnabled = account.charges_enabled || false;

    // Update database with latest status
    const { error: updateError } = await supabase.rpc('save_stripe_account_info', {
      p_stripe_account_id: account.id,
      p_account_status: accountStatus,
      p_details_submitted: account.details_submitted,
      p_payouts_enabled: payoutsEnabled,
      p_charges_enabled: chargesEnabled,
      p_onboarding_completed: account.details_submitted
    });

    if (updateError) {
      console.error('Error updating Stripe status:', updateError);
    }

    return NextResponse.json({
      success: true,
      connected: true,
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: payoutsEnabled,
      chargesEnabled: chargesEnabled,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || []
      }
    });

  } catch (error: any) {
    console.error('Error fetching account status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch account status' },
      { status: 500 }
    );
  }
}

