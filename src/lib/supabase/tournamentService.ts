import { supabase } from './client';

export interface Tournament {
  id: string;
  name: string;
  game_type: string;
  entry_fee: number;
  max_participants: number;
  prize_pool: number;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  skill_rating: number;
  entry_fee_paid: number;
  status: 'active' | 'eliminated' | 'winner';
  placement?: number;
  prize_won: number;
  joined_at: string;
}

export interface HotSellListing {
  id: string;
  title: string;
  description?: string;
  game_type: string;
  entry_fee: number;
  prize_pool: number;
  prize_distribution: { [key: string]: number };
  max_participants: number;
  status: 'active' | 'completed' | 'cancelled';
  created_by: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface HotSellParticipant {
  id: string;
  listing_id: string;
  user_id: string;
  entry_fee_paid: number;
  score?: number;
  placement?: number;
  prize_won: number;
  joined_at: string;
}

export interface GroupBattle {
  id: string;
  name: string;
  game_type: string;
  entry_fee: number;
  max_participants: number;
  prize_pool: number;
  prize_distribution: { [key: string]: number };
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export class TournamentService {
  /**
   * Create a 1v1 tournament
   */
  static async create1v1Tournament(
    name: string,
    gameType: string,
    entryFee: number = 1
  ): Promise<Tournament | null> {
    try {
      console.log('🏆 [TournamentService] Creating 1v1 tournament:', { name, gameType, entryFee });
      
      const { data, error } = await supabase.rpc('create_1v1_tournament', {
        p_name: name,
        p_game_type: gameType,
        p_entry_fee: entryFee
      });

      if (error) {
        console.error('❌ [TournamentService] Error creating 1v1 tournament:', error);
        return null;
      }

      console.log('✅ [TournamentService] 1v1 tournament created:', data);
      return data;
    } catch (error) {
      console.error('❌ [TournamentService] Exception creating 1v1 tournament:', error);
      return null;
    }
  }

  /**
   * Join a 1v1 tournament
   */
  static async join1v1Tournament(
    tournamentId: string,
    userId: string,
    entryFee: number
  ): Promise<TournamentParticipant | null> {
    try {
      console.log('🎮 [TournamentService] Joining 1v1 tournament:', { tournamentId, userId, entryFee });
      
      const { data, error } = await supabase.rpc('join_1v1_tournament', {
        p_tournament_id: tournamentId,
        p_user_id: userId,
        p_entry_fee: entryFee
      });

      if (error) {
        console.error('❌ [TournamentService] Error joining 1v1 tournament:', error);
        return null;
      }

      console.log('✅ [TournamentService] Joined 1v1 tournament:', data);
      return data;
    } catch (error) {
      console.error('❌ [TournamentService] Exception joining 1v1 tournament:', error);
      return null;
    }
  }

  /**
   * Get tournament participants
   */
  static async getTournamentParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('❌ [TournamentService] Error fetching tournament participants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [TournamentService] Exception fetching tournament participants:', error);
      return [];
    }
  }

  /**
   * Create a hot sell listing
   */
  static async createHotSellListing(
    title: string,
    description: string,
    gameType: string,
    entryFee: number,
    prizePool: number,
    createdBy: string,
    maxParticipants: number = 100
  ): Promise<HotSellListing | null> {
    try {
      console.log('🔥 [TournamentService] Creating hot sell listing:', { title, prizePool });
      
      const { data, error } = await supabase.rpc('create_hot_sell_listing', {
        p_title: title,
        p_description: description,
        p_game_type: gameType,
        p_entry_fee: entryFee,
        p_prize_pool: prizePool,
        p_created_by: createdBy,
        p_max_participants: maxParticipants
      });

      if (error) {
        console.error('❌ [TournamentService] Error creating hot sell listing:', error);
        return null;
      }

      console.log('✅ [TournamentService] Hot sell listing created:', data);
      return data;
    } catch (error) {
      console.error('❌ [TournamentService] Exception creating hot sell listing:', error);
      return null;
    }
  }

