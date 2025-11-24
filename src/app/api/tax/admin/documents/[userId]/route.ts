/**
 * ADMIN API: DOWNLOAD USER TAX DOCUMENTS
 * 
 * GET /api/tax/admin/documents/[userId]
 * 
 * Download all tax documents for a specific user:
 * - W-9 form data
 * - 1099-NEC forms (all years)
 * - Complete earnings history
 * - Payout history
 * 
 * Returns as downloadable PDF or JSON
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

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin access (API key or admin email like rf32191@gmail.com)
    const adminCheck = await isAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in with rf32191@gmail.com' },
        { status: 401 }
      );
    }

    const userId = params.userId;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json'; // 'json' or 'pdf'

    const supabase = getServiceClient();

    // Get complete tax record
    const { data: taxRecord, error } = await supabase.rpc(
      'admin_get_user_complete_tax_record',
      { p_user_id: userId }
    );

    if (error) {
      console.error('Error fetching user tax record:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tax documents' },
        { status: 500 }
      );
    }

    // Organize data
    const documentPackage: any = {
      user_id: userId,
      generated_at: new Date().toISOString(),
      generated_by: 'Admin',
      documents: {},
    };

    for (const row of taxRecord || []) {
      if (row.section === 'tax_profile') {
        documentPackage.documents.w9_information = row.data;
      } else if (row.section === 'earnings_history') {
        documentPackage.documents.earnings_history = row.data || [];
      } else if (row.section === 'tax_year_summaries') {
        documentPackage.documents.tax_year_summaries = row.data || [];
        
        // Get 1099 PDF URLs
        const summaries = row.data || [];
        documentPackage.documents.form_1099_urls = summaries
          .filter((s: any) => s.form_1099_pdf_url)
          .map((s: any) => ({
            tax_year: s.tax_year,
            url: s.form_1099_pdf_url,
            generated_at: s.form_1099_generated_at,
          }));
      } else if (row.section === 'payout_history') {
        documentPackage.documents.payout_history = row.data || [];
      }
    }

    // Calculate summary statistics
    const earnings = documentPackage.documents.earnings_history || [];
    const totalEarnings = earnings.reduce((sum: number, e: any) => sum + (e.amount_cents || 0), 0);
    const payouts = documentPackage.documents.payout_history || [];
    const totalPayouts = payouts
      .filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0);

    documentPackage.summary = {
      total_earnings_cents: totalEarnings,
      total_earnings_dollars: (totalEarnings / 100).toFixed(2),
      total_payouts_cents: totalPayouts,
      total_payouts_dollars: (totalPayouts / 100).toFixed(2),
      net_balance_cents: totalEarnings - totalPayouts,
      net_balance_dollars: ((totalEarnings - totalPayouts) / 100).toFixed(2),
      earnings_count: earnings.length,
      payouts_count: payouts.length,
      years_with_1099: documentPackage.documents.form_1099_urls?.length || 0,
    };

    // Return as JSON
    if (format === 'json') {
      const w9Name = documentPackage.documents.w9_information?.full_name || userId;
      const safeFileName = w9Name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `tax-documents-${safeFileName}-${timestamp}.json`;

      return new NextResponse(JSON.stringify(documentPackage, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // TODO: For PDF format, you would use a PDF library like pdfkit or @react-pdf/renderer
    // to generate a formatted PDF document
    if (format === 'pdf') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'PDF generation not yet implemented. Use format=json for now.',
          message: 'To implement PDF: Use pdfkit or @react-pdf/renderer library'
        },
        { status: 501 } // 501 = Not Implemented
      );
    }

    return NextResponse.json(
      { success: false, error: 'Invalid format. Use json or pdf.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating user tax documents:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

