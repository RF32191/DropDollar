/**
 * W-9 SUBMISSION API ENDPOINT
 * 
 * POST /api/tax/w9/submit
 * 
 * Handles electronic W-9 form submission from users.
 * 
 * SECURITY NOTES:
 * - Only stores last 4 digits of SSN
 * - Records IP address and user agent for electronic signature compliance
 * - Validates all input fields before saving
 * - Sets user as tax-verified after successful submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  W9SubmissionRequest, 
  W9SubmissionResponse,
  TaxClassification,
  TaxProfile,
  TaxComplianceError,
  TAX_ERROR_CODES 
} from '@/types/tax';
import { 
  isValidSSN, 
  isValidEIN, 
  getSSNLast4, 
  isValidUSState,
  sanitizeTaxInput 
} from '@/lib/tax/config';

// Initialize Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * Validate W-9 submission data
 */
function validateW9Submission(data: W9SubmissionRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push('Full name is required (minimum 2 characters)');
  }

  if (!data.tax_classification) {
    errors.push('Tax classification is required');
  }

  // Tax ID validation
  if (!data.ssn && !data.ein) {
    errors.push('Either SSN or EIN is required');
  }

  if (data.ssn && !isValidSSN(data.ssn)) {
    errors.push('Invalid SSN format. Must be 9 digits.');
  }

  if (data.ein && !isValidEIN(data.ein)) {
    errors.push('Invalid EIN format. Must be 9 digits (XX-XXXXXXX).');
  }

  // For non-individuals, EIN is typically required
  if (
    data.tax_classification !== 'individual' &&
    !data.ein
  ) {
    errors.push('EIN is required for non-individual tax classifications');
  }

  // Address validation
  if (!data.address_line1 || data.address_line1.trim().length < 3) {
    errors.push('Address line 1 is required (minimum 3 characters)');
  }

  if (!data.city || data.city.trim().length < 2) {
    errors.push('City is required (minimum 2 characters)');
  }

  if (!data.state || !isValidUSState(data.state)) {
    errors.push('Valid US state code is required (e.g., "CA")');
  }

  if (!data.postal_code || !data.postal_code.match(/^\d{5}(-\d{4})?$/)) {
    errors.push('Valid US postal code is required (e.g., "12345" or "12345-6789")');
  }

  // Electronic signature validation
  if (!data.electronic_signature || data.electronic_signature.trim().length < 2) {
    errors.push('Electronic signature is required');
  }

  if (!data.consent_given) {
    errors.push('You must consent to electronic submission');
  }

  // Signature should match full name (case-insensitive)
  if (
    data.full_name &&
    data.electronic_signature &&
    data.full_name.trim().toLowerCase() !== data.electronic_signature.trim().toLowerCase()
  ) {
    errors.push('Electronic signature must match your full legal name');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * POST /api/tax/w9/submit
 * Submit W-9 information
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();
    
    // Extract token and verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Parse request body
    const body = await request.json() as W9SubmissionRequest;

    // Validate submission
    const validation = validateW9Submission(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Extract client IP and user agent for electronic signature compliance
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Prepare tax profile data
    // SECURITY: Only store last 4 digits of SSN
    const ssnLast4 = body.ssn ? getSSNLast4(body.ssn) : null;
    const ein = body.ein ? body.ein.replace(/\D/g, '').replace(/^(\d{2})(\d{7})$/, '$1-$2') : null;

    const taxProfileData = {
      user_id: userId,
      full_name: sanitizeTaxInput(body.full_name),
      business_name: body.business_name ? sanitizeTaxInput(body.business_name) : null,
      tax_classification: body.tax_classification as TaxClassification,
      ssn_last4: ssnLast4,
      ein: ein,
      address_line1: sanitizeTaxInput(body.address_line1),
      address_line2: body.address_line2 ? sanitizeTaxInput(body.address_line2) : null,
      city: sanitizeTaxInput(body.city),
      state: body.state.toUpperCase(),
      postal_code: body.postal_code.replace(/\D/g, '').replace(/^(\d{5})(\d{4})$/, '$1-$2'),
      country: body.country || 'US',
      signed_at: new Date().toISOString(),
      signature_ip: clientIp,
      signature_user_agent: userAgent,
      electronic_consent_given: body.consent_given,
    };

    // Check if user already has a tax profile
    const { data: existingProfile } = await supabase
      .from('tax_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    let taxProfileId: string;

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('tax_profiles')
        .update(taxProfileData)
        .eq('user_id', userId)
        .select('id')
        .single();

      if (error) {
        console.error('Error updating tax profile:', error);
        throw new TaxComplianceError(
          'Failed to update tax profile',
          TAX_ERROR_CODES.W9_INCOMPLETE,
          500
        );
      }

      taxProfileId = data.id;
      console.log(`✅ Updated W-9 for user ${userId}`);
    } else {
      // Insert new profile
      const { data, error } = await supabase
        .from('tax_profiles')
        .insert(taxProfileData)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating tax profile:', error);
        throw new TaxComplianceError(
          'Failed to create tax profile',
          TAX_ERROR_CODES.W9_INCOMPLETE,
          500
        );
      }

      taxProfileId = data.id;
      console.log(`✅ Created W-9 for user ${userId}`);
    }

    // Update users table to mark as tax verified (if it exists)
    // Note: This assumes you have an is_tax_verified column on users table
    // If not, you can skip this step and check tax_profiles existence instead
    try {
      await supabase
        .from('users')
        .update({ 
          is_tax_verified: true,
          tax_profile_id: taxProfileId 
        })
        .eq('id', userId);
    } catch (error) {
      // Non-critical error if users table doesn't have these columns yet
      console.warn('Could not update users table tax verification status:', error);
    }

    const response: W9SubmissionResponse = {
      success: true,
      tax_profile_id: taxProfileId,
      message: 'W-9 information submitted successfully',
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('W-9 submission error:', error);

    if (error instanceof TaxComplianceError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred while processing your W-9',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tax/w9/submit
 * Get current user's W-9 status (whether they've submitted)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Check if user has a tax profile
    const { data: taxProfile, error } = await supabase
      .from('tax_profiles')
      .select('id, created_at, updated_at, full_name, tax_classification, is_verified')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user hasn't submitted W-9 yet)
      console.error('Error fetching tax profile:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch W-9 status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      has_submitted: !!taxProfile,
      tax_profile: taxProfile ? {
        id: taxProfile.id,
        full_name: taxProfile.full_name,
        tax_classification: taxProfile.tax_classification,
        is_verified: taxProfile.is_verified,
        created_at: taxProfile.created_at,
        updated_at: taxProfile.updated_at,
      } : null,
    });

  } catch (error) {
    console.error('Error checking W-9 status:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

