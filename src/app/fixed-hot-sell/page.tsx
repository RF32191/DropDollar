'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FixedGamesService, FixedGameConfig, ActiveFixedGame, FixedGameParticipant, PrizeEligibility } from '@/lib/supabase/fixedGamesService';
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
  PlusIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export default function FixedHotSellPage() {
  const { user, isAuthenticated } = useAuth();
  const [fixedGames, setFixedGames] = useState<ActiveFixedGame[]>([]);
  const [gameConfigs, setGameConfigs] = useState<FixedGameConfig[]>([]);
  const [participants, setParticipants] = useState<{ [gameId: string]: FixedGameParticipant[] }>({});
  const [userTokens, setUserTokens] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningGame, setJoiningGame] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [prizeEligibility, setPrizeEligibility] = useState<PrizeEligibility | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadFixedGamesData();
      checkUserEligibility();
    }
  }, [isAuthenticated, user]);

  const loadFixedGamesData = async () => {
    try {
      setIsLoading(true);
      
      // Load active fixed games
      const games = await FixedGamesService.getActiveFixedGames('hot_sell');
      setFixedGames(games);
      
      // Load game configs
      const configs = await FixedGamesService.getFixedGameConfigs('hot_sell');
      setGameConfigs(configs);
      
      // Load participants for each game
      const participantsData: { [gameId: string]: FixedGameParticipant[] } = {};
      for (const game of games) {
        const gameParticipants = await FixedGamesService.getFixedGameParticipants(game.id);
        participantsData[game.id] = gameParticipants;
      }
      setParticipants(participantsData);
      
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

  const joinFixedGame = async (game: ActiveFixedGame, config: FixedGameConfig) => {
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
      setJoiningGame(game.id);
      
      // Deduct tokens from user
      const newTokenBalance = userTokens - config.entry_fee;
      const tokenUpdateSuccess = await UserService.updateUserTokens(user.id, newTokenBalance);
      
      if (!tokenUpdateSuccess) {
        setMessage({ type: 'error', text: 'Failed to deduct tokens. Please try again.' });
        return;
      }

      // Join the fixed game
      const participant = await FixedGamesService.joinFixedGame(
        game.id,
        user.id,
        config.entry_fee
      );

      if (participant) {
        setUserTokens(newTokenBalance);
        setMessage({ type: 'success', text: `Successfully joined ${config.title}!` });
        
        // Refresh participants
        const updatedParticipants = await FixedGamesService.getFixedGameParticipants(game.id);
        setParticipants(prev => ({
          ...prev,
          [game.id]: updatedParticipants
        }));
      } else {
        // Refund tokens if join failed
        await UserService.updateUserTokens(user.id, userTokens);
        setMessage({ type: 'error', text: 'Failed to join tournament. Tokens refunded.' });
      }
      
    } catch (error) {
      console.error('❌ [FixedHotSell] Error joining game:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setJoiningGame(null);
    }
  };

  const createFixedGame = async (formData: any) => {
    try {
      const result = await FixedGamesService.createFixedGame({
        tournamentType: 'hot_sell',
        title: formData.title,
        description: formData.description,
        entryFee: parseInt(formData.entryFee),
        prizePool: parseFloat(formData.prizePool),
        maxParticipants: parseInt(formData.maxParticipants),
        gameDuration: parseInt(formData.gameDuration),
        rngSeed: parseInt(formData.rngSeed)
      });

      if (result) {
        setMessage({ type: 'success', text: 'Fixed game created successfully!' });
        setShowCreateForm(false);
        loadFixedGamesData(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: 'Failed to create fixed game' });
      }
    } catch (error) {
      console.error('❌ [FixedHotSell] Error creating game:', error);
      setMessage({ type: 'error', text: 'An error occurred while creating the game' });
    }
  };

  const formatPrizeAmount = (amount: number) => {
    return FixedGamesService.formatPrizeAmount(amount);
  };

  const calculatePrizeDistribution = (prizePool: number) => {
    return FixedGamesService.calculatePrizeDistribution(prizePool, 'hot_sell');
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
          <p className="text-xl text-gray-300 mb-2">Pre-configured tournaments with guaranteed prizes</p>
          <p className="text-lg text-gray-400">Fixed games with consistent rules and prize pools</p>
          
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

        {/* Create Game Button */}
        {isAuthenticated && (
          <div className="mb-8 text-center">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center">
                <PlusIcon className="w-5 h-5 mr-2" />
                {showCreateForm ? 'Cancel' : 'Create Fixed Game'}
              </div>
            </button>
          </div>
        )}

        {/* Create Game Form */}
        {showCreateForm && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Create Fixed Hot Sell Game</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                createFixedGame(Object.fromEntries(formData));
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                    <input
                      type="text"
                      name="title"
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., $1,000 Daily Tournament"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Entry Fee (Tokens)</label>
                    <input
                      type="number"
                      name="entryFee"
                      required
                      min="1"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Prize Pool ($)</label>
                    <input
                      type="number"
                      name="prizePool"
                      required
                      min="10"
                      step="0.01"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Participants</label>
                    <input
                      type="number"
                      name="maxParticipants"
                      required
                      min="2"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Game Duration (seconds)</label>
                    <input
                      type="number"
                      name="gameDuration"
                      required
                      min="30"
                      max="300"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">RNG Seed (1-20)</label>
                    <input
                      type="number"
                      name="rngSeed"
                      required
                      min="1"
                      max="20"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Describe your tournament..."
                  />
                </div>
                <div className="text-center">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Create Fixed Game
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Fixed Games List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {fixedGames.map((game) => {
            const config = gameConfigs.find(c => c.id === game.config_id);
            if (!config) return null;

            const gameParticipants = participants[game.id] || [];
            const prizeDistribution = calculatePrizeDistribution(config.prize_pool);
            const isJoined = gameParticipants.some(p => p.user_id === user?.id);
            const canJoin = userTokens >= config.entry_fee && !isJoined && gameParticipants.length < config.max_participants;
            
            return (
              <div key={game.id} className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                {/* Game Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">{config.title}</h2>
                    <div className="flex items-center bg-red-500/20 rounded-full px-4 py-2">
                      <FireIcon className="w-5 h-5 text-red-400 mr-2" />
                      <span className="text-red-300 font-semibold">FIXED</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{config.description}</p>
                  
                  {/* Prize Pool */}
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 mb-6">
                    <div className="text-center">
                      <p className="text-yellow-100 text-sm font-medium mb-2">FIXED PRIZE POOL</p>
                      <p className="text-4xl font-bold text-white">{formatPrizeAmount(config.prize_pool)}</p>
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

                {/* Game Info */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BanknotesIcon className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-gray-300">Entry Fee</span>
                    </div>
                    <span className="text-white font-semibold">{config.entry_fee} tokens</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UsersIcon className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-gray-300">Participants</span>
                    </div>
                    <span className="text-white font-semibold">{gameParticipants.length}/{config.max_participants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ClockIcon className="w-5 h-5 text-purple-400 mr-2" />
                      <span className="text-gray-300">Duration</span>
                    </div>
                    <span className="text-white font-semibold">{config.game_duration}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StarIcon className="w-5 h-5 text-yellow-400 mr-2" />
                      <span className="text-gray-300">RNG Seed</span>
                    </div>
                    <span className="text-white font-semibold">{config.rng_seed}</span>
                  </div>
                </div>

                {/* Join Button */}
                <div className="text-center">
                  {!isAuthenticated ? (
                    <div className="bg-gray-600 rounded-xl p-4">
                      <p className="text-gray-300 mb-2">Please log in to join tournaments</p>
                    </div>
                  ) : isJoined ? (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                      <div className="flex items-center justify-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                        <span className="text-green-300 font-semibold">You're in this tournament!</span>
                      </div>
                    </div>
                  ) : !canJoin ? (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                      <p className="text-red-300">
                        {userTokens < config.entry_fee 
                          ? `You need ${config.entry_fee} tokens to join`
                          : 'Tournament is full'
                        }
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => joinFixedGame(game, config)}
                      disabled={joiningGame === game.id}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningGame === game.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Joining...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <FireIcon className="w-5 h-5 mr-2" />
                          JOIN FIXED GAME - {config.entry_fee} TOKENS
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {fixedGames.length === 0 && (
          <div className="text-center py-12">
            <FireIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Fixed Games Available</h3>
            <p className="text-gray-400">Create your first fixed hot sell tournament!</p>
          </div>
        )}
      </div>
    </div>
  );
}
