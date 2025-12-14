import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatPhoneNumber, validatePhoneNumber } from '@/lib/utils/phoneFormatter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
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

    // Check if phone is already registered
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, phone')
      .not('phone', 'is', null)
      .limit(1000); // Check up to 1000 users

    if (existingUser) {
      // Normalize and check
      const { normalizePhoneNumber } = await import('@/lib/utils/phoneFormatter');
      const normalizedInput = normalizePhoneNumber(formattedPhone);
      
      const phoneExists = existingUser.some((user: any) => {
        if (!user.phone) return false;
        const existingNormalized = normalizePhoneNumber(user.phone);
        return existingNormalized === normalizedInput;
      });

      if (phoneExists) {
        return NextResponse.json(
          { success: false, message: 'This phone number is already registered' },
          { status: 400 }
        );
      }
    }

    // Use Twilio Verify API if available
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (accountSid && authToken && serviceSid) {
      try {
        const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
        const body = new URLSearchParams({
          To: formattedPhone,
          Channel: 'sms'
        });

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('Twilio error:', errorData);
          return NextResponse.json(
            { success: false, message: errorData.message || 'Failed to send verification code' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Verification code sent via SMS',
          phone: formattedPhone
        });
      } catch (error: any) {
        console.error('Twilio send error:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to send verification code. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // Development mode - generate a mock code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification code temporarily (in production, use Redis or database)
      // For now, we'll return it in development mode only
      console.log(`[DEV MODE] Verification code for ${formattedPhone}: ${code}`);
      
      return NextResponse.json({
        success: true,
        message: 'Verification code sent (dev mode)',
        phone: formattedPhone,
        ...(process.env.NODE_ENV === 'development' && { code }) // Only in dev
      });
    }
  } catch (error: any) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

