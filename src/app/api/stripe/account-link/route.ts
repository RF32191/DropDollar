import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe, getBaseUrl } from '@/lib/stripe/server';

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

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !sellerProfile || !sellerProfile.stripe_account_id) {
      return NextResponse.json({ error: 'Stripe account not found' }, { status: 404 });
    }

    const baseUrl = getBaseUrl();

    // Create account link for onboarding
    const accountLink = await getStripe().accountLinks.create({
      account: sellerProfile.stripe_account_id,
      refresh_url: `${baseUrl}/dashboard?stripe_refresh=true`,
      return_url: `${baseUrl}/dashboard?stripe_connected=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url
    });

  } catch (error: any) {
    console.error('Error creating account link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account link' },
      { status: 500 }
    );
  }
}

