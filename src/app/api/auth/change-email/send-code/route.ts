import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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
    const { phone, userId } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);
    console.log('📧 [ChangeEmail] Sending verification code to:', formattedPhone);

    // Check Twilio configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
      console.error('❌ [ChangeEmail] Twilio not configured');
      return NextResponse.json(
        { success: false, error: 'SMS service not configured' },
        { status: 503 }
      );
    }

    // If userId provided, verify phone belongs to this user
    if (userId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });

        const digitsOnly = formattedPhone.replace(/\D/g, '');
        const last10Digits = digitsOnly.slice(-10);

        // Check user_phones table
        const { data: phoneData } = await supabaseAdmin
          .from('user_phones')
          .select('user_id, phone_number')
          .eq('user_id', userId)
          .single();

        if (phoneData) {
          const phoneDigits = phoneData.phone_number?.replace(/\D/g, '') || '';
          const phoneLast10 = phoneDigits.slice(-10);
          
          if (phoneLast10 !== last10Digits) {
            console.log('❌ [ChangeEmail] Phone does not match user account');
            return NextResponse.json(
              { success: false, error: 'This phone number is not associated with your account.' },
              { status: 403 }
            );
          }
        }
      }
    }

    // Send verification code via Twilio Verify
    const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        Channel: 'sms',
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ [ChangeEmail] Twilio error:', responseData);
      
      if (responseData.code === 60203) {
        return NextResponse.json(
          { success: false, error: 'Too many attempts. Please wait before trying again.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to send verification code. Please try again.' },
        { status: 400 }
      );
    }

    console.log('✅ [ChangeEmail] Verification code sent successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your phone',
      phone: formattedPhone.slice(0, -4) + '****',
    });

  } catch (error) {
    console.error('❌ [ChangeEmail] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

