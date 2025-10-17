'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ScheduledGamesService, ScheduledGame, ScheduledGameParticipant } from '@/lib/supabase/scheduledGamesService';
import { UserService } from '@/lib/supabase/userService';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { 
  CalendarIcon, 
  TrophyIcon, 
  BanknotesIcon, 
  UsersIcon,
  ClockIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export default function ScheduledGamesPage() {
  const { user, isAuthenticated } = useAuth();
  const [scheduledGames, setScheduledGames] = useState<ScheduledGame[]>([]);
  const [participants, setParticipants] = useState<{ [gameId: string]: ScheduledGameParticipant[] }>({});
  const [userTokens, setUserTokens] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningGame, setJoiningGame] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadScheduledGamesData();
    }
  }, [isAuthenticated, user]);

  const loadScheduledGamesData = async () => {
    try {
      setIsLoading(true);
      
      // Load scheduled games
      const games = await ScheduledGamesService.getUpcomingScheduledGames();
      setScheduledGames(games);
      
      // Load participants for each game
      const participantsData: { [gameId: string]: ScheduledGameParticipant[] } = {};
      for (const game of games) {
        const gameParticipants = await ScheduledGamesService.getScheduledGameParticipants(game.id);
        participantsData[game.id] = gameParticipants;
      }
      setParticipants(participantsData);
      
      // Load user tokens
      if (user) {
        const profile = await UserService.getUserProfile(user.id);
        setUserTokens(profile?.tokens || 0);
      }
      
    } catch (error) {
      console.error('❌ [ScheduledGames] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const joinScheduledGame = async (game: ScheduledGame) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    if (userTokens < game.entry_fee) {
      setMessage({ type: 'error', text: `You need ${game.entry_fee} tokens to join this tournament` });
      return;
    }

    try {
      setJoiningGame(game.id);
      
      // Deduct tokens from user
      const newTokenBalance = userTokens - game.entry_fee;
      const tokenUpdateSuccess = await UserService.updateUserTokens(user.id, newTokenBalance);
      
      if (!tokenUpdateSuccess) {
        setMessage({ type: 'error', text: 'Failed to deduct tokens. Please try again.' });
        return;
      }

      // Join the game
      const participant = await ScheduledGamesService.joinScheduledGame(
        game.id,
        user.id,
        game.entry_fee
      );

      if (participant) {
        setUserTokens(newTokenBalance);
        setMessage({ type: 'success', text: `Successfully joined ${game.title}!` });
        
        // Refresh participants
        const updatedParticipants = await ScheduledGamesService.getScheduledGameParticipants(game.id);
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
      console.error('❌ [ScheduledGames] Error joining game:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setJoiningGame(null);
    }
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
    const feeRate = 0.15; // 15% fee
    const netPrizePool = prizePool * (1 - feeRate);
    
    return {
      first: netPrizePool * 0.5,
      second: netPrizePool * 0.3,
      third: netPrizePool * 0.2
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg">Loading scheduled tournaments...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <CalendarIcon className="w-12 h-12 text-purple-500 mr-4 animate-pulse" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              SCHEDULED GAMES
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">Pre-scheduled tournaments with guaranteed prizes</p>
          <p className="text-lg text-gray-400">Join tournaments scheduled throughout the week</p>
          
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

        {/* Scheduled Games */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {scheduledGames.map((game) => {
            const gameParticipants = participants[game.id] || [];
            const prizeDistribution = calculatePrizeDistribution(game.prize_pool);
            const isJoined = gameParticipants.some(p => p.user_id === user?.id);
            const canJoin = userTokens >= game.entry_fee && !isJoined && gameParticipants.length < game.max_participants;
            const timeUntilStart = ScheduledGamesService.formatScheduledTime(game.scheduled_time);
            
            return (
              <div key={game.id} className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                {/* Game Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">{game.title}</h2>
                    <div className="flex items-center bg-purple-500/20 rounded-full px-4 py-2">
                      <CalendarIcon className="w-5 h-5 text-purple-400 mr-2" />
                      <span className="text-purple-300 font-semibold">SCHEDULED</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{game.description}</p>
                  
                  {/* Time Until Start */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-4 mb-6">
                    <div className="text-center">
                      <p className="text-blue-100 text-sm font-medium mb-2">STARTS IN</p>
                      <p className="text-2xl font-bold text-white">{timeUntilStart}</p>
                    </div>
                  </div>
                  
                  {/* Prize Pool */}
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 mb-6">
                    <div className="text-center">
                      <p className="text-yellow-100 text-sm font-medium mb-2">TOTAL PRIZE POOL</p>
                      <p className="text-4xl font-bold text-white">{formatPrizeAmount(game.prize_pool)}</p>
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
                    <span className="text-white font-semibold">{game.entry_fee} tokens</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UsersIcon className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-gray-300">Participants</span>
                    </div>
                    <span className="text-white font-semibold">{gameParticipants.length}/{game.max_participants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StarIcon className="w-5 h-5 text-purple-400 mr-2" />
                      <span className="text-gray-300">Game Type</span>
                    </div>
                    <span className="text-white font-semibold capitalize">{game.game_type.replace('-', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ClockIcon className="w-5 h-5 text-orange-400 mr-2" />
                      <span className="text-gray-300">Status</span>
                    </div>
                    <span className="text-white font-semibold capitalize">{game.status}</span>
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
                        <span className="text-green-300 font-semibold">You're registered for this tournament!</span>
                      </div>
                    </div>
                  ) : !canJoin ? (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                      <p className="text-red-300">
                        {userTokens < game.entry_fee 
                          ? `You need ${game.entry_fee} tokens to join`
                          : 'Tournament is full'
                        }
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => joinScheduledGame(game)}
                      disabled={joiningGame === game.id}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningGame === game.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Joining...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <CalendarIcon className="w-5 h-5 mr-2" />
                          JOIN SCHEDULED GAME - {game.entry_fee} TOKENS
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
                Create Your Own Scheduled Tournament
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
