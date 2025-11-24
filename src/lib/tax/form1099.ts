/**
 * 1099-NEC GENERATION & EMAIL DELIVERY
 * 
 * Functions for generating 1099-NEC forms and delivering them to users.
 * 
 * IMPORTANT: This generates PDF and JSON representations of 1099-NEC forms.
 * For IRS e-filing, you must use a third-party provider like Tax1099 or Track1099.
 * 
 * IRS Deadline: January 31
 */

import { createClient } from '@supabase/supabase-js';
import { 
  Form1099NECData, 
  Form1099ExportRecord,
  UserNeedingForm1099,
  TaxComplianceError,
  TAX_ERROR_CODES 
} from '@/types/tax';
import TAX_CONFIG, { getCurrentTaxYear, formatCurrency } from './config';

// Initialize Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

// ============================================================================
// 1099 DATA GENERATION
// ============================================================================

/**
 * Generate 1099-NEC data for a specific user and tax year
 */
export async function generate1099DataForUser(
  userId: string,
  taxYear: number
): Promise<Form1099NECData | null> {
  const supabase = getServiceClient();

  try {
    // Get tax year summary
    const { data: summary, error: summaryError } = await supabase
      .from('tax_year_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('tax_year', taxYear)
      .single();

    if (summaryError || !summary) {
      console.error('Tax year summary not found:', summaryError);
      return null;
    }

    // Check if 1099 is needed
    if (!summary.needs_1099) {
      console.log(`User ${userId} does not need 1099 for ${taxYear} (earnings below $600)`);
      return null;
    }

    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new TaxComplianceError(
        'User not found',
        'USER_NOT_FOUND',
        404
      );
    }

    // Get tax profile
    const { data: taxProfile, error: profileError } = await supabase
      .from('tax_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !taxProfile) {
      throw new TaxComplianceError(
        'Tax profile not found for user',
        TAX_ERROR_CODES.W9_REQUIRED,
        400
      );
    }

    // Build 1099-NEC data
    const form1099Data: Form1099NECData = {
      tax_year: taxYear,
      payer: {
        name: TAX_CONFIG.payer.legal_name,
        ein: TAX_CONFIG.payer.ein,
        address_line1: TAX_CONFIG.payer.address.line1,
        address_line2: TAX_CONFIG.payer.address.line2,
        city: TAX_CONFIG.payer.address.city,
        state: TAX_CONFIG.payer.address.state,
        postal_code: TAX_CONFIG.payer.address.postal_code,
        phone: TAX_CONFIG.payer.phone,
      },
      recipient: {
        user_id: userId,
        name: taxProfile.full_name,
        tin_last4: taxProfile.ssn_last4,
        ein: taxProfile.ein || undefined,
        address_line1: taxProfile.address_line1,
        address_line2: taxProfile.address_line2 || undefined,
        city: taxProfile.city,
        state: taxProfile.state,
        postal_code: taxProfile.postal_code,
      },
      nonemployee_compensation: summary.total_earnings_cents / 100, // Convert to dollars
      generated_at: new Date().toISOString(),
      form_id: `1099-NEC-${taxYear}-${userId.slice(0, 8)}`,
    };

    return form1099Data;
  } catch (error) {
    console.error('Error generating 1099 data:', error);
    throw error;
  }
}

/**
 * Generate 1099-NEC PDFs for all users who need them for a given tax year
 * 
 * This is typically run as a scheduled job after the tax year ends.
 * 
 * @param taxYear The tax year to generate 1099s for
 * @returns Count of successfully generated 1099s
 */
