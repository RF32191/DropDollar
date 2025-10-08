import { supabase } from './client';

export interface DailyTournament {
  id: string;
  name: string;
  description: string;
  game_type: 'multi-target' | 'falling-objects' | 'color-sequence';
  game_name: string;
  entry_fee: number;
  max_participants: number;
  current_participants: number;
  prize_pool: number;
  platform_fee: number;
  final_prize_pool: number;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  day_of_week: string;
  reset_daily: boolean;
  is_filled: boolean;
  winner_id?: string;
  winning_score?: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  username: string;
  entry_time: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_amount: number;
  best_score: number;
  total_attempts: number;
  last_attempt_time?: string;
  is_winner: boolean;
  prize_amount: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentGameSession {
  id: string;
  tournament_id: string;
  participant_id: string;
  user_id: string;
  game_type: string;
  score: number;
  accuracy?: number;
  reaction_time?: number;
  game_duration?: number;
  session_data?: any;
  played_at: string;
  created_at: string;
}

export interface TournamentResult {
  id: string;
  tournament_id: string;
  winner_id: string;
  winner_username: string;
  winning_score: number;
  total_participants: number;
  total_prize_pool: number;
  platform_fee: number;
  winner_prize: number;
  completed_at: string;
  created_at: string;
}

export class TournamentService {
  // Get all active tournaments
  static async getActiveTournaments(): Promise<DailyTournament[]> {
    try {
      const { data, error } = await supabase
        .from('daily_tournaments')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching tournaments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('TournamentService.getActiveTournaments error:', error);
      throw error;
    }
  }

  // Get tournaments by status
  static async getTournamentsByStatus(status: string): Promise<DailyTournament[]> {
    try {
      const { data, error } = await supabase
        .from('daily_tournaments')
        .select('*')
        .eq('status', status)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching tournaments by status:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('TournamentService.getTournamentsByStatus error:', error);
      throw error;
    }
  }

