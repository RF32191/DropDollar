// Seller Payout Service
// Handles cash payouts to sellers after escrow period

export interface SellerPayoutInfo {
  sellerId: string;
  sellerName: string;
  bankAccount?: {
    accountType: 'checking' | 'savings';
    routingNumber: string;
    accountNumber: string; // Encrypted in real implementation
    accountHolderName: string;
  };
  paypalEmail?: string;
  preferredMethod: 'bank' | 'paypal';
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
}

export interface PayoutTransaction {
  payoutId: string;
  sellerId: string;
  transactionId: string; // Original sale transaction
  listingId: string;
  amount: number; // Net cash amount to seller
  platformFee: number;
  grossAmount: number;
  payoutMethod: 'bank' | 'paypal';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledDate: Date;
  processedDate?: Date;
  failureReason?: string;
  payoutReference?: string; // Bank/PayPal reference number
}

export class SellerPayoutService {
  private static payoutInfo: Map<string, SellerPayoutInfo> = new Map();
  private static payoutTransactions: Map<string, PayoutTransaction> = new Map();

  // Platform settings
  private static readonly PLATFORM_FEE_RATE = 0.12; // 12%
  private static readonly MIN_PAYOUT_AMOUNT = 10.00; // Minimum $10 for payout

  // Register seller payout information
  static registerSellerPayout(
    sellerId: string,
    sellerName: string,
    payoutData: {
      preferredMethod: 'bank' | 'paypal';
      payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
      bankAccount?: SellerPayoutInfo['bankAccount'];
      paypalEmail?: string;
    }
  ): boolean {
    try {
      const payoutInfo: SellerPayoutInfo = {
        sellerId,
        sellerName,
        preferredMethod: payoutData.preferredMethod,
        payoutSchedule: payoutData.payoutSchedule,
        bankAccount: payoutData.bankAccount,
        paypalEmail: payoutData.paypalEmail
      };

      this.payoutInfo.set(sellerId, payoutInfo);
      console.log(`💰 Payout info registered for seller: ${sellerName}`);
      return true;
    } catch (error) {
      console.error('Error registering payout info:', error);
      return false;
    }
  }

