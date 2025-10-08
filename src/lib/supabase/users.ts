import { supabase } from './client';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  date_of_birth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  verification_status: 'unverified' | 'pending' | 'verified';
  account_type: 'buyer' | 'seller' | 'admin';
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface SellerProfile {
  id: string;
  user_id: string;
  business_name?: string;
  business_type?: string;
  tax_id?: string;
  business_address?: any;
  business_phone?: string;
  business_email?: string;
  website_url?: string;
  description?: string;
  verification_documents?: any;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approval_date?: string;
  approved_by?: string;
  rejection_reason?: string;
  rating: number;
  total_sales: number;
  total_revenue: number;
  commission_rate: number;
  payout_method?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class UserService {
  // Get user profile
  static async getUserProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  }

  // Create user profile (called after Supabase auth signup)
  static async createUserProfile(userData: {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    account_type?: 'buyer' | 'seller';
  }): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: userData.id,
          username: userData.username,
          email: userData.email,
          full_name: userData.full_name,
          account_type: userData.account_type || 'buyer',
          verification_status: 'unverified',
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return null;
      }

      console.log('User profile created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      return null;
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return null;
      }

      console.log('User profile updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      return null;
    }
  }

  // Check if username is available
  static async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('users')
        .select('id')
        .eq('username', username);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking username availability:', error);
        return false;
      }

      return data.length === 0;
    } catch (error) {
      console.error('Error in isUsernameAvailable:', error);
      return false;
    }
  }

  // Get seller profile
  static async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No seller profile found
          return null;
        }
        console.error('Error fetching seller profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSellerProfile:', error);
      return null;
    }
  }

  // Create seller profile
  static async createSellerProfile(sellerData: {
    user_id: string;
    business_name?: string;
    business_type?: string;
    business_email?: string;
    description?: string;
  }): Promise<SellerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .insert([{
          user_id: sellerData.user_id,
          business_name: sellerData.business_name,
          business_type: sellerData.business_type,
          business_email: sellerData.business_email,
          description: sellerData.description,
          approval_status: 'pending',
          rating: 0,
          total_sales: 0,
          total_revenue: 0,
          commission_rate: 0.12, // 12% default
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating seller profile:', error);
        return null;
      }

      // Also update user account type to seller
      await this.updateUserProfile(sellerData.user_id, { account_type: 'seller' });

      console.log('Seller profile created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in createSellerProfile:', error);
      return null;
    }
  }

  // Update seller profile
  static async updateSellerProfile(userId: string, updates: Partial<SellerProfile>): Promise<SellerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating seller profile:', error);
        return null;
      }

      console.log('Seller profile updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in updateSellerProfile:', error);
      return null;
    }
  }

  // Get all sellers (for admin)
  static async getAllSellers(status?: string): Promise<SellerProfile[]> {
    try {
      let query = supabase
        .from('seller_profiles')
        .select(`
          *,
          users:user_id (
            username,
            email,
            full_name,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('approval_status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sellers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllSellers:', error);
      return [];
    }
  }

  // Approve seller
  static async approveSeller(sellerId: string, approvedBy: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({
          approval_status: 'approved',
          approval_date: new Date().toISOString(),
          approved_by: approvedBy,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', sellerId);

      if (error) {
        console.error('Error approving seller:', error);
        return false;
      }

      console.log('Seller approved successfully');
      return true;
    } catch (error) {
      console.error('Error in approveSeller:', error);
      return false;
    }
  }

  // Reject seller
  static async rejectSeller(sellerId: string, reason: string, rejectedBy: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason,
          approved_by: rejectedBy,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', sellerId);

      if (error) {
        console.error('Error rejecting seller:', error);
        return false;
      }

      console.log('Seller rejected successfully');
      return true;
    } catch (error) {
      console.error('Error in rejectSeller:', error);
      return false;
    }
  }

  // Update last login
  static async updateLastLogin(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating last login:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateLastLogin:', error);
      return false;
    }
  }

  // Get user stats (for dashboard)
  static async getUserStats(userId: string): Promise<any> {
    try {
      // Get user profile
      const user = await this.getUserProfile(userId);
      if (!user) return null;

      // Get game stats
      const { data: gameStats, error: gameError } = await supabase
        .from('user_best_scores')
        .select('*')
        .eq('user_id', userId);

      // Get wallet info
      const { data: wallet, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get recent transactions
      const { data: transactions, error: transError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        user,
        gameStats: gameStats || [],
        wallet: wallet || null,
        recentTransactions: transactions || []
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return null;
    }
  }
}
