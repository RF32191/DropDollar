import { supabase } from './client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface TournamentCategory {
  id: string;
  name: string;
  description: string;
  prize_pool: number;
  max_bet: number;
  max_participants: number;
  game_type: 'multi-target' | 'falling-objects' | 'color-sequence';
  tournament_type: 'multi' | '1v1';
  duration_hours: number;
  created_at: string;
  updated_at: string;
}

export interface ActiveTournament {
  id: string;
  category_id: string;
  title: string;
  description: string;
  prize_pool: number;
  entry_fee: number;
  max_participants: number;
  current_participants: number;
  game_type: 'multi-target' | 'falling-objects' | 'color-sequence';
  tournament_type: 'multi' | '1v1';
  
  // 1v1 specific
  player1_id?: string;
  player2_id?: string;
  challenger_id?: string;
  bet_amount?: number;
  
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  start_time?: string;
  end_time?: string;
  deadline: string;
  
  generation_round: number;
  auto_generated: boolean;
  parent_tournament_id?: string;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  category?: TournamentCategory;
  participants?: TournamentParticipant[];
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  entry_fee_paid: number;
  joined_at: string;
  best_score: number;
  attempts_used: number;
  max_attempts: number;
  final_rank?: number;
  prize_won: number;
  payout_status: 'pending' | 'paid' | 'failed';
  payout_date?: string;
}

export interface WeeklyTournamentWin {
  id: string;
  user_id: string;
  tournament_category_id: string;
  tournament_id: string;
  prize_amount: number;
  final_rank: number;
  game_type: string;
  tournament_type: string;
  week_start_date: string;
  week_end_date: string;
  won_at: string;
}

export interface UserTournamentCooldown {
  id: string;
  user_id: string;
  tournament_category_id: string;
  last_win_date: string;
  cooldown_until: string;
  win_count_this_week: number;
  week_start_date: string;
}

export interface MatchTier {
  id: string;
  name: string;
  bet_amount: number;
  description: string;
  game_type: 'multi-target' | 'falling-objects' | 'color-sequence';
  created_at: string;
}

export interface TournamentGameSession {
  id: string;
  tournament_id: string;
  participant_id: string;
  user_id: string;
  game_type: string;
  score: number;
  duration_seconds?: number;
  session_data?: any;
  is_best_score: boolean;
  played_at: string;
}

// ============================================================================
// TOURNAMENT SERVICE
// ============================================================================

export class EnhancedTournamentService {
  
  // ============================================================================
  // TOURNAMENT CATEGORIES
  // ============================================================================
  
