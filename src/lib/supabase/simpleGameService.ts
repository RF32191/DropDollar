import { supabase } from './client';

export interface GameHistoryRecord {
  id: string;
  user_id: string;
  game_type: string;
  score: number;
  accuracy: number;
  avg_reaction_time: number;
  game_duration: number;
  is_practice: boolean;
  is_competition: boolean;
  listing_id?: string;
  entry_number?: number;
  placement?: number;
  prize_won: number;
  tokens_wagered: number;
  tokens_won: number;
  metadata?: any;
  created_at: string;
}

export class SimpleGameService {
  /**
   * Save game history - simple like token transactions
   */
  static async saveGameHistory(gameData: {
    user_id: string;
    game_type: string;
    score: number;
    accuracy: number;
    avg_reaction_time?: number;
    game_duration?: number;
    is_practice: boolean;
    listing_id?: string;
    entry_number?: number;
    placement?: number;
    prize_won?: number;
    tokens_wagered?: number;
    tokens_won?: number;
    metadata?: any;
  }): Promise<GameHistoryRecord | null> {
    try {
      console.log('🎮 [SimpleGameService] Saving game history:', gameData);

      // Use RPC function to bypass RLS issues
      const { data, error } = await supabase.rpc('save_game_history', {
        p_user_id: gameData.user_id,
        p_game_type: gameData.game_type,
        p_score: gameData.score,
        p_accuracy: gameData.accuracy,
        p_avg_reaction_time: gameData.avg_reaction_time || 0,
        p_game_duration: gameData.game_duration || 60,
        p_is_practice: gameData.is_practice,
        p_listing_id: gameData.listing_id,
        p_entry_number: gameData.entry_number,
        p_placement: gameData.placement,
        p_prize_won: gameData.prize_won || 0,
        p_tokens_wagered: gameData.tokens_wagered || 0,
        p_tokens_won: gameData.tokens_won || 0,
        p_metadata: gameData.metadata
      });

      if (error) {
        console.error('❌ [SimpleGameService] Error saving game history:', error);
        return null;
      }

      console.log('✅ [SimpleGameService] Game history saved successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ [SimpleGameService] Exception saving game history:', error);
      return null;
    }
  }

  /**
   * Get user game history - simple like token transactions
   */
  static async getUserGameHistory(userId: string): Promise<GameHistoryRecord[]> {
    try {
      console.log('📜 [SimpleGameService] Fetching game history for user:', userId);
      
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [SimpleGameService] Error fetching game history:', error);
        return [];
      }

      console.log('✅ [SimpleGameService] Game history fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ [SimpleGameService] Exception fetching game history:', error);
      return [];
    }
  }

  /**
   * Get practice games only
   */
  static async getUserPracticeHistory(userId: string): Promise<GameHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', userId)
        .eq('is_practice', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [SimpleGameService] Error fetching practice history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [SimpleGameService] Exception fetching practice history:', error);
      return [];
    }
  }

  /**
   * Get competition games only
   */
  static async getUserCompetitionHistory(userId: string): Promise<GameHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', userId)
        .eq('is_competition', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [SimpleGameService] Error fetching competition history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [SimpleGameService] Exception fetching competition history:', error);
      return [];
    }
  }

  /**
   * Get user stats - calculated from game_history
   */
  static async getUserGameStats(userId: string): Promise<{
    totalGames: number;
    practiceGames: number;
    competitionGames: number;
    totalTokensWagered: number;
    totalTokensWon: number;
    totalPrizeMoney: number;
    averageScore: number;
    bestScore: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ [SimpleGameService] Error fetching stats:', error);
        return {
          totalGames: 0,
          practiceGames: 0,
          competitionGames: 0,
          totalTokensWagered: 0,
          totalTokensWon: 0,
          totalPrizeMoney: 0,
          averageScore: 0,
          bestScore: 0
        };
      }

      const games = data || [];
      const totalGames = games.length;
      const practiceGames = games.filter(g => g.is_practice).length;
      const competitionGames = games.filter(g => g.is_competition).length;
      const totalTokensWagered = games.reduce((sum, g) => sum + (g.tokens_wagered || 0), 0);
      const totalTokensWon = games.reduce((sum, g) => sum + (g.tokens_won || 0), 0);
      const totalPrizeMoney = games.reduce((sum, g) => sum + (g.prize_won || 0), 0);
      const averageScore = totalGames > 0 ? games.reduce((sum, g) => sum + g.score, 0) / totalGames : 0;
      const bestScore = totalGames > 0 ? Math.max(...games.map(g => g.score)) : 0;

      return {
        totalGames,
        practiceGames,
        competitionGames,
        totalTokensWagered,
        totalTokensWon,
        totalPrizeMoney,
        averageScore,
        bestScore
      };
    } catch (error) {
      console.error('❌ [SimpleGameService] Exception calculating stats:', error);
      return {
        totalGames: 0,
        practiceGames: 0,
        competitionGames: 0,
        totalTokensWagered: 0,
        totalTokensWon: 0,
        totalPrizeMoney: 0,
        averageScore: 0,
        bestScore: 0
      };
    }
  }

  /**
   * Get high scores by game type
   */
  static async getUserHighScores(userId: string): Promise<{[gameType: string]: GameHistoryRecord}> {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', userId)
        .order('score', { ascending: false });

      if (error) {
        console.error('❌ [SimpleGameService] Error fetching high scores:', error);
        return {};
      }

      // Group by game type and get best score for each
      const highScores: {[gameType: string]: GameHistoryRecord} = {};
      (data || []).forEach(game => {
        if (!highScores[game.game_type] || game.score > highScores[game.game_type].score) {
          highScores[game.game_type] = game;
        }
      });

      return highScores;
    } catch (error) {
      console.error('❌ [SimpleGameService] Exception fetching high scores:', error);
      return {};
    }
  }
}