export async function generatePending1099s(taxYear: number): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getServiceClient();
  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  try {
    // Get all users needing 1099s
    const { data: users, error } = await supabase.rpc('get_users_needing_1099', {
      p_tax_year: taxYear,
    });

    if (error) {
      console.error('Error fetching users needing 1099s:', error);
      throw new TaxComplianceError(
        'Failed to fetch users needing 1099s',
        TAX_ERROR_CODES.FORM_1099_GENERATION_FAILED,
        500
      );
    }

    if (!users || users.length === 0) {
      console.log(`No users need 1099s for tax year ${taxYear}`);
      return { success: 0, failed: 0, errors: [] };
    }

    console.log(`📋 Generating 1099s for ${users.length} users for tax year ${taxYear}`);

    // Generate 1099 for each user
    for (const user of users) {
      try {
        const form1099Data = await generate1099DataForUser(user.user_id, taxYear);
        
        if (!form1099Data) {
          failedCount++;
          errors.push(`User ${user.user_id}: No data generated`);
          continue;
        }

        // TODO: Generate PDF (placeholder - implement with PDF library)
        // For now, we'll store the JSON data and mark as generated
        const pdfUrl = await store1099Data(form1099Data);

        // Update tax year summary
        await supabase
          .from('tax_year_summaries')
          .update({
            form_1099_generated_at: new Date().toISOString(),
            form_1099_delivery_status: 'generated',
            form_1099_pdf_url: pdfUrl,
          })
          .eq('user_id', user.user_id)
          .eq('tax_year', taxYear);

        successCount++;
        console.log(`✅ Generated 1099 for user ${user.user_id}: ${formatCurrency(form1099Data.nonemployee_compensation * 100)}`);
      } catch (err) {
        failedCount++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`User ${user.user_id}: ${errorMsg}`);
        console.error(`Failed to generate 1099 for user ${user.user_id}:`, err);

        // Mark as error in database
        await supabase
          .from('tax_year_summaries')
          .update({
            form_1099_delivery_status: 'error',
            form_1099_error_message: errorMsg,
          })
          .eq('user_id', user.user_id)
          .eq('tax_year', taxYear);
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      errors,
    };
  } catch (error) {
    console.error('Error in generatePending1099s:', error);
    throw error;
  }
}

/**
 * Store 1099 data in Supabase Storage (or as JSON in database)
 * 
 * TODO: Implement PDF generation using a library like pdfkit or @react-pdf/renderer
 * For now, this stores the JSON data
 */
