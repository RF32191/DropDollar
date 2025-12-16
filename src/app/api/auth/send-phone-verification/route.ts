import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatPhoneNumber, validatePhoneNumber, normalizePhoneNumber } from '@/lib/utils/phoneFormatter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

    console.log('🔍 [SEND-VERIFY] Checking if phone is already registered:', formattedPhone);
    console.log('🔍 [SEND-VERIFY] Normalized format for checking:', normalizedPhone);

    // Extract last 7 digits for matching
    const digitsOnly = formattedPhone.replace(/\D/g, '');
    const last7Digits = digitsOnly.slice(-7);
    console.log('🔍 [SEND-VERIFY] Last 7 digits:', last7Digits);

    // ============================================
    // CHECK 1: Is this phone already verified/registered?
    // ============================================
    console.log('🔍 [SEND-VERIFY] CHECK 1: Looking for verified phones...');
    const { data: verifiedCodes, error: verifyError } = await supabase
      .from('phone_verification_codes')
      .select('phone, verified, created_at')
      .eq('verified', true)
      .limit(100);
    
    if (!verifyError && verifiedCodes && verifiedCodes.length > 0) {
      // Check if any verified phone matches (by last 7 digits)
      const matchingPhone = verifiedCodes.find(record => {
        const recordDigits = record.phone?.replace(/\D/g, '') || '';
        const recordLast7 = recordDigits.slice(-7);
        return recordLast7 === last7Digits;
      });
      
      if (matchingPhone) {
        console.log('🚫 [SEND-VERIFY] BLOCKED: Phone already verified/registered:', matchingPhone.phone);
        return NextResponse.json(
          { success: false, message: 'This phone number is already registered. Please use a different number or sign in.' },
          { status: 400 }
        );
      }
    }
    
    console.log('✅ [SEND-VERIFY] Phone not verified yet, checking rate limit...');

    // ============================================
    // CHECK 2: Rate limit - max 2 requests per day
    // ============================================
    console.log('🔍 [SEND-VERIFY] CHECK 2: Rate limit (max 2 per day)...');
    
    // Get start of today (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    
    // Count how many codes were sent to this phone today
    const { data: todayCodes, error: rateError } = await supabase
      .from('phone_verification_codes')
      .select('id, phone, created_at')
      .gte('created_at', todayStart.toISOString())
      .limit(100);
    
    if (!rateError && todayCodes) {
      // Count codes for this phone number (by last 7 digits)
      const codesForThisPhone = todayCodes.filter(record => {
        const recordDigits = record.phone?.replace(/\D/g, '') || '';
        const recordLast7 = recordDigits.slice(-7);
        return recordLast7 === last7Digits;
      });
      
      console.log('📊 [SEND-VERIFY] Codes sent today to this phone:', codesForThisPhone.length);
      
      if (codesForThisPhone.length >= 2) {
        console.log('🚫 [SEND-VERIFY] BLOCKED: Rate limit exceeded (2 per day)');
        return NextResponse.json(
          { 
            success: false, 
            message: 'Too many verification attempts. You can only request 2 codes per day. Please try again tomorrow.' 
          },
          { status: 429 }
        );
      }
    }
    
    console.log('✅ [SEND-VERIFY] Rate limit OK, checking other tables...');

    // METHOD 2: Try database function (bypasses RLS)
    console.log('🔍 [SEND-VERIFY] Using database function to check...');
    const { data: phoneExists, error: functionError } = await supabase
      .rpc('check_phone_exists', { phone_to_check: formattedPhone });

    if (!functionError && phoneExists === true) {
      console.log('🚫 [SEND-VERIFY] Phone number already registered (via function):', formattedPhone);
      return NextResponse.json(
        { success: false, message: 'This phone number is already registered. Please use a different number or sign in.' },
        { status: 400 }
      );
    }
    
    console.log('✅ [SEND-VERIFY] Phone number available:', formattedPhone);

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

