// Token Refund Service
// Handles refunding tokens when sellers remove listings

export interface RefundTransaction {
  refundId: string;
  listingId: string;
  userId: string;
  originalAmount: number;
  refundAmount: number;
  refundReason: 'seller_removed' | 'listing_cancelled' | 'system_error' | 'compliance_violation';
  processedAt: Date;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
}

export interface ListingRefundSummary {
  listingId: string;
  totalParticipants: number;
  totalRefunded: number;
  refundTransactions: RefundTransaction[];
  processedAt: Date;
}

export class TokenRefundService {
  private static refundTransactions: Map<string, RefundTransaction> = new Map();
  private static listingRefunds: Map<string, ListingRefundSummary> = new Map();

  // Process refunds for a removed listing
  static async processListingRefunds(
    listingId: string, 
    reason: RefundTransaction['refundReason'] = 'seller_removed'
  ): Promise<ListingRefundSummary> {
    console.log(`💰 Processing refunds for listing: ${listingId} - Reason: ${reason}`);

    // Get all participants for this listing (mock data - in real app, query database)
    const participants = this.getListingParticipants(listingId);
    
    const refundTransactions: RefundTransaction[] = [];
    let totalRefunded = 0;

    for (const participant of participants) {
      const refund = await this.createRefundTransaction(
        listingId,
        participant.userId,
        participant.tokensSpent,
        reason
      );
      
      if (refund) {
        refundTransactions.push(refund);
        totalRefunded += refund.refundAmount;
      }
    }

    const summary: ListingRefundSummary = {
      listingId,
      totalParticipants: participants.length,
      totalRefunded,
      refundTransactions,
      processedAt: new Date()
    };

    this.listingRefunds.set(listingId, summary);
    
    console.log(`✅ Refund complete: ${participants.length} users, ${totalRefunded} tokens refunded`);
    
    // Notify users about refunds
    this.notifyUsersOfRefunds(refundTransactions);
    
    return summary;
  }

  // Create individual refund transaction
  private static async createRefundTransaction(
    listingId: string,
    userId: string,
    originalAmount: number,
    reason: RefundTransaction['refundReason']
  ): Promise<RefundTransaction | null> {
    const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate refund amount (100% for seller removals)
    const refundAmount = this.calculateRefundAmount(originalAmount, reason);
    
    const refund: RefundTransaction = {
      refundId,
      listingId,
      userId,
      originalAmount,
      refundAmount,
      refundReason: reason,
      processedAt: new Date(),
      status: 'pending'
    };

    try {
      // Process the actual refund (mock - in real app, interact with wallet service)
      const success = await this.processWalletRefund(userId, refundAmount);
      
      if (success) {
        refund.status = 'completed';
        refund.transactionHash = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        console.log(`💳 Refund processed: ${userId} received ${refundAmount} tokens`);
      } else {
        refund.status = 'failed';
        console.error(`❌ Refund failed: ${userId} - ${refundAmount} tokens`);
      }
    } catch (error) {
      refund.status = 'failed';
      console.error(`❌ Refund error: ${userId}`, error);
    }

    this.refundTransactions.set(refundId, refund);
    return refund;
  }

  // Calculate refund amount based on reason
  private static calculateRefundAmount(originalAmount: number, reason: RefundTransaction['refundReason']): number {
    switch (reason) {
      case 'seller_removed':
      case 'listing_cancelled':
        return originalAmount; // 100% refund
      case 'system_error':
        return originalAmount; // 100% refund for system issues
      case 'compliance_violation':
        return originalAmount * 0.95; // 95% refund (5% processing fee)
      default:
        return originalAmount;
    }
  }

  // Mock wallet refund processing
  private static async processWalletRefund(userId: string, amount: number): Promise<boolean> {
    // Simulate wallet service interaction
    try {
      // In real implementation, this would:
      // 1. Credit user's wallet balance
      // 2. Create transaction record
      // 3. Update blockchain if needed
      // 4. Send confirmation
      
      // Mock success (95% success rate)
      return Math.random() > 0.05;
    } catch (error) {
      return false;
    }
  }

