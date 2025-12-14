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

    // Validate and format phone number
    const validation = validatePhoneNumber(phone);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error || 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const formattedPhone = validation.formatted!;

    // Use Twilio Verify API if available
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (accountSid && authToken && serviceSid) {
      try {
        const url = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;
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

        const json = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          return NextResponse.json(
            { success: false, message: json.message || 'Verification failed' },
            { status: 400 }
          );
        }

        if (json.status === 'approved') {
          return NextResponse.json({
            success: true,
            message: 'Phone number verified successfully',
            phone: formattedPhone
          });
        }

        return NextResponse.json(
          { success: false, message: 'Invalid verification code' },
          { status: 400 }
        );
      } catch (error: any) {
        console.error('Twilio verify error:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to verify code. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // Development mode - accept any 6-digit code
      if (code.length === 6 && /^\d+$/.test(code)) {
        return NextResponse.json({
          success: true,
          message: 'Phone number verified (dev mode)',
          phone: formattedPhone
        });
      }

      return NextResponse.json(
        { success: false, message: 'Invalid verification code' },
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

