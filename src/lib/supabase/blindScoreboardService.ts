'use client';

import { supabase } from '@/lib/supabase/client';

export interface BlindListing {
  id: string;
  title: string;
  game_key: string;
  required_players: number;
  entry_cost_tokens: number;
  visibility: string;
  state: string;
  creator_user_id?: string;
  created_at: string;
}

export interface BlindMatch {
  id: string;
  listing_id: string;
  state: string;
  scores_visible: boolean;
  required_players: number;
  created_at: string;
  finalized_at?: string;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  user_id: string;
  score?: number;
  submitted_at?: string;
  is_winner?: boolean;
}

export interface ScoreboardEntry {
  user_id: string;
  score: number;
  is_winner: boolean;
  submitted_at: string;
}

export interface JoinResult {
  status: string;
  matchId?: string;
  joinedCount?: number;
  error?: string;
}

export interface SubmitResult {
  status: string;
  error?: string;
}

export interface FinalizeResult {
  status: string;
  winners?: string[];
  pot?: number;
  each?: number;
  error?: string;
}

export interface ScoreboardResult {
  scoreboard?: ScoreboardEntry[];
  error?: string;
}

export class BlindScoreboardService {
  /**
   * Create a new listing
   */
  static async createListing(data: {
    title: string;
    game_key: string;
    required_players: number;
    entry_cost_tokens?: number;
    creator_user_id?: string;
  }): Promise<BlindListing> {
    try {
      console.log('🎯 [BlindScoreboard] Creating listing:', data);
      
      const { data: result, error } = await supabase.rpc('create_listing', {
        p_title: data.title,
        p_game_key: data.game_key,
        p_required_players: data.required_players,
        p_entry_cost_tokens: data.entry_cost_tokens || 0,
        p_creator_user_id: data.creator_user_id || null
      });

      if (error) {
        console.error('❌ [BlindScoreboard] Error creating listing:', error);
        throw error;
      }

      // Get the created listing
      const { data: listing, error: fetchError } = await supabase
        .from('listing')
        .select('*')
        .eq('id', result)
        .single();

      if (fetchError) {
        console.error('❌ [BlindScoreboard] Error fetching created listing:', fetchError);
        throw fetchError;
      }

      console.log('✅ [BlindScoreboard] Listing created:', listing);
      return listing;
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception creating listing:', error);
      throw error;
    }
  }

  /**
   * Join a listing
   */
  static async joinListing(
    listingId: string, 
    userId: string, 
    idempotencyKey?: string
  ): Promise<JoinResult> {
    try {
      console.log('🎯 [BlindScoreboard] Joining listing:', { listingId, userId });
      
      const { data, error } = await supabase.rpc('join_listing', {
        p_listing_id: listingId,
        p_user_id: userId,
        p_idempotency_key: idempotencyKey || null
      });

      if (error) {
        console.error('❌ [BlindScoreboard] Error joining listing:', error);
        throw error;
      }

      console.log('✅ [BlindScoreboard] Join result:', data);
      return data;
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception joining listing:', error);
      throw error;
    }
  }

  /**
   * Submit a score for a match
   */
  static async submitScore(
    matchId: string, 
    userId: string, 
    score: number
  ): Promise<SubmitResult> {
    try {
      console.log('🎯 [BlindScoreboard] Submitting score:', { matchId, userId, score });
      
      const { data, error } = await supabase.rpc('submit_score', {
        p_match_id: matchId,
        p_user_id: userId,
        p_score: score
      });

      if (error) {
        console.error('❌ [BlindScoreboard] Error submitting score:', error);
        throw error;
      }

      console.log('✅ [BlindScoreboard] Submit result:', data);
      return data;
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception submitting score:', error);
      throw error;
    }
  }

