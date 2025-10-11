import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing server environment...');
    
    // Check environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    console.log('🔧 Server Environment Check:');
    console.log('🔧 STRIPE_SECRET_KEY exists:', !!stripeSecretKey);
    console.log('🔧 STRIPE_SECRET_KEY length:', stripeSecretKey?.length || 0);
    console.log('🔧 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY exists:', !!stripePublishableKey);
    
    // Test Stripe initialization
    let stripeTest = 'Not tested';
    try {
      const Stripe = require('stripe');
      if (stripeSecretKey && stripeSecretKey.length > 50) {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2024-06-20',
        });
        stripeTest = 'Stripe initialized successfully';
        console.log('✅ Stripe initialized on server');
      } else {
        stripeTest = 'Stripe secret key too short or missing';
        console.log('❌ Stripe secret key issue');
      }
    } catch (error: any) {
      stripeTest = `Stripe initialization failed: ${error.message}`;
      console.error('❌ Stripe initialization error:', error);
    }
    
    return NextResponse.json({
      success: true,
      environment: {
        stripeSecretKeyExists: !!stripeSecretKey,
        stripeSecretKeyLength: stripeSecretKey?.length || 0,
        stripePublishableKeyExists: !!stripePublishableKey,
        stripeTest: stripeTest,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    });
    
  } catch (error: any) {
    console.error('❌ Server test failed:', error);
    return NextResponse.json(
      { 
        error: 'Server test failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
