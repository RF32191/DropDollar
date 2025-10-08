// Token Management System - Handles fractional token usage based on dollar value

export interface TokenPrice {
  currentPrice: number; // Current token price in USD
  lastUpdated: Date;
  priceHistory: { price: number; timestamp: Date }[];
}

export interface TokenEntry {
  userId: string;
  dollarAmount: number; // Dollar value being spent (1-3)
  tokenAmount: number; // Actual fractional tokens used
  tokenPrice: number; // Token price at time of entry
  entryTime: Date;
}

export class TokenManagementService {
  // Mock token price - in production, this would come from blockchain/exchange
  private static currentTokenPrice: TokenPrice = {
    currentPrice: 2.45, // Example: 1 token = $2.45
    lastUpdated: new Date(),
    priceHistory: []
  };

  /**
   * Get current token price
   */
  static getCurrentTokenPrice(): number {
    // Simulate price fluctuation (in production, this would be real-time data)
    const basePrice = 2.45;
    const fluctuation = (Math.random() - 0.5) * 0.1; // ±5% fluctuation
    const newPrice = Math.max(0.1, basePrice + fluctuation);
    
    this.currentTokenPrice.currentPrice = newPrice;
    this.currentTokenPrice.lastUpdated = new Date();
    
    return newPrice;
  }

  /**
   * Calculate token amount needed for dollar value
   */
  static calculateTokensForDollarAmount(dollarAmount: number): {
    tokenAmount: number;
    tokenPrice: number;
    dollarValue: number;
  } {
    const currentPrice = this.getCurrentTokenPrice();
    const tokenAmount = dollarAmount / currentPrice;
    
    return {
      tokenAmount: parseFloat(tokenAmount.toFixed(8)), // 8 decimal precision
      tokenPrice: currentPrice,
      dollarValue: dollarAmount
    };
  }

  /**
   * Validate token entry (1-3 dollars worth)
   */
  static validateTokenEntry(dollarAmount: number): {
    isValid: boolean;
    error?: string;
    tokenCalculation?: {
      tokenAmount: number;
      tokenPrice: number;
      dollarValue: number;
    };
  } {
    // Validate dollar amount
    if (dollarAmount < 1 || dollarAmount > 3) {
      return {
        isValid: false,
        error: 'Entry must be between $1 and $3 worth of tokens'
      };
    }

    // Check if dollar amount is valid increment (whole dollars only for now)
    if (!Number.isInteger(dollarAmount)) {
      return {
        isValid: false,
        error: 'Entry must be in whole dollar amounts ($1, $2, or $3)'
      };
    }

    const tokenCalculation = this.calculateTokensForDollarAmount(dollarAmount);

    return {
      isValid: true,
      tokenCalculation
    };
  }

  /**
   * Process token entry for tournament/listing
   */
  static processTokenEntry(
    userId: string,
    dollarAmount: number,
    listingId: string
  ): {
    success: boolean;
    error?: string;
    tokenEntry?: TokenEntry;
    remainingBalance?: number;
  } {
    // Validate entry
    const validation = this.validateTokenEntry(dollarAmount);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const tokenCalculation = validation.tokenCalculation!;
    
    // Check user's token balance (mock - in production, check blockchain/database)
    const userBalance = this.getUserTokenBalance(userId);
    
    if (userBalance < tokenCalculation.tokenAmount) {
      return {
        success: false,
        error: `Insufficient tokens. Need ${tokenCalculation.tokenAmount.toFixed(8)} tokens ($${dollarAmount}), have ${userBalance.toFixed(8)} tokens`
      };
    }

    // Create token entry record
    const tokenEntry: TokenEntry = {
      userId,
      dollarAmount,
      tokenAmount: tokenCalculation.tokenAmount,
      tokenPrice: tokenCalculation.tokenPrice,
      entryTime: new Date()
    };

    // Deduct tokens from user balance (mock)
    this.deductUserTokens(userId, tokenCalculation.tokenAmount);
    
    const remainingBalance = this.getUserTokenBalance(userId);

    console.log(`💰 Token Entry Processed:`);
    console.log(`   User: ${userId}`);
    console.log(`   Dollar Amount: $${dollarAmount}`);
    console.log(`   Token Amount: ${tokenCalculation.tokenAmount.toFixed(8)} tokens`);
    console.log(`   Token Price: $${tokenCalculation.tokenPrice.toFixed(4)} per token`);
    console.log(`   Remaining Balance: ${remainingBalance.toFixed(8)} tokens`);

    return {
      success: true,
      tokenEntry,
      remainingBalance
    };
  }

  /**
   * Get user's token balance (mock implementation)
   */
  private static getUserTokenBalance(userId: string): number {
    // Mock user balances - in production, this would query blockchain/database
    const mockBalances: { [key: string]: number } = {
      'user_default': 100.0, // 100 tokens
      'user_test': 50.0,     // 50 tokens
    };
    
    // Default balance for new users
    return mockBalances[userId] || 25.0; // 25 tokens default
  }

  /**
   * Deduct tokens from user balance (mock implementation)
   */
  private static deductUserTokens(userId: string, tokenAmount: number): void {
    // Mock implementation - in production, this would update blockchain/database
    console.log(`🔻 Deducting ${tokenAmount.toFixed(8)} tokens from user ${userId}`);
  }

  /**
   * Get token entry summary for display
   */
  static getTokenEntrySummary(dollarAmount: number): {
    dollarValue: string;
    tokenAmount: string;
    tokenPrice: string;
    description: string;
  } {
    const calculation = this.calculateTokensForDollarAmount(dollarAmount);
    
    return {
      dollarValue: `$${dollarAmount.toFixed(2)}`,
      tokenAmount: `${calculation.tokenAmount.toFixed(8)} tokens`,
      tokenPrice: `$${calculation.tokenPrice.toFixed(4)} per token`,
      description: `Using ${calculation.tokenAmount.toFixed(8)} tokens worth $${dollarAmount}`
    };
  }

  /**
   * Get user's available dollar amounts based on token balance
   */
  static getAvailableDollarAmounts(userId: string): {
    availableAmounts: number[];
    tokenBalance: number;
    maxDollarValue: number;
  } {
    const tokenBalance = this.getUserTokenBalance(userId);
    const currentPrice = this.getCurrentTokenPrice();
    const maxDollarValue = Math.floor(tokenBalance * currentPrice);
    
    // Available amounts are $1, $2, $3 (if user has enough tokens)
    const availableAmounts: number[] = [];
    
    for (let amount = 1; amount <= 3; amount++) {
      const tokensNeeded = amount / currentPrice;
      if (tokenBalance >= tokensNeeded) {
        availableAmounts.push(amount);
      }
    }
    
    return {
      availableAmounts,
      tokenBalance,
      maxDollarValue: Math.min(maxDollarValue, 3) // Cap at $3 per entry
    };
  }

  /**
   * Format token amount for display
   */
  static formatTokenAmount(tokenAmount: number): string {
    if (tokenAmount >= 1) {
      return tokenAmount.toFixed(4);
    } else {
      return tokenAmount.toFixed(8);
    }
  }

  /**
   * Get token statistics
   */
  static getTokenStats(): {
    currentPrice: number;
    priceFormatted: string;
    tokensPerDollar: number;
    dollarsPerToken: number;
  } {
    const currentPrice = this.getCurrentTokenPrice();
    
    return {
      currentPrice,
      priceFormatted: `$${currentPrice.toFixed(4)}`,
      tokensPerDollar: parseFloat((1 / currentPrice).toFixed(8)),
      dollarsPerToken: currentPrice
    };
  }
}

export default TokenManagementService;
