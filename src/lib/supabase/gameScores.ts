import { supabase } from './client';

export interface GameScore {
  id?: string;
  user_id: string;
  game_type: 'multi-target' | 'color-sequence' | 'falling-objects' | 'laser-dodge' | 'quick-click' | 'sword-parry';
  score: number;
  accuracy?: number;
  avg_reaction_time?: number;
  is_practice: boolean;
  created_at?: string;
}

export interface UserBestScore {
  id?: string;
  user_id: string;
  game_type: 'multi-target' | 'color-sequence' | 'falling-objects' | 'laser-dodge' | 'quick-click' | 'sword-parry';
  best_score: number;
  last_score?: number;
  games_played: number;
  created_at?: string;
  updated_at?: string;
}

export class GameScoreService {
  // Save a new game score
  static async saveGameScore(scoreData: Omit<GameScore, 'id' | 'created_at'>): Promise<GameScore | null> {
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .insert([scoreData])
        .select()
        .single();

      if (error) {
        console.error('Error saving game score:', error);
        return null;
      }

      console.log('Game score saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in saveGameScore:', error);
      return null;
    }
  }

  // Get user's best scores for all games
  static async getUserBestScores(userId: string): Promise<UserBestScore[]> {
    try {
      const { data, error } = await supabase
        .from('high_scores')
        .select('*')
        .eq('user_id', userId)
        .order('best_score', { ascending: false });

      if (error) {
        console.error('Error fetching user best scores:', error);
        return [];
      }

      // Map to UserBestScore interface
      return (data || []).map(score => ({
        id: score.id,
        user_id: score.user_id,
        game_type: score.game_type,
        best_score: score.best_score,
        last_score: score.last_score,
        games_played: score.games_played,
        created_at: score.created_at,
        updated_at: score.updated_at
      }));
    } catch (error) {
      console.error('Error in getUserBestScores:', error);
      return [];
    }
  }

  // Get user's best score for a specific game
  static async getUserBestScore(userId: string, gameType: string): Promise<UserBestScore | null> {
    try {
      const { data, error } = await supabase
        .from('high_scores')
        .select('*')
        .eq('user_id', userId)
        .eq('game_type', gameType)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No record found
          return null;
        }
        console.error('Error fetching user best score:', error);
        return null;
      }

      return {
        id: data.id,
        user_id: data.user_id,
        game_type: data.game_type,
        best_score: data.best_score,
        last_score: data.last_score,
        games_played: data.games_played,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error in getUserBestScore:', error);
      return null;
    }
  }

  // Get user's recent game scores
  static async getUserRecentScores(userId: string, limit: number = 10): Promise<GameScore[]> {
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user recent scores:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserRecentScores:', error);
      return [];
    }
  }

  // Get user's scores for a specific game type
  static async getUserGameScores(userId: string, gameType: string, limit: number = 50): Promise<GameScore[]> {
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .eq('user_id', userId)
        .eq('game_type', gameType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user game scores:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserGameScores:', error);
      return [];
    }
  }

  // Get leaderboard for a specific game (top scores)
  static async getGameLeaderboard(gameType: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_best_scores')
        .select(`
          *,
          users:user_id (
            username,
            avatar_url
          )
        `)
        .eq('game_type', gameType)
        .order('best_score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching game leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getGameLeaderboard:', error);
      return [];
    }
  }

  // Get user's rank for a specific game
  static async getUserRank(userId: string, gameType: string): Promise<number | null> {
    try {
      // Get user's best score
      const userBestScore = await this.getUserBestScore(userId, gameType);
      if (!userBestScore) return null;

      // Count how many users have a better score
      const { count, error } = await supabase
        .from('user_best_scores')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', gameType)
        .gt('best_score', userBestScore.best_score);

      if (error) {
        console.error('Error fetching user rank:', error);
        return null;
      }

      return (count || 0) + 1; // Rank is count + 1
    } catch (error) {
      console.error('Error in getUserRank:', error);
      return null;
    }
  }

  // Sync local scores to Supabase (for migration from localStorage)
  static async syncLocalScores(userId: string, localScores: { [gameType: string]: number }): Promise<boolean> {
    try {
      const scoreEntries = Object.entries(localScores).map(([gameType, score]) => ({
        user_id: userId,
        game_type: gameType as 'multi-target' | 'color-sequence' | 'falling-objects',
        score: score,
        accuracy: 0, // Default values for synced scores
        avg_reaction_time: 0,
        game_duration: 60,
        is_practice: true,
        metadata: { synced_from_local: true }
      }));

      const { error } = await supabase
        .from('game_scores')
        .insert(scoreEntries);

      if (error) {
        console.error('Error syncing local scores:', error);
        return false;
      }

      console.log('Local scores synced successfully');
      return true;
    } catch (error) {
      console.error('Error in syncLocalScores:', error);
      return false;
    }
  }
}
