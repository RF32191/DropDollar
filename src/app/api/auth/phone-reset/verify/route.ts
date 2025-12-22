import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

// Helper function to ensure table exists
async function ensureTableExists(supabaseAdmin: SupabaseClient): Promise<boolean> {
  try {
    // Try to create the table if it doesn't exist
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          token TEXT NOT NULL,
          phone_number TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_prt_token ON public.password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_prt_user ON public.password_reset_tokens(user_id);
      `
    });
    
    if (error) {
      console.log('⚠️ [PhoneReset] Could not create table via RPC:', error.message);
      return false;
    }
    
    console.log('✅ [PhoneReset] Table ensured to exist');
    return true;
  } catch (err) {
    console.log('⚠️ [PhoneReset] Table creation RPC not available');
    return false;
  }
}

// Helper function to create reset token
async function createResetToken(
  supabaseAdmin: SupabaseClient, 
  userData: { id: string; email: string | null }, 
  formattedPhone: string
): Promise<NextResponse> {
  try {
    // Generate a secure reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    console.log('🔑 [PhoneReset] Creating reset token for user:', userData.id);

    // First, try to delete any existing token for this user
    const { error: deleteError } = await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', userData.id);
    
    if (deleteError) {
      console.log('⚠️ [PhoneReset] Delete error (may be first token):', deleteError.code);
      
      // If table doesn't exist, try to create it
      if (deleteError.code === '42P01' || deleteError.message?.includes('does not exist')) {
        console.log('🔧 [PhoneReset] Table does not exist, attempting to create...');
        await ensureTableExists(supabaseAdmin);
      }
    } else {
      console.log('✅ [PhoneReset] Cleaned up old tokens');
    }

    // Store reset token in database
    const { error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: userData.id,
        token: resetToken,
        phone_number: formattedPhone,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (tokenError) {
      console.error('❌ [PhoneReset] Token insert error:', tokenError);
      
      // If table still doesn't exist, provide clear instructions
      if (tokenError.code === '42P01' || tokenError.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Password reset system needs setup. Please run the SQL migration in Supabase.',
            needsSetup: true
          },
          { status: 500 }
        );
      }

      // If unique constraint violation, try upsert instead
      if (tokenError.code === '23505') {
        console.log('🔄 [PhoneReset] Token exists, updating...');
        const { error: updateError } = await supabaseAdmin
          .from('password_reset_tokens')
          .update({
            token: resetToken,
            phone_number: formattedPhone,
            expires_at: expiresAt.toISOString(),
            used: false,
          })
          .eq('user_id', userData.id);
        
        if (updateError) {
          console.error('❌ [PhoneReset] Token update error:', updateError);
          return NextResponse.json(
            { success: false, error: 'Failed to generate reset token. Please try again.' },
            { status: 500 }
          );
        }
        
        console.log('✅ [PhoneReset] Reset token updated successfully');
        return NextResponse.json({
          success: true,
          message: 'Phone verified successfully',
          resetToken: resetToken,
          email: userData.email ? userData.email.slice(0, 3) + '***' : null,
        });
      }

      return NextResponse.json(
        { success: false, error: 'Failed to generate reset token. Please try again.' },
        { status: 500 }
      );
    }

    console.log('✅ [PhoneReset] Reset token created successfully');

    // Return the token for client to use
    return NextResponse.json({
      success: true,
      message: 'Phone verified successfully',
      resetToken: resetToken,
      email: userData.email ? userData.email.slice(0, 3) + '***' : null,
    });
  } catch (err) {
    console.error('❌ [PhoneReset] createResetToken error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create reset token' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = body;

    console.log('📥 [PhoneReset] Received request:', { phone: phone ? '***' + phone.slice(-4) : 'missing', codeLength: code?.length });

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: 'Phone and code are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);
    console.log('🔐 [PhoneReset] Verifying code for:', formattedPhone);

    // Check Twilio configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
      console.error('❌ [PhoneReset] Missing Twilio config');
      return NextResponse.json(
        { success: false, error: 'SMS service not configured' },
        { status: 503 }
      );
    }

    // Verify code with Twilio
    console.log('📤 [PhoneReset] Calling Twilio Verify...');
    const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        Code: code,
      }),
    });

    const responseData = await response.json();
    console.log('📥 [PhoneReset] Twilio response:', { status: responseData.status, valid: responseData.valid });

    if (!response.ok || responseData.status !== 'approved') {
      console.log('❌ [PhoneReset] Invalid code:', responseData);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired code. Please try again.' },
        { status: 400 }
      );
    }

    console.log('✅ [PhoneReset] Code verified successfully with Twilio');

    // Setup Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [PhoneReset] Missing Supabase config');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find user by phone in user_phones table
    console.log('🔍 [PhoneReset] Looking for phone in user_phones table...');
    
    const digitsOnly = formattedPhone.replace(/\D/g, '');
    const last10Digits = digitsOnly.slice(-10);
    
    // Get all phones to do flexible matching
    const { data: allPhones, error: phonesError } = await supabaseAdmin
      .from('user_phones')
      .select('user_id, phone_number');
    
    if (phonesError) {
      console.error('❌ [PhoneReset] Error fetching user_phones:', phonesError);
      
      if (phonesError.code === '42P01' || phonesError.message?.includes('does not exist')) {
        return NextResponse.json(
          { success: false, error: 'Phone database not configured. Please contact support.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Database error. Please try again.' },
        { status: 500 }
      );
    }

    console.log('📊 [PhoneReset] Found', allPhones?.length || 0, 'phones in database');

    // Find matching phone by last 10 digits
    const matchedPhone = allPhones?.find(p => {
      if (!p.phone_number) return false;
      const pDigits = p.phone_number.replace(/\D/g, '');
      const pLast10 = pDigits.slice(-10);
      return pLast10 === last10Digits;
    });

    if (!matchedPhone) {
      console.log('❌ [PhoneReset] No phone match found');
      console.log('   Searched for digits:', last10Digits);
      console.log('   Available phones:', allPhones?.map(p => p.phone_number?.slice(-4)));
      
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number. Please make sure you are using the phone number you registered with.' },
        { status: 404 }
      );
    }

    console.log('✅ [PhoneReset] Found matching phone, user_id:', matchedPhone.user_id);
    
    // Get user data
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', matchedPhone.user_id)
      .single();

    if (userError || !userData) {
      console.error('❌ [PhoneReset] User not found:', userError);
      return NextResponse.json(
        { success: false, error: 'Account not found.' },
        { status: 404 }
      );
    }

    console.log('✅ [PhoneReset] Found user:', userData.id, 'email:', userData.email?.slice(0, 3) + '***');

    return await createResetToken(supabaseAdmin, userData, formattedPhone);

  } catch (error) {
    console.error('❌ [PhoneReset] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
