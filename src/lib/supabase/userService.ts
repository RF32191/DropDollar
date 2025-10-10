import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  tokens: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'spend' | 'earn' | 'refund';
  amount: number;
  description: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stripeAccountId?: string;
  payoutId?: string;
  requestedAt: string;
  completedAt?: string;
}

export class UserService {
  /**
   * Get or create user profile
   */
  static async getOrCreateUser(userData: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<UserProfile> {
    try {
      // First, try to get existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userData.id)
        .single();

      if (existingUser && !fetchError) {
        return existingUser;
      }

      // Create new user if doesn't exist
      const newUser: UserProfile = {
        id: userData.id,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        tokens: 0,
        balance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([newUser])
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        // Return the user data even if Supabase fails
        return newUser;
      }

      return data;
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      // Return basic user data if Supabase is unavailable
      return {
        id: userData.id,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        tokens: 0,
        balance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Update user tokens
   */
  static async updateUserTokens(userId: string, newTokenAmount: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          tokens: newTokenAmount,
          updatedAt: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user tokens:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserTokens:', error);
      return false;
    }
  }

  /**
   * Update user balance
   */
  static async updateUserBalance(userId: string, newBalance: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          balance: newBalance,
          updatedAt: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user balance:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserBalance:', error);
      return false;
    }
  }

  /**
   * Add token transaction
   */
  static async addTokenTransaction(transaction: Omit<TokenTransaction, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('token_transactions')
        .insert([{
          ...transaction,
          createdAt: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error adding token transaction:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addTokenTransaction:', error);
      return false;
    }
  }

  /**
   * Get user token transactions
   */
  static async getUserTokenTransactions(userId: string): Promise<TokenTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error getting token transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserTokenTransactions:', error);
      return [];
    }
  }

  /**
   * Add withdrawal request
   */
  static async addWithdrawalRequest(withdrawal: Omit<WithdrawalRequest, 'id' | 'requestedAt'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert([{
          ...withdrawal,
          requestedAt: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error adding withdrawal request:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addWithdrawalRequest:', error);
      return false;
    }
  }

  /**
   * Get user withdrawal requests
   */
  static async getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('userId', userId)
        .order('requestedAt', { ascending: false });

      if (error) {
        console.error('Error getting withdrawal requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserWithdrawalRequests:', error);
      return [];
    }
  }

  /**
   * Get current user from localStorage/cookies
   */
  static getCurrentUser(): {id: string, username: string, firstName: string, lastName: string, email: string} | null {
    try {
      // First try localStorage
      let userData = localStorage.getItem('user');
      
      // If not in localStorage, try cookies
      if (!userData) {
        const cookies = document.cookie.split(';');
        const userCookie = cookies.find(cookie => cookie.trim().startsWith('dropdollar_user='));
        if (userCookie) {
          const cookieValue = userCookie.split('=')[1];
          userData = decodeURIComponent(cookieValue);
          
          // Restore to localStorage for faster access
          localStorage.setItem('user', userData);
          localStorage.setItem('isLoggedIn', 'true');
        }
      }
      
      if (userData) {
        const parsedUser = JSON.parse(userData);
        return {
          id: parsedUser.id || parsedUser.username || 'user_' + Date.now(),
          username: parsedUser.username || parsedUser.firstName || 'User',
          firstName: parsedUser.firstName || 'User',
          lastName: parsedUser.lastName || '',
          email: parsedUser.email || 'user@dropdollar.com'
        };
      }
      
      // Check if there's a simple login session
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      if (isLoggedIn === 'true') {
        return {
          id: 'guest_' + Date.now(),
          username: 'User',
          firstName: 'User',
          lastName: '',
          email: 'guest@dropdollar.com'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}
