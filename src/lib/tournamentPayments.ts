// Tournament Payment & Prize Distribution System

export interface TournamentEntry {
  userId: string;
  tournamentId: string;
  dollarAmount: number; // Dollar value used (1-3)
  tokenAmount: number; // Actual fractional tokens used
  tokenPrice: number; // Token price at time of entry
  paymentMethod: string;
  entryTime: Date;
  gameScore?: number;
  finalRank?: number;
  hasPlayedGame: boolean; // Track if user has completed their game
}

export interface WinnerCooldown {
  userId: string;
  tournamentType: string; // 'starter-100', 'intermediate-500', etc.
  winDate: Date;
  cooldownUntil: Date; // 6 months from win date
}

export interface TournamentWinner {
  userId: string;
  tournamentId: string;
  prizeAmount: number;
  winDate: Date;
  finalScore: number;
  gameType: string;
  rank: number; // 1st, 2nd, 3rd, etc.
}

export interface DailyTournamentConfig {
  id: string;
  name: string;
  prizeAmount: number;
  maxWinnersPerDay: number;
  minParticipants: number;
  platformFeePercentage: number;
  isActive: boolean;
}

export interface TournamentPrizeStructure {
  tournamentId: string;
  totalPrizePool: number; // Token value in USD
  minimumEntryThreshold: number; // Minimum coins needed to start contest
  platformFeePercentage: number; // 15% platform fee for cash tournaments
  platformFeeAmount: number; // Calculated platform fee in USD
  netPrizePool: number; // Prize pool after platform fee
  prizeDistribution: {
    rank: number;
    percentage: number;
    tokenAmount: number;
  }[];
}

export interface PlatformRevenue {
  tournamentId: string;
  totalEntryFees: number; // Total USD collected from entries
  participantCount: number;
  platformProfit: number; // Entry fees minus operational costs
  platformFeeRevenue: number; // 15% fee from prize pool
  totalPlatformRevenue: number; // Entry fees + platform fee
  date: Date;
}

export class TournamentPaymentService {
  // Platform owner wallet address (where entry fees go)
  private static readonly PLATFORM_WALLET = "0x1234...PlatformOwnerWallet";
  
  // Daily tournament configurations
  private static readonly DAILY_TOURNAMENTS: DailyTournamentConfig[] = [
    {
      id: 'micro-10',
      name: '$10 Micro Tournament',
      prizeAmount: 10,
      maxWinnersPerDay: 10,
      minParticipants: 10,
      platformFeePercentage: 15,
      isActive: true
    },
    {
      id: 'starter-100',
      name: 'Starter Tournament',
      prizeAmount: 100,
      maxWinnersPerDay: 10, // 10 different games
      minParticipants: 100,
      platformFeePercentage: 15,
      isActive: true
    },
    {
      id: 'intermediate-500',
      name: 'Intermediate Tournament',
      prizeAmount: 500,
      maxWinnersPerDay: 5,
      minParticipants: 500,
      platformFeePercentage: 15,
      isActive: true
    },
    {
      id: 'advanced-2500',
      name: 'Advanced Tournament',
      prizeAmount: 2500,
      maxWinnersPerDay: 5,
      minParticipants: 2500,
      platformFeePercentage: 15,
      isActive: true
    },
    {
      id: 'elite-25000',
      name: 'Elite Championship',
      prizeAmount: 25000,
      maxWinnersPerDay: 2,
      minParticipants: 25000,
      platformFeePercentage: 15,
      isActive: true
    }
  ];
  
  // Mock storage - in production, this would be a database
  private static entries: Map<string, TournamentEntry[]> = new Map();
  private static prizeStructures: Map<string, TournamentPrizeStructure> = new Map();
  private static platformRevenue: PlatformRevenue[] = [];
  private static tokenReserve: number = 1000000; // Platform token reserve for prizes
  private static winnerCooldowns: WinnerCooldown[] = []; // Track winner cooldowns
  private static dailyWinners: Map<string, TournamentWinner[]> = new Map(); // Key: date-tournamentId
  private static tournamentResults: Map<string, TournamentWinner[]> = new Map(); // Key: tournamentId

