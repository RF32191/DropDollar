import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  SkillMatchmakingService, 
  PlayerSkillRating, 
  MatchmakingQueueEntry, 
  PvPMatch,
  MatchHistoryEntry 
} from '../lib/supabase/skillMatchmakingService';

export interface MatchmakingState {
  isInQueue: boolean;
  queueEntry: MatchmakingQueueEntry | null;
  activeMatch: PvPMatch | null;
  isSearching: boolean;
  estimatedWaitTime: number; // in seconds
}

export function useSkillMatchmaking() {
  const { user } = useAuth();
  const [skillRatings, setSkillRatings] = useState<PlayerSkillRating[]>([]);
  const [matchmakingState, setMatchmakingState] = useState<MatchmakingState>({
    isInQueue: false,
    queueEntry: null,
    activeMatch: null,
    isSearching: false,
    estimatedWaitTime: 0
  });
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch player's skill ratings
  const fetchSkillRatings = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const ratings = await SkillMatchmakingService.getPlayerSkillRatings(user.id);
      setSkillRatings(ratings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch match history
  const fetchMatchHistory = useCallback(async (gameType?: string) => {
    if (!user) return;

    try {
      const history = await SkillMatchmakingService.getPlayerMatchHistory(user.id, gameType);
      setMatchHistory(history);
    } catch (err: any) {
      setError(err.message);
    }
  }, [user]);

  // Check for active matches and queue status
  const checkActiveStatus = useCallback(async () => {
    if (!user) return;

    try {
      // Check for active matches
      const activeMatches = await SkillMatchmakingService.getPlayerActiveMatches(user.id);
      
      if (activeMatches.length > 0) {
        setMatchmakingState(prev => ({
          ...prev,
          activeMatch: activeMatches[0],
          isInQueue: false,
          queueEntry: null
        }));
      } else {
        // Check queue status (this would require a queue status endpoint)
        setMatchmakingState(prev => ({
          ...prev,
          activeMatch: null
        }));
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [user]);

  // Join matchmaking queue
  const joinQueue = useCallback(async (
    gameType: string, 
    betAmount: number, 
    preferredRatingRange: number = 100
  ) => {
    if (!user) {
      setError('Please sign in to join matchmaking');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const queueEntry = await SkillMatchmakingService.joinMatchmakingQueue(
        user.id,
        gameType,
        betAmount,
        preferredRatingRange
      );

      setMatchmakingState(prev => ({
        ...prev,
        isInQueue: true,
        queueEntry,
        isSearching: true,
        estimatedWaitTime: 60 // Start with 60 second estimate
      }));

      // Start polling for match updates
      startMatchmakingPolling();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Cancel matchmaking
  const cancelMatchmaking = useCallback(async (gameType: string) => {
    if (!user) return;

    try {
      await SkillMatchmakingService.cancelMatchmaking(user.id, gameType);
      
      setMatchmakingState(prev => ({
        ...prev,
        isInQueue: false,
        queueEntry: null,
        isSearching: false,
        estimatedWaitTime: 0
      }));

      stopMatchmakingPolling();
      
    } catch (err: any) {
      setError(err.message);
    }
  }, [user]);

  // Submit match result
  const submitMatchResult = useCallback(async (matchId: string, score: number) => {
    if (!user) return;

    try {
      setIsLoading(true);
      await SkillMatchmakingService.submitMatchResult(matchId, user.id, score);
      
      // Refresh active status and skill ratings
      await Promise.all([
        checkActiveStatus(),
        fetchSkillRatings(),
        fetchMatchHistory()
      ]);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, checkActiveStatus, fetchSkillRatings, fetchMatchHistory]);

  // Polling for matchmaking updates
  let pollingInterval: NodeJS.Timeout | null = null;

  const startMatchmakingPolling = useCallback(() => {
    if (pollingInterval) return;

    pollingInterval = setInterval(async () => {
      await checkActiveStatus();
      
      // Update estimated wait time
      setMatchmakingState(prev => {
        if (prev.isInQueue && prev.queueEntry) {
          const queueTime = Date.now() - new Date(prev.queueEntry.queue_joined_at).getTime();
          const remainingTime = Math.max(0, 180 - Math.floor(queueTime / 1000)); // 3 minute max
          
          return {
            ...prev,
            estimatedWaitTime: remainingTime
          };
        }
        return prev;
      });
    }, 2000); // Poll every 2 seconds
  }, [checkActiveStatus]);

  const stopMatchmakingPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }, []);

  // Get skill rating for specific game type
  const getSkillRating = useCallback((gameType: string): PlayerSkillRating | null => {
    return skillRatings.find(rating => rating.game_type === gameType) || null;
  }, [skillRatings]);

  // Get skill tier information
  const getSkillTier = useCallback((rating: number) => {
    return SkillMatchmakingService.getSkillTier(rating);
  }, []);

  // Calculate win rate
  const getWinRate = useCallback((rating: PlayerSkillRating): number => {
    if (rating.games_played === 0) return 0;
    return Math.round((rating.wins / rating.games_played) * 100);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    if (user) {
      fetchSkillRatings();
      checkActiveStatus();
      fetchMatchHistory();
    }

    // Cleanup polling on unmount
    return () => {
      stopMatchmakingPolling();
    };
  }, [user, fetchSkillRatings, checkActiveStatus, fetchMatchHistory, stopMatchmakingPolling]);

  // Stop polling when no longer in queue or searching
  useEffect(() => {
    if (!matchmakingState.isInQueue && !matchmakingState.isSearching) {
      stopMatchmakingPolling();
    }
  }, [matchmakingState.isInQueue, matchmakingState.isSearching, stopMatchmakingPolling]);

  return {
    // Data
    skillRatings,
    matchmakingState,
    matchHistory,
    isLoading,
    error,
    
    // Actions
    joinQueue,
    cancelMatchmaking,
    submitMatchResult,
    fetchSkillRatings,
    fetchMatchHistory,
    
    // Utilities
    getSkillRating,
    getSkillTier,
    getWinRate,
    
    // Clear error
    clearError: () => setError(null)
  };
}
