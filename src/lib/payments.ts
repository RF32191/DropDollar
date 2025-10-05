// Payment Integration Library
// Handles Stripe payments only - simplified for DropTokens

export interface PaymentMethod {
  id: string;
  type: 'card';
  name: string;
  icon: string;
  enabled: boolean;
  processingFee: number; // Percentage
}

export interface PaymentRequest {
  amount: number; // USD amount
  tokenAmount: number; // Number of DropTokens
  method: PaymentMethod;
  userId: string;
  email: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  tokens?: number;
  receipt?: PaymentReceipt;
}

export interface PaymentReceipt {
  id: string;
  amount: number;
  tokenAmount: number;
  method: string;
  timestamp: Date;
  fees: {
    processing: number;
    platform: number;
  };
}

// Available payment methods - Credit/Debit cards only
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'stripe-card',
    type: 'card',
    name: 'Credit/Debit Card',
    icon: '💳',
    enabled: true,
    processingFee: 2.9 // 2.9% + $0.30
  }
];

class PaymentManager {
  private currentTokenPrice: number = 1.00; // 1 DropToken = $1.00

  getCurrentTokenPrice(): number {
    return this.currentTokenPrice;
  }

  calculateTotal(tokenAmount: number): {
    tokenCost: number;
    processingFee: number;
    total: number;
  } {
    const tokenCost = tokenAmount * this.currentTokenPrice;
    const processingFee = (tokenCost * 0.029) + 0.30; // Stripe fee
    const total = tokenCost + processingFee;

    return {
      tokenCost,
      processingFee,
      total
    };
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // Simulate payment processing
      const receipt: PaymentReceipt = {
        id: `txn_${Date.now()}`,
        amount: request.amount,
        tokenAmount: request.tokenAmount,
        method: request.method.name,
        timestamp: new Date(),
        fees: {
          processing: (request.amount * 0.029) + 0.30,
          platform: 0
        }
      };

      // In production, this would integrate with Stripe
      return {
        success: true,
        transactionId: receipt.id,
        tokens: request.tokenAmount,
        receipt
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  }

  // Generate mock price history for display
  getPriceHistory(days: number): Array<{timestamp: Date, price: number}> {
    const history = [];
    const basePrice = this.currentTokenPrice;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // DropTokens have stable pricing at $1.00
      history.push({
        timestamp: date,
        price: basePrice
      });
    }
    
    return history;
  }
}

export const paymentManager = new PaymentManager();