'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import { FixedGamesService } from '@/lib/supabase/fixedGamesService';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
import ErrorBoundary from '@/components/ErrorBoundary';
import CleanNavigation from '@/components/navigation/CleanNavigation';
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
  
  // Winner Takes It All state
  const [winnerTakesAllSessions, setWinnerTakesAllSessions] = useState<any[]>([]);
  const [winnerTakesAllParticipants, setWinnerTakesAllParticipants] = useState<{ [sessionId: string]: any[] }>({});
  const [joiningWinnerTakesAll, setJoiningWinnerTakesAll] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean; hours?: number; isBasePriceMet?: boolean; canJoin?: boolean; isTimerActive?: boolean; basePrice?: number; currentPot?: number; } }>({});

  useEffect(() => {
    if (isAuthenticated && user) {
      loadWinnerTakesAllData();
    }
  }, [isAuthenticated, user?.id]);

  // Refresh participants data every 30 seconds
  useEffect(() => {
    if (winnerTakesAllSessions.length > 0) {
      const interval = setInterval(() => {
        refreshParticipantsData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [winnerTakesAllSessions.length]);

  useEffect(() => {
    // Update timers every second
    const timer = setInterval(() => {
      updateTimers();
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Remove winnerTakesAllSessions dependency to prevent infinite re-renders

  const loadWinnerTakesAllData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 [Winner Takes It All] Loading data...');
      
      // Load fixed game configs
      const configs = await FixedGamesService.getFixedGameConfigs();
      const winnerTakesAllConfigs = configs.filter(config => config.tournament_type === 'winner_takes_all');
      setFixedGameConfigs(winnerTakesAllConfigs);
      
      // Load Winner Takes It All sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .rpc('get_all_winner_takes_all_sessions');
      
      if (sessionsError) {
        console.error('❌ [Winner Takes It All] Error loading sessions:', sessionsError);
        return;
      }
      
      setWinnerTakesAllSessions(sessionsData || []);
      
      // Load participants for each session
      const participantsData: { [sessionId: string]: any[] } = {};
      for (const session of sessionsData || []) {
        try {
          const { data: sessionData, error: sessionError } = await supabase
            .rpc('get_winner_takes_all_session', { session_id_param: session.id });
          
          if (sessionError) {
            console.warn(`Failed to load participants for Winner Takes It All session ${session.id}:`, sessionError);
            participantsData[session.id] = [];
          } else {
            participantsData[session.id] = sessionData?.participants || [];
          }
        } catch (error) {
          console.warn(`Failed to load participants for Winner Takes It All session ${session.id}:`, error);
          participantsData[session.id] = [];
        }
      }
      setWinnerTakesAllParticipants(participantsData);
      
      console.log('✅ [Winner Takes It All] Data loaded successfully');
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshParticipantsData = async () => {
    try {
      const participantsData: { [sessionId: string]: any[] } = {};
      for (const session of winnerTakesAllSessions) {
        try {
          const { data: sessionData, error: sessionError } = await supabase
            .rpc('get_winner_takes_all_session', { session_id_param: session.id });
          
          if (sessionError) {
            console.warn(`Failed to refresh participants for Winner Takes It All session ${session.id}:`, sessionError);
            participantsData[session.id] = [];
          } else {
            participantsData[session.id] = sessionData?.participants || [];
          }
        } catch (error) {
          console.warn(`Failed to refresh participants for Winner Takes It All session ${session.id}:`, error);
          participantsData[session.id] = [];
        }
      }
      setWinnerTakesAllParticipants(participantsData);
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error refreshing participants:', error);
    }
  };

  const updateTimers = () => {
    // Only update if we have sessions to avoid unnecessary state updates
    if (winnerTakesAllSessions.length === 0) return;
    
    const newTimeRemaining: { [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean; hours?: number; isBasePriceMet?: boolean; canJoin?: boolean; isTimerActive?: boolean; basePrice?: number; currentPot?: number; } } = {};
    
    winnerTakesAllSessions.forEach(session => {
      const config = fixedGameConfigs.find(c => c.id === session.config_id);
      
      if (config) {
        const payouts = calculateWinnerTakesAllPayouts(config);
        if (payouts) {
          // For Winner Takes It All, use target_pot as base price
          const basePrice = session.target_pot || payouts.basePrice;
          const isBasePriceMet = (session.current_pot || 0) >= basePrice;
          const isTimerActive = session.status === 'active' && session.timer_started_at;
          
          let timeRemaining = 0;
          if (isTimerActive && session.timer_started_at) {
            const elapsed = Math.floor((Date.now() - new Date(session.timer_started_at).getTime()) / 1000);
            timeRemaining = Math.max(0, config.game_duration - elapsed);
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
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleJoinGame = async (configId: string) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    // Check if user already joined this tournament
    const session = winnerTakesAllSessions.find(s => s.config_id === configId);
    if (session) {
      const hasJoined = winnerTakesAllParticipants[session.id]?.some(
        p => p.user_id === user.id
      );
      
      if (hasJoined) {
        setMessage({ type: 'error', text: 'You have already joined this tournament! Check the scoreboard for your score.' });
        return;
      }
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
      // Find or create Winner Takes It All session
      let session = winnerTakesAllSessions.find(s => s.config_id === configId);
      
      if (!session) {
        console.log('🎮 [Winner Takes It All] Creating new session for config:', configId);
        // Create new session
        const { data: sessionId, error: createError } = await supabase
          .rpc('create_winner_takes_all_session', { config_id_param: configId });
        
        if (createError) {
          console.error('❌ [Winner Takes It All] Error creating session:', createError);
          setMessage({ type: 'error', text: 'Failed to create session. Please try again.' });
          return;
        }
        
        console.log('🎮 [Winner Takes It All] Created session with ID:', sessionId);
        
        // Get the created session
        const { data: sessionData, error: sessionError } = await supabase
          .rpc('get_winner_takes_all_session', { session_id_param: sessionId });
        
        if (sessionError) {
          console.error('❌ [Winner Takes It All] Error getting session:', sessionError);
          setMessage({ type: 'error', text: 'Failed to get session. Please try again.' });
          return;
        }
        
        session = sessionData;
      }

      // Check if user already joined
      const hasJoined = winnerTakesAllParticipants[session.id]?.some(
        p => p.user_id === user.id
      );
      
      if (hasJoined) {
        setMessage({ type: 'error', text: 'You have already joined this Winner Takes It All tournament!' });
        return;
      }

      // Join the session
      console.log('🎮 [Winner Takes It All] Joining session:', session.id);
      const { data: joinResult, error: joinError } = await supabase
        .rpc('join_winner_takes_all_session', { session_id_param: session.id });
      
      if (joinError) {
        console.error('❌ [Winner Takes It All] Error joining session:', joinError);
        setMessage({ type: 'error', text: 'Failed to join session. Please try again.' });
        return;
      }
      
      console.log('🎮 [Winner Takes It All] Successfully joined session:', joinResult);

      // Deduct token from user's wallet
      const { error: deductError } = await supabase
        .from('token_transactions')
        .insert({
          user_id: user.id,
          amount: -1, // Deduct 1 token
          transaction_type: 'tournament_entry',
          description: `Winner Takes It All tournament entry - ${session.id}`,
          metadata: { session_id: session.id, config_id: configId }
        });

      if (deductError) {
        console.error('❌ [Winner Takes It All] Error deducting token:', deductError);
        setMessage({ type: 'error', text: 'Failed to deduct token. Please try again.' });
        return;
      }

      // Refresh token balance
      refreshTokens();

      // Start the game
      const config = fixedGameConfigs.find(c => c.id === configId);
      if (config) {
        setSelectedGameFlow({
          gameType: config.game_type,
          sessionId: session.id,
          configId: configId,
          entryFee: 1
        });
        setCurrentView('game');
      }

      setMessage({ type: 'success', text: 'Successfully joined Winner Takes It All tournament!' });
      
      // Refresh data
      await loadWinnerTakesAllData();
      
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

  // Winner Takes It All payout calculation (hardcoded for specific tournaments)
  const calculateWinnerTakesAllPayouts = (config: FixedGameConfig) => {
    const title = config.title || '';
    
    // Hardcoded configurations for specific Winner Takes It All tournaments
    if (title.includes('$100 Winner Takes It All')) {
      return {
        winnerPrize: 85, // Winner gets $85
        platformFee: 15, // Platform fee $15
        totalPrize: 100, // Total prize $100
        entryFee: 1, // 1 token entry
        basePrice: 100, // Base price $100 (full prize)
        maxPlayers: null // No max players for Winner Takes It All
      };
    } else if (title.includes('$250 Winner Takes It All')) {
      return {
        winnerPrize: 212.50, // Winner gets $212.50
        platformFee: 37.50, // Platform fee $37.50
        totalPrize: 250, // Total prize $250
        entryFee: 1, // 1 token entry
        basePrice: 250, // Base price $250 (full prize)
        maxPlayers: null
      };
    } else if (title.includes('$1000 Winner Takes It All')) {
      return {
        winnerPrize: 850, // Winner gets $850
        platformFee: 150, // Platform fee $150
        totalPrize: 1000, // Total prize $1000
        entryFee: 1, // 1 token entry
        basePrice: 1000, // Base price $1000 (full prize)
        maxPlayers: null
      };
    } else if (title.includes('$2500 Winner Takes It All')) {
      return {
        winnerPrize: 2125, // Winner gets $2125
        platformFee: 375, // Platform fee $375
        totalPrize: 2500, // Total prize $2500
        entryFee: 1, // 1 token entry
        basePrice: 2500, // Base price $2500 (full prize)
        maxPlayers: null
      };
    } else if (title.includes('$3 Winner Takes It All')) {
      return {
        winnerPrize: 2.55, // Winner gets $2.55
        platformFee: 0.45, // Platform fee $0.45
        totalPrize: 3, // Total prize $3
        entryFee: 1, // 1 token entry
        basePrice: 3, // Base price $3 (full prize)
        maxPlayers: null
      };
    } else if (title.includes('$2 Winner Takes It All')) {
      return {
        winnerPrize: 1.70, // Winner gets $1.70
        platformFee: 0.30, // Platform fee $0.30
        totalPrize: 2, // Total prize $2
        entryFee: 1, // 1 token entry
        basePrice: 2, // Base price $2 (full prize)
        maxPlayers: null
      };
    } else if (title.includes('$10 Winner Takes It All')) {
      return {
        winnerPrize: 8.50, // Winner gets $8.50
        platformFee: 1.50, // Platform fee $1.50
        totalPrize: 10, // Total prize $10
        entryFee: 1, // 1 token entry
        basePrice: 10, // Base price $10 (full prize)
        maxPlayers: null
      };
    } else if (title.includes('$50 Winner Takes It All')) {
      return {
        winnerPrize: 42.50, // Winner gets $42.50
        platformFee: 7.50, // Platform fee $7.50
        totalPrize: 50, // Total prize $50
        entryFee: 1, // 1 token entry
        basePrice: 50, // Base price $50 (full prize)
        maxPlayers: null
      };
    } else if (title.includes('$500 Winner Takes It All')) {
      return {
        winnerPrize: 425, // Winner gets $425
        platformFee: 75, // Platform fee $75
        totalPrize: 500, // Total prize $500
        entryFee: 1, // 1 token entry
        basePrice: 500, // Base price $500 (full prize)
        maxPlayers: null
      };
    }
    
    return null;
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
    const gameConfig = fixedGameConfigs.find(c => c.id === selectedGameFlow.configId);
    const rngSeed = gameConfig?.rng_seed || 1;
    
    return (
      <ErrorBoundary>
        <CompetitionGameFlow
          gameType={selectedGameFlow.gameType}
          sessionId={selectedGameFlow.sessionId}
          configId={selectedGameFlow.configId}
          entryFee={selectedGameFlow.entryFee}
          onGameComplete={(score) => {
            console.log('Game completed with score:', score);
            setCurrentView('list');
            setSelectedGameFlow(null);
            // Refresh data to show updated scores
            loadWinnerTakesAllData();
          }}
          onBack={() => {
            setCurrentView('list');
            setSelectedGameFlow(null);
          }}
          rngSeed={rngSeed}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      <CleanNavigation />
      
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

        {/* Winner Takes It All Games */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {fixedGameConfigs.map((config) => {
            const session = winnerTakesAllSessions.find(s => s.config_id === config.id);
            const timer = session ? timeRemaining[session.id] : null;
            const prizeDistribution = calculateWinnerTakesAllPayouts(config);
            const canJoin = userTokens >= config.entry_fee;
            
            // Skip rendering if payout calculation failed
            if (!prizeDistribution) {
              console.warn('Skipping Winner Takes It All config due to payout calculation failure:', config.title);
              return null;
            }
            
            return (
              <div key={config.id} className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
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
                  
                  {/* Current Pot */}
                  <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-purple-500 to-pink-500">
                    <div className="text-center">
                      <p className="text-purple-100 text-sm font-medium mb-1">CURRENT POT</p>
                      <p className="text-2xl font-bold text-white">{session?.current_pot || 0} tokens</p>
                      <p className="text-purple-200 text-xs mt-1">Base pot: ${prizeDistribution.totalPrize}, grows with each player's token</p>
                    </div>
                  </div>
                  
                  {/* Timer Display */}
                  {timer && (
                    <div className="mb-4">
                      <div className={`text-center p-3 rounded-xl ${
                        timer.isBasePriceMet ? 'bg-green-500/20 border border-green-500/50' : 'bg-yellow-500/20 border border-yellow-500/50'
                      }`}>
                        <div className="flex items-center justify-center mb-2">
                          <ClockIcon className={`w-5 h-5 mr-2 ${
                            timer.isBasePriceMet ? 'text-green-400' : 'text-yellow-400'
                          }`} />
                          <span className={`font-semibold ${
                            timer.isBasePriceMet ? 'text-green-300' : 'text-yellow-300'
                          }`}>
                            {timer.isBasePriceMet ? 'Game Timer Active!' : 'Waiting for Base Price'}
                          </span>
                        </div>
                        <p className={`text-lg font-bold ${
                          timer.isBasePriceMet ? 'text-green-300' : 'text-yellow-300'
                        }`}>
                          {timer.isBasePriceMet ? formatTimeRemaining(timer.minutes, timer.seconds, timer.hours) : 
                           `Need ${prizeDistribution.basePrice - (session?.current_pot || 0)} more tokens to start`}
                        </p>
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
                  
                  {/* Live Scoreboard - Dropdown */}
                  <div className="mb-6">
                    <button
                      onClick={() => {
                        const scoreboard = document.getElementById(`winner-scoreboard-${config.id}`);
                        if (scoreboard) {
                          scoreboard.classList.toggle('hidden');
                        }
                      }}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <h4 className="text-sm font-semibold text-white flex items-center">
                        <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
                        Live Scoreboard
                      </h4>
                      <span className="text-gray-400 text-xs">Click to expand</span>
                    </button>
                    
                    <div id={`winner-scoreboard-${config.id}`} className="hidden mt-3">
                      <div className="bg-white/5 rounded-xl p-4">
                        {session?.status === 'completed' ? (
                          <div className="text-center text-gray-400">
                            <p>Tournament completed. Results are being finalized.</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                              <span>Player</span>
                              <span>Score</span>
                            </div>
                            {winnerTakesAllParticipants[session?.id] && winnerTakesAllParticipants[session.id].length > 0 ? (
                              <div className="space-y-2">
                                {winnerTakesAllParticipants[session.id]
                                  .filter(p => p.score !== null && p.score !== undefined)
                                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                                  .map((participant, index) => (
                                    <div key={participant.id} className="bg-white/5 rounded-lg p-3">
                                      <div className="flex items-center justify-between">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                                            participant.user_id === user?.id ? 'bg-yellow-500' : 
                                            index === 0 ? 'bg-yellow-500' : 
                                            index === 1 ? 'bg-gray-400' : 
                                            index === 2 ? 'bg-orange-500' : 'bg-gray-600'
                                          }`}>
                                          <span className="text-white font-bold text-xs">{index + 1}</span>
                                        </div>
                                        <span className="text-white text-sm">
                                          {participant.user_id === user?.id ? 'You' : `Player ${index + 1}`}
                                        </span>
                                      </div>
                                      <span className="text-white font-semibold">{participant.score}</span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 text-center">No scores yet. Be the first!</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Join Button - Hardcoded */}
                  <div className="space-y-3">
                    {!isAuthenticated ? (
                      <div className="bg-gray-600 rounded-xl p-3 text-center">
                        <p className="text-gray-300 text-sm">Please log in to join tournaments</p>
                      </div>
                    ) : !canJoin ? (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center">
                        <p className="text-red-300 text-sm">You need {config.entry_fee} token to join</p>
                      </div>
                    ) : !timer?.isBasePriceMet ? (
                      <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-3 text-center">
                        <p className="text-yellow-300 text-sm">Waiting for base price to be met</p>
                        <p className="text-yellow-200 text-xs mt-1">
                          Need {prizeDistribution.basePrice - (session?.current_pot || 0)} more tokens
                        </p>
                      </div>
                    ) : (() => {
                      // Check if user already joined this tournament
                      const hasJoined = session && winnerTakesAllParticipants[session.id]?.some(
                        p => p.user_id === user?.id
                      );
                      
                      if (hasJoined) {
                        return (
                          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 text-center">
                            <div className="flex items-center justify-center">
                              <CheckCircleIcon className="w-6 h-6 text-green-400 mr-2" />
                              <span className="text-green-300 text-lg font-semibold">ALREADY JOINED</span>
                            </div>
                            <p className="text-green-200 text-sm mt-1">Check the scoreboard for your score!</p>
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
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:scale-105 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {joiningWinnerTakesAll ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                              <span className="text-lg">Joining Game...</span>
                            </div>
                          ) : locationVerified ? (
                            <div className="flex items-center justify-center">
                              <span className="text-xl mr-2">🔒</span>
                              <span>JOIN GAME - ${config.entry_fee}.00</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <span className="text-xl mr-2">🌍</span>
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