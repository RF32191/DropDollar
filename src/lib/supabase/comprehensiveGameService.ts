import { supabase } from './client';

export interface GameHistoryRecord {
  id: string;
  game_type: string;
  score: number;
  accuracy: number;
  avg_reaction_time?: number;
  is_practice: boolean;
  listing_id?: string;
  entry_number?: number;
  match_id?: string;
  opponent_id?: string;
  tournament_id?: string;
  entry_fee?: number;
  tokens_wagered?: number;
  tokens_won?: number;
  game_duration?: number;
  difficulty_level?: number;
  created_at: string;
}

export interface PracticeGameRecord {
  id: string;
  game_type: string;
  score: number;
  accuracy: number;
  avg_reaction_time?: number;
  game_duration?: number;
  difficulty_level?: number;
  attempts_count?: number;
  improvement_percentage?: number;
  best_score_session?: boolean;
  created_at: string;
}

export interface CompetitionGameRecord {
  id: string;
  game_type: string;
  score: number;
  accuracy: number;
  avg_reaction_time?: number;
  listing_id: string;
  entry_number: number;
  entry_fee: number;
  tokens_wagered: number;
  tokens_won?: number;
  match_id?: string;
  opponent_id?: string;
  tournament_id?: string;
  rank_position?: number;
  prize_amount?: number;
  competition_status: string;
  created_at: string;
}

export interface UserGameStats {
  game_type: string;
  total_games_played: number;
  practice_games_played: number;
  competition_games_played: number;
  best_score: number;
  best_accuracy: number;
  best_reaction_time?: number;
  average_score: number;
  total_tokens_wagered: number;
  total_tokens_won: number;
  total_prize_money: number;
  win_rate: number;
  last_played_at: string;
}

export interface HighScoreRecord {
  game_type: string;
  best_score: number;
  best_accuracy?: number;
  best_reaction_time?: number;
  last_score?: number;
  last_accuracy?: number;
  games_played: number;
  practice_games: number;
  competition_games: number;
}

export class ComprehensiveGameService {
  /**
   * Get complete game history for a user
   */
  static async getUserGameHistory(userId: string): Promise<GameHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_game_history', { user_uuid: userId });

      if (error) {
        console.error('Error fetching game history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserGameHistory:', error);
      return [];
    }
  }

  /**
   * Get practice games history for a user
   */
  static async getUserPracticeHistory(userId: string): Promise<PracticeGameRecord[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_practice_history', { user_uuid: userId });

      if (error) {
        console.error('Error fetching practice history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserPracticeHistory:', error);
      return [];
    }
  }

  /**
   * Get competition games history for a user
   */
  static async getUserCompetitionHistory(userId: string): Promise<CompetitionGameRecord[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_competition_history', { user_uuid: userId });

      if (error) {
        console.error('Error fetching competition history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserCompetitionHistory:', error);
      return [];
    }
  }

  /**
   * Get comprehensive game statistics for a user
   */
  static async getUserGameStatistics(userId: string): Promise<UserGameStats[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_game_statistics', { user_uuid: userId });

      if (error) {
        console.error('Error fetching game statistics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserGameStatistics:', error);
      return [];
    }
  }

  /**
   * Get high scores for a user
   */
  static async getUserHighScores(userId: string): Promise<HighScoreRecord[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_high_scores', { user_uuid: userId });

      if (error) {
        console.error('Error fetching high scores:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserHighScores:', error);
      return [];
    }
  }

  /**
   * Get recent games (last 10) for a user
   */
  static async getUserRecentGames(userId: string, limit: number = 10): Promise<GameHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent games:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserRecentGames:', error);
      return [];
    }
  }

  /**
   * Get practice games for a specific game type
   */
  static async getUserPracticeGamesByType(userId: string, gameType: string): Promise<PracticeGameRecord[]> {
    try {
      const { data, error } = await supabase
        .from('practice_games')
        .select('*')
        .eq('user_id', userId)
        .eq('game_type', gameType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching practice games by type:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserPracticeGamesByType:', error);
      return [];
    }
  }

  /**
   * Get competition games for a specific listing
   */
  static async getUserCompetitionGamesByListing(userId: string, listingId: string): Promise<CompetitionGameRecord[]> {
    try {
      const { data, error } = await supabase
        .from('competition_games')
        .select('*')
        .eq('user_id', userId)
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching competition games by listing:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserCompetitionGamesByListing:', error);
      return [];
    }
  }

  /**
   * Get game statistics for a specific game type
   */
  static async getUserGameStatsByType(userId: string, gameType: string): Promise<UserGameStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_game_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('game_type', gameType)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No record found
        }
        console.error('Error fetching game stats by type:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserGameStatsByType:', error);
      return null;
    }
  }

  /**
   * Get dashboard summary for a user
   */
  static async getUserDashboardSummary(userId: string) {
    try {
      const [
        gameHistory,
        practiceHistory,
        competitionHistory,
        gameStats,
        highScores,
        recentGames
      ] = await Promise.all([
        this.getUserGameHistory(userId),
        this.getUserPracticeHistory(userId),
        this.getUserCompetitionHistory(userId),
        this.getUserGameStatistics(userId),
        this.getUserHighScores(userId),
        this.getUserRecentGames(userId, 5)
      ]);

      return {
        totalGames: gameHistory.length,
        practiceGames: practiceHistory.length,
        competitionGames: competitionHistory.length,
        gameStats,
        highScores,
        recentGames,
        lastPlayed: recentGames[0]?.created_at || null
      };
    } catch (error) {
      console.error('Error in getUserDashboardSummary:', error);
      return {
        totalGames: 0,
        practiceGames: 0,
        competitionGames: 0,
        gameStats: [],
        highScores: [],
        recentGames: [],
        lastPlayed: null
      };
    }
  }
}
