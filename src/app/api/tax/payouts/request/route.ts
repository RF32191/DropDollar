/**
 * PAYOUT REQUEST API ENDPOINT
 * 
 * POST /api/tax/payouts/request
 * 
 * Handles user requests to withdraw cash or redeem prizes.
 * BLOCKS payouts if user hasn't completed W-9.
 * 
 * COMPLIANCE NOTES:
 * - W-9 required before any payout
 * - Creates payout_requests record with status 'blocked_tax' if W-9 incomplete
 * - Returns TAX_INFO_REQUIRED error code to trigger frontend W-9 flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  PayoutRequestRequest,
  PayoutRequestResponse,
  PayoutRequest,
  TaxComplianceError,
  TAX_ERROR_CODES 
} from '@/types/tax';

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
 * Check if user has completed W-9
 */
async function isUserTaxVerified(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('tax_profiles')
    .select('id, electronic_consent_given')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking tax verification:', error);
    throw new TaxComplianceError(
      'Failed to verify tax status',
      'TAX_VERIFICATION_FAILED',
      500
    );
  }

  return data && data.electronic_consent_given === true;
}

/**
 * Get user's available balance
 * TODO: Integrate with your existing balance/wallet system
 */
async function getUserBalance(supabase: any, userId: string): Promise<number> {
  // Option 1: If you have a user_balances table
  try {
    const { data, error } = await supabase
      .from('user_balances')
      .select('balance_cents')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user balance:', error);
    }

    return data?.balance_cents || 0;
  } catch (error) {
    // Fallback: calculate from earnings ledger
    const { data: earnings } = await supabase
      .from('earnings_ledger')
      .select('amount_cents')
      .eq('user_id', userId);

    const totalEarnings = earnings?.reduce((sum: number, e: any) => sum + e.amount_cents, 0) || 0;

    // Subtract any previous successful payouts
    const { data: payouts } = await supabase
      .from('payout_requests')
      .select('amount_cents')
      .eq('user_id', userId)
      .eq('status', 'paid');

    const totalPayouts = payouts?.reduce((sum: number, p: any) => sum + p.amount_cents, 0) || 0;

    return totalEarnings - totalPayouts;
  }
}

/**
 * POST /api/tax/payouts/request
 * Request a payout/withdrawal
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
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

    const userId = user.id;

    // Parse request body
    const body = await request.json() as PayoutRequestRequest;

    // Validate amount
    if (!body.amount_cents || body.amount_cents <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid payout amount. Must be greater than zero.',
        },
        { status: 400 }
      );
    }

    // Minimum payout amount (e.g., $5.00)
    const MIN_PAYOUT_CENTS = 500;
    if (body.amount_cents < MIN_PAYOUT_CENTS) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum payout amount is $${MIN_PAYOUT_CENTS / 100}.00`,
        },
        { status: 400 }
      );
    }

    // Check user balance
    const balance = await getUserBalance(supabase, userId);
    if (balance < body.amount_cents) {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          blocked_reason: 'Insufficient balance',
          message: `Insufficient balance. Available: $${balance / 100}, Requested: $${body.amount_cents / 100}`,
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // W-9 VERIFICATION CHECK
    // ============================================================================
    const isTaxVerified = await isUserTaxVerified(supabase, userId);

    if (!isTaxVerified) {
      // Create a blocked payout request
      const { data: blockedPayout, error: payoutError } = await supabase
        .from('payout_requests')
        .insert({
          user_id: userId,
          amount_cents: body.amount_cents,
          status: 'blocked_tax',
          blocked_reason: 'W-9 required',
        })
        .select('id')
        .single();

      if (payoutError) {
        console.error('Error creating blocked payout:', payoutError);
      }

      console.log(`⚠️  Payout blocked for user ${userId}: W-9 required`);

      // Return special error code to trigger W-9 flow on frontend
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          blocked_reason: TAX_ERROR_CODES.W9_REQUIRED,
          payout_request_id: blockedPayout?.id,
          message: 'Tax information (W-9) required before withdrawals. Please complete your tax profile.',
        },
        { status: 403 }
      );
    }

    // ============================================================================
    // CREATE PAYOUT REQUEST (Tax verified - proceed normally)
    // ============================================================================
    const { data: payoutRequest, error: payoutError } = await supabase
      .from('payout_requests')
      .insert({
        user_id: userId,
        amount_cents: body.amount_cents,
        status: 'pending',
        payment_method: body.payment_method || null,
      })
      .select('id, status, created_at')
      .single();

    if (payoutError) {
      console.error('Error creating payout request:', payoutError);
      throw new TaxComplianceError(
        'Failed to create payout request',
        'PAYOUT_REQUEST_FAILED',
        500
      );
    }

    console.log(`✅ Payout request created for user ${userId}: $${body.amount_cents / 100}`);

    const response: PayoutRequestResponse = {
      success: true,
      payout_request_id: payoutRequest.id,
      message: 'Payout request submitted successfully. It will be reviewed by our team.',
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Payout request error:', error);

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
        message: 'An unexpected error occurred while processing your payout request',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tax/payouts/request
 * Get user's payout requests
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

    // Get all payout requests for user
    const { data: payouts, error } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payout requests:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch payout requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payouts: payouts || [],
      count: payouts?.length || 0,
    });

  } catch (error) {
    console.error('Error fetching payout requests:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tax/payouts/request
 * Update payout request status (admin only)
 */
export async function PATCH(request: NextRequest) {
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

    // TODO: Check if user is admin
    // This is a placeholder - implement your own admin check
    const isAdmin = false; // Replace with actual admin check
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { payout_id, status, payment_reference_id, admin_notes } = body;

    if (!payout_id || !status) {
      return NextResponse.json(
        { success: false, message: 'payout_id and status are required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (payment_reference_id) {
      updateData.payment_reference_id = payment_reference_id;
    }

    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('payout_requests')
      .update(updateData)
      .eq('id', payout_id);

    if (error) {
      console.error('Error updating payout request:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to update payout request' },
        { status: 500 }
      );
    }

    console.log(`✅ Admin ${user.id} updated payout ${payout_id} to status: ${status}`);

    return NextResponse.json({
      success: true,
      message: 'Payout request updated successfully',
    });

  } catch (error) {
    console.error('Error updating payout request:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

