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

    console.log('🔍 Checking if phone is already registered:', formattedPhone);

    // CRITICAL: Check if phone is already registered - MUST prevent duplicate accounts
    // First, do a direct database check (most reliable)
    const { data: existingUsers, error: directCheckError } = await supabase
      .from('users')
      .select('id, username')
      .eq('phone', formattedPhone) // Check phone column
      .limit(1);

    if (directCheckError) {
      console.error('❌ Direct phone check error:', directCheckError);
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log('🚫 Phone number already registered:', formattedPhone);
      return NextResponse.json(
        { success: false, message: 'This phone number is already registered. Please use a different number or sign in.' },
        { status: 400 }
      );
    }

    // Also check with database function (backup check)
    const { data: phoneAvailable, error: phoneCheckError } = await supabase
      .rpc('is_phone_available', { phone_param: formattedPhone });

    if (phoneCheckError) {
      console.error('⚠️ RPC phone check error (continuing with direct check):', phoneCheckError);
    } else if (phoneAvailable === false) {
      console.log('🚫 Phone number already registered (RPC check):', formattedPhone);
      return NextResponse.json(
        { success: false, message: 'This phone number is already registered. Please use a different number or sign in.' },
        { status: 400 }
      );
    }

    console.log('✅ Phone number available:', formattedPhone);

    // Get IP address and user agent for tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Try to send SMS via Twilio (if configured)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;
    
    if (accountSid && authToken) {
      // If using Twilio Verify, we don't need to generate a database code (Twilio generates it)
      if (verifyServiceSid) {
        try {
          console.log('🔐 Using Twilio Verify Service - no database code needed');
          const smsSent = await sendTwilioSMS(formattedPhone, '', {
            accountSid,
            authToken,
            verifyServiceSid,
            fromNumber: twilioFromNumber
          });
          
          if (smsSent.success) {
            console.log('✅ Twilio Verify SMS sent successfully to', formattedPhone);
            return NextResponse.json({
              success: true,
              message: 'Verification code sent via SMS',
              phone: formattedPhone,
              usesVerify: true // Flag to indicate Twilio Verify is being used
            });
          } else {
            console.error('❌ Twilio Verify error:', smsSent.error);
            return NextResponse.json({
              success: false,
              message: smsSent.error || 'Failed to send verification code.',
              phone: formattedPhone
            }, { status: 500 });
          }
        } catch (error: any) {
          console.error('❌ Twilio Verify error:', error);
          return NextResponse.json({
            success: false,
            message: `Failed to send verification: ${error.message}`,
            phone: formattedPhone
          }, { status: 500 });
        }
      }
      
      // If using regular SMS (not Verify), generate database code
      if (twilioFromNumber) {
        console.log('📱 Using regular SMS - generating database code');
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

        try {
          const smsSent = await sendTwilioSMS(formattedPhone, code, {
            accountSid,
            authToken,
            verifyServiceSid,
            fromNumber: twilioFromNumber
          });
          
          if (smsSent.success) {
            console.log('✅ Regular SMS sent successfully to', formattedPhone);
            return NextResponse.json({
              success: true,
              message: 'Verification code sent via SMS',
              phone: formattedPhone,
              usesVerify: false
            });
          } else {
            console.error('❌ Regular SMS error:', smsSent.error);
            return NextResponse.json({
              success: false,
              message: smsSent.error || 'Failed to send SMS.',
              phone: formattedPhone
            }, { status: 500 });
          }
        } catch (error: any) {
          console.error('❌ SMS send error:', error);
          return NextResponse.json({
            success: false,
            message: `Failed to send SMS: ${error.message}`,
            phone: formattedPhone
          }, { status: 500 });
        }
      }
      
      // Neither Verify nor From Number configured
      return NextResponse.json({
        success: false,
        message: 'Twilio is not properly configured. Please contact support.',
        phone: formattedPhone
      }, { status: 500 });
    }

    // Development/fallback mode - generate code for testing
    console.log('⚠️ Twilio not configured, using dev mode');
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
    
    return NextResponse.json({
      success: true,
      message: 'Verification code generated (dev mode - check response for code)',
      phone: formattedPhone,
      code, // Include code in dev mode for testing
      usesVerify: false
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
): Promise<{ success: boolean; error?: string; usedVerify?: boolean }> {
  const { accountSid, authToken, verifyServiceSid, fromNumber } = config;

  // PRIORITY 1: Use Twilio Verify Service (no A2P registration needed!)
  if (verifyServiceSid) {
    try {
      console.log('🔐 Using Twilio Verify Service...');
      const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`;
      const body = new URLSearchParams({
        To: phone,
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

      const responseData = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('❌ Twilio Verify API error:', responseData);
        return { 
          success: false, 
          error: responseData.message || `Failed to send verification: ${responseData.code || 'Unknown error'}` 
        };
      }

      console.log('✅ Twilio Verify sent successfully - Twilio generates the code');
      return { success: true, usedVerify: true };
    } catch (error: any) {
      console.error('❌ Twilio Verify API error:', error);
      // Fall through to try regular SMS if available
    }
  }
  
  // PRIORITY 2: Use regular Twilio SMS API with custom database code (requires A2P)
  if (fromNumber) {
    try {
      console.log('📱 Using Twilio Messages API with custom code...');
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: `Verify DropDollar account: ${code}. This code expires in 10 minutes.`
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
      return { success: true, usedVerify: false };
    } catch (error: any) {
      console.error('❌ Twilio SMS API error:', error);
      return { success: false, error: error.message };
    }
  }

  // No method available
  return { 
    success: false, 
    error: 'Twilio Verify Service SID or Phone Number required. Add TWILIO_VERIFY_SERVICE_SID (recommended) or TWILIO_FROM_NUMBER to environment variables.' 
  };
}

