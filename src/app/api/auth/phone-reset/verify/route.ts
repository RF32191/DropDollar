import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '1' + digits;
  }
  return '+' + digits;
}

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: 'Phone and code are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);
    console.log('🔐 [PhoneReset] Verifying code for:', formattedPhone);

    // Check Twilio configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
      return NextResponse.json(
        { success: false, error: 'SMS service not configured' },
        { status: 503 }
      );
    }

    // Verify code with Twilio
    const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`;
    
    const response = await fetch(url, {
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

    const responseData = await response.json();

    if (!response.ok || responseData.status !== 'approved') {
      console.log('❌ [PhoneReset] Invalid code:', responseData);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired code. Please try again.' },
        { status: 400 }
      );
    }

    console.log('✅ [PhoneReset] Code verified successfully');

    // Find user by phone number
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find user by phone
    const { data: phoneData, error: phoneError } = await supabaseAdmin
      .from('phone_verifications')
      .select('user_id')
      .eq('phone_number', formattedPhone)
      .eq('verified', true)
      .single();

    if (phoneError || !phoneData?.user_id) {
      console.log('⚠️ [PhoneReset] No verified user found for phone:', formattedPhone);
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number.' },
        { status: 404 }
      );
    }

    // Get user's auth ID from their profile
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', phoneData.user_id)
      .single();

    if (userError || !userData) {
      console.log('⚠️ [PhoneReset] User not found:', phoneData.user_id);
      return NextResponse.json(
        { success: false, error: 'Account not found.' },
        { status: 404 }
      );
    }

    // Generate a secure reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token in database
    const { error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .upsert({
        user_id: userData.id,
        token: resetToken,
        phone_number: formattedPhone,
        expires_at: expiresAt.toISOString(),
        used: false,
      }, {
        onConflict: 'user_id'
      });

    if (tokenError) {
      // Table might not exist, create it
      console.log('⚠️ [PhoneReset] Token table error, attempting to create...');
      
      // Try to create the table
      await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL UNIQUE,
            token TEXT NOT NULL,
            phone_number TEXT,
            expires_at TIMESTAMPTZ NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      }).catch(() => {});

      // Retry insert
      const { error: retryError } = await supabaseAdmin
        .from('password_reset_tokens')
        .upsert({
          user_id: userData.id,
          token: resetToken,
          phone_number: formattedPhone,
          expires_at: expiresAt.toISOString(),
          used: false,
        }, {
          onConflict: 'user_id'
        });

      if (retryError) {
        console.error('❌ [PhoneReset] Failed to store token:', retryError);
        return NextResponse.json(
          { success: false, error: 'Failed to generate reset link. Please try again.' },
          { status: 500 }
        );
      }
    }

    console.log('✅ [PhoneReset] Reset token generated for user:', userData.id);

    // Return the token for client to use
    return NextResponse.json({
      success: true,
      message: 'Phone verified successfully',
      resetToken: resetToken,
      email: userData.email ? userData.email.slice(0, 3) + '***' : null, // Partial email for confirmation
    });

  } catch (error: any) {
    console.error('❌ [PhoneReset] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

