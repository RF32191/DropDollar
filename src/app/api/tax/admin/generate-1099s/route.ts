/**
 * ADMIN API: GENERATE 1099-NEC FORMS
 * 
 * POST /api/tax/admin/generate-1099s
 * 
 * Manually trigger 1099 generation for a tax year.
 * This can also be called by a cron job.
 * 
 * IMPORTANT: This endpoint should be admin-only or secured with API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePending1099s } from '@/lib/tax/form1099';
import { getCurrentTaxYear } from '@/lib/tax/config';
import { isAdmin } from '@/lib/auth/adminAuth';

/**
 * POST /api/tax/admin/generate-1099s
 * Generate 1099-NEC forms for a given tax year
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access (API key or admin email like rf32191@gmail.com)
    const adminCheck = await isAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized - Admin access required. Please log in with rf32191@gmail.com' 
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const taxYear = body.tax_year || getCurrentTaxYear() - 1; // Default to last year

    console.log(`🔄 Starting 1099 generation for tax year ${taxYear}...`);

    const result = await generatePending1099s(taxYear);

    console.log(`✅ 1099 generation complete: ${result.success} succeeded, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      tax_year: taxYear,
      stats: {
        success: result.success,
        failed: result.failed,
        total: result.success + result.failed,
      },
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error generating 1099s:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate 1099s',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tax/admin/generate-1099s
 * Check status of 1099 generation for a tax year
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taxYear = parseInt(searchParams.get('tax_year') || String(getCurrentTaxYear() - 1));

    const supabase = await import('@supabase/supabase-js').then(mod => 
      mod.createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    );

    const { data: summaries, error } = await supabase
      .from('tax_year_summaries')
      .select('form_1099_delivery_status')
      .eq('tax_year', taxYear)
      .eq('needs_1099', true);

    if (error) {
      throw error;
    }

    const stats = {
      total: summaries?.length || 0,
      not_generated: summaries?.filter(s => s.form_1099_delivery_status === 'not_generated').length || 0,
      generated: summaries?.filter(s => s.form_1099_delivery_status === 'generated').length || 0,
      sent_email: summaries?.filter(s => s.form_1099_delivery_status === 'sent_email').length || 0,
      error: summaries?.filter(s => s.form_1099_delivery_status === 'error').length || 0,
    };

    return NextResponse.json({
      success: true,
      tax_year: taxYear,
      stats,
    });
  } catch (error) {
    console.error('Error checking 1099 status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check 1099 status',
      },
      { status: 500 }
    );
  }
}

