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

    // Try to send SMS via configured provider (optional)
    const smsProvider = process.env.SMS_PROVIDER || 'none'; // 'twilio', 'aws', 'vonage', 'none'
    
    if (smsProvider !== 'none') {
      try {
        // You can add your SMS provider here
        // Example: AWS SNS, Vonage, etc.
        const smsSent = await sendSMS(formattedPhone, code, smsProvider);
        
        if (smsSent) {
          return NextResponse.json({
            success: true,
            message: 'Verification code sent via SMS',
            phone: formattedPhone
          });
        }
      } catch (smsError: any) {
        console.error('SMS send error:', smsError);
        // Continue to dev mode fallback
      }
    }

    // Development/fallback mode - return code for testing
    // In production, you should configure an SMS provider
    const isDevelopment = process.env.NODE_ENV === 'development' || smsProvider === 'none';
    
    return NextResponse.json({
      success: true,
      message: isDevelopment 
        ? 'Verification code generated (dev mode - check console/logs)' 
        : 'Verification code generated. SMS service not configured.',
      phone: formattedPhone,
      ...(isDevelopment && { 
        code, // Include code in dev mode for testing
        note: 'In production, configure SMS_PROVIDER environment variable'
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

// Helper function to send SMS via various providers
async function sendSMS(phone: string, code: string, provider: string): Promise<boolean> {
  switch (provider) {
    case 'twilio':
      // Twilio implementation (if you want to keep it as option)
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
      
      if (accountSid && authToken && serviceSid) {
        try {
          const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
          const body = new URLSearchParams({
            To: phone,
            Channel: 'sms',
            CustomCode: code // Use custom code instead of Twilio-generated
          });

          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body
          });

          return res.ok;
        } catch (error) {
          console.error('Twilio error:', error);
          return false;
        }
      }
      return false;

    case 'aws':
      // AWS SNS implementation (example)
      // const AWS = require('aws-sdk');
      // const sns = new AWS.SNS();
      // await sns.publish({
      //   PhoneNumber: phone,
      //   Message: `Your verification code is: ${code}`
      // }).promise();
      // return true;
      console.log('AWS SNS not implemented yet');
      return false;

    case 'vonage':
      // Vonage/Nexmo implementation (example)
      // const Vonage = require('@vonage/server-sdk');
      // const vonage = new Vonage({
      //   apiKey: process.env.VONAGE_API_KEY,
      //   apiSecret: process.env.VONAGE_API_SECRET
      // });
      // await vonage.sms.send({
      //   to: phone,
      //   from: process.env.VONAGE_FROM_NUMBER,
      //   text: `Your verification code is: ${code}`
      // });
      // return true;
      console.log('Vonage not implemented yet');
      return false;

    default:
      return false;
  }
}

