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
import LocationBanner from '@/components/location/LocationBanner';
import LocationVerificationModal from '@/components/modals/LocationVerificationModal';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import { ImprovedLocationService } from '@/lib/improvedLocationService';
import LazyVideo from '@/components/video/LazyVideo';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
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
import PageThemeOverlay from '@/components/themed/PageThemeOverlay';

interface HotSellSession {
  id: string;
  config_id: string;
  prize_pool: number;  // Actual token pool from all entries
  base_price: number;
  max_participants: number;
  participants_count: number;
  status: 'waiting' | 'active' | 'completed';
  rng_seed: number;  // RNG seed for deterministic gameplay
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
    username?: string;
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

// Define which games are mobile-compatible vs desktop-only - OUTSIDE component to avoid scope issues
const MOBILE_COMPATIBLE_GAMES = ['multi_target_reaction', 'quick_click', 'color_sequence', 'falling_object'];
const DESKTOP_ONLY_GAMES = ['blade_bounce', 'cash_stack', 'laser_dodge', 'sword_parry'];

export default function HotSellPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
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
  const [selectedGame, setSelectedGame] = useState<string>('all');
  // Device filter state - use completely different name to avoid any conflicts
  const [currentDeviceTypeFilter, setCurrentDeviceTypeFilter] = useState<'all' | 'desktop' | 'mobile'>('all');
  const [expandedScoreboards, setExpandedScoreboards] = useState<Record<string, boolean>>({});
  
  // Wrapper for setDeviceFilter to maintain compatibility with onClick handlers
  const setDeviceFilter = useCallback((value: 'all' | 'desktop' | 'mobile') => {
    setCurrentDeviceTypeFilter(value);
  }, []);
  
  // Device detection hook
  const deviceInfo = useDeviceDetection();
  
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
  
  // Location verification hook
  const {
    locationVerified,
    improvedLocation,
    locationLoading,
    showLocationModal,
    handleLocationGranted,
    handleLocationDenied
  } = useLocationVerification(isAuthenticated);
  
  // Stable token display to prevent flickering
  const [displayTokens, setDisplayTokens] = useState<number>(0);
  const [hasLoadedTokens, setHasLoadedTokens] = useState(false);
  const [payoutCountdown, setPayoutCountdown] = useState<{ [configId: string]: number }>({});

  // Update display tokens only when they actually change
  useEffect(() => {
    if (!tokensLoading && userTokens !== displayTokens) {
      setDisplayTokens(userTokens);
      setHasLoadedTokens(true);
    }
  }, [userTokens, tokensLoading]);

