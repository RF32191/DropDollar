'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { 
  StarIcon, 
  TrophyIcon, 
  FireIcon,
  BoltIcon,
  PuzzlePieceIcon,
  CursorArrowRaysIcon,
  MusicalNoteIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  ChartBarIcon,
  UserIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const PRACTICE_GAMES = [
  {
    id: 'sword-parry',
    name: 'Sword Parry',
    description: 'Defend against incoming attacks',
    icon: <FireIcon className="w-8 h-8 text-red-500" />,
    difficulty: 'Medium',
    avgScore: 1500,
    color: 'from-red-500 to-orange-500'
  },
  {
    id: 'quick-click',
    name: 'Quick Click',
    description: 'React as fast as possible',
    icon: <BoltIcon className="w-8 h-8 text-yellow-500" />,
    difficulty: 'Easy',
    avgScore: 2000,
    color: 'from-yellow-500 to-amber-500'
  },
  {
    id: 'memory-color',
    name: 'Memory Color',
    description: 'Remember the color sequence',
    icon: <PuzzlePieceIcon className="w-8 h-8 text-purple-500" />,
    difficulty: 'Hard',
    avgScore: 1200,
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'multi-target',
    name: 'Multi-Target Reaction',
    description: 'Hit multiple targets quickly',
    icon: <CursorArrowRaysIcon className="w-8 h-8 text-blue-500" />,
    difficulty: 'Medium',
    avgScore: 1800,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'laser-dodge',
    name: 'Laser Dodge',
    description: 'Avoid incoming lasers',
    icon: <SparklesIcon className="w-8 h-8 text-green-500" />,
    difficulty: 'Hard',
    avgScore: 1400,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'falling-object',
    name: 'Falling Objects',
    description: 'Catch falling objects',
    icon: <DevicePhoneMobileIcon className="w-8 h-8 text-indigo-500" />,
    difficulty: 'Easy',
    avgScore: 1600,
    color: 'from-indigo-500 to-blue-500'
  }
];

export default function PracticePage() {
  const router = useRouter();
  const [userStats, setUserStats] = useState<{[key: string]: {bestScore: number, gamesPlayed: number}}>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      // Load user's best scores for each game
      const stats: {[key: string]: {bestScore: number, gamesPlayed: number}} = {};
      
      // Get stats from localStorage for now (will be replaced with Supabase)
      PRACTICE_GAMES.forEach(game => {
        const bestScore = localStorage.getItem(`bestScore_${game.id}`) || '0';
        const gamesPlayed = localStorage.getItem(`gamesPlayed_${game.id}`) || '0';
        stats[game.id] = {
          bestScore: parseInt(bestScore),
          gamesPlayed: parseInt(gamesPlayed)
        };
      });
      
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPracticeGame = (gameId: string) => {
    // Navigate to games page with practice mode
    router.push(`/games?game=${gameId}&mode=practice`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400 bg-green-900/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'Hard': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg">Loading practice games...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
            <StarIcon className="w-10 h-10 text-yellow-500 mr-3" />
            Practice Games
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Improve your skills and master each game. Practice makes perfect!
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <TrophyIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Games Played</p>
            <p className="text-2xl font-bold text-white">
              {Object.values(userStats).reduce((sum, stat) => sum + stat.gamesPlayed, 0)}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <ChartBarIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Best Overall Score</p>
            <p className="text-2xl font-bold text-white">
              {Math.max(...Object.values(userStats).map(stat => stat.bestScore), 0).toLocaleString()}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <FireIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Games Mastered</p>
            <p className="text-2xl font-bold text-white">
              {Object.values(userStats).filter(stat => stat.gamesPlayed > 0).length}
            </p>
          </div>
        </div>

        {/* Practice Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRACTICE_GAMES.map((game) => {
            const userStat = userStats[game.id] || { bestScore: 0, gamesPlayed: 0 };
            const isPlayed = userStat.gamesPlayed > 0;
            
            return (
              <div
                key={game.id}
                className={`bg-gradient-to-br ${game.color} rounded-lg p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
                onClick={() => startPracticeGame(game.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {game.icon}
                    <h3 className="text-xl font-bold text-white ml-3">{game.name}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(game.difficulty)}`}>
                    {game.difficulty}
                  </span>
                </div>
                
                <p className="text-white/80 text-sm mb-4">{game.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Your Best:</span>
                    <span className="text-white font-bold">
                      {isPlayed ? userStat.bestScore.toLocaleString() : 'Not played'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Games Played:</span>
                    <span className="text-white font-bold">{userStat.gamesPlayed}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Avg Score:</span>
                    <span className="text-white font-bold">{game.avgScore.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-center text-white font-medium">
                    <StarIcon className="w-4 h-4 mr-1" />
                    Start Practice
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link 
            href="/tournaments" 
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white p-6 rounded-lg text-center transition-all duration-300 transform hover:scale-105"
          >
            <TrophyIcon className="w-8 h-8 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Enter Competition</h3>
            <p className="text-white/80">Ready to compete? Join tournaments and win real prizes!</p>
          </Link>
          
          <Link 
            href="/dashboard" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-lg text-center transition-all duration-300 transform hover:scale-105"
          >
            <ChartBarIcon className="w-8 h-8 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">View Dashboard</h3>
            <p className="text-white/80">Check your progress and game history</p>
          </Link>
        </div>

        {/* Tips Section */}
        <div className="mt-12 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <SparklesIcon className="w-6 h-6 text-yellow-500 mr-2" />
            Practice Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-gray-300">• Practice regularly to improve your reaction time</p>
              <p className="text-gray-300">• Focus on accuracy over speed initially</p>
              <p className="text-gray-300">• Try different games to develop various skills</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-300">• Warm up with easier games before harder ones</p>
              <p className="text-gray-300">• Track your progress to see improvement</p>
              <p className="text-gray-300">• Take breaks to avoid fatigue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
