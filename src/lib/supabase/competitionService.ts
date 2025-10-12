/**
 * Competition Service
 * Handles all competition entries, tournaments, and listings
 * 
 * Entry System:
 * - $1 = 1 game attempt
 * - $2 = 2 game attempts  
 * - $3 = 3 game attempts (max)
 * 
 * Scores are hidden until player completes all their games
 */

import { supabase } from './supabaseClient';
import { generate20Seeds, getSeedForEntry, type RNGSeed } from '../rngSeeds';

export interface CompetitionEntry {
  id: string;
  userId: string;
  listingId?: string;
  tournamentId?: string;
  gameType: string;
  entryNumber: number;
  entryFee: number; // $1, $2, or $3
  attemptsAllowed: number; // 1, 2, or 3
  attemptsUsed: number;
  scores: number[]; // Array of scores from attempts
  bestScore: number;
  averageScore: number;
  isCompleted: boolean;
  scoresHidden: boolean; // Hide until player finishes
  rngSeed?: number; // The specific seed for this entry
  createdAt: string;
  completedAt?: string;
}

export interface Competition {
  id: string;
  type: 'listing' | 'tournament' | 'hot-sell';
  gameType: string;
  title: string;
  prizeAmount: number;
  entryFee: number;
  maxEntries?: number;
  currentEntries: number;
  status: 'open' | 'in-progress' | 'completed';
  rngSeeds: RNGSeed[]; // 20 pre-generated seeds
  winnerId?: string;
  startDate: string;
  endDate?: string;
}

