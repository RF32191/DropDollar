import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('🔐 [API] Sending password reset email to:', email);

    // Get the site URL from headers or use default
    const origin = request.headers.get('origin') || 'https://www.drop-dollar.com';
    const redirectTo = `${origin}/auth/reset-password`;

    console.log('🔐 [API] Redirect URL:', redirectTo);

    // Check if we have the service role key for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      console.error('❌ [API] Missing NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (serviceRoleKey) {
      // Use admin client for more reliable password reset
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // First, check if user exists
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ [API] Error listing users:', listError);
      } else {
        const userExists = users?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
        if (!userExists) {
          console.log('⚠️ [API] User not found:', email);
          // Don't reveal if user exists for security, but log it
          // Still try to send reset to avoid user enumeration
        }
      }

      // Try to generate recovery link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirectTo,
        }
      });

      if (linkError) {
        console.error('❌ [API] Generate link error:', linkError);
        
        // Fall through to regular method
      } else if (linkData?.properties?.action_link) {
        // We have the link! Now we need to send it via email
        // Supabase should send it automatically if SMTP is configured
        console.log('✅ [API] Recovery link generated');
        
        // The generateLink method creates the link but may not send email
        // if SMTP isn't configured in Supabase dashboard
        // We should also try the regular resetPasswordForEmail
      }
    }

    // Use regular client method (this will use Supabase's built-in email)
    const supabase = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });

    if (error) {
      console.error('❌ [API] Password reset error:', error);
      
      // Provide more helpful error messages
      if (error.message.includes('invalid') || error.message.includes('Invalid')) {
        // This often means SMTP is not configured in Supabase
        console.error('❌ [API] Likely SMTP not configured in Supabase dashboard');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email service is temporarily unavailable. Please contact support or try again later.',
            code: 'SMTP_NOT_CONFIGURED'
          },
          { status: 503 }
        );
      }
      
      if (error.message.includes('rate') || error.message.includes('limit')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Too many reset attempts. Please wait a few minutes and try again.'
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.log('✅ [API] Password reset email sent successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error: any) {
    console.error('❌ [API] Password reset error:', error);
    
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

