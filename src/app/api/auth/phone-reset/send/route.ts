import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // If 10 digits (US number without country code), add +1
  if (digits.length === 10) {
    digits = '1' + digits;
  }
  
  // Ensure it starts with +
  return '+' + digits;
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);
    console.log('🔐 [PhoneReset] Sending reset code to:', formattedPhone);

    // Check Twilio configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
      console.error('❌ [PhoneReset] Twilio not configured');
      return NextResponse.json(
        { success: false, error: 'SMS service not configured' },
        { status: 503 }
      );
    }

    // Check if user exists with this phone number
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Check phone_verifications table for this phone
      const { data: phoneData, error: phoneError } = await supabaseAdmin
        .from('phone_verifications')
        .select('user_id')
        .eq('phone_number', formattedPhone)
        .eq('verified', true)
        .single();

      if (phoneError || !phoneData) {
        console.log('⚠️ [PhoneReset] Phone not found in verified phones:', formattedPhone);
        // Don't reveal if phone exists for security
        // Still return success to prevent phone enumeration
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
      console.error('❌ [PhoneReset] Twilio error:', responseData);
      
      if (responseData.code === 60203) {
        return NextResponse.json(
          { success: false, error: 'Too many attempts. Please wait before trying again.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to send reset code. Please try again.' },
        { status: 400 }
      );
    }

    console.log('✅ [PhoneReset] Reset code sent successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Reset code sent to your phone',
      phone: formattedPhone.slice(0, -4) + '****', // Mask last 4 digits
    });

  } catch (error: any) {
    console.error('❌ [PhoneReset] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

