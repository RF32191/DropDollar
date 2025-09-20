import type { RevenueCalculation, Transaction, ListingFee } from '@/types';

// Platform configuration
export const PLATFORM_CONFIG = {
  TRANSACTION_FEE_RATE: 0.065, // 6.5%
  LISTING_FEE_AMOUNT: 0.20, // $0.20 in tokens
  LISTING_FEE_PERIOD_MONTHS: 4, // Every 4 months
  ESCROW_PERIOD_DAYS: 14, // 2 weeks
  RESERVE_POOL: 100000000, // 100 million tokens
  TOKEN_TO_USD_RATE: 1, // 1 token = $1 USD
};

/**
 * Calculate revenue breakdown for a completed transaction
 */
export const calculateRevenue = (
  winningBidAmount: number,
  additionalTimerBids: number = 0
): RevenueCalculation => {
  const totalRevenue = winningBidAmount + additionalTimerBids;
  const platformFee = totalRevenue * PLATFORM_CONFIG.TRANSACTION_FEE_RATE;
  const sellerPayout = totalRevenue - platformFee;

  return {
    totalRevenue,
    platformFee: Number(platformFee.toFixed(2)),
    sellerPayout: Number(sellerPayout.toFixed(2)),
    bonusFromTimerBids: additionalTimerBids,
    escrowPeriod: PLATFORM_CONFIG.ESCROW_PERIOD_DAYS,
  };
};

/**
 * Create a transaction record
 */
export const createTransaction = (
  listingId: string,
  buyerId: string,
  sellerId: string,
  winningAmount: number,
  timerBidsAmount: number = 0
): Omit<Transaction, 'id'> => {
  const revenue = calculateRevenue(winningAmount, timerBidsAmount);
  const now = new Date();
  const escrowReleaseDate = new Date(now);
  escrowReleaseDate.setDate(now.getDate() + PLATFORM_CONFIG.ESCROW_PERIOD_DAYS);

  return {
    listingId,
    buyerId,
    sellerId,
    amount: revenue.totalRevenue,
    platformFee: revenue.platformFee,
    sellerPayout: revenue.sellerPayout,
    status: 'escrowed',
    createdAt: now,
    escrowReleaseDate,
  };
};

/**
 * Calculate next listing fee due date
 */
export const calculateNextListingFeeDueDate = (lastPaidDate?: Date): Date => {
  const baseDate = lastPaidDate || new Date();
  const nextDueDate = new Date(baseDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + PLATFORM_CONFIG.LISTING_FEE_PERIOD_MONTHS);
  return nextDueDate;
};

/**
 * Create listing fee record
 */
export const createListingFee = (
  listingId: string,
  sellerId: string,
  previousFee?: ListingFee
): Omit<ListingFee, 'id'> => {
  const dueDate = calculateNextListingFeeDueDate(previousFee?.paidAt);
  const period = `Q${Math.ceil((dueDate.getMonth() + 1) / 3)} ${dueDate.getFullYear()}`;

  return {
    listingId,
    sellerId,
    amount: PLATFORM_CONFIG.LISTING_FEE_AMOUNT,
    dueDate,
    status: 'pending',
    period,
  };
};

/**
 * Calculate platform revenue for a time period
 */
export const calculatePlatformRevenue = (
  transactions: Transaction[],
  listingFees: ListingFee[],
  startDate: Date,
  endDate: Date
) => {
  const transactionRevenue = transactions
    .filter(t => t.completedAt && t.completedAt >= startDate && t.completedAt <= endDate)
    .reduce((sum, t) => sum + t.platformFee, 0);

  const listingRevenue = listingFees
    .filter(f => f.paidAt && f.paidAt >= startDate && f.paidAt <= endDate)
    .reduce((sum, f) => sum + f.amount, 0);

  return {
    transactionRevenue: Number(transactionRevenue.toFixed(2)),
    listingRevenue: Number(listingRevenue.toFixed(2)),
    totalRevenue: Number((transactionRevenue + listingRevenue).toFixed(2)),
    transactionCount: transactions.length,
    listingFeeCount: listingFees.length,
  };
};

/**
 * Check if listing fee is overdue
 */
export const isListingFeeOverdue = (fee: ListingFee): boolean => {
  return fee.status === 'pending' && new Date() > fee.dueDate;
};

/**
 * Calculate escrow release eligibility
 */
export const canReleaseEscrow = (transaction: Transaction): boolean => {
  return (
    transaction.status === 'escrowed' &&
    new Date() >= transaction.escrowReleaseDate
  );
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number, currency: string = 'tokens'): string => {
  const safeAmount = (amount && !isNaN(amount)) ? amount : 0;
  if (currency === 'tokens') {
    return `${safeAmount.toLocaleString()} tokens`;
  }
  return `$${safeAmount.toFixed(2)}`;
};

/**
 * Convert tokens to USD
 */
export const tokensToUSD = (tokens: number): number => {
  return tokens * PLATFORM_CONFIG.TOKEN_TO_USD_RATE;
};

/**
 * Convert USD to tokens
 */
export const usdToTokens = (usd: number): number => {
  return usd / PLATFORM_CONFIG.TOKEN_TO_USD_RATE;
};
