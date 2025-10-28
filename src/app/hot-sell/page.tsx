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
  FireIcon,
  TrophyIcon,
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon,
  LockClosedIcon,
  MapPinIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

interface HotSellSession {
  id: string;
  config_id: string;
  current_pot: number;
  base_price: number;
  max_participants: number;
  participants_count: number;
  status: 'waiting' | 'active' | 'completed';
  first_place_user_id: string | null;
  second_place_user_id: string | null;
  third_place_user_id: string | null;
  first_place_prize: number | null;
  second_place_prize: number | null;
  third_place_prize: number | null;
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

interface HotSellConfig {
  id: string;
  game_type: string;
  title: string;
  description: string;
  entry_fee: number;
  base_price: number;
  max_participants: number;
  game_duration: number;
  rng_seed: number;
  first_place_percent: number;
  second_place_percent: number;
  third_place_percent: number;
  platform_fee_percent: number;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

export default function HotSellPage() {
  const { user, isAuthenticated } = useAuth();
  const { tokenBalance: userTokens, isLoading: tokensLoading, refreshTokens } = useTokenSync();
  
  const [sessions, setSessions] = useState<HotSellSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'game'>('list');
  const [selectedGameFlow, setSelectedGameFlow] = useState<{
    gameType: string;
    sessionId: string;
    configId: string;
    entryFee: number;
  } | null>(null);
  const [joiningSession, setJoiningSession] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [improvedLocation, setImprovedLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Stable token display to prevent flickering
  const [displayTokens, setDisplayTokens] = useState<number>(0);
  const [hasLoadedTokens, setHasLoadedTokens] = useState(false);

  // Update display tokens only when they actually change
  useEffect(() => {
    if (!tokensLoading && userTokens !== displayTokens) {
      setDisplayTokens(userTokens);
      setHasLoadedTokens(true);
    }
  }, [userTokens, tokensLoading]);

  // Hardcoded Hot Sell configurations (NO 1v1, NO $50,000)
  // Max participants = base_price (so $2 game = 2 players, $3 = 3 players)
  // $2 listing has only 2 players (no 3rd place): 1st: 70%, 2nd: 15%, Platform: 15%
  const configs: HotSellConfig[] = [
    {
      id: 'hs-2-sword-parry',
      game_type: 'sword_parry',
      title: '$2 Hot Sell - Sword Parry',
      description: '1st: 70%, 2nd: 15%',
      entry_fee: 1,
      base_price: 2,
      max_participants: 2,
      game_duration: 30,
      rng_seed: 5,
      first_place_percent: 70,
      second_place_percent: 15,
      third_place_percent: 0,
      platform_fee_percent: 15
    },
    {
      id: 'hs-3-blade-bounce',
      game_type: 'blade_bounce',
      title: '$3 Hot Sell - Blade Bounce',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 3,
      max_participants: 3,
      game_duration: 30,
      rng_seed: 6,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-5-laser-dodge',
      game_type: 'laser_dodge',
      title: '$5 Hot Sell - Laser Dodge',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 5,
      max_participants: 5,
      game_duration: 30,
      rng_seed: 7,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-10-laser-dodge',
      game_type: 'laser_dodge',
      title: '$10 Hot Sell - Laser Dodge',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 10,
      max_participants: 10,
      game_duration: 30,
      rng_seed: 9,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-25-multi-target',
      game_type: 'multi_target_reaction',
      title: '$25 Hot Sell - Multi Target',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 25,
      max_participants: 25,
      game_duration: 30,
      rng_seed: 11,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-50-sword-parry',
      game_type: 'sword_parry',
      title: '$50 Hot Sell - Sword Parry',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 50,
      max_participants: 50,
      game_duration: 30,
      rng_seed: 13,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-100-laser-dodge',
      game_type: 'laser_dodge',
      title: '$100 Hot Sell - Laser Dodge',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 100,
      max_participants: 100,
      game_duration: 30,
      rng_seed: 15,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-250-multi-target',
      game_type: 'multi_target_reaction',
      title: '$250 Hot Sell - Multi Target',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 250,
      max_participants: 250,
      game_duration: 30,
      rng_seed: 17,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-1000-cash-stack',
      game_type: 'cash_stack',
      title: '$1000 Hot Sell - Cash Stack',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 1000,
      max_participants: 1000,
      game_duration: 30,
      rng_seed: 19,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-2500-falling-objects',
      game_type: 'falling_object',
      title: '$2500 Hot Sell - Falling Objects',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 2500,
      max_participants: 2500,
      game_duration: 30,
      rng_seed: 21,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-5000-color-sequence',
      game_type: 'color_sequence',
      title: '$5000 Hot Sell - Color Sequence',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 5000,
      max_participants: 5000,
      game_duration: 30,
      rng_seed: 23,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-10000-laser-dodge',
      game_type: 'laser_dodge',
      title: '$10000 Hot Sell - Laser Dodge',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 10000,
      max_participants: 10000,
      game_duration: 30,
      rng_seed: 25,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    },
    {
      id: 'hs-25000-multi-target',
      game_type: 'multi_target_reaction',
      title: '$25000 Hot Sell - Multi Target',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 25000,
      max_participants: 25000,
      game_duration: 30,
      rng_seed: 27,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
      platform_fee_percent: 15
    }
  ];

  const loadSessions = useCallback(async () => {
    try {
      console.log('🔥 [Hot Sell] Loading sessions...');
      
      // Try to use the RPC function
      const { data, error } = await supabase.rpc('get_all_hot_sell_sessions');
      
      if (error) {
        console.error('❌ [Hot Sell] Error loading sessions (RPC not found, will retry):', error);
        
        // Fallback: Try direct table query if RPC doesn't exist yet
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('hot_sell_sessions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (sessionsError) {
          console.error('❌ [Hot Sell] Error loading sessions from table:', sessionsError);
          setSessions([]);
          setIsLoading(false);
          return;
        }
        
        // Get participants for each session
        const sessionsWithParticipants = await Promise.all(
          (sessionsData || []).map(async (session) => {
            const { data: participants } = await supabase
              .from('hot_sell_participants')
              .select('*')
              .eq('session_id', session.id);
            
            return {
              ...session,
              participants: participants || []
            };
          })
        );
        
        console.log('📊 [Hot Sell] Sessions data (fallback):', sessionsWithParticipants);
        setSessions(sessionsWithParticipants);
        setIsLoading(false);
        return;
      }
      
      console.log('📊 [Hot Sell] Sessions data:', data);
      setSessions(data || []);
      console.log('✅ [Hot Sell] Sessions loaded:', data?.length || 0);
    } catch (error) {
      console.error('❌ [Hot Sell] Error loading sessions:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkLocation = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLocationLoading(true);
      const location = await ImprovedLocationService.getCurrentLocation();
      setImprovedLocation(location);
      setLocationVerified(ImprovedLocationService.isGamingAllowed(location));
      console.log('🎮 [Hot Sell] Location verified:', location);
    } catch (error) {
      console.error('❌ [Hot Sell] Location verification failed:', error);
      setLocationVerified(false);
    } finally {
      setLocationLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadSessions();
    checkLocation();
    
    // Refresh sessions every 30 seconds
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions, checkLocation]);

  const handleJoinSession = async (config: HotSellConfig) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please sign in to join' });
      return;
    }

    if (!locationVerified) {
      setMessage({ type: 'error', text: 'Gaming not allowed in your location' });
      return;
    }

    if (displayTokens < config.entry_fee) {
      setMessage({ type: 'error', text: 'Insufficient tokens' });
      return;
    }

    try {
      setJoiningSession(true);
      console.log('🎮 [Hot Sell] Joining session for config:', config.id);

      // Find active session for this config
      const session = sessions.find(s => s.config_id === config.id && s.status !== 'completed');
      
      if (!session) {
        setMessage({ type: 'error', text: 'No active session found' });
        return;
      }

      // Call join function
      const { data, error } = await supabase.rpc('join_hot_sell_session', {
        session_id_param: session.id,
        user_id_param: user.id,
        entry_fee_param: config.entry_fee
      });

      console.log('📊 [Hot Sell] SQL response:', { data, error });

      if (error) {
        console.error('❌ [Hot Sell] Error joining session:', error);
        setMessage({ type: 'error', text: error.message || 'Failed to join session' });
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.success) {
        setMessage({ type: 'error', text: result?.message || 'Failed to join session' });
        return;
      }

      console.log('✅ [Hot Sell] Joined successfully:', result);

      // Refresh tokens and sessions
      await Promise.all([
        refreshTokens(),
        loadSessions()
      ]);

      setMessage({ type: 'success', text: `Joined! Pot: $${result.new_pot?.toFixed(2) || '0.00'}` });

      // Start game
      setSelectedGameFlow({
        gameType: config.game_type,
        sessionId: session.id,
        configId: config.id,
        entryFee: config.entry_fee
      });

      setCurrentView('game');

    } catch (error) {
      console.error('❌ [Hot Sell] Error joining session:', error);
      setMessage({ type: 'error', text: 'Failed to join tournament. Please try again.' });
    } finally {
      setJoiningSession(false);
    }
  };

  const handleGameComplete = async (score: number, accuracy: number) => {
    console.log('🎯 [Hot Sell] Selected game flow:', selectedGameFlow);
    
    if (!user || !selectedGameFlow) {
      console.error('❌ [Hot Sell] Missing user or game flow data');
      setMessage({ type: 'error', text: 'Missing user or game data. Please try again.' });
      return;
    }

    try {
      console.log('💾 [Hot Sell] Recording score:', { sessionId: selectedGameFlow.sessionId, userId: user.id, score, accuracy });

      // Update score
      const { data, error } = await supabase.rpc('update_hot_sell_score', {
        session_id_param: selectedGameFlow.sessionId,
        user_id_param: user.id,
        score_param: score,
        accuracy_param: accuracy
      });

      console.log('📊 [Hot Sell] Score save response:', { data, error });

      if (error) {
        console.error('❌ [Hot Sell] Error updating score:', error);
        setMessage({ type: 'error', text: `Game completed but there was an error saving your score: ${error.message}` });
      } else {
        console.log('✅ [Hot Sell] Score recorded successfully:', data);
        setMessage({ type: 'success', text: `Game completed! Your score: ${score.toFixed(2)}` });
      }

      // Return to list view
      setCurrentView('list');
      setSelectedGameFlow(null);
      loadSessions();

    } catch (error) {
      console.error('❌ [Hot Sell] Error recording score:', error);
      setMessage({ type: 'error', text: 'Game completed but there was an error saving your score.' });
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleManualPayout = async (configId: string) => {
    try {
      console.log('💰 [Hot Sell] Manual payout triggered for:', configId);
      
      const { data, error } = await supabase.rpc('process_hot_sell_payout', {
        config_id_param: configId
      });

      console.log('📊 [Hot Sell] Payout response:', { data, error });

      if (error) {
        console.error('❌ [Hot Sell] Payout error:', error);
        setMessage({ type: 'error', text: `Payout failed: ${error.message}` });
        return;
      }

      if (data && data.success) {
        console.log('✅ [Hot Sell] Payout successful:', data);
        
        // Build success message based on what we have
        let successMsg = `🎉 1st: ${data.first_place_winner} ($${data.first_place_amount?.toFixed(2)})`;
        if (data.second_place_winner && data.second_place_winner !== 'N/A') {
          successMsg += `, 2nd: ${data.second_place_winner} ($${data.second_place_amount?.toFixed(2)})`;
        }
        if (data.third_place_winner && data.third_place_winner !== 'N/A') {
          successMsg += `, 3rd: ${data.third_place_winner} ($${data.third_place_amount?.toFixed(2)})`;
        }
        
        setMessage({ type: 'success', text: successMsg });
        
        // Refresh tokens and sessions
        await Promise.all([
          refreshTokens(),
          loadSessions()
        ]);
      } else if (data && !data.success) {
        console.log('ℹ️ [Hot Sell] Payout info:', data.message);
        if (!data.already_paid) {
          setMessage({ type: 'error', text: `Payout issue: ${data.message}` });
        }
      }
    } catch (error) {
      console.error('❌ [Hot Sell] Payout error:', error);
      setMessage({ type: 'error', text: 'Payout system error occurred.' });
    }
  };

  // Auto-payout when session is full and all players have scores
  useEffect(() => {
    if (!sessions.length || !user) return;

    const checkAndAutoPayout = async () => {
      for (const session of sessions) {
        const config = configs.find(c => c.id === session.config_id);
        if (!config) continue;

        // Skip if already paid out
        if (session.first_place_user_id) continue;

        // Check if session is full and all players have scores
        const isFull = session.participants.length >= config.max_participants;
        const allHaveScores = session.participants.every(p => p.score !== null && p.score !== undefined);
        
        if (isFull && allHaveScores) {
          console.log('🔔 [Hot Sell] Auto-payout conditions met:', {
            config_id: session.config_id,
            participants: session.participants.length,
            max: config.max_participants,
            scores: session.participants.map(p => p.score)
          });
          
          // Wait 3 seconds for smooth UX
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          console.log('💰 [Hot Sell] Triggering auto-payout for:', session.config_id);
          await handleManualPayout(session.config_id);
          break; // Only process one at a time
        }
      }
    };

    // Debounce to avoid multiple calls
    const timeoutId = setTimeout(checkAndAutoPayout, 1000);
    return () => clearTimeout(timeoutId);
  }, [sessions, user]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getProgressPercent = (currentPot: number, maxParticipants: number, entryFee: number) => {
    const targetPot = maxParticipants * entryFee;
    return Math.min((currentPot / targetPot) * 100, 100);
  };

  const calculatePrizes = (config: HotSellConfig, currentPot: number) => {
    const platformFee = currentPot * (config.platform_fee_percent / 100);
    const distributablePot = currentPot - platformFee;
    const firstPlace = distributablePot * (config.first_place_percent / 100);
    const secondPlace = distributablePot * (config.second_place_percent / 100);
    const thirdPlace = distributablePot * (config.third_place_percent / 100);
    
    return {
      firstPlace,
      secondPlace,
      thirdPlace,
      platformFee
    };
  };

  // Prevent back navigation during game
  useEffect(() => {
    if (currentView === 'game') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your progress will be lost.';
        return 'Are you sure you want to leave? Your progress will be lost.';
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [currentView]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-800 via-red-800 to-orange-800 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
            <span className="ml-4 text-lg text-orange-200">Loading Hot Sell tournaments...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render game flow view
  if (currentView === 'game' && selectedGameFlow) {
    const gameConfig = configs.find(c => c.id === selectedGameFlow.configId);
    const rngSeed = gameConfig?.rng_seed || 1;
    
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-orange-800 via-red-800 to-orange-800 text-white">
          <CleanNavigation />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-orange-200 mb-4">Playing: {gameConfig?.title}</h1>
              <p className="text-orange-300">Complete the game to record your score!</p>
            </div>
            
            <CompetitionGameFlow
              gameType={selectedGameFlow.gameType}
              sessionId={selectedGameFlow.sessionId}
              configId={selectedGameFlow.configId}
              onComplete={handleGameComplete}
              onCancel={() => {
                setCurrentView('list');
                setSelectedGameFlow(null);
              }}
              rngSeed={rngSeed}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-800 via-red-800 to-orange-800 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Location Verification Banner */}
        {isAuthenticated && (
          <div className={`mb-6 p-4 rounded-xl border ${
            locationLoading 
              ? 'bg-blue-500/20 border-blue-500/50' 
              : improvedLocation && ImprovedLocationService.isGamingAllowed(improvedLocation)
              ? 'bg-green-500/20 border-green-500/50' 
              : 'bg-red-500/20 border-red-500/50'
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

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="animate-bounce">
              <span className="text-6xl">🔥</span>
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-yellow-400 bg-clip-text text-transparent animate-pulse mx-6">
              HOT SELL
            </h1>
            <div className="animate-bounce">
              <span className="text-6xl">🔥</span>
            </div>
          </div>
          <p className="text-2xl text-orange-200 mb-2 font-semibold">1 Token Entry - Top 3 Win Prizes!</p>
          <p className="text-xl text-orange-300">1st: 50% | 2nd: 20% | 3rd: 15%</p>
          
          {/* User Status */}
          {isAuthenticated && (
            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <div className="inline-flex items-center bg-orange-500/20 backdrop-blur-xl rounded-2xl px-8 py-4 border border-orange-500/30">
                <BanknotesIcon className="w-8 h-8 text-orange-300 mr-4" />
                <div className="text-left">
                  <p className="text-sm text-orange-300 font-medium">Your Tokens</p>
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
          )}
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-green-500/20 border-green-500/50' 
              : 'bg-red-500/20 border-red-500/50'
          }`}>
            <p className={`text-center font-semibold ${
              message.type === 'success' ? 'text-green-300' : 'text-red-300'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Debug Info */}
        {sessions.length === 0 && !isLoading && (
          <div className="mb-6 p-6 bg-yellow-500/20 border border-yellow-500/50 rounded-xl">
            <p className="text-yellow-300 text-center font-semibold mb-2">⚠️ No Hot Sell sessions found</p>
            <p className="text-yellow-200 text-center text-sm">Please run the SQL scripts in Supabase:</p>
            <ol className="text-yellow-200 text-sm mt-2 space-y-1 text-left max-w-2xl mx-auto">
              <li>1. Run <code className="bg-black/30 px-2 py-1 rounded">COMPLETE_HOT_SELL_SYSTEM.sql</code></li>
              <li>2. Check Supabase SQL Editor for any errors</li>
              <li>3. Refresh this page</li>
            </ol>
          </div>
        )}

        {/* Hot Sell Games */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {configs.map((config) => {
            const session = sessions.find(s => s.config_id === config.id);
            if (!session) return null;

            const hasJoined = session.participants.some(p => p.user_id === user?.id);
            const hasPlayed = session.participants.some(p => p.user_id === user?.id && p.score !== null);
            const isCompleted = session.status === 'completed';
            const isFull = session.participants_count >= config.max_participants;
            const progressPercent = getProgressPercent(session.current_pot, config.max_participants, config.entry_fee);
            const prizes = calculatePrizes(config, session.current_pot);

            // User's score
            const userParticipant = session.participants.find(p => p.user_id === user?.id);
            const userScore = userParticipant?.score;

            // Top scores (hide if user hasn't joined)
            const topScores = session.participants
              .filter(p => p.score !== null)
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .slice(0, 3);

            return (
              <div key={config.id} className="bg-gradient-to-br from-orange-900/50 to-red-900/50 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30 shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                {/* Title */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-yellow-300">{config.title.replace(' Hot Sell - ', ' ')}</h3>
                  <TrophyIcon className="w-8 h-8 text-yellow-400" />
                </div>

                {/* Prize Breakdown */}
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-orange-300">🥇 1st Place (50%)</span>
                    <span className="text-yellow-400 font-bold">{formatAmount(prizes.firstPlace)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-orange-300">🥈 2nd Place (20%)</span>
                    <span className="text-gray-300 font-bold">{formatAmount(prizes.secondPlace)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-orange-300">🥉 3rd Place (15%)</span>
                    <span className="text-orange-400 font-bold">{formatAmount(prizes.thirdPlace)}</span>
                  </div>
                  <div className="border-t border-orange-500/30 pt-2 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-orange-400">Platform Fee (15%)</span>
                      <span className="text-red-300">-{formatAmount(prizes.platformFee)}</span>
                    </div>
                  </div>
                </div>

                {/* Current Pot */}
                <div className="mb-4 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-200 font-semibold">Current Pot</span>
                    <span className="text-2xl font-bold text-yellow-300">{formatAmount(session.current_pot)}</span>
                  </div>
                </div>

                {/* Progress Bar - YELLOW THEME */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-orange-300 mb-2">
                    <span>{session.participants_count} / {config.max_participants} Players</span>
                    <span>{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-yellow-500/30">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out shadow-lg shadow-yellow-500/50"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Top Scores (only show if user has joined) */}
                {hasJoined && topScores.length > 0 && (
                  <div className="mb-4 p-3 bg-black/30 rounded-xl">
                    <h4 className="text-xs font-semibold text-orange-300 mb-2 uppercase">Current Top 3</h4>
                    {topScores.map((p, idx) => (
                      <div key={p.id} className="flex justify-between items-center text-xs mb-1">
                        <span className="text-gray-300">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} Player {idx + 1}
                        </span>
                        <span className="text-yellow-400 font-bold">{p.score?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* User's Score */}
                {hasPlayed && userScore !== null && userScore !== undefined && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200 font-semibold">Your Score</span>
                      <span className="text-xl font-bold text-blue-300">{userScore.toFixed(2)}</span>
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
                    <>
                      <button
                        disabled
                        className="w-full px-6 py-3 bg-gray-700 text-gray-400 rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center"
                      >
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        Completed
                      </button>
                      {/* Admin Payout Button */}
                      <button
                        onClick={() => handleManualPayout(config.id)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold text-sm transition-all transform hover:scale-105"
                      >
                        💰 Process Payout (Admin)
                      </button>
                    </>
                  ) : hasPlayed ? (
                    <button
                      disabled
                      className="w-full px-6 py-3 bg-gray-700 text-gray-400 rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center"
                    >
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Already Played
                    </button>
                  ) : isFull ? (
                    <button
                      disabled
                      className="w-full px-6 py-3 bg-gray-700 text-gray-400 rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center"
                    >
                      <UsersIcon className="w-5 h-5 mr-2" />
                      Session Full
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
                      className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                          Join ({config.entry_fee} Token{config.entry_fee > 1 ? 's' : ''})
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Game Info */}
                <div className="mt-4 pt-4 border-t border-orange-500/30 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center text-orange-300">
                    <UsersIcon className="w-4 h-4 mr-1" />
                    <span>Max: {config.max_participants}</span>
                  </div>
                  <div className="flex items-center text-orange-300">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    <span>{config.game_duration}s game</span>
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
