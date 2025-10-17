'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TournamentService, HotSellListing, HotSellParticipant } from '@/lib/supabase/tournamentService';
import { FixedGamesService, FixedGameConfig, HotSellSession, PrizeEligibility } from '@/lib/supabase/fixedGamesService';
import { UserService } from '@/lib/supabase/userService';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
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
  const [hotSellListings, setHotSellListings] = useState<HotSellListing[]>([]);
  const [participants, setParticipants] = useState<{ [listingId: string]: HotSellParticipant[] }>({});
  const [fixedGameConfigs, setFixedGameConfigs] = useState<FixedGameConfig[]>([]);
  const [hotSellSessions, setHotSellSessions] = useState<HotSellSession[]>([]);
  const [userParticipations, setUserParticipations] = useState<string[]>([]);
  const [userTokens, setUserTokens] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningListing, setJoiningListing] = useState<string | null>(null);
  const [joiningSession, setJoiningSession] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentView, setCurrentView] = useState<'listings' | 'game' | 'scoreboard'>('listings');
  const [selectedGameFlow, setSelectedGameFlow] = useState<{
    gameType: string;
    sessionId: string;
    configId: string;
  } | null>(null);
  const [selectedListing, setSelectedListing] = useState<HotSellListing | null>(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [prizeEligibility, setPrizeEligibility] = useState<PrizeEligibility | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{ [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean } }>({});

  useEffect(() => {
    if (isAuthenticated && user) {
      loadHotSellData();
      checkUserEligibility();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Update timers every second
    const timer = setInterval(() => {
      updateTimers();
    }, 1000);

    return () => clearInterval(timer);
  }, [hotSellSessions]);

  const loadHotSellData = async () => {
    try {
      setIsLoading(true);
      
      // Load hot sell listings
      const listings = await TournamentService.getActiveHotSellListings();
      setHotSellListings(listings);
      
      // Load participants for each listing
      const participantsData: { [listingId: string]: HotSellParticipant[] } = {};
      for (const listing of listings) {
        const listingParticipants = await TournamentService.getHotSellParticipants(listing.id);
        participantsData[listing.id] = listingParticipants;
      }
      setParticipants(participantsData);
      
      // Load fixed game configs for hot sell
      const configs = await FixedGamesService.getFixedGameConfigs('hot_sell');
      setFixedGameConfigs(configs);
      
      // Load hot sell sessions
      const sessions = await FixedGamesService.getHotSellSessions();
      setHotSellSessions(sessions);
      
      // Load user tokens
      if (user) {
        const profile = await UserService.getUserProfile(user.id);
        setUserTokens(profile?.tokens || 0);
      }
      
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
    const newTimeRemaining: { [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean } } = {};
    
    hotSellSessions.forEach(session => {
      const timeData = FixedGamesService.getTimeUntilHotSell(session.expires_at);
      newTimeRemaining[session.id] = timeData;
      
      // Update session status if timer expired
      if (timeData.isHotSell && session.status === 'waiting') {
        FixedGamesService.updateHotSellPot(session.id);
      }
    });
    
    setTimeRemaining(newTimeRemaining);
  };

  const joinWinnerTakesAll = async (configId: string) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    // Location verification for legal compliance
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      console.log('Location verified:', position.coords);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Location verification required to join tournaments for legal compliance. Please enable location services.' 
      });
      return;
    }

    setJoiningSession(configId);
    
    try {
      // For now, simulate joining a winner-takes-all session
      // In a real implementation, this would create a special session type
      setMessage({ 
        type: 'success', 
        text: `Joined Winner Takes All tournament! Good luck!` 
      });
      
      // Simulate redirect to game after a short delay
      setTimeout(() => {
        window.location.href = `/games?mode=competition&gameType=${configId}`;
      }, 2000);
      
    } catch (error) {
      console.error('Error joining winner takes all:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to join tournament. Please try again.' 
      });
    } finally {
      setJoiningSession(null);
    }
  };

  const joinHotSellSession = async (session: HotSellSession, config: FixedGameConfig) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    // Check if user has already joined this competition
    if (hasUserJoined(session.id)) {
      setMessage({ type: 'error', text: 'You have already joined this competition!' });
      return;
    }

    // Location verification for legal compliance
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      console.log('Location verified:', position.coords);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Location verification required to join tournaments for legal compliance. Please enable location services.' 
      });
      return;
    }

    if (userTokens < config.entry_fee) {
      setMessage({ type: 'error', text: `You need ${config.entry_fee} tokens to join this tournament` });
      return;
    }

    // Check prize eligibility for significant prizes
    if (config.prize_pool >= 100) {
      const eligibility = await FixedGamesService.checkPrizeEligibility(user.id, config.prize_pool);
      if (!eligibility.eligible) {
        setMessage({ type: 'error', text: eligibility.reason });
        return;
      }
    }

    try {
      setJoiningSession(session.id);
      
      // Deduct tokens from user
      const newTokenBalance = userTokens - config.entry_fee;
      const tokenUpdateSuccess = await UserService.updateUserTokens(user.id, newTokenBalance);
      
      if (!tokenUpdateSuccess) {
        setMessage({ type: 'error', text: 'Failed to deduct tokens. Please try again.' });
        return;
      }

      // Join the hot sell session
      const participant = await FixedGamesService.joinHotSellSession(
        session.id,
        user.id,
        config.entry_fee
      );

      if (participant) {
        setUserTokens(newTokenBalance);
        addUserParticipation(session.id); // Track user participation
        setMessage({ type: 'success', text: `Successfully joined ${config.title}!` });
        
        // Start the game flow immediately
        setSelectedGameFlow({
          gameType: config.game_type,
          sessionId: session.id,
          configId: config.id
        });
        setCurrentView('game');
        
        // Refresh sessions
        const updatedSessions = await FixedGamesService.getHotSellSessions();
        setHotSellSessions(updatedSessions);
      } else {
        // Refund tokens if join failed
        await UserService.updateUserTokens(user.id, userTokens);
        setMessage({ type: 'error', text: 'Failed to join tournament. Tokens refunded.' });
      }
      
    } catch (error) {
      console.error('❌ [HotSell] Error joining session:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setJoiningSession(null);
    }
  };

  const createHotSellSession = async (config: FixedGameConfig) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to create tournaments' });
      return;
    }

    // Location verification for legal compliance
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      console.log('Location verified:', position.coords);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Location verification required to create tournaments for legal compliance. Please enable location services.' 
      });
      return;
    }

    try {
      const session = await FixedGamesService.createHotSellSession(config.id);
      if (session) {
        setMessage({ type: 'success', text: `Created new ${config.title} session!` });
        loadHotSellData(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: 'Failed to create hot sell session' });
      }
    } catch (error) {
      console.error('❌ [HotSell] Error creating session:', error);
      setMessage({ type: 'error', text: 'An error occurred while creating the session' });
    }
  };

  const joinHotSellListing = async (listing: HotSellListing) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    if (userTokens < listing.entry_fee) {
      setMessage({ type: 'error', text: `You need ${listing.entry_fee} tokens to join this tournament` });
      return;
    }

    try {
      setJoiningListing(listing.id);
      
      // Deduct tokens from user
      const newTokenBalance = userTokens - listing.entry_fee;
      const tokenUpdateSuccess = await UserService.updateUserTokens(user.id, newTokenBalance);
      
      if (!tokenUpdateSuccess) {
        setMessage({ type: 'error', text: 'Failed to deduct tokens. Please try again.' });
        return;
      }

      // Join the listing
      const participant = await TournamentService.joinHotSellListing(
        listing.id,
        user.id,
        listing.entry_fee
      );

      if (participant) {
        setUserTokens(newTokenBalance);
        setMessage({ type: 'success', text: `Successfully joined ${listing.title}!` });
        
        // Refresh participants
        const updatedParticipants = await TournamentService.getHotSellParticipants(listing.id);
        setParticipants(prev => ({
          ...prev,
          [listing.id]: updatedParticipants
        }));
      } else {
        // Refund tokens if join failed
        await UserService.updateUserTokens(user.id, userTokens);
        setMessage({ type: 'error', text: 'Failed to join tournament. Tokens refunded.' });
      }
      
    } catch (error) {
      console.error('❌ [HotSell] Error joining listing:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
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
      // Save game history
      await SimpleGameService.saveGameHistory({
        userId: user.id,
        gameType: 'hot-sell',
        score: score,
        accuracy: accuracy,
        isPractice: false,
        isCompetition: true,
        listingId: selectedListing.id,
        metadata: {
          game_type: 'hot-sell',
          rng_seed: Math.floor(Math.random() * 20) + 1,
          tournament_type: 'hot_sell'
        }
      });

      // Update participant score
      await TournamentService.updateHotSellParticipantScore(
        selectedListing.id,
        user.id,
        score
      );

      console.log('✅ [HotSell] Game completed and saved:', { score, accuracy });
      
      // Show scoreboard after game completion
      setTimeout(() => {
        setCurrentView('scoreboard');
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

  // Check if user has already joined a competition
  const hasUserJoined = (competitionId: string) => {
    return userParticipations.includes(competitionId);
  };

  // Add user participation tracking
  const addUserParticipation = (competitionId: string) => {
    setUserParticipations(prev => [...prev, competitionId]);
  };

  const formatPrizeAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculatePrizeDistribution = (prizePool: number) => {
    const feeRate = 0.15; // 15% fee from total pot
    const netPrizePool = prizePool * (1 - feeRate);
    
    return {
      first: netPrizePool * 0.5,
      second: netPrizePool * 0.3,
      third: netPrizePool * 0.2,
      totalFee: prizePool * feeRate
    };
  };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'multi_target_reaction': return '🎯';
      case 'sword_parry': return '⚔️';
      case 'laser_dodge': return '💥';
      case 'memory_color': return '🎨';
      case 'number_tap': return '🔢';
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
    return (
      <CompetitionGameFlow
        gameType={selectedGameFlow.gameType}
        sessionId={selectedGameFlow.sessionId}
        configId={selectedGameFlow.configId}
        onComplete={(score, accuracy) => {
          console.log('Game completed:', { score, accuracy });
          setCurrentView('listings');
          setSelectedGameFlow(null);
        }}
        onCancel={() => {
          setCurrentView('listings');
          setSelectedGameFlow(null);
        }}
      />
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

        {/* Hot Sell Games - PRIORITY SECTION */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">🎯 HOT SELL GAMES</h2>
            <p className="text-lg text-gray-300">Daily tournaments with guaranteed prizes and 2-hour timers</p>
            {prizeEligibility && (
              <div className={`mt-4 inline-flex items-center rounded-2xl px-6 py-3 border ${
                prizeEligibility.eligible 
                  ? 'bg-green-500/20 border-green-500/50 text-green-300' 
                  : 'bg-red-500/20 border-red-500/50 text-red-300'
              }`}>
                {prizeEligibility.eligible ? (
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                )}
                <span className="text-sm">{prizeEligibility.reason}</span>
              </div>
            )}
              </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {fixedGameConfigs.map((config) => {
              const session = hotSellSessions.find(s => s.config_id === config.id);
              const timer = session ? timeRemaining[session.id] : null;
              const prizeDistribution = calculatePrizeDistribution(config.prize_pool);
              const isHotSell = timer?.isHotSell || false;
              const canJoin = userTokens >= config.entry_fee;
              
              return (
                <div key={config.id} className={`bg-white/10 backdrop-blur-xl rounded-3xl p-6 border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  isHotSell ? 'border-red-500/50 bg-red-500/10' : 'border-white/20 hover:bg-white/15'
                }`}>
                  {/* Game Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">{getGameIcon(config.game_type)}</span>
                        <h3 className="text-xl font-bold text-white">{config.title}</h3>
              </div>
                      <div className={`flex items-center rounded-full px-3 py-1 ${
                        isHotSell ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {isHotSell ? (
                          <>
                            <BoltIcon className="w-4 h-4 mr-1" />
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
                    
                    <p className="text-gray-300 mb-4">{config.description}</p>
                    
                    {/* Prize Pool */}
                    <div className={`rounded-2xl p-4 mb-4 ${
                      isHotSell 
                        ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    }`}>
                      <div className="text-center">
                        <p className="text-yellow-100 text-sm font-medium mb-1">PRIZE POOL</p>
                        <p className="text-2xl font-bold text-white">{formatPrizeAmount(config.prize_pool)}</p>
                        {session && (
                          <p className="text-yellow-100 text-xs mt-1">
                            Current Pot: {formatPrizeAmount(session.current_pot)} ({session.participants_count} players)
                          </p>
                        )}
          </div>
        </div>
      </div>

                  {/* Timer Display */}
                  {timer && (
                    <div className="mb-4">
                      <div className={`text-center p-3 rounded-xl ${
                        isHotSell ? 'bg-red-500/20 border border-red-500/50' : 'bg-blue-500/20 border border-blue-500/50'
                      }`}>
                        <div className="flex items-center justify-center mb-2">
                          <ClockIcon className={`w-5 h-5 mr-2 ${isHotSell ? 'text-red-400' : 'text-blue-400'}`} />
                          <span className={`font-semibold ${isHotSell ? 'text-red-300' : 'text-blue-300'}`}>
                            {isHotSell ? 'HOT SELL MODE!' : 'Time Remaining'}
                          </span>
                        </div>
                        <p className={`text-lg font-bold ${isHotSell ? 'text-red-300' : 'text-blue-300'}`}>
                          {formatTimeRemaining(timer.minutes, timer.seconds)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Prize Distribution */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                      <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
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
                      <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center mr-2">
                            <span className="text-white font-bold text-xs">2</span>
                          </div>
                          <span className="text-white text-sm">2nd Place</span>
                        </div>
                        <span className="text-gray-300 font-bold text-sm">{formatPrizeAmount(prizeDistribution.second)}</span>
                      </div>
                      <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-2">
                            <span className="text-white font-bold text-xs">3</span>
                          </div>
                          <span className="text-white text-sm">3rd Place</span>
                        </div>
                        <span className="text-orange-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.third)}</span>
                      </div>
                      <div className="flex items-center justify-between bg-red-500/20 rounded-lg p-2 border border-red-500/30">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                            <span className="text-white font-bold text-xs">📊</span>
                          </div>
                          <span className="text-red-300 text-sm">Platform Fee (15%)</span>
                        </div>
                        <span className="text-red-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.totalFee)}</span>
                      </div>
              </div>
                  </div>

                  {/* Progress Bar for Hot Sell Games */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span>Participants Progress</span>
                      <span>{session?.participants_count || 0} / {config.max_participants} players</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          isHotSell 
                            ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`} 
                        style={{ 
                          width: `${Math.min(100, ((session?.participants_count || 0) / config.max_participants) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Target: {config.max_participants} players</span>
                      <span>Remaining: {Math.max(0, config.max_participants - (session?.participants_count || 0))} players</span>
                    </div>
                  </div>

                  {/* Game Info */}
                  <div className="mb-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BanknotesIcon className="w-4 h-4 text-green-400 mr-2" />
                        <span className="text-gray-300 text-sm">Entry Fee</span>
                      </div>
                      <span className="text-white font-semibold text-sm">{config.entry_fee} tokens</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <UsersIcon className="w-4 h-4 text-blue-400 mr-2" />
                        <span className="text-gray-300 text-sm">Max Players</span>
                      </div>
                      <span className="text-white font-semibold text-sm">{config.max_participants}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 text-blue-400 mr-2" />
                        <span className="text-gray-300 text-sm">Duration</span>
                      </div>
                      <span className="text-white font-semibold text-sm">{config.game_duration}s</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {!isAuthenticated ? (
                      <div className="bg-gray-600 rounded-xl p-3 text-center">
                        <p className="text-gray-300 text-sm">Please log in to join tournaments</p>
                      </div>
                    ) : !canJoin ? (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center">
                        <p className="text-red-300 text-sm">You need {config.entry_fee} tokens to join</p>
                      </div>
                    ) : (
                      <>
                        {session ? (
                          <button
                            onClick={() => joinHotSellSession(session, config)}
                            disabled={joiningSession === session.id || hasUserJoined(session.id)}
                            className={`w-full font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                              isHotSell 
                                ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                            }`}
                          >
                            {joiningSession === session.id ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Joining...
                              </div>
                            ) : hasUserJoined(session.id) ? (
                              <div className="flex items-center justify-center">
                                ✅ ALREADY JOINED
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                {isHotSell ? (
                                  <>
                                    <BoltIcon className="w-4 h-4 mr-2" />
                                    JOIN HOT SELL - {config.entry_fee} TOKENS
                                  </>
                                ) : (
                                  <>
                                    <PlayIcon className="w-4 h-4 mr-2" />
                                    JOIN SESSION - {config.entry_fee} TOKENS
                                  </>
                                )}
                </div>
                            )}
                    </button>
                        ) : (
                          <button
                            onClick={() => createHotSellSession(config)}
                            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                          >
                            <div className="flex items-center justify-center">
                              <LockClosedIcon className="w-4 h-4 mr-2" />
                              START NEW SESSION
                            </div>
                    </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
              </div>
            </div>

        {/* Winner Takes It All Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">🏆 WINNER TAKES IT ALL</h2>
            <p className="text-lg text-gray-300">$1 entry tournaments - Winner gets everything!</p>
            <p className="text-sm text-gray-400">More players = Bigger pot! No limits on participants.</p>
              </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Winner Takes It All Games */}
            {fixedGameConfigs.map((config) => {
              const winnerTakesAllConfig = {
                ...config,
                title: `Winner Takes All - ${config.title}`,
                entry_fee: 1, // $1 entry
                prize_pool: 0, // Will be calculated based on participants
                max_participants: 1000, // No practical limit
                description: `$1 entry - Winner takes everything! Current pot grows with each player.`
              };
              
              return (
                <div key={`winner-${config.id}`} className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-white/15">
                  {/* Game Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">🏆</span>
                        <h3 className="text-xl font-bold text-white">{winnerTakesAllConfig.title}</h3>
                  </div>
                      <div className="flex items-center rounded-full px-3 py-1 bg-purple-500/20 text-purple-300">
                        <StarIcon className="w-4 h-4 mr-1" />
                        <span className="text-xs font-semibold">WINNER TAKES ALL</span>
                  </div>
                </div>
                
                    <p className="text-gray-300 mb-4">{winnerTakesAllConfig.description}</p>
                    
                    {/* Entry Fee */}
                    <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-green-500 to-emerald-500">
                      <div className="text-center">
                        <p className="text-green-100 text-sm font-medium mb-1">ENTRY FEE</p>
                        <p className="text-2xl font-bold text-white">{formatPrizeAmount(winnerTakesAllConfig.entry_fee)}</p>
                  </div>
                </div>
                
                    {/* Current Pot (starts at $0) */}
                    <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-purple-500 to-pink-500">
                      <div className="text-center">
                        <p className="text-purple-100 text-sm font-medium mb-1">CURRENT POT</p>
                        <p className="text-2xl font-bold text-white">{formatPrizeAmount(0)}</p>
                        <p className="text-purple-200 text-xs mt-1">0 players joined</p>
              </div>
            </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-300 mb-2">
                        <span>Progress to Target</span>
                        <span>0 / 50 players</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Target: 50 players</span>
                        <span>Remaining: 50 players</span>
                      </div>
                    </div>

                    {/* Game Info */}
                    <div className="space-y-2 text-sm text-gray-300 mb-6">
                      <div className="flex justify-between">
                        <span>Game Type:</span>
                        <span className="text-white font-medium">{getGameIcon(config.game_type)} {config.game_type.replace('_', ' ').toUpperCase()}</span>
              </div>
                      <div className="flex justify-between">
                        <span>Max Players:</span>
                        <span className="text-white font-medium">Unlimited</span>
                  </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="text-white font-medium">{config.game_duration}s</span>
                  </div>
                </div>
                
                    {/* Join Button */}
                    <div className="space-y-3">
                      {isAuthenticated ? (
                        <button
                          onClick={() => joinWinnerTakesAll(config.id)}
                          disabled={joiningSession || userTokens < winnerTakesAllConfig.entry_fee}
                          className={`w-full py-3 px-6 rounded-2xl font-bold text-white transition-all duration-300 ${
                            userTokens >= winnerTakesAllConfig.entry_fee
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 hover:scale-105 shadow-lg hover:shadow-xl'
                              : 'bg-gray-600 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {joiningSession ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Joining...
                            </div>
                          ) : userTokens >= winnerTakesAllConfig.entry_fee ? (
                            `🔒 JOIN FOR ${formatPrizeAmount(winnerTakesAllConfig.entry_fee)}`
                          ) : (
                            '❌ Insufficient Tokens'
                          )}
                    </button>
                      ) : (
                        <div className="text-center py-3 px-6 rounded-2xl bg-gray-600 text-gray-400">
                          Please log in to join
                        </div>
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
            const prizeDistribution = calculatePrizeDistribution(listing.prize_pool);
            const isJoined = listingParticipants.some(p => p.user_id === user?.id);
            const canJoin = userTokens >= listing.entry_fee && !isJoined && listingParticipants.length < listing.max_participants;
            
            return (
              <div key={listing.id} className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                {/* Tournament Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">{listing.title}</h2>
                    <div className="flex items-center bg-red-500/20 rounded-full px-4 py-2">
                      <FireIcon className="w-5 h-5 text-red-400 mr-2" />
                      <span className="text-red-300 font-semibold">HOT</span>
              </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{listing.description}</p>
                  
                  {/* Prize Pool */}
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 mb-6">
                    <div className="text-center">
                      <p className="text-yellow-100 text-sm font-medium mb-2">TOTAL PRIZE POOL</p>
                      <p className="text-4xl font-bold text-white">{formatPrizeAmount(listing.prize_pool)}</p>
                      <p className="text-yellow-100 text-sm mt-2">(15% fee deducted from prizes)</p>
                    </div>
                  </div>
                </div>
                
                {/* Prize Distribution */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <TrophyIcon className="w-5 h-5 mr-2 text-yellow-400" />
                    Prize Distribution
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">1</span>
                        </div>
                        <span className="text-white font-medium">1st Place</span>
                      </div>
                      <span className="text-yellow-400 font-bold text-lg">{formatPrizeAmount(prizeDistribution.first)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">2</span>
                        </div>
                        <span className="text-white font-medium">2nd Place</span>
                      </div>
                      <span className="text-gray-300 font-bold text-lg">{formatPrizeAmount(prizeDistribution.second)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">3</span>
                        </div>
                        <span className="text-white font-medium">3rd Place</span>
                      </div>
                      <span className="text-orange-400 font-bold text-lg">{formatPrizeAmount(prizeDistribution.third)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Tournament Info */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BanknotesIcon className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-gray-300">Entry Fee</span>
                </div>
                    <span className="text-white font-semibold">{listing.entry_fee} tokens</span>
              </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UsersIcon className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-gray-300">Participants</span>
            </div>
                    <span className="text-white font-semibold">{listingParticipants.length}/{listing.max_participants}</span>
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
                      <span>Remaining: {Math.max(0, listing.max_participants - listingParticipants.length)} players</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StarIcon className="w-5 h-5 text-purple-400 mr-2" />
                      <span className="text-gray-300">Game Type</span>
                    </div>
                    <span className="text-white font-semibold capitalize">{listing.game_type.replace('-', ' ')}</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  {!isAuthenticated ? (
                    <div className="bg-gray-600 rounded-xl p-4">
                      <p className="text-gray-300 mb-2">Please log in to join tournaments</p>
                    </div>
                  ) : isJoined ? (
                    <div className="space-y-3">
                      <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                        <div className="flex items-center justify-center">
                          <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                          <span className="text-green-300 font-semibold">You're in this tournament!</span>
                  </div>
                </div>
                
                      {/* Play Game Button */}
                      <button
                        onClick={() => startGame(listing)}
                        className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <div className="flex items-center justify-center">
                          <PlayIcon className="w-5 h-5 mr-2" />
                          PLAY GAME
                        </div>
                </button>
                
                      {/* View Scoreboard Button */}
                      <button
                        onClick={() => viewScoreboard(listing)}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <div className="flex items-center justify-center">
                          <EyeIcon className="w-5 h-5 mr-2" />
                          VIEW SCOREBOARD
                        </div>
                      </button>
                    </div>
                  ) : !canJoin ? (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                      <p className="text-red-300">
                        {userTokens < listing.entry_fee 
                          ? `You need ${listing.entry_fee} tokens to join`
                          : 'Tournament is full'
                        }
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => joinHotSellListing(listing)}
                      disabled={joiningListing === listing.id}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningListing === listing.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Joining...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <FireIcon className="w-5 h-5 mr-2" />
                          JOIN TOURNAMENT - {listing.entry_fee} TOKENS
                        </div>
                      )}
                    </button>
                  )}
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