  // Create payout transaction when escrow is released
  static createPayoutTransaction(
    transactionId: string,
    sellerId: string,
    listingId: string,
    grossAmount: number
  ): PayoutTransaction | null {
    try {
      const payoutInfo = this.payoutInfo.get(sellerId);
      if (!payoutInfo) {
        console.error(`No payout info found for seller: ${sellerId}`);
        return null;
      }

      const platformFee = grossAmount * this.PLATFORM_FEE_RATE;
      const netAmount = grossAmount - platformFee;

      // Check minimum payout amount
      if (netAmount < this.MIN_PAYOUT_AMOUNT) {
        console.log(`Payout amount ${netAmount} below minimum ${this.MIN_PAYOUT_AMOUNT}, holding for next cycle`);
        return null;
      }

      const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const scheduledDate = this.calculateNextPayoutDate(payoutInfo.payoutSchedule);

      const payoutTransaction: PayoutTransaction = {
        payoutId,
        sellerId,
        transactionId,
        listingId,
        amount: Math.round(netAmount * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        grossAmount: Math.round(grossAmount * 100) / 100,
        payoutMethod: payoutInfo.preferredMethod,
        status: 'pending',
        scheduledDate
      };

      this.payoutTransactions.set(payoutId, payoutTransaction);
      
      console.log(`💸 Payout transaction created: ${payoutId} for $${netAmount}`);
      return payoutTransaction;
    } catch (error) {
      console.error('Error creating payout transaction:', error);
      return null;
    }
  }

  // Process pending payouts (called by scheduled job)
  static processPendingPayouts(): void {
    const now = new Date();
    const pendingPayouts = Array.from(this.payoutTransactions.values())
      .filter(payout => 
        payout.status === 'pending' && 
        payout.scheduledDate <= now
      );

    console.log(`🔄 Processing ${pendingPayouts.length} pending payouts`);

    pendingPayouts.forEach(payout => {
      this.processIndividualPayout(payout);
    });
  }

  // Process individual payout
  private static processIndividualPayout(payout: PayoutTransaction): void {
    try {
      payout.status = 'processing';
      
      if (payout.payoutMethod === 'bank') {
        this.processBankPayout(payout);
      } else if (payout.payoutMethod === 'paypal') {
        this.processPayPalPayout(payout);
      }
    } catch (error) {
      payout.status = 'failed';
      payout.failureReason = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Payout failed: ${payout.payoutId}`, error);
    }
  }

  // Process bank transfer (ACH)
  private static processBankPayout(payout: PayoutTransaction): void {
    const payoutInfo = this.payoutInfo.get(payout.sellerId);
    if (!payoutInfo?.bankAccount) {
      throw new Error('Bank account information not found');
    }

    // In real implementation, integrate with Stripe Connect, Dwolla, or similar
    // For demo purposes, simulate successful payout
    setTimeout(() => {
      payout.status = 'completed';
      payout.processedDate = new Date();
      payout.payoutReference = `ACH_${Date.now()}`;
      
      console.log(`✅ Bank payout completed: ${payout.payoutId} - $${payout.amount}`);
    }, 2000);
  }

  // Process PayPal payout
  private static processPayPalPayout(payout: PayoutTransaction): void {
    const payoutInfo = this.payoutInfo.get(payout.sellerId);
    if (!payoutInfo?.paypalEmail) {
      throw new Error('PayPal email not found');
    }

    // In real implementation, integrate with PayPal Payouts API
    // For demo purposes, simulate successful payout
    setTimeout(() => {
      payout.status = 'completed';
      payout.processedDate = new Date();
      payout.payoutReference = `PP_${Date.now()}`;
      
      console.log(`✅ PayPal payout completed: ${payout.payoutId} - $${payout.amount}`);
    }, 1500);
  }

  // Calculate next payout date based on schedule
  private static calculateNextPayoutDate(schedule: 'weekly' | 'biweekly' | 'monthly'): Date {
    const now = new Date();
    const nextPayout = new Date(now);

    switch (schedule) {
      case 'weekly':
        // Next Friday
        const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
        nextPayout.setDate(now.getDate() + daysUntilFriday);
        break;
      case 'biweekly':
        // Every other Friday
        const daysUntilBiweekly = (5 - now.getDay() + 14) % 14 || 14;
        nextPayout.setDate(now.getDate() + daysUntilBiweekly);
        break;
      case 'monthly':
        // First Friday of next month
        nextPayout.setMonth(now.getMonth() + 1, 1);
        const firstFriday = (5 - nextPayout.getDay() + 7) % 7 + 1;
        nextPayout.setDate(firstFriday);
        break;
    }

    return nextPayout;
  }

  // Get seller's payout history
  static getSellerPayouts(sellerId: string): PayoutTransaction[] {
    return Array.from(this.payoutTransactions.values())
      .filter(payout => payout.sellerId === sellerId)
      .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }

  // Get seller's pending payout amount
  static getPendingPayoutAmount(sellerId: string): number {
    return Array.from(this.payoutTransactions.values())
      .filter(payout => 
        payout.sellerId === sellerId && 
        (payout.status === 'pending' || payout.status === 'processing')
      )
      .reduce((sum, payout) => sum + payout.amount, 0);
  }

  // Get payout info for seller
  static getSellerPayoutInfo(sellerId: string): SellerPayoutInfo | null {
    return this.payoutInfo.get(sellerId) || null;
  }

  // Update payout preferences
  static updatePayoutPreferences(
    sellerId: string,
    updates: Partial<SellerPayoutInfo>
  ): boolean {
    const existing = this.payoutInfo.get(sellerId);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.payoutInfo.set(sellerId, updated);
    
    console.log(`💰 Payout preferences updated for seller: ${sellerId}`);
    return true;
  }

  // Get platform payout statistics
  static getPayoutStatistics(startDate: Date, endDate: Date) {
    const payouts = Array.from(this.payoutTransactions.values())
      .filter(payout => 
        payout.processedDate &&
        payout.processedDate >= startDate && 
        payout.processedDate <= endDate &&
        payout.status === 'completed'
      );

    const totalPayouts = payouts.reduce((sum, payout) => sum + payout.amount, 0);
    const totalFees = payouts.reduce((sum, payout) => sum + payout.platformFee, 0);
    const totalGross = payouts.reduce((sum, payout) => sum + payout.grossAmount, 0);

    return {
      payoutCount: payouts.length,
      totalPayouts: Math.round(totalPayouts * 100) / 100,
      totalPlatformFees: Math.round(totalFees * 100) / 100,
      totalGrossRevenue: Math.round(totalGross * 100) / 100,
      averagePayout: payouts.length > 0 ? Math.round((totalPayouts / payouts.length) * 100) / 100 : 0,
      bankPayouts: payouts.filter(p => p.payoutMethod === 'bank').length,
      paypalPayouts: payouts.filter(p => p.payoutMethod === 'paypal').length
    };
  }

  // Initialize with sample data
  static initializeSampleData(): void {
    // Sample seller payout info
    this.registerSellerPayout('seller_001', 'TechGear Pro', {
      preferredMethod: 'bank',
      payoutSchedule: 'weekly',
      bankAccount: {
        accountType: 'checking',
        routingNumber: '123456789',
        accountNumber: '****1234', // Masked for security
        accountHolderName: 'TechGear Pro LLC'
      }
    });

    this.registerSellerPayout('seller_002', 'Gaming Central', {
      preferredMethod: 'paypal',
      payoutSchedule: 'biweekly',
      paypalEmail: 'payouts@gamingcentral.com'
    });

    console.log('✅ Sample payout data initialized');
  }
}

export default SellerPayoutService;
