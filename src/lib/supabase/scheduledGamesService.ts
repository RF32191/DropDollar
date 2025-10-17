import { supabase } from './client';

export interface ScheduledGame {
  id: string;
  title: string;
  description: string;
  game_type: string;
  entry_fee: number;
  prize_pool: number;
  max_participants: number;
  scheduled_time: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ScheduledGameParticipant {
  id: string;
  game_id: string;
  user_id: string;
  entry_fee_paid: number;
  score?: number;
  placement?: number;
  prize_won: number;
  joined_at: string;
}

export class ScheduledGamesService {
  /**
   * Create a scheduled hot sell game
   */
  static async createScheduledGame(gameData: {
    title: string;
    description: string;
    game_type: string;
    entry_fee: number;
    prize_pool: number;
    max_participants: number;
    scheduled_time: string;
  }): Promise<ScheduledGame | null> {
    try {
      console.log('📅 [ScheduledGames] Creating scheduled game:', gameData);
      
      const { data, error } = await supabase
        .from('scheduled_games')
        .insert([{
          title: gameData.title,
          description: gameData.description,
          game_type: gameData.game_type,
          entry_fee: gameData.entry_fee,
          prize_pool: gameData.prize_pool,
          max_participants: gameData.max_participants,
          scheduled_time: gameData.scheduled_time,
          status: 'scheduled',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [ScheduledGames] Error creating scheduled game:', error);
        return null;
      }

      console.log('✅ [ScheduledGames] Scheduled game created:', data);
      return data;
    } catch (error) {
      console.error('❌ [ScheduledGames] Exception creating scheduled game:', error);
      return null;
    }
  }

  /**
   * Get upcoming scheduled games
   */
  static async getUpcomingScheduledGames(): Promise<ScheduledGame[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('scheduled_games')
        .select('*')
        .gte('scheduled_time', now)
        .in('status', ['scheduled', 'active'])
        .order('scheduled_time', { ascending: true });

      if (error) {
        console.error('❌ [ScheduledGames] Error fetching scheduled games:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [ScheduledGames] Exception fetching scheduled games:', error);
      return [];
    }
  }

  /**
   * Join a scheduled game
   */
  static async joinScheduledGame(
    gameId: string,
    userId: string,
    entryFee: number
  ): Promise<ScheduledGameParticipant | null> {
    try {
      console.log('🎯 [ScheduledGames] Joining scheduled game:', { gameId, userId, entryFee });
      
      const { data, error } = await supabase
        .from('scheduled_game_participants')
        .insert([{
          game_id: gameId,
          user_id: userId,
          entry_fee_paid: entryFee,
          prize_won: 0,
          joined_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [ScheduledGames] Error joining scheduled game:', error);
        return null;
      }

      console.log('✅ [ScheduledGames] Joined scheduled game:', data);
      return data;
    } catch (error) {
      console.error('❌ [ScheduledGames] Exception joining scheduled game:', error);
      return null;
    }
  }

  /**
   * Get scheduled game participants
   */
  static async getScheduledGameParticipants(gameId: string): Promise<ScheduledGameParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('scheduled_game_participants')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('❌ [ScheduledGames] Error fetching participants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [ScheduledGames] Exception fetching participants:', error);
      return [];
    }
  }

  /**
   * Update participant score
   */
  static async updateParticipantScore(
    gameId: string,
    userId: string,
    score: number
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('scheduled_game_participants')
        .update({ 
          score: score,
          updated_at: new Date().toISOString()
        })
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('❌ [ScheduledGames] Error updating score:', error);
        return false;
      }

      console.log('✅ [ScheduledGames] Score updated:', data);
      return true;
    } catch (error) {
      console.error('❌ [ScheduledGames] Exception updating score:', error);
      return false;
    }
  }

  /**
   * Create default scheduled games for the week
   */
  static async createDefaultScheduledGames(): Promise<void> {
    try {
      console.log('📅 [ScheduledGames] Creating default scheduled games...');
      
      const now = new Date();
      const games = [
        {
          title: '$100 Daily Cash Tournament',
          description: 'Daily tournament with $100 prize pool',
          game_type: 'sword-parry',
          entry_fee: 1,
          prize_pool: 100,
          max_participants: 50,
          scheduled_time: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
        },
        {
          title: '$500 Weekend Tournament',
          description: 'Weekend tournament with $500 prize pool',
          game_type: 'quick-click',
          entry_fee: 3,
          prize_pool: 500,
          max_participants: 100,
          scheduled_time: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
        },
        {
          title: '$1,000 Weekly Tournament',
          description: 'Weekly tournament with $1,000 prize pool',
          game_type: 'memory-color',
          entry_fee: 5,
          prize_pool: 1000,
          max_participants: 200,
          scheduled_time: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        },
        {
          title: '$5,000 Monthly Tournament',
          description: 'Monthly tournament with $5,000 prize pool',
          game_type: 'number-tap',
          entry_fee: 10,
          prize_pool: 5000,
          max_participants: 500,
          scheduled_time: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        },
        {
          title: '$25,000 MEGA Tournament',
          description: 'MEGA tournament with $25,000 prize pool - 2 games per day',
          game_type: 'shape-tap',
          entry_fee: 25,
          prize_pool: 25000,
          max_participants: 1000,
          scheduled_time: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
        }
      ];

      for (const game of games) {
        await this.createScheduledGame(game);
      }

      console.log('✅ [ScheduledGames] Default scheduled games created');
    } catch (error) {
      console.error('❌ [ScheduledGames] Exception creating default games:', error);
    }
  }

  /**
   * Get random game type for a listing
   */
  static getRandomGameType(): string {
    const gameTypes = ['sword-parry', 'quick-click', 'memory-color', 'number-tap', 'shape-tap', 'reaction-test'];
    return gameTypes[Math.floor(Math.random() * gameTypes.length)];
  }

  /**
   * Get random RNG seed (1-20)
   */
  static getRandomRngSeed(): number {
    return Math.floor(Math.random() * 20) + 1;
  }

  /**
   * Format scheduled time for display
   */
  static formatScheduledTime(timeString: string): string {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'Starting soon!';
    }
  }
}

export default ScheduledGamesService;