  /**
   * Finalize a match (reveal scores and pay winners)
   */
  static async finalizeMatch(
    matchId: string, 
    idempotencyKey?: string
  ): Promise<FinalizeResult> {
    try {
      console.log('🎯 [BlindScoreboard] Finalizing match:', { matchId });
      
      const { data, error } = await supabase.rpc('finalize_match', {
        p_match_id: matchId,
        p_idempotency_key: idempotencyKey || null
      });

      if (error) {
        console.error('❌ [BlindScoreboard] Error finalizing match:', error);
        throw error;
      }

      console.log('✅ [BlindScoreboard] Finalize result:', data);
      return data;
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception finalizing match:', error);
      throw error;
    }
  }

  /**
   * Get scoreboard for a match (only when scores are visible)
   */
  static async getScoreboard(matchId: string): Promise<ScoreboardResult> {
    try {
      console.log('🎯 [BlindScoreboard] Getting scoreboard:', { matchId });
      
      const { data, error } = await supabase.rpc('get_scoreboard', {
        p_match_id: matchId
      });

      if (error) {
        console.error('❌ [BlindScoreboard] Error getting scoreboard:', error);
        throw error;
      }

      console.log('✅ [BlindScoreboard] Scoreboard result:', data);
      return data;
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception getting scoreboard:', error);
      throw error;
    }
  }

  /**
   * Get all open listings
   */
  static async getOpenListings(): Promise<BlindListing[]> {
    try {
      console.log('🎯 [BlindScoreboard] Getting open listings');
      
      const { data, error } = await supabase
        .from('listing')
        .select('*')
        .eq('state', 'OPEN')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [BlindScoreboard] Error getting open listings:', error);
        throw error;
      }

      console.log('✅ [BlindScoreboard] Open listings:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception getting open listings:', error);
      throw error;
    }
  }

  /**
   * Get user's active matches
   */
  static async getUserActiveMatches(userId: string): Promise<BlindMatch[]> {
    try {
      console.log('🎯 [BlindScoreboard] Getting user active matches:', { userId });
      
      const { data, error } = await supabase
        .from('match')
        .select(`
          *,
          match_participant!inner(user_id)
        `)
        .eq('match_participant.user_id', userId)
        .in('state', ['PENDING', 'IN_PROGRESS'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [BlindScoreboard] Error getting user active matches:', error);
        throw error;
      }

      console.log('✅ [BlindScoreboard] User active matches:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception getting user active matches:', error);
      throw error;
    }
  }

  /**
   * Get user's completed matches
   */
  static async getUserCompletedMatches(userId: string): Promise<BlindMatch[]> {
    try {
      console.log('🎯 [BlindScoreboard] Getting user completed matches:', { userId });
      
      const { data, error } = await supabase
        .from('match')
        .select(`
          *,
          match_participant!inner(user_id)
        `)
        .eq('match_participant.user_id', userId)
        .eq('state', 'COMPLETED')
        .order('finalized_at', { ascending: false });

      if (error) {
        console.error('❌ [BlindScoreboard] Error getting user completed matches:', error);
        throw error;
      }

      console.log('✅ [BlindScoreboard] User completed matches:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception getting user completed matches:', error);
      throw error;
    }
  }

  /**
   * Get match participants
   */
  static async getMatchParticipants(matchId: string): Promise<MatchParticipant[]> {
    try {
      console.log('🎯 [BlindScoreboard] Getting match participants:', { matchId });
      
      const { data, error } = await supabase
        .from('match_participant')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [BlindScoreboard] Error getting match participants:', error);
        throw error;
      }

      console.log('✅ [BlindScoreboard] Match participants:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception getting match participants:', error);
      throw error;
    }
  }

  /**
   * Check if user has submitted score for a match
   */
  static async hasUserSubmittedScore(matchId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('match_participant')
        .select('score')
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ [BlindScoreboard] Error checking score submission:', error);
        return false;
      }

      return data?.score !== null;
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception checking score submission:', error);
      return false;
    }
  }

  /**
   * Get user's wallet balance
   */
  static async getUserBalance(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('wallet')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ [BlindScoreboard] Error getting user balance:', error);
        return 0;
      }

      return data?.balance || 0;
    } catch (error) {
      console.error('❌ [BlindScoreboard] Exception getting user balance:', error);
      return 0;
    }
  }
}
