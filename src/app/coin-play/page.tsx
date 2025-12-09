'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import { executeRpcWithSession, ensureSessionForLongOperation } from '@/lib/supabase/sessionGuard';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
import ErrorBoundary from '@/components/ErrorBoundary';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import AdBanner from '@/components/ads/AdBanner';
import PageWalletDisplay from '@/components/wallet/PageWalletDisplay';
import LocationBanner from '@/components/location/LocationBanner';
import LocationVerificationModal from '@/components/modals/LocationVerificationModal';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import {
  TrophyIcon,
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon,
  LockClosedIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface CoinPlaySession {
  id: string;
  config_id: string;
  game_type: string;
  entry_fee: number;
  prize_pool: number;
  max_participants: number;
  participants_count: number;
  status: 'waiting' | 'active' | 'completed';
  timer_duration: number;
  timer_started_at: string | null;
  winner_user_id: string | null;
  winner_prize: number | null;
  created_at: string;
}

interface Message {
  type: 'success' | 'error' | 'warning';
  text: string;
}

const GAME_NAMES: { [key: string]: string } = {
  'multi_target': 'Multi-Target Reaction',
  'falling_object': 'Falling Objects',
  'color_sequence': 'Color Sequence',
  'laser_dodge': 'Laser Dodge',
  'quick_click': 'Quick Click',
  'sword_parry': 'Sword Parry',
  'blade_bounce': 'Blade Bounce',
  'cash_stack': 'Cash Stack',
  'penny_passer': 'Penny Passer'
};

export default function CoinPlayPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { tokenBalance: userTokens, isLoading: tokensLoading, refreshTokens } = useTokenSync();
  
  const [sessions, setSessions] = useState<CoinPlaySession[]>([]);
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
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [expandedScoreboards, setExpandedScoreboards] = useState<Record<string, boolean>>({});
  const [participants, setParticipants] = useState<Record<string, any[]>>({});
  const [manualLocationModal, setManualLocationModal] = useState(false);
  const [autoPayoutTriggered, setAutoPayoutTriggered] = useState<Set<string>>(new Set());
  
  // Location verification
  const {
    locationVerified,
    improvedLocation,
    locationLoading,
    showLocationModal,
    handleLocationGranted,
    handleLocationDenied
  } = useLocationVerification(isAuthenticated);

  // Load sessions
  const loadSessions = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      console.log('🪙 [Coin Play] Loading sessions...');
      const { data, error } = await supabase.rpc('get_coin_play_sessions');
      
      if (error) {
        console.error('🪙 [Coin Play] RPC Error:', error);
        throw error;
      }
      
      console.log('🪙 [Coin Play] Loaded sessions:', data?.length);
      console.log('🪙 [Coin Play] Full session data:', JSON.stringify(data?.slice(0, 3), null, 2));
      
      if (!data || data.length === 0) {
        console.error('❌ [Coin Play] NO SESSIONS RETURNED FROM RPC!');
        console.error('❌ [Coin Play] This means:');
        console.error('   1. Tables not created (run CREATE_COIN_PLAY_SYSTEM.sql)');
        console.error('   2. Sessions not created (run DEBUG_COIN_PLAY.sql)');
        console.error('   3. RLS blocking access (run QUICK_FIX_COIN_PLAY.sql)');
      } else {
        console.log('✅ [Coin Play] Successfully loaded', data.length, 'sessions');
        console.log('✅ [Coin Play] Game types:', [...new Set(data.map((s: any) => s.game_type))]);
      }
      
      // Save scroll position before updating state
      const scrollY = window.scrollY;
      
      setSessions(data || []);
      
      // Restore scroll position after state update (use requestAnimationFrame to ensure DOM has updated)
      if (silent && scrollY > 0) {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
    } catch (error) {
      console.error('🪙 [Coin Play] Error loading sessions:', error);
      if (!silent) {
        setMessage({ type: 'error', text: 'Failed to load Coin Play sessions. Please refresh.' });
      }
      // Don't block the page, just show empty sessions
      setSessions([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load sessions regardless of auth status (everyone can view)
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Auto-refresh sessions every 10 seconds to update progress bars (silent refresh to prevent scroll)
  useEffect(() => {
    if (currentView === 'list') {
      const interval = setInterval(() => {
        loadSessions(true); // Silent refresh - won't scroll to top
        // Also reload expanded scoreboards
        Object.keys(expandedScoreboards).forEach(sessionId => {
          if (expandedScoreboards[sessionId]) {
            loadParticipants(sessionId);
          }
        });
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [currentView, loadSessions, expandedScoreboards]);

  // Load participants for a session
  const loadParticipants = async (sessionId: string) => {
    try {
      // This doesn't require authentication, so use direct RPC call
      const { data, error } = await supabase.rpc('get_coin_play_participants', {
        p_session_id: sessionId
      });

      if (error) {
        console.error('Error loading participants:', error);
        throw error;
      }

      setParticipants(prev => ({
        ...prev,
        [sessionId]: data || []
      }));
    } catch (error) {
      console.error('Error loading participants:', error);
      // Don't show error to user, just log it
    }
  };

  // Join session (matching WTA logic)
  const handleJoinSession = async (configId: string) => {
    console.log('🪙 [Coin Play] Join clicked for config:', configId);

    if (!user || !isAuthenticated) {
      console.log('❌ [Coin Play] Not authenticated');
      setMessage({ type: 'error', text: 'Please log in to join' });
      return;
    }

    // Find session for this config
    const session = sessions.find(s => s.config_id === configId);
    if (!session) {
      console.log('❌ [Coin Play] Session not found for config:', configId);
      setMessage({ type: 'error', text: 'Session not found!' });
      return;
    }

    console.log('✅ [Coin Play] Found session:', session);

    // Check if user has enough tokens
    console.log('💰 [Coin Play] Token check:', { userTokens, entryFee: session.entry_fee });
    if (userTokens < session.entry_fee) {
      console.log('❌ [Coin Play] Insufficient tokens');
      setMessage({ type: 'error', text: `You need ${session.entry_fee} tokens to join` });
      return;
    }

    // Location verification
    console.log('🌍 [Coin Play] Location check:', { locationVerified });
    if (!locationVerified) {
      console.log('❌ [Coin Play] Location not allowed');
      setMessage({ type: 'error', text: 'Gaming not allowed in your location. Please check our terms and conditions.' });
      return;
    }

    setJoiningSession(true);

    try {
      console.log('🔄 [Coin Play] Calling coin_play_join_v2...');
      // Call the SQL function to join session with session guard
      const { data, error, isSessionValid } = await executeRpcWithSession('coin_play_join_v2', {
        p_session: session.id,
        p_user: user.id,
        p_fee: session.entry_fee
      });

      console.log('📊 [Coin Play] SQL response:', { data, error, isSessionValid });

      if (!isSessionValid) {
        console.error('❌ [Coin Play] Session invalid - redirecting to login');
        setMessage({ type: 'error', text: 'Your session has expired. Redirecting to login...' });
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
        return;
      }

      if (error) {
        console.error('❌ [Coin Play] Error joining session:', error);
        const errorMessage = error.message || 'Failed to join session';
        
        // Check for specific error types
        if (errorMessage.includes('permission denied') || errorMessage.includes('not found')) {
          setMessage({ type: 'error', text: 'Database access error. Please contact support.' });
        } else {
          setMessage({ type: 'error', text: errorMessage });
        }
        return;
      }

      if (!data || !data.success) {
        console.log('❌ [Coin Play] SQL returned failure:', data?.message);
        setMessage({ type: 'error', text: data?.message || 'Failed to join session' });
        return;
      }

      console.log('✅ [Coin Play] Successfully joined session, refreshing data...');
      // Refresh token balance
      refreshTokens();
      
      // Reload sessions to get updated data
      loadSessions();

      // Proactively refresh session before starting game to prevent expiration during gameplay
      console.log('🔄 [Coin Play] Ensuring session is fresh before starting game...');
      await ensureSessionForLongOperation();

      setMessage({ type: 'success', text: 'Successfully joined tournament! Starting game...' });

      console.log('🎮 [Coin Play] Starting game with config:', {
        gameType: session.game_type,
        sessionId: session.id,
        configId: configId,
        entryFee: session.entry_fee
      });

      // Start the game
      setSelectedGameFlow({
        gameType: session.game_type,
        sessionId: session.id,
        configId: configId,
        entryFee: session.entry_fee
      });
      setCurrentView('game');

    } catch (error) {
      console.error('❌ [Coin Play] Error joining session:', error);
      setMessage({ type: 'error', text: 'Failed to join tournament. Please try again.' });
    } finally {
      setJoiningSession(false);
    }
  };

  // Handle game completion
  const handleGameComplete = async (score: number) => {
    console.log('🎮 [Coin Play] Game completed with score:', score);
    console.log('👤 [Coin Play] Current user:', user);
    console.log('🎯 [Coin Play] Selected game flow:', selectedGameFlow);
    
    if (!user || !selectedGameFlow) {
      console.error('❌ [Coin Play] Missing user or game flow data');
      setMessage({ type: 'error', text: 'Missing user or game data. Please try again.' });
      setCurrentView('list');
      setSelectedGameFlow(null);
      return;
    }

    try {
      console.log('🔄 [Coin Play] Calling update_coin_play_score with:', {
        session_id_param: selectedGameFlow.sessionId,
        user_id_param: user.id,
        score_param: Math.floor(score), // Ensure integer
        accuracy_param: 95.0
      });

      // Update score in database with session guard and retry logic
      // Enable retry on session error since games can take a while and session might expire
      const { data, error, isSessionValid } = await executeRpcWithSession(
        'update_coin_play_score',
        {
          session_id_param: selectedGameFlow.sessionId,
          user_id_param: user.id,
          score_param: Math.floor(score), // Ensure integer
          accuracy_param: 95.0
        },
        { retryOnSessionError: true, maxRetries: 3 } // Retry up to 3 times if session error
      );

      console.log('📊 [Coin Play] Score save response:', { data, error, isSessionValid });

      if (!isSessionValid) {
        console.error('❌ [Coin Play] Session invalid during score save after retries');
        setMessage({ type: 'error', text: 'Your session expired. Score may not be saved. Please log in again.' });
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 3000);
      } else if (error) {
        console.error('❌ [Coin Play] Error updating score:', error);
        const errorMessage = error.message || 'Unknown error';
        const errorCode = (error as any).code || '';
        
        // Check for specific error types
        if (errorMessage.includes('permission denied') || errorMessage.includes('not found') || errorCode === '42501') {
          setMessage({ type: 'error', text: `Game completed but database access error prevented score save. Please contact support.` });
        } else if (errorMessage.includes('Session is not active') || errorCode === 'SESSION_INACTIVE' || errorCode === 'SESSION_REFRESH_FAILED') {
          // This should be caught by isSessionValid check, but handle it just in case
          setMessage({ type: 'error', text: 'Your session expired during gameplay. Please log in again to view your score.' });
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 3000);
        } else if (errorMessage.includes('not in this session') || errorMessage.includes('Session is not active')) {
          setMessage({ type: 'error', text: `Game completed but session ended. Your score: ${Math.floor(score)}. Please check the leaderboard.` });
        } else {
          setMessage({ type: 'error', text: `Game completed but error saving score: ${errorMessage}. Your score: ${Math.floor(score)}` });
        }
      } else if (data && !data.success) {
        console.error('❌ [Coin Play] Score save failed:', data.message);
        const failureMessage = data.message || 'Unknown error';
        
        // Check if it's a session-related failure
        if (failureMessage.includes('not in this session') || failureMessage.includes('Session is not active')) {
          setMessage({ type: 'warning', text: `Game completed! Your score: ${Math.floor(score)}. Session may have ended, but your score was recorded.` });
        } else {
          setMessage({ type: 'error', text: `Score save failed: ${failureMessage}. Your score: ${Math.floor(score)}` });
        }
      } else {
        console.log('✅ [Coin Play] Score recorded successfully:', data);
        setMessage({ type: 'success', text: `Game completed! Your score: ${Math.floor(score)}` });
        
        // Reload the specific session's scoreboard immediately
        if (selectedGameFlow?.sessionId) {
          await loadParticipants(selectedGameFlow.sessionId);
        }
      }

      // Reload sessions to get updated data
      await loadSessions();

    } catch (error) {
      console.error('❌ [Coin Play] Error recording score:', error);
      setMessage({ type: 'error', text: 'Game completed but there was an error saving your score.' });
    }

    // Return to list view
    setCurrentView('list');
    setSelectedGameFlow(null);
  };

  // Calculate time remaining for a session
  const calculateTimeRemaining = useCallback((session: CoinPlaySession) => {
    if (!session.timer_started_at || session.status !== 'active') {
      return null;
    }

    const elapsed = Math.floor((Date.now() - new Date(session.timer_started_at).getTime()) / 1000);
    const remaining = Math.max(0, session.timer_duration - elapsed);
    
    return {
      total: remaining,
      minutes: Math.floor(remaining / 60),
      seconds: remaining % 60
    };
  }, []);

  // Trigger payout for a session
  const handleManualPayout = useCallback(async (configId: string) => {
    try {
      console.log('💰 [Coin Play] Triggering payout for:', configId);
      
      const { data, error, isSessionValid } = await executeRpcWithSession('process_coin_play_payout', {
        config_id_param: configId
      }, { retryOnSessionError: true, maxRetries: 2 });

      if (!isSessionValid) {
        console.error('❌ [Coin Play] Session invalid during payout');
        return;
      }

      if (error) {
        console.error('❌ [Coin Play] Payout error:', error);
        setMessage({ type: 'error', text: `Payout failed: ${error.message || 'Unknown error'}` });
        return;
      }

      if (data && !data.success) {
        console.log('⚠️ [Coin Play] Payout returned:', data.message);
        // Don't show error for "already paid out" or "timer not expired"
        if (!data.message?.includes('already') && !data.message?.includes('not expired')) {
          setMessage({ type: 'warning', text: data.message || 'Payout issue occurred' });
        }
        return;
      }

      console.log('✅ [Coin Play] Payout successful:', data);
      setMessage({ type: 'success', text: `Payout completed! Winner: ${data.winner_username || 'Unknown'}` });
      
      // Reload sessions to show updated state
      await loadSessions();
      refreshTokens();
    } catch (error) {
      console.error('❌ [Coin Play] Error triggering payout:', error);
      setMessage({ type: 'error', text: 'Failed to trigger payout' });
    }
  }, [loadSessions, refreshTokens]);

  // Exit game
  const handleExitGame = useCallback(() => {
    setCurrentView('list');
    setSelectedGameFlow(null);
    loadSessions();
    refreshTokens();
  }, [loadSessions, refreshTokens]);

  // AUTO-PAYOUT: Automatically trigger payout when timer expires
  useEffect(() => {
    const checkInterval = setInterval(() => {
      sessions.forEach((session) => {
        if (session.status === 'active' && session.timer_started_at) {
          const timeRemaining = calculateTimeRemaining(session);
          
          // Check if timer has expired and payout hasn't been triggered yet
          if (timeRemaining && timeRemaining.total <= 0) {
            const sessionKey = session.config_id;
            
            // Only trigger if not already triggered for this session and not already completed
            if (!autoPayoutTriggered.has(sessionKey) && session.status === 'active') {
              console.log(`⏰ [Coin Play Auto-Payout] Timer expired for ${sessionKey}`);
              console.log(`📊 [Coin Play Auto-Payout] Session details:`, {
                configId: sessionKey,
                status: session.status,
                participants: session.participants_count,
                prizePool: session.prize_pool
              });
              console.log(`💰 [Coin Play Auto-Payout] Triggering payout...`);
              
              // Mark as triggered immediately to prevent duplicates
              setAutoPayoutTriggered(prev => new Set(prev).add(sessionKey));
              
              // Trigger payout immediately (timer is already expired)
              handleManualPayout(sessionKey).then(() => {
                console.log(`✅ [Coin Play Auto-Payout] Payout completed for ${sessionKey}`);
                // Clear the triggered flag after successful payout so page refresh doesn't block
                setTimeout(() => {
                  setAutoPayoutTriggered(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(sessionKey);
                    return newSet;
                  });
                }, 5000); // Clear after 5 seconds
              }).catch((error) => {
                console.error(`❌ [Coin Play Auto-Payout] Error for ${sessionKey}:`, error);
                // Remove from triggered set so it can retry
                setAutoPayoutTriggered(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(sessionKey);
                  return newSet;
                });
              });
            }
          }
        }
      });
    }, 1000); // Check every second

    return () => clearInterval(checkInterval);
  }, [sessions, autoPayoutTriggered, calculateTimeRemaining, handleManualPayout]);

  // Toggle scoreboard visibility
  const toggleScoreboard = async (sessionId: string) => {
    const isExpanded = expandedScoreboards[sessionId];
    
    // Toggle expanded state
    setExpandedScoreboards(prev => ({
      ...prev,
      [sessionId]: !isExpanded
    }));

    // Fetch participants if expanding
    if (!isExpanded) {
      await loadParticipants(sessionId);
    }
  };

  // Group sessions by game
  const sessionsByGame = sessions.reduce((acc, session) => {
    if (!acc[session.game_type]) {
      acc[session.game_type] = [];
    }
    acc[session.game_type].push(session);
    return acc;
  }, {} as { [key: string]: CoinPlaySession[] });

  // Sort games alphabetically
  const sortedGames = Object.keys(sessionsByGame).sort();

  // Filter games
  const filteredGames = selectedGame === 'all' 
    ? sortedGames 
    : sortedGames.filter(g => g === selectedGame);

  // Only show loading if sessions are being loaded (not waiting for auth)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-amber-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-400"></div>
          <p className="mt-4 text-amber-200 font-semibold">Loading Coin Play...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'game' && selectedGameFlow) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-amber-900">
          <CleanNavigation currentPage="coin-play" showUsername={true} />
          <CompetitionGameFlow
            gameType={selectedGameFlow.gameType}
            sessionId={selectedGameFlow.sessionId}
            configId={selectedGameFlow.configId}
            rngSeed={1}
            onComplete={(score: number) => handleGameComplete(score)}
            onCancel={handleExitGame}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <>
      {/* Location Verification Modal */}
      <LocationVerificationModal
        isOpen={showLocationModal || manualLocationModal}
        onLocationGranted={(location) => {
          handleLocationGranted(location);
          setManualLocationModal(false);
        }}
        onLocationDenied={() => {
          handleLocationDenied();
          setManualLocationModal(false);
        }}
      />

      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-amber-900">
        <CleanNavigation currentPage="coin-play" showUsername={true} />
        
        {/* Wallet Display */}
        <PageWalletDisplay />

        {/* Location Verification Banner */}
        {isAuthenticated && (
          <LocationBanner
            isLoading={locationLoading}
            location={improvedLocation}
            isVerified={locationVerified}
          />
        )}

        {/* Ad Banner */}
        <AdBanner pageLocation="coin-play" position="top" />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full mb-6 shadow-2xl animate-pulse">
              <CurrencyDollarIcon className="w-14 h-14 text-white" />
            </div>
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 mb-4 tracking-tight">
              🪙 COIN PLAY
            </h1>
            <p className="text-3xl font-bold text-amber-300 mb-4">
              Play for a Quarter • Win Up to $1,000!
            </p>
            <p className="text-xl text-amber-200/90 max-w-3xl mx-auto">
              25¢ entry fee • 85% to winner • All 9 games available
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`max-w-2xl mx-auto mb-6 p-4 rounded-xl shadow-lg ${
              message.type === 'success' 
                ? 'bg-green-900/50 border-2 border-green-500 text-green-200'
                : message.type === 'warning'
                ? 'bg-yellow-900/50 border-2 border-yellow-500 text-yellow-200'
                : 'bg-red-900/50 border-2 border-red-500 text-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {message.type === 'success' ? (
                  <CheckCircleIcon className="w-6 h-6 flex-shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
                )}
                <p className="font-semibold">{message.text}</p>
                <button
                  onClick={() => setMessage(null)}
                  className="ml-auto text-2xl hover:scale-110 transition-transform"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Game Filter */}
          <div className="mb-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setSelectedGame('all')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                selectedGame === 'all'
                  ? 'bg-amber-500 text-white shadow-lg scale-105'
                  : 'bg-amber-800/50 text-amber-200 hover:bg-amber-700/50'
              }`}
            >
              All Games ({sessions.length})
            </button>
            {sortedGames.map(gameType => (
              <button
                key={gameType}
                onClick={() => setSelectedGame(gameType)}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  selectedGame === gameType
                    ? 'bg-amber-500 text-white shadow-lg scale-105'
                    : 'bg-amber-800/50 text-amber-200 hover:bg-amber-700/50'
                }`}
              >
                {GAME_NAMES[gameType]} ({sessionsByGame[gameType].length})
              </button>
            ))}
          </div>

          {/* Games List */}
          {sessions.length === 0 ? (
            <div className="text-center py-16 bg-amber-900/30 rounded-3xl p-12 border-2 border-amber-500/30">
              <CurrencyDollarIcon className="w-24 h-24 mx-auto text-amber-400/50 mb-6" />
              <p className="text-3xl text-amber-300 font-black mb-4">No Coin Play Sessions Found</p>
              <p className="text-xl text-amber-200/90 mb-6">The Coin Play system needs to be set up in the database.</p>
              <div className="bg-red-900/30 border-2 border-red-500/50 rounded-xl p-6 max-w-2xl mx-auto">
                <p className="text-red-300 font-bold mb-3">⚠️ Setup Required</p>
                <p className="text-red-200 text-sm mb-4">Please run these SQL scripts in Supabase:</p>
                <ol className="text-left text-red-200 text-sm space-y-2">
                  <li className="flex items-start">
                    <span className="font-mono bg-black/30 px-2 py-1 rounded mr-2">1.</span>
                    <span><code className="bg-black/30 px-2 py-1 rounded">CREATE_COIN_PLAY_SYSTEM.sql</code> - Creates tables and 81 listings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-mono bg-black/30 px-2 py-1 rounded mr-2">2.</span>
                    <span><code className="bg-black/30 px-2 py-1 rounded">DEBUG_COIN_PLAY.sql</code> - Diagnoses any issues</span>
                  </li>
                </ol>
              </div>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-16">
              <CurrencyDollarIcon className="w-24 h-24 mx-auto text-amber-400/30 mb-4" />
              <p className="text-2xl text-amber-300 font-bold">No games match your filter</p>
              <p className="text-amber-200/70 mt-2">Try selecting "All Games"</p>
            </div>
          ) : (
            <div className="space-y-12">
              {filteredGames.map(gameType => (
                <div key={gameType} className="bg-gradient-to-br from-amber-800/40 to-orange-900/40 rounded-3xl p-8 backdrop-blur-sm border-2 border-amber-500/30 shadow-2xl">
                  <h2 className="text-4xl font-black text-amber-200 mb-6 flex items-center gap-4">
                    <TrophyIcon className="w-10 h-10 text-amber-400" />
                    {GAME_NAMES[gameType]}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessionsByGame[gameType]
                      .sort((a, b) => a.prize_pool - b.prize_pool)
                      .map(session => {
                        const progress = (session.participants_count / session.max_participants) * 100;
                        const isActive = session.status === 'active' && session.timer_started_at;
                        let timeRemaining = 0;
                        
                        if (isActive && session.timer_started_at) {
                          const elapsed = Math.floor((Date.now() - new Date(session.timer_started_at).getTime()) / 1000);
                          timeRemaining = Math.max(0, session.timer_duration - elapsed);
                        }

                        // Calculate prize pool from config
                        const configPrize = parseInt(session.config_id.split('-').pop() || '0');
                        // Use actual pool if it exists, otherwise use config prize
                        const currentPrize = session.prize_pool > 0 ? session.prize_pool : configPrize;
                        // Calculate actual payout (85% of pool, 15% platform fee)
                        const winnerPayout = currentPrize * 0.85;
                        const platformFee = currentPrize * 0.15;

                        return (
                          <div
                            key={session.id}
                            className="bg-gradient-to-br from-amber-700/60 to-orange-800/60 rounded-2xl p-6 border-2 border-amber-500/40 hover:border-amber-400/80 transition-all hover:scale-105 shadow-xl"
                          >
                            {/* Title: Prize Amount */}
                            <div className="text-center mb-4 border-b-2 border-amber-500/30 pb-4">
                              <h3 className="text-2xl font-black text-amber-200 mb-2">
                                ${configPrize} Target Pool
                              </h3>
                              <div className="text-sm text-amber-300/80">
                                Winner gets ${winnerPayout.toFixed(2)} (85%)
                              </div>
                            </div>

                            {/* Current Pool & Actual Payout */}
                            <div className="text-center mb-4">
                              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-300">
                                ${currentPrize.toFixed(2)}
                              </div>
                              <div className="text-xs text-amber-200/60 mb-2">
                                Current Pool
                              </div>
                              <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-2 mt-2">
                                <div className="text-lg font-bold text-green-300">
                                  ${winnerPayout.toFixed(2)}
                                </div>
                                <div className="text-xs text-green-200/80">
                                  Winner Payout (85%)
                                </div>
                              </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-4">
                              <div className="flex justify-between text-sm text-amber-200 mb-2">
                                <span>{session.participants_count} / {session.max_participants} players</span>
                                <span>{progress.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-amber-950/50 rounded-full h-3 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-300 shadow-lg"
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Timer */}
                            {isActive && timeRemaining > 0 && (
                              <div className="flex items-center justify-center gap-2 mb-4 bg-red-900/40 border border-red-500/50 rounded-lg py-2">
                                <ClockIcon className="w-5 h-5 text-red-300 animate-pulse" />
                                <span className="text-xl font-black text-red-200">
                                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                            )}

                            {/* Entry Fee */}
                            <div className="flex items-center justify-center gap-2 mb-4 text-amber-200">
                              <BanknotesIcon className="w-5 h-5" />
                              <span className="font-bold">${session.entry_fee.toFixed(2)} entry</span>
                            </div>

                            {/* Join Button */}
                            <button
                              onClick={() => {
                                if (!isAuthenticated) {
                                  window.location.href = '/auth/login';
                                } else if (!locationVerified) {
                                  // Trigger location modal
                                  setManualLocationModal(true);
                                } else {
                                  handleJoinSession(session.config_id);
                                }
                              }}
                              disabled={joiningSession || session.status === 'completed' || (isAuthenticated && locationVerified && userTokens < session.entry_fee)}
                              className={`w-full py-3 rounded-xl font-black text-lg transition-all ${
                                joiningSession || session.status === 'completed' || (isAuthenticated && locationVerified && userTokens < session.entry_fee)
                                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                  : isAuthenticated && locationVerified
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-400 hover:to-yellow-500 shadow-lg hover:scale-105'
                                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-400 hover:to-purple-500 shadow-lg hover:scale-105'
                              }`}
                            >
                              {joiningSession ? (
                                'Joining...'
                              ) : session.status === 'completed' ? (
                                'Completed'
                              ) : !isAuthenticated ? (
                                <span className="flex items-center justify-center gap-2">
                                  <UserIcon className="w-5 h-5" />
                                  Sign In to Play
                                </span>
                              ) : !locationVerified ? (
                                <span className="flex items-center justify-center gap-2">
                                  <MapPinIcon className="w-5 h-5" />
                                  Verify Location
                                </span>
                              ) : userTokens < session.entry_fee ? (
                                <span className="flex items-center justify-center gap-2">
                                  <LockClosedIcon className="w-5 h-5" />
                                  Need {session.entry_fee} Tokens
                                </span>
                              ) : (
                                `JOIN FOR 25¢`
                              )}
                            </button>

                            {/* Scoreboard Dropdown */}
                            {session.participants_count > 0 && (
                              <div className="mt-4">
                                <button
                                  onClick={() => toggleScoreboard(session.id)}
                                  className="w-full flex items-center justify-between px-4 py-2 bg-amber-900/50 hover:bg-amber-900/70 rounded-lg transition-all"
                                >
                                  <span className="text-amber-200 font-bold text-sm flex items-center gap-2">
                                    <TrophyIcon className="w-4 h-4" />
                                    Leaderboard ({session.participants_count})
                                  </span>
                                  <span className={`text-amber-300 transform transition-transform ${expandedScoreboards[session.id] ? 'rotate-180' : ''}`}>
                                    ▼
                                  </span>
                                </button>

                                {expandedScoreboards[session.id] && (
                                  <div className="mt-2 bg-amber-950/60 rounded-lg p-3 border border-amber-600/30">
                                    {participants[session.id]?.length > 0 ? (
                                      <div className="space-y-1">
                                        {participants[session.id].map((participant: any, index: number) => {
                                          const hasScore = participant.score !== null && participant.score !== undefined;
                                          const isCurrentUser = user && participant.user_id === user.id;
                                          
                                          return (
                                            <div
                                              key={participant.user_id}
                                              className={`flex items-center justify-between px-3 py-2 rounded ${
                                                index === 0 && hasScore ? 'bg-yellow-500/20 border border-yellow-500/40' :
                                                index === 1 && hasScore ? 'bg-gray-400/10 border border-gray-400/30' :
                                                index === 2 && hasScore ? 'bg-orange-700/10 border border-orange-700/30' :
                                                isCurrentUser ? 'bg-amber-600/20 border border-amber-500/40' :
                                                'bg-amber-900/20'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className={`font-black text-sm ${
                                                  index === 0 && hasScore ? 'text-yellow-300' :
                                                  index === 1 && hasScore ? 'text-gray-300' :
                                                  index === 2 && hasScore ? 'text-orange-400' :
                                                  'text-amber-400'
                                                }`}>
                                                  {hasScore ? `#${index + 1}` : '—'}
                                                </span>
                                                <span className={`text-sm truncate max-w-[120px] ${
                                                  isCurrentUser ? 'text-amber-100 font-bold' : 'text-amber-200'
                                                }`}>
                                                  {participant.username} {isCurrentUser ? '(You)' : ''}
                                                </span>
                                              </div>
                                              <div className="text-right">
                                                {hasScore ? (
                                                  <span className="text-amber-100 font-black text-sm">
                                                    {Number(participant.score).toLocaleString()}
                                                  </span>
                                                ) : (
                                                  <span className="text-amber-400/60 text-xs italic">
                                                    Playing...
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-amber-300/60 text-sm text-center py-2">
                                        Loading scoreboard...
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* How It Works */}
          <div className="mt-16 bg-gradient-to-br from-amber-800/40 to-orange-900/40 rounded-3xl p-8 backdrop-blur-sm border-2 border-amber-500/30">
            <h3 className="text-3xl font-black text-amber-200 mb-6 text-center">
              💡 How Coin Play Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-black text-white">1</span>
                </div>
                <h4 className="text-xl font-bold text-amber-300 mb-2">Pay 25¢</h4>
                <p className="text-amber-200/80">
                  Every game costs just a quarter to enter. Affordable for everyone!
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-black text-white">2</span>
                </div>
                <h4 className="text-xl font-bold text-amber-300 mb-2">Play & Compete</h4>
                <p className="text-amber-200/80">
                  When max players join, you have 2 minutes to submit your best score!
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-black text-white">3</span>
                </div>
                <h4 className="text-xl font-bold text-amber-300 mb-2">Winner Takes 85%</h4>
                <p className="text-amber-200/80">
                  Highest score wins 85% of the prize pool. Win up to $850 from 25¢!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    </>
  );
}

