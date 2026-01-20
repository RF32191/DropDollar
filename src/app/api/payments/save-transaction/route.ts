import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Server-side API endpoint to save token transactions
 * Uses service role to bypass RLS policies
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      userId,
      type,
      amount,
      balance_before,
      balance_after,
      description,
      stripePaymentIntentId,
      metadata
    } = body;

    if (!userId || !type || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, and amount' },
        { status: 400 }
      );
    }

    console.log('📝 [SaveTransaction] Saving token transaction via API');
    console.log('📝 [SaveTransaction] User ID:', userId);
    console.log('📝 [SaveTransaction] Type:', type);
    console.log('📝 [SaveTransaction] Amount:', amount);

    const insertData: any = {
      user_id: userId,
      type: type,
      amount: amount,
      description: description || `Transaction: ${type}`,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    // Add optional fields
    if (balance_before !== undefined) {
      insertData.balance_before = balance_before;
    }
    if (balance_after !== undefined) {
      insertData.balance_after = balance_after;
    }
    if (stripePaymentIntentId) {
      insertData.stripe_payment_intent_id = stripePaymentIntentId;
    }

    // Insert using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('token_transactions')
      .insert([insertData])
      .select();

    if (error) {
      console.error('❌ [SaveTransaction] Error:', error);
      return NextResponse.json(
        { error: 'Failed to save transaction', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [SaveTransaction] Transaction saved:', data[0]?.id);

    return NextResponse.json({
      success: true,
      transactionId: data[0]?.id
    });

  } catch (error: any) {
    console.error('❌ [SaveTransaction] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

