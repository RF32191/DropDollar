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
    const { phone, code, newEmail, userId } = await request.json();

    if (!phone || !code || !newEmail) {
      return NextResponse.json(
        { success: false, error: 'Phone, code, and new email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);
    console.log('📧 [ChangeEmail] Verifying code and updating email for:', formattedPhone);

    // Check Twilio configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
      return NextResponse.json(
        { success: false, error: 'SMS service not configured' },
        { status: 503 }
      );
    }

    // Verify code with Twilio
    console.log('📤 [ChangeEmail] Verifying code with Twilio...');
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

    if (!response.ok || responseData.status !== 'approved') {
      console.log('❌ [ChangeEmail] Invalid code:', responseData);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired code. Please try again.' },
        { status: 400 }
      );
    }

    console.log('✅ [ChangeEmail] Code verified successfully');

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

    // Find user by phone number
    const digitsOnly = formattedPhone.replace(/\D/g, '');
    const last10Digits = digitsOnly.slice(-10);

    const { data: allPhones } = await supabaseAdmin
      .from('user_phones')
      .select('user_id, phone_number');

    const matchedPhone = allPhones?.find(p => {
      if (!p.phone_number) return false;
      const pDigits = p.phone_number.replace(/\D/g, '');
      const pLast10 = pDigits.slice(-10);
      return pLast10 === last10Digits;
    });

    if (!matchedPhone) {
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number.' },
        { status: 404 }
      );
    }

    // If userId provided, verify it matches
    if (userId && matchedPhone.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Phone number does not match your account.' },
        { status: 403 }
      );
    }

    const targetUserId = matchedPhone.user_id;
    console.log('✅ [ChangeEmail] Found user:', targetUserId);

    // Get current user data
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', targetUserId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User account not found.' },
        { status: 404 }
      );
    }

    const oldEmail = userData.email;
    console.log('📧 [ChangeEmail] Changing email from', oldEmail?.slice(0, 3) + '***', 'to', newEmail.slice(0, 3) + '***');

    // Check if new email is already in use
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', newEmail.toLowerCase())
      .neq('id', targetUserId)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'This email address is already in use by another account.' },
        { status: 400 }
      );
    }

    // Find auth user by old email to update
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ [ChangeEmail] Error listing auth users:', authError);
      return NextResponse.json(
        { success: false, error: 'Failed to find user account' },
        { status: 500 }
      );
    }

    const authUser = authUsers.users.find(u => u.email?.toLowerCase() === oldEmail?.toLowerCase());

    if (!authUser) {
      console.log('⚠️ [ChangeEmail] Auth user not found, updating users table only');
    }

    // Update auth user email if found
    if (authUser) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { email: newEmail.toLowerCase() }
      );

      if (updateAuthError) {
        console.error('❌ [ChangeEmail] Auth update error:', updateAuthError);
        return NextResponse.json(
          { success: false, error: 'Failed to update login email. Please try again.' },
          { status: 500 }
        );
      }
      console.log('✅ [ChangeEmail] Auth email updated');
    }

    // Update users table
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        email: newEmail.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId);

    if (updateError) {
      console.error('❌ [ChangeEmail] Users table update error:', updateError);
      
      // Try to rollback auth email if we updated it
      if (authUser && oldEmail) {
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, { email: oldEmail });
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to update email. Please try again.' },
        { status: 500 }
      );
    }

    console.log('✅ [ChangeEmail] Email updated successfully in users table');

    // Log the email change for audit
    try {
      await supabaseAdmin
        .from('email_change_log')
        .insert({
          user_id: targetUserId,
          old_email: oldEmail,
          new_email: newEmail.toLowerCase(),
          verified_via: 'phone',
          phone_used: formattedPhone,
        });
    } catch (logError) {
      // Non-critical, just log
      console.log('⚠️ [ChangeEmail] Could not log email change (table may not exist)');
    }

    return NextResponse.json({
      success: true,
      message: 'Email updated successfully',
      newEmail: newEmail.toLowerCase(),
    });

  } catch (error) {
    console.error('❌ [ChangeEmail] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

