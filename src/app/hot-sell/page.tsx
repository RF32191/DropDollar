'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { supabase } from '@/lib/supabase/client';
import { TournamentService, HotSellListing, HotSellParticipant } from '@/lib/supabase/tournamentService';
import { FixedGamesService, FixedGameConfig, HotSellSession, PrizeEligibility, FixedGameParticipant } from '@/lib/supabase/fixedGamesService';
import { UserService } from '@/lib/supabase/userService';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { BlindScoreboardService, BlindListing } from '@/lib/supabase/blindScoreboardService';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
import BlindScoreboard from '@/components/games/BlindScoreboard';
import HotSellGame from '@/components/games/HotSellGame';
import HotSellScoreboard from '@/components/games/HotSellScoreboard';
import ErrorBoundary from '@/components/ErrorBoundary';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { 
  FireIcon, 
  TrophyIcon, 
  BanknotesIcon, 
  UsersIcon,
  ClockIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  PlayIcon,
  BoltIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

export default function HotSellPage() {
  const { user, isAuthenticated } = useAuth();
  const { tokenBalance: userTokens, isLoading: tokensLoading, refreshTokens } = useTokenSync();
  
  const [hotSellListings, setHotSellListings] = useState<HotSellListing[]>([]);
  const [participants, setParticipants] = useState<{ [listingId: string]: HotSellParticipant[] }>({});
  const [sessionParticipants, setSessionParticipants] = useState<{ [sessionId: string]: FixedGameParticipant[] }>({});
  const [fixedGameConfigs, setFixedGameConfigs] = useState<FixedGameConfig[]>([]);
  const [hotSellSessions, setHotSellSessions] = useState<HotSellSession[]>([]);
  const [userParticipations, setUserParticipations] = useState<string[]>([]);
  const [blindListings, setBlindListings] = useState<BlindListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentView, setCurrentView] = useState<'listings' | 'game' | 'scoreboard'>('listings');
  const [selectedGameFlow, setSelectedGameFlow] = useState<{
    gameType: string;
    sessionId: string;
    configId: string;
    entryFee?: number;
  } | null>(null);
  const [selectedListing, setSelectedListing] = useState<HotSellListing | null>(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [prizeEligibility, setPrizeEligibility] = useState<PrizeEligibility | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{ [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean; hours?: number; isBasePriceMet?: boolean; canJoin?: boolean; isTimerActive?: boolean; basePrice?: number; currentPot?: number; } }>({});
  const [joiningSession, setJoiningSession] = useState<string | null>(null);
  const [joiningListing, setJoiningListing] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadHotSellData();
      checkUserEligibility();
    }
  }, [isAuthenticated, user?.id]);

  const loadHotSellData = async () => {
    try {
      setIsLoading(true);
      
      // Load hot sell listings
      const listings = await TournamentService.getHotSellListings();
      setHotSellListings(listings);
      
      // Load participants for each listing
      const participantsData: { [listingId: string]: HotSellParticipant[] } = {};
      for (const listing of listings) {
        const listingParticipants = await TournamentService.getHotSellParticipants(listing.id);
        participantsData[listing.id] = listingParticipants;
      }
      setParticipants(participantsData);
      
      // Load fixed game configs (only hot_sell type)
      const configs = await FixedGamesService.getFixedGameConfigs();
      const hotSellConfigs = configs.filter(config => config.tournament_type === 'hot_sell');
      setFixedGameConfigs(hotSellConfigs);
      
      // Load hot sell sessions
      const sessions = await FixedGamesService.getHotSellSessions();
      setHotSellSessions(sessions);
      
      // Load participants for each session
      const sessionParticipantsData: { [sessionId: string]: FixedGameParticipant[] } = {};
      for (const session of sessions) {
        const sessionParticipants = await FixedGamesService.getHotSellSessionParticipants(session.id);
        sessionParticipantsData[session.id] = sessionParticipants;
      }
      setSessionParticipants(sessionParticipantsData);
      
      // Load blind listings
      const blindListings = await BlindScoreboardService.getBlindListings();
      setBlindListings(blindListings);
      
    } catch (error) {
      console.error('❌ [HotSell] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserEligibility = async () => {
    if (!user) return;
    
    try {
      const eligibility = await FixedGamesService.checkPrizeEligibility(user.id, 100);
      setPrizeEligibility(eligibility);
    } catch (error) {
      console.error('❌ [HotSell] Error checking eligibility:', error);
    }
  };

  const updateTimers = () => {
    if (hotSellSessions.length === 0) return;
    
    const newTimeRemaining: { [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean; hours?: number; isBasePriceMet?: boolean; canJoin?: boolean; isTimerActive?: boolean; basePrice?: number; currentPot?: number; } } = {};
    
    hotSellSessions.forEach(session => {
      const config = fixedGameConfigs.find(c => c.id === session.config_id);
      const isHotSell = session.status === 'active' && session.timer_started_at;
      
      if (isHotSell && session.timer_started_at) {
        const elapsed = Math.floor((Date.now() - new Date(session.timer_started_at).getTime()) / 1000);
        const timeRemaining = Math.max(0, 1800 - elapsed); // 30 minutes = 1800 seconds
        
        newTimeRemaining[session.id] = {
          hours: Math.floor(timeRemaining / 3600),
          minutes: Math.floor((timeRemaining % 3600) / 60),
          seconds: timeRemaining % 60,
          isHotSell: true
        };
      } else {
        newTimeRemaining[session.id] = {
          hours: 0,
          minutes: 0, 
          seconds: 0, 
          isHotSell: false 
        };
      }
    });
    
    const hasChanges = JSON.stringify(newTimeRemaining) !== JSON.stringify(timeRemaining);
    if (hasChanges) {
      setTimeRemaining(newTimeRemaining);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      updateTimers();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const joinHotSellSession = async (session: HotSellSession, config: FixedGameConfig) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    setJoiningSession(session.id);
    
    try {
      // Location verification for legal compliance
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      console.log('Location verified:', position.coords);
      setLocationVerified(true);

      // Check if user already joined
      const hasJoined = sessionParticipants[session.id]?.some(
        p => p.user_id === user.id
      );
      
      if (hasJoined) {
        setMessage({ type: 'error', text: 'You have already joined this tournament!' });
        return;
      }

      // Join the session
      const { data: joinResult, error: joinError } = await supabase
        .rpc('join_hot_sell_session', { session_id_param: session.id });
      
      if (joinError) {
        console.error('❌ [HotSell] Error joining session:', joinError);
        setMessage({ type: 'error', text: 'Failed to join session. Please try again.' });
        return;
      }
      
      console.log('✅ [HotSell] Successfully joined session:', joinResult);

      // Deduct token from user's wallet
      const { error: deductError } = await supabase
        .from('token_transactions')
        .insert({
          user_id: user.id,
          amount: -config.entry_fee,
          transaction_type: 'tournament_entry',
          description: `Hot Sell tournament entry - ${session.id}`,
          metadata: { session_id: session.id, config_id: config.id }
        });

      if (deductError) {
        console.error('❌ [HotSell] Error deducting token:', deductError);
        setMessage({ type: 'error', text: 'Failed to deduct token. Please try again.' });
        return;
      }

      // Refresh token balance
      refreshTokens();

      // Start the game
      setSelectedGameFlow({
        gameType: config.game_type,
        sessionId: session.id,
        configId: config.id,
        entryFee: config.entry_fee
      });
      setCurrentView('game');

      setMessage({ type: 'success', text: 'Successfully joined tournament!' });
      
      // Refresh data
      await loadHotSellData();
      
    } catch (error) {
      console.error('❌ [HotSell] Error joining session:', error);
      if (error instanceof GeolocationPositionError) {
        setMessage({ type: 'error', text: 'Location verification required to join tournaments' });
      } else {
        setMessage({ type: 'error', text: 'Failed to join tournament. Please try again.' });
      }
    } finally {
      setJoiningSession(null);
    }
  };

  const joinHotSellListing = async (listing: HotSellListing) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    setJoiningListing(listing.id);
    
    try {
      // Location verification for legal compliance
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      console.log('Location verified:', position.coords);
      setLocationVerified(true);

      // Check if user already joined
      const hasJoined = participants[listing.id]?.some(
        p => p.user_id === user.id
      );
      
      if (hasJoined) {
        setMessage({ type: 'error', text: 'You have already joined this tournament!' });
        return;
      }

      // Join the listing
      const { error: joinError } = await supabase
        .from('hot_sell_participants')
        .insert({
          listing_id: listing.id,
          user_id: user.id,
          joined_at: new Date().toISOString()
        });

      if (joinError) {
        console.error('❌ [HotSell] Error joining listing:', joinError);
        setMessage({ type: 'error', text: 'Failed to join tournament. Please try again.' });
        return;
      }

      // Deduct token from user's wallet
      const { error: deductError } = await supabase
        .from('token_transactions')
        .insert({
          user_id: user.id,
          amount: -listing.entry_fee,
          transaction_type: 'tournament_entry',
          description: `Hot Sell tournament entry - ${listing.id}`,
          metadata: { listing_id: listing.id }
        });

      if (deductError) {
        console.error('❌ [HotSell] Error deducting token:', deductError);
        setMessage({ type: 'error', text: 'Failed to deduct token. Please try again.' });
        return;
      }

      // Refresh token balance
      refreshTokens();

      setMessage({ type: 'success', text: 'Successfully joined tournament!' });
      
      // Refresh data
      await loadHotSellData();
      
    } catch (error) {
      console.error('❌ [HotSell] Error joining listing:', error);
      if (error instanceof GeolocationPositionError) {
        setMessage({ type: 'error', text: 'Location verification required to join tournaments' });
      } else {
        setMessage({ type: 'error', text: 'Failed to join tournament. Please try again.' });
      }
    } finally {
      setJoiningListing(null);
    }
  };

  const startGame = (listing: HotSellListing) => {
    setSelectedListing(listing);
    setCurrentView('game');
    setLocationVerified(false);
  };

  const viewScoreboard = (listing: HotSellListing) => {
    setSelectedListing(listing);
    setCurrentView('scoreboard');
  };

  const handleGameComplete = async (score: number, accuracy: number) => {
    if (!user || !selectedListing) return;

    try {
      // Save game result
      await SimpleGameService.saveGameResult({
        user_id: user.id,
        game_type: 'hot_sell',
        score: score,
        accuracy: accuracy,
        session_id: selectedListing.id,
        metadata: { listing_id: selectedListing.id }
      });

      setMessage({ type: 'success', text: 'Game completed! Score saved to your dashboard.' });
      
      // Return to listings after a delay
      setTimeout(() => {
        setCurrentView('listings');
        setSelectedListing(null);
        setLocationVerified(false);
      }, 2000);
      
    } catch (error) {
      console.error('❌ [HotSell] Error saving game result:', error);
    }
  };

  const handleLocationVerified = () => {
    setLocationVerified(true);
  };

  const backToListings = () => {
    setCurrentView('listings');
    setSelectedListing(null);
    setLocationVerified(false);
  };

  const hasUserJoined = (competitionId: string) => {
    if (!user?.id) return false;
    
    if (participants[competitionId]) {
      const hasJoined = participants[competitionId].some(p => p.user_id === user.id);
      console.log(`🔍 [HotSell] Checking if user ${user.id} joined ${competitionId}:`, hasJoined, participants);
      return hasJoined;
    }
    
    return false;
  };

  const addUserParticipation = (competitionId: string) => {
    setUserParticipations(prev => [...prev, competitionId]);
  };

  const refreshParticipantsData = async () => {
    if (!hotSellSessions.length) return;
    
    try {
      const participantsData: { [sessionId: string]: FixedGameParticipant[] } = {};
      
      for (const session of hotSellSessions) {
        const sessionParticipants = await FixedGamesService.getHotSellSessionParticipants(session.id);
        participantsData[session.id] = sessionParticipants;
      }
      
      setSessionParticipants(participantsData);
      console.log('✅ Participants data refreshed');
    } catch (error) {
      console.error('❌ Error refreshing participants data:', error);
    }
  };

  const handleGameCompletion = async (score: number, accuracy: number) => {
    if (!user || !selectedGameFlow?.entryFee) return;
    
    try {
      // Save game result
      await SimpleGameService.saveGameResult({
        user_id: user.id,
        game_type: selectedGameFlow.gameType,
        score: score,
        accuracy: accuracy,
        session_id: selectedGameFlow.sessionId,
        metadata: { 
          config_id: selectedGameFlow.configId,
          entry_fee: selectedGameFlow.entryFee
        }
      });

      console.log('🎉 [HotSell] ✅✅✅ SCORE SAVED SUCCESSFULLY TO YOUR DASHBOARD! ✅✅✅');
      
    } catch (error) {
      console.error('❌ Error in game completion:', error);
    }
  };

  const formatPrizeAmount = (amount: number) => {
    const showDecimals = amount < 10;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    }).format(amount);
  };

  const calculateTournamentPayouts = (config: FixedGameConfig) => {
    const title = config.title || '';
    
    // Extract prize amount from title
    const prizeMatch = title.match(/\$(\d+(?:\.\d+)?)/);
    if (!prizeMatch) {
      console.warn('Could not extract prize amount from title:', title);
      return null;
    }
    
    const prizeAmount = parseFloat(prizeMatch[1]);
    
    // Calculate payouts based on prize amount
    let payouts;
    
    if (prizeAmount <= 2) {
      // $2 tournament: 1st gets $1.70, 2nd gets $0, platform fee $0.30
      payouts = {
        first: 1.70,
        second: 0,
        third: 0,
        platformFee: 0.30,
        maxPlayers: 2
      };
    } else if (prizeAmount <= 3) {
      // $3 tournament: 1st gets $2.55, 2nd gets $0, platform fee $0.45
      payouts = {
        first: 2.55,
        second: 0,
        third: 0,
        platformFee: 0.45,
        maxPlayers: 3
      };
    } else if (prizeAmount <= 10) {
      // $10 tournament: 1st gets $8.50, 2nd gets $0, platform fee $1.50
      payouts = {
        first: 8.50,
        second: 0,
        third: 0,
        platformFee: 1.50,
        maxPlayers: 10
      };
    } else if (prizeAmount <= 50) {
      // $50 tournament: 1st gets $42.50, 2nd gets $0, platform fee $7.50
      payouts = {
        first: 42.50,
        second: 0,
        third: 0,
        platformFee: 7.50,
        maxPlayers: 50
      };
    } else if (prizeAmount <= 100) {
      // $100 tournament: 1st gets $85, 2nd gets $0, platform fee $15
      payouts = {
        first: 85,
        second: 0,
        third: 0,
        platformFee: 15,
        maxPlayers: 100
      };
    } else if (prizeAmount <= 250) {
      // $250 tournament: 1st gets $212.50, 2nd gets $0, platform fee $37.50
      payouts = {
        first: 212.50,
        second: 0,
        third: 0,
        platformFee: 37.50,
        maxPlayers: 250
      };
    } else if (prizeAmount <= 500) {
      // $500 tournament: 1st gets $425, 2nd gets $0, platform fee $75
      payouts = {
        first: 425,
        second: 0,
        third: 0,
        platformFee: 75,
        maxPlayers: 500
      };
    } else if (prizeAmount <= 1000) {
      // $1000 tournament: 1st gets $850, 2nd gets $0, platform fee $150
      payouts = {
        first: 850,
        second: 0,
        third: 0,
        platformFee: 150,
        maxPlayers: 1000
      };
    } else if (prizeAmount <= 2500) {
      // $2500 tournament: 1st gets $2125, 2nd gets $0, platform fee $375
      payouts = {
        first: 2125,
        second: 0,
        third: 0,
        platformFee: 375,
        maxPlayers: 2500
      };
    } else {
      console.warn('Unsupported prize amount:', prizeAmount);
      return null;
    }
    
    return {
      ...payouts,
      totalPrize: prizeAmount,
      entryFee: 1,
      playersNeeded: payouts.maxPlayers
    };
  };

  const adjustEntryFee = (config: FixedGameConfig) => {
    return {
      ...config,
      entry_fee: 1 // Always 1 token = $1
    };
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

  const formatTimeRemaining = (minutes: number, seconds: number): string => {
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg">Loading hot sell tournaments...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render game flow view
  if (currentView === 'game' && selectedGameFlow) {
    const gameConfig = fixedGameConfigs.find(config => config.id === selectedGameFlow.configId);
    const rngSeed = gameConfig?.rng_seed || 1;
    
    return (
      <ErrorBoundary>
        <CompetitionGameFlow
          gameType={selectedGameFlow.gameType}
          sessionId={selectedGameFlow.sessionId}
          configId={selectedGameFlow.configId}
          rngSeed={rngSeed}
          onComplete={(score, accuracy) => {
            console.log('Game completed:', { score, accuracy });
            handleGameCompletion(score, accuracy);
            setCurrentView('listings');
            setSelectedGameFlow(null);
          }}
          onCancel={() => {
            setCurrentView('listings');
            setSelectedGameFlow(null);
          }}
        />
      </ErrorBoundary>
    );
  }

  // Render legacy game view
  if (currentView === 'game' && selectedListing) {
    return (
      <HotSellGame
        listing={selectedListing}
        onGameComplete={handleGameComplete}
        onLocationVerified={handleLocationVerified}
      />
    );
  }

  // Render scoreboard view
  if (currentView === 'scoreboard' && selectedListing) {
    return (
      <HotSellScoreboard listing={selectedListing} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <FireIcon className="w-12 h-12 text-red-500 mr-4 animate-pulse" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              HOT SELL
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">Massive Cash Prize Tournaments</p>
          <p className="text-lg text-gray-400">Compete for huge payouts with real money prizes</p>
          
          {/* User Token Balance */}
          {isAuthenticated && (
            <div className="mt-6 inline-flex items-center bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/20">
              <BanknotesIcon className="w-6 h-6 text-yellow-400 mr-3" />
              <span className="text-lg font-semibold">Your Tokens: {userTokens}</span>
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

        {/* Prize Eligibility Warning */}
        {prizeEligibility && !prizeEligibility.eligible && (
          <div className="mb-6 p-4 rounded-xl border border-yellow-500/50 bg-yellow-500/20 text-yellow-300">
            <div className="flex items-center">
              {prizeEligibility.eligible ? (
                <CheckCircleIcon className="w-5 h-5 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              )}
              <span className="text-sm">{prizeEligibility.reason}</span>
            </div>
          </div>
        )}

        {/* Hot Sell Games */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">🔥 HOT SELL GAMES</h2>
            <p className="text-lg text-gray-300">1 token entry tournaments with massive payouts</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {fixedGameConfigs.map((config) => {
              const adjustedConfig = adjustEntryFee(config);
              const session = hotSellSessions.find(s => s.config_id === config.id);
              const timer = session ? timeRemaining[session.id] : null;
              const prizeDistribution = calculateTournamentPayouts(adjustedConfig);
              const isHotSell = timer?.isHotSell || false;
              const canJoin = userTokens >= adjustedConfig.entry_fee;
              
              if (!prizeDistribution) {
                console.warn('Skipping config due to payout calculation failure:', adjustedConfig.title);
                return null;
              }
              
              return (
                <div key={config.id} className={`bg-white/10 backdrop-blur-xl rounded-3xl p-6 border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  isHotSell ? 'border-red-500/50 bg-red-500/10' : 'border-white/20 hover:bg-white/15'
                }`}>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">{getGameIcon(config.game_type)}</span>
                        <h3 className="text-xl font-bold text-white">{adjustedConfig.title}</h3>
                      </div>
                      <div className={`flex items-center rounded-full px-3 py-1 ${
                        isHotSell ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {isHotSell ? (
                          <>
                            <FireIcon className="w-4 h-4 mr-1" />
                            <span className="text-xs font-semibold">HOT SELL</span>
                          </>
                        ) : (
                          <>
                            <ClockIcon className="w-4 h-4 mr-1" />
                            <span className="text-xs font-semibold">WAITING</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-300 mb-4">{adjustedConfig.description}</p>
                    
                    {/* Prize Pool */}
                    <div className={`rounded-2xl p-4 mb-4 ${
                      isHotSell ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}>
                      <div className="text-center">
                        <p className={`text-sm font-medium mb-1 ${
                          isHotSell ? 'text-red-100' : 'text-blue-100'
                        }`}>PRIZE POOL</p>
                        <p className="text-2xl font-bold text-white">{formatPrizeAmount(prizeDistribution.totalPrize)}</p>
                        {session && (
                          <p className={`text-xs mt-1 ${
                            isHotSell ? 'text-red-100' : 'text-blue-100'
                          }`}>
                            Current Pot: {formatPrizeAmount(session.current_pot)} ({session.participants_count} players)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Timer Display */}
                    {timer && (
                      <div className="mb-4">
                        <div className={`text-center p-3 rounded-xl ${
                          isHotSell ? 'bg-red-500/20 border border-red-500/50' : 'bg-blue-500/20 border border-blue-500/50'
                        }`}>
                          <div className="flex items-center justify-center mb-2">
                            <ClockIcon className="w-4 h-4 mr-2" />
                            <span className="text-sm font-semibold">
                              {isHotSell ? 'HOT SELL MODE!' : 'Waiting for Base Price'}
                            </span>
                          </div>
                          <p className={`text-lg font-bold ${
                            isHotSell ? 'text-red-300' : 'text-blue-300'
                          }`}>
                            {isHotSell ? formatTimeRemaining(timer.minutes, timer.seconds) : `Need ${prizeDistribution.playersNeeded} more players`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Prize Distribution */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                        <TrophyIcon className="w-4 h-4 mr-2" />
                        Prize Distribution
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
                              <span className="text-white font-bold text-xs">1</span>
                            </div>
                            <span className="text-white text-sm">1st Place</span>
                          </div>
                          <span className="text-yellow-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.first)}</span>
                        </div>
                        <div className="flex items-center justify-between bg-red-500/20 rounded-lg p-2 border border-red-500/30">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                              <span className="text-white font-bold text-xs">📊</span>
                            </div>
                            <span className="text-red-300 text-sm">Platform Fee (15%)</span>
                          </div>
                          <span className="text-red-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.platformFee)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-300 mb-2">
                        <span>Progress to Base Price</span>
                        <span>{session?.participants_count || 0} / {prizeDistribution.playersNeeded} players</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-500" 
                          style={{ 
                            width: `${Math.min(100, ((session?.participants_count || 0) / prizeDistribution.playersNeeded) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Base Price: {prizeDistribution.playersNeeded} players</span>
                        <span>Current: {session?.participants_count || 0} players</span>
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
                        <span>Entry Fee:</span>
                        <span className="text-green-400 font-bold">{adjustedConfig.entry_fee} token</span>
                      </div>
                    </div>

                    {/* Live Scoreboard */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                        <TrophyIcon className="w-5 h-5 mr-2 text-yellow-400" /> Live Scoreboard
                      </h4>
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
                            {sessionParticipants[session?.id] && sessionParticipants[session.id].length > 0 ? (
                              <div className="space-y-2">
                                {sessionParticipants[session.id]
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

                    {/* Join Button */}
                    <div className="space-y-3">
                      {!isAuthenticated ? (
                        <div className="bg-gray-600 rounded-xl p-3 text-center">
                          <p className="text-gray-300 text-sm">Please log in to join tournaments</p>
                        </div>
                      ) : !canJoin ? (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center">
                          <p className="text-red-300 text-sm">You need {adjustedConfig.entry_fee} token to join</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => session ? joinHotSellSession(session, config) : null}
                          disabled={joiningSession === session?.id}
                          className={`w-full py-3 px-6 rounded-2xl font-bold text-white transition-all duration-300 ${
                            joiningSession === session?.id
                              ? 'bg-gray-600 cursor-not-allowed opacity-50'
                              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {joiningSession === session?.id ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Joining...
                            </div>
                          ) : (
                            `🔒 JOIN FOR ${adjustedConfig.entry_fee} TOKEN`
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

        {/* Hot Sell Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {hotSellListings.map((listing) => {
            const listingParticipants = participants[listing.id] || [];
            const prizeDistribution = calculateTournamentPayouts({ title: listing.title, prize_pool: listing.prize_pool } as FixedGameConfig);
            const isJoined = listingParticipants.some(p => p.user_id === user?.id);
            const canJoin = userTokens >= listing.entry_fee && !isJoined && listingParticipants.length < listing.max_participants;
            
            if (!prizeDistribution) {
              console.warn('Skipping listing due to payout calculation failure:', listing.title);
              return null;
            }
            
            return (
              <div key={listing.id} className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">🔥</span>
                      <h3 className="text-xl font-bold text-white">{listing.title}</h3>
                    </div>
                    <div className="flex items-center rounded-full px-3 py-1 bg-red-500/20 text-red-300">
                      <FireIcon className="w-4 h-4 mr-1" />
                      <span className="text-xs font-semibold">HOT SELL</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{listing.description}</p>
                  
                  {/* Prize Pool */}
                  <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-red-500 to-orange-500">
                    <div className="text-center">
                      <p className="text-red-100 text-sm font-medium mb-1">PRIZE POOL</p>
                      <p className="text-2xl font-bold text-white">{formatPrizeAmount(listing.prize_pool)}</p>
                    </div>
                  </div>

                  {/* Prize Distribution */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                      <TrophyIcon className="w-4 h-4 mr-2" />
                      Prize Distribution
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
                            <span className="text-white font-bold text-xs">1</span>
                          </div>
                          <span className="text-white text-sm">1st Place</span>
                        </div>
                        <span className="text-yellow-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.first)}</span>
                      </div>
                      <div className="flex items-center justify-between bg-red-500/20 rounded-lg p-2 border border-red-500/30">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                            <span className="text-white font-bold text-xs">📊</span>
                          </div>
                          <span className="text-red-300 text-sm">Platform Fee (15%)</span>
                        </div>
                        <span className="text-red-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.platformFee)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Game Info */}
                  <div className="space-y-2 text-sm text-gray-300 mb-6">
                    <div className="flex justify-between">
                      <span>Game Type:</span>
                      <span className="text-white font-medium">{getGameIcon(listing.game_type)} {listing.game_type.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="text-white font-medium">{listing.game_duration}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Entry Fee:</span>
                      <span className="text-green-400 font-bold">{listing.entry_fee} tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Participants:</span>
                      <span className="text-white font-semibold">{listingParticipants.length}/{listing.max_participants}</span>
                    </div>
                  </div>

                  {/* Progress Bar for Original Hot Sell Listings */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span>Participants Progress</span>
                      <span>{listingParticipants.length} / {listing.max_participants} players</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all duration-300 bg-gradient-to-r from-yellow-500 to-orange-500" 
                        style={{ 
                          width: `${Math.min(100, (listingParticipants.length / listing.max_participants) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Target: {listing.max_participants} players</span>
                      <span>Current: {listingParticipants.length} players</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {!isAuthenticated ? (
                      <div className="bg-gray-600 rounded-xl p-3 text-center">
                        <p className="text-gray-300 text-sm">Please log in to join tournaments</p>
                      </div>
                    ) : isJoined ? (
                      <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 text-center">
                        <p className="text-green-300 text-sm">You have joined this tournament!</p>
                      </div>
                    ) : !canJoin ? (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center">
                        <p className="text-red-300 text-sm">You need {listing.entry_fee} tokens to join</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => joinHotSellListing(listing)}
                          disabled={joiningListing === listing.id}
                          className={`w-full py-3 px-6 rounded-2xl font-bold text-white transition-all duration-300 ${
                            joiningListing === listing.id
                              ? 'bg-gray-600 cursor-not-allowed opacity-50'
                              : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 hover:scale-105 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {joiningListing === listing.id ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Joining...
                            </div>
                          ) : (
                            `🔒 JOIN TOURNAMENT - ${listing.entry_fee} TOKENS`
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Tournament Button */}
        {isAuthenticated && (
          <div className="mt-12 text-center">
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
              <div className="flex items-center">
                <TrophyIcon className="w-6 h-6 mr-2" />
                Create Your Own Tournament
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}