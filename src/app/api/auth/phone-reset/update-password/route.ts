import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { resetToken, newPassword } = await request.json();

    if (!resetToken || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Reset token and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    console.log('🔐 [PhoneReset] Updating password with token');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find the reset token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', resetToken)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      console.log('❌ [PhoneReset] Invalid or expired token');
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log('❌ [PhoneReset] Token expired');
      return NextResponse.json(
        { success: false, error: 'Reset token has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Get the user's email to find their auth ID
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !userData?.email) {
      console.log('❌ [PhoneReset] User not found');
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find auth user by email
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ [PhoneReset] Error listing auth users:', authError);
      return NextResponse.json(
        { success: false, error: 'Failed to find user account' },
        { status: 500 }
      );
    }

    const authUser = authUsers.users.find(u => u.email?.toLowerCase() === userData.email.toLowerCase());

    if (!authUser) {
      console.log('❌ [PhoneReset] Auth user not found for email:', userData.email);
      return NextResponse.json(
        { success: false, error: 'User account not found' },
        { status: 404 }
      );
    }

    // Update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ [PhoneReset] Password update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    // Mark token as used
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', resetToken);

    console.log('✅ [PhoneReset] Password updated successfully for user:', userData.id);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });

  } catch (error: any) {
    console.error('❌ [PhoneReset] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

