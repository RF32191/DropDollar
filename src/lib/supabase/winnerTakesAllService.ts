import { supabase } from './client';

export interface WinnerTakesAllConfig {
  id: string;
  game_type: string;
  title: string;
  description: string;
  entry_fee: number;
  prize_pool: number;
  base_price: number;
  game_duration: number;
  rng_seed: number;
  winner_prize: number;
  platform_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WinnerTakesAllSession {
  id: string;
  config_id: string;
  current_pot: number;
  base_price: number;
  participants_count: number;
  status: 'waiting' | 'active' | 'completed';
  timer_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WinnerTakesAllParticipant {
  id: string;
  session_id: string;
  user_id: string;
  score: number | null;
  accuracy: number | null;
  joined_at: string;
  completed_at: string | null;
}

export interface WinnerTakesAllSessionWithParticipants extends WinnerTakesAllSession {
  participants: WinnerTakesAllParticipant[];
}

export class WinnerTakesAllService {
  /**
   * Get all Winner Takes It All configurations
   */
  static async getConfigs(): Promise<WinnerTakesAllConfig[]> {
    try {
      const { data, error } = await supabase
        .from('winner_takes_all_configs')
        .select('*')
        .eq('is_active', true)
        .order('prize_pool', { ascending: true });

      if (error) {
        console.error('❌ [WinnerTakesAllService] Error fetching configs:', error);
        return [];
      }

      console.log('✅ [WinnerTakesAllService] Configs fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ [WinnerTakesAllService] Exception fetching configs:', error);
      return [];
    }
  }

  /**
   * Get all Winner Takes It All sessions with participants
   */
  static async getAllSessions(): Promise<WinnerTakesAllSessionWithParticipants[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_all_winner_takes_all_sessions');

      if (error) {
        console.error('❌ [WinnerTakesAllService] Error fetching sessions:', error);
        return [];
      }

      console.log('✅ [WinnerTakesAllService] Sessions fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ [WinnerTakesAllService] Exception fetching sessions:', error);
      return [];
    }
  }

  /**
   * Create or get Winner Takes It All session
   */
  static async createOrGetSession(configId: string): Promise<WinnerTakesAllSession | null> {
    try {
      const { data, error } = await supabase
        .rpc('create_or_get_winner_takes_all_session', { p_config_id: configId });

      if (error) {
        console.error('❌ [WinnerTakesAllService] Error creating/getting session:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.error('❌ [WinnerTakesAllService] No session data returned');
        return null;
      }

      const session = data[0];
      console.log('✅ [WinnerTakesAllService] Session created/got:', session.session_id);
      return {
        id: session.session_id,
        config_id: session.config_id,
        current_pot: session.current_pot,
        base_price: session.base_price,
        participants_count: session.participants_count,
        status: session.status,
        timer_started_at: session.timer_started_at,
        created_at: session.created_at,
        updated_at: session.updated_at
      };
    } catch (error) {
      console.error('❌ [WinnerTakesAllService] Exception creating/getting session:', error);
      return null;
    }
  }

  /**
   * Join Winner Takes It All session
   */
  static async joinSession(sessionId: string, userId: string, entryFee: number): Promise<{
    success: boolean;
    message: string;
    newPot: number;
    participantsCount: number;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('join_winner_takes_all_session', {
          p_session_id: sessionId,
          p_user_id: userId,
          p_entry_fee: entryFee
        });

      if (error) {
        console.error('❌ [WinnerTakesAllService] Error joining session:', error);
        return {
          success: false,
          message: error.message,
          newPot: 0,
          participantsCount: 0
        };
      }

      if (!data || data.length === 0) {
        console.error('❌ [WinnerTakesAllService] No join data returned');
        return {
          success: false,
          message: 'No data returned',
          newPot: 0,
          participantsCount: 0
        };
      }

      const result = data[0];
      console.log('✅ [WinnerTakesAllService] Joined session:', result);
      return {
        success: result.success,
        message: result.message,
        newPot: result.new_pot,
        participantsCount: result.participants_count
      };
    } catch (error) {
      console.error('❌ [WinnerTakesAllService] Exception joining session:', error);
      return {
        success: false,
        message: 'Exception occurred',
        newPot: 0,
        participantsCount: 0
      };
    }
  }

  /**
   * Update Winner Takes It All score
   */
  static async updateScore(sessionId: string, userId: string, score: number, accuracy: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('update_winner_takes_all_score', {
          p_session_id: sessionId,
          p_user_id: userId,
          p_score: score,
          p_accuracy: accuracy
        });

      if (error) {
        console.error('❌ [WinnerTakesAllService] Error updating score:', error);
        return {
          success: false,
          message: error.message
        };
      }

      if (!data || data.length === 0) {
        console.error('❌ [WinnerTakesAllService] No update data returned');
        return {
          success: false,
          message: 'No data returned'
        };
      }

      const result = data[0];
      console.log('✅ [WinnerTakesAllService] Score updated:', result);
      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      console.error('❌ [WinnerTakesAllService] Exception updating score:', error);
      return {
        success: false,
        message: 'Exception occurred'
      };
    }
  }

  /**
   * Get Winner Takes It All session with participants
   */
  static async getSession(sessionId: string): Promise<WinnerTakesAllSessionWithParticipants | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_winner_takes_all_session', { p_session_id: sessionId });

      if (error) {
        console.error('❌ [WinnerTakesAllService] Error fetching session:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.error('❌ [WinnerTakesAllService] No session data returned');
        return null;
      }

      const session = data[0];
      console.log('✅ [WinnerTakesAllService] Session fetched:', session.session_id);
      return {
        id: session.session_id,
        config_id: session.config_id,
        current_pot: session.current_pot,
        base_price: session.base_price,
        participants_count: session.participants_count,
        status: session.status,
        timer_started_at: session.timer_started_at,
        created_at: session.created_at,
        updated_at: session.updated_at,
        participants: session.participants || []
      };
    } catch (error) {
      console.error('❌ [WinnerTakesAllService] Exception fetching session:', error);
      return null;
    }
  }

  /**
   * Check if user has completed a session
   */
  static async hasUserCompleted(sessionId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('winner_takes_all_participants')
        .select('score')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .not('score', 'is', null)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ [WinnerTakesAllService] Error checking completion:', error);
        return false;
      }

      return data?.score !== null && data?.score !== undefined;
    } catch (error) {
      console.error('❌ [WinnerTakesAllService] Exception checking completion:', error);
      return false;
    }
  }
}
