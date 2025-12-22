import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

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
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);
    console.log('🔗 [AccountLink] Sending account link to:', formattedPhone);

    // Check Twilio configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken) {
      console.error('❌ [AccountLink] Twilio not configured');
      return NextResponse.json(
        { success: false, error: 'SMS service not configured' },
        { status: 503 }
      );
    }

    // Setup Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find user by phone in user_phones table
    const digitsOnly = formattedPhone.replace(/\D/g, '');
    const last10Digits = digitsOnly.slice(-10);

    const { data: allPhones, error: phonesError } = await supabaseAdmin
      .from('user_phones')
      .select('user_id, phone_number');

    if (phonesError) {
      console.error('❌ [AccountLink] Error fetching phones:', phonesError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    const matchedPhone = allPhones?.find(p => {
      if (!p.phone_number) return false;
      const pDigits = p.phone_number.replace(/\D/g, '');
      const pLast10 = pDigits.slice(-10);
      return pLast10 === last10Digits;
    });

    if (!matchedPhone) {
      console.log('❌ [AccountLink] No account found for phone');
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number.' },
        { status: 404 }
      );
    }

    // Get user data
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, username')
      .eq('id', matchedPhone.user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User account not found.' },
        { status: 404 }
      );
    }

    console.log('✅ [AccountLink] Found user:', userData.id);

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store token in database
    // First, delete any existing tokens for this user
    await supabaseAdmin
      .from('account_management_tokens')
      .delete()
      .eq('user_id', userData.id);

    const { error: tokenError } = await supabaseAdmin
      .from('account_management_tokens')
      .insert({
        user_id: userData.id,
        token: token,
        phone_number: formattedPhone,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (tokenError) {
      console.error('❌ [AccountLink] Token error:', tokenError);
      
      // If table doesn't exist, create it
      if (tokenError.code === '42P01' || tokenError.message?.includes('does not exist')) {
        // Try to create table
        await supabaseAdmin.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.account_management_tokens (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL,
              token TEXT NOT NULL,
              phone_number TEXT,
              expires_at TIMESTAMPTZ NOT NULL,
              used BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_amt_token ON public.account_management_tokens(token);
            ALTER TABLE public.account_management_tokens ENABLE ROW LEVEL SECURITY;
            CREATE POLICY "Service role full access" ON public.account_management_tokens FOR ALL USING (true) WITH CHECK (true);
            GRANT ALL ON public.account_management_tokens TO service_role;
          `
        }).catch(() => {});

        // Retry insert
        const { error: retryError } = await supabaseAdmin
          .from('account_management_tokens')
          .insert({
            user_id: userData.id,
            token: token,
            phone_number: formattedPhone,
            expires_at: expiresAt.toISOString(),
            used: false,
          });

        if (retryError) {
          return NextResponse.json(
            { success: false, error: 'Please run the SQL setup first. See CREATE_ACCOUNT_MANAGEMENT_TOKENS.sql' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Failed to generate secure link' },
          { status: 500 }
        );
      }
    }

    // Build the account management URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.drop-dollar.com';
    const accountLink = `${baseUrl}/auth/manage-account?token=${token}`;

    // Send SMS with link
    const message = `DropDollar Account: Manage your account settings here: ${accountLink} (Link expires in 30 min)`;

    let smsSent = false;

    // Try using Twilio Messages API if we have a from number
    if (twilioFromNumber) {
      try {
        const smsUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        
        const smsResponse = await fetch(smsUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: twilioFromNumber,
            To: formattedPhone,
            Body: message,
          }),
        });

        const smsData = await smsResponse.json();
        
        if (smsResponse.ok) {
          console.log('✅ [AccountLink] SMS sent via Messages API');
          smsSent = true;
        } else {
          console.log('⚠️ [AccountLink] Messages API failed:', smsData);
        }
      } catch (err) {
        console.log('⚠️ [AccountLink] Messages API error:', err);
      }
    }

    // If Messages API didn't work and we have Verify service, use that as fallback
    // (Verify sends codes, not links, but we can still use it for verification)
    if (!smsSent && verifyServiceSid) {
      // For Verify, we'll just send a code and require code entry
      const verifyUrl = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`;
      
      const verifyResponse = await fetch(verifyUrl, {
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

      if (verifyResponse.ok) {
        console.log('✅ [AccountLink] Verification code sent via Verify API');
        
        // Return that we're using code verification instead
        return NextResponse.json({
          success: true,
          method: 'code',
          message: 'Verification code sent to your phone',
          phone: formattedPhone.slice(0, -4) + '****',
          token: token, // Client will use this after code verification
        });
      }
    }

    if (!smsSent) {
      // Clean up token since we couldn't send SMS
      await supabaseAdmin
        .from('account_management_tokens')
        .delete()
        .eq('token', token);

      return NextResponse.json(
        { success: false, error: 'Failed to send SMS. Please try again.' },
        { status: 500 }
      );
    }

    console.log('✅ [AccountLink] Account management link sent');

    return NextResponse.json({
      success: true,
      method: 'link',
      message: 'Account management link sent to your phone',
      phone: formattedPhone.slice(0, -4) + '****',
    });

  } catch (error) {
    console.error('❌ [AccountLink] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

