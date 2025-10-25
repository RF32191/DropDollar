'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import { UserService } from '@/lib/supabase/userService';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
import ErrorBoundary from '@/components/ErrorBoundary';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { ImprovedLocationService } from '@/lib/improvedLocationService';
import {
  TrophyIcon,
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon,
  LockClosedIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface WinnerTakesAllSession {
  id: string;
  config_id: string;
  current_pot: number;
  base_price: number;
  participants_count: number;
  status: 'waiting' | 'active' | 'completed';
  timer_started_at: string | null;
  timer_duration: number;
  winner_user_id: string | null;
  prize_amount: number | null;
  platform_fee: number | null;
  created_at: string;
  updated_at: string;
  participants: Array<{
    id: string;
    user_id: string;
    score: number | null;
    accuracy: number | null;
    joined_at: string;
    completed_at: string | null;
  }>;
}

interface WinnerTakesAllConfig {
  id: string;
  game_type: string;
  title: string;
  description: string;
  entry_fee: number;
  prize_pool: number;
  base_price: number;
  game_duration: number;
  rng_seed: number;
  winner_prize: number;
  platform_fee: number;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

export default function WinnerTakesAllPage() {
  const { user, isAuthenticated } = useAuth();
  const { tokenBalance: userTokens, isLoading: tokensLoading, refreshTokens } = useTokenSync();
  
  const [sessions, setSessions] = useState<WinnerTakesAllSession[]>([]);
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

  // Hardcoded Winner Takes It All configurations
  const configs: WinnerTakesAllConfig[] = [
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
      id: 'wta-5-blade-bounce',
      game_type: 'blade_bounce',
      title: '$5 Winner Takes It All - Blade Bounce',
      description: 'Winner takes the entire $5 prize pool!',
      entry_fee: 1,
      prize_pool: 5,
      base_price: 5,
      game_duration: 45,
      rng_seed: 6,
      winner_prize: 4.25,
      platform_fee: 0.75
    },
    {
      id: 'wta-10-laser-dodge',
      game_type: 'laser_dodge',
      title: '$10 Winner Takes It All - Laser Dodge',
      description: 'Winner takes the entire $10 prize pool!',
      entry_fee: 1,
      prize_pool: 10,
      base_price: 10,
      game_duration: 60,
      rng_seed: 7,
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
      game_duration: 90,
      rng_seed: 8,
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
      game_duration: 120,
      rng_seed: 9,
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
      game_duration: 150,
      rng_seed: 10,
      winner_prize: 85.00,
      platform_fee: 15.00
    },
    {
      id: 'wta-250-multi-target',
      game_type: 'multi_target_reaction',
      title: '$250 Winner Takes It All - Multi Target',
      description: 'Winner takes the entire $250 prize pool!',
      entry_fee: 1,
      prize_pool: 250,
      base_price: 250,
      game_duration: 180,
      rng_seed: 11,
      winner_prize: 212.50,
      platform_fee: 37.50
    },
    {
      id: 'wta-1000-cash-stack',
      game_type: 'cash_stack',
      title: '$1000 Winner Takes It All - Cash Stack',
      description: 'Winner takes the entire $1000 prize pool!',
      entry_fee: 1,
      prize_pool: 1000,
      base_price: 1000,
      game_duration: 240,
      rng_seed: 12,
      winner_prize: 850.00,
      platform_fee: 150.00
    },
    {
      id: 'wta-2500-falling-objects',
      game_type: 'falling_object',
      title: '$2500 Winner Takes It All - Falling Objects',
      description: 'Winner takes the entire $2500 prize pool!',
      entry_fee: 1,
      prize_pool: 2500,
      base_price: 2500,
      game_duration: 300,
      rng_seed: 13,
      winner_prize: 2125.00,
      platform_fee: 375.00
    },
    {
      id: 'wta-5000-color-sequence',
      game_type: 'color_sequence',
      title: '$5000 Winner Takes It All - Color Sequence',
      description: 'Winner takes the entire $5000 prize pool!',
      entry_fee: 1,
      prize_pool: 5000,
      base_price: 5000,
      game_duration: 360,
      rng_seed: 14,
      winner_prize: 4250.00,
      platform_fee: 750.00
    },
    {
      id: 'wta-10000-laser-dodge',
      game_type: 'laser_dodge',
      title: '$10000 Winner Takes It All - Laser Dodge',
      description: 'Winner takes the entire $10000 prize pool!',
      entry_fee: 1,
      prize_pool: 10000,
      base_price: 10000,
      game_duration: 420,
      rng_seed: 15,
      winner_prize: 8500.00,
      platform_fee: 1500.00
    },
    {
      id: 'wta-25000-multi-target',
      game_type: 'multi_target_reaction',
      title: '$25000 Winner Takes It All - Multi Target',
      description: 'Winner takes the entire $25000 prize pool!',
      entry_fee: 1,
      prize_pool: 25000,
      base_price: 25000,
      game_duration: 480,
      rng_seed: 16,
      winner_prize: 21250.00,
      platform_fee: 3750.00
    }
  ];

  // Load sessions from database
  const loadSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_winner_takes_all_sessions');
      
      if (error) {
        console.error('❌ [Winner Takes It All] Error loading sessions:', error);
        return;
      }
      
      setSessions(data || []);
      console.log('✅ [Winner Takes It All] Sessions loaded:', data?.length || 0);
    } catch (error) {
      console.error('❌ [Winner Takes It All] Error loading sessions:', error);
    }
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    setIsLoading(false);
  }, [loadSessions]);

  // Location verification
  useEffect(() => {
    const verifyLocation = async () => {
      setLocationLoading(true);
      try {
        const location = await ImprovedLocationService.getCurrentLocation();
        setImprovedLocation(location);
        setLocationVerified(ImprovedLocationService.isGamingAllowed(location));
        console.log('🎮 [Winner Takes It All] Location verified:', location);
      } catch (error) {
        console.error('❌ [Winner Takes It All] Location verification failed:', error);
        setLocationVerified(false);
      } finally {
        setLocationLoading(false);
      }
    };

    if (isAuthenticated) {
      verifyLocation();
    }
  }, [isAuthenticated]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('winner_takes_all_sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'winner_takes_all_sessions'
      }, () => {
        loadSessions();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'winner_takes_all_participants'
      }, () => {
        loadSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSessions]);

  // Handle joining a session
  const handleJoinSession = async (configId: string) => {
    console.log('🎮 [Winner Takes All] Join button clicked for config:', configId);
    
    if (!user || !isAuthenticated) {
      console.log('❌ [Winner Takes All] User not authenticated');
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    const config = configs.find(c => c.id === configId);
    if (!config) {
      console.log('❌ [Winner Takes All] Config not found:', configId);
      setMessage({ type: 'error', text: 'Tournament not found!' });
      return;
    }

    const session = sessions.find(s => s.config_id === configId);
    if (!session) {
      console.log('❌ [Winner Takes All] Session not found for config:', configId);
      setMessage({ type: 'error', text: 'Session not found!' });
      return;
    }
    
    console.log('✅ [Winner Takes All] Found config and session:', { config, session });

    // Check if user already joined
    const hasJoined = session.participants.some(p => p.user_id === user.id);
    if (hasJoined) {
      setMessage({ type: 'error', text: 'You have already joined this tournament!' });
      return;
    }

    // Check if user has enough tokens
    console.log('💰 [Winner Takes All] Token check:', { userTokens, entryFee: config.entry_fee });
    if (userTokens < config.entry_fee) {
      console.log('❌ [Winner Takes All] Insufficient tokens');
      setMessage({ type: 'error', text: `You need ${config.entry_fee} token to join` });
      return;
    }

    // Location verification
    console.log('🌍 [Winner Takes All] Location check:', { improvedLocation, isGamingAllowed: improvedLocation ? ImprovedLocationService.isGamingAllowed(improvedLocation) : false });
    if (!improvedLocation || !ImprovedLocationService.isGamingAllowed(improvedLocation)) {
      console.log('❌ [Winner Takes All] Location not allowed');
      setMessage({ type: 'error', text: 'Gaming not allowed in your location. Please check our terms and conditions.' });
      return;
    }

    setJoiningSession(true);

    try {
      console.log('🔄 [Winner Takes All] Calling SQL function to join session...');
      // Call the SQL function to join session
      const { data, error } = await supabase.rpc('join_winner_takes_all_session', {
        session_id_param: session.id,
        user_id_param: user.id,
        entry_fee_param: config.entry_fee
      });

      console.log('📊 [Winner Takes All] SQL response:', { data, error });

      if (error) {
        console.error('❌ [Winner Takes It All] Error joining session:', error);
        setMessage({ type: 'error', text: error.message || 'Failed to join session' });
        return;
      }

      if (!data.success) {
        console.log('❌ [Winner Takes All] SQL returned failure:', data.message);
        setMessage({ type: 'error', text: data.message });
        return;
      }

      console.log('✅ [Winner Takes All] Successfully joined session, refreshing data...');
      // Refresh token balance
      refreshTokens();
      
      // Reload sessions to get updated data
      loadSessions();

      setMessage({ type: 'success', text: 'Successfully joined tournament! Starting game...' });

      console.log('🎮 [Winner Takes All] Starting game with config:', {
        gameType: config.game_type,
        sessionId: session.id,
        configId: configId,
        entryFee: config.entry_fee
      });

      // Start the game
      setSelectedGameFlow({
        gameType: config.game_type,
        sessionId: session.id,
        configId: configId,
        entryFee: config.entry_fee
      });
      setCurrentView('game');

    } catch (error) {
      console.error('❌ [Winner Takes It All] Error joining session:', error);
      setMessage({ type: 'error', text: 'Failed to join tournament. Please try again.' });
    } finally {
      setJoiningSession(false);
    }
  };

  // Handle game completion
  const handleGameComplete = async (score: number) => {
    if (!user || !selectedGameFlow) {
      console.error('❌ [Winner Takes It All] Missing user or game flow data');
      return;
    }

    try {
      // Update score in database
      const { data, error } = await supabase.rpc('update_winner_takes_all_score', {
        session_id_param: selectedGameFlow.sessionId,
        user_id_param: user.id,
        score_param: score,
        accuracy_param: 95.0 // Default accuracy
      });

      if (error) {
        console.error('❌ [Winner Takes It All] Error updating score:', error);
        setMessage({ type: 'error', text: 'Game completed but there was an error saving your score.' });
      } else {
        console.log('✅ [Winner Takes It All] Score recorded:', score);
        setMessage({ type: 'success', text: `Game completed! Your score: ${score}` });
      }

      // Reload sessions to get updated data
      loadSessions();

    } catch (error) {
      console.error('❌ [Winner Takes It All] Error recording score:', error);
      setMessage({ type: 'error', text: 'Game completed but there was an error saving your score.' });
    }

    // Return to list view
    setCurrentView('list');
    setSelectedGameFlow(null);
  };

  // Calculate time remaining for active sessions
  const calculateTimeRemaining = (session: WinnerTakesAllSession) => {
    if (!session.timer_started_at || session.status !== 'active') {
      return null;
    }

    const startTime = new Date(session.timer_started_at).getTime();
    const now = new Date().getTime();
    const elapsed = Math.floor((now - startTime) / 1000);
    const remaining = Math.max(0, session.timer_duration - elapsed);

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    return { hours, minutes, seconds, total: remaining };
  };

  // Format time remaining
  const formatTimeRemaining = (hours: number, minutes: number, seconds: number) => {
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get game icon
  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'laser_dodge': return '🎯';
      case 'multi_target_reaction': return '🎯';
      case 'sword_parry': return '⚔️';
      case 'blade_bounce': return '⚡';
      case 'cash_stack': return '💰';
      case 'falling_object': return '📦';
      case 'color_sequence': return '🌈';
      default: return '🎮';
    }
  };

  // Format prize amount
  const formatPrizeAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Prevent back button during game
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
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 text-gray-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
            <span className="ml-4 text-lg text-yellow-800">Loading Winner Takes It All tournaments...</span>
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
        <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 text-gray-900">
          <CleanNavigation />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-yellow-800 mb-4">Playing: {gameConfig?.title}</h1>
              <p className="text-yellow-700">Complete the game to record your score!</p>
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 text-gray-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-300/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        
        {/* Additional animated elements */}
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-yellow-400/10 rounded-full blur-xl animate-bounce delay-700"></div>
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl animate-pulse delay-300"></div>
        <div className="absolute top-3/4 left-1/3 w-24 h-24 bg-orange-400/10 rounded-full blur-lg animate-ping delay-1000"></div>
        
        {/* Floating particles */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-500/40 rounded-full animate-ping delay-200"></div>
        <div className="absolute top-20 right-20 w-3 h-3 bg-amber-500/40 rounded-full animate-ping delay-500"></div>
        <div className="absolute bottom-20 left-20 w-2 h-2 bg-orange-500/40 rounded-full animate-ping delay-800"></div>
        <div className="absolute bottom-10 right-10 w-3 h-3 bg-yellow-500/40 rounded-full animate-ping delay-1200"></div>
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
            <TrophyIcon className="w-16 h-16 text-yellow-600 mr-6 animate-pulse" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 bg-clip-text text-transparent animate-pulse">
              WINNER TAKES IT ALL
            </h1>
            <TrophyIcon className="w-16 h-16 text-yellow-600 ml-6 animate-pulse" />
          </div>
          <p className="text-2xl text-yellow-800 mb-2 font-semibold">1 Token Entry - Winner Gets Everything!</p>
          <p className="text-xl text-yellow-700">Unlimited players, base price matching prize amount</p>
          
          {/* User Status */}
          {isAuthenticated && (
            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <div className="inline-flex items-center bg-yellow-400/30 backdrop-blur-xl rounded-2xl px-8 py-4 border border-yellow-500/50">
                <BanknotesIcon className="w-8 h-8 text-yellow-700 mr-4" />
                <span className="text-2xl font-bold text-yellow-800">Your Tokens: {userTokens}</span>
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
          {configs.map((config) => {
            const session = sessions.find(s => s.config_id === config.id);
            const timeRemaining = session ? calculateTimeRemaining(session) : null;
            const canJoin = userTokens >= config.entry_fee;
            const userParticipant = session?.participants.find(p => p.user_id === user?.id);
            const hasJoined = !!userParticipant;
            const hasCompleted = !!userParticipant && userParticipant.score !== null && userParticipant.completed_at !== null;
            
            return (
              <div key={config.id} className="bg-yellow-200/40 backdrop-blur-xl rounded-3xl p-6 border border-yellow-400/30 hover:bg-yellow-200/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                {/* Game Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">{getGameIcon(config.game_type)}</span>
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
                      <p className="text-purple-200 text-xs mt-1">Base pot: ${config.prize_pool}, grows with each player's token</p>
                      
                      {/* Live Calculator Display */}
                      <div className="mt-3 p-3 bg-white/10 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-yellow-300 font-semibold">Winner Gets:</div>
                            <div className="text-white font-bold">{formatPrizeAmount((session?.current_pot || 0) * 0.85)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-300 font-semibold">Platform Fee (15%):</div>
                            <div className="text-white font-bold">{formatPrizeAmount((session?.current_pot || 0) * 0.15)}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-purple-200">
                          💰 Pot grows by {config.entry_fee} token per player
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Live Timer Display */}
                  {timeRemaining && (
                    <div className="mb-4">
                      <div className="text-center p-3 rounded-xl bg-green-500/20 border border-green-500/50">
                        <div className="flex items-center justify-center mb-2">
                          <ClockIcon className="w-5 h-5 mr-2 text-green-400" />
                          <span className="font-semibold text-green-300">Game Timer Active!</span>
                        </div>
                        <p className="text-lg font-bold text-green-300">
                          {formatTimeRemaining(timeRemaining.hours, timeRemaining.minutes, timeRemaining.seconds)}
                        </p>
                        <p className="text-sm text-green-200 mt-1">More players can join and add to the pot!</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span>Token Progress</span>
                      <span>{session?.current_pot || 0} / {config.base_price} tokens to base price</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          session?.status === 'active' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, ((session?.current_pot || 0) / config.base_price) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Base Price: {config.base_price} tokens</span>
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
                      <span className="text-yellow-400 font-bold">{formatPrizeAmount(config.winner_prize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Fee:</span>
                      <span className="text-red-400 font-bold">{formatPrizeAmount(config.platform_fee)}</span>
                    </div>
                  </div>
                  
                  {/* Live Scoreboard - Only show if there are participants with scores */}
                  {session && session.participants.filter(p => p.score !== null && p.completed_at !== null).length > 0 && (
                    <div className="mb-6">
                      <button
                        onClick={() => {
                          const scoreboard = document.getElementById(`scoreboard-${config.id}`);
                          if (scoreboard) {
                            scoreboard.classList.toggle('hidden');
                          }
                        }}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <h4 className="text-sm font-semibold text-white flex items-center">
                          <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
                          Live Scoreboard ({session.participants.filter(p => p.score !== null && p.completed_at !== null).length} player{session.participants.filter(p => p.score !== null && p.completed_at !== null).length !== 1 ? 's' : ''})
                        </h4>
                        <span className="text-gray-400 text-xs">Click to expand</span>
                      </button>
                      
                      <div id={`scoreboard-${config.id}`} className="hidden mt-3">
                        <div className="bg-white/5 rounded-xl p-4">
                          <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>Player</span>
                            <span>Score</span>
                          </div>
                          <div className="space-y-2">
                            {session.participants
                              .filter(p => p.score !== null && p.completed_at !== null)
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
                  )}
                  
                  {/* Join Button */}
                  <div className="space-y-3">
                    {!isAuthenticated ? (
                      <div className="bg-gray-600 rounded-xl p-3 text-center">
                        <p className="text-gray-300 text-sm">Please log in to join tournaments</p>
                      </div>
                    ) : !canJoin ? (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center">
                        <p className="text-red-300 text-sm">You need {config.entry_fee} token to join</p>
                      </div>
                    ) : hasJoined ? (
                      <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center">
                          <CheckCircleIcon className="w-6 h-6 text-blue-400 mr-2" />
                          <span className="text-blue-300 text-lg font-semibold">JOINED</span>
                        </div>
                        <p className="text-blue-200 text-sm mt-1">You have joined this tournament</p>
                      </div>
                    ) : hasCompleted ? (
                      <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center">
                          <CheckCircleIcon className="w-6 h-6 text-green-400 mr-2" />
                          <span className="text-green-300 text-lg font-semibold">COMPLETED</span>
                        </div>
                        <p className="text-green-200 text-sm mt-1">Your score: {userParticipant?.score || 0}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoinSession(config.id)}
                        disabled={joiningSession || !improvedLocation || !ImprovedLocationService.isGamingAllowed(improvedLocation)}
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-white text-lg transition-all duration-300 ${
                          joiningSession
                            ? 'bg-gray-600 cursor-not-allowed opacity-50'
                            : improvedLocation && ImprovedLocationService.isGamingAllowed(improvedLocation)
                            ? 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 hover:scale-105 shadow-lg hover:shadow-xl'
                            : 'bg-gradient-to-r from-red-600 to-red-700 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {joiningSession ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                            <span className="text-lg">Joining Game...</span>
                          </div>
                        ) : improvedLocation && ImprovedLocationService.isGamingAllowed(improvedLocation) ? (
                          <div className="flex items-center justify-center">
                            <span className="text-xl mr-2">🔓</span>
                            <span>JOIN GAME - ${config.entry_fee}.00</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <LockClosedIcon className="w-6 h-6 mr-2" />
                            <span>GAMING NOT ALLOWED</span>
                          </div>
                        )}
                      </button>
                    )}
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