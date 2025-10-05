import { supabase } from './client';

export interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  tokens: number;
  total_spent: number;
  total_earned: number;
  last_transaction_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id?: string;
  user_id: string;
  wallet_id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'purchase' | 'earning' | 'refund' | 'fee';
  amount: number;
  currency: string;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method?: string;
  external_transaction_id?: string;
  metadata?: any;
  created_at?: string;
}

export class WalletService {
  // Get user's wallet
  static async getUserWallet(userId: string): Promise<UserWallet | null> {
    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No wallet found, create one
          return await this.createUserWallet(userId);
        }
        console.error('Error fetching user wallet:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserWallet:', error);
      return null;
    }
  }

  // Create a new wallet for user
  static async createUserWallet(userId: string): Promise<UserWallet | null> {
    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .insert([{
          user_id: userId,
          balance: 0.00,
          tokens: 0.00,
          total_spent: 0.00,
          total_earned: 0.00
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating user wallet:', error);
        return null;
      }

      console.log('User wallet created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in createUserWallet:', error);
      return null;
    }
  }

  // Add funds to wallet
  static async addFunds(userId: string, amount: number, paymentMethod: string, externalTransactionId?: string): Promise<WalletTransaction | null> {
    try {
      // Get user's wallet
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        console.error('User wallet not found');
        return null;
      }

      // Create transaction record
      const transactionData: Omit<WalletTransaction, 'id' | 'created_at'> = {
        user_id: userId,
        wallet_id: wallet.id,
        transaction_type: 'deposit',
        amount: amount,
        currency: 'USD',
        description: `Funds added via ${paymentMethod}`,
        status: 'completed',
        payment_method: paymentMethod,
        external_transaction_id: externalTransactionId,
        metadata: { source: 'wallet_deposit' }
      };

      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) {
        console.error('Error adding funds:', error);
        return null;
      }

      console.log('Funds added successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in addFunds:', error);
      return null;
    }
  }

  // Deduct funds from wallet (for purchases)
  static async deductFunds(userId: string, amount: number, description: string, referenceId?: string, referenceType?: string): Promise<WalletTransaction | null> {
    try {
      // Get user's wallet
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        console.error('User wallet not found');
        return null;
      }

      // Check if user has sufficient balance
      if (wallet.balance < amount) {
        console.error('Insufficient balance');
        return null;
      }

      // Create transaction record
      const transactionData: Omit<WalletTransaction, 'id' | 'created_at'> = {
        user_id: userId,
        wallet_id: wallet.id,
        transaction_type: 'purchase',
        amount: amount,
        currency: 'USD',
        description: description,
        reference_id: referenceId,
        reference_type: referenceType,
        status: 'completed',
        payment_method: 'internal',
        metadata: { source: 'wallet_purchase' }
      };

      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) {
        console.error('Error deducting funds:', error);
        return null;
      }

      console.log('Funds deducted successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in deductFunds:', error);
      return null;
    }
  }

  // Add earnings to wallet (for sellers)
  static async addEarnings(userId: string, amount: number, description: string, referenceId?: string, referenceType?: string): Promise<WalletTransaction | null> {
    try {
      // Get user's wallet
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        console.error('User wallet not found');
        return null;
      }

      // Create transaction record
      const transactionData: Omit<WalletTransaction, 'id' | 'created_at'> = {
        user_id: userId,
        wallet_id: wallet.id,
        transaction_type: 'earning',
        amount: amount,
        currency: 'USD',
        description: description,
        reference_id: referenceId,
        reference_type: referenceType,
        status: 'completed',
        payment_method: 'internal',
        metadata: { source: 'seller_earning' }
      };

      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) {
        console.error('Error adding earnings:', error);
        return null;
      }

      console.log('Earnings added successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in addEarnings:', error);
      return null;
    }
  }

  // Get user's transaction history
  static async getUserTransactions(userId: string, limit: number = 50): Promise<WalletTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserTransactions:', error);
      return [];
    }
  }

  // Get wallet balance
  static async getWalletBalance(userId: string): Promise<number> {
    try {
      const wallet = await this.getUserWallet(userId);
      return wallet?.balance || 0;
    } catch (error) {
      console.error('Error in getWalletBalance:', error);
      return 0;
    }
  }

  // Process game entry payment
  static async processGameEntry(userId: string, listingId: string, entryFee: number): Promise<WalletTransaction | null> {
    try {
      return await this.deductFunds(
        userId,
        entryFee,
        `Game entry for listing ${listingId}`,
        listingId,
        'listing_entry'
      );
    } catch (error) {
      console.error('Error in processGameEntry:', error);
      return null;
    }
  }

  // Process tournament entry payment
  static async processTournamentEntry(userId: string, tournamentType: string, entryFee: number): Promise<WalletTransaction | null> {
    try {
      return await this.deductFunds(
        userId,
        entryFee,
        `Tournament entry: ${tournamentType}`,
        undefined,
        'tournament_entry'
      );
    } catch (error) {
      console.error('Error in processTournamentEntry:', error);
      return null;
    }
  }

  // Process seller payout
  static async processSellerPayout(sellerId: string, amount: number, listingId: string): Promise<WalletTransaction | null> {
    try {
      // Calculate platform fee (12%)
      const platformFee = amount * 0.12;
      const sellerEarnings = amount - platformFee;

      // Add earnings to seller's wallet
      const transaction = await this.addEarnings(
        sellerId,
        sellerEarnings,
        `Sale payout for listing ${listingId} (${amount} - 12% fee)`,
        listingId,
        'listing_sale'
      );

      // TODO: Record platform fee separately if needed
      console.log(`Seller payout processed: $${sellerEarnings} (after $${platformFee} platform fee)`);
      
      return transaction;
    } catch (error) {
      console.error('Error in processSellerPayout:', error);
      return null;
    }
  }

  // Refund transaction
  static async refundTransaction(originalTransactionId: string, reason: string): Promise<WalletTransaction | null> {
    try {
      // Get original transaction
      const { data: originalTransaction, error: fetchError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('id', originalTransactionId)
        .single();

      if (fetchError || !originalTransaction) {
        console.error('Original transaction not found:', fetchError);
        return null;
      }

      // Create refund transaction
      const refundData: Omit<WalletTransaction, 'id' | 'created_at'> = {
        user_id: originalTransaction.user_id,
        wallet_id: originalTransaction.wallet_id,
        transaction_type: 'refund',
        amount: originalTransaction.amount,
        currency: originalTransaction.currency,
        description: `Refund: ${reason}`,
        reference_id: originalTransaction.reference_id,
        reference_type: originalTransaction.reference_type,
        status: 'completed',
        payment_method: 'internal',
        metadata: { 
          original_transaction_id: originalTransactionId,
          refund_reason: reason 
        }
      };

      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert([refundData])
        .select()
        .single();

      if (error) {
        console.error('Error processing refund:', error);
        return null;
      }

      console.log('Refund processed successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in refundTransaction:', error);
      return null;
    }
  }
}
