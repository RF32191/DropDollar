import { NextRequest, NextResponse } from 'next/server';
import StripeConnectService from '@/lib/payments/stripeConnectService';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    console.log('🏦 Starting Stripe Connect account creation...');
    const { userId, email, businessType = 'individual' } = await request.json();

    console.log('📝 Connect request data:', { userId, email, businessType });

    if (!userId || !email) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: userId and email' },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ Missing STRIPE_SECRET_KEY');
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    console.log('🔍 Checking existing Connect account...');
    // Check if user already has a Connect account
    const status = await StripeConnectService.getUserConnectStatus(userId);
    console.log('📊 Connect status:', status);
    
    if (status.hasAccount) {
      console.log('✅ Connect account already exists');
      return NextResponse.json({
        success: true,
        accountId: status.accountId,
        isVerified: status.isVerified,
        canReceivePayouts: status.canReceivePayouts,
        onboardingUrl: status.onboardingUrl,
        message: 'Connect account already exists'
      });
    }

    console.log('🆕 Creating new Connect account...');
    // Create new Connect account
    const result = await StripeConnectService.createConnectAccount(
      userId,
      email,
      businessType
    );

    console.log('📊 Create account result:', result);

    if (!result.success) {
      console.error('❌ Failed to create Connect account:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log('🔗 Creating onboarding link...');
    // Create onboarding link - FORCE HTTPS for production Stripe
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    
    // For production/live mode, ensure HTTPS
    if (process.env.NODE_ENV === 'production' || !baseUrl.includes('localhost')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    
    console.log('🌐 Using base URL:', baseUrl);
    
    const linkResult = await StripeConnectService.createAccountLink(
      result.accountId!,
      `${baseUrl}/dashboard?tab=banking&refresh=true`,
      `${baseUrl}/dashboard?tab=banking&success=true`
    );

    console.log('📊 Link result:', linkResult);

    if (!linkResult.success) {
      console.error('❌ Failed to create onboarding link:', linkResult.error);
      return NextResponse.json(
        { error: linkResult.error },
        { status: 500 }
      );
    }

    console.log('✅ Connect account created successfully');
    return NextResponse.json({
      success: true,
      accountId: result.accountId,
      onboardingUrl: linkResult.url,
      message: 'Connect account created successfully'
    });

  } catch (error: any) {
    console.error('💥 Connect account creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Connect account' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const status = await StripeConnectService.getUserConnectStatus(userId);

    return NextResponse.json({
      success: true,
      ...status
    });

  } catch (error: any) {
    console.error('Connect status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get Connect status' },
      { status: 500 }
    );
  }
}
