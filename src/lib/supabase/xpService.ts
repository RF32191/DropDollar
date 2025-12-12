import { supabase } from './client';

export interface UserXPData {
  total_xp: number;
  current_level: number;
  xp_to_next_level: number;
  reward_points: number;
  rank_title: string;
  rank_tier: number;
  rank_image_url: string | null;
}

export interface DailyChallenge {
  challenge_id: string;
  challenge_name: string;
  challenge_description: string;
  challenge_type: string;
  target_value: number;
  progress: number;
  xp_reward: number;
  reward_points: number;
  is_completed: boolean;
}

export interface WeeklyChallenge {
  challenge_id: string;
  challenge_name: string;
  challenge_description: string;
  challenge_type: string;
  target_value: number;
  progress: number;
  xp_reward: number;
  reward_points: number;
  is_completed: boolean;
  week_start_date: string;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  xp_amount: number;
  transaction_type: string;
  source_id: string | null;
  description: string | null;
  created_at: string;
}

export class XPService {
  /**
   * Get user's XP and level data
   */
  static async getUserXP(userId: string): Promise<UserXPData | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_xp', {
        p_user_id: userId
      });

      if (error) {
        // If function doesn't exist or user has no XP record, return defaults
        // This ensures new users always have XP data
        if (error.code === '42883' || error.message?.includes('does not exist')) {
          console.warn('⚠️ [XPService] XP function not available, returning defaults');
        } else {
          console.error('❌ [XPService] Error fetching user XP:', error);
        }
        
        // Return defaults for new users or if system not set up yet
        return {
          total_xp: 0,
          current_level: 1,
          xp_to_next_level: 100,
          reward_points: 0,
          rank_title: 'Novice',
          rank_tier: 1,
          rank_image_url: null
        };
      }

      if (!data || data.length === 0) {
        // User doesn't have XP record yet, return defaults
        return {
          total_xp: 0,
          current_level: 1,
          xp_to_next_level: 100,
          reward_points: 0,
          rank_title: 'Novice',
          rank_tier: 1,
          rank_image_url: null
        };
      }

      return data[0];
    } catch (error) {
      console.error('❌ [XPService] Exception fetching user XP:', error);
      // Always return defaults on error to prevent crashes
      return {
        total_xp: 0,
        current_level: 1,
        xp_to_next_level: 100,
        reward_points: 0,
        rank_title: 'Novice',
        rank_tier: 1,
        rank_image_url: null
      };
    }
  }

  /**
   * Award XP for practice game (5 XP)
   */
  static async awardPracticeGameXP(
    userId: string,
    gameHistoryId: string,
    score: number = 0
  ): Promise<{ success: boolean; leveled_up?: boolean; new_level?: number } | null> {
    try {
      const { data, error } = await supabase.rpc('award_practice_game_xp', {
        p_user_id: userId,
        p_game_history_id: gameHistoryId,
        p_score: Math.floor(score)
      });

      if (error) {
        console.error('❌ [XPService] Error awarding practice game XP:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ [XPService] Exception awarding practice game XP:', error);
      return null;
    }
  }

  /**
   * Award XP for competition game (10 XP) - 1v1, WTA, Hot Sell, etc.
   */
  static async awardCompetitionGameXP(
    userId: string,
    gameHistoryId: string,
    score: number = 0
  ): Promise<{ success: boolean; leveled_up?: boolean; new_level?: number } | null> {
    try {
      const { data, error } = await supabase.rpc('award_competition_game_xp', {
        p_user_id: userId,
        p_game_history_id: gameHistoryId,
        p_score: Math.floor(score)
      });

      if (error) {
        console.error('❌ [XPService] Error awarding competition game XP:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ [XPService] Exception awarding competition game XP:', error);
      return null;
    }
  }

  /**
   * Get daily challenges for user
   */
  static async getDailyChallenges(userId: string): Promise<DailyChallenge[]> {
    try {
      const { data, error } = await supabase.rpc('get_daily_challenges', {
        p_user_id: userId
      });

      if (error) {
        // If function doesn't exist, return empty array (system not set up yet)
        if (error.code === '42883' || error.message?.includes('does not exist')) {
          console.warn('⚠️ [XPService] Daily challenges function not available');
          return [];
        }
        console.error('❌ [XPService] Error fetching daily challenges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [XPService] Exception fetching daily challenges:', error);
      return [];
    }
  }

  /**
   * Update daily challenge progress
   */
  static async updateDailyChallengeProgress(
    userId: string,
    challengeType: string,
    increment: number = 1
  ): Promise<{ success: boolean; is_completed?: boolean; xp_awarded?: number } | null> {
    try {
      const { data, error } = await supabase.rpc('update_daily_challenge_progress', {
        p_user_id: userId,
        p_challenge_type: challengeType,
        p_progress_increment: increment
      });

      if (error) {
        console.error('❌ [XPService] Error updating challenge progress:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ [XPService] Exception updating challenge progress:', error);
      return null;
    }
  }

  /**
   * Get weekly challenges for user
   */
  static async getWeeklyChallenges(userId: string): Promise<WeeklyChallenge[]> {
    try {
      const { data, error } = await supabase.rpc('get_weekly_challenges', {
        p_user_id: userId
      });

      if (error) {
        // If function doesn't exist, return empty array (system not set up yet)
        if (error.code === '42883' || error.message?.includes('does not exist')) {
          console.warn('⚠️ [XPService] Weekly challenges function not available');
          return [];
        }
        console.error('❌ [XPService] Error fetching weekly challenges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [XPService] Exception fetching weekly challenges:', error);
      return [];
    }
  }

  /**
   * Update weekly challenge progress
   */
  static async updateWeeklyChallengeProgress(
    userId: string,
    challengeType: string,
    increment: number = 1
  ): Promise<{ success: boolean; is_completed?: boolean; xp_awarded?: number } | null> {
    try {
      const { data, error } = await supabase.rpc('update_weekly_challenge_progress', {
        p_user_id: userId,
        p_challenge_type: challengeType,
        p_progress_increment: increment
      });

      if (error) {
        console.error('❌ [XPService] Error updating weekly challenge progress:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ [XPService] Exception updating weekly challenge progress:', error);
      return null;
    }
  }

  /**
   * Get XP transactions history
   */
  static async getXPTransactions(
    userId: string,
    limit: number = 50
  ): Promise<XPTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ [XPService] Error fetching XP transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [XPService] Exception fetching XP transactions:', error);
      return [];
    }
  }

  /**
   * Calculate XP percentage for progress bar
   * Fixed to correctly calculate progress within current level
   */
  static calculateXPProgress(xpData: UserXPData): number {
    if (!xpData || xpData.xp_to_next_level === 0) return 0;
    
    // Calculate cumulative XP needed for all levels up to current level
    let cumulativeXP = 0;
    for (let level = 1; level < xpData.current_level; level++) {
      cumulativeXP += this.calculateXPForLevel(level);
    }
    
    // Calculate XP earned in current level
    const xpEarnedInCurrentLevel = xpData.total_xp - cumulativeXP;
    
    // Calculate XP needed for current level
    const xpNeededForCurrentLevel = this.calculateXPForLevel(xpData.current_level);
    
    // Calculate progress percentage
    const progress = (xpEarnedInCurrentLevel / xpNeededForCurrentLevel) * 100;
    
    // Ensure progress is between 0 and 100
    return Math.min(100, Math.max(0, progress));
  }

  /**
   * Calculate total XP needed for a level
   */
  static calculateXPForLevel(level: number): number {
    // Same formula as SQL: 100 * level^1.5
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Get rank color based on tier
   */
  static getRankColor(tier: number): string {
    const colors: { [key: number]: string } = {
      1: '#9CA3AF', // Gray - Novice
      2: '#60A5FA', // Blue - Rookie
      3: '#34D399', // Green - Apprentice
      4: '#FBBF24', // Yellow - Warrior
      5: '#F87171', // Red - Veteran
      6: '#A78BFA', // Purple - Elite
      7: '#FB7185', // Pink - Master
      8: '#FCD34D', // Gold - Legend
      9: '#EC4899', // Magenta - Mythic
      10: '#8B5CF6' // Violet - Immortal
    };
    return colors[tier] || '#9CA3AF';
  }

  /**
   * Get rank gradient based on tier
   */
  static getRankGradient(tier: number): string {
    const gradients: { [key: number]: string } = {
      1: 'from-gray-400 to-gray-600',
      2: 'from-blue-400 to-blue-600',
      3: 'from-green-400 to-green-600',
      4: 'from-yellow-400 to-yellow-600',
      5: 'from-red-400 to-red-600',
      6: 'from-purple-400 to-purple-600',
      7: 'from-pink-400 to-pink-600',
      8: 'from-yellow-300 to-yellow-500',
      9: 'from-pink-500 to-purple-600',
      10: 'from-purple-500 to-indigo-600'
    };
    return gradients[tier] || 'from-gray-400 to-gray-600';
  }
}

