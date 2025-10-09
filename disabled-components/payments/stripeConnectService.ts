import Stripe from 'stripe';
import { supabase } from '@/lib/supabase/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export interface StripeConnectAccount {
  id: string;
  email: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

export interface PayoutRequest {
  userId: string;
  amount: number; // Amount in cents
  currency?: string;
  description?: string;
}

export class StripeConnectService {
  /**
   * Create a Stripe Connect Express account for a seller
   */
  static async createConnectAccount(
    userId: string,
    email: string,
    businessType: 'individual' | 'company' = 'individual'
  ): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
      console.log('🏦 Creating Stripe Connect account for:', { userId, email, businessType });
      
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: email,
        business_type: businessType,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId: userId,
          platform: 'DropDollar'
        }
      });

      console.log('✅ Stripe account created:', account.id);

      // Save account ID to database (with error handling)
      try {
        const { error: dbError } = await supabase
          .from('user_bank_accounts')
          .upsert({
            user_id: userId,
            stripe_account_id: account.id,
            account_type: 'connect',
            bank_name: 'Stripe Connect',
            last_four: '****',
            is_verified: false,
            is_default: true
          });

        if (dbError) {
          console.error('⚠️ Failed to save Connect account to database:', dbError);
          // Continue anyway - the Stripe account was created successfully
        } else {
          console.log('✅ Connect account saved to database');
        }
      } catch (dbError) {
        console.error('⚠️ Database error (continuing anyway):', dbError);
        // Continue - the Stripe account exists even if DB save failed
      }

      return {
        success: true,
        accountId: account.id
      };

    } catch (error: any) {
      console.error('❌ Failed to create Connect account:', error);
      return {
        success: false,
        error: error.message || 'Failed to create Connect account'
      };
    }
  }

  /**
   * Create an account link for onboarding
   */
  static async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return {
        success: true,
        url: accountLink.url
      };

    } catch (error: any) {
      console.error('Failed to create account link:', error);
      return {
        success: false,
        error: error.message || 'Failed to create account link'
      };
    }
  }

  /**
   * Get Connect account details
   */
  static async getConnectAccount(accountId: string): Promise<StripeConnectAccount | null> {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      
      return {
        id: account.id,
        email: account.email || '',
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || []
        }
      };

    } catch (error: any) {
      console.error('Failed to get Connect account:', error);
      return null;
    }
  }

  /**
   * Create a payout to a Connect account
   */
  static async createPayout(
    accountId: string,
    amount: number, // Amount in cents
    currency: string = 'usd',
    description?: string
  ): Promise<{ success: boolean; payoutId?: string; error?: string }> {
    try {
      // Check if account can receive payouts
      const account = await this.getConnectAccount(accountId);
      if (!account || !account.payouts_enabled) {
        return {
          success: false,
          error: 'Account is not enabled for payouts'
        };
      }

      // Create transfer to Connect account
      const transfer = await stripe.transfers.create({
        amount: amount,
        currency: currency,
        destination: accountId,
        description: description || 'DropDollar seller payout',
        metadata: {
          type: 'seller_payout',
          platform: 'DropDollar'
        }
      });

      return {
        success: true,
        payoutId: transfer.id
      };

    } catch (error: any) {
      console.error('Failed to create payout:', error);
      return {
        success: false,
        error: error.message || 'Failed to create payout'
      };
    }
  }

  /**
   * Process seller payout after delivery confirmation
   */
  static async processSellerPayout(
    userId: string,
    escrowId: string,
    amount: number, // Amount in cents
    description?: string
  ): Promise<{ success: boolean; payoutId?: string; error?: string }> {
    try {
      // Get user's Connect account
      const { data: bankAccount, error: dbError } = await supabase
        .from('user_bank_accounts')
        .select('stripe_account_id')
        .eq('user_id', userId)
        .eq('account_type', 'connect')
        .single();

      if (dbError || !bankAccount?.stripe_account_id) {
        return {
          success: false,
          error: 'No Connect account found for user'
        };
      }

      // Create the payout
      const payoutResult = await this.createPayout(
        bankAccount.stripe_account_id,
        amount,
        'usd',
        description
      );

      if (payoutResult.success) {
        // Update escrow transaction
        const { error: updateError } = await supabase
          .from('escrow_transactions')
          .update({
            status: 'released',
            released_at: new Date().toISOString()
          })
          .eq('id', escrowId);

        if (updateError) {
          console.error('Failed to update escrow status:', updateError);
        }

        // Record the payout in seller_payouts table
        const { error: payoutError } = await supabase
          .from('seller_payouts')
          .insert({
            seller_id: userId,
            stripe_transfer_id: payoutResult.payoutId,
            stripe_account_id: bankAccount.stripe_account_id,
            amount: amount / 100, // Convert to dollars
            status: 'completed',
            processed_at: new Date().toISOString()
          });

        if (payoutError) {
          console.error('Failed to record payout:', payoutError);
        }
      }

      return payoutResult;

    } catch (error: any) {
      console.error('Failed to process seller payout:', error);
      return {
        success: false,
        error: error.message || 'Failed to process seller payout'
      };
    }
  }

  /**
   * Get user's Connect account status
   */
  static async getUserConnectStatus(userId: string): Promise<{
    hasAccount: boolean;
    accountId?: string;
    isVerified: boolean;
    canReceivePayouts: boolean;
    onboardingUrl?: string;
  }> {
    try {
      // Get user's Connect account from database
      const { data: bankAccount, error } = await supabase
        .from('user_bank_accounts')
        .select('stripe_account_id, is_verified')
        .eq('user_id', userId)
        .eq('account_type', 'connect')
        .single();

      if (error || !bankAccount) {
        return {
          hasAccount: false,
          isVerified: false,
          canReceivePayouts: false
        };
      }

      // Get account details from Stripe
      const account = await this.getConnectAccount(bankAccount.stripe_account_id);
      
      if (!account) {
        return {
          hasAccount: false,
          isVerified: false,
          canReceivePayouts: false
        };
      }

      let onboardingUrl: string | undefined;

      // If account needs onboarding, create account link
      if (!account.details_submitted || !account.payouts_enabled) {
        const linkResult = await this.createAccountLink(
          account.id,
          `${process.env.NEXT_PUBLIC_BASE_URL}/seller/connect/refresh`,
          `${process.env.NEXT_PUBLIC_BASE_URL}/seller/connect/success`
        );
        
        if (linkResult.success) {
          onboardingUrl = linkResult.url;
        }
      }

      return {
        hasAccount: true,
        accountId: account.id,
        isVerified: account.details_submitted && account.payouts_enabled,
        canReceivePayouts: account.payouts_enabled,
        onboardingUrl
      };

    } catch (error: any) {
      console.error('Failed to get user Connect status:', error);
      return {
        hasAccount: false,
        isVerified: false,
        canReceivePayouts: false
      };
    }
  }

  /**
   * Handle delivery confirmation and trigger payout
   */
  static async confirmDeliveryAndPayout(
    listingId: string,
    buyerId: string,
    sellerId: string,
    trackingNumber?: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Get escrow transaction
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('listing_id', listingId)
        .eq('buyer_id', buyerId)
        .eq('seller_id', sellerId)
        .eq('status', 'held')
        .single();

      if (escrowError || !escrow) {
        return {
          success: false,
          message: 'Escrow transaction not found',
          error: escrowError?.message
        };
      }

      // Confirm delivery
      const { error: confirmError } = await supabase
        .from('escrow_transactions')
        .update({
          delivery_confirmed: true,
          delivery_confirmed_at: new Date().toISOString(),
          delivery_confirmed_by: buyerId,
          tracking_number: trackingNumber
        })
        .eq('id', escrow.id);

      if (confirmError) {
        return {
          success: false,
          message: 'Failed to confirm delivery',
          error: confirmError.message
        };
      }

      // Process seller payout
      const payoutResult = await this.processSellerPayout(
        sellerId,
        escrow.id,
        Math.round(escrow.seller_amount * 100), // Convert to cents
        `Sale payout for listing ${listingId}`
      );

      if (payoutResult.success) {
        return {
          success: true,
          message: `Delivery confirmed and payout of $${escrow.seller_amount.toFixed(2)} processed to seller`
        };
      } else {
        return {
          success: false,
          message: 'Delivery confirmed but payout failed',
          error: payoutResult.error
        };
      }

    } catch (error: any) {
      console.error('Failed to confirm delivery and payout:', error);
      return {
        success: false,
        message: 'Failed to process delivery confirmation',
        error: error.message
      };
    }
  }

  /**
   * Calculate platform fees and seller amount
   */
  static calculatePayoutAmounts(totalAmount: number): {
    platformFee: number;
    sellerAmount: number;
    stripeFee: number;
    netSellerAmount: number;
  } {
    const platformFee = Math.round(totalAmount * 0.12); // 12% platform fee
    const stripeFee = Math.round(totalAmount * 0.029) + 30; // Stripe's fee
    const sellerAmount = totalAmount - platformFee;
    const netSellerAmount = sellerAmount - stripeFee;

    return {
      platformFee,
      sellerAmount,
      stripeFee,
      netSellerAmount: Math.max(0, netSellerAmount)
    };
  }
}

export default StripeConnectService;
