import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Check if user_transactions table exists and is accessible
 * Diagnostic endpoint to troubleshoot save issues
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Try to query the table
    const { data, error } = await supabaseAdmin
      .from('user_transactions')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          exists: false,
          error: 'Table does not exist',
          message: 'Please run CREATE_USER_TRANSACTIONS_TABLE.sql in Supabase SQL Editor',
          code: error.code
        });
      }
      
      return NextResponse.json({
        exists: false,
        error: error.message,
        code: error.code
      });
    }

    return NextResponse.json({
      exists: true,
      message: 'Table exists and is accessible',
      sampleCount: data?.length || 0
    });

  } catch (error: any) {
    console.error('❌ [CheckTable] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

