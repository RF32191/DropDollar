import Stripe from 'stripe';

// Initialize Stripe with your secret key - only if available
let stripe: Stripe | null = null;

// Check for Stripe keys
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

console.log('🔧 Stripe Configuration Check:');
console.log('🔧 STRIPE_SECRET_KEY exists:', !!stripeSecretKey);
console.log('🔧 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY exists:', !!stripePublishableKey);

if (stripeSecretKey && stripeSecretKey.length > 50) { // Check if key is long enough
  try {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });
    console.log('✅ Stripe initialized successfully with live keys');
  } catch (error) {
    console.error('❌ Failed to initialize Stripe:', error);
    stripe = null;
  }
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not found or too short - using mock mode');
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
  metadata?: Record<string, string>;
}

export interface PaymentMetadata {
  userId: string;
  type: 'listing' | 'tournament' | 'match' | 'hotsell' | 'ad_campaign' | 'tokens';
  listingId?: string;
  tournamentId?: string;
  matchId?: string;
  gameType?: string;
  entryNumber?: number;
}

export class StripePaymentService {
  /**
   * Create a payment intent for any DropDollar purchase
   */
  static async createPaymentIntent(
    amount: number, // Amount in cents (e.g., 500 = $5.00)
    currency: string = 'usd',
    metadata: PaymentMetadata
  ): Promise<PaymentIntent> {
    if (!stripe) {
      console.log('🔧 Using mock Stripe service for development');
      
      // Return a mock payment intent for development
      const mockPaymentIntent: PaymentIntent = {
        id: `pi_mock_${Date.now()}`,
        amount,
        currency,
        status: 'requires_payment_method',
        client_secret: `pi_mock_${Date.now()}_secret_mock`,
        metadata: {
          userId: metadata.userId,
          type: metadata.type,
          listingId: metadata.listingId || '',
          tournamentId: metadata.tournamentId || '',
          matchId: metadata.matchId || '',
          gameType: metadata.gameType || '',
          entryNumber: metadata.entryNumber?.toString() || ''
        }
      };
      
      console.log('✅ Mock payment intent created:', mockPaymentIntent.id);
      return mockPaymentIntent;
    }
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata: {
          userId: metadata.userId,
          type: metadata.type,
          listingId: metadata.listingId || '',
          tournamentId: metadata.tournamentId || '',
          matchId: metadata.matchId || '',
          gameType: metadata.gameType || '',
          entryNumber: metadata.entryNumber?.toString() || ''
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret!,
        metadata: paymentIntent.metadata
      };
    } catch (error: any) {
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Confirm a payment intent
   */
  static async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    if (!stripe) {
      console.log('🔧 Using mock Stripe confirmation for development');
      
      // Return a mock confirmed payment intent
      const mockPaymentIntent: PaymentIntent = {
        id: paymentIntentId,
        amount: 1000, // Mock amount
        currency: 'usd',
        status: 'succeeded',
        client_secret: `${paymentIntentId}_secret_mock`,
        metadata: {}
      };
      
      console.log('✅ Mock payment confirmed:', paymentIntentId);
      return mockPaymentIntent;
    }
    
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret!,
        metadata: paymentIntent.metadata
      };
    } catch (error: any) {
      throw new Error(`Failed to confirm payment intent: ${error.message}`);
    }
  }

  /**
   * Create refund for a payment
   */
  static async createRefund(
    paymentIntentId: string,
    amount?: number, // Optional partial refund amount in cents
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ): Promise<Stripe.Refund> {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please check your environment variables.');
    }
    
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
        reason
      });

      return refund;
    } catch (error: any) {
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Create payout for sellers (requires Stripe Connect setup)
   */
  static async createPayout(
    recipientStripeAccountId: string,
    amount: number, // Amount in cents
    currency: string = 'usd'
  ): Promise<Stripe.Transfer> {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please check your environment variables.');
    }
    
    try {
      const transfer = await stripe.transfers.create({
        amount,
        currency,
        destination: recipientStripeAccountId,
      });

      return transfer;
    } catch (error: any) {
      throw new Error(`Failed to create payout: ${error.message}`);
    }
  }

  /**
   * Get payment methods for a customer
   */
  static async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please check your environment variables.');
    }
    
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error: any) {
      throw new Error(`Failed to get payment methods: ${error.message}`);
    }
  }

  /**
   * Create or retrieve Stripe customer
   */
  static async createOrGetCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<Stripe.Customer> {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please check your environment variables.');
    }
    
    try {
      // First, try to find existing customer by metadata
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId: userId
        }
      });

      return customer;
    } catch (error: any) {
      throw new Error(`Failed to create/get customer: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please check your environment variables.');
    }
    
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error: any) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Calculate platform fee (12% for DropDollar)
   */
  static calculatePlatformFee(amount: number): {
    platformFee: number;
    sellerPayout: number;
    stripeFee: number; // Estimated Stripe fee (2.9% + 30¢)
    netSellerPayout: number;
  } {
    const platformFee = Math.round(amount * 0.12); // 12% platform cut
    const stripeFee = Math.round(amount * 0.029) + 30; // Stripe's fee
    const sellerPayout = amount - platformFee;
    const netSellerPayout = sellerPayout - stripeFee;

    return {
      platformFee,
      sellerPayout,
      stripeFee,
      netSellerPayout: Math.max(0, netSellerPayout) // Ensure non-negative
    };
  }

  /**
   * Get payment amount for different purchase types
   * Simple pricing: 1 DropToken = $1.00
   */
  static getPaymentAmounts(): {
    listing: { basic: number; priority: number };
    tournaments: { daily: number };
    matches: { bronze: number; silver: number; gold: number };
    hotSell: { tier1: number; tier2: number; tier3: number; tier4: number; tier5: number };
    tokens: { price: number }; // DropToken price
  } {
    return {
      listing: {
        basic: 20, // $0.20 in cents (0.2 DropTokens)
        priority: 1000 // $10.00 per day for marketing priority (10 DropTokens)
      },
      tournaments: {
        daily: 500 // $5.00 (5 DropTokens)
      },
      matches: {
        bronze: 500,  // $5.00 (5 DropTokens)
        silver: 1000, // $10.00 (10 DropTokens)
        gold: 2500    // $25.00 (25 DropTokens)
      },
      hotSell: {
        tier1: 1000,   // $10.00 (10 DropTokens)
        tier2: 10000,  // $100.00 (100 DropTokens)
        tier3: 50000,  // $500.00 (500 DropTokens)
        tier4: 250000, // $2500.00 (2500 DropTokens)
        tier5: 2500000 // $25000.00 (25000 DropTokens)
      },
      tokens: {
        price: 100 // $1.00 per DropToken (in cents)
      }
    };
  }
}

export default StripePaymentService;