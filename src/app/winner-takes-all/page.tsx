'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import { FixedGamesService } from '@/lib/supabase/fixedGamesService';
import { UserService } from '@/lib/supabase/userService';
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

  // Hardcoded Winner Takes It All listings
  const hardcodedListings = [
    {
      id: 'wta-100-laser-dodge',
      game_type: 'laser_dodge',
      title: '$100 Winner Takes It All - Laser Dodge',
      description: 'Winner takes the entire $100 prize pool!',
      entry_fee: 1,
      prize_pool: 100,
      base_price: 100,
      game_duration: 60,
      rng_seed: 1,
      winner_prize: 85,
      platform_fee: 15
    },
    {
      id: 'wta-250-multi-target',
      game_type: 'multi_target',
      title: '$250 Winner Takes It All - Multi Target',
      description: 'Winner takes the entire $250 prize pool!',
      entry_fee: 1,
      prize_pool: 250,
      base_price: 250,
      game_duration: 90,
      rng_seed: 2,
      winner_prize: 212.50,
      platform_fee: 37.50
    },
    {
      id: 'wta-1000-sword-parry',
      game_type: 'sword_parry',
      title: '$1000 Winner Takes It All - Sword Parry',
      description: 'Winner takes the entire $1000 prize pool!',
      entry_fee: 1,
      prize_pool: 1000,
      base_price: 1000,
      game_duration: 120,
      rng_seed: 3,
      winner_prize: 850,
      platform_fee: 150
    },
    {
      id: 'wta-2500-quick-click',
      game_type: 'quick_click',
      title: '$2500 Winner Takes It All - Quick Click',
      description: 'Winner takes the entire $2500 prize pool!',
      entry_fee: 1,
      prize_pool: 2500,
      base_price: 2500,
      game_duration: 180,
      rng_seed: 4,
      winner_prize: 2125,
      platform_fee: 375
    },
    {
      id: 'wta-2-color-sequence',
      game_type: 'color_sequence',
      title: '$2 Winner Takes It All - Color Sequence',
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
    }
  ];
  
  // Winner Takes It All state
  const [winnerTakesAllSessions, setWinnerTakesAllSessions] = useState<any[]>([]);
  const [winnerTakesAllParticipants, setWinnerTakesAllParticipants] = useState<{ [sessionId: string]: any[] }>({});
  const [gameScores, setGameScores] = useState<{ [sessionId: string]: { [userId: string]: number } }>({});
  const [joiningWinnerTakesAll, setJoiningWinnerTakesAll] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean; hours?: number; isBasePriceMet?: boolean; canJoin?: boolean; isTimerActive?: boolean; basePrice?: number; currentPot?: number; } }>({});

  useEffect(() => {
    // Always load hardcoded data, regardless of authentication
    loadWinnerTakesAllData();
  }, []);

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
      console.log('🔄 [Winner Takes It All] Loading hardcoded data...');
      
      // Use hardcoded listings instead of database
      setFixedGameConfigs(hardcodedListings as any[]);
      
      // Create mock sessions for each hardcoded listing
      const mockSessions = hardcodedListings.map(listing => ({
        id: `session-${listing.id}`,
        config_id: listing.id,
        current_pot: 0,
        base_price: listing.base_price,
        participants_count: 0,
        status: 'waiting',
        timer_started_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      setWinnerTakesAllSessions(mockSessions);
      
      // Initialize empty participants for each session
      const participantsData: { [sessionId: string]: any[] } = {};
      mockSessions.forEach(session => {
        participantsData[session.id] = [];
      });
      setWinnerTakesAllParticipants(participantsData);
      
      console.log('✅ [Winner Takes It All] Hardcoded data loaded successfully');
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshParticipantsData = async () => {
    try {
      // For hardcoded data, we don't need to refresh from database
      // Participants are managed in local state
      console.log('🔄 [Winner Takes It All] Refreshing participants data...');
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

    // Check if user already completed this tournament (has a score)
    const session = winnerTakesAllSessions.find(s => s.config_id === configId);
    if (session && gameScores[session.id] && gameScores[session.id][user.id]) {
      setMessage({ type: 'error', text: 'You have already completed this tournament! Check the scoreboard for your score.' });
      return;
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
      // Find the hardcoded listing
      const listing = hardcodedListings.find(l => l.id === configId);
      if (!listing) {
        setMessage({ type: 'error', text: 'Tournament not found!' });
        return;
      }

      // Find or create session
      let session = winnerTakesAllSessions.find(s => s.config_id === configId);
      if (!session) {
        // Create new mock session
        session = {
          id: `session-${configId}`,
          config_id: configId,
          current_pot: 0,
          base_price: listing.base_price,
          participants_count: 0,
          status: 'waiting',
          timer_started_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Add to sessions
        setWinnerTakesAllSessions(prev => [...prev, session]);
      }

      // Deduct token from user's wallet FIRST (same as hot-sell page)
      const newTokenBalance = userTokens - listing.entry_fee;
      const tokenUpdateSuccess = await UserService.updateUserTokens(user.id, newTokenBalance);
      
      if (!tokenUpdateSuccess) {
        console.error('❌ [Winner Takes It All] Error deducting token');
        setMessage({ type: 'error', text: 'Failed to deduct token. Please try again.' });
        return;
      }

      // Refresh token balance to update local state
      refreshTokens();
      console.log(`✅ [Winner Takes It All] Tokens deducted: ${listing.entry_fee} tokens`);
      console.log(`✅ [Winner Takes It All] New balance: ${newTokenBalance} tokens`);

      // Update session pot and participant count (but don't add user to participants yet)
      setWinnerTakesAllSessions(prev => {
        const updated = prev.map(s => 
          s.id === session.id 
            ? { 
                ...s, 
                current_pot: s.current_pot + 1, 
                participants_count: s.participants_count + 1,
                status: s.current_pot + 1 >= s.base_price ? 'active' : 'waiting'
              }
            : s
        );
        const updatedSession = updated.find(s => s.id === session.id);
        console.log('💰 [Winner Takes It All] Pot updated:', {
          sessionId: session.id,
          oldPot: session.current_pot,
          newPot: updatedSession?.current_pot,
          participants: updatedSession?.participants_count
        });
        return updated;
      });

      // Start the game
      setSelectedGameFlow({
        gameType: listing.game_type,
        sessionId: session.id,
        configId: configId,
        entryFee: 1
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
              // Store the score in the simple gameScores state
              setGameScores(prev => ({
                ...prev,
                [selectedGameFlow.sessionId]: {
                  ...prev[selectedGameFlow.sessionId],
                  [user.id]: score
                }
              }));

              // Also add to participants for compatibility
              const newParticipant = {
                id: `participant-${user.id}-${Date.now()}`,
                session_id: selectedGameFlow.sessionId,
                user_id: user.id,
                score: score,
                joined_at: new Date().toISOString()
              };

              setWinnerTakesAllParticipants(prev => ({
                ...prev,
                [selectedGameFlow.sessionId]: [...(prev[selectedGameFlow.sessionId] || []), newParticipant]
              }));

              console.log('✅ [Winner Takes It All] Score recorded:', score);
              console.log('✅ [Winner Takes It All] User locked out from playing again');

              // Show success message
              setMessage({ 
                type: 'success', 
                text: `Game completed! Your score: ${score}. You can no longer play this tournament.` 
              });

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

        {/* Debug Info */}
        <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl">
          <p className="text-blue-300 text-sm">
            Debug: Rendering {hardcodedListings.length} hardcoded Winner Takes It All tournaments
          </p>
        </div>

        {/* Winner Takes It All Games */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {hardcodedListings.map((config) => {
            const session = winnerTakesAllSessions.find(s => s.config_id === config.id);
            const timer = session ? timeRemaining[session.id] : null;
            const prizeDistribution = calculateWinnerTakesAllPayouts(config);
            const canJoin = userTokens >= config.entry_fee;
            
            console.log('🎮 Rendering Winner Takes It All config:', config.title);
            
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
                  
                  {/* Live Scoreboard - Only show if there are participants with scores */}
                  {(() => {
                    const sessionScores = session ? gameScores[session.id] || {} : {};
                    const participantsWithScores = Object.keys(sessionScores).map(userId => ({
                      user_id: userId,
                      score: sessionScores[userId]
                    }));
                    
                    if (participantsWithScores.length === 0) {
                      return null; // Don't show scoreboard if no one has played
                    }

                    return (
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
                            Live Scoreboard ({participantsWithScores.length} player{participantsWithScores.length !== 1 ? 's' : ''})
                          </h4>
                          <span className="text-gray-400 text-xs">Click to expand</span>
                        </button>
                        
                        <div id={`winner-scoreboard-${config.id}`} className="hidden mt-3">
                          <div className="bg-white/5 rounded-xl p-4">
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                              <span>Player</span>
                              <span>Score</span>
                            </div>
                            <div className="space-y-2">
                              {participantsWithScores
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
                                })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Join Button - Simplified */}
                  <div className="space-y-3">
                    {console.log('🔍 Button Debug:', {
                      isAuthenticated,
                      canJoin,
                      userTokens,
                      entryFee: config.entry_fee,
                      hasJoined: session && winnerTakesAllParticipants[session.id]?.some(p => p.user_id === user?.id)
                    })}
                    {!isAuthenticated ? (
                      <div className="bg-gray-600 rounded-xl p-3 text-center">
                        <p className="text-gray-300 text-sm">Please log in to join tournaments</p>
                      </div>
                    ) : !canJoin ? (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center">
                        <p className="text-red-300 text-sm">You need {config.entry_fee} token to join</p>
                      </div>
                    ) : (() => {
                      // Check if user already completed this tournament (has a score)
                      const hasCompleted = session && gameScores[session.id] && gameScores[session.id][user?.id];
                      
                      if (hasCompleted) {
                        return (
                          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 text-center">
                            <div className="flex items-center justify-center">
                              <CheckCircleIcon className="w-6 h-6 text-green-400 mr-2" />
                              <span className="text-green-300 text-lg font-semibold">COMPLETED</span>
                            </div>
                            <p className="text-green-200 text-sm mt-1">Your score: {gameScores[session.id][user.id]}</p>
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