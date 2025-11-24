/**
 * ADMIN API: TAX DATA BACKUP & DOWNLOAD
 * 
 * GET /api/tax/admin/backup
 * 
 * Download complete tax data backup in JSON or CSV format.
 * Includes all W-9s, earnings, 1099s, and payout records.
 * 
 * SECURITY: 
 * - Admin-only endpoint
 * - Contains sensitive tax information (SSN last 4)
 * - All downloads should be logged for audit trail
 * 
 * COMPLIANCE:
 * - IRS requires 7+ years of tax record retention
 * - Store backups in encrypted, access-controlled location
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
 * GET /api/tax/admin/backup?format=json&tax_year=2024
 * Download complete tax data backup
 * 
 * Query Parameters:
 * - format: 'json' or 'csv' (default: json)
 * - tax_year: Specific year or 'all' (default: current year)
 * - include: Comma-separated list: w9s,earnings,summaries,payouts (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access (API key or admin email like rf32191@gmail.com)
    const adminCheck = await isAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required. Please log in with rf32191@gmail.com' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const taxYearParam = searchParams.get('tax_year') || new Date().getFullYear().toString();
    const include = searchParams.get('include')?.split(',') || ['w9s', 'earnings', 'summaries', 'payouts'];

    const supabase = getServiceClient();

    // Initialize backup data structure
    const backupData: any = {
      backup_metadata: {
        created_at: new Date().toISOString(),
        tax_year: taxYearParam,
        format,
        includes: include,
        version: '1.0',
      },
      statistics: {},
      data: {},
    };

    // Get backup statistics
    if (include.includes('statistics') || include.length === 0) {
      const { data: stats, error: statsError } = await supabase.rpc('get_tax_backup_statistics');
      if (!statsError && stats) {
        backupData.statistics = stats.reduce((acc: any, row: any) => {
          acc[row.metric] = { value: row.value, description: row.description };
          return acc;
        }, {});
      }
    }

    // Get W-9 tax profiles
    if (include.includes('w9s')) {
      const { data: w9s, error: w9Error } = await supabase
        .from('tax_profiles_backup')
        .select('*')
        .order('created_at', { ascending: false });

      if (!w9Error) {
        backupData.data.tax_profiles = w9s || [];
      }
    }

    // Get earnings ledger
    if (include.includes('earnings')) {
      let earningsQuery = supabase
        .from('earnings_ledger_backup')
        .select('*')
        .order('occurred_at', { ascending: false });

      // Filter by tax year if specified
      if (taxYearParam !== 'all') {
        const taxYear = parseInt(taxYearParam);
        earningsQuery = earningsQuery.eq('tax_year', taxYear);
      }

      const { data: earnings, error: earningsError } = await earningsQuery;

      if (!earningsError) {
        backupData.data.earnings_ledger = earnings || [];
      }
    }

    // Get tax year summaries
    if (include.includes('summaries')) {
      let summariesQuery = supabase
        .from('tax_year_summaries_backup')
        .select('*')
        .order('tax_year', { ascending: false });

      // Filter by tax year if specified
      if (taxYearParam !== 'all') {
        const taxYear = parseInt(taxYearParam);
        summariesQuery = summariesQuery.eq('tax_year', taxYear);
      }

      const { data: summaries, error: summariesError } = await summariesQuery;

      if (!summariesError) {
        backupData.data.tax_year_summaries = summaries || [];
      }
    }

    // Get payout requests
    if (include.includes('payouts')) {
      const { data: payouts, error: payoutsError } = await supabase
        .from('payout_requests_backup')
        .select('*')
        .order('created_at', { ascending: false });

      if (!payoutsError) {
        backupData.data.payout_requests = payouts || [];
      }
    }

    // Get integrity verification
    if (taxYearParam !== 'all') {
      const taxYear = parseInt(taxYearParam);
      const { data: integrity, error: integrityError } = await supabase.rpc(
        'verify_tax_backup_integrity',
        { p_tax_year: taxYear }
      );

      if (!integrityError && integrity) {
        backupData.integrity_check = integrity;
      }
    }

    // Return as JSON
    if (format === 'json') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `tax-backup-${taxYearParam}-${timestamp}.json`;

      return new NextResponse(JSON.stringify(backupData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Return as CSV (simplified - one CSV per data type)
    if (format === 'csv') {
      // For CSV, we'll create a multi-section CSV file
      let csvContent = '';

      // Add metadata
      csvContent += '# TAX BACKUP METADATA\n';
      csvContent += `# Created: ${backupData.backup_metadata.created_at}\n`;
      csvContent += `# Tax Year: ${backupData.backup_metadata.tax_year}\n`;
      csvContent += '\n';

      // W-9 Profiles
      if (backupData.data.tax_profiles && backupData.data.tax_profiles.length > 0) {
        csvContent += '# W-9 TAX PROFILES\n';
        const w9Headers = Object.keys(backupData.data.tax_profiles[0]).join(',');
        csvContent += w9Headers + '\n';
        backupData.data.tax_profiles.forEach((row: any) => {
          const values = Object.values(row).map(v => 
            typeof v === 'string' && v.includes(',') ? `"${v}"` : v
          ).join(',');
          csvContent += values + '\n';
        });
        csvContent += '\n';
      }

      // Earnings Ledger (summary only for CSV to keep file size reasonable)
      if (backupData.data.earnings_ledger) {
        csvContent += '# EARNINGS SUMMARY\n';
        csvContent += `Total Records: ${backupData.data.earnings_ledger.length}\n`;
        csvContent += '\n';
      }

      // Tax Year Summaries
      if (backupData.data.tax_year_summaries && backupData.data.tax_year_summaries.length > 0) {
        csvContent += '# TAX YEAR SUMMARIES\n';
        const summaryHeaders = Object.keys(backupData.data.tax_year_summaries[0]).join(',');
        csvContent += summaryHeaders + '\n';
        backupData.data.tax_year_summaries.forEach((row: any) => {
          const values = Object.values(row).map(v => 
            typeof v === 'string' && v.includes(',') ? `"${v}"` : v
          ).join(',');
          csvContent += values + '\n';
        });
        csvContent += '\n';
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `tax-backup-${taxYearParam}-${timestamp}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid format. Use json or csv.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating tax backup:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tax/admin/backup/verify
 * Verify backup integrity for a tax year
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await isAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in with rf32191@gmail.com' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const taxYear = body.tax_year || new Date().getFullYear();

    const supabase = getServiceClient();

    // Run integrity verification
    const { data: integrity, error } = await supabase.rpc(
      'verify_tax_backup_integrity',
      { p_tax_year: taxYear }
    );

    if (error) {
      console.error('Integrity check failed:', error);
      return NextResponse.json(
        { success: false, error: 'Integrity check failed' },
        { status: 500 }
      );
    }

    // Check if all tests passed
    const allPassed = integrity.every((check: any) => 
      check.status === 'PASS' || check.status === 'WARNING'
    );

    const criticalFailures = integrity.filter((check: any) => 
      check.status === 'FAIL'
    );

    return NextResponse.json({
      success: true,
      tax_year: taxYear,
      overall_status: allPassed ? 'PASS' : 'FAIL',
      checks: integrity,
      critical_failures: criticalFailures,
      summary: {
        total_checks: integrity.length,
        passed: integrity.filter((c: any) => c.status === 'PASS').length,
        warnings: integrity.filter((c: any) => c.status === 'WARNING').length,
        failed: criticalFailures.length,
      },
    });
  } catch (error) {
    console.error('Error verifying backup:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}

