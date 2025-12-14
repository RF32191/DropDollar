import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatPhoneNumber, validatePhoneNumber, normalizePhoneNumber } from '@/lib/utils/phoneFormatter';

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
    const normalizedPhone = normalizePhoneNumber(formattedPhone);

    // Check if phone is already registered using database function
    const { data: phoneAvailable, error: phoneCheckError } = await supabase
      .rpc('is_phone_available', { phone_param: formattedPhone });

    if (phoneCheckError) {
      console.error('Phone check error:', phoneCheckError);
    } else if (phoneAvailable === false) {
      return NextResponse.json(
        { success: false, message: 'This phone number is already registered' },
        { status: 400 }
      );
    }

    // Get IP address and user agent for tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Generate verification code using database function
    const { data: code, error: codeError } = await supabase
      .rpc('generate_phone_verification_code', {
        phone_param: formattedPhone,
        ip_address_param: ipAddress !== 'unknown' ? ipAddress : null,
        user_agent_param: userAgent
      });

    if (codeError || !code) {
      console.error('Code generation error:', codeError);
      return NextResponse.json(
        { success: false, message: 'Failed to generate verification code. Please try again.' },
        { status: 500 }
      );
    }

    // Try to send SMS via Twilio (if configured)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER; // For regular SMS if Verify Service not available
    
    if (accountSid && authToken) {
      try {
        const smsSent = await sendTwilioSMS(formattedPhone, code, {
          accountSid,
          authToken,
          verifyServiceSid,
          fromNumber: twilioFromNumber
        });
        
        if (smsSent.success) {
          console.log('✅ Twilio SMS sent successfully to', formattedPhone);
          return NextResponse.json({
            success: true,
            message: 'Verification code sent via SMS',
            phone: formattedPhone
          });
        } else {
          console.error('❌ Twilio SMS error:', smsSent.error);
          // Fall through to dev mode if SMS fails
        }
      } catch (smsError: any) {
        console.error('❌ SMS send error:', smsError);
        // Fall through to dev mode if SMS fails
      }
    } else {
      console.warn('⚠️  Twilio not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to environment variables.');
    }

    // Development/fallback mode - return code for testing
    const isDevelopment = process.env.NODE_ENV === 'development' || !accountSid || !authToken;
    
    return NextResponse.json({
      success: true,
      message: isDevelopment 
        ? 'Verification code generated (dev mode - check response for code)' 
        : 'Verification code generated. SMS service not configured.',
      phone: formattedPhone,
      ...(isDevelopment && { 
        code, // Include code in dev mode for testing
        note: accountSid && authToken 
          ? 'Twilio configured but SMS send failed. Check logs.' 
          : 'Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for SMS delivery.'
      })
    });
  } catch (error: any) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to send SMS via Twilio
async function sendTwilioSMS(
  phone: string, 
  code: string, 
  config: {
    accountSid: string;
    authToken: string;
    verifyServiceSid?: string;
    fromNumber?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const { accountSid, authToken, verifyServiceSid, fromNumber } = config;

  // NOTE: Twilio Verify API doesn't support custom codes - it generates its own codes
  // Since we're using database-generated codes, we MUST use regular SMS API with a phone number
  
  // Option 1: Use regular Twilio SMS API (REQUIRED for custom codes)
  if (fromNumber) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: `Your DropDollar verification code is: ${code}. This code expires in 10 minutes.`
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

      if (!res.ok) {
        console.error('❌ Twilio SMS API error:', responseData);
        return { 
          success: false, 
          error: responseData.message || `Failed to send SMS: ${responseData.code || 'Unknown error'}` 
        };
      }

      console.log('✅ Twilio SMS sent successfully via Messages API');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Twilio SMS API error:', error);
      return { success: false, error: error.message };
    }
  }

  // If Verify Service SID is set but no phone number, explain the issue
  if (verifyServiceSid && !fromNumber) {
    return { 
      success: false, 
      error: 'Twilio phone number (TWILIO_FROM_NUMBER) is required for sending custom verification codes. Twilio Verify Service cannot send custom codes - it generates its own. Please add TWILIO_FROM_NUMBER to your environment variables. Get a phone number from: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming' 
    };
  }

  // Neither Verify Service nor From Number configured
  return { 
    success: false, 
    error: 'Twilio phone number (TWILIO_FROM_NUMBER) is required. Get one from: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming' 
  };
}