  /**
   * Initialize tournament prize structures
   */
  static initializeTournaments() {
    // $100 Starter Tournament
    const starter100PrizePool = 100;
    const starter100PlatformFee = starter100PrizePool * 0.065; // 6.5%
    const starter100NetPrize = starter100PrizePool - starter100PlatformFee;
    
    this.prizeStructures.set('starter-100', {
      tournamentId: 'starter-100',
      totalPrizePool: starter100PrizePool,
      minimumEntryThreshold: 100, // Need 100 coins ($100) to start
      platformFeePercentage: 15,
      platformFeeAmount: starter100PlatformFee,
      netPrizePool: starter100NetPrize,
      prizeDistribution: [
        { rank: 1, percentage: 50, tokenAmount: starter100NetPrize * 0.50 },
        { rank: 2, percentage: 30, tokenAmount: starter100NetPrize * 0.30 },
        { rank: 3, percentage: 20, tokenAmount: starter100NetPrize * 0.20 }
      ]
    });

    // $500 Intermediate Tournament  
    const intermediate500PrizePool = 500;
    const intermediate500PlatformFee = intermediate500PrizePool * 0.065; // 6.5%
    const intermediate500NetPrize = intermediate500PrizePool - intermediate500PlatformFee;
    
    this.prizeStructures.set('intermediate-500', {
      tournamentId: 'intermediate-500',
      totalPrizePool: intermediate500PrizePool,
      minimumEntryThreshold: 500, // Need 500 coins ($500) to start
      platformFeePercentage: 15,
      platformFeeAmount: intermediate500PlatformFee,
      netPrizePool: intermediate500NetPrize,
      prizeDistribution: [
        { rank: 1, percentage: 40, tokenAmount: intermediate500NetPrize * 0.40 },
        { rank: 2, percentage: 25, tokenAmount: intermediate500NetPrize * 0.25 },
        { rank: 3, percentage: 15, tokenAmount: intermediate500NetPrize * 0.15 },
        { rank: 4, percentage: 10, tokenAmount: intermediate500NetPrize * 0.10 },
        { rank: 5, percentage: 10, tokenAmount: intermediate500NetPrize * 0.10 }
      ]
    });

    // $2,500 Advanced Tournament
    const advanced2500PrizePool = 2500;
    const advanced2500PlatformFee = advanced2500PrizePool * 0.065; // 6.5%
    const advanced2500NetPrize = advanced2500PrizePool - advanced2500PlatformFee;
    
    this.prizeStructures.set('advanced-2500', {
      tournamentId: 'advanced-2500',
      totalPrizePool: advanced2500PrizePool,
      minimumEntryThreshold: 2500, // Need 2500 coins ($2500) to start
      platformFeePercentage: 15,
      platformFeeAmount: advanced2500PlatformFee,
      netPrizePool: advanced2500NetPrize,
      prizeDistribution: [
        { rank: 1, percentage: 35, tokenAmount: advanced2500NetPrize * 0.35 },
        { rank: 2, percentage: 20, tokenAmount: advanced2500NetPrize * 0.20 },
        { rank: 3, percentage: 15, tokenAmount: advanced2500NetPrize * 0.15 },
        { rank: 4, percentage: 10, tokenAmount: advanced2500NetPrize * 0.10 },
        { rank: 5, percentage: 8, tokenAmount: advanced2500NetPrize * 0.08 },
        { rank: 6, percentage: 6, tokenAmount: advanced2500NetPrize * 0.06 },
        { rank: 7, percentage: 3, tokenAmount: advanced2500NetPrize * 0.03 },
        { rank: 8, percentage: 3, tokenAmount: advanced2500NetPrize * 0.03 }
      ]
    });

    // $25,000 Elite Championship
    const elite25000PrizePool = 25000;
    const elite25000PlatformFee = elite25000PrizePool * 0.065; // 6.5%
    const elite25000NetPrize = elite25000PrizePool - elite25000PlatformFee;
    
    this.prizeStructures.set('elite-25000', {
      tournamentId: 'elite-25000',
      totalPrizePool: elite25000PrizePool,
      minimumEntryThreshold: 25000, // Need 25000 coins ($25000) to start
      platformFeePercentage: 15,
      platformFeeAmount: elite25000PlatformFee,
      netPrizePool: elite25000NetPrize,
      prizeDistribution: [
        { rank: 1, percentage: 30, tokenAmount: elite25000NetPrize * 0.30 },
        { rank: 2, percentage: 18, tokenAmount: elite25000NetPrize * 0.18 },
        { rank: 3, percentage: 12, tokenAmount: elite25000NetPrize * 0.12 },
        { rank: 4, percentage: 8, tokenAmount: elite25000NetPrize * 0.08 },
        { rank: 5, percentage: 6, tokenAmount: elite25000NetPrize * 0.06 },
        { rank: 6, percentage: 5, tokenAmount: elite25000NetPrize * 0.05 },
        { rank: 7, percentage: 4, tokenAmount: elite25000NetPrize * 0.04 },
        { rank: 8, percentage: 3, tokenAmount: elite25000NetPrize * 0.03 },
        { rank: 9, percentage: 3, tokenAmount: elite25000NetPrize * 0.03 },
        { rank: 10, percentage: 2, tokenAmount: elite25000NetPrize * 0.02 },
        { rank: 11, percentage: 2, tokenAmount: elite25000NetPrize * 0.02 },
        { rank: 12, percentage: 2, tokenAmount: elite25000NetPrize * 0.02 },
        { rank: 13, percentage: 2, tokenAmount: elite25000NetPrize * 0.02 },
        { rank: 14, percentage: 2, tokenAmount: elite25000NetPrize * 0.02 },
        { rank: 15, percentage: 1, tokenAmount: elite25000NetPrize * 0.01 }
      ]
    });
  }

