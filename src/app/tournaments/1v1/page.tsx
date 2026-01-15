'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import { executeRpcWithSession, ensureAuthReady } from '@/lib/supabase/sessionGuard';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
import ErrorBoundary from '@/components/ErrorBoundary';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import AdBanner from '@/components/ads/AdBanner';
import PageWalletDisplay from '@/components/wallet/PageWalletDisplay';
import LocationPermissionModal from '@/components/modals/LocationPermissionModal';
import LocationBanner from '@/components/location/LocationBanner';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import { ImprovedLocationService } from '@/lib/improvedLocationService';
import LazyVideo from '@/components/video/LazyVideo';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
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
import PageThemeOverlay from '@/components/themed/PageThemeOverlay';

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
    username?: string;
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

// Define which games are mobile-compatible vs desktop-only - OUTSIDE component to avoid scope issues
const MOBILE_COMPATIBLE_GAMES = ['multi_target_reaction', 'quick_click', 'color_sequence', 'falling_object'];
const DESKTOP_ONLY_GAMES = ['blade_bounce', 'cash_stack', 'laser_dodge', 'sword_parry'];

export default function OneVOnePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { tokenBalance: userTokens, isLoading: tokensLoading, refreshTokens } = useTokenSync();
  
  // Location verification hook
  const {
    locationVerified,
    improvedLocation,
    locationLoading,
    showLocationModal,
    handleLocationGranted,
    handleLocationDenied
  } = useLocationVerification(isAuthenticated);
  
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
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [currentDeviceTypeFilter, setCurrentDeviceTypeFilter] = useState<'all' | 'desktop' | 'mobile'>('all');
  const [payoutTimers, setPayoutTimers] = useState<Record<string, number>>({});
  const [countdownIntervals, setCountdownIntervals] = useState<Record<string, NodeJS.Timeout>>({});
  
  // Device detection hook
  const deviceInfo = useDeviceDetection();
  
  // Wrapper for setDeviceFilter to maintain compatibility with onClick handlers
  const setDeviceFilter = useCallback((value: 'all' | 'desktop' | 'mobile') => {
    setCurrentDeviceTypeFilter(value);
  }, []);
  
  // Auto-detect device type on load and set filter accordingly
  useEffect(() => {
    if (deviceInfo && currentDeviceTypeFilter === 'all') {
      if (deviceInfo.isMobile) {
        setCurrentDeviceTypeFilter('mobile');
      } else if (deviceInfo.isDesktop) {
        setCurrentDeviceTypeFilter('desktop');
      }
    }
  }, [deviceInfo?.isMobile, deviceInfo?.isDesktop, currentDeviceTypeFilter]);

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
      
      // CRITICAL: Check auth before making RPC calls
      const authCheck = await ensureAuthReady(isAuthenticated, authLoading);
      
      if (!authCheck.ready) {
        console.warn('⚠️ [1v1] Auth not ready:', authCheck.message);
        setIsLoading(false);
        return;
      }
      
      // Use session-guarded RPC call
      const { data, error, isSessionValid } = await executeRpcWithSession('get_all_1v1_sessions');
      
      // If session is invalid, show error and stop
      if (!isSessionValid) {
        console.error('❌ [1v1] Session is not active');
        setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
        setSessions([]);
        setIsLoading(false);
        return;
      }
      
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
  }, [isAuthenticated, authLoading]); // Add auth dependencies

  // Load configs and sessions on mount
  useEffect(() => {
    // CRITICAL: Wait for auth to finish loading
    if (authLoading) {
      console.log('⏳ [1v1] Auth is loading...');
      return;
    }
    
    // Wait for authentication before loading data
    if (!isAuthenticated) {
      console.log('⚠️ [1v1] Not authenticated');
      setIsLoading(false);
      return;
    }
    
    console.log('✅ [1v1] Authenticated, loading data...');
    loadConfigs();
    loadSessions();
    
    // Refresh sessions every 30 seconds (only when authenticated)
    const interval = setInterval(loadSessions, 30000);
    return () => {
      clearInterval(interval);
      // Clear all countdown intervals on unmount
      Object.values(countdownIntervals).forEach(interval => clearInterval(interval));
    };
  }, [isAuthenticated, authLoading, loadSessions]);

  // Poll for completed games and start countdown timer
  useEffect(() => {
    if (!sessions || sessions.length === 0 || !user) return;

    const checkForCompletedGames = () => {
      sessions.forEach(session => {
        // Skip if timer already running or payout already triggered
        if (payoutTimers[session.config_id] !== undefined || session.winner_user_id) {
          return;
        }

        const userParticipant = session.participants.find(p => p.user_id === user.id);
        if (!userParticipant) return; // Only check sessions user is in

        const bothJoined = session.participants.length >= 2;
        const bothCompleted = session.participants.every(p => 
          p.score !== null && p.score !== undefined && p.completed_at !== null
        );

        console.log(`🔍 [1v1] Polling session ${session.config_id}:`, {
          bothJoined,
          bothCompleted,
          participants: session.participants.length,
          scores: session.participants.map(p => ({ score: p.score, completed: p.completed_at }))
        });

        if (bothJoined && bothCompleted) {
          console.log('🚨 [1v1] BOTH PLAYERS COMPLETED! Starting countdown...');
          
          // Auto-expand scoreboard
          setTimeout(() => {
            const scoreboard = document.getElementById(`scoreboard-${session.config_id}`);
            if (scoreboard) {
              scoreboard.classList.remove('hidden');
              console.log('✅ Scoreboard auto-expanded');
            }
          }, 100);

          // Clear any existing countdown
          if (countdownIntervals[session.config_id]) {
            clearInterval(countdownIntervals[session.config_id]);
          }

          // Start 10 second countdown
          setPayoutTimers(prev => ({ ...prev, [session.config_id]: 10 }));
          console.log('⏱️ Starting 10-second countdown...');

          let countdownValue = 10;
          const countdown = setInterval(() => {
            countdownValue--;
            console.log(`⏱️ Countdown: ${countdownValue}`);
            setPayoutTimers(prev => ({ ...prev, [session.config_id]: countdownValue }));

            if (countdownValue <= 0) {
              clearInterval(countdown);
              console.log('💰 Countdown complete! Triggering payout...');
              setCountdownIntervals(prev => {
                const newIntervals = { ...prev };
                delete newIntervals[session.config_id];
                return newIntervals;
              });
              triggerPayout(session.config_id);
            }
          }, 1000);

          // Store interval
          setCountdownIntervals(prev => ({ ...prev, [session.config_id]: countdown }));
        }
      });
    };

    // Check immediately
    checkForCompletedGames();

    // Then check every 2 seconds
    const pollInterval = setInterval(checkForCompletedGames, 2000);

    return () => clearInterval(pollInterval);
  }, [sessions, user, payoutTimers, countdownIntervals]);

  // Handle joining a session
  const handleJoinSession = async (config: OneVOneConfig) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please sign in to join' });
      return;
    }

    console.log('🌍 [1v1] Location check:', { locationVerified });
    if (!locationVerified) {
      console.log('❌ [1v1] Location not allowed');
      setMessage({ type: 'error', text: 'Gaming not allowed in your location. Please check our terms and conditions.' });
      return;
    }

    // Device compatibility check
    try {
      if (!deviceInfo || deviceInfo.deviceType === undefined) {
        console.log('⏳ [Device Check] Waiting for device detection...');
        setMessage({ type: 'error', text: 'Please wait while we detect your device...' });
        setTimeout(() => handleJoinSession(config), 500);
        return;
      }
    } catch (error) {
      console.error('❌ [Device Check] Error checking device:', error);
    }

    const isMobileDevice = deviceInfo?.isMobile || deviceInfo?.deviceType === 'mobile';
    const isDesktopDevice = deviceInfo?.isDesktop || deviceInfo?.deviceType === 'desktop';
    const isMobileCompatible = MOBILE_COMPATIBLE_GAMES.includes(config.game_type);
    const isDesktopOnly = DESKTOP_ONLY_GAMES.includes(config.game_type);
    
    // STRICT: Prevent mobile users from playing desktop-only games
    if (isMobileDevice && isDesktopOnly) {
      setMessage({ 
        type: 'error', 
        text: 'This game requires a desktop device. Please use a computer to play.' 
      });
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

      // Call join function with session guard
      const { data, error, isSessionValid } = await executeRpcWithSession('join_1v1_session', {
        session_id_param: session.id,
        user_id_param: user.id,
        entry_fee_param: config.entry_fee
      });

      console.log('📊 [1v1] Join response:', { data, error, isSessionValid });

      if (!isSessionValid) {
        setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
        return;
      }

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
  const handleGameComplete = async (score: number, accuracy: number) => {
    console.log('🎮 [1v1] Game completed with score:', score, 'accuracy:', accuracy);
    
    if (!selectedGameFlow) return;

    try {
      // Update score with session guard
      const { data, error, isSessionValid } = await executeRpcWithSession('update_1v1_score', {
        session_id_param: selectedGameFlow.sessionId,
        user_id_param: user?.id,
        score_param: score,
        accuracy_param: accuracy
      });

      if (!isSessionValid) {
        setMessage({ type: 'error', text: 'Your session has expired. Score not saved.' });
        return;
      }

      if (error) {
        console.error('❌ [1v1] Error saving score:', error);
        setMessage({ type: 'error', text: 'Error saving score: ' + error.message });
      } else {
        console.log('✅ [1v1] Score saved successfully');
        setMessage({ type: 'success', text: 'Game completed! Score: ' + score.toFixed(2) });
      }

      // Refresh sessions to show scoreboard
      await refreshTokens();
      await loadSessions();
      
      // Return to list to show scoreboard
      setCurrentView('list');
      setSelectedGameFlow(null);

      // Check if both players have completed - start 10 second timer
      const checkAndStartTimer = async () => {
        const configId = selectedGameFlow.configId;
        console.log('🔍 [1v1] Checking for payout trigger...', configId);
        
        try {
          // Re-fetch the session to check if ready
          const { data: checkSession, error: sessionError } = await supabase
            .from('one_v_one_sessions')
            .select(`
              *,
              participants:one_v_one_participants(user_id, score, completed_at)
            `)
            .eq('config_id', configId)
            .single();
          
          if (sessionError) {
            console.error('❌ [1v1] Error fetching session:', sessionError);
            return;
          }
          
          if (checkSession) {
            const bothJoined = checkSession.participants.length >= 2;
            const bothCompleted = checkSession.participants.every((p: any) => 
              p.score !== null && p.score !== undefined && p.completed_at !== null
            );
            const notPaid = !checkSession.winner_user_id;
            
            console.log('📊 [1v1] Payout readiness check:', {
              configId,
              bothJoined,
              bothCompleted,
              notPaid,
              participantCount: checkSession.participants.length,
              participants: checkSession.participants,
              status: checkSession.status
            });
            
            if (bothJoined && bothCompleted && notPaid) {
              console.log('✅ [1v1] BOTH PLAYERS DONE! Starting 10-second payout timer...');
              
              // Auto-expand scoreboard
              setTimeout(() => {
                const scoreboard = document.getElementById(`scoreboard-${configId}`);
                console.log('🔍 Looking for scoreboard:', `scoreboard-${configId}`, scoreboard);
                if (scoreboard) {
                  scoreboard.classList.remove('hidden');
                  console.log('✅ Scoreboard expanded!');
                } else {
                  console.warn('⚠️ Scoreboard element not found');
                }
              }, 100);
              
              // Clear any existing countdown for this config
              if (countdownIntervals[configId]) {
                clearInterval(countdownIntervals[configId]);
              }
              
              // Start 10 second countdown
              setPayoutTimers(prev => ({ ...prev, [configId]: 10 }));
              console.log('⏱️ Starting countdown from 10...');
              
              let countdownValue = 10;
              const countdown = setInterval(() => {
                countdownValue--;
                console.log(`⏱️ Countdown: ${countdownValue}`);
                setPayoutTimers(prev => ({ ...prev, [configId]: countdownValue }));
                
                if (countdownValue <= 0) {
                  clearInterval(countdown);
                  console.log('💰 Countdown finished! Triggering payout...');
                  setCountdownIntervals(prev => {
                    const newIntervals = { ...prev };
                    delete newIntervals[configId];
                    return newIntervals;
                  });
                  // Trigger payout
                  triggerPayout(configId);
                }
              }, 1000);
              
              // Store the interval
              setCountdownIntervals(prev => ({ ...prev, [configId]: countdown }));
            } else {
              console.log('⏸️ [1v1] Waiting for opponent to finish...', {
                bothJoined,
                bothCompleted,
                notPaid
              });
            }
          }
        } catch (error) {
          console.error('❌ [1v1] Error in checkAndStartTimer:', error);
        }
      };
      
      setTimeout(checkAndStartTimer, 2000);

    } catch (error) {
      console.error('❌ [1v1] Error in game completion:', error);
      setMessage({ type: 'error', text: 'Failed to save game result' });
    }
  };

  // Trigger payout and reset
  const triggerPayout = async (configId: string) => {
    try {
      console.log('💰 [1v1] Triggering payout for:', configId);
      
      const { data: payoutData, error: payoutError, isSessionValid } = await executeRpcWithSession('process_1v1_payout', {
        config_id_param: configId
      });

      if (!isSessionValid) {
        console.error('❌ [1v1] Session invalid during payout');
        setMessage({ type: 'error', text: 'Your session has expired.' });
        return;
      }

      if (payoutError) {
        console.error('❌ [1v1] Payout error:', payoutError);
        setMessage({ type: 'error', text: 'Payout failed: ' + payoutError.message });
      } else {
        console.log('💰 [1v1] Payout successful:', payoutData);
        if (payoutData && payoutData.success) {
          setMessage({ 
            type: 'success', 
            text: `🎉 Winner Takes All! ${payoutData.winner_username} won $${payoutData.winner_payout?.toFixed(2)}!` 
          });
          
          // Refresh tokens and sessions after payout
          await refreshTokens();
          await loadSessions();
          
          // Clear payout timer
          setPayoutTimers(prev => ({ ...prev, [configId]: 0 }));
        }
      }
    } catch (error) {
      console.error('❌ [1v1] Error triggering payout:', error);
      setMessage({ type: 'error', text: 'Failed to process payout' });
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
  // Filter configs by device compatibility
  const filterConfigsByDevice = useCallback((filterValue: 'all' | 'desktop' | 'mobile', configsList: OneVOneConfig[] | undefined | null): OneVOneConfig[] => {
    if (!configsList || !Array.isArray(configsList)) {
      return [];
    }
    return configsList.filter(config => {
      if (!config || !config.game_type) return false;
      if (filterValue === 'all') return true;
      if (filterValue === 'mobile') {
        return MOBILE_COMPATIBLE_GAMES.includes(config.game_type);
      }
      if (filterValue === 'desktop') {
        return !MOBILE_COMPATIBLE_GAMES.includes(config.game_type) || DESKTOP_ONLY_GAMES.includes(config.game_type);
      }
      return true;
    });
  }, []);
  
  // Use useMemo with direct state access - currentDeviceTypeFilter is always defined
  // Ensure deviceFilteredConfigs is always an array, never undefined
  const deviceFilteredConfigs: OneVOneConfig[] = useMemo((): OneVOneConfig[] => {
    try {
      // Ensure configs is an array
      if (!configs || !Array.isArray(configs)) {
        return [];
      }
      // Get current filter value - always use currentDeviceTypeFilter directly
      const currentFilter: 'all' | 'desktop' | 'mobile' = currentDeviceTypeFilter || 'all';
      const filtered = filterConfigsByDevice(currentFilter, configs);
      // Double-check result is an array
      return Array.isArray(filtered) ? filtered : [];
    } catch (error) {
      console.error('❌ [1v1] Error filtering configs by device:', error);
      return [];
    }
  }, [configs, currentDeviceTypeFilter, filterConfigsByDevice]);
  
  // Safe reference for current device filter in JSX
  const getCurrentDeviceFilter = useCallback((): 'all' | 'desktop' | 'mobile' => {
    return currentDeviceTypeFilter || 'all';
  }, [currentDeviceTypeFilter]);
  
  const gameTypes = useMemo((): string[] => {
    try {
      if (!deviceFilteredConfigs || !Array.isArray(deviceFilteredConfigs)) {
        return [];
      }
      return Array.from(new Set(deviceFilteredConfigs.map(c => c?.game_type).filter(Boolean))) as string[];
    } catch (error) {
      console.error('❌ [1v1] Error computing game types:', error);
      return [];
    }
  }, [deviceFilteredConfigs]);
  
  // Filter game types based on selection
  const filteredGameTypes = useMemo(() => {
    return selectedGame === 'all' 
      ? gameTypes 
      : gameTypes.filter(g => g === selectedGame);
  }, [gameTypes, selectedGame]);

  const getGameInfo = (type: string) => {
    switch(type) {
      case 'sword_parry': return { name: '⚔️ Sword Slash', emoji: '⚔️', video: '/sword-parry-gameplay.mp4' };
      case 'blade_bounce': return { name: '🛡️ Blade Bounce', emoji: '🛡️', video: '/mouseblade-gameplay.mp4' };
      case 'laser_dodge': return { name: '🚀 Laser Dodge', emoji: '🚀', video: '/laser-dodge-gameplay.mp4' };
      case 'multi_target_reaction': return { name: '🎯 Multi-Target', emoji: '🎯', video: '/multi-touch-gameplay.mp4' };
      case 'falling_object': return { name: '💰 Coin Catch', emoji: '💰', video: '/falling-object-gameplay.mp4' };
      case 'color_sequence': return { name: '🎨 Color Memory', emoji: '🎨', video: '/color-sequence-gameplay.mp4' };
      case 'cash_stack': return { name: '💵 Cash Stack', emoji: '💵', video: '/cash-stack-gameplay.mp4' };
      case 'quick_click': return { name: '⚡ Quick Click', emoji: '⚡', video: '/quick-click-gameplay.mp4' };
      default: return { name: type, emoji: '🎮', video: null };
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
      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onLocationGranted={handleLocationGranted}
        onLocationDenied={handleLocationDenied}
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Site Theme Overlay - Frankenstein Lab for Halloween, Snowball Fight for Christmas */}
        <PageThemeOverlay page="1v1" />
        
        <CleanNavigation />
        
        <div className="container mx-auto px-4 py-8 pt-24">
          {/* Ad Banner */}
          <AdBanner pageLocation="1v1" position="top" />
          
          {/* Wallet Display */}
          <PageWalletDisplay variant="1v1" />
          
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
            <p className="text-2xl text-blue-200 font-semibold">Face Off • Winner Takes All (85%)</p>
          </div>

          {/* Location Verification Banner */}
          {isAuthenticated && (
            <LocationBanner
              isLoading={locationLoading}
              location={improvedLocation}
              isVerified={locationVerified}
            />
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

          {/* Device Filter - Mobile/Desktop/All */}
          {!loadingConfigs && (
            <div className="mb-6 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setDeviceFilter('all')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  getCurrentDeviceFilter() === 'all'
                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                    : 'bg-blue-800/50 text-blue-200 hover:bg-blue-700/50'
                }`}
              >
                📱💻 All Devices ({configs.length})
              </button>
              <button
                onClick={() => setDeviceFilter('mobile')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  getCurrentDeviceFilter() === 'mobile'
                    ? 'bg-green-500 text-white shadow-lg scale-105'
                    : 'bg-green-800/50 text-green-200 hover:bg-green-700/50'
                }`}
              >
                📱 Mobile ({Array.isArray(deviceFilteredConfigs) ? deviceFilteredConfigs.filter(c => c && MOBILE_COMPATIBLE_GAMES.includes(c.game_type)).length : 0})
              </button>
              <button
                onClick={() => setDeviceFilter('desktop')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  getCurrentDeviceFilter() === 'desktop'
                    ? 'bg-purple-500 text-white shadow-lg scale-105'
                    : 'bg-purple-800/50 text-purple-200 hover:bg-purple-700/50'
                }`}
              >
                💻 Desktop ({Array.isArray(deviceFilteredConfigs) ? deviceFilteredConfigs.filter(c => c && (!MOBILE_COMPATIBLE_GAMES.includes(c.game_type) || DESKTOP_ONLY_GAMES.includes(c.game_type))).length : 0})
              </button>
            </div>
          )}

          {/* Game Filter */}
          {!loadingConfigs && Array.isArray(deviceFilteredConfigs) && deviceFilteredConfigs.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setSelectedGame('all')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  selectedGame === 'all'
                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                    : 'bg-blue-800/50 text-blue-200 hover:bg-blue-700/50'
                }`}
              >
                All Games ({Array.isArray(deviceFilteredConfigs) ? deviceFilteredConfigs.length : 0})
              </button>
              {Array.isArray(gameTypes) && gameTypes.map(gameType => {
                const gameInfo = getGameInfo(gameType);
                const count = Array.isArray(deviceFilteredConfigs) ? deviceFilteredConfigs.filter(c => c && c.game_type === gameType).length : 0;
                return (
                  <button
                    key={gameType}
                    onClick={() => setSelectedGame(gameType)}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                      selectedGame === gameType
                        ? 'bg-blue-500 text-white shadow-lg scale-105'
                        : 'bg-blue-800/50 text-blue-200 hover:bg-blue-700/50'
                    }`}
                  >
                    {gameInfo.emoji} {gameInfo.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* 1v1 Games - Organized by Game Type */}
          {!loadingConfigs && Array.isArray(deviceFilteredConfigs) && deviceFilteredConfigs.length > 0 && Array.isArray(filteredGameTypes) && filteredGameTypes.map(gameType => {
            const gameConfigs = (deviceFilteredConfigs || []).filter(c => c && c.game_type === gameType);
            if (!gameConfigs || gameConfigs.length === 0) return null;

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
                      const gameInfoNoSession = getGameInfo(config.game_type);
                      
                      return (
                        <div key={config.id} className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 shadow-2xl">
                          {/* Gameplay Video Preview */}
                          {gameInfoNoSession.video && (
                            <div className="relative w-full mb-4 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '200px' }}>
                              <LazyVideo
                                src={gameInfoNoSession.video}
                                className="w-full h-full"
                                preload="none"
                              />
                            </div>
                          )}
                          
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
                        {/* Gameplay Video Preview */}
                        {gameInfo.video && (
                          <div className="relative w-full mb-4 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '200px' }}>
                            <LazyVideo
                              src={gameInfo.video}
                              className="w-full h-full"
                              preload="none"
                            />
                          </div>
                        )}
                        
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

                        {/* Live Scoreboard - Only show to users who have joined and if there are participants with scores */}
                        {session && session.participants.filter(p => p.score !== null && p.completed_at !== null).length > 0 && userParticipant && (
                          <div className="mb-6">
                            <button
                              onClick={() => {
                                const scoreboard = document.getElementById(`scoreboard-${config.id}`);
                                if (scoreboard) {
                                  scoreboard.classList.toggle('hidden');
                                }
                              }}
                              className="w-full flex items-center justify-between text-left bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all"
                            >
                              <h4 className="text-sm font-semibold text-white flex items-center">
                                <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
                                Live Scoreboard ({session.participants.filter(p => p.score !== null && p.completed_at !== null).length}/2 completed)
                              </h4>
                              <span className="text-gray-400 text-xs">Click to expand</span>
                            </button>
                            
                            <div id={`scoreboard-${config.id}`} className="hidden mt-3">
                              <div className="bg-white/5 rounded-xl p-4">
                                {/* Payout Timer (shows when both players done) */}
                                {payoutTimers[config.id] > 0 && (
                                  <div className="mb-4 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/50 animate-pulse">
                                    <div className="text-center">
                                      <div className="text-yellow-300 font-bold text-3xl mb-1">
                                        {payoutTimers[config.id]}
                                      </div>
                                      <div className="text-yellow-200 text-sm font-semibold">
                                        💰 Processing payout...
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
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
                                      const displayName = isCurrentUser ? 'You' : (participant.username || `Player ${index + 1}`);
                                      const isWinner = index === 0;
                                      
                                      return (
                                        <div key={participant.id} className={`rounded-lg p-3 ${
                                          isWinner 
                                            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50'
                                            : isCurrentUser 
                                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50' 
                                            : 'bg-white/5'
                                        }`}>
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                                                index === 0 ? 'bg-yellow-500' : 'bg-gray-400'
                                              }`}>
                                                <span className="text-xs font-bold text-white">{index + 1}</span>
                                              </div>
                                              <span className={`text-sm ${isCurrentUser ? 'text-purple-300 font-semibold' : 'text-white'}`}>
                                                {displayName}
                                              </span>
                                            </div>
                                            <span className={`font-semibold ${isWinner ? 'text-yellow-300' : isCurrentUser ? 'text-purple-300' : 'text-white'}`}>
                                              {participant.score?.toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                                
                                {/* Waiting message */}
                                {session.participants.filter(p => p.score !== null && p.completed_at !== null).length < 2 && (
                                  <div className="mt-3 text-center text-sm text-gray-400">
                                    ⏳ Waiting for opponent to complete...
                                  </div>
                                )}
                              </div>
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
                              disabled={joiningSession || !locationVerified}
                              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              {joiningSession ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                  Starting...
                                </>
                              ) : !locationVerified ? (
                                <>
                                  <LockClosedIcon className="w-5 h-5 mr-2" />
                                  Location Not Verified
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
                              disabled={joiningSession || displayTokens < config.entry_fee || !locationVerified}
                              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              {joiningSession ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                  Joining...
                                </>
                              ) : !locationVerified ? (
                                <>
                                  <LockClosedIcon className="w-5 h-5 mr-2" />
                                  Location Not Verified
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
                          <p>⚔️ Head-to-head battle • Highest score wins • Winner Takes All (85%)</p>
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
