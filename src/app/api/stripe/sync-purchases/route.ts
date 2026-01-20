import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Sync Stripe payment intents to user_transactions table
 * This ensures all purchases from Stripe are tracked in our database
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail } = await request.json();

    if (!userId && !userEmail) {
      return NextResponse.json(
        { error: 'userId or userEmail required' },
        { status: 400 }
      );
    }

    console.log('🔄 [StripeSync] Starting sync for user:', userId || userEmail);

    // Get user from database
    let user;
    if (userId) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      user = data;
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', userEmail)
        .single();
      
      if (error || !data) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      user = data;
    }

    console.log('✅ [StripeSync] Found user:', user.id, user.email);

    // Fetch ALL successful payment intents from Stripe for this user's email
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      // Filter by customer email if we can find it
    });

    // Filter to only this user's payments (by email or metadata)
    const userPayments = paymentIntents.data.filter(pi => {
      const piEmail = pi.receipt_email || pi.metadata?.userEmail;
      const piUserId = pi.metadata?.userId || pi.metadata?.user_id;
      
      return (
        pi.status === 'succeeded' &&
        (piEmail === user.email || piUserId === user.id)
      );
    });

    console.log(`📊 [StripeSync] Found ${userPayments.length} successful payments in Stripe`);

    // Get existing transactions from database
    const { data: existingTransactions } = await supabase
      .from('user_transactions')
      .select('stripe_payment_intent_id')
      .eq('user_id', user.id)
      .not('stripe_payment_intent_id', 'is', null);

    const existingPaymentIds = new Set(
      existingTransactions?.map(t => t.stripe_payment_intent_id) || []
    );

    console.log(`💾 [StripeSync] Found ${existingPaymentIds.size} existing transactions in database`);

    // Find missing payment intents
    const missingPayments = userPayments.filter(
      pi => !existingPaymentIds.has(pi.id)
    );

    console.log(`🔍 [StripeSync] Found ${missingPayments.length} missing payments to sync`);

    let syncedCount = 0;
    const errors = [];

    // Add missing payments to database
    for (const pi of missingPayments) {
      try {
        const amountPaidCents = pi.amount;
        const amountPaidDollars = amountPaidCents / 100;
        const tokensToCredit = amountPaidDollars; // 1 token = $1

        console.log(`💳 [StripeSync] Syncing payment ${pi.id}: $${amountPaidDollars} = ${tokensToCredit} tokens`);

        // Insert into user_transactions
        const { error: insertError } = await supabase
          .from('user_transactions')
          .insert({
            user_id: user.id,
            type: 'token_purchase',
            amount: amountPaidDollars,
            description: `Purchased ${tokensToCredit} tokens via Stripe (synced from Stripe)`,
            status: 'completed',
            stripe_payment_intent_id: pi.id,
            tokens_purchased: tokensToCredit,
            metadata: {
              payment_intent_id: pi.id,
              tokens: tokensToCredit,
              amount_paid_cents: amountPaidCents,
              amount_paid_dollars: amountPaidDollars,
              price_per_token: 1,
              timestamp: new Date(pi.created * 1000).toISOString(),
              wallet_type: 'purchased_tokens',
              source: 'stripe_sync',
              synced_at: new Date().toISOString()
            },
            created_at: new Date(pi.created * 1000).toISOString()
          });

        if (insertError) {
          console.error(`❌ [StripeSync] Error inserting payment ${pi.id}:`, insertError);
          errors.push({ payment_id: pi.id, error: insertError.message });
        } else {
          console.log(`✅ [StripeSync] Synced payment ${pi.id}`);
          syncedCount++;
        }
      } catch (err: any) {
        console.error(`❌ [StripeSync] Error processing payment ${pi.id}:`, err);
        errors.push({ payment_id: pi.id, error: err.message });
      }
    }

    // Get updated transaction count
    const { data: updatedTransactions } = await supabase
      .from('user_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'token_purchase');

    const totalPurchases = updatedTransactions?.length || 0;

    console.log('✅ [StripeSync] Sync complete!');
    console.log(`📊 [StripeSync] Total purchases in Stripe: ${userPayments.length}`);
    console.log(`📊 [StripeSync] Total purchases in database: ${totalPurchases}`);
    console.log(`➕ [StripeSync] Newly synced: ${syncedCount}`);
    console.log(`❌ [StripeSync] Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: 'Stripe sync completed',
      stats: {
        stripePayments: userPayments.length,
        databasePurchases: totalPurchases,
        newlySynced: syncedCount,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ [StripeSync] Error:', error);
    return NextResponse.json(
      { 
        error: 'Sync failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check sync status without making changes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');

    if (!userId && !userEmail) {
      return NextResponse.json(
        { error: 'userId or userEmail required' },
        { status: 400 }
      );
    }

    console.log('🔍 [StripeSync] Checking sync status for:', userId || userEmail);

    // Get user from database
    let user;
    if (userId) {
      const { data } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .single();
      user = data;
    } else {
      const { data } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', userEmail)
        .single();
      user = data;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Count purchases in Stripe
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
    });

    const userPayments = paymentIntents.data.filter(pi => {
      const piEmail = pi.receipt_email || pi.metadata?.userEmail;
      const piUserId = pi.metadata?.userId || pi.metadata?.user_id;
      
      return (
        pi.status === 'succeeded' &&
        (piEmail === user.email || piUserId === user.id)
      );
    });

    // Count purchases in database
    const { data: dbPurchases } = await supabase
      .from('user_transactions')
      .select('id, stripe_payment_intent_id')
      .eq('user_id', user.id)
      .in('type', ['token_purchase', 'purchase']);

    const dbPaymentIds = new Set(
      dbPurchases?.map(t => t.stripe_payment_intent_id).filter(Boolean) || []
    );

    const missingInDb = userPayments.filter(pi => !dbPaymentIds.has(pi.id));

    return NextResponse.json({
      userId: user.id,
      userEmail: user.email,
      stripePayments: userPayments.length,
      databasePurchases: dbPurchases?.length || 0,
      missingInDatabase: missingInDb.length,
      needsSync: missingInDb.length > 0,
      missingPaymentIds: missingInDb.map(pi => ({
        id: pi.id,
        amount: pi.amount / 100,
        created: new Date(pi.created * 1000).toISOString()
      }))
    });

  } catch (error: any) {
    console.error('❌ [StripeSync] Check error:', error);
    return NextResponse.json(
      { 
        error: 'Check failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

