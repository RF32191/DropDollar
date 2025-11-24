/**
 * TAX SYSTEM CONFIGURATION
 * 
 * IMPORTANT: Update this file with your actual company information before
 * deploying to production. The values below are placeholders.
 * 
 * TODO: Replace all placeholder values with real company data
 * TODO: Move sensitive values to environment variables
 * TODO: Have your CPA review all settings
 */

import { TaxSystemConfig } from '@/types/tax';

export const TAX_CONFIG: TaxSystemConfig = {
  // ============================================================================
  // PAYER INFORMATION (YOUR COMPANY)
  // ============================================================================
  // TODO: Replace with your actual company information
  payer: {
    legal_name: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || 'DropaDollar, Inc.',
    ein: process.env.TAX_PAYER_EIN || '12-3456789', // TODO: Your actual EIN
    address: {
      line1: process.env.TAX_PAYER_ADDRESS_LINE1 || '123 Main Street, Suite 100',
      line2: process.env.TAX_PAYER_ADDRESS_LINE2 || undefined,
      city: process.env.TAX_PAYER_CITY || 'San Francisco',
      state: process.env.TAX_PAYER_STATE || 'CA',
      postal_code: process.env.TAX_PAYER_POSTAL_CODE || '94102',
    },
    phone: process.env.TAX_PAYER_PHONE || '(555) 123-4567',
    contact_email: process.env.TAX_CONTACT_EMAIL || 'tax@dropadollar.com',
  },

  // ============================================================================
  // IRS REPORTING THRESHOLD
  // ============================================================================
  // $600 is the federal threshold for 1099-NEC reporting
  // Source: 26 U.S. Code § 6041
  reporting_threshold_cents: 60000, // $600.00

  // ============================================================================
  // 1099 GENERATION SETTINGS
  // ============================================================================
  generation_enabled: process.env.TAX_1099_GENERATION_ENABLED === 'true',
  generation_deadline: '01-31', // January 31 (IRS deadline)

  // ============================================================================
  // EMAIL CONFIGURATION
  // ============================================================================
  email: {
    from_name: process.env.TAX_EMAIL_FROM_NAME || 'DropaDollar Tax Team',
    from_email: process.env.TAX_EMAIL_FROM || 'tax@dropadollar.com',
    subject_template: 'Your {year} 1099-NEC Tax Form from DropaDollar',
    enable_auto_send: process.env.TAX_AUTO_SEND_1099 === 'true',
  },

  // ============================================================================
  // STORAGE CONFIGURATION (Supabase Storage)
  // ============================================================================
  storage: {
    bucket_name: 'tax-documents',
    pdf_path_template: '1099/{year}/{user_id}.pdf',
  },
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates that all required tax configuration is present
 * Call this on app startup to ensure configuration is correct
 */
export function validateTaxConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check payer EIN format
  if (!TAX_CONFIG.payer.ein.match(/^\d{2}-?\d{7}$/)) {
    errors.push('Invalid payer EIN format. Must be XX-XXXXXXX');
  }

  // Check payer name
  if (TAX_CONFIG.payer.legal_name === 'DropaDollar, Inc.') {
    errors.push('WARNING: Using placeholder company name. Update TAX_CONFIG.payer.legal_name');
  }

  // Check state code
  if (TAX_CONFIG.payer.address.state.length !== 2) {
    errors.push('Payer state must be 2-letter code (e.g., "CA")');
  }

  // Check email
  if (!TAX_CONFIG.payer.contact_email.includes('@')) {
    errors.push('Invalid payer contact email');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the current tax year
 */
export function getCurrentTaxYear(): number {
  return new Date().getFullYear();
}

/**
 * Check if today is past the 1099 filing deadline for the given year
 */
export function isPast1099Deadline(taxYear: number): boolean {
  const deadline = new Date(taxYear + 1, 0, 31); // January 31 of following year
  return new Date() > deadline;
}

/**
 * Get the deadline date for filing 1099s for a given tax year
 */
export function get1099Deadline(taxYear: number): Date {
  return new Date(taxYear + 1, 0, 31); // January 31 of following year
}

/**
 * Format currency for display
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Validate SSN format (XXX-XX-XXXX or XXXXXXXXX)
 */
export function isValidSSN(ssn: string): boolean {
  const cleaned = ssn.replace(/\D/g, '');
  return cleaned.length === 9 && /^\d{9}$/.test(cleaned);
}

/**
 * Validate EIN format (XX-XXXXXXX or XXXXXXXXX)
 */
export function isValidEIN(ein: string): boolean {
  const cleaned = ein.replace(/\D/g, '');
  return cleaned.length === 9 && /^\d{9}$/.test(cleaned);
}

/**
 * Get last 4 digits of SSN
 */
export function getSSNLast4(ssn: string): string {
  const cleaned = ssn.replace(/\D/g, '');
  return cleaned.slice(-4);
}

/**
 * Validate US state code
 */
export function isValidUSState(state: string): boolean {
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
  ];
  return states.includes(state.toUpperCase());
}

/**
 * Sanitize user input for tax data
 */
export function sanitizeTaxInput(input: string): string {
  return input.trim().replace(/[<>]/g, ''); // Remove potential XSS characters
}

// ============================================================================
// ENVIRONMENT VARIABLE CHECK
// ============================================================================

if (process.env.NODE_ENV === 'production') {
  const validation = validateTaxConfig();
  if (!validation.valid) {
    console.warn('⚠️  TAX CONFIGURATION WARNINGS:');
    validation.errors.forEach(error => console.warn(`   - ${error}`));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TAX_CONFIG;

