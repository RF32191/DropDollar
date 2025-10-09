// Test Stripe Connection API
// GET /api/test-stripe

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getEnvironmentConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Stripe connection...');
    
    const config = getEnvironmentConfig();
    
    // Check if Stripe is configured
    if (!config.stripe.enabled) {
      return NextResponse.json({
        success: false,
        error: 'Stripe not enabled in configuration',
        details: {
          hasSecretKey: !!config.stripe.secretKey,
          hasWebhookSecret: !!config.stripe.webhookSecret
        }
      });
    }

    if (!config.stripe.secretKey) {
      return NextResponse.json({
        success: false,
        error: 'Stripe secret key not found',
        details: {
          configStripeEnabled: config.stripe.enabled,
          hasSecretKey: false
        }
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(config.stripe.secretKey!, {
      apiVersion: '2024-06-20'
    });

    console.log('🔧 Stripe initialized, testing connection...');

    // Test connection by retrieving account info
    const account = await stripe.accounts.retrieve();
    
    console.log('✅ Stripe connection successful!');
    
    return NextResponse.json({
      success: true,
      message: 'Stripe connection successful',
      details: {
        accountId: account.id,
        country: account.country,
        currency: account.default_currency,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted
      }
    });

  } catch (error: any) {
    console.error('❌ Stripe connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Stripe connection failed',
      details: {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack
      }
    });
  }
}
