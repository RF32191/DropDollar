import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Verify that a transaction exists in the database
 * Used to confirm transaction was saved before adding tokens
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing paymentIntentId parameter' },
        { status: 400 }
      );
    }

    console.log('🔍 [VerifyTransaction] Checking for transaction:', paymentIntentId);

    // Check user_transactions table
    const { data, error } = await supabaseAdmin
      .from('user_transactions')
      .select('id, type, tokens_purchased, created_at')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ [VerifyTransaction] Error:', error);
      return NextResponse.json(
        { error: 'Failed to verify transaction', details: error.message },
        { status: 500 }
      );
    }

    const exists = !!data;
    console.log(`✅ [VerifyTransaction] Transaction ${exists ? 'EXISTS' : 'NOT FOUND'}:`, paymentIntentId);

    return NextResponse.json({
      exists,
      transactionId: data?.id || null,
      tokensPurchased: data?.tokens_purchased || null
    });

  } catch (error: any) {
    console.error('❌ [VerifyTransaction] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

