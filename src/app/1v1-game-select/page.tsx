'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/lib/supabase/userService';
import MatchmakingService from '@/lib/supabase/matchmakingService';
import CleanNavigation from '@/components/navigation/CleanNavigation';

const AVAILABLE_GAMES = [
  { id: 'quick-click', name: 'Quick Click', emoji: '⚡', description: 'Test your reaction speed!' },
  { id: 'memory-color', name: 'Color Sequence', emoji: '🎨', description: 'Remember the pattern!' },
  { id: 'laser-dodge', name: 'Laser Dodge EXTREME', emoji: '🔴', description: 'Dodge the lasers!' },
  { id: 'coin-catch', name: 'Coin Catch', emoji: '💰', description: 'Catch falling coins!' },
  { id: 'number-dash', name: 'Number Dash', emoji: '🔢', description: 'Click numbers in order!' },
  { id: 'shape-tap', name: 'Shape Tap', emoji: '🔷', description: 'Tap the right shapes!' }
];

function GameSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const entryFee = parseInt(searchParams.get('fee') || '1');
  const tier = searchParams.get('tier') || '$1 Quick Match';
  
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [userTokens, setUserTokens] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Give auth context time to load
    const timer = setTimeout(() => {
      if (!user) {
        router.push('/auth/login');
      } else {
        loadUserTokens();
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [user]);

  const loadUserTokens = async () => {
    if (!user?.id) return;
    try {
      const profile = await UserService.getUserProfile(user.id);
      setUserTokens(profile?.tokens || 0);
    } catch (err) {
      console.error('Error loading tokens:', err);
    }
  };

  const handleGameSelect = (gameId: string) => {
    setSelectedGame(gameId);
    setShowRules(true);
  };

  const handleJoinMatch = async () => {
    if (!selectedGame || !user) return;

    if (userTokens < entryFee) {
      alert(`Insufficient tokens! You need ${entryFee} but have ${userTokens}.`);
      router.push('/buy-tokens');
      return;
    }

    setIsJoining(true);

    try {
      // Deduct tokens
      const newBalance = userTokens - entryFee;
      await UserService.updateUserTokens(user.id, newBalance);

      // Record transaction
      await UserService.addTokenTransaction({
        user_id: user.id,
        amount: -entryFee,
        type: 'game_entry',
        description: `1v1 Match Entry - ${tier}`,
        balance_before: userTokens,
        balance_after: newBalance,
        metadata: {
          match_type: '1v1',
          entry_fee: entryFee,
          tier: tier,
          game_type: selectedGame
        }
      });

      // Join matchmaking queue with selected game
      const skillRating = await MatchmakingService.getUserSkillRating(user.id);
      const queue = await MatchmakingService.joinQueue(
        user.id,
        user.username || user.email || 'Anonymous',
        entryFee,
        skillRating,
        selectedGame // Pass the game type for matching
      );

      if (!queue) {
        throw new Error('Failed to join matchmaking queue');
      }

      // Redirect to matchmaking page with game selected
      router.push(`/1v1-matchmaking?fee=${entryFee}&tier=${encodeURIComponent(tier)}&game=${selectedGame}&queueId=${queue.id}`);

    } catch (error: any) {
      console.error('❌ [1v1] Error joining match:', error);
      alert(error.message || 'Failed to join match. Please try again.');
      setIsJoining(false);
    }
  };

  const getGameRules = (gameId: string) => {
    const rules: Record<string, string[]> = {
      'quick-click': [
        '⚡ Click as fast as you can when the screen turns green',
        '⏱️ 5 rounds of reaction testing',
        '🎯 Lower time = Higher score',
        '🏆 Fastest total time wins!'
      ],
      'memory-color': [
        '🎨 Watch the color sequence carefully',
        '🧠 Remember and repeat the pattern',
        '📈 Sequence gets longer each round',
        '🏆 Most rounds completed wins!'
      ],
      'laser-dodge': [
        '🔴 Dodge the red lasers',
        '⬆️⬇️ Use arrow keys to move up/down',
        '⏱️ Survive as long as possible',
        '🏆 Longest survival time wins!'
      ],
      'coin-catch': [
        '💰 Catch falling gold coins',
        '⬅️➡️ Use arrow keys to move',
        '⚠️ Avoid bombs (lose points)',
        '🏆 Most coins collected wins!'
      ],
      'number-dash': [
        '🔢 Click numbers in ascending order',
        '⏱️ Race against the clock',
        '📊 10 numbers per round',
        '🏆 Fastest time wins!'
      ],
      'shape-tap': [
        '🔷 Tap only the correct shapes',
        '⚡ Speed and accuracy both matter',
        '❌ Wrong taps = penalty',
        '🏆 Highest accuracy + speed wins!'
      ]
    };
    return rules[gameId] || [];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">🎮</div>
          <p className="text-white text-xl">Loading game selection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation variant="gradient" currentPage="/tournaments" />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-white mb-4">
              ⚔️ SELECT YOUR GAME
            </h1>
            <p className="text-xl text-purple-300">{tier}</p>
            <p className="text-lg text-white mt-2">Entry Fee: ${entryFee} | Prize: ${(entryFee * 2 * 0.85).toFixed(2)}</p>
            <p className="text-sm text-gray-400 mt-2">Your Tokens: {userTokens}</p>
          </div>

          {/* Game Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {AVAILABLE_GAMES.map((game) => (
              <div
                key={game.id}
                onClick={() => handleGameSelect(game.id)}
                className={`relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-8 shadow-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                  selectedGame === game.id
                    ? 'border-yellow-500 shadow-yellow-500/50'
                    : 'border-purple-500/30 hover:border-purple-500/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">{game.emoji}</div>
                  <h3 className="text-2xl font-black text-white mb-2">{game.name}</h3>
                  <p className="text-gray-400 text-sm">{game.description}</p>
                </div>
                
                {selectedGame === game.id && (
                  <div className="absolute top-4 right-4 bg-yellow-500 rounded-full p-2">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Button */}
          {selectedGame && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowRules(true)}
                className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-black py-4 px-12 rounded-xl transition-all hover:scale-105 shadow-2xl text-lg"
              >
                🎮 CONTINUE TO MATCHMAKING
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && selectedGame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-2xl w-full border-2 border-purple-500/30 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-7xl mb-4">
                {AVAILABLE_GAMES.find(g => g.id === selectedGame)?.emoji}
              </div>
              <h2 className="text-4xl font-black text-white mb-2">
                {AVAILABLE_GAMES.find(g => g.id === selectedGame)?.name}
              </h2>
              <p className="text-purple-300">Game Rules</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">📋 How to Play:</h3>
              <ul className="space-y-3">
                {getGameRules(selectedGame).map((rule, index) => (
                  <li key={index} className="text-gray-300 text-lg flex items-start">
                    <span className="mr-3">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 mb-6">
              <p className="text-yellow-300 text-center text-sm">
                ⚔️ <strong>1v1 Match:</strong> You'll play against an opponent with similar skill.
                Both players use the same RNG seed for fairness. Highest score wins {(entryFee * 2 * 0.85).toFixed(2)}!
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowRules(false)}
                disabled={isJoining}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleJoinMatch}
                disabled={isJoining}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? '⏳ Joining Match...' : '✅ READY - JOIN MATCH'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GameSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading game selection...</div>
      </div>
    }>
      <GameSelectContent />
    </Suspense>
  );
}

