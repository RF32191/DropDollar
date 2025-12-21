'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { UserService } from '@/lib/supabase/userService';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { 
  TrophyIcon, 
  StarIcon,
  BanknotesIcon,
  ChartBarIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';

// Format game type for display
const formatGameType = (gameType: string) => {
  const normalized = gameType?.toLowerCase().replace(/-/g, '_') || '';
  const gameNames: Record<string, string> = {
    'sword_parry': 'Sword Parry',
    'quick_click': 'Quick Click',
    'memory_color': 'Memory Color',
    'color_sequence': 'Color Sequence',
    'multi_target': 'Multi-Target',
    'multi_target_reaction': 'Multi-Target',
    'laser_dodge': 'Laser Dodge',
    'blade_bounce': 'Blade Bounce',
    'falling_object': 'Falling Objects',
    'falling_objects': 'Falling Objects',
    'cash_stack': 'Cash Stack',
    'penny_passer': 'Penny Passer',
    'coin_sorter': 'Penny Passer',
    'dead_shot': 'Dead Shot',
    'lightning_maze': 'Lightning Maze',
    'circuit_runner': 'Circuit Runner',
    'flippy_coin': 'Flippy Coin',
    'flappy_coin': 'Flippy Coin',
    'parry_pro': 'Parry Pro',
    'click_draw': 'Click Draw',
    'neon_striker': 'Neon Striker'
  };
  return gameNames[normalized] || gameType?.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Game';
};

export default function MobileOptimizedDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({
    totalGames: 0,
    practiceGames: 0,
    competitionGames: 0,
    totalScore: 0,
    avgScore: 0,
    bestScore: 0
  });

  useEffect(() => {
    if (user && isAuthenticated) {
      loadMobileData();
    }
  }, [user, isAuthenticated]);

  const loadMobileData = async () => {
    try {
      setIsLoading(true);
      
      // Mobile: Load only essential data with short timeout
      const data = await Promise.race([
        Promise.all([
          UserService.getUserProfile(user!.id).then(profile => {
            setTokenBalance(profile?.tokens || 0);
            return profile;
          }).catch(() => {
            setTokenBalance(0);
            return null;
          }),
          
          SimpleGameService.getUserGameHistory(user!.id, 5).catch(() => []),
          
          SimpleGameService.getUserGameStats(user!.id).catch(() => ({
            totalGames: 0,
            practiceGames: 0,
            competitionGames: 0,
            totalScore: 0,
            avgScore: 0,
            bestScore: 0
          }))
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Mobile timeout')), 1500)
        )
      ]);

      const [profile, games, stats] = data as any;
      setGameHistory(games);
      setUserStats(stats);

    } catch (error) {
      console.error('Mobile data load failed:', error);
      setTokenBalance(0);
      setGameHistory([]);
      setUserStats({
        totalGames: 0,
        practiceGames: 0,
        competitionGames: 0,
        totalScore: 0,
        avgScore: 0,
        bestScore: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Please log in to view your dashboard</h1>
            <Link href="/auth/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg">
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <div className="inline-flex items-center bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/20">
            <BanknotesIcon className="w-6 h-6 text-yellow-400 mr-3" />
            <span className="text-lg font-semibold">Tokens: {tokenBalance}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center mb-2">
              <TrophyIcon className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-white font-semibold">Games Played</span>
            </div>
            <div className="text-2xl font-bold text-white">{userStats.totalGames}</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center mb-2">
              <StarIcon className="w-5 h-5 text-blue-400 mr-2" />
              <span className="text-white font-semibold">Best Score</span>
            </div>
            <div className="text-2xl font-bold text-white">{userStats.bestScore}</div>
          </div>
        </div>

        {/* Recent Games */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Recent Games</h2>
          {gameHistory.length > 0 ? (
            <div className="space-y-3">
              {gameHistory.slice(0, 5).map((game, index) => (
                <div key={game.id || index} className="bg-white/5 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium capitalize">
                        {formatGameType(game.game_type)}
                      </div>
                      <div className="text-gray-300 text-sm">
                        {game.is_practice ? 'Practice' : 'Competition'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{game.score}</div>
                      <div className="text-gray-300 text-sm">{game.accuracy}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">No games played yet</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link 
            href="/games" 
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 text-center"
          >
            Practice Games
          </Link>
          
          <Link 
            href="/hot-sell" 
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 text-center"
          >
            Tournaments
          </Link>
        </div>
      </div>
    </div>
  );
}
