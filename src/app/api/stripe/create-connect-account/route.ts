import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe, getBaseUrl } from '@/lib/stripe/server';

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
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !sellerProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    // Check if already has Stripe account
    if (sellerProfile.stripe_account_id) {
      return NextResponse.json({
        success: true,
        accountId: sellerProfile.stripe_account_id,
        message: 'Stripe account already exists'
      });
    }

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email,
      business_type: 'individual',
      capabilities: {
        transfers: { requested: true },
      },
      business_profile: {
        name: sellerProfile.shop_name || sellerProfile.business_name,
        product_description: sellerProfile.shop_description,
      },
    });

    // Save to database
    const { error: updateError } = await supabase.rpc('save_stripe_account_info', {
      p_stripe_account_id: account.id,
      p_account_status: 'pending',
      p_details_submitted: false,
      p_payouts_enabled: false,
      p_charges_enabled: false,
      p_onboarding_completed: false
    });

    if (updateError) {
      console.error('Error saving Stripe account:', updateError);
      return NextResponse.json({ error: 'Failed to save account info' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      accountId: account.id,
      message: 'Stripe account created successfully'
    });

  } catch (error: any) {
    console.error('Error creating Stripe account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Stripe account' },
      { status: 500 }
    );
  }
}

