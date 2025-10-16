import { supabase } from './client';

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'login' | 'logout' | 'game_played' | 'token_purchase' | 'listing_entry' | 'prize_won' | 'story_submitted' | 'page_view';
  activity_data: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface GameHistory {
  id: string;
  user_id: string;
  game_type: string;
  score: number;
  accuracy: number;
  avg_reaction_time?: number;
  is_practice: boolean;
  listing_id?: string;
  entry_number?: number;
  rank?: number;
  is_winner?: boolean;
  prize_claimed?: boolean;
  confirmation_code?: string;
  created_at: string;
}

export interface WinnerRecord {
  id: string;
  user_id: string;
  listing_id: string;
  game_type: string;
  score: number;
  rank: number;
  confirmation_code: string;
  prize_claimed: boolean;
  shipping_address?: string;
  lister_notified: boolean;
  created_at: string;
  claimed_at?: string;
}

export interface UserStory {
  id: string;
  user_id: string;
  username: string;
  title: string;
  story: string;
  prize_won: string;
  amount_won: number;
  is_approved: boolean;
  is_featured: boolean;
  created_at: string;
}

export class ActivityService {
  /**
   * Log user activity
   */
  static async logActivity(
    userId: string,
    activityType: UserActivity['activity_type'],
    activityData: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      console.log(`📊 Logging activity: ${activityType} for user ${userId}`);
      
      const { error } = await supabase
        .from('user_activities')
        .insert([{
          user_id: userId,
          activity_type: activityType,
          activity_data: activityData,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('❌ Error logging activity:', error);
        return false;
      }

      console.log('✅ Activity logged successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in logActivity:', error);
      return false;
    }
  }

  /**
   * Save game history with all details
   */
  static async saveGameHistory(gameData: {
    user_id: string;
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
    game_session_id?: string;
    device_info?: any;
    location_data?: any;
    metadata?: any;
  }): Promise<GameHistory | null> {
    try {
      console.log('🎮 [ActivityService] Saving game history...');
      console.log('📊 [ActivityService] Game:', gameData.game_type);
      console.log('📊 [ActivityService] Score:', gameData.score);
      console.log('📊 [ActivityService] User ID:', gameData.user_id);
      console.log('📊 [ActivityService] Mode:', gameData.is_practice ? 'practice' : 'competition');
      
      // Map to comprehensive game history schema
      const { data, error } = await supabase
        .from('game_history')
        .insert([{
          user_id: gameData.user_id,
          game_type: gameData.game_type,
          score: gameData.score,
          accuracy: gameData.accuracy,
          avg_reaction_time: gameData.avg_reaction_time,
          is_practice: gameData.is_practice,
          listing_id: gameData.listing_id,
          entry_number: gameData.entry_number,
          match_id: gameData.match_id,
          opponent_id: gameData.opponent_id || null,
          tournament_id: gameData.tournament_id || null,
          entry_fee: gameData.entry_fee || 0,
          tokens_wagered: gameData.tokens_wagered || 0,
          tokens_won: gameData.tokens_won || 0,
          game_duration: gameData.game_duration || 60,
          difficulty_level: gameData.difficulty_level || 1,
          game_session_id: gameData.game_session_id || null,
          device_info: gameData.device_info || null,
          location_data: gameData.location_data || null,
          metadata: gameData.metadata || null,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [ActivityService] ERROR SAVING GAME HISTORY!');
        console.error('❌ [ActivityService] Error message:', error.message);
        console.error('❌ [ActivityService] Error code:', error.code);
        console.error('❌ [ActivityService] Full error:', JSON.stringify(error, null, 2));
        return null;
      }

      console.log('✅ [ActivityService] ✅✅✅ GAME HISTORY SAVED SUCCESSFULLY! ✅✅✅');
      console.log('✅ [ActivityService] Saved game ID:', data.id);
      console.log('✅ [ActivityService] Full saved data:', data);
      
      // Also log as activity
      await this.logActivity(gameData.user_id, 'game_played', {
        game_type: gameData.game_type,
        score: gameData.score,
        is_practice: gameData.is_practice
      });

      return data;
    } catch (error) {
      console.error('❌ Error in saveGameHistory:', error);
      return null;
    }
  }

  /**
   * Get user's game history
   */
  static async getUserGameHistory(userId: string, limit: number = 50): Promise<GameHistory[]> {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

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
   * Create winner record when user wins a listing
   */
  static async createWinnerRecord(winnerData: {
    user_id: string;
    listing_id: string;
    game_type: string;
    score: number;
    rank: number;
  }): Promise<WinnerRecord | null> {
    try {
      console.log('🏆 Creating winner record for user:', winnerData.user_id);
      
      // Generate confirmation code
      const confirmationCode = `WIN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('winners')
        .insert([{
          ...winnerData,
          confirmation_code: confirmationCode,
          prize_claimed: false,
          lister_notified: false,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating winner record:', error);
        return null;
      }

      console.log('✅ Winner record created. Confirmation code:', confirmationCode);
      
      // Log as activity
      await this.logActivity(winnerData.user_id, 'prize_won', {
        listing_id: winnerData.listing_id,
        confirmation_code: confirmationCode,
        rank: winnerData.rank
      });

      return data;
    } catch (error) {
      console.error('❌ Error in createWinnerRecord:', error);
      return null;
    }
  }

  /**
   * Update winner with shipping address
   */
  static async updateWinnerAddress(
    winnerId: string,
    shippingAddress: string
  ): Promise<boolean> {
    try {
      console.log('📦 Updating winner address');
      
      const { error } = await supabase
        .from('winners')
        .update({
          shipping_address: shippingAddress,
          prize_claimed: true,
          claimed_at: new Date().toISOString()
        })
        .eq('id', winnerId);

      if (error) {
        console.error('❌ Error updating winner address:', error);
        return false;
      }

      console.log('✅ Winner address updated');
      return true;
    } catch (error) {
      console.error('❌ Error in updateWinnerAddress:', error);
      return false;
    }
  }

  /**
   * Notify lister of winner
   */
  static async notifyListerOfWinner(winnerId: string): Promise<boolean> {
    try {
      console.log('📧 Marking lister as notified');
      
      const { error } = await supabase
        .from('winners')
        .update({
          lister_notified: true
        })
        .eq('id', winnerId);

      if (error) {
        console.error('❌ Error notifying lister:', error);
        return false;
      }

      console.log('✅ Lister notified flag set');
      return true;
    } catch (error) {
      console.error('❌ Error in notifyListerOfWinner:', error);
      return false;
    }
  }

  /**
   * Get user's winnings
   */
  static async getUserWinnings(userId: string): Promise<WinnerRecord[]> {
    try {
      const { data, error } = await supabase
        .from('winners')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user winnings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserWinnings:', error);
      return [];
    }
  }

  /**
   * Submit victory story
   */
  static async submitVictoryStory(storyData: {
    user_id: string;
    username: string;
    title: string;
    story: string;
    prize_won: string;
    amount_won: number;
  }): Promise<UserStory | null> {
    try {
      console.log('📝 Submitting victory story');
      
      const { data, error } = await supabase
        .from('user_stories')
        .insert([{
          ...storyData,
          is_approved: false,
          is_featured: false,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error submitting story:', error);
        return null;
      }

      console.log('✅ Victory story submitted');
      
      // Log as activity
      await this.logActivity(storyData.user_id, 'story_submitted', {
        title: storyData.title,
        prize_won: storyData.prize_won
      });

      return data;
    } catch (error) {
      console.error('❌ Error in submitVictoryStory:', error);
      return null;
    }
  }

  /**
   * Get approved victory stories
   */
  static async getApprovedStories(limit: number = 20): Promise<UserStory[]> {
    try {
      const { data, error } = await supabase
        .from('user_stories')
        .select('*')
        .eq('is_approved', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching stories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getApprovedStories:', error);
      return [];
    }
  }

  /**
   * Get user's complete activity log
   */
  static async getUserActivityLog(userId: string, limit: number = 100): Promise<UserActivity[]> {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching activity log:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserActivityLog:', error);
      return [];
    }
  }

  /**
   * Get user's high scores across all games
   */
  static async getUserHighScores(userId: string): Promise<Record<string, GameHistory>> {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', userId)
        .order('score', { ascending: false });

      if (error) {
        console.error('Error fetching high scores:', error);
        return {};
      }

      // Get the highest score for each game type
      const highScores: Record<string, GameHistory> = {};
      
      data?.forEach(game => {
        if (!highScores[game.game_type] || game.score > highScores[game.game_type].score) {
          highScores[game.game_type] = game;
        }
      });

      return highScores;
    } catch (error) {
      console.error('Error in getUserHighScores:', error);
      return {};
    }
  }

  /**
   * Check if user is winner for a listing
   */
  static async checkIfWinner(userId: string, listingId: string): Promise<WinnerRecord | null> {
    try {
      const { data, error } = await supabase
        .from('winners')
        .select('*')
        .eq('user_id', userId)
        .eq('listing_id', listingId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }
}

export default ActivityService;

