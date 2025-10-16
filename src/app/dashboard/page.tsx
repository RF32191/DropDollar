'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { SimpleGameService, GameHistoryRecord } from '@/lib/supabase/simpleGameService';
import { UserService } from '@/lib/supabase/userService';
import { useAuth } from '@/contexts/AuthContext';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { 
  TrophyIcon, 
  StarIcon, 
  HeartIcon,
  XMarkIcon,
  CheckIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  FireIcon,
  ChartBarIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface GameHistoryRecord {
  id: string;
  game_type: string;
  score: number;
  accuracy: number;
  avg_reaction_time?: number;
  is_practice: boolean;
  listing_id?: string;
  entry_number?: number;
  match_id?: string;
  opponent_id?: string;
  tournament_id?: string;
  entry_fee?: number;
  tokens_wagered?: number;
  tokens_won?: number;
  game_duration?: number;
  created_at: string;
}

interface HighScoreRecord {
  game_type: string;
  best_score: number;
  best_accuracy?: number;
  best_reaction_time?: number;
  last_score?: number;
  last_accuracy?: number;
  games_played: number;
  practice_games: number;
  competition_games: number;
}

interface UserStats {
  totalGames: number;
  practiceGames: number;
  competitionGames: number;
  totalTokensWagered: number;
  totalTokensWon: number;
  totalPrizeMoney: number;
  averageScore: number;
}

export default function TriumphStyleDashboard() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [gameHistory, setGameHistory] = useState<GameHistoryRecord[]>([]);
  const [highScores, setHighScores] = useState<HighScoreRecord[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalGames: 0,
    practiceGames: 0,
    competitionGames: 0,
    totalTokensWagered: 0,
    totalTokensWon: 0,
    totalPrizeMoney: 0,
    averageScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recent' | 'practice' | 'competition' | 'stats'>('recent');

  useEffect(() => {
    // Check URL parameters for tab selection
    const tab = searchParams.get('tab');
    if (tab && ['recent', 'practice', 'competition', 'stats'].includes(tab)) {
      setActiveTab(tab as any);
    }
    
    // Check for new score/match flags
    const newScore = searchParams.get('newScore');
    const newMatch = searchParams.get('newMatch');
    
    if (newScore || newMatch) {
      // Show a brief notification
      console.log('🎉 New game result detected!');
    }
    
    // Only load data if user is authenticated
    if (user && isAuthenticated) {
      loadDashboardData();
    }
  }, [searchParams, user, isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      console.log('🎮 [Dashboard] Loading Triumph-style dashboard data...');

      // Use the same authentication method as practice games
      if (!user || !isAuthenticated) {
        console.log('❌ [Dashboard] No authenticated user from useAuth context');
        setIsLoading(false);
        return;
      }

      console.log('✅ [Dashboard] User authenticated via useAuth:', user.id);
      console.log('✅ [Dashboard] User email:', user.email);

      // Set user profile from useAuth context
      setUserProfile(user);
      console.log('✅ [Dashboard] Profile loaded from useAuth:', user.username);

      // Load actual token balance from database
      const profile = await UserService.getUserProfile(user.id);
      if (profile) {
        setTokenBalance(profile.tokens || 0);
        console.log('💰 [Dashboard] Token balance loaded:', profile.tokens);
      }

      // Get comprehensive game data using direct queries (more reliable)
      await Promise.all([
        loadGameHistory(user.id),
        loadHighScores(user.id),
        loadUserStats(user.id)
      ]);

      console.log('✅ [Dashboard] All data loaded successfully');
    } catch (error) {
      console.error('❌ [Dashboard] Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGameHistory = async (userId: string) => {
    try {
      console.log('🎮 [Dashboard] Loading game history...');
      
      const gameHistory = await SimpleGameService.getUserGameHistory(userId);
      setGameHistory(gameHistory);
      console.log('✅ [Dashboard] Game history loaded:', gameHistory.length, 'games');
    } catch (error) {
      console.error('❌ [Dashboard] Error in loadGameHistory:', error);
    }
  };

  const loadHighScores = async (userId: string) => {
    try {
      console.log('🏆 [Dashboard] Loading high scores...');
      
      const highScores = await SimpleGameService.getUserHighScores(userId);
      setHighScores(Object.values(highScores));
      console.log('✅ [Dashboard] High scores loaded:', Object.keys(highScores).length, 'games');
    } catch (error) {
      console.error('❌ [Dashboard] Error in loadHighScores:', error);
    }
  };

  const loadUserStats = async (userId: string) => {
    try {
      console.log('📊 [Dashboard] Loading user stats...');
      
      const stats = await SimpleGameService.getUserGameStats(userId);
      setUserStats(stats);
      console.log('✅ [Dashboard] User stats loaded:', stats);
    } catch (error) {
      console.error('❌ [Dashboard] Error in loadUserStats:', error);
    }
  };

  const formatGameType = (gameType: string) => {
    const gameNames: Record<string, string> = {
      'sword-parry': 'Sword Parry',
      'quick-click': 'Quick Click',
      'memory-color': 'Memory Color',
      'number-tap': 'Multi-Target Reaction',
      'shape-tap': 'Shape Tap',
      'reaction-test': 'Reaction Test'
    };
    return gameNames[gameType] || gameType;
  };

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameIcon = (gameType: string) => {
    const icons: Record<string, any> = {
      'sword-parry': <FireIcon className="w-5 h-5 text-red-500" />,
      'quick-click': <StarIcon className="w-5 h-5 text-yellow-500" />,
      'memory-color': <HeartIcon className="w-5 h-5 text-pink-500" />,
      'number-tap': <ChartBarIcon className="w-5 h-5 text-blue-500" />,
      'shape-tap': <TrophyIcon className="w-5 h-5 text-purple-500" />,
      'reaction-test': <ClockIcon className="w-5 h-5 text-green-500" />
    };
    return icons[gameType] || <TrophyIcon className="w-5 h-5 text-gray-500" />;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg mb-4">Please log in to view your dashboard</p>
              <Link href="/signin" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white">
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {userProfile?.username || 'Player'}!
              </h1>
              <p className="text-gray-400">Your gaming dashboard and statistics</p>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-4 shadow-lg">
              <div className="flex items-center">
                <BanknotesIcon className="w-8 h-8 text-white mr-3" />
                <div>
                  <p className="text-yellow-100 text-sm">Token Balance</p>
                  <p className="text-2xl font-bold text-white">{tokenBalance}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <TrophyIcon className="w-8 h-8 text-yellow-400 mr-3" />
              <div>
                <p className="text-purple-200 text-sm">Total Games</p>
                <p className="text-2xl font-bold text-white">{userStats.totalGames}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <StarIcon className="w-8 h-8 text-blue-400 mr-3" />
              <div>
                <p className="text-purple-200 text-sm">Practice Games</p>
                <p className="text-2xl font-bold text-white">{userStats.practiceGames}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <FireIcon className="w-8 h-8 text-red-400 mr-3" />
              <div>
                <p className="text-purple-200 text-sm">Competitions</p>
                <p className="text-2xl font-bold text-white">{userStats.competitionGames}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <ChartBarIcon className="w-8 h-8 text-green-400 mr-3" />
              <div>
                <p className="text-purple-200 text-sm">Average Score</p>
                <p className="text-2xl font-bold text-white">{Math.round(userStats.averageScore)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
            <div className="flex border-b border-white/20">
              {[
                { id: 'recent', label: 'Recent Games', icon: ClockIcon },
                { id: 'practice', label: 'Practice History', icon: StarIcon },
                { id: 'competition', label: 'Competition History', icon: TrophyIcon },
                { id: 'stats', label: 'Statistics', icon: ChartBarIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-6 py-4 text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5'
                      : 'text-purple-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
          {activeTab === 'recent' && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <ClockIcon className="w-6 h-6 mr-2 text-blue-500" />
                Recent Games
              </h2>
              {gameHistory.length === 0 ? (
                <div className="text-center py-8">
                  <TrophyIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No games played yet</p>
                  <Link href="/practice" className="text-blue-500 hover:text-blue-400 mt-2 inline-block">
                    Start playing now!
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {gameHistory.slice(0, 10).map((game) => (
                    <div key={game.id} className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                      <div className="flex items-center">
                        {getGameIcon(game.game_type)}
                        <div className="ml-4">
                          <p className="text-white font-medium capitalize">{formatGameType(game.game_type)}</p>
                          <p className="text-purple-200 text-sm">
                            {game.is_practice ? 'Practice' : 'Competition'} • {formatDate(game.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">{formatScore(game.score)}</p>
                        <p className="text-purple-200 text-sm">
                          {game.accuracy ? `${game.accuracy}% accuracy` : ''}
                          {game.tokens_won ? ` • +${game.tokens_won} tokens` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'practice' && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <StarIcon className="w-6 h-6 mr-2 text-yellow-500" />
                Practice History
              </h2>
              {gameHistory.filter(g => g.is_practice).length === 0 ? (
                <div className="text-center py-8">
                  <StarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No practice games yet</p>
                  <Link href="/practice" className="text-blue-500 hover:text-blue-400 mt-2 inline-block">
                    Start practicing!
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {gameHistory.filter(g => g.is_practice).slice(0, 10).map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        {getGameIcon(game.game_type)}
                        <div className="ml-3">
                          <p className="font-medium text-white">{formatGameType(game.game_type)}</p>
                          <p className="text-sm text-gray-400">{formatDate(game.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{formatScore(game.score)}</p>
                        <p className="text-sm text-gray-400">
                          {game.accuracy ? `${game.accuracy}% accuracy` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'competition' && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <TrophyIcon className="w-6 h-6 mr-2 text-red-500" />
                Competition History
              </h2>
              {gameHistory.filter(g => !g.is_practice).length === 0 ? (
                <div className="text-center py-8">
                  <TrophyIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No competitions entered yet</p>
                  <Link href="/tournaments" className="text-blue-500 hover:text-blue-400 mt-2 inline-block">
                    Enter a competition!
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {gameHistory.filter(g => !g.is_practice).slice(0, 10).map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        {getGameIcon(game.game_type)}
                        <div className="ml-3">
                          <p className="font-medium text-white">{formatGameType(game.game_type)}</p>
                          <p className="text-sm text-gray-400">
                            Competition • {formatDate(game.created_at)}
                            {game.entry_fee ? ` • $${game.entry_fee} entry` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{formatScore(game.score)}</p>
                        <p className="text-sm text-gray-400">
                          {game.tokens_won ? `+${game.tokens_won} tokens` : 'No win'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <ChartBarIcon className="w-6 h-6 mr-2 text-green-500" />
                Your High Scores
              </h2>
              {highScores.length === 0 ? (
                <div className="text-center py-8">
                  <ChartBarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No high scores yet</p>
                  <p className="text-sm text-gray-500">Play some games to see your best scores!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {highScores.map((score) => (
                    <div key={score.game_type} className="p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {getGameIcon(score.game_type)}
                          <h3 className="font-medium text-white ml-2">{formatGameType(score.game_type)}</h3>
                        </div>
                        <TrophyIcon className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-white">{formatScore(score.best_score)}</p>
                        <p className="text-sm text-gray-400">
                          {score.games_played} games played
                          {score.practice_games > 0 && ` • ${score.practice_games} practice`}
                          {score.competition_games > 0 && ` • ${score.competition_games} competitions`}
                        </p>
                        {score.best_accuracy && (
                          <p className="text-sm text-gray-400">
                            Best accuracy: {score.best_accuracy}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/games" className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-6 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <StarIcon className="w-8 h-8 mx-auto mb-3 group-hover:animate-pulse" />
            <p className="font-semibold text-lg">Practice Games</p>
            <p className="text-blue-100 text-sm">Improve your skills</p>
          </Link>
          
          <Link href="/tournaments" className="group bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-6 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <TrophyIcon className="w-8 h-8 mx-auto mb-3 group-hover:animate-pulse" />
            <p className="font-semibold text-lg">Enter Competition</p>
            <p className="text-red-100 text-sm">Win real prizes</p>
          </Link>
          
          <Link href="/buy-tokens" className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white p-6 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <BanknotesIcon className="w-8 h-8 mx-auto mb-3 group-hover:animate-pulse" />
            <p className="font-semibold text-lg">Buy Tokens</p>
            <p className="text-green-100 text-sm">Get more tokens</p>
          </Link>
        </div>
      </div>
    </div>
  );
}