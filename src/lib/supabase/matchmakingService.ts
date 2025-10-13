// Triumph-style 1v1 Matchmaking Service
import { supabase } from './client';

export interface MatchmakingQueue {
  id: string;
  user_id: string;
  username: string;
  entry_fee: number; // $1, $5, $10, or $25
  skill_rating: number; // ELO-like rating for matchmaking
  status: 'waiting' | 'matched' | 'cancelled';
  created_at: string;
  matched_at?: string;
  match_id?: string;
}

export interface Match {
  id: string;
  player1_id: string;
  player1_username: string;
  player1_score?: number;
  player2_id: string;
  player2_username: string;
  player2_score?: number;
  entry_fee: number;
  prize_pool: number; // entry_fee * 2 * 0.85 (after 15% fee)
  game_type: string;
  status: 'waiting_for_game' | 'in_progress' | 'completed' | 'expired';
  winner_id?: string;
  stripe_payment_intent_p1?: string;
  stripe_payment_intent_p2?: string;
  created_at: string;
  completed_at?: string;
}

class MatchmakingService {
  /**
   * Join the matchmaking queue
   */
  async joinQueue(
    userId: string,
    username: string,
    entryFee: number,
    skillRating: number = 1000
  ): Promise<MatchmakingQueue | null> {
    try {
      console.log(`🎮 [Matchmaking] ${username} joining queue for $${entryFee}`);

      const { data, error } = await supabase
        .from('matchmaking_queue')
        .insert({
          user_id: userId,
          username: username,
          entry_fee: entryFee,
          skill_rating: skillRating,
          status: 'waiting'
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ [Matchmaking] ${username} in queue:`, data.id);
      return data;
    } catch (error) {
      console.error('❌ [Matchmaking] Error joining queue:', error);
      return null;
    }
  }

  /**
   * Find a match for a user in the queue
   * Uses skill-based matchmaking (within ±200 ELO)
   */
  async findMatch(
    queueId: string,
    userId: string,
    username: string,
    entryFee: number,
    skillRating: number
  ): Promise<Match | null> {
    try {
      console.log(`🔍 [Matchmaking] Finding opponent for ${username} (ELO: ${skillRating})`);

      // Look for waiting opponents with similar skill level
      const { data: opponents, error: searchError } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('entry_fee', entryFee)
        .eq('status', 'waiting')
        .neq('user_id', userId)
        .gte('skill_rating', skillRating - 200) // Within 200 ELO
        .lte('skill_rating', skillRating + 200)
        .order('created_at', { ascending: true })
        .limit(1);

      if (searchError) throw searchError;

      if (!opponents || opponents.length === 0) {
        console.log(`⏳ [Matchmaking] No opponents found, waiting in queue...`);
        return null;
      }

      const opponent = opponents[0];
      console.log(`✅ [Matchmaking] Found opponent: ${opponent.username} (ELO: ${opponent.skill_rating})`);

      // Calculate prize pool (both entry fees minus 15% platform fee)
      const totalPot = entryFee * 2;
      const prizePool = totalPot * 0.85;

      // Create match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          player1_id: userId,
          player1_username: username,
          player2_id: opponent.user_id,
          player2_username: opponent.username,
          entry_fee: entryFee,
          prize_pool: prizePool,
          game_type: 'Random', // Will be selected when players start
          status: 'waiting_for_game'
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Update both queue entries to matched
      await supabase
        .from('matchmaking_queue')
        .update({ 
          status: 'matched', 
          matched_at: new Date().toISOString(),
          match_id: match.id 
        })
        .in('id', [queueId, opponent.id]);

      console.log(`🎮 [Matchmaking] Match created:`, match.id);
      return match;
    } catch (error) {
      console.error('❌ [Matchmaking] Error finding match:', error);
      return null;
    }
  }

  /**
   * Cancel matchmaking queue entry
   */
  async cancelQueue(queueId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('matchmaking_queue')
        .update({ status: 'cancelled' })
        .eq('id', queueId);

      return !error;
    } catch (error) {
      console.error('❌ [Matchmaking] Error cancelling queue:', error);
      return false;
    }
  }

  /**
   * Get match details
   */
  async getMatch(matchId: string): Promise<Match | null> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ [Matchmaking] Error getting match:', error);
      return null;
    }
  }

  /**
   * Submit score for a player in a match
   */
  async submitScore(
    matchId: string,
    userId: string,
    score: number
  ): Promise<boolean> {
    try {
      const match = await this.getMatch(matchId);
      if (!match) return false;

      const isPlayer1 = match.player1_id === userId;
      const updateField = isPlayer1 ? 'player1_score' : 'player2_score';

      const { error } = await supabase
        .from('matches')
        .update({ [updateField]: score })
        .eq('id', matchId);

      if (error) throw error;

      // Check if both scores are submitted
      const updatedMatch = await this.getMatch(matchId);
      if (updatedMatch && updatedMatch.player1_score !== null && updatedMatch.player2_score !== null) {
        await this.determineWinner(matchId);
      }

      return true;
    } catch (error) {
      console.error('❌ [Matchmaking] Error submitting score:', error);
      return false;
    }
  }

  /**
   * Determine winner and update match
   */
  async determineWinner(matchId: string): Promise<void> {
    try {
      const match = await this.getMatch(matchId);
      if (!match || match.player1_score === null || match.player2_score === null) return;

      const winnerId = match.player1_score > match.player2_score 
        ? match.player1_id 
        : match.player2_id;

      await supabase
        .from('matches')
        .update({
          winner_id: winnerId,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', matchId);

      console.log(`🏆 [Matchmaking] Winner determined: ${winnerId}`);
    } catch (error) {
      console.error('❌ [Matchmaking] Error determining winner:', error);
    }
  }

  /**
   * Get user's match history
   */
  async getUserMatches(userId: string): Promise<Match[]> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ [Matchmaking] Error getting user matches:', error);
      return [];
    }
  }

  /**
   * Get user's skill rating (ELO)
   */
  async getUserSkillRating(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('skill_rating')
        .eq('user_id', userId)
        .single();

      if (error || !data) return 1000; // Default rating
      return data.skill_rating;
    } catch (error) {
      console.error('❌ [Matchmaking] Error getting skill rating:', error);
      return 1000;
    }
  }

  /**
   * Update user's skill rating after match
   */
  async updateSkillRating(userId: string, won: boolean, opponentRating: number): Promise<void> {
    try {
      const currentRating = await this.getUserSkillRating(userId);
      const K = 32; // K-factor for ELO calculation
      const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
      const actualScore = won ? 1 : 0;
      const newRating = Math.round(currentRating + K * (actualScore - expectedScore));

      await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          skill_rating: newRating
        }, { onConflict: 'user_id' });

      console.log(`📊 [Matchmaking] Rating updated: ${currentRating} → ${newRating}`);
    } catch (error) {
      console.error('❌ [Matchmaking] Error updating skill rating:', error);
    }
  }
}

export default new MatchmakingService();

