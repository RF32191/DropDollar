/**
 * EARNINGS LEDGER & TAX YEAR SUMMARY FUNCTIONS
 * 
 * Server-side functions for recording earnings and managing tax year summaries.
 * These functions should only be called from server-side code (API routes, server actions).
 */

import { createClient } from '@supabase/supabase-js';
import { 
  EarningsLedger, 
  EarningsSourceType,
  TaxYearSummary,
  EarningRecordRequest,
  EarningRecordResponse,
  TaxComplianceError,
  TAX_ERROR_CODES 
} from '@/types/tax';

// Initialize Supabase client with service role for admin operations
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// ============================================================================
// EARNINGS RECORDING
// ============================================================================

/**
 * Record an earning for a user and automatically update tax year summary
 * 
 * @param params Earning record parameters
 * @returns The created earning record ID
 * 
 * @example
 * // Record a game win
 * await recordEarning({
 *   user_id: 'user-uuid',
 *   amount_cents: 1500, // $15.00
 *   source_type: 'game_win',
 *   source_reference_id: 'game-session-uuid',
 *   description: 'Won Laser Dodge competition'
 * });
 */
export async function recordEarning(
  params: EarningRecordRequest
): Promise<EarningRecordResponse> {
  const supabase = getServiceClient();

  try {
    const {
      user_id,
      amount_cents,
      source_type,
      source_reference_id,
      description,
      occurred_at,
    } = params;

    // Validate inputs
    if (!user_id) {
      throw new TaxComplianceError(
        'user_id is required',
        'INVALID_USER_ID',
        400
      );
    }

    if (amount_cents === 0) {
      throw new TaxComplianceError(
        'amount_cents cannot be zero',
        'INVALID_AMOUNT',
        400
      );
    }

    // Use the database function for atomic operation
    const { data, error } = await supabase.rpc('record_earning', {
      p_user_id: user_id,
      p_amount_cents: amount_cents,
      p_source_type: source_type,
      p_source_reference_id: source_reference_id || null,
      p_description: description || null,
      p_occurred_at: occurred_at || new Date().toISOString(),
    });

    if (error) {
      console.error('Error recording earning:', error);
      throw new TaxComplianceError(
        'Failed to record earning',
        'EARNING_RECORD_FAILED',
        500
      );
    }

    console.log(`✅ Recorded earning: User ${user_id}, Amount: $${amount_cents / 100}, Source: ${source_type}`);

    return {
      success: true,
      earning_id: data,
      message: 'Earning recorded successfully',
    };
  } catch (error) {
    if (error instanceof TaxComplianceError) {
      throw error;
    }
    console.error('Unexpected error recording earning:', error);
    throw new TaxComplianceError(
      'An unexpected error occurred while recording earning',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * Record multiple earnings in a batch (more efficient for bulk operations)
 */
export async function recordEarningsBatch(
  earnings: EarningRecordRequest[]
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  for (const earning of earnings) {
    try {
      await recordEarning(earning);
      successCount++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to record earning for user ${earning.user_id}: ${errorMsg}`);
    }
  }

  return {
    success: errors.length === 0,
    count: successCount,
    errors,
  };
}

// ============================================================================
// TAX YEAR SUMMARY MANAGEMENT
// ============================================================================

/**
 * Manually recalculate tax year summary for a user
 * This is automatically called by record_earning, but can be manually triggered
 */
export async function recalculateTaxYearSummary(
  userId: string,
  taxYear: number
): Promise<void> {
  const supabase = getServiceClient();

  try {
    const { error } = await supabase.rpc('recalculate_tax_year_summary', {
      p_user_id: userId,
      p_tax_year: taxYear,
    });

    if (error) {
      console.error('Error recalculating tax year summary:', error);
      throw new TaxComplianceError(
        'Failed to recalculate tax year summary',
        'SUMMARY_CALCULATION_FAILED',
        500
      );
    }

    console.log(`✅ Recalculated tax year summary: User ${userId}, Year ${taxYear}`);
  } catch (error) {
    if (error instanceof TaxComplianceError) {
      throw error;
    }
    console.error('Unexpected error recalculating summary:', error);
    throw error;
  }
}

/**
 * Get tax year summary for a user
 */
export async function getTaxYearSummary(
  userId: string,
  taxYear: number
): Promise<TaxYearSummary | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('tax_year_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('tax_year', taxYear)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No record found
      return null;
    }
    console.error('Error fetching tax year summary:', error);
    throw new TaxComplianceError(
      'Failed to fetch tax year summary',
      'SUMMARY_FETCH_FAILED',
      500
    );
  }

  return data;
}

/**
 * Get all tax year summaries for a user
 */
export async function getAllTaxYearSummaries(
  userId: string
): Promise<TaxYearSummary[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('tax_year_summaries')
    .select('*')
    .eq('user_id', userId)
    .order('tax_year', { ascending: false });

  if (error) {
    console.error('Error fetching tax year summaries:', error);
    throw new TaxComplianceError(
      'Failed to fetch tax year summaries',
      'SUMMARY_FETCH_FAILED',
      500
    );
  }

  return data || [];
}

// ============================================================================
// EARNINGS QUERIES
// ============================================================================

/**
 * Get earnings ledger for a user (with optional filters)
 */
export async function getEarningsLedger(
  userId: string,
  options?: {
    taxYear?: number;
    sourceType?: EarningsSourceType;
    limit?: number;
    offset?: number;
  }
): Promise<EarningsLedger[]> {
  const supabase = getServiceClient();

  let query = supabase
    .from('earnings_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false });

  if (options?.taxYear) {
    query = query.eq('tax_year', options.taxYear);
  }

  if (options?.sourceType) {
    query = query.eq('source_type', options.sourceType);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching earnings ledger:', error);
    throw new TaxComplianceError(
      'Failed to fetch earnings ledger',
      'LEDGER_FETCH_FAILED',
      500
    );
  }

  return data || [];
}

/**
 * Get total earnings for a user in a specific tax year
 */
export async function getTotalEarnings(
  userId: string,
  taxYear: number
): Promise<{ total_cents: number; count: number }> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('earnings_ledger')
    .select('amount_cents')
    .eq('user_id', userId)
    .eq('tax_year', taxYear)
    .eq('is_taxable', true);

  if (error) {
    console.error('Error calculating total earnings:', error);
    throw new TaxComplianceError(
      'Failed to calculate total earnings',
      'EARNINGS_CALCULATION_FAILED',
      500
    );
  }

  const total_cents = data.reduce((sum, row) => sum + row.amount_cents, 0);

  return {
    total_cents,
    count: data.length,
  };
}

// ============================================================================
// HELPER FUNCTIONS FOR COMMON USE CASES
// ============================================================================

/**
 * Record a game win earning
 */
export async function recordGameWin(
  userId: string,
  amountCents: number,
  gameSessionId: string,
  gameType: string
): Promise<string> {
  const response = await recordEarning({
    user_id: userId,
    amount_cents: amountCents,
    source_type: 'game_win',
    source_reference_id: gameSessionId,
    description: `${gameType} game win`,
  });

  return response.earning_id;
}

/**
 * Record a tournament prize earning
 */
export async function recordTournamentPrize(
  userId: string,
  amountCents: number,
  tournamentId: string,
  placement: number
): Promise<string> {
  const response = await recordEarning({
    user_id: userId,
    amount_cents: amountCents,
    source_type: 'tournament_prize',
    source_reference_id: tournamentId,
    description: `Tournament prize - ${placement}${getOrdinalSuffix(placement)} place`,
  });

  return response.earning_id;
}

/**
 * Record a refund (negative earning)
 */
export async function recordRefund(
  userId: string,
  amountCents: number,
  originalEarningId: string,
  reason: string
): Promise<string> {
  const response = await recordEarning({
    user_id: userId,
    amount_cents: -Math.abs(amountCents), // Ensure negative
    source_type: 'refund',
    source_reference_id: originalEarningId,
    description: `Refund: ${reason}`,
  });

  return response.earning_id;
}

/**
 * Record a manual adjustment (can be positive or negative)
 */
export async function recordAdjustment(
  userId: string,
  amountCents: number,
  reason: string,
  adminId?: string
): Promise<string> {
  const supabase = getServiceClient();

  // First record the earning
  const occurredAt = new Date().toISOString();
  const taxYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from('earnings_ledger')
    .insert({
      user_id: userId,
      amount_cents: amountCents,
      source_type: 'adjustment',
      description: reason,
      occurred_at: occurredAt,
      tax_year: taxYear,
      created_by: adminId || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error recording adjustment:', error);
    throw new TaxComplianceError(
      'Failed to record adjustment',
      'ADJUSTMENT_FAILED',
      500
    );
  }

  // Recalculate tax year summary
  await recalculateTaxYearSummary(userId, taxYear);

  return data.id;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
