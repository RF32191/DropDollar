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
  totalSpent: number;
  totalEarned: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
  updatedAt: string;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'spend' | 'earn' | 'refund';
  amount: number;
  description: string;
  stripePaymentIntentId?: string;
  relatedListingId?: string;
  relatedGameId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface GameHistory {
  id: string;
  userId: string;
  gameType: string;
  gameName?: string;
  score: number;
  accuracy?: number;
  avgReactionTime?: number;
  gameDuration?: number;
  isPractice: boolean;
  isCompetition: boolean;
  listingId?: string;
  entryNumber?: number;
  placement?: number;
  prizeWon?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PurchaseHistory {
  id: string;
  userId: string;
  purchaseType: string;
  amount: number;
  tokensPurchased?: number;
  tokensSpent?: number;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface UserStatistics {
  userId: string;
  username: string;
  email: string;
  tokens: number;
  balance: number;
  totalSpent: number;
  totalEarned: number;
  gamesPlayed: number;
  gamesWon: number;
  actualGamesPlayed: number;
  actualGamesWon: number;
  averageScore: number;
  bestScore: number;
  totalTokensPurchased: number;
  totalTokensSpent: number;
  totalPurchases: number;
  totalPurchaseAmount: number;
  createdAt: string;
  lastLogin?: string;
}

export class UserService {
  /**
   * Get current user from localStorage
   */
  static getCurrentUser(): { id: string; username: string; firstName: string; lastName: string; email: string } | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const storedUser = localStorage.getItem('user');
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      
      if (storedUser && isLoggedIn) {
        const userData = JSON.parse(storedUser);
        return {
          id: userData.id || userData.sessionId,
          username: userData.username || 'User',
          firstName: userData.firstName || userData.username || 'User',
          lastName: userData.lastName || '',
          email: userData.email || 'user@dropdollar.com'
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ [UserService] Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get or create user profile with full data sync
   */
  static async getOrCreateUser(userData: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<UserProfile> {
    try {
      console.log('🔍 [UserService] Fetching/Creating user:', userData.id);
      
      // First, try to get existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.id)
        .single();

      if (existingUser && !fetchError) {
        console.log('✅ [UserService] Existing user found:', existingUser.id);
        console.log('💰 [UserService] Current tokens:', existingUser.tokens);
        console.log('💵 [UserService] Current balance:', existingUser.balance);
        
        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userData.id);
        
        return {
          id: existingUser.id,
          username: existingUser.username,
          firstName: existingUser.first_name || '',
          lastName: existingUser.last_name || '',
          email: existingUser.email,
          tokens: existingUser.tokens || 0,
          balance: existingUser.balance || 0,
          totalSpent: existingUser.total_spent || 0,
          totalEarned: existingUser.total_earned || 0,
          gamesPlayed: existingUser.games_played || 0,
          gamesWon: existingUser.games_won || 0,
          createdAt: existingUser.created_at,
          updatedAt: existingUser.updated_at || existingUser.created_at
        };
      }

      // Create new user if doesn't exist
      console.log('📝 [UserService] Creating new user in Supabase...');
      const newUser = {
        id: userData.id,
        username: userData.username,
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        role: 'buyer',
        tokens: 0,
        balance: 0,
        total_spent: 0,
        total_earned: 0,
        games_played: 0,
        games_won: 0,
        is_active: true,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (error) {
        console.error('❌ [UserService] Error creating user:', error);
        // Return basic profile even if Supabase fails
        return {
          id: userData.id,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          tokens: 0,
          balance: 0,
          totalSpent: 0,
          totalEarned: 0,
          gamesPlayed: 0,
          gamesWon: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      console.log('✅ [UserService] User created successfully:', data.id);
      return {
        id: data.id,
        username: data.username,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email,
        tokens: data.tokens || 0,
        balance: data.balance || 0,
        totalSpent: data.total_spent || 0,
        totalEarned: data.total_earned || 0,
        gamesPlayed: data.games_played || 0,
        gamesWon: data.games_won || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('❌ [UserService] Exception in getOrCreateUser:', error);
      // Return basic profile even if exception occurs
      return {
        id: userData.id,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        tokens: 0,
        balance: 0,
        totalSpent: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Get user profile by ID with fresh data from Supabase
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log('🔍 [UserService] Fetching user profile for ID:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ [UserService] Error fetching user profile:', error);
        return null;
      }

      if (!data) {
        console.log('⚠️ [UserService] User profile not found for ID:', userId);
        return null;
      }

      console.log('✅ [UserService] User profile fetched:', data.id);
      console.log('💰 [UserService] Current tokens:', data.tokens);
      console.log('💵 [UserService] Current balance:', data.balance);
      
      return {
        id: data.id,
        username: data.username,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email,
        tokens: data.tokens || 0,
        balance: data.balance || 0,
        totalSpent: data.total_spent || 0,
        totalEarned: data.total_earned || 0,
        gamesPlayed: data.games_played || 0,
        gamesWon: data.games_won || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at || data.created_at
      };
    } catch (error) {
      console.error('❌ [UserService] Exception in getUserProfile:', error);
      return null;
    }
  }

  /**
   * Update user tokens in Supabase
   */
  static async updateUserTokens(userId: string, newTokenAmount: number): Promise<boolean> {
    try {
      console.log('💰 [UserService] Updating user tokens:', userId, 'New amount:', newTokenAmount);
      
      const { data, error } = await supabase
        .from('users')
        .update({ 
          tokens: newTokenAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('❌ [UserService] Error updating user tokens:', error);
        return false;
      }

      console.log('✅ [UserService] User tokens updated successfully:', data);
      console.log('💰 [UserService] New token balance:', newTokenAmount);
      return true;
    } catch (error) {
      console.error('❌ [UserService] Exception in updateUserTokens:', error);
      return false;
    }
  }

  /**
   * Update user balance
   */
  static async updateUserBalance(userId: string, newBalance: number): Promise<boolean> {
    try {
      console.log('💵 [UserService] Updating user balance:', userId, 'New amount:', newBalance);
      
      const { data, error } = await supabase
        .from('users')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('❌ [UserService] Error updating user balance:', error);
        return false;
      }

      console.log('✅ [UserService] User balance updated successfully:', data);
      console.log('💵 [UserService] New balance:', newBalance);
      return true;
    } catch (error) {
      console.error('❌ [UserService] Exception in updateUserBalance:', error);
      return false;
    }
  }

  /**
   * Add token transaction and update user tokens
   */
  static async addTokenTransaction(transaction: Omit<TokenTransaction, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      console.log('📝 [UserService] Adding token transaction:', transaction);
      
      // Insert transaction
      const { data, error } = await supabase
        .from('token_transactions')
        .insert([{
          user_id: transaction.userId,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          stripe_payment_intent_id: transaction.stripePaymentIntentId,
          related_listing_id: transaction.relatedListingId,
          related_game_id: transaction.relatedGameId,
          metadata: transaction.metadata,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('❌ [UserService] Error adding token transaction:', error);
        return false;
      }

      console.log('✅ [UserService] Token transaction added successfully:', data);
      
      // Update user's token count
      const userProfile = await this.getUserProfile(transaction.userId);
      if (userProfile) {
        let newTokens = userProfile.tokens;
        if (transaction.type === 'purchase' || transaction.type === 'earn') {
          newTokens += transaction.amount;
        } else if (transaction.type === 'spend') {
          newTokens -= transaction.amount;
        }
        
        await this.updateUserTokens(transaction.userId, newTokens);
      }
      
      return true;
    } catch (error) {
      console.error('❌ [UserService] Exception in addTokenTransaction:', error);
      return false;
    }
  }

  /**
   * Get user token transactions
   */
  static async getUserTokenTransactions(userId: string): Promise<TokenTransaction[]> {
    try {
      console.log('📜 [UserService] Fetching token transactions for user:', userId);
      const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [UserService] Error fetching token transactions:', error);
        return [];
      }

      console.log('✅ [UserService] Token transactions fetched:', data.length);
      return data.map(tx => ({
        id: tx.id,
        userId: tx.user_id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        stripePaymentIntentId: tx.stripe_payment_intent_id,
        relatedListingId: tx.related_listing_id,
        relatedGameId: tx.related_game_id,
        metadata: tx.metadata,
        createdAt: tx.created_at
      }));
    } catch (error) {
      console.error('❌ [UserService] Exception in getUserTokenTransactions:', error);
      return [];
    }
  }

  /**
   * Save game history
   */
  static async saveGameHistory(gameData: Omit<GameHistory, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      console.log('🎮 [UserService] Saving game history:', gameData);
      
      const { data, error } = await supabase
        .from('game_history')
        .insert([{
          user_id: gameData.userId,
          game_type: gameData.gameType,
          game_name: gameData.gameName,
          score: gameData.score,
          accuracy: gameData.accuracy,
          avg_reaction_time: gameData.avgReactionTime,
          game_duration: gameData.gameDuration,
          is_practice: gameData.isPractice,
          is_competition: gameData.isCompetition,
          listing_id: gameData.listingId,
          entry_number: gameData.entryNumber,
          placement: gameData.placement,
          prize_won: gameData.prizeWon,
          metadata: gameData.metadata,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('❌ [UserService] Error saving game history:', error);
        return false;
      }

      console.log('✅ [UserService] Game history saved successfully:', data);
      
      // Update games played count
      const userProfile = await this.getUserProfile(gameData.userId);
      if (userProfile) {
        await supabase
          .from('users')
          .update({ 
            games_played: (userProfile.gamesPlayed || 0) + 1,
            games_won: gameData.placement === 1 ? (userProfile.gamesWon || 0) + 1 : userProfile.gamesWon,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameData.userId);
      }
      
      return true;
    } catch (error) {
      console.error('❌ [UserService] Exception in saveGameHistory:', error);
      return false;
    }
  }

  /**
   * Get user game history
   */
  static async getUserGameHistory(userId: string): Promise<GameHistory[]> {
    try {
      console.log('🎮 [UserService] Fetching game history for user:', userId);
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [UserService] Error fetching game history:', error);
        return [];
      }

      console.log('✅ [UserService] Game history fetched:', data.length);
      return data.map(game => ({
        id: game.id,
        userId: game.user_id,
        gameType: game.game_type,
        gameName: game.game_name,
        score: game.score,
        accuracy: game.accuracy,
        avgReactionTime: game.avg_reaction_time,
        gameDuration: game.game_duration,
        isPractice: game.is_practice,
        isCompetition: game.is_competition,
        listingId: game.listing_id,
        entryNumber: game.entry_number,
        placement: game.placement,
        prizeWon: game.prize_won,
        metadata: game.metadata,
        createdAt: game.created_at
      }));
    } catch (error) {
      console.error('❌ [UserService] Exception in getUserGameHistory:', error);
      return [];
    }
  }

  /**
   * Save purchase history
   */
  static async savePurchaseHistory(purchaseData: Omit<PurchaseHistory, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      console.log('💳 [UserService] Saving purchase history:', purchaseData);
      
      const { data, error } = await supabase
        .from('purchase_history')
        .insert([{
          user_id: purchaseData.userId,
          purchase_type: purchaseData.purchaseType,
          amount: purchaseData.amount,
          tokens_purchased: purchaseData.tokensPurchased,
          tokens_spent: purchaseData.tokensSpent,
          stripe_payment_intent_id: purchaseData.stripePaymentIntentId,
          stripe_charge_id: purchaseData.stripeChargeId,
          status: purchaseData.status,
          description: purchaseData.description,
          metadata: purchaseData.metadata,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('❌ [UserService] Error saving purchase history:', error);
        return false;
      }

      console.log('✅ [UserService] Purchase history saved successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ [UserService] Exception in savePurchaseHistory:', error);
      return false;
    }
  }

  /**
   * Get user purchase history
   */
  static async getUserPurchaseHistory(userId: string): Promise<PurchaseHistory[]> {
    try {
      console.log('💳 [UserService] Fetching purchase history for user:', userId);
      const { data, error } = await supabase
        .from('purchase_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [UserService] Error fetching purchase history:', error);
        return [];
      }

      console.log('✅ [UserService] Purchase history fetched:', data.length);
      return data.map(purchase => ({
        id: purchase.id,
        userId: purchase.user_id,
        purchaseType: purchase.purchase_type,
        amount: purchase.amount,
        tokensPurchased: purchase.tokens_purchased,
        tokensSpent: purchase.tokens_spent,
        stripePaymentIntentId: purchase.stripe_payment_intent_id,
        stripeChargeId: purchase.stripe_charge_id,
        status: purchase.status,
        description: purchase.description,
        metadata: purchase.metadata,
        createdAt: purchase.created_at
      }));
    } catch (error) {
      console.error('❌ [UserService] Exception in getUserPurchaseHistory:', error);
      return [];
    }
  }

  /**
   * Get user statistics (aggregated data from view)
   */
  static async getUserStatistics(userId: string): Promise<UserStatistics | null> {
    try {
      console.log('📊 [UserService] Fetching user statistics for:', userId);
      const { data, error } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ [UserService] Error fetching user statistics:', error);
        return null;
      }

      console.log('✅ [UserService] User statistics fetched:', data);
      return {
        userId: data.user_id,
        username: data.username,
        email: data.email,
        tokens: data.tokens || 0,
        balance: data.balance || 0,
        totalSpent: data.total_spent || 0,
        totalEarned: data.total_earned || 0,
        gamesPlayed: data.games_played || 0,
        gamesWon: data.games_won || 0,
        actualGamesPlayed: data.actual_games_played || 0,
        actualGamesWon: data.actual_games_won || 0,
        averageScore: data.average_score || 0,
        bestScore: data.best_score || 0,
        totalTokensPurchased: data.total_tokens_purchased || 0,
        totalTokensSpent: data.total_tokens_spent || 0,
        totalPurchases: data.total_purchases || 0,
        totalPurchaseAmount: data.total_purchase_amount || 0,
        createdAt: data.created_at,
        lastLogin: data.last_login
      };
    } catch (error) {
      console.error('❌ [UserService] Exception in getUserStatistics:', error);
      return null;
    }
  }
}

export default UserService;