  /**
   * Join a hot sell listing
   */
  static async joinHotSellListing(
    listingId: string,
    userId: string,
    entryFee: number
  ): Promise<HotSellParticipant | null> {
    try {
      console.log('💰 [TournamentService] Joining hot sell listing:', { listingId, userId, entryFee });
      
      const { data, error } = await supabase.rpc('join_hot_sell_listing', {
        p_listing_id: listingId,
        p_user_id: userId,
        p_entry_fee: entryFee
      });

      if (error) {
        console.error('❌ [TournamentService] Error joining hot sell listing:', error);
        return null;
      }

      console.log('✅ [TournamentService] Joined hot sell listing:', data);
      return data;
    } catch (error) {
      console.error('❌ [TournamentService] Exception joining hot sell listing:', error);
      return null;
    }
  }

  /**
   * Get active hot sell listings
   */
  static async getActiveHotSellListings(): Promise<HotSellListing[]> {
    try {
      const { data, error } = await supabase
        .from('hot_sell_listings')
        .select('*')
        .eq('status', 'active')
        .order('prize_pool', { ascending: false });

      if (error) {
        console.error('❌ [TournamentService] Error fetching hot sell listings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [TournamentService] Exception fetching hot sell listings:', error);
      return [];
    }
  }

  /**
   * Get hot sell participants for a listing
   */
  static async getHotSellParticipants(listingId: string): Promise<HotSellParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('hot_sell_participants')
        .select('*')
        .eq('listing_id', listingId)
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('❌ [TournamentService] Error fetching hot sell participants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [TournamentService] Exception fetching hot sell participants:', error);
      return [];
    }
  }

  /**
   * Create a group battle
   */
  static async createGroupBattle(
    name: string,
    gameType: string,
    entryFee: number,
    maxParticipants: number = 10,
    prizeDistribution: { [key: string]: number } = { "1st": 0.5, "2nd": 0.3, "3rd": 0.2 },
    createdBy: string
  ): Promise<GroupBattle | null> {
    try {
      console.log('⚔️ [TournamentService] Creating group battle:', { name, maxParticipants });
      
      const { data, error } = await supabase
        .from('group_battles')
        .insert([{
          name,
          game_type: gameType,
          entry_fee: entryFee,
          max_participants: maxParticipants,
          prize_pool: entryFee * maxParticipants,
          prize_distribution: prizeDistribution,
          created_by: createdBy
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [TournamentService] Error creating group battle:', error);
        return null;
      }

      console.log('✅ [TournamentService] Group battle created:', data);
      return data;
    } catch (error) {
      console.error('❌ [TournamentService] Exception creating group battle:', error);
      return null;
    }
  }

  /**
   * Join a group battle
   */
  static async joinGroupBattle(
    battleId: string,
    userId: string,
    entryFee: number
  ): Promise<boolean> {
    try {
      console.log('🎯 [TournamentService] Joining group battle:', { battleId, userId, entryFee });
      
      const { data, error } = await supabase
        .from('group_battle_participants')
        .insert([{
          battle_id: battleId,
          user_id: userId,
          entry_fee_paid: entryFee
        }])
        .select();

      if (error) {
        console.error('❌ [TournamentService] Error joining group battle:', error);
        return false;
      }

      console.log('✅ [TournamentService] Joined group battle:', data);
      return true;
    } catch (error) {
      console.error('❌ [TournamentService] Exception joining group battle:', error);
      return false;
    }
  }

  /**
   * Get active group battles
   */
  static async getActiveGroupBattles(): Promise<GroupBattle[]> {
    try {
      const { data, error } = await supabase
        .from('group_battles')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [TournamentService] Error fetching group battles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [TournamentService] Exception fetching group battles:', error);
      return [];
    }
  }

  /**
   * Calculate prize distribution for hot sell listings
   */
  static calculatePrizeDistribution(
    prizePool: number,
    distribution: { [key: string]: number } = { "1st": 0.5, "2nd": 0.3, "3rd": 0.2 }
  ): { [key: string]: number } {
    const feeRate = 0.15; // 15% fee
    const netPrizePool = prizePool * (1 - feeRate);
    
    return {
      "1st": netPrizePool * distribution["1st"],
      "2nd": netPrizePool * distribution["2nd"],
      "3rd": netPrizePool * distribution["3rd"]
    };
  }

  /**
   * Format prize amounts for display
   */
  static formatPrizeAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}

export default TournamentService;