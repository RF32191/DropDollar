import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatPhoneNumber, validatePhoneNumber } from '@/lib/utils/phoneFormatter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, message: 'Phone number and verification code are required' },
        { status: 400 }
      );
    }

    // Validate code format
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { success: false, message: 'Verification code must be 6 digits' },
        { status: 400 }
      );
    }

    // Validate and format phone number
    const validation = validatePhoneNumber(phone);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error || 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const formattedPhone = validation.formatted!;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    // PRIORITY 1: Try Twilio Verify Service first (if configured)
    if (accountSid && authToken && verifyServiceSid) {
      try {
        console.log('🔐 Checking code with Twilio Verify Service...');
        const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`;
        const body = new URLSearchParams({
          To: formattedPhone,
          Code: code
        });

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body
        });

        const responseData = await res.json().catch(() => ({}));

        if (res.ok && responseData.status === 'approved') {
          console.log('✅ Twilio Verify confirmed - code is valid!');
          return NextResponse.json({
            success: true,
            message: 'Phone number verified successfully',
            phone: formattedPhone
          });
        } else if (res.ok && responseData.status !== 'approved') {
          console.log('❌ Twilio Verify rejected - invalid code');
          return NextResponse.json(
            { success: false, message: 'Invalid verification code or code expired. Please request a new code.' },
            { status: 400 }
          );
        }
        // If error, fall through to database verification
        console.log('⚠️ Twilio Verify error, trying database verification...');
      } catch (error: any) {
        console.error('❌ Twilio Verify check error:', error);
        // Fall through to database verification
      }
    }

    // PRIORITY 2: Verify code using database function (fallback or if Verify not configured)
    const { data: verified, error: verifyError } = await supabase
      .rpc('verify_phone_code', {
        phone_param: formattedPhone,
        code_param: code
      });

    if (verifyError) {
      console.error('Verify code error:', verifyError);
      return NextResponse.json(
        { success: false, message: 'Failed to verify code. Please try again.' },
        { status: 500 }
      );
    }

    if (verified) {
      return NextResponse.json({
        success: true,
        message: 'Phone number verified successfully',
        phone: formattedPhone
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid verification code or code expired. Please request a new code.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