  // Get tournament by ID
  static async getTournamentById(tournamentId: string): Promise<DailyTournament | null> {
    try {
      const { data, error } = await supabase
        .from('daily_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (error) {
        console.error('Error fetching tournament:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('TournamentService.getTournamentById error:', error);
      throw error;
    }
  }

  // Register for tournament
  static async registerForTournament(
    tournamentId: string,
    userId: string,
    username: string
  ): Promise<TournamentParticipant> {
    try {
      // First check if tournament is available
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.is_filled) {
        throw new Error('Tournament is full');
      }

      if (tournament.status !== 'upcoming' && tournament.status !== 'active') {
        throw new Error('Tournament registration is closed');
      }

      // Check if user is already registered
      const { data: existingParticipant } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();

      if (existingParticipant) {
        throw new Error('Already registered for this tournament');
      }

      // Register participant
      const { data, error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          user_id: userId,
          username: username,
          payment_status: 'paid', // Assuming payment is processed elsewhere
          payment_amount: tournament.entry_fee
        })
        .select()
        .single();

      if (error) {
        console.error('Error registering for tournament:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('TournamentService.registerForTournament error:', error);
      throw error;
    }
  }

  // Submit tournament game score
  static async submitTournamentScore(
    tournamentId: string,
    userId: string,
    gameData: {
      score: number;
      accuracy?: number;
      reaction_time?: number;
      game_duration?: number;
      session_data?: any;
    }
  ): Promise<TournamentGameSession> {
    try {
      // Get participant info
      const { data: participant, error: participantError } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();

      if (participantError || !participant) {
        throw new Error('Not registered for this tournament');
      }

      // Get tournament info
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Insert game session
      const { data: session, error: sessionError } = await supabase
        .from('tournament_game_sessions')
        .insert({
          tournament_id: tournamentId,
          participant_id: participant.id,
          user_id: userId,
          game_type: tournament.game_type,
          score: gameData.score,
          accuracy: gameData.accuracy,
          reaction_time: gameData.reaction_time,
          game_duration: gameData.game_duration,
          session_data: gameData.session_data
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error submitting tournament score:', sessionError);
        throw sessionError;
      }

      // Update participant's best score if this is better
      if (gameData.score > participant.best_score) {
        await supabase
          .from('tournament_participants')
          .update({
            best_score: gameData.score,
            total_attempts: participant.total_attempts + 1,
            last_attempt_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', participant.id);
      } else {
        await supabase
          .from('tournament_participants')
          .update({
            total_attempts: participant.total_attempts + 1,
            last_attempt_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', participant.id);
      }

      return session;
    } catch (error) {
      console.error('TournamentService.submitTournamentScore error:', error);
      throw error;
    }
  }

  // Get tournament participants
  static async getTournamentParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('payment_status', 'paid')
        .order('best_score', { ascending: false });

      if (error) {
        console.error('Error fetching tournament participants:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('TournamentService.getTournamentParticipants error:', error);
      throw error;
    }
  }

  // Get user's tournament participation
  static async getUserTournamentParticipation(
    userId: string,
    tournamentId?: string
  ): Promise<TournamentParticipant[]> {
    try {
      let query = supabase
        .from('tournament_participants')
        .select('*')
        .eq('user_id', userId);

      if (tournamentId) {
        query = query.eq('tournament_id', tournamentId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user tournament participation:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('TournamentService.getUserTournamentParticipation error:', error);
      throw error;
    }
  }

  // Complete tournament and determine winner
  static async completeTournament(tournamentId: string): Promise<TournamentResult | null> {
    try {
      // Get all participants with their best scores
      const participants = await this.getTournamentParticipants(tournamentId);
      
      if (participants.length === 0) {
        // No participants, cancel tournament
        await supabase
          .from('daily_tournaments')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', tournamentId);
        return null;
      }

      // Find winner (highest score)
      const winner = participants.reduce((prev, current) => 
        (prev.best_score > current.best_score) ? prev : current
      );

      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Update tournament with winner
      await supabase
        .from('daily_tournaments')
        .update({
          status: 'completed',
          winner_id: winner.user_id,
          winning_score: winner.best_score,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      // Update winner participant
      await supabase
        .from('tournament_participants')
        .update({
          is_winner: true,
          prize_amount: tournament.final_prize_pool,
          updated_at: new Date().toISOString()
        })
        .eq('id', winner.id);

      // Create tournament result record
      const { data: result, error: resultError } = await supabase
        .from('tournament_results')
        .insert({
          tournament_id: tournamentId,
          winner_id: winner.user_id,
          winner_username: winner.username,
          winning_score: winner.best_score,
          total_participants: participants.length,
          total_prize_pool: tournament.prize_pool,
          platform_fee: tournament.platform_fee,
          winner_prize: tournament.final_prize_pool
        })
        .select()
        .single();

      if (resultError) {
        console.error('Error creating tournament result:', resultError);
        throw resultError;
      }

      // Create payout record
      await supabase
        .from('tournament_payouts')
        .insert({
          tournament_id: tournamentId,
          user_id: winner.user_id,
          amount: tournament.final_prize_pool,
          payout_method: 'platform_balance',
          payout_status: 'pending'
        });

      return result;
    } catch (error) {
      console.error('TournamentService.completeTournament error:', error);
      throw error;
    }
  }

  // Generate daily tournaments (call this from a cron job or admin function)
  static async generateDailyTournaments(targetDate?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('generate_daily_tournaments', {
        target_date: targetDate || new Date().toISOString().split('T')[0]
      });

      if (error) {
        console.error('Error generating daily tournaments:', error);
        throw error;
      }
    } catch (error) {
      console.error('TournamentService.generateDailyTournaments error:', error);
      throw error;
    }
  }

  // Get tournament results
  static async getTournamentResults(tournamentId?: string): Promise<TournamentResult[]> {
    try {
      let query = supabase
        .from('tournament_results')
        .select('*');

      if (tournamentId) {
        query = query.eq('tournament_id', tournamentId);
      }

      const { data, error } = await query.order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching tournament results:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('TournamentService.getTournamentResults error:', error);
      throw error;
    }
  }

  // Subscribe to tournament updates
  static subscribeTournamentUpdates(
    tournamentId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_tournaments',
          filter: `id=eq.${tournamentId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`
        },
        callback
      )
      .subscribe();
  }
}

export default TournamentService;
