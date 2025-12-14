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

    // If using Twilio Verify API, verify with Twilio first (optional)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    // If Twilio Verify Service is configured, we can optionally verify with Twilio
    // But since we're using our own database codes, we'll verify via database
    // Twilio is only used for sending SMS, not verification

    // Verify code using database function
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