  static async getTournamentCategories(): Promise<TournamentCategory[]> {
    try {
      const { data, error } = await supabase
        .from('tournament_categories')
        .select('*')
        .order('prize_pool', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tournament categories:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // ACTIVE TOURNAMENTS
  // ============================================================================
  
  static async getActiveTournaments(): Promise<ActiveTournament[]> {
    try {
      const { data, error } = await supabase
        .from('active_tournaments')
        .select(`
          *,
          category:tournament_categories(*),
          participants:tournament_participants(*)
        `)
        .in('status', ['waiting', 'active'])
        .order('prize_pool', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active tournaments:', error);
      throw error;
    }
  }
  
  static async getTournamentById(tournamentId: string): Promise<ActiveTournament | null> {
    try {
      const { data, error } = await supabase
        .from('active_tournaments')
        .select(`
          *,
          category:tournament_categories(*),
          participants:tournament_participants(*)
        `)
        .eq('id', tournamentId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tournament:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // USER PARTICIPATION
  // ============================================================================
  
  static async canUserParticipate(userId: string, categoryId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('can_user_participate', {
          p_user_id: userId,
          p_category_id: categoryId
        });
      
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking user participation eligibility:', error);
      return false;
    }
  }
  
  static async joinTournament(
    tournamentId: string, 
    userId: string, 
    entryFee: number
  ): Promise<TournamentParticipant> {
    try {
      // First check if user can participate
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) throw new Error('Tournament not found');
      
      const canParticipate = await this.canUserParticipate(userId, tournament.category_id);
      if (!canParticipate) {
        throw new Error('User cannot participate in this tournament category this week');
      }
      
      // Check if tournament is full
      if (tournament.current_participants >= tournament.max_participants) {
        throw new Error('Tournament is full');
      }
      
      // Check if user already joined
      const { data: existingParticipant } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();
      
      if (existingParticipant) {
        throw new Error('User already joined this tournament');
      }
      
      // Join tournament
      const { data, error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          user_id: userId,
          entry_fee_paid: entryFee,
          max_attempts: 1 // Only 1 submission per user
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update tournament participant count
      await supabase
        .from('active_tournaments')
        .update({ 
          current_participants: tournament.current_participants + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);
      
      return data;
    } catch (error) {
      console.error('Error joining tournament:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // GAME SESSIONS
  // ============================================================================
  
  static async recordGameSession(
    tournamentId: string,
    participantId: string,
    userId: string,
    gameType: string,
    score: number,
    durationSeconds?: number,
    sessionData?: any
  ): Promise<TournamentGameSession> {
    try {
      // Get current participant data
      const { data: participant, error: participantError } = await supabase
        .from('tournament_participants')
        .select('best_score, attempts_used, max_attempts')
        .eq('id', participantId)
        .single();
      
      if (participantError) throw participantError;
      
      // Check if user has attempts left
      if (participant.attempts_used >= participant.max_attempts) {
        throw new Error('No attempts remaining');
      }
      
      const isBestScore = score > participant.best_score;
      
      // Record game session
      const { data: session, error: sessionError } = await supabase
        .from('tournament_game_sessions')
        .insert({
          tournament_id: tournamentId,
          participant_id: participantId,
          user_id: userId,
          game_type: gameType,
          score: score,
          duration_seconds: durationSeconds,
          session_data: sessionData,
          is_best_score: isBestScore
        })
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      
      // Update participant record
      const updateData: any = {
        attempts_used: participant.attempts_used + 1
      };
      
      if (isBestScore) {
        updateData.best_score = score;
      }
      
      await supabase
        .from('tournament_participants')
        .update(updateData)
        .eq('id', participantId);
      
      return session;
    } catch (error) {
      console.error('Error recording game session:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // TOURNAMENT COMPLETION
  // ============================================================================
  
  static async completeTournament(tournamentId: string): Promise<void> {
    try {
      // Get tournament participants ordered by best score
      const { data: participants, error: participantsError } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('best_score', { ascending: false });
      
      if (participantsError) throw participantsError;
      
      if (!participants || participants.length === 0) {
        throw new Error('No participants found');
      }
      
      // Get tournament details
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) throw new Error('Tournament not found');
      
      // Calculate prize distribution (winner takes all for now)
      const winner = participants[0];
      const prizeAmount = tournament.prize_pool;
      
      // Update winner's participant record
      await supabase
        .from('tournament_participants')
        .update({
          final_rank: 1,
          prize_won: prizeAmount,
          payout_status: 'pending'
        })
        .eq('id', winner.id);
      
      // Update other participants' ranks
      for (let i = 1; i < participants.length; i++) {
        await supabase
          .from('tournament_participants')
          .update({
            final_rank: i + 1,
            prize_won: 0,
            payout_status: 'paid' // No prize, so mark as paid
          })
          .eq('id', participants[i].id);
      }
      
      // Record winner's weekly win and set cooldown
      await supabase.rpc('record_tournament_win', {
        p_user_id: winner.user_id,
        p_tournament_id: tournamentId,
        p_category_id: tournament.category_id,
        p_prize_amount: prizeAmount,
        p_final_rank: 1
      });
      
      // Mark tournament as completed
      await supabase
        .from('active_tournaments')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);
      
      // Auto-generation will be triggered by the database trigger
      
    } catch (error) {
      console.error('Error completing tournament:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // 1V1 MATCHES
  // ============================================================================
  
  static async getMatchTiers(): Promise<MatchTier[]> {
    try {
      const { data, error } = await supabase
        .from('match_tiers')
        .select('*')
        .order('bet_amount', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching match tiers:', error);
      throw error;
    }
  }
  
  static async createMatch(
    challengerId: string,
    betAmount: number,
    gameType: string
  ): Promise<ActiveTournament> {
    try {
      // Check if challenger can participate
      const matchTier = await supabase
        .from('match_tiers')
        .select('*')
        .eq('bet_amount', betAmount)
        .eq('game_type', gameType)
        .single();
      
      if (!matchTier.data) throw new Error('Invalid match tier');
      
      // Create 1v1 match tournament
      const { data, error } = await supabase
        .from('active_tournaments')
        .insert({
          category_id: matchTier.data.id, // Using match tier as category
          title: `${matchTier.data.name} - $${betAmount}`,
          description: `1v1 ${gameType} match for $${betAmount}`,
          prize_pool: betAmount * 2, // Winner takes both bets
          entry_fee: betAmount,
          max_participants: 2,
          current_participants: 1,
          game_type: gameType,
          tournament_type: '1v1',
          challenger_id: challengerId,
          bet_amount: betAmount,
          deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour to find opponent
          status: 'waiting'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add challenger as participant
      await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: data.id,
          user_id: challengerId,
          entry_fee_paid: betAmount,
          max_attempts: 1
        });
      
      return data;
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }
  
  static async joinMatch(
    matchId: string,
    userId: string
  ): Promise<ActiveTournament> {
    try {
      const match = await this.getTournamentById(matchId);
      if (!match) throw new Error('Match not found');
      
      if (match.tournament_type !== '1v1') {
        throw new Error('Not a 1v1 match');
      }
      
      if (match.current_participants >= 2) {
        throw new Error('Match is full');
      }
      
      if (match.challenger_id === userId) {
        throw new Error('Cannot join your own match');
      }
      
      // Join as participant
      await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: matchId,
          user_id: userId,
          entry_fee_paid: match.bet_amount || match.entry_fee,
          max_attempts: 1
        });
      
      // Update match
      const { data, error } = await supabase
        .from('active_tournaments')
        .update({
          player2_id: userId,
          current_participants: 2,
          status: 'active',
          start_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error joining match:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // USER STATISTICS
  // ============================================================================
  
  static async getUserWeeklyWins(userId: string): Promise<WeeklyTournamentWin[]> {
    try {
      const { data, error } = await supabase
        .from('weekly_tournament_wins')
        .select('*')
        .eq('user_id', userId)
        .order('won_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user weekly wins:', error);
      throw error;
    }
  }
  
  static async getUserCooldowns(userId: string): Promise<UserTournamentCooldown[]> {
    try {
      const { data, error } = await supabase
        .from('user_tournament_cooldowns')
        .select('*')
        .eq('user_id', userId)
        .gte('cooldown_until', new Date().toISOString());
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user cooldowns:', error);
      throw error;
    }
  }
  
  static async getUserTournamentHistory(userId: string): Promise<TournamentParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          tournament:active_tournaments(*)
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user tournament history:', error);
      throw error;
    }
  }
}

export default EnhancedTournamentService;
