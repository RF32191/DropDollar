/**
 * ADMIN API: MESSAGE 1099-NEC FORMS TO USERS
 * 
 * POST /api/tax/admin/email-1099s
 * 
 * Send 1099 notifications to users via internal messaging system.
 * Users receive notifications in their account dashboard instead of email.
 * This can also be called by a cron job.
 * 
 * IMPORTANT: This endpoint should be admin-only or secured with API key
 * DEADLINE: Must be sent by January 31
 */

import { NextRequest, NextResponse } from 'next/server';
import { message1099Forms } from '@/lib/tax/form1099';
import { getCurrentTaxYear } from '@/lib/tax/config';
import { isAdmin } from '@/lib/auth/adminAuth';

/**
 * POST /api/tax/admin/email-1099s
 * Send 1099-NEC notifications to users for a given tax year
 * (Name kept as "email-1099s" for backwards compatibility, but uses messaging)
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

    console.log(`📨 Starting 1099 notification delivery for tax year ${taxYear}...`);

    const result = await message1099Forms(taxYear);

    console.log(`✅ Notification delivery complete: ${result.success} sent, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      tax_year: taxYear,
      delivery_method: 'internal_notification',
      message: 'Notifications sent to user accounts (not email)',
      stats: {
        success: result.success,
        failed: result.failed,
        total: result.success + result.failed,
      },
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error sending 1099 notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send 1099 notifications',
      },
      { status: 500 }
    );
  }
}

