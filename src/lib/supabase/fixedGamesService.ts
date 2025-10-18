import { supabase } from './client';

export interface WinnerRecord {
  id: string;
  user_id: string;
  tournament_type: string;
  tournament_id: string;
  prize_amount: number;
  prize_type: 'cash' | 'tokens' | 'physical';
  placement: number;
  won_at: string;
  created_at: string;
}

export interface FixedGameConfig {
  id: string;
  game_type: string;
  tournament_type: 'hot_sell' | '1v1' | 'group_battle' | 'scheduled_game';
  title: string;
  description?: string;
  entry_fee: number;
  prize_pool: number;
  max_participants: number;
  game_duration: number;
  rng_seed: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActiveFixedGame {
  id: string;
  config_id: string;
  tournament_type: string;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface HotSellSession {
  id: string;
  config_id: string;
  game_id?: string;
  current_pot: number;
  target_pot: number;
  participants_count: number;
  status: 'waiting' | 'hot_sell' | 'active' | 'completed';
  started_at: string;
  hot_sell_started_at?: string;
  expires_at: string;
  created_at: string;
}

export interface FixedGameParticipant {
  id: string;
  game_id: string;
  user_id: string;
  entry_fee_paid: number;
  score?: number;
  accuracy?: number;
  placement?: number;
  prize_won: number;
  joined_at: string;
  updated_at: string;
}

export interface PrizeEligibility {
  eligible: boolean;
  reason: string;
  last_cash_win?: string;
  months_since_last_win?: number;
}

export class FixedGamesService {
  /**
   * Check if user is eligible for a cash prize
   */
  static async checkPrizeEligibility(userId: string, prizeAmount: number): Promise<PrizeEligibility> {
    try {
      const { data, error } = await supabase.rpc('check_prize_eligibility', {
        p_user_id: userId,
        p_prize_amount: prizeAmount
      });

      if (error) {
        console.error('❌ [FixedGames] Error checking prize eligibility:', error);
        return { eligible: false, reason: 'Error checking eligibility' };
      }

      return data as PrizeEligibility;
    } catch (error) {
      console.error('❌ [FixedGames] Exception checking prize eligibility:', error);
      return { eligible: false, reason: 'Exception occurred' };
    }
  }

  /**
   * Record a winner
   */
  static async recordWinner(
    userId: string,
    tournamentType: string,
    tournamentId: string,
    prizeAmount: number,
    prizeType: 'cash' | 'tokens' | 'physical',
    placement: number
  ): Promise<WinnerRecord | null> {
    try {
      const { data, error } = await supabase.rpc('record_winner', {
        p_user_id: userId,
        p_tournament_type: tournamentType,
        p_tournament_id: tournamentId,
        p_prize_amount: prizeAmount,
        p_prize_type: prizeType,
        p_placement: placement
      });

      if (error) {
        console.error('❌ [FixedGames] Error recording winner:', error);
        return null;
      }

      console.log('✅ [FixedGames] Winner recorded:', data);
      return data as WinnerRecord;
    } catch (error) {
      console.error('❌ [FixedGames] Exception recording winner:', error);
      return null;
    }
  }

  /**
   * Create a fixed game
   */
  static async createFixedGame(gameData: {
    gameType: string;
    tournamentType: string;
    title: string;
    description?: string;
    entryFee: number;
    prizePool: number;
    maxParticipants: number;
    gameDuration: number;
    rngSeed: number;
  }): Promise<{ config: FixedGameConfig; game: ActiveFixedGame } | null> {
    try {
      const { data, error } = await supabase.rpc('create_fixed_game', {
        p_game_type: gameData.gameType,
        p_tournament_type: gameData.tournamentType,
        p_title: gameData.title,
        p_description: gameData.description || '',
        p_entry_fee: gameData.entryFee,
        p_prize_pool: gameData.prizePool,
        p_max_participants: gameData.maxParticipants,
        p_game_duration: gameData.gameDuration,
        p_rng_seed: gameData.rngSeed
      });

      if (error) {
        console.error('❌ [FixedGames] Error creating fixed game:', error);
        return null;
      }

      console.log('✅ [FixedGames] Fixed game created:', data);
      return data as { config: FixedGameConfig; game: ActiveFixedGame };
    } catch (error) {
      console.error('❌ [FixedGames] Exception creating fixed game:', error);
      return null;
    }
  }

  /**
   * Join a fixed game
   */
  static async joinFixedGame(
    gameId: string,
    userId: string,
    entryFee: number
  ): Promise<FixedGameParticipant | null> {
    try {
      const { data, error } = await supabase.rpc('join_fixed_game', {
        p_game_id: gameId,
        p_user_id: userId,
        p_entry_fee: entryFee
      });

      if (error) {
        console.error('❌ [FixedGames] Error joining fixed game:', error);
        return null;
      }

      console.log('✅ [FixedGames] Joined fixed game:', data);
      return data as FixedGameParticipant;
    } catch (error) {
      console.error('❌ [FixedGames] Exception joining fixed game:', error);
      return null;
    }
  }

  /**
   * Update fixed game score
   */
  static async updateFixedGameScore(
    gameId: string,
    userId: string,
    score: number,
    accuracy: number
  ): Promise<FixedGameParticipant | null> {
    try {
      const { data, error } = await supabase.rpc('update_fixed_game_score', {
        p_game_id: gameId,
        p_user_id: userId,
        p_score: score,
        p_accuracy: accuracy
      });

      if (error) {
        console.error('❌ [FixedGames] Error updating score:', error);
        return null;
      }

      console.log('✅ [FixedGames] Score updated:', data);
      return data as FixedGameParticipant;
    } catch (error) {
      console.error('❌ [FixedGames] Exception updating score:', error);
      return null;
    }
  }

  /**
   * Get active fixed games
   */
  static async getActiveFixedGames(tournamentType?: string): Promise<ActiveFixedGame[]> {
    try {
      let query = supabase
        .from('active_fixed_games')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: true });

      if (tournamentType) {
        query = query.eq('tournament_type', tournamentType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [FixedGames] Error fetching active games:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [FixedGames] Exception fetching active games:', error);
      return [];
    }
  }

  /**
   * Get fixed game configs
   */
  static async getFixedGameConfigs(tournamentType?: string): Promise<FixedGameConfig[]> {
    try {
      let query = supabase
        .from('fixed_games_config')
        .select('*')
        .eq('is_active', true)
        .order('prize_pool', { ascending: true });

      if (tournamentType) {
        query = query.eq('tournament_type', tournamentType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [FixedGames] Error fetching game configs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [FixedGames] Exception fetching game configs:', error);
      return [];
    }
  }

  /**
   * Get fixed game participants
   */
  static async getFixedGameParticipants(gameId: string): Promise<FixedGameParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('fixed_game_participants')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('❌ [FixedGames] Error fetching participants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [FixedGames] Exception fetching participants:', error);
      return [];
    }
  }

  /**
   * Get user's winner history
   */
  static async getUserWinnerHistory(userId: string): Promise<WinnerRecord[]> {
    try {
      const { data, error } = await supabase
        .from('winner_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('won_at', { ascending: false });

      if (error) {
        console.error('❌ [FixedGames] Error fetching winner history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [FixedGames] Exception fetching winner history:', error);
      return [];
    }
  }

  /**
   * Get user's last significant cash prize win
   */
  static async getUserLastCashWin(userId: string): Promise<WinnerRecord | null> {
    try {
      const { data, error } = await supabase
        .from('winner_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('prize_type', 'cash')
        .gte('prize_amount', 100)
        .order('won_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ [FixedGames] Error fetching last cash win:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ [FixedGames] Exception fetching last cash win:', error);
      return null;
    }
  }

  /**
   * Calculate prize distribution for fixed games
   */
  static calculatePrizeDistribution(prizePool: number, tournamentType: string): { [key: string]: number } {
    const feeRate = 0.15; // 15% fee
    const netPrizePool = prizePool * (1 - feeRate);
    
    if (tournamentType === '1v1') {
      return {
        "1st": netPrizePool * 0.7, // Winner gets 70%
        "2nd": netPrizePool * 0.3  // Runner-up gets 30%
      };
    } else {
      return {
        "1st": netPrizePool * 0.5,
        "2nd": netPrizePool * 0.3,
        "3rd": netPrizePool * 0.2
      };
    }
  }

  /**
   * Format prize amounts for display
   */
  static formatPrizeAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get hot sell sessions
   */
  static async getHotSellSessions(): Promise<HotSellSession[]> {
    try {
      const { data, error } = await supabase
        .from('hot_sell_sessions')
        .select('*')
        .in('status', ['waiting', 'hot_sell'])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [FixedGames] Error fetching hot sell sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [FixedGames] Exception fetching hot sell sessions:', error);
      return [];
    }
  }

  /**
   * Create hot sell session
   */
  static async createHotSellSession(configId: string): Promise<HotSellSession | null> {
    try {
      const { data, error } = await supabase.rpc('create_hot_sell_session', {
        p_config_id: configId
      });

      if (error) {
        console.error('❌ [FixedGames] Error creating hot sell session:', error);
        return null;
      }

      console.log('✅ [FixedGames] Hot sell session created:', data);
      return data as HotSellSession;
    } catch (error) {
      console.error('❌ [FixedGames] Exception creating hot sell session:', error);
      return null;
    }
  }

  /**
   * Join hot sell session
   */
  static async joinHotSellSession(
    sessionId: string,
    userId: string,
    entryFee: number
  ): Promise<FixedGameParticipant | null> {
    try {
      const { data, error } = await supabase.rpc('join_hot_sell_session', {
        p_session_id: sessionId,
        p_user_id: userId,
        p_entry_fee: entryFee
      });

      if (error) {
        console.error('❌ [FixedGames] Error joining hot sell session:', error);
        return null;
      }

      console.log('✅ [FixedGames] Joined hot sell session:', data);
      return data as FixedGameParticipant;
    } catch (error) {
      console.error('❌ [FixedGames] Exception joining hot sell session:', error);
      return null;
    }
  }

  /**
   * Update hot sell pot (check timer)
   */
  static async updateHotSellPot(sessionId: string): Promise<HotSellSession | null> {
    try {
      const { data, error } = await supabase.rpc('update_hot_sell_pot', {
        p_session_id: sessionId
      });

      if (error) {
        console.error('❌ [FixedGames] Error updating hot sell pot:', error);
        return null;
      }

      return data as HotSellSession;
    } catch (error) {
      console.error('❌ [FixedGames] Exception updating hot sell pot:', error);
      return null;
    }
  }

  /**
   * Get time remaining until hot sell mode
   */
  static getTimeUntilHotSell(expiresAt: string): { minutes: number; seconds: number; isHotSell: boolean } {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { minutes: 0, seconds: 0, isHotSell: true };
    }
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return { minutes, seconds, isHotSell: false };
  }

  /**
   * Format time remaining
   */
  static formatTimeRemaining(minutes: number, seconds: number): string {
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Check if user can create a game (admin function)
   */
  static async canCreateGame(userId: string): Promise<boolean> {
    // Original system doesn't allow custom creation
    return false;
  }
}

export default FixedGamesService;