async function store1099Data(form1099Data: Form1099NECData): Promise<string> {
  const supabase = getServiceClient();

  try {
    // Create a JSON file with the 1099 data
    const jsonData = JSON.stringify(form1099Data, null, 2);
    const fileName = `${form1099Data.form_id}.json`;
    const filePath = `${form1099Data.tax_year}/${form1099Data.recipient.user_id}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(TAX_CONFIG.storage.bucket_name)
      .upload(filePath, jsonData, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('Error storing 1099 data:', error);
      throw new TaxComplianceError(
        'Failed to store 1099 data',
        TAX_ERROR_CODES.FORM_1099_GENERATION_FAILED,
        500
      );
    }

    // Get public URL (or signed URL if bucket is private)
    const { data: urlData } = supabase.storage
      .from(TAX_CONFIG.storage.bucket_name)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in store1099Data:', error);
    throw error;
  }
}

// ============================================================================
// 1099 EMAIL DELIVERY
// ============================================================================

/**
 * Send 1099-NEC forms to users via internal messaging
 * 
 * This function should be called by January 31 for the previous tax year.
 * Instead of email, sends internal notifications that users can view in their dashboard.
 * 
 * @param taxYear The tax year to send 1099s for
 * @returns Count of successfully sent notifications
 */
export async function message1099Forms(taxYear: number): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getServiceClient();
  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  try {
    // Get all users with generated 1099s that haven't been messaged yet
    const { data: summaries, error } = await supabase
      .from('tax_year_summaries')
      .select('*')
      .eq('tax_year', taxYear)
      .eq('needs_1099', true)
      .in('form_1099_delivery_status', ['generated', 'error']);

    if (error) {
      console.error('Error fetching 1099 summaries:', error);
      throw new TaxComplianceError(
        'Failed to fetch 1099 summaries',
        TAX_ERROR_CODES.FORM_1099_DELIVERY_FAILED,
        500
      );
    }

    if (!summaries || summaries.length === 0) {
      console.log(`No 1099s to message for tax year ${taxYear}`);
      return { success: 0, failed: 0, errors: [] };
    }

    console.log(`📨 Messaging 1099s to ${summaries.length} users for tax year ${taxYear}`);

    // Send notification to each user
    for (const summary of summaries) {
      try {
        if (!summary.form_1099_pdf_url) {
          throw new Error('No 1099 PDF/data URL found');
        }

        // Send internal notification
        const notificationSent = await sendTaxNotification(
          summary.user_id,
          taxYear,
          summary.form_1099_pdf_url,
          summary.total_earnings_cents
        );

        if (!notificationSent) {
          throw new Error('Notification delivery failed');
        }

        // Update delivery status
        await supabase
          .from('tax_year_summaries')
          .update({
            form_1099_delivery_status: 'sent_email', // Keep same status name for compatibility
            form_1099_sent_at: new Date().toISOString(),
          })
          .eq('id', summary.id);

        successCount++;
        console.log(`✅ Sent 1099 notification to user ${summary.user_id}`);
      } catch (err) {
        failedCount++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`User ${summary.user_id}: ${errorMsg}`);
        console.error(`Failed to send 1099 notification to user ${summary.user_id}:`, err);

        // Mark as error
        await supabase
          .from('tax_year_summaries')
          .update({
            form_1099_delivery_status: 'error',
            form_1099_error_message: errorMsg,
          })
          .eq('id', summary.id);
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      errors,
    };
  } catch (error) {
    console.error('Error in message1099Forms:', error);
    throw error;
  }
}

// Alias for backwards compatibility
export const email1099Forms = message1099Forms;

/**
 * Send tax form notification to user via internal messaging
 * 
 * Instead of email, we send an internal notification that appears in their account.
 * Users can view their 1099 documents in their dashboard.
 */
async function sendTaxNotification(
  userId: string,
  taxYear: number,
  form1099Url: string,
  totalEarningsCents: number
): Promise<boolean> {
  const supabase = getServiceClient();
  
  try {
    // Send 1099 notification via internal messaging system
    const { data, error } = await supabase.rpc('send_1099_notification', {
      p_user_id: userId,
      p_tax_year: taxYear,
      p_amount_cents: totalEarningsCents,
      p_document_url: form1099Url,
    });

    if (error) {
      console.error('Error sending 1099 notification:', error);
      return false;
    }

    console.log(`✅ Sent 1099 notification to user ${userId} for ${taxYear}: ${formatCurrency(totalEarningsCents)}`);
    return true;
  } catch (error) {
    console.error('Error sending tax notification:', error);
    return false;
  }
}

// ============================================================================
// IRS EXPORT FUNCTIONALITY
// ============================================================================

/**
 * Export 1099 data in a format suitable for IRS e-file providers
 * 
 * This generates a CSV/JSON export that can be uploaded to third-party
 * providers like Tax1099, Track1099, or similar IRS-approved e-file services.
 * 
 * @param taxYear The tax year to export
 * @returns Array of export records
 */
export async function export1099DataForYear(taxYear: number): Promise<Form1099ExportRecord[]> {
  const supabase = getServiceClient();

  try {
    // Get all users needing 1099s
    const { data: users, error } = await supabase.rpc('get_users_needing_1099', {
      p_tax_year: taxYear,
    });

    if (error) {
      console.error('Error fetching users for export:', error);
      throw new TaxComplianceError(
        'Failed to fetch users for export',
        TAX_ERROR_CODES.FORM_1099_GENERATION_FAILED,
        500
      );
    }

    if (!users || users.length === 0) {
      console.log(`No 1099 data to export for tax year ${taxYear}`);
      return [];
    }

    // Map to export format
    const exportRecords: Form1099ExportRecord[] = users.map((user: UserNeedingForm1099) => ({
      // Payer Info
      payer_name: TAX_CONFIG.payer.legal_name,
      payer_ein: TAX_CONFIG.payer.ein,
      payer_address_line1: TAX_CONFIG.payer.address.line1,
      payer_address_line2: TAX_CONFIG.payer.address.line2 || '',
      payer_city: TAX_CONFIG.payer.address.city,
      payer_state: TAX_CONFIG.payer.address.state,
      payer_postal_code: TAX_CONFIG.payer.address.postal_code,
      
      // Recipient Info
      recipient_name: user.full_name,
      recipient_tax_id_last4: user.ssn_last4 || '',
      recipient_ein: user.ein || '',
      recipient_address_line1: user.address_line1,
      recipient_address_line2: user.address_line2 || '',
      recipient_city: user.city,
      recipient_state: user.state,
      recipient_postal_code: user.postal_code,
      
      // Amounts
      nonemployee_compensation_amount: user.total_earnings_cents / 100, // Convert to dollars
      
      // Tax Year
      tax_year: taxYear,
    }));

    console.log(`📊 Exported ${exportRecords.length} 1099 records for tax year ${taxYear}`);

    return exportRecords;
  } catch (error) {
    console.error('Error exporting 1099 data:', error);
    throw error;
  }
}

/**
 * Convert export records to CSV format
 */
export function exportRecordsToCSV(records: Form1099ExportRecord[]): string {
  if (records.length === 0) {
    return '';
  }

  // CSV headers
  const headers = Object.keys(records[0]).join(',');
  
  // CSV rows
  const rows = records.map(record => 
    Object.values(record).map(value => 
      typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value
    ).join(',')
  );

  return [headers, ...rows].join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  generate1099DataForUser,
  generatePending1099s,
  email1099Forms,
  export1099DataForYear,
  exportRecordsToCSV,
};

