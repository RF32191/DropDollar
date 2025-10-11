import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

/**
 * Delete a saved payment method
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, paymentMethodId } = body;

    if (!customerId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Customer ID and Payment Method ID are required' },
        { status: 400 }
      );
    }

    console.log('🗑️ [DeleteCard] Deleting payment method:', paymentMethodId);
    console.log('👤 [DeleteCard] For customer:', customerId);

    // Detach the payment method from the customer
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);

    console.log('✅ [DeleteCard] Payment method deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Card removed successfully'
    });

  } catch (error: any) {
    console.error('❌ [DeleteCard] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete card',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