  /**
   * Process tournament entry payment
   */
  static async processTournamentEntry(
    userId: string,
    tournamentId: string,
    dollarAmount: number, // 1-3 dollars worth of tokens
    paymentMethod: string
  ): Promise<{ success: boolean; entryId?: string; error?: string; thresholdMet?: boolean }> {
    
    try {
      // Validate tournament exists
      const prizeStructure = this.prizeStructures.get(tournamentId);
      if (!prizeStructure) {
        return { success: false, error: 'Tournament not found' };
      }

      // Validate dollar amount (1-3 dollars worth of tokens)
      if (dollarAmount < 1 || dollarAmount > 3) {
        return { success: false, error: 'Must use $1-$3 worth of tokens per entry' };
      }

      // Check if user already has an entry for this tournament
      const existingEntries = this.entries.get(tournamentId) || [];
      const userEntry = existingEntries.find(entry => entry.userId === userId);
      
      if (userEntry) {
        return { success: false, error: 'You already have an entry in this tournament' };
      }

      // Check if user is on cooldown for this tournament type
      const cooldownCheck = this.checkUserCooldown(userId, tournamentId);
      if (!cooldownCheck.canParticipate) {
        return { 
          success: false, 
          error: `You won this tournament recently! Cooldown until: ${cooldownCheck.cooldownUntil?.toLocaleDateString()}` 
        };
      }

      // Mock token processing - in production, this would use TokenManagementService
      const mockTokenPrice = 2.45;
      const tokensNeeded = dollarAmount / mockTokenPrice;
      console.log(`💰 Processing ${dollarAmount} dollars (${tokensNeeded.toFixed(4)} tokens) for tournament ${tournamentId}`);

      // Process payment to platform owner (dollar amount)
      const paymentResult = await this.processPaymentToPlatform(dollarAmount, paymentMethod);
      if (!paymentResult.success) {
        return { success: false, error: paymentResult.error };
      }

      // Create tournament entry
      const entry: TournamentEntry = {
        userId,
        tournamentId,
        dollarAmount,
        tokenAmount: tokensNeeded,
        tokenPrice: mockTokenPrice,
        paymentMethod,
        entryTime: new Date(),
        hasPlayedGame: false
      };

      // Store entry
      const tournamentEntries = this.entries.get(tournamentId) || [];
      tournamentEntries.push(entry);
      this.entries.set(tournamentId, tournamentEntries);

      // Update platform revenue tracking
      this.updatePlatformRevenue(tournamentId, dollarAmount);

      // Check if minimum threshold is met
      const totalDollarsCollected = tournamentEntries.reduce((sum, e) => sum + e.dollarAmount, 0);
      const thresholdMet = totalDollarsCollected >= prizeStructure.minimumEntryThreshold;

      return { 
        success: true, 
        entryId: `${tournamentId}_${userId}_${Date.now()}`,
        thresholdMet
      };

    } catch (error) {
      console.error('Tournament entry processing error:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  /**
   * Process payment to platform owner
   */
  private static async processPaymentToPlatform(
    amount: number,
    paymentMethod: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    
    // Simulate payment processing
    console.log(`Processing $${amount} payment via ${paymentMethod} to platform wallet ${this.PLATFORM_WALLET}`);
    
    // In production, this would integrate with:
    // - Stripe for credit cards
    // - PayPal API
    // - Cryptocurrency payment processors
    // - Bank transfer systems
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate 95% success rate
    if (Math.random() < 0.95) {
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`✅ Payment successful! Transaction ID: ${transactionId}`);
      console.log(`💰 $${amount} deposited to platform owner wallet`);
      
      return { 
        success: true, 
        transactionId 
      };
    } else {
      return { 
        success: false, 
        error: 'Payment declined by processor' 
      };
    }
  }

  /**
   * Update platform revenue tracking
   */
  private static updatePlatformRevenue(tournamentId: string, entryFee: number): void {
    const today = new Date().toDateString();
    const prizeStructure = this.prizeStructures.get(tournamentId);
    const platformFeeRevenue = prizeStructure?.platformFeeAmount || 0;
    
    let revenueRecord = this.platformRevenue.find(
      r => r.tournamentId === tournamentId && r.date.toDateString() === today
    );

    if (revenueRecord) {
      revenueRecord.totalEntryFees += entryFee;
      revenueRecord.participantCount += 1;
      revenueRecord.platformProfit = revenueRecord.totalEntryFees * 0.95; // 5% operational costs
      revenueRecord.totalPlatformRevenue = revenueRecord.totalEntryFees + platformFeeRevenue;
    } else {
      this.platformRevenue.push({
        tournamentId,
        totalEntryFees: entryFee,
        participantCount: 1,
        platformProfit: entryFee * 0.95,
        platformFeeRevenue,
        totalPlatformRevenue: entryFee + platformFeeRevenue,
        date: new Date()
      });
    }
  }

  /**
   * Distribute tournament prizes (called when tournament ends)
   */
  static async distributeTournamentPrizes(
    tournamentId: string,
    finalRankings: { userId: string; score: number; rank: number }[]
  ): Promise<{ success: boolean; distributions: any[]; error?: string }> {
    
    try {
      const prizeStructure = this.prizeStructures.get(tournamentId);
      if (!prizeStructure) {
        return { success: false, distributions: [], error: 'Tournament not found' };
      }

      const distributions = [];

      // Distribute tokens to winners and add cooldowns
      for (const ranking of finalRankings) {
        const prizeInfo = prizeStructure.prizeDistribution.find(p => p.rank === ranking.rank);
        
        if (prizeInfo && prizeInfo.tokenAmount > 0) {
          // Transfer tokens to winner's wallet
          const tokenTransfer = await this.transferTokensToWinner(
            ranking.userId,
            prizeInfo.tokenAmount,
            tournamentId,
            ranking.rank
          );

          // Add 30-day cooldown for winners (all prize recipients)
          this.addWinnerCooldown(ranking.userId, tournamentId);

          distributions.push({
            userId: ranking.userId,
            rank: ranking.rank,
            tokenAmount: prizeInfo.tokenAmount,
            transferSuccess: tokenTransfer.success,
            transactionId: tokenTransfer.transactionId,
            cooldownAdded: true
          });
        }
      }

      console.log(`🏆 Tournament ${tournamentId} prizes distributed to ${distributions.length} winners`);
      
      return { success: true, distributions };

    } catch (error) {
      console.error('Prize distribution error:', error);
      return { success: false, distributions: [], error: 'Prize distribution failed' };
    }
  }

  /**
   * Transfer tokens to tournament winner
   */
  private static async transferTokensToWinner(
    userId: string,
    tokenAmount: number,
    tournamentId: string,
    rank: number
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    
    // Check platform token reserve
    if (this.tokenReserve < tokenAmount) {
      console.error(`❌ Insufficient token reserve. Need: ${tokenAmount}, Available: ${this.tokenReserve}`);
      return { success: false, error: 'Insufficient platform token reserve' };
    }

    // Simulate token transfer
    console.log(`🪙 Transferring ${tokenAmount} tokens to user ${userId} (Rank ${rank} in ${tournamentId})`);
    
    // In production, this would:
    // 1. Interact with blockchain/token contract
    // 2. Transfer from platform wallet to user wallet
    // 3. Update user's token balance in database
    // 4. Create transaction record
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Deduct from platform reserve
    this.tokenReserve -= tokenAmount;
    
    const transactionId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`✅ Token transfer successful! Transaction ID: ${transactionId}`);
    console.log(`💰 ${tokenAmount} tokens sent to user ${userId}`);
    console.log(`🏦 Platform token reserve: ${this.tokenReserve} remaining`);
    
    return { 
      success: true, 
      transactionId 
    };
  }

  /**
   * Get tournament financial summary
   */
  static getTournamentFinancials(tournamentId: string): {
    entryFees: { total: number; count: number };
    prizePool: { total: number; distributed: number };
    platformProfit: number;
    participants: number;
  } {
    const entries = this.entries.get(tournamentId) || [];
    const prizeStructure = this.prizeStructures.get(tournamentId);
    
    const totalEntryFees = entries.reduce((sum, entry) => sum + entry.entryFee, 0);
    const participantCount = entries.length;
    
    const revenueRecord = this.platformRevenue.find(r => r.tournamentId === tournamentId);
    const platformProfit = revenueRecord?.platformProfit || 0;
    
    return {
      entryFees: {
        total: totalEntryFees,
        count: participantCount
      },
      prizePool: {
        total: prizeStructure?.totalPrizePool || 0,
        distributed: 0 // Would track actual distributions
      },
      platformProfit,
      participants: participantCount
    };
  }

  /**
   * Get daily platform revenue summary
   */
  static getDailyRevenueSummary(date: Date = new Date()): {
    totalRevenue: number;
    totalParticipants: number;
    tournamentBreakdown: any[];
    projectedDaily: number;
  } {
    const dateString = date.toDateString();
    const dailyRevenue = this.platformRevenue.filter(
      r => r.date.toDateString() === dateString
    );

    const totalRevenue = dailyRevenue.reduce((sum, r) => sum + r.totalEntryFees, 0);
    const totalParticipants = dailyRevenue.reduce((sum, r) => sum + r.participantCount, 0);
    
    // Project daily revenue based on tournament capacities
    const projectedDaily = (100 * 1) + (50 * 10) + (50 * 50) + (50 * 500); // Max theoretical daily

    return {
      totalRevenue,
      totalParticipants,
      tournamentBreakdown: dailyRevenue,
      projectedDaily
    };
  }

  /**
   * Get tournament status and progress
   */
  static getTournamentStatus(tournamentId: string): {
    exists: boolean;
    totalCoinsCollected: number;
    minimumThreshold: number;
    thresholdMet: boolean;
    participantCount: number;
    prizePool: number;
    canStart: boolean;
    acceptingEntries: boolean;
    excessRevenue: number; // Revenue beyond minimum threshold
  } {
    const prizeStructure = this.prizeStructures.get(tournamentId);
    const entries = this.entries.get(tournamentId) || [];
    
    if (!prizeStructure) {
      return {
        exists: false,
        totalCoinsCollected: 0,
        minimumThreshold: 0,
        thresholdMet: false,
        participantCount: 0,
        prizePool: 0,
        canStart: false,
        acceptingEntries: false,
        excessRevenue: 0
      };
    }

    const totalDollarsCollected = entries.reduce((sum, e) => sum + e.dollarAmount, 0);
    const thresholdMet = totalDollarsCollected >= prizeStructure.minimumEntryThreshold;
    const excessRevenue = Math.max(0, totalDollarsCollected - prizeStructure.minimumEntryThreshold);

    return {
      exists: true,
      totalCoinsCollected: totalDollarsCollected,
      minimumThreshold: prizeStructure.minimumEntryThreshold,
      thresholdMet,
      participantCount: entries.length,
      prizePool: prizeStructure.totalPrizePool,
      canStart: thresholdMet,
      acceptingEntries: true, // Always accepting entries (unlimited participants)
      excessRevenue
    };
  }

  /**
   * Record game completion and score (but don't reveal until tournament ends)
   */
  static recordGameScore(userId: string, tournamentId: string, score: number): { success: boolean; error?: string } {
    const entries = this.entries.get(tournamentId) || [];
    const userEntry = entries.find(entry => entry.userId === userId);
    
    if (!userEntry) {
      return { success: false, error: 'No entry found for this user in this tournament' };
    }

    if (userEntry.hasPlayedGame) {
      return { success: false, error: 'User has already played their game' };
    }

    // Record score but don't reveal it
    userEntry.gameScore = score;
    userEntry.hasPlayedGame = true;

    // Update the entries
    this.entries.set(tournamentId, entries);

    console.log(`🎮 Score recorded for user ${userId} in tournament ${tournamentId}: ${score} (hidden until tournament ends)`);
    
    return { success: true };
  }

  /**
   * Get user's tournament entry (without revealing scores of others)
   */
  static getUserTournamentEntry(userId: string, tournamentId: string): {
    hasEntry: boolean;
    coinsUsed?: number;
    hasPlayedGame?: boolean;
    canPlayGame?: boolean;
  } {
    const entries = this.entries.get(tournamentId) || [];
    const userEntry = entries.find(entry => entry.userId === userId);
    
    if (!userEntry) {
      return { hasEntry: false };
    }

    const tournamentStatus = this.getTournamentStatus(tournamentId);

    return {
      hasEntry: true,
      coinsUsed: userEntry.coinsUsed,
      hasPlayedGame: userEntry.hasPlayedGame,
      canPlayGame: tournamentStatus.thresholdMet && !userEntry.hasPlayedGame
    };
  }

  /**
   * Check if user is on cooldown for a tournament type
   */
  static checkUserCooldown(userId: string, tournamentId: string): {
    canParticipate: boolean;
    cooldownUntil?: Date;
    daysRemaining?: number;
  } {
    const now = new Date();
    
    // Find active cooldown for this user and tournament type
    const activeCooldown = this.winnerCooldowns.find(cooldown => 
      cooldown.userId === userId && 
      cooldown.tournamentType === tournamentId &&
      cooldown.cooldownUntil > now
    );

    if (activeCooldown) {
      const daysRemaining = Math.ceil((activeCooldown.cooldownUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        canParticipate: false,
        cooldownUntil: activeCooldown.cooldownUntil,
        daysRemaining
      };
    }

    return { canParticipate: true };
  }

  /**
   * Add winner cooldown (6 months)
   */
  static addWinnerCooldown(userId: string, tournamentId: string): void {
    const now = new Date();
    const cooldownUntil = new Date(now);
    cooldownUntil.setMonth(cooldownUntil.getMonth() + 6); // 6 months

    const cooldown: WinnerCooldown = {
      userId,
      tournamentType: tournamentId,
      winDate: now,
      cooldownUntil
    };

    // Remove any existing cooldown for this user/tournament
    this.winnerCooldowns = this.winnerCooldowns.filter(c => 
      !(c.userId === userId && c.tournamentType === tournamentId)
    );

    // Add new cooldown
    this.winnerCooldowns.push(cooldown);

    console.log(`🚫 Winner cooldown added: User ${userId} cannot enter ${tournamentId} for 6 months until ${cooldownUntil.toLocaleDateString()}`);
  }

  /**
   * Clean up expired cooldowns
   */
  static cleanupExpiredCooldowns(): void {
    const now = new Date();
    const beforeCount = this.winnerCooldowns.length;
    
    this.winnerCooldowns = this.winnerCooldowns.filter(cooldown => 
      cooldown.cooldownUntil > now
    );

    const removedCount = beforeCount - this.winnerCooldowns.length;
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired winner cooldowns`);
    }
  }

  /**
   * Get user's active cooldowns
   */
  static getUserCooldowns(userId: string): WinnerCooldown[] {
    const now = new Date();
    return this.winnerCooldowns.filter(cooldown => 
      cooldown.userId === userId && cooldown.cooldownUntil > now
    );
  }

  /**
   * Get platform statistics
   */
  static getPlatformStats(): {
    totalTournaments: number;
    totalRevenue: number;
    totalParticipants: number;
    tokenReserve: number;
    averageRevenuePerTournament: number;
    activeCooldowns: number;
  } {
    const totalRevenue = this.platformRevenue.reduce((sum, r) => sum + r.totalEntryFees, 0);
    const totalParticipants = this.platformRevenue.reduce((sum, r) => sum + r.participantCount, 0);
    const totalTournaments = this.platformRevenue.length;
    
    // Clean up expired cooldowns before counting
    this.cleanupExpiredCooldowns();
    
    return {
      totalTournaments,
      totalRevenue,
      totalParticipants,
      tokenReserve: this.tokenReserve,
      averageRevenuePerTournament: totalTournaments > 0 ? totalRevenue / totalTournaments : 0,
      activeCooldowns: this.winnerCooldowns.length
    };
  }

  /**
   * Get daily tournament configuration
   */
  static getDailyTournamentConfig(tournamentId: string): DailyTournamentConfig | null {
    return this.DAILY_TOURNAMENTS.find(t => t.id === tournamentId) || null;
  }

  /**
   * Check if tournament has available winner slots for today
   */
  static hasAvailableWinnerSlots(tournamentId: string): { hasSlots: boolean; availableSlots: number; maxSlots: number } {
    const config = this.getDailyTournamentConfig(tournamentId);
    if (!config) {
      return { hasSlots: false, availableSlots: 0, maxSlots: 0 };
    }

    const today = new Date().toDateString();
    const dailyKey = `${today}-${tournamentId}`;
    const todaysWinners = this.dailyWinners.get(dailyKey) || [];
    
    const availableSlots = config.maxWinnersPerDay - todaysWinners.length;
    
    return {
      hasSlots: availableSlots > 0,
      availableSlots: Math.max(0, availableSlots),
      maxSlots: config.maxWinnersPerDay
    };
  }

  /**
   * Record tournament winner
   */
  static recordTournamentWinner(winner: TournamentWinner): void {
    const today = new Date().toDateString();
    const dailyKey = `${today}-${winner.tournamentId}`;
    
    // Add to daily winners
    const dailyWinners = this.dailyWinners.get(dailyKey) || [];
    dailyWinners.push(winner);
    this.dailyWinners.set(dailyKey, dailyWinners);
    
    // Add to tournament results
    const tournamentResults = this.tournamentResults.get(winner.tournamentId) || [];
    tournamentResults.push(winner);
    this.tournamentResults.set(winner.tournamentId, tournamentResults);
    
    // Add winner cooldown
    this.addWinnerCooldown(winner.userId, winner.tournamentId);
    
    console.log(`🏆 Tournament winner recorded: ${winner.userId} won $${winner.prizeAmount} in ${winner.tournamentId}`);
  }

  /**
   * Get tournament winners for transparency
   */
  static getTournamentWinners(tournamentId: string): TournamentWinner[] {
    return this.tournamentResults.get(tournamentId) || [];
  }

  /**
   * Get daily winners for transparency
   */
  static getDailyWinners(date?: string): { [tournamentId: string]: TournamentWinner[] } {
    const targetDate = date || new Date().toDateString();
    const result: { [tournamentId: string]: TournamentWinner[] } = {};
    
    this.DAILY_TOURNAMENTS.forEach(tournament => {
      const dailyKey = `${targetDate}-${tournament.id}`;
      const winners = this.dailyWinners.get(dailyKey) || [];
      result[tournament.id] = winners;
    });
    
    return result;
  }

  /**
   * Get tournament final pot information
   */
  static getTournamentFinalPot(tournamentId: string): {
    totalCollected: number;
    platformFee: number;
    finalPrizePool: number;
    participantCount: number;
    winners: TournamentWinner[];
  } {
    const entries = this.entries.get(tournamentId) || [];
    const totalCollected = entries.reduce((sum, entry) => sum + entry.dollarAmount, 0);
    const config = this.getDailyTournamentConfig(tournamentId);
    const platformFeePercentage = config?.platformFeePercentage || 6.5;
    const platformFee = (totalCollected * platformFeePercentage) / 100;
    const finalPrizePool = totalCollected - platformFee;
    const winners = this.getTournamentWinners(tournamentId);
    
    return {
      totalCollected,
      platformFee,
      finalPrizePool,
      participantCount: entries.length,
      winners
    };
  }
}

// Initialize tournament structures
TournamentPaymentService.initializeTournaments();

export default TournamentPaymentService;
