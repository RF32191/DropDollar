/**
 * ADMIN API: EXPORT 1099 DATA FOR IRS E-FILE PROVIDERS
 * 
 * GET /api/tax/admin/export-1099s
 * 
 * Export 1099 data in CSV format for upload to IRS e-file providers
 * like Tax1099, Track1099, etc.
 * 
 * IMPORTANT: This endpoint should be admin-only or secured with API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { export1099DataForYear, exportRecordsToCSV } from '@/lib/tax/form1099';
import { getCurrentTaxYear } from '@/lib/tax/config';
import { isAdmin } from '@/lib/auth/adminAuth';

/**
 * GET /api/tax/admin/export-1099s?tax_year=2024&format=csv
 * Export 1099 data for IRS e-filing
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access (API key or admin email like rf32191@gmail.com)
    const adminCheck = await isAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized - Please log in with rf32191@gmail.com' 
        },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const taxYear = parseInt(searchParams.get('tax_year') || String(getCurrentTaxYear() - 1));
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'

    console.log(`📊 Exporting 1099 data for tax year ${taxYear} in ${format} format...`);

    const exportRecords = await export1099DataForYear(taxYear);

    if (exportRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No 1099 data to export for tax year ${taxYear}`,
        count: 0,
        records: [],
      });
    }

    // Return CSV format
    if (format === 'csv') {
      const csv = exportRecordsToCSV(exportRecords);
      
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="1099-NEC-${taxYear}.csv"`,
        },
      });
    }

    // Return JSON format
    return NextResponse.json({
      success: true,
      tax_year: taxYear,
      count: exportRecords.length,
      records: exportRecords,
      instructions: {
        next_steps: [
          '1. Upload this data to your IRS e-file provider (Tax1099, Track1099, etc.)',
          '2. Review all records for accuracy',
          '3. Submit to IRS by January 31',
          '4. Keep a copy for your records (7 years)',
        ],
        recommended_providers: [
          'Tax1099.com',
          'Track1099.com',
          'Tax Bandits',
          'TaxAct 1099',
        ],
      },
    });
  } catch (error) {
    console.error('Error exporting 1099 data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export 1099 data',
      },
      { status: 500 }
    );
  }
}

