import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    const trimmedUsername = (username || '').trim().toLowerCase();

    if (trimmedUsername.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Invalid username' },
        { status: 400 }
      );
    }

    console.log('🔍 [FindEmail] Looking up username:', trimmedUsername);

    // Setup Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [FindEmail] Missing Supabase config');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find user by username in users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, username')
      .ilike('username', trimmedUsername)
      .single();

    if (userError || !userData) {
      console.log('❌ [FindEmail] Username not found:', trimmedUsername);
      return NextResponse.json(
        { success: false, error: 'No account found with this username' },
        { status: 404 }
      );
    }

    if (!userData.email) {
      console.log('❌ [FindEmail] User has no email:', trimmedUsername);
      return NextResponse.json(
        { success: false, error: 'Account has no email associated' },
        { status: 404 }
      );
    }

    console.log('✅ [FindEmail] Found email for username:', trimmedUsername);

    return NextResponse.json({
      success: true,
      email: userData.email,
    });

  } catch (error) {
    console.error('❌ [FindEmail] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