  // State for dynamically loaded configs
  const [configs, setConfigs] = useState<HotSellConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Fallback hardcoded configs (will be replaced by DB configs)
  const fallbackConfigs: HotSellConfig[] = [
    {
      id: 'hs-3-sword-parry',
      game_type: 'sword_parry',
      title: '$3 Hot Sell - Sword Parry',
      description: '1st: 50%, 2nd: 20%, 3rd: 15%',
      entry_fee: 1,
      base_price: 3,
      max_participants: 3,
      game_duration: 30,
      rng_seed: 5,
      first_place_percent: 50,
      second_place_percent: 20,
      third_place_percent: 15,
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
      
      // CRITICAL: Check auth before making RPC calls
      const authCheck = await ensureAuthReady(isAuthenticated, authLoading);
      
      if (!authCheck.ready) {
        console.warn('⚠️ [Hot Sell] Auth not ready:', authCheck.message);
        setIsLoading(false);
        return;
      }
      
      // Use session-guarded RPC call
      const { data, error, isSessionValid } = await executeRpcWithSession('get_all_hot_sell_sessions');
      
      // If session is invalid, show error and stop
      if (!isSessionValid) {
        console.error('❌ [Hot Sell] Session is not active');
        setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
        setSessions([]);
        setIsLoading(false);
        return;
      }
      
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
          (sessionsData || []).map(async (session: any) => {
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
  }, [isAuthenticated, authLoading]); // Add auth dependencies


  // Load configs from database
  const loadConfigs = async () => {
    try {
      setLoadingConfigs(true);
      console.log('📥 [Hot Sell] Loading configs from database...');
      
      const { data, error } = await supabase
        .from('hot_sell_configs')
        .select('*')
        .order('base_price', { ascending: true });

      if (error) {
        console.warn('⚠️ [Hot Sell] Could not load configs from DB, using fallback:', error.message);
        setConfigs(fallbackConfigs);
      } else if (data && data.length > 0) {
        console.log(`✅ [Hot Sell] Loaded ${data.length} configs from database`);
        setConfigs(data as HotSellConfig[]);
      } else {
        console.warn('⚠️ [Hot Sell] No configs found in DB, using fallback');
        setConfigs(fallbackConfigs);
      }
    } catch (err) {
      console.error('❌ [Hot Sell] Error loading configs:', err);
      setConfigs(fallbackConfigs);
    } finally {
      setLoadingConfigs(false);
    }
  };

  // Generate Red Scrolling Stars - SLOW AND FEW
  useEffect(() => {
    const starsContainer = document.getElementById('stars-container-red');
    if (!starsContainer) return;
    
    // Clear existing stars
    starsContainer.innerHTML = '';
    
    // Generate stars - FEWER for cleaner look
    const starCount = 60; // Much fewer stars
    const starsGenerated: HTMLDivElement[] = [];
    
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      const size = Math.random() < 0.6 ? 'small' : Math.random() < 0.9 ? 'medium' : 'large';
      const left = Math.random() * 100;
      const duration = 8 + Math.random() * 7; // 8-15 seconds (much slower)
      const delay = Math.random() * 12; // 0-12s stagger for gradual appearance
      const xOffset = (Math.random() - 0.5) * 150; // Minimal horizontal drift
      
      star.className = `star-wars-star-red ${size}`;
      star.style.setProperty('--star-left', `${left}%`);
      star.style.setProperty('--star-duration', `${duration}s`);
      star.style.setProperty('--star-x', `${xOffset}px`);
      star.style.animationDelay = `${delay}s`;
      star.style.willChange = 'transform, opacity';
      
      starsContainer.appendChild(star);
      starsGenerated.push(star);
    }
    
    // Continuously regenerate stars - VERY SLOW regeneration
    const regenerateInterval = setInterval(() => {
      // Add just a few new stars periodically
      for (let i = 0; i < 3; i++) {
        const star = document.createElement('div');
        const size = Math.random() < 0.6 ? 'small' : Math.random() < 0.9 ? 'medium' : 'large';
        const left = Math.random() * 100;
        const duration = 8 + Math.random() * 7; // 8-15 seconds
        const delay = i * 0.3; // Stagger new stars
        const xOffset = (Math.random() - 0.5) * 150;
        
        star.className = `star-wars-star-red ${size}`;
        star.style.setProperty('--star-left', `${left}%`);
        star.style.setProperty('--star-duration', `${duration}s`);
        star.style.setProperty('--star-x', `${xOffset}px`);
        star.style.animationDelay = `${delay}s`;
        star.style.willChange = 'transform, opacity';
        
        starsContainer.appendChild(star);
        
        // Remove old stars to prevent DOM bloat
        if (starsContainer.children.length > 100) {
          const oldStar = starsContainer.firstChild;
          if (oldStar) starsContainer.removeChild(oldStar);
        }
      }
    }, 5000); // Add new stars every 5 seconds (much slower = cleaner)
    
    // Cleanup
    return () => {
      clearInterval(regenerateInterval);
      if (starsContainer) {
        starsContainer.innerHTML = '';
      }
    };
  }, []);

  // Generate floating red particles (like RP pages) - SLOWER like games page
  useEffect(() => {
    const particlesContainer = document.getElementById('hot-sell-particles');
    if (!particlesContainer) return;

    const particleCount = 40; // Fewer particles for smoother animation (matching games page)
    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'hot-sell-particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 8}s`; // Longer delay range for staggered start
      particle.style.animationDuration = `${12 + Math.random() * 18}s`; // Much slower (12-30s instead of 8-23s)
      particlesContainer.appendChild(particle);
      particles.push(particle);
    }

    return () => {
      particles.forEach(p => p.remove());
    };
  }, []);