export class CompetitionService {
  /**
   * Create a new competition (listing, tournament, or hot-sell)
   */
  static async createCompetition(data: {
    type: 'listing' | 'tournament' | 'hot-sell';
    gameType: string;
    title: string;
    prizeAmount: number;
    entryFee: number;
    maxEntries?: number;
  }): Promise<Competition | null> {
    try {
      console.log('🏆 [Competition] Creating new competition:', data.title);

      // Generate 20 RNG seeds for this competition
      const tempId = `temp-${Date.now()}`;
      const rngSeeds = generate20Seeds(data.gameType, tempId);

      const competition: Competition = {
        id: tempId,
        type: data.type,
        gameType: data.gameType,
        title: data.title,
        prizeAmount: data.prizeAmount,
        entryFee: data.entryFee,
        maxEntries: data.maxEntries,
        currentEntries: 0,
        status: 'open',
        rngSeeds,
        startDate: new Date().toISOString()
      };

      // Store in Supabase listings table
      const { data: listing, error } = await supabase
        .from('listings')
        .insert([{
          title: competition.title,
          description: `${data.gameType} competition - Win $${data.prizeAmount}!`,
          game_type: data.gameType,
          entry_fee: data.entryFee,
          prize_amount: data.prizeAmount,
          max_entries: data.maxEntries || 999,
          current_entries: 0,
          status: 'active',
          competition_type: data.type,
          rng_seeds: rngSeeds,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [Competition] Error creating:', error);
        return null;
      }

      console.log('✅ [Competition] Created:', listing.id);
      competition.id = listing.id;
      return competition;
    } catch (error) {
      console.error('❌ [Competition] Exception:', error);
      return null;
    }
  }

  /**
   * Enter a competition
   * $1 = 1 attempt, $2 = 2 attempts, $3 = 3 attempts
   */
  static async enterCompetition(data: {
    userId: string;
    competitionId: string;
    gameType: string;
    entryFee: number; // $1, $2, or $3
  }): Promise<CompetitionEntry | null> {
    try {
      console.log('🎮 [Competition] User entering:', data.userId);

      // Validate entry fee
      if (![1, 2, 3].includes(data.entryFee)) {
        throw new Error('Entry fee must be $1, $2, or $3');
      }

      // Get competition to find RNG seeds
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', data.competitionId)
        .single();

      if (listingError || !listing) {
        console.error('❌ [Competition] Listing not found');
        return null;
      }

      // Get current entry count to determine entry number
      const { count } = await supabase
        .from('listing_entries')
        .select('*', { count: 'exact', head: true })
        .eq('listing_id', data.competitionId);

      const entryNumber = (count || 0) + 1;

      // Get the appropriate RNG seed for this entry
      const rngSeeds = listing.rng_seeds as RNGSeed[] || [];
      const assignedSeed = getSeedForEntry(rngSeeds, entryNumber);

      const entry: CompetitionEntry = {
        id: '',
        userId: data.userId,
        listingId: data.competitionId,
        gameType: data.gameType,
        entryNumber,
        entryFee: data.entryFee,
        attemptsAllowed: data.entryFee, // $1=1 attempt, $2=2, $3=3
        attemptsUsed: 0,
        scores: [],
        bestScore: 0,
        averageScore: 0,
        isCompleted: false,
        scoresHidden: true, // Hide until completed
        rngSeed: assignedSeed?.seed,
        createdAt: new Date().toISOString()
      };

      // Store in Supabase
      const { data: dbEntry, error } = await supabase
        .from('listing_entries')
        .insert([{
          user_id: entry.userId,
          listing_id: entry.listingId,
          game_type: entry.gameType,
          entry_number: entry.entryNumber,
          entry_fee: entry.entryFee,
          attempts_allowed: entry.attemptsAllowed,
          attempts_used: 0,
          scores: [],
          best_score: 0,
          average_score: 0,
          is_completed: false,
          scores_hidden: true,
          rng_seed: entry.rngSeed,
          created_at: entry.createdAt
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [Competition] Error creating entry:', error);
        return null;
      }

      entry.id = dbEntry.id;
      console.log('✅ [Competition] Entry created:', entry.id);
      console.log(`🎲 [Competition] Assigned RNG seed ${assignedSeed?.seedIndex}/20`);

      // Update listing entry count
      await supabase
        .from('listings')
        .update({ current_entries: entryNumber })
        .eq('id', data.competitionId);

      return entry;
    } catch (error) {
      console.error('❌ [Competition] Exception:', error);
      return null;
    }
  }

  /**
   * Submit a game score for a competition entry
   */
  static async submitGameScore(data: {
    entryId: string;
    score: number;
    accuracy: number;
    reactionTime?: number;
  }): Promise<boolean> {
    try {
      console.log('📊 [Competition] Submitting score:', data.score);

      // Get current entry
      const { data: entry, error: fetchError } = await supabase
        .from('listing_entries')
        .select('*')
        .eq('id', data.entryId)
        .single();

      if (fetchError || !entry) {
        console.error('❌ [Competition] Entry not found');
        return false;
      }

      // Check if attempts remaining
      if (entry.attempts_used >= entry.attempts_allowed) {
        console.error('❌ [Competition] No attempts remaining');
        return false;
      }

      // Add score to array
      const scores = [...(entry.scores || []), data.score];
      const attemptsUsed = entry.attempts_used + 1;
      const isCompleted = attemptsUsed >= entry.attempts_allowed;

      // Calculate best and average
      const bestScore = Math.max(...scores);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Update entry
      const { error: updateError } = await supabase
        .from('listing_entries')
        .update({
          scores,
          attempts_used: attemptsUsed,
          best_score: bestScore,
          average_score: averageScore,
          is_completed: isCompleted,
          scores_hidden: !isCompleted, // Reveal scores when completed
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', data.entryId);

      if (updateError) {
        console.error('❌ [Competition] Error updating entry:', updateError);
        return false;
      }

      console.log('✅ [Competition] Score submitted');
      console.log(`📊 [Competition] Attempt ${attemptsUsed}/${entry.attempts_allowed}`);
      if (isCompleted) {
        console.log('🏁 [Competition] Entry completed! Scores now visible.');
      }

      return true;
    } catch (error) {
      console.error('❌ [Competition] Exception:', error);
      return false;
    }
  }

  /**
   * Get competition leaderboard
   * Only shows completed entries (scores revealed)
   */
  static async getLeaderboard(competitionId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('listing_entries')
        .select(`
          *,
          users (
            username,
            email
          )
        `)
        .eq('listing_id', competitionId)
        .eq('is_completed', true)
        .order('best_score', { ascending: false });

      if (error) {
        console.error('❌ [Competition] Error fetching leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [Competition] Exception:', error);
      return [];
    }
  }

  /**
   * Get user's entry for a competition
   */
  static async getUserEntry(userId: string, competitionId: string): Promise<CompetitionEntry | null> {
    try {
      const { data, error } = await supabase
        .from('listing_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('listing_id', competitionId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        listingId: data.listing_id,
        gameType: data.game_type,
        entryNumber: data.entry_number,
        entryFee: data.entry_fee,
        attemptsAllowed: data.attempts_allowed,
        attemptsUsed: data.attempts_used,
        scores: data.scores || [],
        bestScore: data.best_score || 0,
        averageScore: data.average_score || 0,
        isCompleted: data.is_completed || false,
        scoresHidden: data.scores_hidden !== false,
        rngSeed: data.rng_seed,
        createdAt: data.created_at,
        completedAt: data.completed_at
      };
    } catch (error) {
      console.error('❌ [Competition] Exception:', error);
      return null;
    }
  }
}

export default CompetitionService;

