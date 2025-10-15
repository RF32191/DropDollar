// Lottery-style 1v1 Matchmaking Service
// Players play immediately, scores stored in lots, matched retroactively
import { supabase } from './client';

export interface MatchmakingQueue {
  id: string;
  user_id: string;
  username: string;
  entry_fee: number;
  status: 'waiting' | 'matched' | 'cancelled';
  game_type: string;
  lot_number?: string;
  player_score?: number;
  score_submitted_at?: string;
  matched_with_queue_id?: string;
  created_at: string;
}

export interface Match {
  id: string;
  player1_id: string;
  player1_score?: number;
  player2_id: string;
  player2_score?: number;
  entry_fee: number;
  game_type: string;
  lot_number?: string;
  prize_amount?: number;
  status: 'completed' | 'expired';
  payout_completed?: boolean;
  winner_id?: string;
  created_at: string;
  completed_at?: string;
}

class MatchmakingService {
  /**
   * Join matchmaking queue and get assigned to a lot
   */
  async joinQueue(
    userId: string,
    username: string,
    entryFee: number,
    skillRating: number = 1000,
    gameType: string = 'quick-click'
  ): Promise<MatchmakingQueue | null> {
    try {
      console.log(`🎮 [Matchmaking] ${username} joining queue for $${entryFee} - ${gameType}`);
      console.log(`🎮 [Matchmaking] User ID: ${userId}`);
      console.log(`🎮 [Matchmaking] Username: ${username}`);
      console.log(`🎮 [Matchmaking] Entry Fee: ${entryFee}`);
      console.log(`🎮 [Matchmaking] Game Type: ${gameType}`);

      // TRIUMPH-STYLE MATCHMAKING: Look for existing waiting opponent first
      console.log(`🔍 [Matchmaking] Looking for existing opponent...`);
      
      let existingMatch = null;
      let searchError = null;
      
      try {
        const result = await supabase
          .from('matches')
          .select('*')
          .eq('game_type', gameType)
          .eq('entry_fee', entryFee)
          .eq('status', 'waiting_for_game')
          .is('player2_id', null)
          .neq('player1_id', userId)
          .single();
        
        existingMatch = result.data;
        searchError = result.error;
      } catch (error) {
        console.log(`⚠️ [Matchmaking] Matches table may not exist yet, using fallback...`);
        searchError = error;
      }

      if (existingMatch && !searchError) {
        console.log(`✅ [Matchmaking] Found existing match! Joining as player 2...`);
        
        try {
          // Join existing match as player 2
          const { data: updatedMatch, error: updateError } = await supabase
            .from('matches')
            .update({
              player2_id: userId,
              player2_username: username,
              status: 'in_progress'
            })
            .eq('id', existingMatch.id)
            .select()
            .single();

          if (updateError) {
            console.error('❌ [Matchmaking] Error joining existing match:', updateError);
            throw updateError;
          }

          console.log(`✅ [Matchmaking] Successfully joined match:`, updatedMatch.id);
          
          // Return match info as queue entry
          return {
            id: updatedMatch.id,
            user_id: userId,
            username: username,
            entry_fee: entryFee,
            status: 'matched',
            game_type: gameType,
            lot_number: `match-${updatedMatch.id}`,
            created_at: updatedMatch.created_at,
            updated_at: new Date().toISOString()
          };
        } catch (error) {
          console.log(`⚠️ [Matchmaking] Error joining existing match, falling back to localStorage...`);
          // Fall through to create new match
        }
      }

      // No existing match found - create new match as player 1
      console.log(`🆕 [Matchmaking] No existing match found. Creating new match as player 1...`);
      
      let newMatch = null;
      let createError = null;
      
      try {
        const result = await supabase
          .from('matches')
          .insert({
            player1_id: userId,
            player1_username: username,
            entry_fee: entryFee,
            prize_pool: entryFee * 2, // Winner takes both entry fees
            game_type: gameType,
            status: 'waiting_for_game'
          })
          .select()
          .single();
        
        newMatch = result.data;
        createError = result.error;
      } catch (error) {
        console.log(`⚠️ [Matchmaking] Matches table may not exist, using localStorage fallback...`);
        createError = error;
      }

      if (createError || !newMatch) {
        console.log(`🔄 [Matchmaking] Using localStorage fallback for matchmaking...`);
        
        // FALLBACK: Use localStorage when matches table doesn't exist
        const matchId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        const lotNumber = `${gameType}-${entryFee}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        
        const queueEntry: MatchmakingQueue = {
          id: matchId,
          user_id: userId,
          username: username,
          entry_fee: entryFee,
          status: 'waiting',
          game_type: gameType,
          lot_number: lotNumber,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Store in localStorage
        const existingQueue = JSON.parse(localStorage.getItem('matchmaking_queue') || '[]');
        existingQueue.push(queueEntry);
        localStorage.setItem('matchmaking_queue', JSON.stringify(existingQueue));
        
        console.log(`✅ [Matchmaking] Created localStorage match:`, matchId);
        return queueEntry;
      }

      console.log(`✅ [Matchmaking] Created new match:`, newMatch.id);
      
      // Return match info as queue entry
      return {
        id: newMatch.id,
        user_id: userId,
        username: username,
        entry_fee: entryFee,
        status: 'waiting',
        game_type: gameType,
        lot_number: `match-${newMatch.id}`,
        created_at: newMatch.created_at,
        updated_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ [Matchmaking] Error joining queue:', error);
      console.error('❌ [Matchmaking] Full error details:', JSON.stringify(error, null, 2));
      return null;
    }
  }

  /**
   * Submit score after game completion
   * This triggers automatic matching if opponent has also completed
   */
  async submitScore(
    queueId: string,
    userId: string,
    score: number
  ): Promise<{ matched: boolean; match?: Match }> {
    try {
      console.log(`📊 [Matchmaking] Submitting score for queue:`, queueId, 'Score:', score);

      // Update queue entry with score
      // The database trigger will automatically match and payout if opponent is ready
      const { data, error } = await supabase
        .from('matchmaking_queue')
        .update({
          player_score: score,
          score_submitted_at: new Date().toISOString()
        })
        .eq('id', queueId)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ [Matchmaking] Score submitted for Lot:`, data.lot_number);

      // Check if we got matched (the trigger updates matched_with_queue_id)
      if (data.matched_with_queue_id) {
        console.log(`🎉 [Matchmaking] MATCHED! Finding match details...`);
        
        // Find the match record
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('lot_number', data.lot_number)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!matchError && matchData) {
          console.log(`✅ [Matchmaking] Match found:`, matchData.id);
          return { matched: true, match: matchData };
        }
      }

      console.log(`⏳ [Matchmaking] Waiting for opponent in Lot:`, data.lot_number);
      return { matched: false };
    } catch (error) {
      console.error('❌ [Matchmaking] Error submitting score:', error);
      return { matched: false };
    }
  }

  /**
   * Find match (legacy compatibility - now just checks if matched)
   */
  async findMatch(
    queueId: string,
    userId: string,
    username: string,
    entryFee: number,
    skillRating: number,
    gameType: string
  ): Promise<Match | null> {
    try {
      console.log(`🔍 [Matchmaking] Checking for match...`);

      // Get queue entry
      const { data: queueEntry, error: queueError } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('id', queueId)
        .single();

      if (queueError || !queueEntry) {
        console.log(`⏳ [Matchmaking] No opponents found for ${gameType}, user can play solo...`);
        return null;
      }

      // If matched, find the match record
      if (queueEntry.matched_with_queue_id && queueEntry.lot_number) {
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('lot_number', queueEntry.lot_number)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!matchError && matchData) {
          return matchData;
        }
      }

      console.log(`⏳ [Matchmaking] No opponents found for ${gameType}, user can play solo...`);
      return null;
    } catch (error) {
      console.error('❌ [Matchmaking] Error finding match:', error);
      return null;
    }
  }

  /**
   * Get user's skill rating from stats
   */
  async getUserSkillRating(userId: string): Promise<number> {
    // Return default rating since we removed skill_rating from the schema
    return 1000;
  }

  /**
   * Get match by queue ID
   */
  async getMatchByQueueId(queueId: string): Promise<Match | null> {
    try {
      // Get queue entry first
      const { data: queueEntry, error: queueError } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('id', queueId)
        .single();

      if (queueError || !queueEntry || !queueEntry.lot_number) {
        return null;
      }

      // Find match by lot number
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('lot_number', queueEntry.lot_number)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (matchError) {
        return null;
      }

      return matchData;
    } catch (error) {
      console.error('❌ [Matchmaking] Error getting match:', error);
      return null;
    }
  }

  /**
   * Get match details including player names
   */
  async getMatchDetails(matchId: string): Promise<any> {
    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError || !match) {
        return null;
      }

      // Get player names
      const { data: player1 } = await supabase
        .from('users')
        .select('username, email')
        .eq('id', match.player1_id)
        .single();

      const { data: player2 } = await supabase
        .from('users')
        .select('username, email')
        .eq('id', match.player2_id)
        .single();

      return {
        ...match,
        player1_username: player1?.username || player1?.email || 'Player 1',
        player2_username: player2?.username || player2?.email || 'Player 2'
      };
    } catch (error) {
      console.error('❌ [Matchmaking] Error getting match details:', error);
      return null;
    }
  }

  /**
   * Cancel queue entry
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
}

export default new MatchmakingService();
