import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Server-side API endpoint to save user transactions (purchases and winnings)
 * Uses service role to bypass RLS policies
 * Links to wallet via user_id
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
      description,
      status = 'completed',
      stripePaymentIntentId,
      tokensPurchased,
      tokensWon,
      competitionType,
      competitionId,
      gameType,
      metadata
    } = body;

    if (!userId || !type || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, and amount' },
        { status: 400 }
      );
    }

    console.log('💳 [SaveUserTransaction] Saving user transaction via API');
    console.log('💳 [SaveUserTransaction] User ID:', userId);
    console.log('💳 [SaveUserTransaction] Type:', type);
    console.log('💳 [SaveUserTransaction] Amount:', amount);

    const insertData: any = {
      user_id: userId,
      type: type,
      amount: amount,
      description: description || `Transaction: ${type}`,
      status: status,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    // Add optional fields
    if (stripePaymentIntentId) {
      insertData.stripe_payment_intent_id = stripePaymentIntentId;
    }
    if (tokensPurchased !== undefined) {
      insertData.tokens_purchased = tokensPurchased;
    }
    if (tokensWon !== undefined) {
      insertData.tokens_won = tokensWon;
    }
    if (competitionType) {
      insertData.competition_type = competitionType;
    }
    if (competitionId) {
      insertData.competition_id = competitionId;
    }
    if (gameType) {
      insertData.game_type = gameType;
    }

    // Insert using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('user_transactions')
      .insert([insertData])
      .select();

    if (error) {
      console.error('❌ [SaveUserTransaction] Error:', error);
      console.error('❌ [SaveUserTransaction] Error code:', error.code);
      console.error('❌ [SaveUserTransaction] Error details:', error.details);
      console.error('❌ [SaveUserTransaction] Error hint:', error.hint);
      
      // If table doesn't exist, provide helpful error
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'user_transactions table does not exist. Please run CREATE_USER_TRANSACTIONS_TABLE.sql in Supabase.', details: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to save transaction', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.error('❌ [SaveUserTransaction] No data returned from insert');
      return NextResponse.json(
        { error: 'Transaction insert returned no data' },
        { status: 500 }
      );
    }

    console.log('✅ [SaveUserTransaction] Transaction saved:', data[0]?.id);
    console.log('✅ [SaveUserTransaction] Transaction data:', JSON.stringify(data[0], null, 2));

    return NextResponse.json({
      success: true,
      transactionId: data[0]?.id,
      verified: true
    });

  } catch (error: any) {
    console.error('❌ [SaveUserTransaction] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

