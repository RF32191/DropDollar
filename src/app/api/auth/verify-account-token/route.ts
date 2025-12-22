import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, code, phone } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // If code is provided, verify with Twilio first
    if (code && phone) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      if (accountSid && authToken && verifyServiceSid) {
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 10) {
          formattedPhone = '1' + formattedPhone;
        }
        formattedPhone = '+' + formattedPhone;

        const verifyUrl = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`;
        
        const verifyResponse = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedPhone,
            Code: code,
          }),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok || verifyData.status !== 'approved') {
          return NextResponse.json(
            { success: false, error: 'Invalid verification code' },
            { status: 400 }
          );
        }
      }
    }

    // Verify token from database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('account_management_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      console.log('❌ [VerifyToken] Token not found or already used');
      return NextResponse.json(
        { success: false, error: 'Invalid or expired link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log('❌ [VerifyToken] Token expired');
      return NextResponse.json(
        { success: false, error: 'This link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Get user data
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, username')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ [VerifyToken] Token verified for user:', userData.id);

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        username: userData.username,
      },
      token: token, // Return token for use in subsequent requests
    });

  } catch (error) {
    console.error('❌ [VerifyToken] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

