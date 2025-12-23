import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Unified user lookup API
 * Works with email, username, or phone number
 * Returns the email needed for Supabase Auth login
 */
export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Identifier is required' },
        { status: 400 }
      );
    }

    const trimmed = (identifier || '').trim();

    if (trimmed.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Invalid identifier' },
        { status: 400 }
      );
    }

    console.log('🔍 [FindUser] Looking up:', trimmed.substring(0, 4) + '***');

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

    // Try the unified RPC function first
    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin
        .rpc('get_user_by_identifier', { identifier: trimmed });

      if (!rpcError && rpcResult && rpcResult.length > 0 && rpcResult[0].email) {
        console.log('✅ [FindUser] Found via RPC');
        return NextResponse.json({
          success: true,
          email: rpcResult[0].email,
          username: rpcResult[0].username,
          hasPhone: !!rpcResult[0].phone_number
        });
      }
    } catch (e) {
      console.log('📋 [FindUser] RPC not available, trying manual lookup');
    }

    // Manual fallback - check if it's an email
    if (trimmed.includes('@')) {
      const { data: emailUser } = await supabaseAdmin
        .from('users')
        .select('id, email, username')
        .ilike('email', trimmed)
        .single();

      if (emailUser?.email) {
        console.log('✅ [FindUser] Found by email');
        return NextResponse.json({
          success: true,
          email: emailUser.email,
          username: emailUser.username
        });
      }
    }

    // Check if it's a username
    const { data: usernameUser } = await supabaseAdmin
      .from('users')
      .select('id, email, username')
      .ilike('username', trimmed)
      .single();

    if (usernameUser?.email) {
      console.log('✅ [FindUser] Found by username');
      return NextResponse.json({
        success: true,
        email: usernameUser.email,
        username: usernameUser.username
      });
    }

    // Check if it's a phone number
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 10) {
      const last10 = digits.slice(-10);
      
      // Get all phones and match
      const { data: phones } = await supabaseAdmin
        .from('user_phones')
        .select('user_id, phone_number');

      const matchedPhone = phones?.find(p => {
        if (!p.phone_number) return false;
        const pDigits = p.phone_number.replace(/\D/g, '');
        return pDigits.slice(-10) === last10;
      });

      if (matchedPhone) {
        const { data: phoneUser } = await supabaseAdmin
          .from('users')
          .select('id, email, username')
          .eq('id', matchedPhone.user_id)
          .single();

        if (phoneUser?.email) {
          console.log('✅ [FindUser] Found by phone');
          return NextResponse.json({
            success: true,
            email: phoneUser.email,
            username: phoneUser.username,
            hasPhone: true
          });
        }
      }
    }

    console.log('❌ [FindUser] Not found');
    return NextResponse.json(
      { success: false, error: 'No account found with this email, username, or phone number' },
      { status: 404 }
    );

  } catch (error) {
    console.error('❌ [FindUser] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

