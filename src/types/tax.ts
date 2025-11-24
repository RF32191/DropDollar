/**
 * TAX REPORTING SYSTEM - TypeScript Type Definitions
 * 
 * Matches the database schema in tax-system-schema.sql
 * 
 * LEGAL DISCLAIMER: This implementation follows IRS guidelines to the best
 * of our ability. MUST be reviewed by a licensed CPA and tax attorney before
 * production use. This is NOT legal or tax advice.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type TaxClassification =
  | 'individual'        // Individual/sole proprietor or single-member LLC
  | 'c_corporation'     // C Corporation
  | 's_corporation'     // S Corporation
  | 'partnership'       // Partnership
  | 'trust_estate'      // Trust/estate
  | 'llc'               // Limited liability company (multi-member)
  | 'other';            // Other

export type PayoutStatus =
  | 'pending'           // Waiting for approval
  | 'blocked_tax'       // Blocked - W-9 required
  | 'approved'          // Approved, ready to process
  | 'processing'        // Payment in progress
  | 'paid'              // Payment completed
  | 'rejected'          // Request rejected
  | 'cancelled';        // Cancelled by user

export type Form1099DeliveryStatus =
  | 'not_generated'     // Not yet generated
  | 'generated'         // PDF/data generated
  | 'sent_email'        // Emailed to recipient
  | 'bounced'           // Email delivery failed
  | 'error';            // Generation or delivery error

export type EarningsSourceType =
  | 'game_win'          // Prize from game win
  | 'tournament_prize'  // Tournament prize
  | 'bonus'             // Platform bonus
  | 'referral'          // Referral reward
  | 'promotion'         // Promotional credit
  | 'adjustment'        // Manual adjustment (positive or negative)
  | 'refund'            // Refund issued
  | 'chargeback';       // Chargeback (negative)

// ============================================================================
// DATABASE TABLE TYPES
// ============================================================================

export interface TaxProfile {
  id: string;
  user_id: string;
  
  // Personal/Business Information
  full_name: string;
  business_name: string | null;
  tax_classification: TaxClassification;
  
  // Tax Identification Numbers
  // SECURITY: Only last 4 digits of SSN are stored
  ssn_last4: string | null;
  ein: string | null;
  
  // Mailing Address
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  
  // Electronic Signature Metadata
  signed_at: string; // ISO 8601 timestamp
  signature_ip: string;
  signature_user_agent: string;
  electronic_consent_given: boolean;
  
  // Verification Status
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  
  // Audit Trail
  created_at: string;
  updated_at: string;
}

export interface EarningsLedger {
  id: string;
  user_id: string;
  
  // Financial Details
  amount_cents: number; // Can be negative for adjustments
  currency: string;
  
  // Source Tracking
  source_type: EarningsSourceType;
  source_reference_id: string | null;
  description: string | null;
  
  // Timing
  occurred_at: string;
  
  // Tax Reporting Flags
  tax_year: number;
  is_taxable: boolean;
  
  // Metadata
  created_at: string;
  created_by: string | null;
  metadata: Record<string, any> | null;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  
  // Amount
  amount_cents: number;
  currency: string;
  
  // Status & Blocking
  status: PayoutStatus;
  blocked_reason: string | null;
  
  // Payment Details
  payment_method: string | null;
  payment_reference_id: string | null;
  paid_at: string | null;
  
  // Admin Review
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface TaxYearSummary {
  id: string;
  user_id: string;
  tax_year: number;
  
  // Earnings Totals
  total_earnings_cents: number;
  total_earnings_count: number;
  
  // 1099 Determination
  needs_1099: boolean;
  threshold_met_at: string | null;
  
  // 1099 Generation Status
  form_1099_generated_at: string | null;
  form_1099_delivery_status: Form1099DeliveryStatus;
  form_1099_pdf_url: string | null;
  form_1099_sent_at: string | null;
  form_1099_error_message: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface W9SubmissionRequest {
  // Personal/Business Information
  full_name: string;
  business_name?: string;
  tax_classification: TaxClassification;
  
  // Tax Identification
  // NOTE: Frontend sends full SSN, backend stores only last 4 digits
  ssn?: string;          // Full SSN (will be reduced to last 4 server-side)
  ein?: string;
  
  // Mailing Address
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;      // Defaults to 'US'
  
  // Electronic Signature
  electronic_signature: string;  // User types full name as signature
  consent_given: boolean;        // Must be true
}

export interface W9SubmissionResponse {
  success: boolean;
  tax_profile_id: string;
  message: string;
}

export interface PayoutRequestRequest {
  amount_cents: number;
  payment_method?: string;
  notes?: string;
}

export interface PayoutRequestResponse {
  success: boolean;
  payout_request_id?: string;
  blocked?: boolean;
  blocked_reason?: string;
  message: string;
}

export interface EarningRecordRequest {
  user_id: string;
  amount_cents: number;
  source_type: EarningsSourceType;
  source_reference_id?: string;
  description?: string;
  occurred_at?: string; // ISO 8601, defaults to now
}

export interface EarningRecordResponse {
  success: boolean;
  earning_id: string;
  message: string;
}

// ============================================================================
// 1099 GENERATION TYPES
// ============================================================================

export interface Form1099NECData {
  // Tax Year
  tax_year: number;
  
  // Payer Information (Your Company)
  payer: {
    name: string;
    ein: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    phone?: string;
  };
  
  // Recipient Information (User)
  recipient: {
    user_id: string;
    name: string;
    tin_last4?: string;      // SSN last 4 or EIN
    ein?: string;            // Full EIN if business
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
  };
  
  // Box 1: Nonemployee compensation
  nonemployee_compensation: number; // In dollars (not cents)
  
  // Metadata
  generated_at: string;
  form_id: string;
}

export interface Form1099ExportRecord {
  // Payer Info
  payer_name: string;
  payer_ein: string;
  payer_address_line1: string;
  payer_address_line2: string;
  payer_city: string;
  payer_state: string;
  payer_postal_code: string;
  
  // Recipient Info
  recipient_name: string;
  recipient_tax_id_last4: string;
  recipient_ein: string;
  recipient_address_line1: string;
  recipient_address_line2: string;
  recipient_city: string;
  recipient_state: string;
  recipient_postal_code: string;
  
  // Amounts
  nonemployee_compensation_amount: number; // In dollars
  
  // Tax Year
  tax_year: number;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface TaxSystemConfig {
  // Payer Information (Your Company)
  // TODO: Replace with your actual company information
  payer: {
    legal_name: string;           // e.g., "DropaDollar, Inc."
    ein: string;                  // e.g., "12-3456789"
    address: {
      line1: string;              // e.g., "123 Main St Suite 100"
      line2?: string;
      city: string;               // e.g., "San Francisco"
      state: string;              // e.g., "CA"
      postal_code: string;        // e.g., "94102"
    };
    phone?: string;               // e.g., "(555) 123-4567"
    contact_email: string;        // e.g., "tax@dropadollar.com"
  };
  
  // Thresholds
  reporting_threshold_cents: number; // IRS threshold: $600 = 60000 cents
  
  // 1099 Generation
  generation_enabled: boolean;
  generation_deadline: string;         // e.g., "01-31" (January 31)
  
  // Email Configuration
  email: {
    from_name: string;
    from_email: string;
    subject_template: string;
    enable_auto_send: boolean;
  };
  
  // Storage
  storage: {
    bucket_name: string;               // Supabase Storage bucket for PDFs
    pdf_path_template: string;         // e.g., "1099/{year}/{user_id}.pdf"
  };
}

// ============================================================================
// HELPER FUNCTION RETURN TYPES
// ============================================================================

export interface UserNeedingForm1099 {
  user_id: string;
  user_email: string;
  total_earnings_cents: number;
  full_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  ssn_last4: string | null;
  ein: string | null;
  tax_classification: TaxClassification;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface TaxVerificationStatus {
  is_verified: boolean;
  tax_profile_id: string | null;
  missing_fields: string[];
}

export interface EarningsSummary {
  total_cents: number;
  total_dollars: number;
  count: number;
  by_source: Record<EarningsSourceType, number>;
  earliest_date: string | null;
  latest_date: string | null;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class TaxComplianceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'TaxComplianceError';
  }
}

export const TAX_ERROR_CODES = {
  W9_REQUIRED: 'W9_REQUIRED',
  W9_INCOMPLETE: 'W9_INCOMPLETE',
  INVALID_SSN: 'INVALID_SSN',
  INVALID_EIN: 'INVALID_EIN',
  INVALID_TAX_CLASSIFICATION: 'INVALID_TAX_CLASSIFICATION',
  PAYOUT_BLOCKED: 'PAYOUT_BLOCKED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  FORM_1099_GENERATION_FAILED: 'FORM_1099_GENERATION_FAILED',
  FORM_1099_DELIVERY_FAILED: 'FORM_1099_DELIVERY_FAILED',
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export type TaxErrorCode = typeof TAX_ERROR_CODES[keyof typeof TAX_ERROR_CODES];

