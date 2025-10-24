'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import { FixedGamesService } from '@/lib/supabase/fixedGamesService';
import { UserService } from '@/lib/supabase/userService';
import { WinnerTakesAllService, WinnerTakesAllConfig, WinnerTakesAllSessionWithParticipants } from '@/lib/supabase/winnerTakesAllService';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
import ErrorBoundary from '@/components/ErrorBoundary';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { playWinnerTakesAllChing, playButtonHover } from '@/lib/gameAudio';
import {
  TrophyIcon,
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface FixedGameConfig {
  id: string;
  game_type: string;
  tournament_type: string;
  title: string;
  description: string;
  entry_fee: number;
  prize_pool: number;
  max_participants: number | null;
  game_duration: number;
  rng_seed: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

export default function WinnerTakesAllPage() {
  const { user, isAuthenticated } = useAuth();
  const { tokenBalance: userTokens, isLoading: tokensLoading, refreshTokens } = useTokenSync();
  
  const [fixedGameConfigs, setFixedGameConfigs] = useState<FixedGameConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'game' | 'scoreboard'>('list');
  const [selectedGameFlow, setSelectedGameFlow] = useState<{
    gameType: string;
    sessionId: string;
    configId: string;
    entryFee?: number;
  } | null>(null);
  const [locationVerified, setLocationVerified] = useState(false);

  // Hardcoded Winner Takes It All listings
  const hardcodedListings = [
    {
      id: 'wta-2-sword-parry',
      game_type: 'sword_parry',
      title: '$2 Winner Takes It All - Sword Parry',
      description: 'Winner takes the entire $2 prize pool!',
      entry_fee: 1,
      prize_pool: 2,
      base_price: 2,
      game_duration: 30,
      rng_seed: 5,
      winner_prize: 1.70,
      platform_fee: 0.30
    },
    {
      id: 'wta-10-laser-dodge',
      game_type: 'laser_dodge',
      title: '$10 Winner Takes It All - Laser Dodge',
      description: 'Winner takes the entire $10 prize pool!',
      entry_fee: 1,
      prize_pool: 10,
      base_price: 10,
      game_duration: 45,
      rng_seed: 6,
      winner_prize: 8.50,
      platform_fee: 1.50
    },
    {
      id: 'wta-25-multi-target',
      game_type: 'multi_target_reaction',
      title: '$25 Winner Takes It All - Multi Target',
      description: 'Winner takes the entire $25 prize pool!',
      entry_fee: 1,
      prize_pool: 25,
      base_price: 25,
      game_duration: 60,
      rng_seed: 2,
      winner_prize: 21.25,
      platform_fee: 3.75
    },
    {
      id: 'wta-50-sword-parry',
      game_type: 'sword_parry',
      title: '$50 Winner Takes It All - Sword Parry',
      description: 'Winner takes the entire $50 prize pool!',
      entry_fee: 1,
      prize_pool: 50,
      base_price: 50,
      game_duration: 90,
      rng_seed: 3,
      winner_prize: 42.50,
      platform_fee: 7.50
    },
    {
      id: 'wta-100-laser-dodge',
      game_type: 'laser_dodge',
      title: '$100 Winner Takes It All - Laser Dodge',
      description: 'Winner takes the entire $100 prize pool!',
      entry_fee: 1,
      prize_pool: 100,
      base_price: 100,
      game_duration: 120,
      rng_seed: 1,
      winner_prize: 85,
      platform_fee: 15
    },
    {
      id: 'wta-250-quick-click',
      game_type: 'number_tap',
      title: '$250 Winner Takes It All - Quick Click',
      description: 'Winner takes the entire $250 prize pool!',
      entry_fee: 1,
      prize_pool: 250,
      base_price: 250,
      game_duration: 180,
      rng_seed: 4,
      winner_prize: 212.50,
      platform_fee: 37.50
    },
    {
      id: 'wta-5-blade-bounce',
      game_type: 'blade_bounce',
      title: '$5 Winner Takes It All - Blade Bounce',
      description: 'Winner takes the entire $5 prize pool!',
      entry_fee: 1,
      prize_pool: 5,
      base_price: 5,
      game_duration: 60,
      rng_seed: 7,
      winner_prize: 4.25,
      platform_fee: 0.75
    },
    {
      id: 'wta-1000-cash-stack',
      game_type: 'cash_stack',
      title: '$1000 Winner Takes It All - Cash Stack',
      description: 'Winner takes the entire $1000 prize pool!',
      entry_fee: 1,
      prize_pool: 1000,
      base_price: 1000,
      game_duration: 300,
      rng_seed: 8,
      winner_prize: 850,
      platform_fee: 150
    },
    {
      id: 'wta-2500-falling-objects',
      game_type: 'falling_object',
      title: '$2500 Winner Takes It All - Falling Objects',
      description: 'Winner takes the entire $2500 prize pool!',
      entry_fee: 1,
      prize_pool: 2500,
      base_price: 2500,
      game_duration: 360,
      rng_seed: 9,
      winner_prize: 2125,
      platform_fee: 375
    },
    {
      id: 'wta-5000-color-sequence',
      game_type: 'color_sequence',
      title: '$5000 Winner Takes It All - Color Sequence',
      description: 'Winner takes the entire $5000 prize pool!',
      entry_fee: 1,
      prize_pool: 5000,
      base_price: 5000,
      game_duration: 420,
      rng_seed: 10,
      winner_prize: 4250,
      platform_fee: 750
    },
    {
      id: 'wta-10000-laser-dodge',
      game_type: 'laser_dodge',
      title: '$10000 Winner Takes It All - Laser Dodge',
      description: 'Winner takes the entire $10000 prize pool!',
      entry_fee: 1,
      prize_pool: 10000,
      base_price: 10000,
      game_duration: 480,
      rng_seed: 11,
      winner_prize: 8500,
      platform_fee: 1500
    },
    {
      id: 'wta-25000-multi-target',
      game_type: 'multi_target_reaction',
      title: '$25000 Winner Takes It All - Multi Target',
      description: 'Winner takes the entire $25000 prize pool!',
      entry_fee: 1,
      prize_pool: 25000,
      base_price: 25000,
      game_duration: 600,
      rng_seed: 12,
      winner_prize: 21250,
      platform_fee: 3750
    }
  ];
  
  // Winner Takes It All state
  const [configs, setConfigs] = useState<WinnerTakesAllConfig[]>([]);
  const [sessions, setSessions] = useState<WinnerTakesAllSessionWithParticipants[]>([]);
  const [joiningWinnerTakesAll, setJoiningWinnerTakesAll] = useState(false);
  const [userCompletions, setUserCompletions] = useState<{ [configId: string]: { score: number; completed: boolean } }>({});
  const [timeRemaining, setTimeRemaining] = useState<{ [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean; hours?: number; isBasePriceMet?: boolean; canJoin?: boolean; isTimerActive?: boolean; basePrice?: number; currentPot?: number; } }>({});
  const [processingPayouts, setProcessingPayouts] = useState<Set<string>>(new Set()); // Track sessions being processed

  useEffect(() => {
    // Always load hardcoded data, regardless of authentication
    loadWinnerTakesAllData();
    
    // Emergency reset for $2 game on page load
    emergencyReset2DollarGame();
    
    // Load user completion state from localStorage on page load
    if (user?.id) {
      try {
        const savedCompletions = localStorage.getItem(`winnerTakesAllCompletions_${user.id}`);
        if (savedCompletions) {
          const parsedCompletions = JSON.parse(savedCompletions);
          setUserCompletions(parsedCompletions);
          console.log('✅ [Winner Takes It All] Loaded user completions from localStorage:', parsedCompletions);
        }
      } catch (error) {
        console.error('❌ [Winner Takes It All] Error loading user completions:', error);
      }
    }

    // Set up real-time subscription for live updates
    const subscription = supabase
      .channel('winner_takes_all_sessions')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'winner_takes_all_shared_sessions' 
        }, 
        (payload) => {
          console.log('🔄 [Winner Takes It All] Real-time update received:', payload);
          refreshParticipantsData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Refresh data when user changes (for multi-user testing)
  useEffect(() => {
    if (user?.id) {
      console.log('👤 [Winner Takes It All] User changed, refreshing data for:', user.id);
      refreshParticipantsData();
    }
  }, [user?.id]);

  // Check for pending payouts on page load
  useEffect(() => {
    const checkPendingPayouts = async () => {
      try {
        console.log('💰 [Winner Takes It All] Checking for pending payouts...');
        
        // Get all sessions that might need payouts
        const { data: sessionsData, error } = await supabase
          .from('winner_takes_all_shared_sessions')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('❌ [Winner Takes It All] Error checking pending payouts:', error);
          return;
        }

        // Check each session for completion and pending payouts
        for (const session of sessionsData) {
          // Skip if already being processed to prevent duplicate payouts
          if (processingPayouts.has(session.id)) {
            console.log('💰 [Winner Takes It All] Session already being processed, skipping:', session.id);
            continue;
          }
          
          if (isTournamentCompleted(session) && !session.winner_paid) {
            const participantsWithScores = session.participants.filter((p: any) => p.score !== null && p.score !== undefined);
            if (participantsWithScores.length > 0) {
              const winner = participantsWithScores.sort((a: any, b: any) => (b.score || 0) - (a.score || 0))[0];
              const config = configs.find(c => c.id === session.config_id);
              
              if (winner && config) {
                // Special handling for $2 game - force reset if it's completed
                if (session.config_id === 'wta-2-sword-parry') {
                  console.log('🚨 [Winner Takes It All] $2 game detected as completed, forcing reset');
                  await resetCompletedTournament(session.id);
                  continue;
                }
                
                // Process automatic payout for any completed tournament
                const isPaidFromLocalStorage = localStorage.getItem(`winnerTakesAllPayout_${session.id}`);
                if (isPaidFromLocalStorage) {
                  console.log('💰 [Winner Takes It All] Winner already paid (localStorage check), auto-resetting tournament');
                  // Even if paid, reset the tournament to start fresh
                  setTimeout(() => {
                    resetCompletedTournament(session.id);
                  }, 1000);
                  continue;
                }
                
                const prizeAmount = config.winner_prize;
                console.log('💰 [Winner Takes It All] Processing pending payout:', {
                  sessionId: session.id,
                  winnerId: winner.user_id,
                  prizeAmount
                });
                
                // Mark session as being processed to prevent duplicate payouts
                setProcessingPayouts(prev => new Set(prev).add(session.id));
                
                const payoutSuccess = await payoutWinner(session.id, winner.user_id, prizeAmount);
                if (payoutSuccess) {
                  // After successful payout, reset the tournament
                  console.log('🔄 [Winner Takes It All] Auto-resetting tournament after payout');
                  setTimeout(() => {
                    resetCompletedTournament(session.id);
                    // Remove from processing set after reset
                    setProcessingPayouts(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(session.id);
                      return newSet;
                    });
                  }, 2000);
                } else {
                  // Remove from processing set if payout failed
                  setProcessingPayouts(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(session.id);
                    return newSet;
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ [Winner Takes It All] Error in checkPendingPayouts:', error);
      }
    };

    // Run after a short delay to ensure data is loaded, then every 30 seconds
    const timeoutId = setTimeout(checkPendingPayouts, 2000);
    const intervalId = setInterval(checkPendingPayouts, 30000); // 30 seconds instead of 5
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [configs.length, sessions.length]);

  // Refresh participants data every 30 seconds
  useEffect(() => {
    if (sessions.length > 0) {
      const interval = setInterval(() => {
        refreshParticipantsData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [sessions.length]);

  useEffect(() => {
    // Simple timer update that forces re-renders every second
    const timer = setInterval(() => {
      // Force a re-render by updating a dummy state
      setSessions(prevSessions => [...prevSessions]);
    }, 1000);

    const dataRefresh = setInterval(() => {
      refreshParticipantsData();
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(dataRefresh);
    };
  }, []); // Simple approach - just force re-renders

  // Add ching ching audio effect on page load
  useEffect(() => {
    // Play ching ching sound when page loads
    playWinnerTakesAllChing();
    
    // Play ching ching sound every 15 seconds for ambient effect
    const chingInterval = setInterval(() => {
      playWinnerTakesAllChing();
    }, 15000);

    return () => clearInterval(chingInterval);
  }, []);

  const loadWinnerTakesAllData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 [Winner Takes It All] Loading shared data from Supabase...');
      
      // Use hardcoded listings as configs
      const configsData = hardcodedListings.map(listing => ({
        id: listing.id,
        game_type: listing.game_type,
        title: listing.title,
        description: listing.description,
        entry_fee: listing.entry_fee,
        prize_pool: listing.prize_pool,
        base_price: listing.base_price,
        game_duration: listing.game_duration,
        rng_seed: listing.rng_seed,
        winner_prize: listing.winner_prize,
        platform_fee: listing.platform_fee,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      setConfigs(configsData);
      
      // Load shared sessions from Supabase
      const { data: sharedSessions, error } = await supabase
        .from('winner_takes_all_shared_sessions')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [Winner Takes It All] Error loading shared sessions:', error);
        // Fallback to localStorage
        const savedSessions = localStorage.getItem('winnerTakesAllSessions');
        let sessionsData;
        
        if (savedSessions) {
          try {
            sessionsData = JSON.parse(savedSessions);
            console.log('✅ [Winner Takes It All] Loaded saved sessions from localStorage fallback');
          } catch (parseError) {
            console.error('❌ [Winner Takes It All] Error parsing saved sessions:', parseError);
            sessionsData = createDefaultSessions(configsData);
          }
        } else {
          sessionsData = createDefaultSessions(configsData);
        }
        setSessions(sessionsData);
      } else {
        // Convert shared sessions to our format
        const sessionsData = sharedSessions.map(session => ({
          id: session.id,
          config_id: session.config_id,
          current_pot: session.current_pot || 0,
          base_price: session.base_price,
          participants_count: session.participants_count || 0,
          status: session.status || 'waiting',
          timer_started_at: session.timer_started_at,
          created_at: session.created_at,
          updated_at: session.updated_at,
          participants: session.participants || []
        }));
        setSessions(sessionsData);
        console.log('✅ [Winner Takes It All] Loaded shared sessions from Supabase:', sessionsData.length);
      }
      
      // Load user completions from Supabase if user is logged in
      if (user?.id) {
        await loadUserCompletionsFromSupabase();
      }
      
      console.log('✅ [Winner Takes It All] Data loaded successfully');
      console.log('📊 [Winner Takes It All] Configs:', configsData.length);
      console.log('📊 [Winner Takes It All] Sessions:', sessions.length);
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserCompletionsFromSupabase = async () => {
    if (!user?.id) return;
    
    try {
      console.log('🔄 [Winner Takes It All] Loading user completions from Supabase...');
      
      // Check competitions table for user completions
      const { data: competitionsData, error: competitionsError } = await supabase
        .from('competitions')
        .select('game_type, score, session_id')
        .eq('user_id', user.id)
        .eq('tournament_type', 'winner_takes_all');

      if (competitionsError) {
        console.error('❌ [Winner Takes It All] Error loading competitions:', competitionsError);
        return;
      }

      // Check game_history table as fallback
      const { data: gameHistoryData, error: gameHistoryError } = await supabase
        .from('game_history')
        .select('game_type, score')
        .eq('user_id', user.id)
        .eq('tournament_type', 'winner_takes_all');

      if (gameHistoryError) {
        console.error('❌ [Winner Takes It All] Error loading game history:', gameHistoryError);
      }

      // Combine both sources and update user completions
      const allCompletions = [...(competitionsData || []), ...(gameHistoryData || [])];
      const userCompletionsMap: { [configId: string]: { score: number; completed: boolean } } = {};

      allCompletions.forEach(completion => {
        // Find matching config by game_type
        const matchingConfig = hardcodedListings.find(config => config.game_type === completion.game_type);
        if (matchingConfig) {
          userCompletionsMap[matchingConfig.id] = {
            score: completion.score,
            completed: true
          };
        }
      });

      if (Object.keys(userCompletionsMap).length > 0) {
        setUserCompletions(userCompletionsMap);
        // Save to localStorage for faster access
        localStorage.setItem(`winnerTakesAllCompletions_${user.id}`, JSON.stringify(userCompletionsMap));
        console.log('✅ [Winner Takes It All] Loaded user completions from Supabase:', userCompletionsMap);
      }
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error loading user completions from Supabase:', error);
    }
  };

  const createDefaultSessions = (configs: any[]) => {
    return configs.map(config => ({
      id: `session-${config.id}`,
      config_id: config.id,
      current_pot: 0,
      base_price: config.base_price,
      participants_count: 0,
      status: 'waiting' as const,
      timer_started_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      participants: []
    }));
  };

  const refreshParticipantsData = async () => {
    try {
      console.log('🔄 [Winner Takes It All] Refreshing shared sessions from Supabase...');
      
      // Load shared sessions from Supabase
      const { data: sharedSessions, error } = await supabase
        .from('winner_takes_all_shared_sessions')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [Winner Takes It All] Error refreshing shared sessions:', error);
        return;
      }

      // Convert shared sessions to our format
      const sessionsData = sharedSessions.map(session => ({
        id: session.id,
        config_id: session.config_id,
        current_pot: session.current_pot || 0,
        base_price: session.base_price,
        participants_count: session.participants_count || 0,
        status: session.status || 'waiting',
        timer_started_at: session.timer_started_at,
        created_at: session.created_at,
        updated_at: session.updated_at,
        participants: session.participants || []
      }));
      
      setSessions(sessionsData);
      console.log('✅ [Winner Takes It All] Shared sessions refreshed:', sessionsData.length);
      console.log('📊 [Winner Takes It All] Sessions with participants:', sessionsData.filter(s => s.participants.length > 0).length);
      
      // Log participants for debugging
      sessionsData.forEach(session => {
        if (session.participants.length > 0) {
          const participantsWithScores = session.participants.filter(p => p.score !== null && p.score !== undefined);
          console.log(`🎮 [Winner Takes It All] Session ${session.config_id}:`, {
            totalParticipants: session.participants.length,
            participantsWithScores: participantsWithScores.length,
            currentPot: session.current_pot,
            basePrice: session.base_price,
            status: session.status,
            timerStartedAt: session.timer_started_at,
            participants: session.participants
          });
        }
      });
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error refreshing sessions:', error);
    }
  };

  const isTournamentCompleted = (session: any) => {
    // Tournament is completed if:
    // 1. Base price is met AND
    // 2. Timer has expired (30 minutes after base price was met) AND
    // 3. At least one participant has a score
    if (!session) return false;
    
    const isBasePriceMet = session.current_pot >= session.base_price;
    const participantsWithScores = session.participants.filter((p: any) => p.score !== null && p.score !== undefined);
    const hasScores = participantsWithScores.length > 0;
    
    // Check if timer has expired (30 minutes after base price was met)
    let timerExpired = false;
    if (session.timer_started_at) {
      const timerStart = new Date(session.timer_started_at);
      const now = new Date();
      const elapsed = (now.getTime() - timerStart.getTime()) / 1000; // seconds
      timerExpired = elapsed >= 1800; // 30 minutes = 1800 seconds
    }
    
    const isCompleted = isBasePriceMet && timerExpired && hasScores;
    
    if (isCompleted) {
      console.log('🏆 [Winner Takes It All] Tournament completed:', {
        sessionId: session.id,
        configId: session.config_id,
        isBasePriceMet,
        timerExpired,
        hasScores,
        participantsCount: participantsWithScores.length,
        currentPot: session.current_pot,
        basePrice: session.base_price,
        winner: participantsWithScores.sort((a: any, b: any) => (b.score || 0) - (a.score || 0))[0]
      });
    }
    
    return isCompleted;
  };

  const resetCompletedTournament = async (sessionId: string) => {
    try {
      console.log('🔄 [Winner Takes It All] Resetting completed tournament:', sessionId);
      
      // Get the session to find the config_id before deleting
      const { data: sessionData, error: fetchError } = await supabase
        .from('winner_takes_all_shared_sessions')
        .select('config_id')
        .eq('id', sessionId)
        .single();

      if (fetchError) {
        console.error('❌ [Winner Takes It All] Error fetching session for reset:', fetchError);
        return;
      }

      // Delete the completed session from Supabase
      const { error } = await supabase
        .from('winner_takes_all_shared_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('❌ [Winner Takes It All] Error resetting tournament:', error);
        return;
      }

      // Clear completion data from Supabase competitions table
      if (sessionData?.config_id) {
        const { error: competitionsError } = await supabase
          .from('competitions')
          .delete()
          .eq('session_id', sessionId);

        if (competitionsError) {
          console.error('❌ [Winner Takes It All] Error clearing competitions data:', competitionsError);
        } else {
          console.log('✅ [Winner Takes It All] Cleared competitions data for session:', sessionId);
        }
      }

      // Clear completion data from localStorage for all users
      if (user?.id) {
        try {
          const savedCompletions = localStorage.getItem(`winnerTakesAllCompletions_${user.id}`);
          if (savedCompletions) {
            const parsedCompletions = JSON.parse(savedCompletions);
            // Remove completion for this specific config
            if (sessionData?.config_id && parsedCompletions[sessionData.config_id]) {
              delete parsedCompletions[sessionData.config_id];
              localStorage.setItem(`winnerTakesAllCompletions_${user.id}`, JSON.stringify(parsedCompletions));
              setUserCompletions(parsedCompletions);
              console.log('✅ [Winner Takes It All] Cleared localStorage completion for config:', sessionData.config_id);
            }
          }
        } catch (error) {
          console.error('❌ [Winner Takes It All] Error clearing localStorage completion:', error);
        }
      }

      // Clear payout data from localStorage
      localStorage.removeItem(`winnerTakesAllPayout_${sessionId}`);
      console.log('✅ [Winner Takes It All] Cleared payout data from localStorage');

      console.log('✅ [Winner Takes It All] Tournament reset successfully');
      
      // Wait a moment then refresh data to show new empty session
      setTimeout(async () => {
        await refreshParticipantsData();
        console.log('🔄 [Winner Takes It All] Refreshed data after reset');
      }, 1000);
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error resetting tournament:', error);
    }
  };

  // Force reset specific tournament (for manual reset)
  const forceResetTournament = async (configId: string) => {
    try {
      console.log('🔄 [Winner Takes It All] Force resetting tournament for config:', configId);
      
      // Find the session for this config
      const { data: sessionData, error: fetchError } = await supabase
        .from('winner_takes_all_shared_sessions')
        .select('id')
        .eq('config_id', configId)
        .single();

      if (fetchError) {
        console.error('❌ [Winner Takes It All] Error fetching session for force reset:', fetchError);
        return;
      }

      if (sessionData?.id) {
        await resetCompletedTournament(sessionData.id);
      } else {
        // If no session found, just clear localStorage data
        if (user?.id) {
          try {
            const savedCompletions = localStorage.getItem(`winnerTakesAllCompletions_${user.id}`);
            if (savedCompletions) {
              const parsedCompletions = JSON.parse(savedCompletions);
              if (parsedCompletions[configId]) {
                delete parsedCompletions[configId];
                localStorage.setItem(`winnerTakesAllCompletions_${user.id}`, JSON.stringify(parsedCompletions));
                setUserCompletions(parsedCompletions);
                console.log('✅ [Winner Takes It All] Cleared localStorage completion for config:', configId);
              }
            }
          } catch (error) {
            console.error('❌ [Winner Takes It All] Error clearing localStorage completion:', error);
          }
        }
        
        // Clear competitions data from Supabase
        const { error: competitionsError } = await supabase
          .from('competitions')
          .delete()
          .eq('game_type', 'sword_parry') // $2 game is sword_parry
          .eq('tournament_type', 'winner_takes_all');

        if (competitionsError) {
          console.error('❌ [Winner Takes It All] Error clearing competitions data:', competitionsError);
        } else {
          console.log('✅ [Winner Takes It All] Cleared competitions data');
        }
        
        await refreshParticipantsData();
      }
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error force resetting tournament:', error);
    }
  };

  // Emergency reset for $2 game - call this on page load
  const emergencyReset2DollarGame = async () => {
    try {
      console.log('🚨 [Winner Takes It All] Emergency reset for $2 game');
      
      // Clear all localStorage data for $2 game
      if (user?.id) {
        const savedCompletions = localStorage.getItem(`winnerTakesAllCompletions_${user.id}`);
        if (savedCompletions) {
          const parsedCompletions = JSON.parse(savedCompletions);
          if (parsedCompletions['wta-2-sword-parry']) {
            delete parsedCompletions['wta-2-sword-parry'];
            localStorage.setItem(`winnerTakesAllCompletions_${user.id}`, JSON.stringify(parsedCompletions));
            setUserCompletions(parsedCompletions);
            console.log('✅ [Winner Takes It All] Emergency cleared $2 game completion');
          }
        }
      }
      
      // Clear any payout data for $2 game sessions
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('winnerTakesAllPayout_') && key.includes('wta-2')) {
          localStorage.removeItem(key);
          console.log('✅ [Winner Takes It All] Emergency cleared payout data:', key);
        }
      });
      
      // Clear competitions data for sword_parry games
      const { error: competitionsError } = await supabase
        .from('competitions')
        .delete()
        .eq('game_type', 'sword_parry')
        .eq('tournament_type', 'winner_takes_all');

      if (competitionsError) {
        console.error('❌ [Winner Takes It All] Error clearing competitions data:', competitionsError);
      } else {
        console.log('✅ [Winner Takes It All] Emergency cleared competitions data');
      }
      
      // Refresh data
      await refreshParticipantsData();
      console.log('✅ [Winner Takes It All] Emergency reset completed');
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error in emergency reset:', error);
    }
  };

  const payoutWinner = async (sessionId: string, winnerUserId: string, prizeAmount: number) => {
    try {
      console.log('💰 [Winner Takes It All] Paying out winner:', { sessionId, winnerUserId, prizeAmount });
      
      // Get winner's current token balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tokens, total_earned')
        .eq('id', winnerUserId)
        .single();

      if (userError) {
        console.error('❌ [Winner Takes It All] Error fetching winner tokens:', userError);
        return false;
      }

      const currentTokens = userData.tokens || 0;
      const currentTotalEarned = userData.total_earned || 0;
      const newTokenBalance = currentTokens + prizeAmount;
      const newTotalEarned = currentTotalEarned + prizeAmount;

      // Update winner's token balance and total earned with decimal support
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          tokens: newTokenBalance,
          total_earned: newTotalEarned,
          updated_at: new Date().toISOString()
        })
        .eq('id', winnerUserId);

      if (updateError) {
        console.error('❌ [Winner Takes It All] Error updating winner tokens:', updateError);
        return false;
      }

      // Mark session as paid in Supabase
      const { error: sessionUpdateError } = await supabase
        .from('winner_takes_all_shared_sessions')
        .update({ 
          winner_paid: true,
          winner_user_id: winnerUserId,
          prize_awarded: prizeAmount,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionUpdateError) {
        console.error('❌ [Winner Takes It All] Error updating session payment status:', sessionUpdateError);
      }

      // Backup payout data to localStorage for immediate UI updates
      const payoutData = {
        sessionId,
        winnerUserId,
        prizeAmount,
        payoutTime: new Date().toISOString(),
        oldBalance: currentTokens,
        newBalance: newTokenBalance
      };

      // Store in localStorage for immediate access
      localStorage.setItem(`winnerTakesAllPayout_${sessionId}`, JSON.stringify(payoutData));
      
      // Also store in a general payouts array
      const existingPayouts = JSON.parse(localStorage.getItem('winnerTakesAllPayouts') || '[]');
      existingPayouts.push(payoutData);
      localStorage.setItem('winnerTakesAllPayouts', JSON.stringify(existingPayouts));

      console.log('✅ [Winner Takes It All] Winner paid out successfully:', {
        winnerUserId,
        prizeAmount,
        oldBalance: currentTokens,
        newBalance: newTokenBalance,
        payoutData
      });

      return true;
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error paying out winner:', error);
      return false;
    }
  };

  const updateTimers = () => {
    // Only update if we have sessions to avoid unnecessary state updates
    if (sessions.length === 0) return;
    
    const newTimeRemaining: { [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean; hours?: number; isBasePriceMet?: boolean; canJoin?: boolean; isTimerActive?: boolean; basePrice?: number; currentPot?: number; } } = {};
    
    sessions.forEach(session => {
      const config = configs.find(c => c.id === session.config_id);
      
      if (config) {
        const payouts = calculateWinnerTakesAllPayouts(config);
        if (payouts) {
          // For Winner Takes It All, use base_price from session
          const basePrice = session.base_price;
          const isBasePriceMet = session.current_pot >= basePrice;
          const isTimerActive = session.status === 'active' && session.timer_started_at;
          
          let timeRemaining = 0;
          if (isTimerActive && session.timer_started_at) {
            const elapsed = Math.floor((Date.now() - new Date(session.timer_started_at).getTime()) / 1000);
            // Use 30 minutes (1800 seconds) for Winner Takes It All timer
            timeRemaining = Math.max(0, 1800 - elapsed);
            
            // Check if timer has expired
            if (timeRemaining === 0 && session.status === 'active') {
              console.log('⏰ [Winner Takes It All] Timer expired for session:', session.id);
              // Mark tournament as completed
              supabase
                .from('winner_takes_all_shared_sessions')
                .update({ 
                  status: 'completed',
                  completed_at: new Date().toISOString()
                })
                .eq('id', session.id);
            }
          } else if (isBasePriceMet && !session.timer_started_at && session.status !== 'completed') {
            // Start timer if base price is met but timer hasn't started yet
            console.log('🎯 [Winner Takes It All] Base price met, starting 30-minute timer for session:', {
              sessionId: session.id,
              currentPot: session.current_pot,
              basePrice: basePrice,
              status: session.status,
              timerStartedAt: session.timer_started_at
            });
            
            // Update session to start timer
            supabase
              .from('winner_takes_all_shared_sessions')
              .update({ 
                timer_started_at: new Date().toISOString(),
                status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', session.id)
              .then(({ error }) => {
                if (error) {
                  console.error('❌ [Winner Takes It All] Error starting timer:', error);
                } else {
                  console.log('✅ [Winner Takes It All] Timer started successfully for session:', session.id);
                  // Refresh data to get updated timer_started_at
                  setTimeout(() => {
                    refreshParticipantsData();
                  }, 500);
                }
              });
          }
          
          newTimeRemaining[session.id] = {
            hours: Math.floor(timeRemaining / 3600),
            minutes: Math.floor((timeRemaining % 3600) / 60),
            seconds: timeRemaining % 60,
            isHotSell: false, // Winner Takes It All doesn't have hot sell mode
            isBasePriceMet: isBasePriceMet,
            canJoin: isBasePriceMet,
            isTimerActive: isTimerActive,
            basePrice: basePrice,
            currentPot: session.current_pot || 0
          };
        }
      }
    });
    
    // Only update state if there are actual changes to prevent unnecessary re-renders
    const hasChanges = JSON.stringify(newTimeRemaining) !== JSON.stringify(timeRemaining);
    if (hasChanges) {
      setTimeRemaining(newTimeRemaining);
    }
  };

  const formatTimeRemaining = (minutes: number, seconds: number, hours?: number) => {
    if (hours && hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    // For Winner Takes It All, always show MM:SS format
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleJoinGame = async (configId: string) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    // Check if user already completed this tournament (using user completion state first)
    const userCompletion = userCompletions[configId];
    if (userCompletion && userCompletion.completed) {
      setMessage({ type: 'error', text: `You have already completed this tournament! Your score: ${userCompletion.score}` });
      return;
    }

    // Fallback: Check session data
    const session = sessions.find(s => s.config_id === configId);
    if (session) {
      const hasCompleted = session.participants.some(p => p.user_id === user.id && p.score !== null && p.score !== undefined && p.score !== 0);
      if (hasCompleted) {
        setMessage({ type: 'error', text: 'You have already completed this tournament! Check the scoreboard for your score.' });
        return;
      }
    }

    // Also check localStorage as backup
    try {
      const savedSessions = localStorage.getItem('winnerTakesAllSessions');
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        const savedSession = parsedSessions.find((s: any) => s.config_id === configId);
        if (savedSession && savedSession.participants) {
          const hasCompletedInStorage = savedSession.participants.some((p: any) => 
            p.user_id === user.id && p.score !== null && p.score !== undefined && p.score !== 0
          );
          if (hasCompletedInStorage) {
            setMessage({ type: 'error', text: 'You have already completed this tournament! Check the scoreboard for your score.' });
            return;
          }
        }
      }
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error checking localStorage in handleJoinGame:', error);
    }

    // If location not verified, verify it first
    if (!locationVerified) {
      try {
        // Location verification for legal compliance
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        console.log('🎮 [Winner Takes It All] Location verified:', position.coords);
        setLocationVerified(true);
        setMessage({ type: 'success', text: 'Location verified! Click JOIN GAME again to start playing.' });
        return; // Exit after verification, user needs to click again
      } catch (error) {
        console.error('❌ [Winner Takes It All] Location verification failed:', error);
        if (error instanceof GeolocationPositionError) {
          setMessage({ type: 'error', text: 'Location verification required to join tournaments' });
        } else {
          setMessage({ type: 'error', text: 'Failed to verify location. Please try again.' });
        }
        return;
      }
    }

    // If location is verified, proceed to join the session
    console.log('🎮 [Winner Takes It All] Starting join process for config:', configId);
    
    setJoiningWinnerTakesAll(true);
    
    try {
      // Find the config
      const config = configs.find(c => c.id === configId);
      if (!config) {
        setMessage({ type: 'error', text: 'Tournament not found!' });
        return;
      }

      // Find or create session
      let session = sessions.find(s => s.config_id === configId);
      if (!session) {
        // Create new session
        const newSession = {
          id: `session-${configId}`,
          config_id: configId,
          current_pot: 0,
          base_price: config.base_price,
          participants_count: 0,
          status: 'waiting' as const,
          timer_started_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          participants: []
        };
        setSessions(prev => [...prev, newSession]);
        session = newSession;
      }

      // Deduct token from user's wallet FIRST
      const newTokenBalance = userTokens - config.entry_fee;
      const tokenUpdateSuccess = await UserService.updateUserTokens(user.id, newTokenBalance);
      
      if (!tokenUpdateSuccess) {
        console.error('❌ [Winner Takes It All] Error deducting token');
        setMessage({ type: 'error', text: 'Failed to deduct token. Please try again.' });
        return;
      }

      // Refresh token balance to update local state
      refreshTokens();
      console.log(`✅ [Winner Takes It All] Tokens deducted: ${config.entry_fee} tokens`);
      console.log(`✅ [Winner Takes It All] New balance: ${newTokenBalance} tokens`);

      // Update session locally and save to Supabase
      const newParticipant = {
        id: `participant-${user.id}-${session.id}`,
        session_id: session.id,
        user_id: user.id,
        score: null,
        accuracy: null,
        joined_at: new Date().toISOString(),
        completed_at: null
      };

      const updatedSessions = sessions.map(s => 
        s.id === session.id 
          ? {
              ...s,
              current_pot: s.current_pot + config.entry_fee,
              participants_count: s.participants_count + 1,
              participants: [...s.participants, newParticipant]
            }
          : s
      );

      setSessions(updatedSessions);

      // Save to Supabase shared sessions table
      try {
        const { error: upsertError } = await supabase
          .from('winner_takes_all_shared_sessions')
          .upsert({
            id: session.id,
            config_id: session.config_id,
            current_pot: session.current_pot + config.entry_fee,
            base_price: session.base_price,
            participants_count: session.participants_count + 1,
            status: 'waiting',
            timer_started_at: null,
            participants: [...session.participants, newParticipant],
            updated_at: new Date().toISOString()
          });

        if (upsertError) {
          console.error('❌ [Winner Takes It All] Error saving to Supabase:', upsertError);
        } else {
          console.log('✅ [Winner Takes It All] Session saved to Supabase');
        }
      } catch (error) {
        console.error('❌ [Winner Takes It All] Error saving session:', error);
      }

      console.log('💰 [Winner Takes It All] Pot updated and saved to Supabase:', {
        sessionId: session.id,
        newPot: session.current_pot + config.entry_fee,
        participants: session.participants_count + 1
      });

      // Start the game
      setSelectedGameFlow({
        gameType: config.game_type,
        sessionId: session.id,
        configId: configId,
        entryFee: config.entry_fee
      });
      setCurrentView('game');

      setMessage({ type: 'success', text: 'Successfully joined Winner Takes It All tournament!' });
      
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error joining session:', error);
      if (error instanceof GeolocationPositionError) {
        setMessage({ type: 'error', text: 'Location verification required to join tournaments' });
      } else {
        setMessage({ type: 'error', text: 'Failed to join tournament. Please try again.' });
      }
    } finally {
      setJoiningWinnerTakesAll(false);
    }
  };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'laser_dodge': return '🎯';
      case 'multi_target': return '🎯';
      case 'sword_parry': return '⚔️';
      case 'quick_click': return '👆';
      case 'color_sequence': return '🌈';
      default: return '🎮';
    }
  };

  const formatPrizeAmount = (amount: number, showDecimals: boolean = false) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    }).format(amount);
  };

  // Winner Takes It All payout calculation (using hardcoded data)
  const calculateWinnerTakesAllPayouts = (config: any) => {
    // Use the hardcoded data directly
    return {
      winnerPrize: config.winner_prize,
      platformFee: config.platform_fee,
      totalPrize: config.prize_pool,
      entryFee: config.entry_fee,
      basePrice: config.base_price,
      maxPlayers: null // No max players for Winner Takes It All
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg">Loading Winner Takes It All tournaments...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render game flow view
  if (currentView === 'game' && selectedGameFlow) {
    const gameConfig = hardcodedListings.find(c => c.id === selectedGameFlow.configId);
    const rngSeed = gameConfig?.rng_seed || 1;
    
    console.log('🎮 [Winner Takes It All] Starting game:', {
      gameType: selectedGameFlow.gameType,
      sessionId: selectedGameFlow.sessionId,
      configId: selectedGameFlow.configId,
      gameConfig,
      rngSeed
    });
    
    return (
      <ErrorBoundary>
        <CompetitionGameFlow
          gameType={selectedGameFlow.gameType}
          sessionId={selectedGameFlow.sessionId}
          configId={selectedGameFlow.configId}
          rngSeed={rngSeed}
          onComplete={async (score, accuracy) => {
            console.log('🎮 [Winner Takes It All] Game completed with score:', score, 'accuracy:', accuracy);
            console.log('🎮 [Winner Takes It All] User:', user?.id, 'SelectedGameFlow:', selectedGameFlow);
            
            if (!user || !selectedGameFlow) {
              console.error('❌ [Winner Takes It All] Missing user or game flow data');
              return;
            }

            try {
              // Update score in Supabase
              const updatedSessions = sessions.map(session => 
                session.id === selectedGameFlow.sessionId
                  ? {
                      ...session,
                      participants: session.participants.map(participant =>
                        participant.user_id === user.id
                          ? { ...participant, score, accuracy, completed_at: new Date().toISOString() }
                          : participant
                      )
                    }
                  : session
              );

              setSessions(updatedSessions);

              // Also save to localStorage as backup
              localStorage.setItem('winnerTakesAllSessions', JSON.stringify(updatedSessions));

              // Force immediate UI update by triggering a re-render
              setTimeout(() => {
                setSessions(prevSessions => [...prevSessions]);
              }, 100);

              // Save to Supabase shared sessions table
              try {
                const sessionToUpdate = updatedSessions.find(s => s.id === selectedGameFlow.sessionId);
                if (sessionToUpdate) {
                  console.log('💾 [Winner Takes It All] Saving updated session to Supabase:', {
                    sessionId: sessionToUpdate.id,
                    participants: sessionToUpdate.participants,
                    userParticipant: sessionToUpdate.participants.find(p => p.user_id === user.id),
                    currentPot: sessionToUpdate.current_pot,
                    participantsCount: sessionToUpdate.participants_count
                  });

                  const { error: upsertError } = await supabase
                    .from('winner_takes_all_shared_sessions')
                    .upsert({
                      id: sessionToUpdate.id,
                      config_id: sessionToUpdate.config_id,
                      current_pot: sessionToUpdate.current_pot,
                      base_price: sessionToUpdate.base_price,
                      participants_count: sessionToUpdate.participants_count,
                      status: sessionToUpdate.status,
                      timer_started_at: sessionToUpdate.timer_started_at,
                      participants: sessionToUpdate.participants,
                      updated_at: new Date().toISOString()
                    });

                  if (upsertError) {
                    console.error('❌ [Winner Takes It All] Error saving score to Supabase:', upsertError);
                  } else {
                    console.log('✅ [Winner Takes It All] Score saved to Supabase successfully');
                    
                    // Force refresh participants data multiple times to ensure UI updates
                    setTimeout(() => {
                      refreshParticipantsData();
                    }, 500);
                    
                    setTimeout(() => {
                      refreshParticipantsData();
                    }, 1500);
                    
                    setTimeout(() => {
                      refreshParticipantsData();
                    }, 3000);
                  }
                } else {
                  console.error('❌ [Winner Takes It All] Session not found for update:', selectedGameFlow.sessionId);
                }
              } catch (error) {
                console.error('❌ [Winner Takes It All] Error saving score:', error);
              }

              console.log('✅ [Winner Takes It All] Score recorded in Supabase:', score);
              console.log('✅ [Winner Takes It All] User locked out from playing again');

              // Update user completion state immediately
              setUserCompletions(prev => {
                const newCompletions = {
                  ...prev,
                  [selectedGameFlow.configId]: {
                    score: score,
                    completed: true
                  }
                };
                
                // Save to user-specific localStorage
                if (user?.id) {
                  localStorage.setItem(`winnerTakesAllCompletions_${user.id}`, JSON.stringify(newCompletions));
                  console.log('💾 [Winner Takes It All] Saved user completions to localStorage:', newCompletions);
                }
                
                return newCompletions;
              });

              // Save score to dashboard (game_history) with fallback
              try {
                console.log('💾 [Winner Takes It All] Saving score to dashboard:', {
                  user_id: user.id,
                  game_type: selectedGameFlow.gameType,
                  score: score,
                  accuracy: accuracy,
                  tournament_type: 'winner_takes_all'
                });

                const { error: dashboardError } = await supabase
                  .from('game_history')
                  .insert({
                    user_id: user.id,
                    game_type: selectedGameFlow.gameType,
                    score: score,
                    accuracy: accuracy,
                    tournament_type: 'winner_takes_all',
                    is_practice: false, // Winner Takes It All is a competition, not practice
                    is_competition: true, // Mark as competition
                    created_at: new Date().toISOString()
                  });

                if (dashboardError) {
                  console.error('❌ [Winner Takes It All] Error saving score to dashboard:', dashboardError);
                  
                  // Fallback: try without tournament_type if column doesn't exist
                  try {
                    const { error: fallbackError } = await supabase
                      .from('game_history')
                      .insert({
                        user_id: user.id,
                        game_type: selectedGameFlow.gameType,
                        score: score,
                        accuracy: accuracy,
                        is_practice: false,
                        is_competition: true,
                        created_at: new Date().toISOString()
                      });
                    
                    if (fallbackError) {
                      console.error('❌ [Winner Takes It All] Fallback dashboard save also failed:', fallbackError);
                    } else {
                      console.log('✅ [Winner Takes It All] Score saved to dashboard (fallback)');
                    }
                  } catch (fallbackError) {
                    console.error('❌ [Winner Takes It All] Fallback dashboard save error:', fallbackError);
                  }
                } else {
                  console.log('✅ [Winner Takes It All] Score saved to dashboard successfully');
                  
                  // Simple dashboard update method (alternative approach)
                  console.log('📊 [Winner Takes It All] Score saved successfully, dashboard will update on redirect');
                }
              } catch (error) {
                console.error('❌ [Winner Takes It All] Error saving score to dashboard:', error);
              }

              // Also save to competitions table for competitions tab
              try {
                const { error: competitionsError } = await supabase
                  .from('competitions')
                  .insert({
                    user_id: user.id,
                    game_type: selectedGameFlow.gameType,
                    score: score,
                    accuracy: accuracy,
                    tournament_type: 'winner_takes_all',
                    session_id: selectedGameFlow.sessionId,
                    is_practice: false, // Winner Takes It All is a competition
                    is_competition: true, // Mark as competition
                    created_at: new Date().toISOString()
                  });

                if (competitionsError) {
                  console.error('❌ [Winner Takes It All] Error saving score to competitions:', competitionsError);
                  // If competitions table doesn't exist, try without tournament_type
                  try {
                    const { error: fallbackError } = await supabase
                      .from('competitions')
                      .insert({
                        user_id: user.id,
                        game_type: selectedGameFlow.gameType,
                        score: score,
                        accuracy: accuracy,
                        session_id: selectedGameFlow.sessionId,
                        is_practice: false, // Winner Takes It All is a competition
                        is_competition: true, // Mark as competition
                        created_at: new Date().toISOString()
                      });
                    
                    if (fallbackError) {
                      console.error('❌ [Winner Takes It All] Fallback competitions save also failed:', fallbackError);
                    } else {
                      console.log('✅ [Winner Takes It All] Score saved to competitions (fallback)');
                    }
                  } catch (fallbackError) {
                    console.error('❌ [Winner Takes It All] Fallback competitions save error:', fallbackError);
                  }
                } else {
                  console.log('✅ [Winner Takes It All] Score saved to competitions');
                  
                  // Simple dashboard update method (alternative approach)
                  console.log('📊 [Winner Takes It All] Score saved successfully, dashboard will update on redirect');
                }
              } catch (error) {
                console.error('❌ [Winner Takes It All] Error saving score to competitions:', error);
              }

              // Show success message
              setMessage({ 
                type: 'success', 
                text: `Game completed! Your score: ${score}. Redirecting to dashboard...` 
              });

              // Simple dashboard update method
              try {
                console.log('📊 [Winner Takes It All] Refreshing user tokens for dashboard update...');
                await refreshTokens(); // Refresh token balance
                console.log('✅ [Winner Takes It All] Tokens refreshed, redirecting to dashboard...');
              } catch (error) {
                console.error('❌ [Winner Takes It All] Error refreshing tokens:', error);
              }

              // Redirect to dashboard with a longer delay to ensure data is saved
              setTimeout(() => {
                console.log('🔄 [Winner Takes It All] Redirecting to dashboard...');
                window.location.href = '/dashboard';
              }, 2000);

            } catch (error) {
              console.error('❌ [Winner Takes It All] Error recording score:', error);
              setMessage({ type: 'error', text: 'Game completed but there was an error saving your score.' });
            }

            // Return to list view
            setCurrentView('list');
            setSelectedGameFlow(null);
          }}
          onCancel={() => {
            setCurrentView('list');
            setSelectedGameFlow(null);
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-800 via-yellow-700 to-yellow-600 text-white relative overflow-hidden animate-gold-flicker">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-400/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      <CleanNavigation currentPage="winner-takes-all" />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <TrophyIcon className="w-12 h-12 text-yellow-500 mr-4 animate-pulse" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              WINNER TAKES IT ALL
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">1 Token Entry - Winner Gets Everything!</p>
          <p className="text-lg text-gray-400">Unlimited players, base price matching prize amount</p>
          
          {/* User Status */}
          {isAuthenticated && (
            <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <div className="inline-flex items-center bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/20">
                <BanknotesIcon className="w-6 h-6 text-yellow-400 mr-3" />
                <span className="text-lg font-semibold">Your Tokens: {userTokens}</span>
              </div>
              
              {/* Location Verification Status */}
              <div className={`inline-flex items-center backdrop-blur-xl rounded-2xl px-6 py-3 border ${
                locationVerified 
                  ? 'bg-green-500/20 border-green-500/50' 
                  : 'bg-red-500/20 border-red-500/50'
              }`}>
                {locationVerified ? (
                  <>
                    <CheckCircleIcon className="w-6 h-6 text-green-400 mr-3" />
                    <span className="text-lg font-semibold text-green-300">Location Verified</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-400 mr-3" />
                    <span className="text-lg font-semibold text-red-300">Location Not Verified</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-green-500/20 border-green-500/50 text-green-300' 
              : 'bg-red-500/20 border-red-500/50 text-red-300'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl">
          <p className="text-blue-300 text-sm">
            Debug: Rendering {hardcodedListings.length} hardcoded Winner Takes It All tournaments
          </p>
        </div>

        {/* Winner Takes It All Games */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {configs.map((config) => {
            const session = sessions.find(s => s.config_id === config.id);
            // Calculate timer state directly from session data (simpler approach)
            const timer = session ? {
              isBasePriceMet: session.current_pot >= session.base_price,
              isTimerActive: session.status === 'active' && session.timer_started_at,
              minutes: session.timer_started_at ? Math.max(0, Math.floor((1800 - Math.floor((Date.now() - new Date(session.timer_started_at).getTime()) / 1000)) / 60)) : 0,
              seconds: session.timer_started_at ? Math.max(0, (1800 - Math.floor((Date.now() - new Date(session.timer_started_at).getTime()) / 1000)) % 60) : 0,
              hours: 0,
              currentPot: session.current_pot,
              basePrice: session.base_price
            } : null;
            
            // Simple timer start check (alternative approach)
            if (session && session.current_pot >= session.base_price && !session.timer_started_at && session.status !== 'completed') {
              console.log('🎯 [Winner Takes It All] Base price met, starting timer for session:', session.id);
              // Start timer directly without complex state management
              supabase
                .from('winner_takes_all_shared_sessions')
                .update({ 
                  timer_started_at: new Date().toISOString(),
                  status: 'active',
                  updated_at: new Date().toISOString()
                })
                .eq('id', session.id)
                .then(({ error }) => {
                  if (error) {
                    console.error('❌ [Winner Takes It All] Error starting timer:', error);
                  } else {
                    console.log('✅ [Winner Takes It All] Timer started successfully');
                  }
                });
            }
            const prizeDistribution = calculateWinnerTakesAllPayouts(config);
            const canJoin = userTokens >= config.entry_fee;
            
            console.log('🎮 Rendering Winner Takes It All config:', config.title);
            
            // Skip rendering if payout calculation failed
            if (!prizeDistribution) {
              console.warn('Skipping Winner Takes It All config due to payout calculation failure:', config.title);
              return null;
            }
            
            return (
              <div key={config.id} className={`bg-white/10 backdrop-blur-xl rounded-3xl p-6 border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                timer?.isTimerActive ? 
                  'border-red-400/60 animate-pulse shadow-red-500/30 hover:bg-red-500/10' : 
                  'border-white/20 hover:bg-white/15'
              }`}>
                {/* Game Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">🏆</span>
                      <h3 className="text-xl font-bold text-white">{config.title}</h3>
                    </div>
                    <div className="flex items-center rounded-full px-3 py-1 bg-purple-500/20 text-purple-300">
                      <StarIcon className="w-4 h-4 mr-1" />
                      <span className="text-xs font-semibold">WINNER TAKES ALL</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{config.description}</p>
                  
                  {/* Entry Fee */}
                  <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-green-500 to-emerald-500">
                    <div className="text-center">
                      <p className="text-green-100 text-sm font-medium mb-1">ENTRY FEE</p>
                      <p className="text-2xl font-bold text-white">${config.entry_fee}.00</p>
                    </div>
                  </div>
                  
                  {/* Enhanced Current Pot with Calculator */}
                  <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-purple-500 to-pink-500">
                    <div className="text-center">
                      <p className="text-purple-100 text-sm font-medium mb-1">CURRENT POT</p>
                      <p className="text-2xl font-bold text-white">{session?.current_pot || 0} tokens</p>
                      <p className="text-purple-200 text-xs mt-1">Base pot: ${prizeDistribution.totalPrize}, grows with each player's token</p>
                      
                      {/* Live Calculator Display */}
                      <div className="mt-3 p-3 bg-white/10 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-yellow-300 font-semibold">Winner Gets:</div>
                            <div className="text-white font-bold">${((session?.current_pot || 0) * 0.85).toFixed(2)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-300 font-semibold">Platform Fee (15%):</div>
                            <div className="text-white font-bold">${((session?.current_pot || 0) * 0.15).toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-purple-200">
                          💰 Pot grows by {config.entry_fee} token per player
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Live Timer Display with Animations */}
                  {timer && (
                    <div className="mb-4">
                      <div className={`text-center p-4 rounded-xl border-2 transition-all duration-500 ${
                        timer.isTimerActive ? 
                          'bg-gradient-to-r from-red-600/30 to-red-800/30 border-red-400 animate-pulse shadow-lg shadow-red-500/50' :
                          timer.isBasePriceMet ? 
                            'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/60' : 
                            'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/60'
                      }`}>
                        <div className="flex items-center justify-center mb-3">
                          <ClockIcon className={`w-6 h-6 mr-3 ${
                            timer.isTimerActive ? 'animate-spin text-red-400' :
                            timer.isBasePriceMet ? 'animate-pulse text-green-400' : 'animate-pulse text-yellow-400'
                          }`} />
                          <span className={`text-lg font-bold ${
                            timer.isTimerActive ? 'text-red-300 animate-pulse' :
                            timer.isBasePriceMet ? 'text-green-300' : 'text-yellow-300'
                          }`}>
                            {timer.isTimerActive ? '🚨 LIVE TOURNAMENT - JOIN NOW!' : 
                             timer.isBasePriceMet ? '⏰ LIVE TOURNAMENT TIMER' : '⏳ WAITING FOR BASE PRICE'}
                          </span>
                        </div>
                        
                        {timer.isTimerActive ? (
                          <div className="space-y-2">
                            <div className="text-4xl font-bold text-red-300 font-mono tracking-wider animate-pulse">
                              {formatTimeRemaining(timer.minutes, timer.seconds, timer.hours)}
                            </div>
                            <div className="text-sm text-red-200 animate-bounce">
                              🚨 Tournament is LIVE! Join now before time runs out!
                            </div>
                            <div className="text-xs text-yellow-300">
                              Current Pot: {timer.currentPot} tokens | Base Price: {timer.basePrice} tokens
                            </div>
                          </div>
                        ) : timer.isBasePriceMet ? (
                          <div className="space-y-2">
                            <div className="text-3xl font-bold text-green-300 font-mono tracking-wider">
                              {formatTimeRemaining(timer.minutes, timer.seconds, timer.hours)}
                            </div>
                            <div className="text-sm text-green-200">
                              Tournament ends when timer reaches 00:00
                            </div>
                            <div className="flex justify-center">
                              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xl font-bold text-yellow-300">
                              {prizeDistribution.basePrice - (session?.current_pot || 0)} tokens needed
                            </div>
                            <div className="text-sm text-yellow-200">
                              Join now to help reach the base price!
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress Bar - Current pot to base price */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span>Token Progress</span>
                      <span>{session?.current_pot || 0} / {prizeDistribution.basePrice} tokens to base price</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          timer?.isBasePriceMet ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, ((session?.current_pot || 0) / prizeDistribution.basePrice) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Base Price: {prizeDistribution.basePrice} tokens</span>
                      <span>Current Pot: {session?.current_pot || 0} tokens</span>
                    </div>
                  </div>
                  
                  {/* Game Info */}
                  <div className="space-y-2 text-sm text-gray-300 mb-6">
                    <div className="flex justify-between">
                      <span>Game Type:</span>
                      <span className="text-white font-medium">{getGameIcon(config.game_type)} {config.game_type.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="text-white font-medium">{config.game_duration}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Winner Prize:</span>
                      <span className="text-yellow-400 font-bold">{formatPrizeAmount(prizeDistribution.winnerPrize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Fee:</span>
                      <span className="text-red-400 font-bold">{formatPrizeAmount(prizeDistribution.platformFee)}</span>
                    </div>
                  </div>
                  
                  {/* Live Scoreboard - Only show if user has played or there are participants with scores */}
                  {(() => {
                    const participantsWithScores = session ? 
                      session.participants.filter(p => p.score !== null && p.score !== undefined) : [];
                    
                    // Check if current user has played this tournament
                    const userHasPlayed = user && session ? 
                      session.participants.some(p => p.user_id === user.id && p.score !== null && p.score !== undefined) : false;
                    
                    console.log('🏆 [Winner Takes It All] Scoreboard check for config:', config.id, {
                      sessionId: session?.id,
                      totalParticipants: session?.participants?.length || 0,
                      participantsWithScores: participantsWithScores.length,
                      userHasPlayed: userHasPlayed,
                      currentUserId: user?.id,
                      scores: participantsWithScores.map(p => ({ userId: p.user_id, score: p.score }))
                    });
                    
                    // Only show scoreboard if user has played OR if there are participants with scores
                    if (participantsWithScores.length === 0 || !userHasPlayed) {
                      return null; // Don't show scoreboard if user hasn't played
                    }

                    return (
                      <div className="mb-6">
                        <div className="flex items-center justify-between w-full">
                          <button
                            onClick={() => {
                              const scoreboard = document.getElementById(`winner-scoreboard-${config.id}`);
                              if (scoreboard) {
                                scoreboard.classList.toggle('hidden');
                              }
                            }}
                            className="flex items-center text-left"
                          >
                            <h4 className="text-sm font-semibold text-white flex items-center">
                              <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
                              Live Scoreboard ({participantsWithScores.length} player{participantsWithScores.length !== 1 ? 's' : ''})
                            </h4>
                            <span className="text-gray-400 text-xs ml-2">Click to expand</span>
                          </button>
                          <button
                            onClick={() => {
                              console.log('🔄 [Winner Takes It All] Manual refresh requested for', config.id);
                              refreshParticipantsData();
                              // Force a re-render of the scoreboard
                              setTimeout(() => {
                                setSessions(prevSessions => [...prevSessions]);
                              }, 100);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded"
                            title="Refresh scoreboard"
                          >
                            🔄 Refresh
                          </button>
                        </div>
                        
                        <div id={`winner-scoreboard-${config.id}`} className="hidden mt-3">
                          <div className="bg-white/5 rounded-xl p-4">
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                              <span>Player</span>
                              <span>Score</span>
                            </div>
                            <div className="space-y-2">
                              {participantsWithScores.length === 0 ? (
                                <div className="text-center py-4 text-gray-400">
                                  <p className="text-sm">No scores yet. Be the first to play!</p>
                                </div>
                              ) : (
                                participantsWithScores
                                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                                  .map((participant, index) => {
                                    const isCurrentUser = participant.user_id === user?.id;
                                    return (
                                      <div key={participant.id} className={`rounded-lg p-3 ${
                                        isCurrentUser ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50' : 'bg-white/5'
                                      }`}>
                                        <div className="flex items-center justify-between">
                                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-600'
                                          }`}>
                                            <span className="text-xs font-bold text-white">{index + 1}</span>
                                          </div>
                                          <span className={`text-sm ${isCurrentUser ? 'text-purple-300 font-semibold' : 'text-white'}`}>
                                            {isCurrentUser ? 'You' : `Player ${participant.user_id.slice(-4)}`}
                                          </span>
                                          <span className={`font-semibold ${isCurrentUser ? 'text-purple-300' : 'text-white'}`}>
                                            {participant.score}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Join Button - Simplified */}
                  <div className="space-y-3">
                    {!isAuthenticated ? (
                      <div className="bg-gray-600 rounded-xl p-3 text-center">
                        <p className="text-gray-300 text-sm">Please log in to join tournaments</p>
                      </div>
                    ) : !canJoin ? (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center">
                        <p className="text-red-300 text-sm">You need {config.entry_fee} token to join</p>
                      </div>
                    ) : (() => {
                      // Check if tournament is completed
                      const tournamentCompleted = session && isTournamentCompleted(session);
                      
                      if (tournamentCompleted) {
                        // Show winner and reset button
                        const participantsWithScores = session.participants.filter((p: any) => p.score !== null && p.score !== undefined);
                        const winner = participantsWithScores.sort((a: any, b: any) => (b.score || 0) - (a.score || 0))[0];
                        
                        // Check if winner has been paid (from Supabase or localStorage)
                        const isPaidFromSupabase = session.winner_paid;
                        const isPaidFromLocalStorage = localStorage.getItem(`winnerTakesAllPayout_${session.id}`);
                        const isPaid = isPaidFromSupabase || isPaidFromLocalStorage;
                        
                        // Auto-payout winner if not already paid (for any winner, not just current user)
                        if (winner && !isPaid && !processingPayouts.has(session.id)) {
                          console.log('💰 [Winner Takes It All] Triggering automatic payout for winner:', winner.user_id);
                          
                          // Mark session as being processed
                          setProcessingPayouts(prev => new Set(prev).add(session.id));
                          
                          payoutWinner(session.id, winner.user_id, prizeDistribution.winnerPrize).then((payoutSuccess) => {
                            if (payoutSuccess) {
                              // After successful automatic payout, reset the tournament
                              console.log('🔄 [Winner Takes It All] Auto-resetting tournament after automatic payout');
                              setTimeout(() => {
                                resetCompletedTournament(session.id);
                                // Remove from processing set after reset
                                setProcessingPayouts(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(session.id);
                                  return newSet;
                                });
                              }, 2000);
                            } else {
                              // Remove from processing set if payout failed
                              setProcessingPayouts(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(session.id);
                                return newSet;
                              });
                            }
                          });
                        }
                        
                        return (
                          <div className="space-y-3">
                            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-3 text-center">
                              <div className="flex items-center justify-center mb-2">
                                <TrophyIcon className="w-6 h-6 text-yellow-400 mr-2" />
                                <span className="text-yellow-300 text-lg font-semibold">TOURNAMENT COMPLETED!</span>
                              </div>
                              <p className="text-yellow-200 text-sm">Winner: Player {winner?.user_id?.slice(-4)} with score {winner?.score}</p>
                              <p className="text-yellow-200 text-sm">Prize: {prizeDistribution.winnerPrize} tokens</p>
                              <p className="text-yellow-200 text-sm">Platform Fee: {prizeDistribution.platformFee} tokens</p>
                              <p className="text-green-300 text-xs mt-1">
                                {isPaid ? '✅ Winner has been paid out!' : '⏳ Processing payout...'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-yellow-200 text-sm">
                                {isPaid ? '✅ Tournament completed and reset automatically!' : '⏳ Processing automatic payout and reset...'}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      
                      // Check if user already completed this tournament (has a score)
                      // Check user completion state first (most reliable)
                      const userCompletion = userCompletions[config.id];
                      if (userCompletion && userCompletion.completed) {
                        return (
                          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 text-center">
                            <div className="flex items-center justify-center">
                              <CheckCircleIcon className="w-6 h-6 text-green-400 mr-2" />
                              <span className="text-green-300 text-lg font-semibold">COMPLETED</span>
                            </div>
                            <p className="text-green-200 text-sm mt-1">Your score: {userCompletion.score}</p>
                            <p className="text-green-200 text-xs mt-1">Tournament will reset automatically after payout</p>
                          </div>
                        );
                      }

                      // Fallback: Check session data
                      let hasCompleted = false;
                      let userParticipant = null;

                      // First check current sessions state
                      if (session && session.participants) {
                        userParticipant = session.participants.find(p => p.user_id === user?.id);
                        hasCompleted = userParticipant && 
                          userParticipant.score !== null && 
                          userParticipant.score !== undefined && 
                          userParticipant.score !== 0;
                      }

                      // If not found in current state, check localStorage as backup
                      if (!hasCompleted) {
                        try {
                          const savedSessions = localStorage.getItem('winnerTakesAllSessions');
                          if (savedSessions) {
                            const parsedSessions = JSON.parse(savedSessions);
                            const savedSession = parsedSessions.find((s: any) => s.config_id === config.id);
                            if (savedSession && savedSession.participants) {
                              userParticipant = savedSession.participants.find((p: any) => p.user_id === user?.id);
                              hasCompleted = userParticipant && 
                                userParticipant.score !== null && 
                                userParticipant.score !== undefined && 
                                userParticipant.score !== 0;
                            }
                          }
                        } catch (error) {
                          console.error('❌ [Winner Takes It All] Error checking localStorage:', error);
                        }
                      }
                      
                      console.log('🔍 [Winner Takes It All] Completion check:', {
                        configId: config.id,
                        userId: user?.id,
                        userCompletion,
                        sessionExists: !!session,
                        participants: session?.participants || [],
                        hasCompleted,
                        userParticipant,
                        score: userParticipant?.score
                      });
                      
                      if (hasCompleted) {
                        return (
                          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 text-center">
                            <div className="flex items-center justify-center">
                              <CheckCircleIcon className="w-6 h-6 text-green-400 mr-2" />
                              <span className="text-green-300 text-lg font-semibold">COMPLETED</span>
                            </div>
                            <p className="text-green-200 text-sm mt-1">Your score: {userParticipant?.score}</p>
                            <p className="text-green-200 text-xs mt-1">You cannot play again</p>
                          </div>
                        );
                      }
                      
                      return (
                        <button
                          onClick={() => handleJoinGame(config.id)}
                          disabled={joiningWinnerTakesAll}
                          className={`w-full py-4 px-6 rounded-2xl font-bold text-white text-lg transition-all duration-300 ${
                            joiningWinnerTakesAll
                              ? 'bg-gray-600 cursor-not-allowed opacity-50'
                              : locationVerified
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 hover:scale-105 shadow-lg hover:shadow-xl'
                              : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:scale-105 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {joiningWinnerTakesAll ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                              <span className="text-lg">Joining Game...</span>
                            </div>
                          ) : locationVerified ? (
                            <div className="flex items-center justify-center">
                              <span className="text-xl mr-2">🔓</span>
                              <span>JOIN GAME - ${config.entry_fee}.00</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <span className="text-xl mr-2">🔒</span>
                              <span>JOIN GAME - VERIFY LOCATION</span>
                            </div>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}