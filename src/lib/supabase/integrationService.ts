import { supabase } from './client';
import TournamentService from './tournamentService';

export interface SupabaseIntegrationStatus {
  isConnected: boolean;
  services: {
    users: boolean;
    tournaments: boolean;
    listings: boolean;
    gameScores: boolean;
    payments: boolean;
    wallets: boolean;
  };
  errors: string[];
}

export class SupabaseIntegrationService {
  // Test Supabase connection
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      return !error;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  // Check if all required tables exist
  static async checkTablesExist(): Promise<{ [key: string]: boolean }> {
    const tables = [
      'users',
      'user_wallets',
      'listings',
      'listing_entries',
      'daily_tournaments',
      'tournament_participants',
      'tournament_game_sessions',
      'tournament_results',
      'hot_sell_tournaments',
      'hot_sell_sessions',
      'user_game_scores',
      'payment_transactions',
      'tournament_payouts',
      'seller_applications'
    ];

    const results: { [key: string]: boolean } = {};

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        results[table] = !error;
      } catch (error) {
        results[table] = false;
      }
    }

    return results;
  }

  // Initialize user wallet when user registers
  static async initializeUserWallet(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_wallets')
        .insert({
          user_id: userId,
          balance: 0.00,
          pending_balance: 0.00,
          total_deposited: 0.00,
          total_withdrawn: 0.00
        });

      return !error;
    } catch (error) {
      console.error('Error initializing user wallet:', error);
      return false;
    }
  }

  // Sync user data with Supabase
  static async syncUserData(userData: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  }): Promise<boolean> {
    try {
      // Insert or update user
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: userData.id,
          username: userData.username,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone_number: userData.phoneNumber,
          updated_at: new Date().toISOString()
        });

      if (userError) {
        console.error('Error syncing user data:', userError);
        return false;
      }

      // Initialize wallet if it doesn't exist
      const { data: walletExists } = await supabase
        .from('user_wallets')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (!walletExists) {
        await this.initializeUserWallet(userData.id);
      }

      return true;
    } catch (error) {
      console.error('Error syncing user data:', error);
      return false;
    }
  }

  // Save game score to Supabase
  static async saveGameScore(
    userId: string,
    gameType: string,
    score: number,
    gameData?: any
  ): Promise<boolean> {
    try {
      // Check if this is a new best score
      const { data: currentBest } = await supabase
        .from('user_game_scores')
        .select('score')
        .eq('user_id', userId)
        .eq('game_type', gameType)
        .eq('is_best_score', true)
        .single();

      const isNewBest = !currentBest || score > currentBest.score;

      // If this is a new best score, update previous best scores
      if (isNewBest && currentBest) {
        await supabase
          .from('user_game_scores')
          .update({ is_best_score: false })
          .eq('user_id', userId)
          .eq('game_type', gameType)
          .eq('is_best_score', true);
      }

      // Insert new score
      const { error } = await supabase
        .from('user_game_scores')
        .insert({
          user_id: userId,
          game_type: gameType,
          score: score,
          is_best_score: isNewBest,
          game_data: gameData,
          played_at: new Date().toISOString()
        });

      return !error;
    } catch (error) {
      console.error('Error saving game score:', error);
      return false;
    }
  }

  // Get user's best scores
  static async getUserBestScores(userId: string): Promise<{ [gameType: string]: number }> {
    try {
      const { data, error } = await supabase
        .from('user_game_scores')
        .select('game_type, score')
        .eq('user_id', userId)
        .eq('is_best_score', true);

      if (error) {
        console.error('Error fetching best scores:', error);
        return {};
      }

      const bestScores: { [gameType: string]: number } = {};
      data?.forEach(score => {
        bestScores[score.game_type] = score.score;
      });

      return bestScores;
    } catch (error) {
      console.error('Error fetching best scores:', error);
      return {};
    }
  }

  // Create listing in Supabase
  static async createListing(listingData: {
    sellerId: string;
    title: string;
    description: string;
    category: string;
    basePrice: number;
    targetPrice: number;
    gameType: string;
    imageUrls?: string[];
    [key: string]: any;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('listings')
        .insert({
          seller_id: listingData.sellerId,
          title: listingData.title,
          description: listingData.description,
          category: listingData.category,
          base_price: listingData.basePrice,
          current_price: listingData.basePrice,
          target_price: listingData.targetPrice,
          game_type: listingData.gameType,
          image_urls: listingData.imageUrls || [],
          status: 'active'
        })
        .select('id')
        .single();

      return data?.id || null;
    } catch (error) {
      console.error('Error creating listing:', error);
      return null;
    }
  }

  // Record listing entry
  static async recordListingEntry(
    listingId: string,
    userId: string,
    score: number,
    gameData?: any
  ): Promise<boolean> {
    try {
      // Get current entry count for this user on this listing
      const { data: entryCount } = await supabase
        .from('listing_entries')
        .select('entry_number')
        .eq('listing_id', listingId)
        .eq('user_id', userId)
        .order('entry_number', { ascending: false })
        .limit(1)
        .single();

      const nextEntryNumber = entryCount ? entryCount.entry_number + 1 : 1;

      // Insert new entry
      const { error } = await supabase
        .from('listing_entries')
        .insert({
          listing_id: listingId,
          user_id: userId,
          entry_number: nextEntryNumber,
          game_score: score,
          game_data: gameData,
          entry_cost: 1.00 // Default $1 per entry
        });

      if (error) {
        console.error('Error recording listing entry:', error);
        return false;
      }

      // Update listing stats
      await supabase.rpc('increment_listing_stats', {
        listing_id: listingId,
        revenue_increment: 1.00
      });

      return true;
    } catch (error) {
      console.error('Error recording listing entry:', error);
      return false;
    }
  }

  // Process payment transaction
  static async processPayment(
    userId: string,
    amount: number,
    transactionType: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: userId,
          transaction_type: transactionType,
          amount: amount,
          currency: 'USD',
          status: 'completed', // In real app, this would be 'pending' initially
          reference_id: referenceId,
          reference_type: referenceType,
          processed_at: new Date().toISOString()
        })
        .select('id')
        .single();

      return data?.id || null;
    } catch (error) {
      console.error('Error processing payment:', error);
      return null;
    }
  }

  // Get comprehensive integration status
  static async getIntegrationStatus(): Promise<SupabaseIntegrationStatus> {
    const status: SupabaseIntegrationStatus = {
      isConnected: false,
      services: {
        users: false,
        tournaments: false,
        listings: false,
        gameScores: false,
        payments: false,
        wallets: false
      },
      errors: []
    };

    try {
      // Test connection
      status.isConnected = await this.testConnection();
      
      if (!status.isConnected) {
        status.errors.push('Cannot connect to Supabase');
        return status;
      }

      // Check tables
      const tables = await this.checkTablesExist();
      
      // Check service availability
      status.services.users = tables.users && tables.user_wallets;
      status.services.tournaments = tables.daily_tournaments && tables.tournament_participants;
      status.services.listings = tables.listings && tables.listing_entries;
      status.services.gameScores = tables.user_game_scores;
      status.services.payments = tables.payment_transactions;
      status.services.wallets = tables.user_wallets;

      // Check for missing tables
      Object.entries(tables).forEach(([table, exists]) => {
        if (!exists) {
          status.errors.push(`Table '${table}' does not exist`);
        }
      });

      // Test tournament service
      try {
        await TournamentService.getActiveTournaments();
      } catch (error) {
        status.services.tournaments = false;
        status.errors.push('Tournament service not working');
      }

    } catch (error) {
      status.errors.push(`Integration check failed: ${error}`);
    }

    return status;
  }

  // Initialize all required data for a new user
  static async initializeNewUser(userData: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  }): Promise<boolean> {
    try {
      // Sync user data
      const userSynced = await this.syncUserData(userData);
      if (!userSynced) {
        throw new Error('Failed to sync user data');
      }

      // Initialize wallet
      const walletInitialized = await this.initializeUserWallet(userData.id);
      if (!walletInitialized) {
        throw new Error('Failed to initialize wallet');
      }

      return true;
    } catch (error) {
      console.error('Error initializing new user:', error);
      return false;
    }
  }

  // Cleanup and maintenance functions
  static async cleanupExpiredTournaments(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('daily_tournaments')
        .update({ status: 'completed' })
        .lt('end_time', new Date().toISOString())
        .eq('status', 'active')
        .select('id');

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up expired tournaments:', error);
      return 0;
    }
  }

  // Generate daily tournaments if needed
  static async ensureDailyTournaments(): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existingTournaments } = await supabase
        .from('daily_tournaments')
        .select('id')
        .gte('start_time', `${today}T00:00:00Z`)
        .lt('start_time', `${today}T23:59:59Z`);

      if (!existingTournaments || existingTournaments.length === 0) {
        await TournamentService.generateDailyTournaments();
        return true;
      }

      return false; // Tournaments already exist
    } catch (error) {
      console.error('Error ensuring daily tournaments:', error);
      return false;
    }
  }
}

export default SupabaseIntegrationService;
