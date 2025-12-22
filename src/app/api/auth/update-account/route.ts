import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword, newEmail } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    if (!newPassword && !newEmail) {
      return NextResponse.json(
        { success: false, error: 'Please provide a new password or email to update' },
        { status: 400 }
      );
    }

    // Validate password if provided
    if (newPassword && newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (newEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
    }

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

    // Verify token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('account_management_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Get user data
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const oldEmail = userData.email;
    const updates: string[] = [];

    // Find auth user
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ [UpdateAccount] Error listing auth users:', authError);
      return NextResponse.json(
        { success: false, error: 'Failed to find user account' },
        { status: 500 }
      );
    }

    const authUser = authUsers.users.find(u => u.email?.toLowerCase() === oldEmail?.toLowerCase());

    if (!authUser) {
      console.log('⚠️ [UpdateAccount] Auth user not found for email:', oldEmail);
      return NextResponse.json(
        { success: false, error: 'Authentication account not found' },
        { status: 404 }
      );
    }

    // Check if new email is already in use
    if (newEmail) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', newEmail.toLowerCase())
        .neq('id', userData.id)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'This email address is already in use' },
          { status: 400 }
        );
      }
    }

    // Prepare auth update object
    const authUpdateData: { password?: string; email?: string } = {};
    if (newPassword) authUpdateData.password = newPassword;
    if (newEmail) authUpdateData.email = newEmail.toLowerCase();

    // Update auth user
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      authUpdateData
    );

    if (updateAuthError) {
      console.error('❌ [UpdateAccount] Auth update error:', updateAuthError);
      return NextResponse.json(
        { success: false, error: 'Failed to update account. Please try again.' },
        { status: 500 }
      );
    }

    if (newPassword) {
      updates.push('password');
      console.log('✅ [UpdateAccount] Password updated');
    }

    // Update users table if email changed
    if (newEmail) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          email: newEmail.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.id);

      if (updateError) {
        console.error('❌ [UpdateAccount] Users table update error:', updateError);
        // Try to rollback auth email
        if (oldEmail) {
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, { email: oldEmail });
        }
        return NextResponse.json(
          { success: false, error: 'Failed to update email. Please try again.' },
          { status: 500 }
        );
      }

      updates.push('email');
      console.log('✅ [UpdateAccount] Email updated');

      // Log email change
      try {
        await supabaseAdmin
          .from('email_change_log')
          .insert({
            user_id: userData.id,
            old_email: oldEmail,
            new_email: newEmail.toLowerCase(),
            verified_via: 'phone_link',
            phone_used: tokenData.phone_number,
          });
      } catch {
        console.log('⚠️ [UpdateAccount] Could not log email change');
      }
    }

    // Mark token as used
    await supabaseAdmin
      .from('account_management_tokens')
      .update({ used: true })
      .eq('token', token);

    console.log('✅ [UpdateAccount] Account updated successfully:', updates);

    return NextResponse.json({
      success: true,
      message: `Successfully updated: ${updates.join(' and ')}`,
      updates: updates,
      newEmail: newEmail ? newEmail.toLowerCase() : undefined,
    });

  } catch (error) {
    console.error('❌ [UpdateAccount] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

