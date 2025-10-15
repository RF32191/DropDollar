import { supabase } from './client';

export interface OpponentAssignment {
  queueId: string;
  userId: string;
  username: string;
  gameType: string;
  entryFee: number;
  lotNumber: string;
  playerScore: number;
  status: 'waiting' | 'matched';
  matchedWithQueueId?: string;
  opponentName?: string;
  opponentScore?: number;
  matchId?: string;
}

export class OpponentAssignmentService {
  /**
   * Automatically assign an opponent to a player who just completed a game
   * This runs after game completion to find a suitable opponent
   */
  static async assignOpponent(
    queueId: string,
    userId: string,
    username: string,
    gameType: string,
    entryFee: number,
    lotNumber: string,
    playerScore: number
  ): Promise<{ matched: boolean; opponent?: OpponentAssignment; matchId?: string }> {
    try {
      console.log('🎯 [OpponentAssignment] Looking for opponent...');
      console.log('🎯 [OpponentAssignment] Queue ID:', queueId);
      console.log('🎯 [OpponentAssignment] Game:', gameType);
      console.log('🎯 [OpponentAssignment] Lot:', lotNumber);
      console.log('🎯 [OpponentAssignment] Score:', playerScore);

      // First, update the current player's score
      const { error: updateError } = await supabase
        .from('matchmaking_queue')
        .update({
          player_score: playerScore,
          score_submitted_at: new Date().toISOString()
        })
        .eq('id', queueId);

      if (updateError) {
        console.error('❌ [OpponentAssignment] Error updating score:', updateError);
        return { matched: false };
      }

      // Look for an opponent in the same lot who has also completed their game
      // Exclude the current user to prevent self-matching
      const { data: opponents, error: opponentError } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('lot_number', lotNumber)
        .neq('id', queueId)
        .neq('user_id', userId) // Prevent self-matching
        .not('player_score', 'is', null)
        .eq('status', 'waiting')
        .is('matched_with_queue_id', null)
        .order('score_submitted_at', { ascending: true })
        .limit(1);

      if (opponentError) {
        console.error('❌ [OpponentAssignment] Error finding opponents:', opponentError);
        return { matched: false };
      }

      if (!opponents || opponents.length === 0) {
        console.log('⏳ [OpponentAssignment] No opponent found yet. Player will be matched later.');
        return { matched: false };
      }

      const opponent = opponents[0];
      console.log('🎉 [OpponentAssignment] Found opponent:', opponent.user_id);
      console.log('🎉 [OpponentAssignment] Opponent score:', opponent.player_score);

      // Determine winner
      const isWinner = playerScore > opponent.player_score;
      const winnerId = isWinner ? userId : opponent.user_id;
      const loserId = isWinner ? opponent.user_id : userId;
      const winnerScore = isWinner ? playerScore : opponent.player_score;
      const loserScore = isWinner ? opponent.player_score : playerScore;

      // Calculate prize (85% of total pot, 15% platform fee)
      const totalPot = entryFee * 2;
      const prizeAmount = totalPot * 0.85;

      console.log('💰 [OpponentAssignment] Prize calculation:');
      console.log('💰 [OpponentAssignment] Total pot:', totalPot);
      console.log('💰 [OpponentAssignment] Prize amount:', prizeAmount);
      console.log('💰 [OpponentAssignment] Winner:', winnerId);

      // Create match record
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({
          lot_number: lotNumber,
          player1_id: userId,
          player1_name: username,
          player1_score: playerScore,
          player2_id: opponent.user_id,
          player2_name: opponent.username,
          player2_score: opponent.player_score,
          winner_id: winnerId,
          winner_score: winnerScore,
          loser_score: loserScore,
          prize_amount: prizeAmount,
          game_type: gameType,
          entry_fee: entryFee,
          status: 'completed'
        })
        .select()
        .single();

      if (matchError) {
        console.error('❌ [OpponentAssignment] Error creating match:', matchError);
        return { matched: false };
      }

      // Update both queue entries to mark them as matched
      const { error: updatePlayerError } = await supabase
        .from('matchmaking_queue')
        .update({
          status: 'matched',
          matched_with_queue_id: opponent.id
        })
        .eq('id', queueId);

      const { error: updateOpponentError } = await supabase
        .from('matchmaking_queue')
        .update({
          status: 'matched',
          matched_with_queue_id: queueId
        })
        .eq('id', opponent.id);

      if (updatePlayerError || updateOpponentError) {
        console.error('❌ [OpponentAssignment] Error updating queue status:', updatePlayerError || updateOpponentError);
        return { matched: false };
      }

      // Award prize to winner
      if (prizeAmount > 0) {
        const { error: prizeError } = await supabase
          .from('users')
          .update({
            tokens: supabase.raw(`tokens + ${prizeAmount}`)
          })
          .eq('id', winnerId);

        if (prizeError) {
          console.error('❌ [OpponentAssignment] Error awarding prize:', prizeError);
        } else {
          console.log('✅ [OpponentAssignment] Prize awarded to winner:', winnerId);
        }

        // Record prize transaction
        await supabase
          .from('token_transactions')
          .insert({
            user_id: winnerId,
            amount: prizeAmount,
            type: 'game_win',
            description: `1v1 Match Win - ${gameType}`,
            balance_before: 0, // Will be calculated by trigger
            balance_after: 0,  // Will be calculated by trigger
            metadata: {
              match_id: matchData.id,
              game_type: gameType,
              opponent_name: isWinner ? opponent.username : username,
              lot_number: lotNumber
            }
          });
      }

      console.log('🎉 [OpponentAssignment] Match completed successfully!');
      console.log('🎉 [OpponentAssignment] Match ID:', matchData.id);

      return {
        matched: true,
        opponent: {
          queueId: opponent.id,
          userId: opponent.user_id,
          username: opponent.username,
          gameType: opponent.game_type,
          entryFee: opponent.entry_fee,
          lotNumber: opponent.lot_number,
          playerScore: opponent.player_score,
          status: 'matched',
          matchedWithQueueId: queueId,
          opponentName: username,
          opponentScore: playerScore,
          matchId: matchData.id
        },
        matchId: matchData.id
      };

    } catch (error) {
      console.error('❌ [OpponentAssignment] Exception:', error);
      return { matched: false };
    }
  }

  /**
   * Get match details for a completed game
   */
  static async getMatchDetails(matchId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) {
        console.error('❌ [OpponentAssignment] Error fetching match:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ [OpponentAssignment] Exception fetching match:', error);
      return null;
    }
  }

  /**
   * Get all matches for a user
   */
  static async getUserMatches(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [OpponentAssignment] Error fetching user matches:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [OpponentAssignment] Exception fetching user matches:', error);
      return [];
    }
  }
}

export default OpponentAssignmentService;
