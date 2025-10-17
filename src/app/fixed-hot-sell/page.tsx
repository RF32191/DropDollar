'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FixedGamesService, FixedGameConfig, HotSellSession, PrizeEligibility } from '@/lib/supabase/fixedGamesService';
import { UserService } from '@/lib/supabase/userService';
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
  PlayIcon,
  EyeIcon,
  BoltIcon,
  TimerIcon
} from '@heroicons/react/24/outline';

export default function FixedHotSellPage() {
  const { user, isAuthenticated } = useAuth();
  const [gameConfigs, setGameConfigs] = useState<FixedGameConfig[]>([]);
  const [hotSellSessions, setHotSellSessions] = useState<HotSellSession[]>([]);
  const [userTokens, setUserTokens] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningSession, setJoiningSession] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [prizeEligibility, setPrizeEligibility] = useState<PrizeEligibility | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{ [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean } }>({});

  useEffect(() => {
    if (isAuthenticated && user) {
      loadFixedGamesData();
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

  const loadFixedGamesData = async () => {
    try {
      setIsLoading(true);
      
      // Load game configs for hot sell
      const configs = await FixedGamesService.getFixedGameConfigs('hot_sell');
      setGameConfigs(configs);
      
      // Load hot sell sessions
      const sessions = await FixedGamesService.getHotSellSessions();
      setHotSellSessions(sessions);
      
      // Load user tokens
      if (user) {
        const profile = await UserService.getUserProfile(user.id);
        setUserTokens(profile?.tokens || 0);
      }
      
    } catch (error) {
      console.error('❌ [FixedHotSell] Error loading data:', error);
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
      console.error('❌ [FixedHotSell] Error checking eligibility:', error);
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

  const joinHotSellSession = async (session: HotSellSession, config: FixedGameConfig) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
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
        setMessage({ type: 'success', text: `Successfully joined ${config.title}!` });
        
        // Refresh sessions
        const updatedSessions = await FixedGamesService.getHotSellSessions();
        setHotSellSessions(updatedSessions);
      } else {
        // Refund tokens if join failed
        await UserService.updateUserTokens(user.id, userTokens);
        setMessage({ type: 'error', text: 'Failed to join tournament. Tokens refunded.' });
      }
      
    } catch (error) {
      console.error('❌ [FixedHotSell] Error joining session:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setJoiningSession(null);
    }
  };

  const createHotSellSession = async (config: FixedGameConfig) => {
    try {
      const session = await FixedGamesService.createHotSellSession(config.id);
      if (session) {
        setMessage({ type: 'success', text: `Created new ${config.title} session!` });
        loadFixedGamesData(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: 'Failed to create hot sell session' });
      }
    } catch (error) {
      console.error('❌ [FixedHotSell] Error creating session:', error);
      setMessage({ type: 'error', text: 'An error occurred while creating the session' });
    }
  };

  const formatPrizeAmount = (amount: number) => {
    return FixedGamesService.formatPrizeAmount(amount);
  };

  const calculatePrizeDistribution = (prizePool: number) => {
    return FixedGamesService.calculatePrizeDistribution(prizePool, 'hot_sell');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            <span className="ml-4 text-lg">Loading fixed hot sell tournaments...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 text-white relative overflow-hidden">
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
              FIXED HOT SELL
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">Original banner-based tournaments with 2-hour timers</p>
          <p className="text-lg text-gray-400">Join sessions and wait for hot sell mode to activate</p>
          
          {/* User Token Balance */}
          {isAuthenticated && (
            <div className="mt-6 inline-flex items-center bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/20">
              <BanknotesIcon className="w-6 h-6 text-yellow-400 mr-3" />
              <span className="text-lg font-semibold">Your Tokens: {userTokens}</span>
            </div>
          )}

          {/* Prize Eligibility Status */}
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

        {/* Fixed Hot Sell Tiers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {gameConfigs.map((config) => {
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
                      <h2 className="text-xl font-bold text-white">{config.title}</h2>
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
                          <TimerIcon className="w-4 h-4 mr-1" />
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
                        {FixedGamesService.formatTimeRemaining(timer.minutes, timer.seconds)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Prize Distribution */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                    <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
                    Prize Distribution
                  </h3>
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
                      <StarIcon className="w-4 h-4 text-yellow-400 mr-2" />
                      <span className="text-gray-300 text-sm">RNG Seed</span>
                    </div>
                    <span className="text-white font-semibold text-sm">{config.rng_seed}</span>
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
                          disabled={joiningSession === session.id}
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
                            <PlayIcon className="w-4 h-4 mr-2" />
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

        {gameConfigs.length === 0 && (
          <div className="text-center py-12">
            <FireIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Fixed Hot Sell Games Available</h3>
            <p className="text-gray-400">Fixed games will appear here automatically</p>
          </div>
        )}
      </div>
    </div>
  );
}