'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
import ErrorBoundary from '@/components/ErrorBoundary';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { ImprovedLocationService } from '@/lib/improvedLocationService';
import {
  TrophyIcon,
  UsersIcon,
  BanknotesIcon,
  CheckCircleIcon,
  LockClosedIcon,
  MapPinIcon,
  FireIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface OneVOneSession {
  id: string;
  config_id: string;
  current_pool: number;
  prize_pool: number;
  participants_count: number;
  max_participants: number;
  status: 'waiting' | 'active' | 'completed';
  winner_user_id: string | null;
  prize_amount: number | null;
  platform_fee: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  participants: Array<{
    id: string;
    user_id: string;
    score: number | null;
    accuracy: number | null;
    joined_at: string;
    completed_at: string | null;
  }>;
}

interface OneVOneConfig {
  id: string;
  game_type: string;
  title: string;
  description: string;
  entry_fee: number;
  prize_pool: number;
  game_duration: number;
  rng_seed: number;
  winner_prize: number;
  platform_fee: number;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

export default function OneVOnePage() {
  const { user, isAuthenticated } = useAuth();
  const { tokenBalance: userTokens, isLoading: tokensLoading, refreshTokens } = useTokenSync();
  
  const [configs, setConfigs] = useState<OneVOneConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [sessions, setSessions] = useState<OneVOneSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'game'>('list');
  const [selectedGameFlow, setSelectedGameFlow] = useState<{
    gameType: string;
    sessionId: string;
    configId: string;
    entryFee: number;
    rngSeed: number;
  } | null>(null);
  const [joiningSession, setJoiningSession] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [improvedLocation, setImprovedLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Wallet display state (prevent flickering)
  const [displayTokens, setDisplayTokens] = useState<number>(0);
  const [hasLoadedTokens, setHasLoadedTokens] = useState(false);

  useEffect(() => {
    if (!tokensLoading && userTokens !== displayTokens) {
      setDisplayTokens(userTokens);
      setHasLoadedTokens(true);
    }
  }, [userTokens, tokensLoading]);

  // Load configs from database
  const loadConfigs = async () => {
    try {
      setLoadingConfigs(true);
      console.log('📥 [1v1] Loading configs from database...');
      
      const { data, error } = await supabase
        .from('one_v_one_configs')
        .select('*')
        .order('prize_pool', { ascending: true });

      if (error) {
        console.error('❌ [1v1] Error loading configs:', error);
        setConfigs([]);
      } else if (data && data.length > 0) {
        console.log(`✅ [1v1] Loaded ${data.length} configs from database`);
        setConfigs(data as OneVOneConfig[]);
      } else {
        console.warn('⚠️ [1v1] No configs found in DB');
        setConfigs([]);
      }
    } catch (err) {
      console.error('❌ [1v1] Error loading configs:', err);
      setConfigs([]);
    } finally {
      setLoadingConfigs(false);
    }
  };

  // Load sessions from database
  const loadSessions = useCallback(async () => {
    try {
      console.log('🔄 [1v1] Loading sessions from database...');
      
      const { data, error } = await supabase.rpc('get_all_1v1_sessions');
      
      if (error) {
        console.error('❌ [1v1] Error loading sessions:', error);
        setSessions([]);
        return;
      }
      
      console.log('📊 [1v1] Sessions data:', data);
      setSessions(data || []);
      console.log('✅ [1v1] Sessions loaded:', data?.length || 0);
    } catch (error) {
      console.error('❌ [1v1] Error loading sessions:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Location verification - using same method as Winner Takes All
  useEffect(() => {
    const verifyLocation = async () => {
      setLocationLoading(true);
      try {
        const location = await ImprovedLocationService.getCurrentLocation();
        setImprovedLocation(location);
        setLocationVerified(ImprovedLocationService.isGamingAllowed(location));
        console.log('🎮 [1v1] Location verified:', location);
      } catch (error) {
        console.error('❌ [1v1] Location verification failed:', error);
        setLocationVerified(false);
      } finally {
        setLocationLoading(false);
      }
    };

    if (isAuthenticated) {
      verifyLocation();
    }
  }, [isAuthenticated]);

  // Load configs and sessions on mount
  useEffect(() => {
    loadConfigs();
    loadSessions();
    
    // Refresh sessions every 30 seconds
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Handle joining a session
  const handleJoinSession = async (config: OneVOneConfig) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please sign in to join' });
      return;
    }

    console.log('🌍 [1v1] Location check:', { improvedLocation, isGamingAllowed: improvedLocation ? ImprovedLocationService.isGamingAllowed(improvedLocation) : false });
    if (!improvedLocation || !ImprovedLocationService.isGamingAllowed(improvedLocation)) {
      console.log('❌ [1v1] Location not allowed');
      setMessage({ type: 'error', text: 'Gaming not allowed in your location. Please check our terms and conditions.' });
      return;
    }

    if (displayTokens < config.entry_fee) {
      setMessage({ type: 'error', text: 'Insufficient tokens' });
      return;
    }

    try {
      setJoiningSession(true);
      console.log('🎮 [1v1] Joining session for config:', config.id);

      // Find active session for this config
      const session = sessions.find(s => s.config_id === config.id && s.status !== 'completed');
      
      if (!session) {
        setMessage({ type: 'error', text: 'No active session found' });
        return;
      }

      // Check if already joined
      const hasJoined = session.participants.some(p => p.user_id === user.id);
      if (hasJoined) {
        // Already joined, start the game
        console.log('✅ [1v1] Already joined, starting game...');
        setSelectedGameFlow({
          gameType: config.game_type,
          sessionId: session.id,
          configId: config.id,
          entryFee: config.entry_fee,
          rngSeed: config.rng_seed
        });
        setCurrentView('game');
        return;
      }

      // Call join function
      const { data, error } = await supabase.rpc('join_1v1_session', {
        session_id_param: session.id,
        user_id_param: user.id,
        entry_fee_param: config.entry_fee
      });

      console.log('📊 [1v1] Join response:', { data, error });

      if (error) {
        console.error('❌ [1v1] Join error:', error);
        setMessage({ type: 'error', text: error.message || 'Failed to join session' });
        return;
      }

      if (data && !data.success) {
        setMessage({ type: 'error', text: data.message || 'Failed to join session' });
        return;
      }

      // Success!
      console.log('✅ [1v1] Joined successfully!');
      await refreshTokens();
      await loadSessions();
      
      // Start the game
      setSelectedGameFlow({
        gameType: config.game_type,
        sessionId: session.id,
        configId: config.id,
        entryFee: config.entry_fee,
        rngSeed: config.rng_seed
      });
      setCurrentView('game');
      
    } catch (error) {
      console.error('❌ [1v1] Error joining session:', error);
      setMessage({ type: 'error', text: 'Failed to join session' });
    } finally {
      setJoiningSession(false);
    }
  };

  // Handle game completion
  const handleGameComplete = async (result: { score: number; accuracy: number }) => {
    console.log('🎮 [1v1] Game completed with result:', result);
    
    if (!selectedGameFlow) return;

    try {
      // Update score
      const { data, error } = await supabase.rpc('update_1v1_score', {
        session_id_param: selectedGameFlow.sessionId,
        user_id_param: user?.id,
        score_param: result.score,
        accuracy_param: result.accuracy
      });

      if (error) {
        console.error('❌ [1v1] Error saving score:', error);
        setMessage({ type: 'error', text: 'Error saving score: ' + error.message });
      } else {
        console.log('✅ [1v1] Score saved successfully');
        setMessage({ type: 'success', text: 'Game completed! Score: ' + result.score.toFixed(2) });
      }

      // Check if both players have completed - trigger payout
      setTimeout(async () => {
        console.log('🔍 [1v1] Checking for payout trigger...');
        const configId = selectedGameFlow.configId;
        
        // Re-fetch the session to check if ready
        const { data: checkSession } = await supabase
          .from('one_v_one_sessions')
          .select(`
            *,
            participants:one_v_one_participants(user_id, score)
          `)
          .eq('config_id', configId)
          .eq('status', 'active')
          .single();
        
        if (checkSession) {
          const bothJoined = checkSession.participants.length >= 2;
          const bothCompleted = checkSession.participants.every((p: any) => p.score !== null && p.score !== undefined);
          const notPaid = !checkSession.winner_user_id;
          
          console.log('📊 [1v1] Payout readiness check:', {
            configId,
            bothJoined,
            bothCompleted,
            notPaid,
            participantCount: checkSession.participants.length,
            scores: checkSession.participants.map((p: any) => p.score)
          });
          
          if (bothJoined && bothCompleted && notPaid) {
            console.log('✅ [1v1] BOTH PLAYERS DONE! Triggering payout...');
            
            const { data: payoutData, error: payoutError } = await supabase.rpc('process_1v1_payout', {
              config_id_param: configId
            });

            if (payoutError) {
              console.error('❌ [1v1] Payout error:', payoutError);
            } else {
              console.log('💰 [1v1] Payout successful:', payoutData);
              if (payoutData && payoutData.success) {
                setMessage({ 
                  type: 'success', 
                  text: `🎉 Winner: ${payoutData.winner} won ${payoutData.prize_amount} tokens! (Score: ${payoutData.winner_score})` 
                });
              }
            }
          } else {
            console.log('⏸️ [1v1] Waiting for opponent to finish...');
          }
        }
      }, 3000);

      // Refresh sessions and return to list
      await refreshTokens();
      await loadSessions();
      
      setTimeout(() => {
        setCurrentView('list');
        setSelectedGameFlow(null);
      }, 5000);

    } catch (error) {
      console.error('❌ [1v1] Error in game completion:', error);
      setMessage({ type: 'error', text: 'Failed to save game result' });
    }
  };

  const handleCancelGame = () => {
    setCurrentView('list');
    setSelectedGameFlow(null);
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(2);
  };

  // Group configs by game type
  const gameTypes = Array.from(new Set(configs.map(c => c.game_type)));

  const getGameInfo = (type: string) => {
    switch(type) {
      case 'sword_parry': return { name: '⚔️ Sword Slash', emoji: '⚔️' };
      case 'blade_bounce': return { name: '🛡️ Blade Bounce', emoji: '🛡️' };
      case 'laser_dodge': return { name: '🚀 Laser Dodge', emoji: '🚀' };
      case 'multi_target_reaction': return { name: '🎯 Multi-Target', emoji: '🎯' };
      case 'falling_object': return { name: '💰 Coin Catch', emoji: '💰' };
      case 'color_sequence': return { name: '🎨 Color Memory', emoji: '🎨' };
      case 'cash_stack': return { name: '💵 Cash Stack', emoji: '💵' };
      case 'quick_click': return { name: '⚡ Quick Click', emoji: '⚡' };
      default: return { name: type, emoji: '🎮' };
    }
  };

  if (currentView === 'game' && selectedGameFlow) {
    return (
      <ErrorBoundary>
        <CompetitionGameFlow
          gameType={selectedGameFlow.gameType}
          sessionId={selectedGameFlow.sessionId}
          configId={selectedGameFlow.configId}
          rngSeed={selectedGameFlow.rngSeed}
          onComplete={handleGameComplete}
          onCancel={handleCancelGame}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <CleanNavigation />
        
        <div className="container mx-auto px-4 py-8 pt-24">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <TrophyIcon className="w-16 h-16 text-blue-400 mr-6 animate-pulse" />
              <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                1v1 BATTLES
              </h1>
              <div className="ml-6">
                <span className="text-6xl animate-bounce">⚔️</span>
              </div>
            </div>
            <p className="text-2xl text-blue-200 font-semibold">Face Off • Winner Takes 85%</p>
          </div>

          {/* Wallet Display */}
          <div className="mb-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BanknotesIcon className="w-12 h-12 text-blue-400 mr-4" />
                <div>
                  <p className="text-blue-200 text-sm font-semibold uppercase tracking-wide">Your Tokens</p>
                  <p className="text-3xl font-bold text-white">
                    {!hasLoadedTokens ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      displayTokens.toFixed(2)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Location Banner */}
          {isAuthenticated && (
            <div className={`mb-6 p-6 rounded-xl backdrop-blur-xl ${
              locationLoading
                ? 'bg-blue-500/20 border border-blue-500/50'
                : improvedLocation && ImprovedLocationService.isGamingAllowed(improvedLocation)
                  ? 'bg-green-500/20 border border-green-500/50' 
                  : 'bg-red-500/20 border border-red-500/50'
              }`}>
            <div className="flex items-center justify-center">
              {locationLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mr-3"></div>
                  <span className="text-blue-300 text-lg font-semibold">Verifying Location...</span>
                </>
              ) : improvedLocation && ImprovedLocationService.isGamingAllowed(improvedLocation) ? (
                  <>
                    <CheckCircleIcon className="w-6 h-6 text-green-400 mr-3" />
                  <span className="text-green-300 text-lg font-semibold">Location Verified - Gaming Allowed</span>
                  <span className="text-green-200 text-sm ml-2">({improvedLocation.city}, {improvedLocation.state})</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-400 mr-3" />
                  <span className="text-red-300 text-lg font-semibold">Gaming Not Allowed in Your Location</span>
                  <span className="text-red-200 text-sm ml-2">({improvedLocation?.city || 'Unknown'}, {improvedLocation?.state || 'Unknown'})</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className="mb-6">
              <p className={`p-4 rounded-xl text-center font-semibold ${
                message.type === 'success' 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/50' 
                  : 'bg-red-500/20 text-red-300 border border-red-500/50'
              }`}>
                {message.text}
              </p>
            </div>
          )}

          {/* Debug Info */}
          {(!loadingConfigs && configs.length === 0) && (
            <div className="mb-6 p-6 bg-yellow-500/20 border border-yellow-500/50 rounded-xl">
              <p className="text-yellow-300 text-center font-semibold mb-2">⚠️ No 1v1 configurations found</p>
              <p className="text-yellow-200 text-center text-sm">Please run <code className="bg-black/30 px-2 py-1 rounded">COMPLETE_1V1_SYSTEM.sql</code> in Supabase</p>
            </div>
          )}

          {/* Loading State */}
          {loadingConfigs && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-400"></div>
              <p className="ml-4 text-blue-300 text-xl font-semibold">Loading 1v1 battles...</p>
            </div>
          )}

          {/* 1v1 Games - Organized by Game Type */}
          {!loadingConfigs && configs.length > 0 && gameTypes.map(gameType => {
            const gameConfigs = configs.filter(c => c.game_type === gameType);
            if (gameConfigs.length === 0) return null;

            const gameInfo = getGameInfo(gameType);

            return (
              <div key={gameType} className="mb-12">
                {/* Game Type Header */}
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-blue-300 flex items-center">
                    <span className="text-4xl mr-3">{gameInfo.emoji}</span>
                    {gameInfo.name}
                    <span className="ml-3 text-xl text-purple-300">({gameConfigs.length} Tiers)</span>
                  </h2>
                  <div className="mt-2 h-1 w-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                </div>

                {/* Game Listings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {gameConfigs.map((config) => {
                    const session = sessions.find(s => s.config_id === config.id);
                    
                    // If no session exists, show config but with "No Active Session" message
                    if (!session) {
                      return (
                        <div key={config.id} className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 shadow-2xl">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-bold text-blue-300">{config.title.replace(' 1v1 - ', ' ')}</h3>
                            <UsersIcon className="w-8 h-8 text-purple-400" />
                          </div>
                          <div className="mb-4 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-blue-200 font-semibold">Winner Prize</span>
                              <span className="text-2xl font-bold text-blue-300">{formatAmount(config.winner_prize)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-purple-400">Entry Fee</span>
                              <span className="text-purple-300">{config.entry_fee} tokens</span>
                            </div>
                          </div>
                          <div className="text-center p-4 bg-yellow-500/20 rounded-xl border border-yellow-500/50">
                            <p className="text-yellow-300 font-semibold">⚠️ No Active Session</p>
                            <p className="text-yellow-200 text-xs mt-1">Please refresh or contact support</p>
                          </div>
                        </div>
                      );
                    }

                    const hasJoined = session.participants.some(p => p.user_id === user?.id);
                    const hasPlayed = session.participants.some(p => p.user_id === user?.id && p.score !== null);
                    const isCompleted = session.status === 'completed';
                    const isFull = session.participants_count >= 2;
                    const progressPercent = (session.participants_count / 2) * 100;

                    // User's score
                    const userParticipant = session.participants.find(p => p.user_id === user?.id);
                    const userScore = userParticipant?.score;

                    // Opponent info
                    const opponent = session.participants.find(p => p.user_id !== user?.id);

                    return (
                      <div key={config.id} className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 shadow-2xl hover:shadow-blue-500/20 transition-all duration-300">
                        {/* Title */}
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-bold text-blue-300">{config.title.replace(' 1v1 - ', ' ')}</h3>
                          <UsersIcon className="w-8 h-8 text-purple-400" />
                        </div>

                        {/* Prize Info */}
                        <div className="mb-4 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-blue-200 font-semibold">Winner Prize</span>
                            <span className="text-2xl font-bold text-blue-300">{formatAmount(config.winner_prize)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-purple-400">Platform Fee</span>
                            <span className="text-purple-300">-{formatAmount(config.platform_fee)}</span>
                          </div>
                        </div>

                        {/* Prize Pool */}
                        <div className="mb-4 p-3 bg-black/30 rounded-xl">
                          <div className="flex justify-between items-center">
                            <span className="text-blue-200 font-semibold">Prize Pool</span>
                            <span className="text-xl font-bold text-blue-300">{formatAmount(session.current_pool)}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-blue-300 mb-2">
                            <span>{session.participants_count} / 2 Players</span>
                            <span>{progressPercent.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-blue-500/30">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out shadow-lg shadow-blue-500/50"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Opponent Info */}
                        {hasJoined && opponent && (
                          <div className="mb-4 p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                            <p className="text-xs text-purple-300 uppercase font-semibold mb-1">Opponent</p>
                            <div className="flex justify-between items-center">
                              <span className="text-white font-semibold">Player 2</span>
                              {opponent.score !== null && opponent.score !== undefined ? (
                                <span className="text-green-400 font-bold">✅ Completed</span>
                              ) : (
                                <span className="text-yellow-400 font-bold animate-pulse">⏳ Playing...</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* User's Score */}
                        {hasPlayed && userScore !== null && userScore !== undefined && (
                          <div className="mb-4 p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30">
                            <div className="flex justify-between items-center">
                              <span className="text-green-200 font-semibold">Your Score</span>
                              <span className="text-xl font-bold text-green-300">{userScore.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="space-y-2">
                          {!isAuthenticated ? (
                            <button
                              disabled
                              className="w-full px-6 py-3 bg-gray-700 text-gray-400 rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center"
                            >
                              <LockClosedIcon className="w-5 h-5 mr-2" />
                              Sign In to Play
                            </button>
                          ) : !locationVerified ? (
                            <button
                              disabled
                              className="w-full px-6 py-3 bg-gray-700 text-gray-400 rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center"
                            >
                              <MapPinIcon className="w-5 h-5 mr-2" />
                              Location Not Verified
                            </button>
                          ) : isCompleted ? (
                            <button
                              disabled
                              className="w-full px-6 py-3 bg-gray-700 text-gray-400 rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center"
                            >
                              <CheckCircleIcon className="w-5 h-5 mr-2" />
                              Completed
                            </button>
                          ) : hasPlayed ? (
                            <button
                              disabled
                              className="w-full px-6 py-3 bg-gray-700 text-gray-400 rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center"
                            >
                              <CheckCircleIcon className="w-5 h-5 mr-2" />
                              Waiting for Opponent
                            </button>
                          ) : hasJoined ? (
                            <button
                              onClick={() => handleJoinSession(config)}
                              disabled={joiningSession}
                              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              {joiningSession ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                  Starting...
                                </>
                              ) : (
                                <>
                                  <FireIcon className="w-5 h-5 mr-2" />
                                  Play Now!
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleJoinSession(config)}
                              disabled={joiningSession || displayTokens < config.entry_fee}
                              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              {joiningSession ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                  Joining...
                                </>
                              ) : displayTokens < config.entry_fee ? (
                                <>
                                  <LockClosedIcon className="w-5 h-5 mr-2" />
                                  Need {config.entry_fee} Token{config.entry_fee > 1 ? 's' : ''}
                                </>
                              ) : (
                                <>
                                  <FireIcon className="w-5 h-5 mr-2" />
                                  Join Battle ({config.entry_fee} Token{config.entry_fee > 1 ? 's' : ''})
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Game Info */}
                        <div className="mt-4 pt-4 border-t border-blue-500/30 text-xs text-blue-300">
                          <p>⚔️ Head-to-head battle • Highest score wins • Winner takes 85%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ErrorBoundary>
  );
}
