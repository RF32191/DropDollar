import { supabase } from './client';

export interface PlayerSkillRating {
  id: string;
  user_id: string;
  game_type: string;
  skill_rating: number;
  games_played: number;
  wins: number;
  losses: number;
  win_streak: number;
  highest_rating: number;
  last_match_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchmakingQueueEntry {
  id: string;
  user_id: string;
  game_type: string;
  bet_amount: number;
  skill_rating: number;
  preferred_rating_range: number;
  queue_joined_at: string;
  status: 'waiting' | 'matched' | 'cancelled';
  match_id: string | null;
  expires_at: string;
}

export interface PvPMatch {
  id: string;
  match_type: string;
  game_type: string;
  bet_amount: number;
  player1_id: string;
  player1_rating: number;
  player1_score: number | null;
  player1_completed_at: string | null;
  player2_id: string | null;
  player2_rating: number | null;
  player2_score: number | null;
  player2_completed_at: string | null;
  winner_id: string | null;
  prize_pool: number;
  platform_fee: number;
  winner_payout: number;
  status: 'waiting_for_opponent' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string;
}

export interface MatchHistoryEntry {
  id: string;
  match_id: string;
  player_id: string;
  opponent_id: string;
  game_type: string;
  bet_amount: number;
  player_score: number;
  opponent_score: number;
  is_winner: boolean;
  rating_before: number;
  rating_after: number;
  rating_change: number;
  match_duration_seconds: number | null;
  completed_at: string;
}

export class SkillMatchmakingService {
  // ELO Rating System Constants
  private static readonly K_FACTOR = 32; // Rating change multiplier
  private static readonly DEFAULT_RATING = 1200;
  private static readonly RATING_RANGES = {
    BRONZE: { min: 0, max: 1199, name: 'Bronze', color: 'amber' },
    SILVER: { min: 1200, max: 1499, name: 'Silver', color: 'gray' },
    GOLD: { min: 1500, max: 1799, name: 'Gold', color: 'yellow' },
    PLATINUM: { min: 1800, max: 2099, name: 'Platinum', color: 'blue' },
    DIAMOND: { min: 2100, max: 2399, name: 'Diamond', color: 'purple' },
    MASTER: { min: 2400, max: 2699, name: 'Master', color: 'red' },
    GRANDMASTER: { min: 2700, max: Infinity, name: 'Grandmaster', color: 'rainbow' }
  };

  /**
   * Get or create player skill ratings for all game types
   */
  static async getPlayerSkillRatings(userId: string): Promise<PlayerSkillRating[]> {
    const { data, error } = await supabase
      .from('player_skill_ratings')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to fetch skill ratings: ${error.message}`);
    }

    // If no ratings exist, they should be created by the trigger, but let's ensure they exist
    if (!data || data.length === 0) {
      await this.initializePlayerRatings(userId);
      return this.getPlayerSkillRatings(userId);
    }

    return data;
  }

  /**
   * Get player's skill rating for a specific game type
   */
  static async getPlayerRating(userId: string, gameType: string): Promise<PlayerSkillRating> {
    const { data, error } = await supabase
      .from('player_skill_ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('game_type', gameType)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rating exists, create one
        await this.initializePlayerRatings(userId);
        return this.getPlayerRating(userId, gameType);
      }
      throw new Error(`Failed to fetch player rating: ${error.message}`);
    }

    return data;
  }

  /**
   * Initialize skill ratings for a new player
   */
  private static async initializePlayerRatings(userId: string): Promise<void> {
    const gameTypes = ['multi-target', 'falling-objects', 'color-sequence'];
    const ratingsToInsert = gameTypes.map(gameType => ({
      user_id: userId,
      game_type: gameType,
      skill_rating: this.DEFAULT_RATING,
      games_played: 0,
      wins: 0,
      losses: 0,
      win_streak: 0,
      highest_rating: this.DEFAULT_RATING
    }));

    const { error } = await supabase
      .from('player_skill_ratings')
      .insert(ratingsToInsert);

    if (error && error.code !== '23505') { // Ignore duplicate key errors
      throw new Error(`Failed to initialize player ratings: ${error.message}`);
    }
  }

  /**
   * Calculate ELO rating change based on match result
   */
  static calculateRatingChange(
    playerRating: number, 
    opponentRating: number, 
    playerWon: boolean
  ): number {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const actualScore = playerWon ? 1 : 0;
    return Math.round(this.K_FACTOR * (actualScore - expectedScore));
  }

  /**
   * Get skill tier information based on rating
   */
  static getSkillTier(rating: number): { name: string; color: string; min: number; max: number } {
    for (const tier of Object.values(this.RATING_RANGES)) {
      if (rating >= tier.min && rating <= tier.max) {
        return tier;
      }
    }
    return this.RATING_RANGES.BRONZE; // Fallback
  }

  /**
   * Join matchmaking queue
   */
  static async joinMatchmakingQueue(
    userId: string,
    gameType: string,
    betAmount: number,
    preferredRatingRange: number = 100
  ): Promise<MatchmakingQueueEntry> {
    // Get player's current rating
    const playerRating = await this.getPlayerRating(userId, gameType);

    // Remove any existing queue entries for this user and game type
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', userId)
      .eq('game_type', gameType);

    // Add to queue
    const { data, error } = await supabase
      .from('matchmaking_queue')
      .insert({
        user_id: userId,
        game_type: gameType,
        bet_amount: betAmount,
        skill_rating: playerRating.skill_rating,
        preferred_rating_range: preferredRatingRange,
        status: 'waiting'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to join matchmaking queue: ${error.message}`);
    }

