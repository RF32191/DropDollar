import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Server-side API endpoint to save purchase history
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
      purchaseType,
      amount,
      tokensPurchased,
      tokensSpent,
      stripePaymentIntentId,
      stripeChargeId,
      status,
      description,
      metadata
    } = body;

    if (!userId || !stripePaymentIntentId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and stripePaymentIntentId' },
        { status: 400 }
      );
    }

    console.log('💳 [SavePurchaseHistory] Saving purchase history via API');
    console.log('💳 [SavePurchaseHistory] User ID:', userId);
    console.log('💳 [SavePurchaseHistory] Payment Intent ID:', stripePaymentIntentId);

    const insertData: any = {
      user_id: userId,
      purchase_type: purchaseType || 'tokens',
      amount: amount,
      tokens_purchased: tokensPurchased || 0,
      status: status || 'completed',
      description: description || `Purchased ${tokensPurchased || 0} tokens`,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    // Add optional fields
    if (tokensSpent !== undefined) {
      insertData.tokens_spent = tokensSpent;
    }
    if (stripePaymentIntentId) {
      insertData.stripe_payment_intent_id = stripePaymentIntentId;
    }
    if (stripeChargeId) {
      insertData.stripe_charge_id = stripeChargeId;
    }

    // Insert using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('purchase_history')
      .insert([insertData])
      .select();

    if (error) {
      console.error('❌ [SavePurchaseHistory] Error:', error);
      return NextResponse.json(
        { error: 'Failed to save purchase history', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [SavePurchaseHistory] Purchase history saved:', data[0]?.id);

    return NextResponse.json({
      success: true,
      purchaseId: data[0]?.id
    });

  } catch (error: any) {
    console.error('❌ [SavePurchaseHistory] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

