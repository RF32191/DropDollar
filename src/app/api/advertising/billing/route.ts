import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// Mock Stripe integration - replace with actual Stripe SDK
interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'failed';
  client_secret: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// POST /api/advertising/billing/payment-intent
export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'usd', campaign_id, user_email } = await request.json();

    if (!amount || !campaign_id || !user_email) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, campaign_id, user_email' },
        { status: 400 }
      );
    }

    // Validate campaign exists and belongs to user
    const { data: campaign, error: campaignError } = await supabase
      .from('ad_campaign_submissions')
      .select('*')
      .eq('id', campaign_id)
      .eq('contact_email', user_email)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Create payment intent (mock implementation)
    const paymentIntent: PaymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      status: 'requires_payment_method',
      client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`
    };

    // Store payment intent in database
    const { error: insertError } = await supabase
      .from('ad_payment_intents')
      .insert({
        id: paymentIntent.id,
        campaign_id,
        user_email,
        amount: amount,
        currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing payment intent:', insertError);
      return NextResponse.json(
        { error: 'Failed to create payment intent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment_intent: paymentIntent
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/advertising/billing/invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    const invoiceId = searchParams.get('invoice_id');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      );
    }

    if (invoiceId) {
      // Get specific invoice
      const { data: invoice, error } = await supabase
        .from('ad_invoices')
        .select(`
          *,
          ad_campaign_submissions!inner(name, contact_email)
        `)
        .eq('id', invoiceId)
        .eq('ad_campaign_submissions.contact_email', userEmail)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: invoice });
    }

    // Get all invoices for user
    const { data: invoices, error } = await supabase
      .from('ad_invoices')
      .select(`
        *,
        ad_campaign_submissions!inner(name, contact_email)
      `)
      .eq('ad_campaign_submissions.contact_email', userEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: invoices || [] });

  } catch (error) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/advertising/billing/pay-invoice
export async function PUT(request: NextRequest) {
  try {
    const { invoice_id, payment_method_id, user_email } = await request.json();

    if (!invoice_id || !payment_method_id || !user_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('ad_invoices')
      .select(`
        *,
        ad_campaign_submissions!inner(contact_email)
      `)
      .eq('id', invoice_id)
      .eq('ad_campaign_submissions.contact_email', user_email)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or access denied' },
        { status: 404 }
      );
    }

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      );
    }

    // Process payment (mock implementation)
    // In real implementation, this would use Stripe, PayPal, etc.
    const paymentSuccess = Math.random() > 0.1; // 90% success rate for demo

    if (!paymentSuccess) {
      return NextResponse.json(
        { error: 'Payment failed. Please try again.' },
        { status: 402 }
      );
    }

    // Update invoice status
    const { error: updateError } = await supabase
      .from('ad_invoices')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString(),
        payment_method_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice_id);

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      );
    }

    // Record payment transaction
    const { error: transactionError } = await supabase
      .from('ad_payment_transactions')
      .insert({
        invoice_id,
        amount: invoice.total_amount,
        currency: 'usd',
        payment_method_id,
        status: 'completed',
        transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      invoice_id,
      paid_amount: invoice.total_amount
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