  // Get listing participants (mock data)
  private static getListingParticipants(listingId: string): Array<{userId: string, tokensSpent: number, entryCount: number}> {
    // Mock participants data - in real app, query from database
    const mockParticipants = [
      { userId: 'user_001', tokensSpent: 3, entryCount: 3 },
      { userId: 'user_002', tokensSpent: 2, entryCount: 2 },
      { userId: 'user_003', tokensSpent: 1, entryCount: 1 },
      { userId: 'user_004', tokensSpent: 3, entryCount: 3 },
      { userId: 'user_005', tokensSpent: 2, entryCount: 2 },
    ];

    // Generate random number of participants based on listing ID
    const seed = this.hashString(listingId);
    const participantCount = 3 + (seed % 8); // 3-10 participants
    
    return mockParticipants.slice(0, participantCount);
  }

  // Notify users of refunds
  private static notifyUsersOfRefunds(refunds: RefundTransaction[]): void {
    refunds.forEach(refund => {
      if (refund.status === 'completed') {
        // In real app, send email/notification
        console.log(`📧 Notification sent to ${refund.userId}: Refund of ${refund.refundAmount} tokens processed`);
      }
    });
  }

  // Get refund status for a user
  static getUserRefunds(userId: string): RefundTransaction[] {
    return Array.from(this.refundTransactions.values())
      .filter(refund => refund.userId === userId)
      .sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime());
  }

  // Get refund summary for a listing
  static getListingRefundSummary(listingId: string): ListingRefundSummary | null {
    return this.listingRefunds.get(listingId) || null;
  }

  // Get refund transaction by ID
  static getRefundTransaction(refundId: string): RefundTransaction | null {
    return this.refundTransactions.get(refundId) || null;
  }

  // Get all pending refunds
  static getPendingRefunds(): RefundTransaction[] {
    return Array.from(this.refundTransactions.values())
      .filter(refund => refund.status === 'pending');
  }

  // Retry failed refund
  static async retryRefund(refundId: string): Promise<boolean> {
    const refund = this.refundTransactions.get(refundId);
    if (!refund || refund.status !== 'failed') {
      return false;
    }

    console.log(`🔄 Retrying refund: ${refundId}`);
    
    const success = await this.processWalletRefund(refund.userId, refund.refundAmount);
    
    if (success) {
      refund.status = 'completed';
      refund.transactionHash = `tx_retry_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      refund.processedAt = new Date();
      console.log(`✅ Refund retry successful: ${refundId}`);
      return true;
    } else {
      console.log(`❌ Refund retry failed: ${refundId}`);
      return false;
    }
  }

  // Get refund statistics
  static getRefundStatistics(): {
    totalRefunds: number;
    totalAmount: number;
    successRate: number;
    refundsByReason: { [reason: string]: number };
    recentRefunds: RefundTransaction[];
  } {
    const allRefunds = Array.from(this.refundTransactions.values());
    const totalRefunds = allRefunds.length;
    const totalAmount = allRefunds
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.refundAmount, 0);
    
    const completedRefunds = allRefunds.filter(r => r.status === 'completed').length;
    const successRate = totalRefunds > 0 ? (completedRefunds / totalRefunds) * 100 : 100;

    const refundsByReason: { [reason: string]: number } = {};
    allRefunds.forEach(refund => {
      refundsByReason[refund.refundReason] = (refundsByReason[refund.refundReason] || 0) + 1;
    });

    const recentRefunds = allRefunds
      .sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime())
      .slice(0, 10);

    return {
      totalRefunds,
      totalAmount: Math.round(totalAmount * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      refundsByReason,
      recentRefunds
    };
  }

  // Simulate seller removing a listing
  static async simulateSellerRemoval(listingId: string): Promise<ListingRefundSummary> {
    console.log(`🗑️ Seller removed listing: ${listingId}`);
    return await this.processListingRefunds(listingId, 'seller_removed');
  }

  // Utility function
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Clear all data (for testing)
  static clearAllData(): void {
    this.refundTransactions.clear();
    this.listingRefunds.clear();
  }

  // Get refund eligibility
  static checkRefundEligibility(listingId: string, userId: string): {
    eligible: boolean;
    reason: string;
    estimatedAmount: number;
  } {
    // Mock eligibility check
    const participants = this.getListingParticipants(listingId);
    const userParticipation = participants.find(p => p.userId === userId);

    if (!userParticipation) {
      return {
        eligible: false,
        reason: 'User did not participate in this listing',
        estimatedAmount: 0
      };
    }

    return {
      eligible: true,
      reason: 'Eligible for full refund due to seller removal',
      estimatedAmount: userParticipation.tokensSpent
    };
  }
}

export default TokenRefundService;