    // Try to find a match immediately
    setTimeout(() => this.processMatchmaking(gameType, betAmount), 1000);

    return data;
  }

  /**
   * Process matchmaking to find suitable opponents
   */
  static async processMatchmaking(gameType: string, betAmount: number): Promise<void> {
    const { data: queueEntries, error } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('game_type', gameType)
      .eq('bet_amount', betAmount)
      .eq('status', 'waiting')
      .order('queue_joined_at', { ascending: true });

    if (error || !queueEntries || queueEntries.length < 2) {
      return; // Not enough players to match
    }

    // Try to match players with similar skill ratings
    for (let i = 0; i < queueEntries.length - 1; i++) {
      const player1 = queueEntries[i];
      
      for (let j = i + 1; j < queueEntries.length; j++) {
        const player2 = queueEntries[j];
        
        // Check if ratings are within acceptable range
        const ratingDiff = Math.abs(player1.skill_rating - player2.skill_rating);
        const maxRange = Math.max(player1.preferred_rating_range, player2.preferred_rating_range);
        
        if (ratingDiff <= maxRange) {
          // Create match
          await this.createMatch(player1, player2);
          return; // Exit after creating one match
        }
      }
    }

    // If no close matches found, gradually expand search range for older queue entries
    const oldEntries = queueEntries.filter(entry => {
      const waitTime = Date.now() - new Date(entry.queue_joined_at).getTime();
      return waitTime > 30000; // 30 seconds
    });

    if (oldEntries.length >= 2) {
      // Match the two oldest entries regardless of rating difference
      await this.createMatch(oldEntries[0], oldEntries[1]);
    }
  }

  /**
   * Create a PvP match between two players
   */
  private static async createMatch(
    player1: MatchmakingQueueEntry,
    player2: MatchmakingQueueEntry
  ): Promise<PvPMatch> {
    const prizePool = player1.bet_amount + player2.bet_amount;
    const platformFee = prizePool * 0.15;
    const winnerPayout = prizePool - platformFee;

    // Create the match
    const { data: match, error: matchError } = await supabase
      .from('pvp_matches')
      .insert({
        game_type: player1.game_type,
        bet_amount: player1.bet_amount,
        player1_id: player1.user_id,
        player1_rating: player1.skill_rating,
        player2_id: player2.user_id,
        player2_rating: player2.skill_rating,
        prize_pool: prizePool,
        platform_fee: platformFee,
        winner_payout: winnerPayout,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (matchError) {
      throw new Error(`Failed to create match: ${matchError.message}`);
    }

    // Update queue entries to matched status
    await supabase
      .from('matchmaking_queue')
      .update({ status: 'matched', match_id: match.id })
      .in('id', [player1.id, player2.id]);

    return match;
  }

  /**
   * Submit match result and update ratings
   */
  static async submitMatchResult(
    matchId: string,
    playerId: string,
    score: number
  ): Promise<void> {
    // Get match details
    const { data: match, error: matchError } = await supabase
      .from('pvp_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      throw new Error('Match not found');
    }

    // Update player's score
    const isPlayer1 = match.player1_id === playerId;
    const updateField = isPlayer1 ? 'player1_score' : 'player2_score';
    const updateCompletedField = isPlayer1 ? 'player1_completed_at' : 'player2_completed_at';

    await supabase
      .from('pvp_matches')
      .update({
        [updateField]: score,
        [updateCompletedField]: new Date().toISOString()
      })
      .eq('id', matchId);

    // Check if both players have completed
    const { data: updatedMatch } = await supabase
      .from('pvp_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (updatedMatch && 
        updatedMatch.player1_score !== null && 
        updatedMatch.player2_score !== null) {
      // Both players completed, determine winner and update ratings
      await this.finalizeMatch(updatedMatch);
    }
  }

  /**
   * Finalize match results and update player ratings
   */
  private static async finalizeMatch(match: PvPMatch): Promise<void> {
    const player1Won = match.player1_score! > match.player2_score!;
    const winnerId = player1Won ? match.player1_id : match.player2_id!;

    // Calculate rating changes
    const player1Change = this.calculateRatingChange(
      match.player1_rating,
      match.player2_rating!,
      player1Won
    );
    const player2Change = this.calculateRatingChange(
      match.player2_rating!,
      match.player1_rating,
      !player1Won
    );

    // Update match with winner
    await supabase
      .from('pvp_matches')
      .update({
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', match.id);

    // Update player ratings
    await this.updatePlayerRating(match.player1_id, match.game_type, player1Change, player1Won);
    await this.updatePlayerRating(match.player2_id!, match.game_type, player2Change, !player1Won);

    // Record match history
    await this.recordMatchHistory(match, player1Change, player2Change);
  }

  /**
   * Update player's skill rating
   */
  private static async updatePlayerRating(
    playerId: string,
    gameType: string,
    ratingChange: number,
    won: boolean
  ): Promise<void> {
    const { data: currentRating } = await supabase
      .from('player_skill_ratings')
      .select('*')
      .eq('user_id', playerId)
      .eq('game_type', gameType)
      .single();

    if (!currentRating) return;

    const newRating = Math.max(0, currentRating.skill_rating + ratingChange);
    const newWinStreak = won ? currentRating.win_streak + 1 : 0;

    await supabase
      .from('player_skill_ratings')
      .update({
        skill_rating: newRating,
        games_played: currentRating.games_played + 1,
        wins: won ? currentRating.wins + 1 : currentRating.wins,
        losses: won ? currentRating.losses : currentRating.losses + 1,
        win_streak: newWinStreak,
        highest_rating: Math.max(currentRating.highest_rating, newRating),
        last_match_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', playerId)
      .eq('game_type', gameType);
  }

  /**
   * Record match history for both players
   */
  private static async recordMatchHistory(
    match: PvPMatch,
    player1Change: number,
    player2Change: number
  ): Promise<void> {
    const matchDuration = match.started_at && match.completed_at 
      ? Math.round((new Date(match.completed_at).getTime() - new Date(match.started_at).getTime()) / 1000)
      : null;

    const historyEntries = [
      {
        match_id: match.id,
        player_id: match.player1_id,
        opponent_id: match.player2_id!,
        game_type: match.game_type,
        bet_amount: match.bet_amount,
        player_score: match.player1_score!,
        opponent_score: match.player2_score!,
        is_winner: match.winner_id === match.player1_id,
        rating_before: match.player1_rating,
        rating_after: match.player1_rating + player1Change,
        rating_change: player1Change,
        match_duration_seconds: matchDuration
      },
      {
        match_id: match.id,
        player_id: match.player2_id!,
        opponent_id: match.player1_id,
        game_type: match.game_type,
        bet_amount: match.bet_amount,
        player_score: match.player2_score!,
        opponent_score: match.player1_score!,
        is_winner: match.winner_id === match.player2_id,
        rating_before: match.player2_rating!,
        rating_after: match.player2_rating! + player2Change,
        rating_change: player2Change,
        match_duration_seconds: matchDuration
      }
    ];

    await supabase
      .from('match_history')
      .insert(historyEntries);
  }

  /**
   * Get player's match history
   */
  static async getPlayerMatchHistory(
    playerId: string,
    gameType?: string,
    limit: number = 20
  ): Promise<MatchHistoryEntry[]> {
    let query = supabase
      .from('match_history')
      .select('*')
      .eq('player_id', playerId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (gameType) {
      query = query.eq('game_type', gameType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch match history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get active matches for a player
   */
  static async getPlayerActiveMatches(playerId: string): Promise<PvPMatch[]> {
    const { data, error } = await supabase
      .from('pvp_matches')
      .select('*')
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .in('status', ['waiting_for_opponent', 'in_progress'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch active matches: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Cancel matchmaking queue entry
   */
  static async cancelMatchmaking(userId: string, gameType: string): Promise<void> {
    await supabase
      .from('matchmaking_queue')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('game_type', gameType)
      .eq('status', 'waiting');
  }

  /**
   * Get leaderboard for a specific game type
   */
  static async getLeaderboard(
    gameType: string,
    limit: number = 50
  ): Promise<PlayerSkillRating[]> {
    const { data, error } = await supabase
      .from('player_skill_ratings')
      .select(`
        *,
        users:user_id (
          id,
          email
        )
      `)
      .eq('game_type', gameType)
      .order('skill_rating', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch leaderboard: ${error.message}`);
    }

    return data || [];
  }
}
