import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface LockedGame {
  game_type: string;
  won_on: string;
  competition_type: string;
  days_until_unlock: number;
}

interface WinStats {
  monthly_wins: number;
  total_wins: number;
  total_prize_amount: number;
  locked_game_types: string[];
  current_month: number;
  days_until_reset: number;
}

interface CanPlayResult {
  can_play: boolean;
  reason: string;
  won_on?: string;
  competition_type?: string;
  prize_amount?: number;
  days_until_reset?: number;
  resets_on?: string;
}

export function useWinLimits() {
  const { user } = useAuth();
  const [lockedGames, setLockedGames] = useState<LockedGame[]>([]);
  const [winStats, setWinStats] = useState<WinStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch locked games for the current user
  const fetchLockedGames = useCallback(async () => {
    if (!user?.id) {
      setLockedGames([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_locked_game_types', { p_user_id: user.id });

      if (fetchError) throw fetchError;

      setLockedGames(data || []);
    } catch (err) {
      console.error('Error fetching locked games:', err);
      setError('Failed to fetch win limits');
    }
  }, [user?.id]);

  // Fetch win statistics
  const fetchWinStats = useCallback(async () => {
    if (!user?.id) {
      setWinStats(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_win_stats', { p_user_id: user.id });

      if (fetchError) throw fetchError;

      setWinStats(data);
    } catch (err) {
      console.error('Error fetching win stats:', err);
    }
  }, [user?.id]);

  // Check if user can play a specific game type competitively
  const checkCanPlay = useCallback(async (
    gameType: string, 
    competitionType: string = 'any'
  ): Promise<CanPlayResult> => {
    // If not logged in, assume they can play (will fail at entry)
    if (!user?.id) {
      return { can_play: true, reason: 'Not logged in' };
    }

    // 1v1 is always allowed
    if (competitionType === '1v1') {
      return { can_play: true, reason: '1v1 mode is exempt from monthly limits' };
    }

    try {
      const { data, error: checkError } = await supabase
        .rpc('check_can_play_competitive', {
          p_user_id: user.id,
          p_game_type: gameType,
          p_competition_type: competitionType
        });

      if (checkError) throw checkError;

      return data as CanPlayResult;
    } catch (err) {
      console.error('Error checking play eligibility:', err);
      return { can_play: true, reason: 'Error checking limits' };
    }
  }, [user?.id]);

  // Check if a specific game type is locked
  const isGameLocked = useCallback((gameType: string): boolean => {
    return lockedGames.some(lg => lg.game_type === gameType);
  }, [lockedGames]);

  // Get lock info for a specific game type
  const getLockInfo = useCallback((gameType: string): LockedGame | null => {
    return lockedGames.find(lg => lg.game_type === gameType) || null;
  }, [lockedGames]);

  // Record a win (called when user wins a competitive game)
  const recordWin = useCallback(async (
    gameType: string,
    competitionType: 'hot_sell' | 'winner_takes_all' | 'coin_play',
    competitionId?: string,
    prizeAmount?: number,
    score?: number
  ) => {
    if (!user?.id) return null;

    try {
      const { data, error: recordError } = await supabase
        .rpc('record_game_win', {
          p_user_id: user.id,
          p_game_type: gameType,
          p_competition_type: competitionType,
          p_competition_id: competitionId || null,
          p_prize_amount: prizeAmount || 0,
          p_score: score || 0
        });

      if (recordError) throw recordError;

      // Refresh locked games
      await fetchLockedGames();
      await fetchWinStats();

      return data;
    } catch (err) {
      console.error('Error recording win:', err);
      return null;
    }
  }, [user?.id, fetchLockedGames, fetchWinStats]);

  // Initial fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchLockedGames(), fetchWinStats()]);
      setLoading(false);
    };

    fetchData();
  }, [fetchLockedGames, fetchWinStats]);

  return {
    lockedGames,
    winStats,
    loading,
    error,
    checkCanPlay,
    isGameLocked,
    getLockInfo,
    recordWin,
    refreshLimits: async () => {
      await Promise.all([fetchLockedGames(), fetchWinStats()]);
    }
  };
}

export default useWinLimits;

