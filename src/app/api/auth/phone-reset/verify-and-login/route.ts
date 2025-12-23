import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// Twilio config
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

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
    console.log('📱 [VerifyLogin] Verifying code for:', formattedPhone.slice(-4));

    // Setup Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey || !verifyServiceSid) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the code with Twilio
    try {
      const verification = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({
          to: formattedPhone,
          code: code.trim(),
        });

      if (verification.status !== 'approved') {
        console.log('❌ [VerifyLogin] Invalid code');
        return NextResponse.json(
          { success: false, error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      console.log('✅ [VerifyLogin] Code verified!');
    } catch (twilioError) {
      console.error('❌ [VerifyLogin] Twilio error:', twilioError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify code. Please try again.' },
        { status: 400 }
      );
    }

    // Find user by phone number
    const last10Digits = formattedPhone.replace(/\D/g, '').slice(-10);
    
    // Get all phones and find match
    const { data: phones, error: phonesError } = await supabaseAdmin
      .from('user_phones')
      .select('user_id, phone_number');

    if (phonesError) {
      console.error('❌ [VerifyLogin] Error fetching phones:', phonesError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    const matchedPhone = phones?.find(p => {
      if (!p.phone_number) return false;
      const pDigits = p.phone_number.replace(/\D/g, '');
      return pDigits.slice(-10) === last10Digits;
    });

    if (!matchedPhone) {
      console.log('❌ [VerifyLogin] Phone not found in database');
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number' },
        { status: 404 }
      );
    }

    // Get user email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, username')
      .eq('id', matchedPhone.user_id)
      .single();

    if (userError || !userData?.email) {
      console.log('❌ [VerifyLogin] User not found');
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    console.log('✅ [VerifyLogin] Found user:', userData.username);

    // Generate a temporary password for this session
    const tempPassword = 'TEMP_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

    // Update the user's password temporarily
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      matchedPhone.user_id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('❌ [VerifyLogin] Failed to set temp password:', updateError);
      
      // Try alternative: just return the email for client-side magic link
      return NextResponse.json({
        success: true,
        email: userData.email,
        username: userData.username,
        message: 'Phone verified. Please update your password.',
        requiresPasswordChange: true
      });
    }

    console.log('✅ [VerifyLogin] Temp password set, ready for login');

    // Return credentials for client to log in
    return NextResponse.json({
      success: true,
      email: userData.email,
      username: userData.username,
      tempPassword: tempPassword,
      message: 'Phone verified successfully',
      requiresPasswordChange: true
    });

  } catch (error) {
    console.error('❌ [VerifyLogin] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