  useEffect(() => {
    // CRITICAL: Wait for auth to finish loading
    if (authLoading) {
      console.log('⏳ [Hot Sell] Auth is loading...');
      return;
    }
    
    console.log('✅ [Hot Sell] Loading public data...');
    // Always load configs (public data)
    loadConfigs();
    
    // Only load sessions if authenticated
    if (isAuthenticated) {
      console.log('✅ [Hot Sell] Authenticated, loading sessions...');
      loadSessions();
      
      // Refresh sessions every 30 seconds (only when authenticated)
      const interval = setInterval(loadSessions, 30000);
      return () => clearInterval(interval);
    } else {
      console.log('⚠️ [Hot Sell] Not authenticated, showing public view');
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, loadSessions]);

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

    // DEVICE VALIDATION: Check if user's device matches game requirements
    // Wait for device info to be ready with error handling
    try {
      if (!deviceInfo || deviceInfo.deviceType === undefined) {
        console.log('⏳ [Device Check] Waiting for device detection...');
        setMessage({ type: 'error', text: 'Please wait while we detect your device...' });
        setTimeout(() => handleJoinSession(config), 500);
        return;
      }
    } catch (error) {
      console.error('❌ [Device Check] Error checking device:', error);
      // If device detection fails, allow desktop users to proceed (fail open for desktop)
      console.log('⚠️ [Device Check] Device detection failed, allowing join (assuming desktop)');
    }
    
    const isMobileDevice = deviceInfo.isMobile || deviceInfo.deviceType === 'mobile';
    const isDesktopDevice = deviceInfo.isDesktop || deviceInfo.deviceType === 'desktop';
    const isMobileCompatible = MOBILE_COMPATIBLE_GAMES.includes(config.game_type);
    const isDesktopOnly = DESKTOP_ONLY_GAMES.includes(config.game_type);
    
    console.log('📱 [Device Check]', {
      deviceType: deviceInfo.deviceType,
      isMobileDevice,
      isDesktopDevice,
      isMobile: deviceInfo.isMobile,
      isDesktop: deviceInfo.isDesktop,
      gameType: config.game_type,
      isMobileCompatible,
      isDesktopOnly,
      userAgent: deviceInfo.userAgent
    });
    
    // STRICT: Prevent mobile users from playing desktop-only games
    // Desktop users can play ALL games (mobile and desktop)
    if (isMobileDevice && isDesktopOnly) {
      setMessage({ 
        type: 'error', 
        text: '❌ BLOCKED: This game requires a desktop/laptop computer. Mobile devices cannot play desktop-only games. Please use a desktop device.' 
      });
      return;
    }
    
    // Desktop users can play any game - no restrictions
    // Mobile users are only blocked from desktop-only games (handled above)

    try {
      // Show warning before joining
      const confirmJoin = window.confirm(
        `⚠️ IMPORTANT WARNING:\n\n` +
        `You are about to pay ${config.entry_fee} tokens to join this game.\n\n` +
        `⚠️ DO NOT use the back button or leave the game page once you start!\n` +
        `Leaving will result in a ZERO score and you will lose your entry fee!\n\n` +
        `Do you want to continue?`
      );
      
      if (!confirmJoin) {
        console.log('❌ [Hot Sell] User cancelled join');
        return;
      }
      
      setJoiningSession(true);
      console.log('🎮 [Hot Sell] Joining session for config:', config.id);

      // Find active session for this config
      const session = sessions.find(s => s.config_id === config.id && s.status !== 'completed');
      
      if (!session) {
        setMessage({ type: 'error', text: 'No active session found' });
        return;
      }

      // Call join function (V2 - new approach) with session guard
      const { data, error, isSessionValid } = await executeRpcWithSession('hs_join_v2', {
        p_session: session.id,
        p_user: user.id,
        p_fee: config.entry_fee
      });

      console.log('📊 [Hot Sell] SQL response:', { data, error, isSessionValid });

      if (!isSessionValid) {
        setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
        return;
      }

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

      // Update score with session guard
      const { data, error, isSessionValid } = await executeRpcWithSession('update_hot_sell_score', {
        session_id_param: selectedGameFlow.sessionId,
        user_id_param: user.id,
        score_param: score,
        accuracy_param: accuracy
      });

      console.log('📊 [Hot Sell] Score save response:', { data, error, isSessionValid });

      if (!isSessionValid) {
        setMessage({ type: 'error', text: 'Your session has expired. Score not saved.' });
        return;
      }

      if (error) {
        console.error('❌ [Hot Sell] Error updating score:', error);
        setMessage({ type: 'error', text: `Game completed but there was an error saving your score: ${error.message}` });
        // Still refresh to keep UI in sync
        await loadSessions();
        await refreshTokens();
      } else {
        console.log('✅ [Hot Sell] Score recorded successfully:', data);
        
        // Show stats from returned data if available
        if (data?.stats) {
          console.log('📊 [Hot Sell] Updated stats from server:', data.stats);
          setMessage({ 
            type: 'success', 
            text: `Game completed! Your score: ${score.toFixed(2)} | Progress: ${data.stats.progress_percent}%` 
          });
        } else {
          setMessage({ type: 'success', text: `Game completed! Your score: ${score.toFixed(2)}` });
        }
        
        // IMMEDIATELY refresh sessions to show updated state (scoreboard, progress bar, lockout)
        console.log('🔄 [Hot Sell] Refreshing sessions immediately...');
        await loadSessions();
        await refreshTokens(); // Also refresh token balance
        
        // Check if we should trigger payout
        setTimeout(async () => {
          console.log('🔍 [Hot Sell] Checking for payout trigger...');
          const configId = selectedGameFlow.configId;
          
          // Re-fetch the session to check if ready
          const { data: checkSession } = await supabase
            .from('hot_sell_sessions')
            .select(`
              *,
              participants:hot_sell_participants(user_id, score)
            `)
            .eq('config_id', configId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (checkSession) {
            const config = configs.find(c => c.id === configId);
            if (!config) return;
            
            const isFull = checkSession.participants.length >= config.max_participants;
            const allHaveScores = checkSession.participants.every((p: any) => p.score !== null && p.score !== undefined);
            const notPaid = !checkSession.first_place_user_id;
            
            console.log('📊 [Hot Sell] Payout readiness check:', {
              configId,
              isFull,
              allHaveScores,
              notPaid,
              participantCount: checkSession.participants.length,
              maxParticipants: config.max_participants,
              scores: checkSession.participants.map((p: any) => p.score)
            });
            
            if (isFull && allHaveScores && notPaid) {
              console.log('✅ [Hot Sell] ALL CONDITIONS MET! Triggering payout...');
              await handleManualPayout(configId);
            } else {
              console.log('⏸️ [Hot Sell] Not ready for payout yet');
            }
          }
        }, 3000);
      }

      // Return to list view
      setCurrentView('list');
      setSelectedGameFlow(null);
      
      // Final refresh to ensure UI is in sync
      console.log('🔄 [Hot Sell] Final session refresh...');
      await loadSessions();

    } catch (error) {
      console.error('❌ [Hot Sell] Error recording score:', error);
      setMessage({ type: 'error', text: 'Game completed but there was an error saving your score.' });
      // Even on error, refresh to show current state
      await loadSessions();
      await refreshTokens();
    }

    // ALWAYS return to list view after game completes (even if there's an error)
    setCurrentView('list');
    setSelectedGameFlow(null);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleManualPayout = async (configId: string) => {
    try {
      console.log('💰 [Hot Sell] COMPLETE PAYOUT triggered for:', configId);
      
      // Call the all-in-one payout function with session guard
      const { data, error, isSessionValid } = await executeRpcWithSession('process_hot_sell_payout_complete', {
        config_id_param: configId
      });
      
      console.log('📊 [Hot Sell] Payout response:', { data, error, isSessionValid });
      
      // ALWAYS refresh regardless of response - payouts are working correctly
      console.log('🔄 [Hot Sell] Refreshing tokens and sessions...');
      await Promise.all([
        refreshTokens(),
        loadSessions()
      ]);
      
      // Clear the payout countdown timer for this config to hide the timer box
      setPayoutCountdown(prev => {
        const updated = { ...prev };
        delete updated[configId];
        return updated;
      });
      
      if (!isSessionValid) {
        console.warn('⚠️ [Hot Sell] Session invalid (but refreshing anyway)');
        // Don't show error - just refresh
        await loadSessions();
        return;
      }
      
      if (error) {
        console.warn('⚠️ [Hot Sell] Payout error response (but payout likely succeeded):', error);
        // Don't show error - payouts are working, just refresh
        await loadSessions();
        return;
      }
      
      if (!data || !data.success) {
        console.warn('⚠️ [Hot Sell] Payout not success (but payout likely succeeded):', data?.error);
        // Don't show error - payouts are working, just refresh
        await loadSessions();
        return;
      }
      
      console.log('✅ [Hot Sell] Payout confirmed successful!', data);
      
      // Silent success - don't show message since listing resets automatically
      // setMessage({ type: 'success', text: '🎉 Payout complete! Listing reset!' });
      
      // Force another refresh after 1 second
      setTimeout(() => {
        loadSessions();
      }, 1000);
      
    } catch (error) {
      console.warn('⚠️ [Hot Sell] Payout system error (but payout likely succeeded):', error);
      // Don't show error - payouts are working, just refresh
      await loadSessions();
      await refreshTokens();
    }
  };

  // Auto-payout with countdown timer
  useEffect(() => {
    if (!sessions.length || !user) return;

    const checkAndStartCountdown = async () => {
      for (const session of sessions) {
        const config = configs.find(c => c.id === session.config_id);
        if (!config) continue;

        // Skip if already paid out
        if (session.first_place_user_id) continue;

        // Check if session is full and all players have scores
        const isFull = session.participants.length >= config.max_participants;
        const allHaveScores = session.participants.every(p => p.score !== null && p.score !== undefined);
        
        if (isFull && allHaveScores) {
          // Start 30-second countdown if not already started
          if (!payoutCountdown[session.config_id]) {
            console.log('⏰ [Hot Sell] Starting 30-second countdown for:', session.config_id);
            setPayoutCountdown(prev => ({
              ...prev,
              [session.config_id]: 30
            }));
          }
        }
      }
    };

    checkAndStartCountdown();
  }, [sessions, user, configs]);

  // Countdown timer that triggers payout at zero
  useEffect(() => {
    const interval = setInterval(() => {
      setPayoutCountdown(prev => {
        const updated = { ...prev };
        let shouldPayout: string | null = null;

        Object.keys(updated).forEach(configId => {
          if (updated[configId] > 0) {
            updated[configId]--;
            
            // When countdown reaches 0, trigger payout and KEEP at 0 (don't remove)
            if (updated[configId] === 0) {
              console.log('🔔 [Hot Sell] COUNTDOWN COMPLETE! Triggering payout for:', configId);
              shouldPayout = configId;
              // Keep countdown at 0 to show "Processing..." state
            }
          }
        });

        // Trigger payout outside of setState
        if (shouldPayout) {
          handleManualPayout(shouldPayout);
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getProgressPercent = (participantsCount: number, maxParticipants: number) => {
    // Progress based on number of players joined, not pot amount
    return Math.min((participantsCount / maxParticipants) * 100, 100);
  };

  const calculatePrizes = (config: HotSellConfig, currentPot: number) => {
    // Calculate prizes based on FULL POOL (base_price), not current pot
    // This shows what prizes WILL BE when pool is full
    const fullPool = config.base_price;
    
    // Prize percentages (50% + 20% + 15% + 15% = 100%)
    const firstPlace = fullPool * 0.50;   // 50%
    const secondPlace = fullPool * 0.20;  // 20%
    const thirdPlace = fullPool * 0.15;   // 15%
    const platformFee = fullPool * 0.15;  // 15%
    
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

  // Get game display name and emoji
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
      case 'penny_passer': return { name: '🪙 Penny Passer', emoji: '🪙', video: null };
      default: return { name: type, emoji: '🎮', video: null };
    }
  };

  // Filter configs by device compatibility
  // Create a helper function that safely accesses the filter state
  const filterConfigsByDevice = useCallback((filterValue: 'all' | 'desktop' | 'mobile', configsList: HotSellConfig[] | undefined | null): HotSellConfig[] => {
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
  // Initialize with empty array to prevent undefined errors
  const deviceFilteredConfigs: HotSellConfig[] = useMemo((): HotSellConfig[] => {
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
      console.error('❌ [Hot Sell] Error filtering configs by device:', error);
      return [];
    }
  }, [configs, currentDeviceTypeFilter, filterConfigsByDevice]);
  
  // Safe reference for current device filter in JSX - use state directly
  const getCurrentDeviceFilter = useCallback((): 'all' | 'desktop' | 'mobile' => {
    return currentDeviceTypeFilter || 'all';
  }, [currentDeviceTypeFilter]);

  // Group configs by game type - ensure it's always an array
  const gameTypes = useMemo((): string[] => {
    try {
      if (!deviceFilteredConfigs || !Array.isArray(deviceFilteredConfigs)) {
        return [];
      }
      return Array.from(new Set(deviceFilteredConfigs.map(c => c?.game_type).filter(Boolean))) as string[];
    } catch (error) {
      console.error('❌ [Hot Sell] Error computing game types:', error);
      return [];
    }
  }, [deviceFilteredConfigs]);
  
  // Filter game types based on selection
  const filteredGameTypes = useMemo(() => {
    return selectedGame === 'all' 
      ? gameTypes 
      : gameTypes.filter(g => g === selectedGame);
  }, [gameTypes, selectedGame]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-800 via-red-800 to-orange-800 text-white">
        <CleanNavigation variant="gradient" currentPage="hot-sell" />
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
    
    // Get RNG seed: session seed > deterministic from session ID > config seed > fallback
    const session = sessions.find(s => s.id === selectedGameFlow.sessionId);
    const rngSeed = getRngSeedForSession(
      selectedGameFlow.sessionId,
      session?.rng_seed,
      gameConfig?.rng_seed
    );
    
    console.log('🎮 [Hot Sell] Starting game with RNG seed:', {
      sessionId: selectedGameFlow.sessionId,
      configId: selectedGameFlow.configId,
      gameType: selectedGameFlow.gameType,
      sessionSeed: session?.rng_seed,
      configSeed: gameConfig?.rng_seed,
      finalSeed: rngSeed
    });
    
    if (!rngSeed || rngSeed <= 0) {
      console.error('❌ [Hot Sell] Invalid RNG seed!', { session, gameConfig, rngSeed });
      setMessage({ type: 'error', text: 'Invalid game configuration. Please try again.' });
      setCurrentView('list');
      setSelectedGameFlow(null);
      return null;
    }
    
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-orange-800 via-red-800 to-orange-800 text-white">
          <CleanNavigation variant="gradient" currentPage="hot-sell" />
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
    <>
      {/* Location Verification Modal */}
      <LocationVerificationModal
        isOpen={showLocationModal}
        onLocationGranted={handleLocationGranted}
        onLocationDenied={handleLocationDenied}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white relative overflow-hidden">
        {/* Site Theme Overlay - Hell theme for Halloween, Fireplace for Christmas */}
        <PageThemeOverlay page="hot-sell" />
        
        {/* JavaScript-generated red stars - smooth scrolling like games/home page */}
        <div className="fixed inset-0 overflow-visible pointer-events-none" id="stars-container-red" style={{ zIndex: 15 }}>
          {/* Stars will be generated by useEffect */}
        </div>
        
        {/* Floating Red Particles - Like RP pages */}
        <div id="hot-sell-particles" className="fixed inset-0 pointer-events-none" style={{ zIndex: 5 }}></div>
        
        {/* Candle Flame Glow Effect - Large flame in dark room */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
          {/* Large central flame glow - candle effect */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[600px] h-[800px] bg-gradient-to-t from-red-600/60 via-red-500/40 to-red-400/20 rounded-full blur-3xl fire-flicker"></div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[500px] h-[700px] bg-gradient-to-t from-orange-500/50 via-orange-400/30 to-yellow-400/15 rounded-full blur-3xl fire-flicker-delay-1"></div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[400px] h-[600px] bg-gradient-to-t from-yellow-400/40 via-yellow-300/25 to-transparent rounded-full blur-2xl fire-flicker-delay-2"></div>
          
          {/* Ambient red glow around edges - candle lighting dark room */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-transparent via-red-950/20 to-black"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-red-900/30 via-red-950/15 to-transparent"></div>
        </div>
        
        {/* Subtle Flickering Fire Overlay - Very minimal for dark room effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" style={{ zIndex: 0 }}>
          {/* Very subtle fire layers - minimal opacity for dark room */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-1/2 bg-gradient-to-t from-red-900/15 via-red-950/8 to-transparent fire-flicker"></div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-1/3 bg-gradient-to-t from-orange-900/10 via-orange-950/5 to-transparent fire-flicker-delay-1"></div>
        </div>
      
      <CleanNavigation variant="gradient" currentPage="hot-sell" />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Wallet Display */}
        <PageWalletDisplay variant="hot-sell" />

        {/* Location Verification Banner */}
        {isAuthenticated && (
          <LocationBanner
            isLoading={locationLoading}
            location={improvedLocation}
            isVerified={locationVerified}
          />
        )}

        {/* Ad Banner */}
        <AdBanner pageLocation="hot-sell" position="top" />

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

        {/* Debug Info - Only show if authenticated */}
        {isAuthenticated && sessions.length === 0 && !isLoading && configs.length > 0 && (
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

        {/* Loading State */}
        {loadingConfigs && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400"></div>
            <p className="ml-4 text-yellow-300 text-xl font-semibold">Loading games...</p>
          </div>
        )}

        {/* Device Filter - Mobile/Desktop/All */}
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

        {/* Game Filter */}
        {!loadingConfigs && configs.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setSelectedGame('all')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                selectedGame === 'all'
                  ? 'bg-orange-500 text-white shadow-lg scale-105'
                  : 'bg-orange-800/50 text-orange-200 hover:bg-orange-700/50'
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
                      ? 'bg-orange-500 text-white shadow-lg scale-105'
                      : 'bg-orange-800/50 text-orange-200 hover:bg-orange-700/50'
                  }`}
                >
                  {gameInfo.emoji} {gameInfo.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Hot Sell Games - Organized by Game Type */}
        {!loadingConfigs && deviceFilteredConfigs.length > 0 && filteredGameTypes.map(gameType => {
          const gameConfigs = deviceFilteredConfigs.filter(c => c.game_type === gameType);
          if (gameConfigs.length === 0) return null;

          const gameInfo = getGameInfo(gameType);

            return (
              <div key={gameType} className="mb-12">
                {/* Game Type Header */}
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-yellow-300 flex items-center">
                    <span className="text-4xl mr-3">{gameInfo.emoji}</span>
                    {gameInfo.name}
                    <span className="ml-3 text-xl text-orange-300">({gameConfigs.length} Tiers)</span>
                  </h2>
                  <div className="mt-2 h-1 w-32 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
                </div>

                {/* Game Listings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {gameConfigs.map((config) => {
            const session = sessions.find(s => s.config_id === config.id);
            
            // When signed out, session will be null - show card anyway with "Sign In to Play"
            const hasJoined = session?.participants.some(p => p.user_id === user?.id) || false;
            const hasPlayed = session?.participants.some(p => p.user_id === user?.id && p.score !== null) || false;
            const isCompleted = session?.status === 'completed';
            const isFull = session ? session.participants_count >= config.max_participants : false;
            const progressPercent = session ? getProgressPercent(session.participants_count, config.max_participants) : 0;
            const prizes = calculatePrizes(config, session?.prize_pool || 0);

            // User's score
            const userParticipant = session?.participants.find(p => p.user_id === user?.id);
            const userScore = userParticipant?.score;

            // Top scores (hide if user hasn't joined)
            const topScores = session?.participants
              .filter(p => p.score !== null)
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .slice(0, 3) || [];

            return (
              <div key={config.id} className="bg-gradient-to-br from-orange-900/50 to-red-900/50 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30 shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
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

                {/* Payout Countdown Banner */}
                {payoutCountdown[config.id] !== undefined && (
                  <div className="mb-4 bg-gradient-to-r from-red-600 to-orange-600 border-2 border-red-400 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ClockIcon className="w-8 h-8 text-white animate-bounce mr-3" />
                        <div>
                          {payoutCountdown[config.id] > 0 ? (
                            <>
                              <p className="text-white font-black text-lg">⏰ PAYOUT IN:</p>
                              <p className="text-yellow-300 text-xs">Auto-payout when timer reaches zero</p>
                            </>
                          ) : (
                            <>
                              <p className="text-white font-black text-lg">💰 PROCESSING PAYOUT...</p>
                              <p className="text-yellow-300 text-xs">Please wait while winners are paid</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {payoutCountdown[config.id] > 0 ? (
                          <>
                            <p className="text-white font-black text-4xl">{payoutCountdown[config.id]}</p>
                            <p className="text-yellow-300 text-xs font-bold">SECONDS</p>
                          </>
                        ) : (
                          <div className="animate-spin text-white text-4xl">⏳</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Prize Pool Display with Breakdown */}
                <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                  <div className="text-center">
                    <p className="text-yellow-200 text-xs font-semibold mb-1 uppercase">Current Prize Pool</p>
                    <p className="text-3xl font-black text-yellow-300 mb-1">
                      {formatAmount(session?.prize_pool || 0)}
                    </p>
                    <p className="text-yellow-200/70 text-xs mb-3">
                      {session?.participants_count && session.participants_count > 0 
                        ? `${session.participants_count} player${session.participants_count !== 1 ? 's' : ''} joined` 
                        : 'Waiting for first player'}
                    </p>
                    
                    {/* Prize Breakdown - Based on actual current pool */}
                    <div className="bg-black/30 rounded-lg p-3 mb-2">
                      <div className="space-y-1.5 text-xs">
                        {/* 1st Place */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-yellow-400">🥇</span>
                            <span className="text-yellow-200">1st Place (50%)</span>
                          </div>
                          <span className="font-bold text-yellow-300">
                            {formatAmount((session?.prize_pool || 0) * 0.50)}
                          </span>
                        </div>
                        
                        {/* 2nd Place */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-300">🥈</span>
                            <span className="text-yellow-200">2nd Place (20%)</span>
                          </div>
                          <span className="font-bold text-yellow-300">
                            {formatAmount((session?.prize_pool || 0) * 0.20)}
                          </span>
                        </div>
                        
                        {/* 3rd Place */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-orange-400">🥉</span>
                            <span className="text-yellow-200">3rd Place (15%)</span>
                          </div>
                          <span className="font-bold text-yellow-300">
                            {formatAmount((session?.prize_pool || 0) * 0.15)}
                          </span>
                        </div>
                        
                        {/* Platform Fee */}
                        <div className="flex justify-between items-center pt-1.5 border-t border-yellow-500/30">
                          <span className="text-red-300 text-[10px]">Platform Fee (-15%)</span>
                          <span className="font-bold text-red-300">
                            -{formatAmount((session?.prize_pool || 0) * 0.15)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Entry Fee Info */}
                    <div className="text-xs text-yellow-200/80">
                      <div className="flex justify-between items-center">
                        <span>Entry Fee:</span>
                        <span className="font-bold text-green-300">+{formatAmount(config.entry_fee)} per player</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar - YELLOW THEME */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-orange-300 mb-2">
                    <span>{session?.participants_count || 0} / {config.max_participants} Players</span>
                    <span>{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-yellow-500/30">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out shadow-lg shadow-yellow-500/50"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Dropdown Scoreboard (only show if user has PLAYED - submitted a score) */}
                {hasPlayed && session && session.participants.filter(p => p.score !== null).length > 0 && (
                  <div className="mb-4">
                    {/* Dropdown Toggle Button */}
                    <button
                      onClick={() => setExpandedScoreboards(prev => ({
                        ...prev,
                        [config.id]: !prev[config.id]
                      }))}
                      className="w-full p-3 bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/50 hover:to-blue-600/50 rounded-xl border border-purple-500/50 transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        <span className="text-sm font-semibold text-purple-200">View Scoreboard</span>
                        <span className="text-xs text-purple-300">
                          ({session.participants.filter(p => p.score !== null).length} players)
                        </span>
                      </div>
                      <span className="text-lg text-purple-300">
                        {expandedScoreboards[config.id] ? '▲' : '▼'}
                      </span>
                    </button>
                    
                    {/* Expanded Scoreboard */}
                    {expandedScoreboards[config.id] && (
                      <div className="mt-2 p-4 bg-black/40 rounded-xl border border-purple-500/30 space-y-2">
                        <h4 className="text-xs font-bold text-purple-300 mb-3 uppercase flex items-center gap-2">
                          <span>🏆</span>
                          <span>All Competitors</span>
                        </h4>
                        {session.participants
                          .filter(p => p.score !== null)
                          .sort((a, b) => (b.score || 0) - (a.score || 0))
                          .map((p, idx) => {
                            const isCurrentUser = p.user_id === user?.id;
                            const displayName = isCurrentUser ? 'You' : (p.username || `Anonymous Player`);
                            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
                            
                            return (
                              <div 
                                key={p.id} 
                                className={`flex justify-between items-center p-2 rounded-lg ${
                                  isCurrentUser 
                                    ? 'bg-blue-500/20 border border-blue-500/50' 
                                    : 'bg-gray-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-xs font-mono w-6">
                                    #{idx + 1}
                                  </span>
                                  {medal && <span className="text-lg">{medal}</span>}
                                  <span className={`text-sm ${
                                    isCurrentUser ? "text-blue-300 font-bold" : "text-gray-300"
                                  }`}>
                                    {displayName}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className={`text-sm font-bold ${
                                  isCurrentUser ? "text-blue-400" : "text-yellow-400"
                                }`}>
                                  {p.score?.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
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

                {/* Payout Countdown - Shows when session is full and all have played */}
                {isFull && session && session.participants.every(p => p.score !== null) && !session.first_place_user_id && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/50 animate-pulse">
                    <div className="flex items-center justify-center">
                      <ClockIcon className="w-5 h-5 text-green-400 mr-2 animate-spin" />
                      <span className="text-green-300 font-bold text-sm">
                        💰 Payout processing... Winners will be announced shortly!
                      </span>
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
                      className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
            );
        })}
      </div>
    </div>
    </>
  );
}
