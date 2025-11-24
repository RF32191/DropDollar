/**
 * ADMIN TEST API: Generate Test 1099 for Admin
 * 
 * POST /api/tax/admin/test-1099
 * 
 * Allows admin to test the 1099 generation and email flow
 * with a custom amount without affecting real user data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import TAX_CONFIG, { formatCurrency } from '@/lib/tax/config';
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
 * Send test 1099-NEC notification to admin via internal messaging
 */
async function sendTestTaxNotification(
  userId: string,
  toEmail: string,
  taxYear: number,
  amountCents: number
): Promise<boolean> {
  const supabase = getServiceClient();
  
  try {
    // Send internal notification via messaging system
    const { data, error } = await supabase.rpc('send_1099_notification', {
      p_user_id: userId,
      p_tax_year: taxYear,
      p_amount_cents: amountCents,
      p_document_url: null, // Test mode - no actual document
    });

    if (error) {
      console.error('Error sending test notification:', error);
      return false;
    }

    console.log(`✅ Sent test 1099 notification to user ${userId} (${toEmail})`);
    
    // Also log the email content that would have been sent
    const emailContent = {
      from: `${TAX_CONFIG.email.from_name} <${TAX_CONFIG.email.from_email}>`,
      to: toEmail,
      subject: `[TEST] Your ${taxYear} 1099-NEC Tax Form`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🧾 TEST 1099-NEC Form</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">This is a test document</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-weight: bold;">⚠️ TEST MODE</p>
              <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">This is a test 1099 generated for admin testing. Not for actual tax filing.</p>
            </div>

            <h2 style="color: #1f2937; margin-bottom: 20px;">Tax Year ${taxYear} Summary</h2>
            
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: 600;">Box 1: Nonemployee Compensation</p>
              <p style="margin: 10px 0 0 0; font-size: 32px; color: #1e3a8a; font-weight: bold;">
                ${formatCurrency(amountCents)}
              </p>
            </div>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Payer Information:</h3>
              <p style="margin: 5px 0; color: #6b7280;">
                <strong>${TAX_CONFIG.payer.legal_name}</strong><br/>
                EIN: ${TAX_CONFIG.payer.ein}<br/>
                ${TAX_CONFIG.payer.address.line1}<br/>
                ${TAX_CONFIG.payer.address.city}, ${TAX_CONFIG.payer.address.state} ${TAX_CONFIG.payer.address.postal_code}
              </p>
            </div>

            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-weight: bold;">Important Tax Information:</p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #991b1b;">
                <li>This is TEST data for system verification</li>
                <li>Do not use this for actual tax filing</li>
                <li>Real 1099s will be generated in January for production</li>
              </ul>
            </div>

            <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <h3 style="color: #374151;">Test Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; color: #6b7280;">Generated At:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${new Date().toLocaleString()}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; color: #6b7280;">Tax Year:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${taxYear}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${formatCurrency(amountCents)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Recipient:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${toEmail}</td>
                </tr>
              </table>
            </div>

            <div style="background: #ecfdf5; border: 1px solid #6ee7b7; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                ✅ <strong>Test Successful!</strong> The 1099 generation and email system is working correctly.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center;">
              Questions? Contact: ${TAX_CONFIG.payer.contact_email}
            </p>
          </div>
        </div>
      `,
    };

    console.log('📨 [TEST MODE] Notification sent to user account');
    console.log('📨 Email preview (for reference):', emailContent);
    
    return true;
  } catch (error) {
    console.error('Error sending test tax email:', error);
    return false;
  }
}

/**
 * POST /api/tax/admin/test-1099
 * Generate and email test 1099
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
    const { email, amount_cents, tax_year } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!amount_cents || amount_cents <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required (must be > 0)' },
        { status: 400 }
      );
    }

    const taxYear = tax_year || new Date().getFullYear();
    const supabase = getServiceClient();

    // Find admin user by email
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .limit(1);

    let adminUserId = null;
    
    // Try to get user by email via auth.admin
    try {
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      const adminUser = authUsers?.find((u: any) => u.email === email);
      adminUserId = adminUser?.id;
    } catch (e) {
      console.log('Could not fetch user via auth.admin');
    }

    if (!adminUserId) {
      return NextResponse.json(
        {
          success: false,
          error: `No user account found for ${email}. Please sign up first.`,
          action_required: 'create_account',
        },
        { status: 400 }
      );
    }

    // Check if admin has W-9 on file
    const { data: existingW9 } = await supabase
      .from('tax_profiles')
      .select('*')
      .eq('user_id', adminUserId)
      .single();

    if (!existingW9) {
      // Prompt admin to fill W-9 first
      return NextResponse.json(
        {
          success: false,
          error: 'Please complete your W-9 form first before generating test 1099',
          action_required: 'fill_w9',
          message: 'Click "Fill Out Admin W-9 Form" in the test section above.',
        },
        { status: 400 }
      );
    }

    // Send test notification to user's account
    const notificationSent = await sendTestTaxNotification(adminUserId, email, taxYear, amount_cents);

    if (!notificationSent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send test notification' },
        { status: 500 }
      );
    }

    console.log(`✅ Test 1099 notification sent to ${email} for ${formatCurrency(amount_cents)}`);

    return NextResponse.json({
      success: true,
      message: 'Test 1099 generated and sent to your account notifications',
      details: {
        email,
        user_id: adminUserId,
        amount_cents,
        amount_dollars: (amount_cents / 100).toFixed(2),
        tax_year: taxYear,
        sent_at: new Date().toISOString(),
        notification_location: 'Check your account dashboard for the notification',
      },
    });
  } catch (error) {
    console.error('Error generating test 1099:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate test 1099',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

