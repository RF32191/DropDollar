import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordEarning } from '@/lib/tax/earnings';

const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * POST /api/withdrawals/request
 * Process user withdrawal to bank account via Stripe
 * Requires W-9 completion before allowing withdrawal
 */
export async function POST(request: NextRequest) {
  const supabase = getServiceClient();

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
    const { amount_cents } = body;

    if (!amount_cents || amount_cents < 2500) { // $25 minimum
      return NextResponse.json({ 
        error: 'Minimum withdrawal amount is $25.00' 
      }, { status: 400 });
    }

    // Check W-9 status
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('won_tokens, is_tax_verified, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // BLOCK if W-9 not completed
    if (!userData.is_tax_verified) {
      return NextResponse.json({
        success: false,
        requiresTaxInfo: true,
        error: 'Please complete your W-9 tax form before withdrawing funds',
        code: 'W9_REQUIRED'
      }, { status: 403 });
    }

    // Check balance
    const amountDollars = amount_cents / 100;
    if (userData.won_tokens < amountDollars) {
      return NextResponse.json({
        error: 'Insufficient balance'
      }, { status: 400 });
    }

    // Create payout request in tax system
    const { data: payoutRequest, error: payoutError } = await supabase
      .from('payout_requests')
      .insert({
        user_id: user.id,
        amount_cents,
        currency: 'USD',
        status: 'pending',
      })
      .select()
      .single();

    if (payoutError) {
      throw payoutError;
    }

    // Record earning for tax purposes (withdrawal as negative adjustment)
    await recordEarning(
      supabase,
      user.id,
      -amount_cents, // Negative for withdrawal
      'adjustment',
      payoutRequest.id,
      new Date()
    );

    // Deduct from won_tokens
    const { error: deductError } = await supabase
      .from('users')
      .update({ 
        won_tokens: userData.won_tokens - amountDollars 
      })
      .eq('id', user.id);

    if (deductError) {
      throw deductError;
    }

    // TODO: Integrate with actual Stripe bank payout here
    // For now, mark as pending and admin will process manually
    // In production, you would:
    // 1. Get user's Stripe Connect account or bank account token
    // 2. Create Stripe payout/transfer
    // 3. Update payout_request with Stripe details

    return NextResponse.json({
      success: true,
      payoutRequestId: payoutRequest.id,
      amount: amountDollars,
      message: 'Withdrawal request submitted successfully! Processing within 2-7 business days.',
      status: 'pending'
    });

  } catch (error: any) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process withdrawal' },
      { status: 500 }
    );
  }
}

