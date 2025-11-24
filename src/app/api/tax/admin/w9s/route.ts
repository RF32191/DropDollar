/**
 * ADMIN API: VIEW ALL W-9 TAX PROFILES
 * 
 * GET /api/tax/admin/w9s
 * 
 * View all submitted W-9 forms with search and pagination.
 * Admin-only endpoint for compliance and record management.
 * 
 * SECURITY: Requires admin authentication or API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/auth/adminAuth';

const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * GET /api/tax/admin/w9s
 * List all W-9 tax profiles with search and pagination
 * 
 * Query Parameters:
 * - limit: Number of records per page (default: 50, max: 500)
 * - offset: Number of records to skip (default: 0)
 * - search: Search by name, email, SSN last 4, or EIN
 * - needs_1099: Filter by users needing 1099 (true/false)
 * - verified: Filter by verification status (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access (API key or admin email like rf32191@gmail.com)
    const adminCheck = await isAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized - Admin access required. Please log in with an admin account.',
          code: 'ADMIN_ACCESS_REQUIRED'
        },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || null;
    const needsFilter = searchParams.get('needs_1099'); // 'true' or 'false'
    const verifiedFilter = searchParams.get('verified'); // 'true' or 'false'

    const supabase = getServiceClient();

    // Use the admin function to get W-9s
    let query = supabase.rpc('admin_get_all_w9s', {
      p_limit: limit,
      p_offset: offset,
      p_search: search,
    });

    const { data: w9s, error } = await query;

    if (error) {
      console.error('Error fetching W-9s:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch W-9 records',
          details: error.message 
        },
        { status: 500 }
      );
    }

    // Apply additional filters if needed
    let filteredW9s = w9s || [];

    if (needsFilter !== null) {
      const needsValue = needsFilter === 'true';
      filteredW9s = filteredW9s.filter((w9: any) => w9.needs_1099_current_year === needsValue);
    }

    if (verifiedFilter !== null) {
      const verifiedValue = verifiedFilter === 'true';
      filteredW9s = filteredW9s.filter((w9: any) => w9.is_verified === verifiedValue);
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('tax_profiles')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: filteredW9s,
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        has_more: offset + limit < (totalCount || 0),
      },
      filters: {
        search: search || null,
        needs_1099: needsFilter || null,
        verified: verifiedFilter || null,
      },
    });
  } catch (error) {
    console.error('Error in W-9 admin endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tax/admin/w9s/[user_id]
 * Get complete tax record for a specific user
 * 
 * Returns:
 * - Tax profile (W-9 info)
 * - Complete earnings history
 * - Tax year summaries
 * - Payout history
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access (API key or admin email like rf32191@gmail.com)
    const adminCheck = await isAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required. Please log in with an admin account.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Get complete tax record
    const { data: taxRecord, error } = await supabase.rpc(
      'admin_get_user_complete_tax_record',
      { p_user_id: user_id }
    );

    if (error) {
      console.error('Error fetching user tax record:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tax record' },
        { status: 500 }
      );
    }

    // Organize data by section
    const organizedData: any = {
      tax_profile: null,
      earnings_history: [],
      tax_year_summaries: [],
      payout_history: [],
    };

    for (const row of taxRecord || []) {
      if (row.section === 'tax_profile') {
        organizedData.tax_profile = row.data;
      } else if (row.section === 'earnings_history') {
        organizedData.earnings_history = row.data || [];
      } else if (row.section === 'tax_year_summaries') {
        organizedData.tax_year_summaries = row.data || [];
      } else if (row.section === 'payout_history') {
        organizedData.payout_history = row.data || [];
      }
    }

    return NextResponse.json({
      success: true,
      user_id,
      data: organizedData,
    });
  } catch (error) {
    console.error('Error fetching user tax record:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

