import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

/**
 * Create or retrieve a Stripe customer for a user
 * This is required for saving payment methods securely
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [CreateCustomer] Starting customer creation/retrieval...');
    
    const body = await request.json();
    const { userId, email, name } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and email' },
        { status: 400 }
      );
    }

    console.log('🔧 [CreateCustomer] User ID:', userId);
    console.log('🔧 [CreateCustomer] Email:', email);

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      console.log('✅ [CreateCustomer] Existing customer found:', customer.id);
      
      return NextResponse.json({
        success: true,
        customerId: customer.id,
        existing: true
      });
    }

    // Create new customer
    console.log('📝 [CreateCustomer] Creating new customer...');
    
    const customer = await stripe.customers.create({
      email,
      name: name || email.split('@')[0],
      metadata: {
        userId: userId
      }
    });

    console.log('✅ [CreateCustomer] New customer created:', customer.id);

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      existing: false
    });

  } catch (error: any) {
    console.error('❌ [CreateCustomer] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create customer',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

