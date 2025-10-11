import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

/**
 * Get saved payment methods for a customer
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    console.log('📋 [SavedCards] Fetching payment methods for customer:', customerId);

    // Get all payment methods attached to this customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    console.log('✅ [SavedCards] Found', paymentMethods.data.length, 'saved cards');

    // Get customer to check default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethodId = typeof customer !== 'deleted' && customer.invoice_settings?.default_payment_method
      ? customer.invoice_settings.default_payment_method
      : null;

    // Format the cards for the frontend
    const cards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand || 'unknown',
      last4: pm.card?.last4 || '0000',
      expMonth: pm.card?.exp_month || 0,
      expYear: pm.card?.exp_year || 0,
      isDefault: pm.id === defaultPaymentMethodId
    }));

    return NextResponse.json({
      success: true,
      cards
    });

  } catch (error: any) {
    console.error('❌ [SavedCards] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load saved cards',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

