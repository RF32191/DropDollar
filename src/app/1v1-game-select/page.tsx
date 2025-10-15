'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/lib/supabase/userService';
import MatchmakingService from '@/lib/supabase/matchmakingService';
import CleanNavigation from '@/components/navigation/CleanNavigation';

const AVAILABLE_GAMES = [
  { 
    id: 'quick-click', 
    name: 'Quick Click', 
    emoji: '⚡', 
    description: 'Test your reaction speed!',
    gradient: 'from-yellow-500 to-orange-500'
  },
  { 
    id: 'memory-color', 
    name: 'Color Sequence', 
    emoji: '🎨', 
    description: 'Remember the pattern!',
    gradient: 'from-purple-500 to-pink-500'
  },
  { 
    id: 'laser-dodge', 
    name: 'Laser Dodge EXTREME', 
    emoji: '🔴', 
    description: 'Dodge the lasers!',
    gradient: 'from-red-500 to-orange-600'
  },
  { 
    id: 'coin-catch', 
    name: 'Coin Catch', 
    emoji: '💰', 
    description: 'Catch falling coins!',
    gradient: 'from-yellow-600 to-amber-500'
  },
  { 
    id: 'multi-target', 
    name: 'Multi-Target Reaction', 
    emoji: '🎯', 
    description: 'Click all highlighted targets fast!',
    gradient: 'from-blue-500 to-cyan-500'
  },
  { 
    id: 'sword-parry', 
    name: 'Sword Parry', 
    emoji: '⚔️', 
    description: 'Parry incoming swords!',
    gradient: 'from-green-500 to-emerald-500'
  }
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
      const queue = await MatchmakingService.joinQueue(
        user.id,
        user.username || user.email || 'Anonymous',
        entryFee,
        1000, // Default skill rating
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
      'multi-target': [
        '🎯 Click all highlighted targets as fast as possible',
        '⚡ Multiple targets appear at once',
        '📊 Speed and accuracy both matter',
        '🏆 Fastest completion time wins!'
      ],
      'sword-parry': [
        '⚔️ Parry incoming swords at the right moment',
        '⚡ Perfect timing is everything',
        '❌ Miss a parry = lose points',
        '🏆 Most successful parries wins!'
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
            <p className="text-lg text-white mt-2">Entry Fee: ${entryFee} | Prize: ${(entryFee + entryFee * 0.85).toFixed(2)}</p>
            <p className="text-sm text-gray-400 mt-2">Your Tokens: {userTokens}</p>
          </div>

          {/* Game Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {AVAILABLE_GAMES.map((game) => (
              <div
                key={game.id}
                onClick={() => handleGameSelect(game.id)}
                className={`relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl overflow-hidden shadow-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                  selectedGame === game.id
                    ? 'border-yellow-500 shadow-yellow-500/50'
                    : 'border-purple-500/30 hover:border-purple-500/50'
                }`}
              >
                {/* Game Preview/Screenshot Area */}
                <div className={`h-48 bg-gradient-to-br ${game.gradient} relative overflow-hidden`}>
                  {/* Animated Game Preview */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-9xl opacity-30 animate-pulse">{game.emoji}</div>
                  </div>
                  
                  {/* Animated Game Simulations */}
                  {game.id === 'quick-click' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {/* Screen that flashes red then green */}
                      <div className="absolute inset-0 bg-red-600 animate-pulse" style={{animationDuration: '2s'}}></div>
                      <div className="absolute inset-0 bg-green-500 animate-ping" style={{animationDuration: '2s', animationDelay: '1s'}}></div>
                      <div className="relative z-10 text-white text-6xl font-black animate-pulse">
                        CLICK!
                      </div>
                    </div>
                  )}
                  
                  {game.id === 'memory-color' && (
                    <div className="absolute inset-0 p-4">
                      {/* Animated sequence showing colors lighting up */}
                      <div className="grid grid-cols-2 gap-2 h-full">
                        <div className="bg-red-500 rounded-lg transition-all duration-300" 
                             style={{
                               animation: 'flash 4s infinite',
                               animationDelay: '0s'
                             }}></div>
                        <div className="bg-blue-500 rounded-lg transition-all duration-300"
                             style={{
                               animation: 'flash 4s infinite',
                               animationDelay: '0.5s'
                             }}></div>
                        <div className="bg-green-500 rounded-lg transition-all duration-300"
                             style={{
                               animation: 'flash 4s infinite',
                               animationDelay: '1s'
                             }}></div>
                        <div className="bg-yellow-500 rounded-lg transition-all duration-300"
                             style={{
                               animation: 'flash 4s infinite',
                               animationDelay: '1.5s'
                             }}></div>
                      </div>
                    </div>
                  )}
                  
                  {game.id === 'laser-dodge' && (
                    <div className="absolute inset-0 overflow-hidden bg-black/50">
                      {/* Moving lasers with player avatar */}
                      <div className="absolute h-2 w-full bg-gradient-to-r from-transparent via-red-500 to-transparent top-1/4"
                           style={{
                             animation: 'slideRight 2s infinite linear'
                           }}></div>
                      <div className="absolute h-2 w-full bg-gradient-to-r from-transparent via-red-500 to-transparent top-1/2"
                           style={{
                             animation: 'slideLeft 1.5s infinite linear',
                             animationDelay: '0.3s'
                           }}></div>
                      <div className="absolute h-2 w-full bg-gradient-to-r from-transparent via-red-500 to-transparent top-3/4"
                           style={{
                             animation: 'slideRight 2.5s infinite linear',
                             animationDelay: '0.6s'
                           }}></div>
                      {/* Player avatar dodging */}
                      <div className="absolute left-8 w-8 h-8 bg-white rounded-full"
                           style={{
                             animation: 'dodge 3s infinite ease-in-out'
                           }}></div>
                    </div>
                  )}
                  
                  {game.id === 'coin-catch' && (
                    <div className="absolute inset-0 overflow-hidden">
                      {/* Falling coins with basket at bottom */}
                      <div className="text-4xl absolute"
                           style={{
                             left: '20%',
                             animation: 'fall 2s infinite linear'
                           }}>💰</div>
                      <div className="text-4xl absolute"
                           style={{
                             left: '50%',
                             animation: 'fall 2.5s infinite linear',
                             animationDelay: '0.5s'
                           }}>💰</div>
                      <div className="text-4xl absolute"
                           style={{
                             left: '75%',
                             animation: 'fall 3s infinite linear',
                             animationDelay: '1s'
                           }}>💰</div>
                      {/* Moving basket */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="text-5xl" style={{animation: 'moveBasket 3s infinite ease-in-out'}}>🧺</div>
                      </div>
                    </div>
                  )}
                  
                  {game.id === 'multi-target' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {/* Colored circles highlighting on and off */}
                      <div className="relative grid grid-cols-3 gap-4 p-8">
                        {[
                          { color: 'bg-red-500', delay: 0 },
                          { color: 'bg-blue-500', delay: 0.3 },
                          { color: 'bg-green-500', delay: 0.6 },
                          { color: 'bg-yellow-500', delay: 0.9 },
                          { color: 'bg-purple-500', delay: 1.2 },
                          { color: 'bg-pink-500', delay: 1.5 },
                          { color: 'bg-orange-500', delay: 1.8 },
                          { color: 'bg-cyan-500', delay: 2.1 },
                          { color: 'bg-indigo-500', delay: 2.4 }
                        ].map((target, idx) => (
                          <div
                            key={idx}
                            className={`w-12 h-12 ${target.color} rounded-full`}
                            style={{
                              animation: 'popIn 3s infinite',
                              animationDelay: `${target.delay}s`,
                              opacity: 0.3
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {game.id === 'sword-parry' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {/* Swords appearing and disappearing with tapping animation */}
                      <div className="relative w-full h-full">
                        <div className="absolute text-5xl"
                             style={{
                               top: '20%',
                               left: '20%',
                               animation: 'popScale 2s infinite',
                               animationDelay: '0s'
                             }}>⚔️</div>
                        <div className="absolute text-5xl"
                             style={{
                               top: '60%',
                               right: '25%',
                               animation: 'popScale 2s infinite',
                               animationDelay: '0.4s',
                               transform: 'rotate(45deg)'
                             }}>⚔️</div>
                        <div className="absolute text-5xl"
                             style={{
                               top: '40%',
                               left: '50%',
                               animation: 'popScale 2s infinite',
                               animationDelay: '0.8s',
                               transform: 'rotate(-45deg)'
                             }}>⚔️</div>
                        <div className="absolute text-5xl"
                             style={{
                               top: '25%',
                               right: '15%',
                               animation: 'popScale 2s infinite',
                               animationDelay: '1.2s',
                               transform: 'rotate(90deg)'
                             }}>⚔️</div>
                      </div>
                    </div>
                  )}
                  
                  {/* CSS Animations */}
                  <style jsx>{`
                    @keyframes flash {
                      0%, 100% { opacity: 0.3; transform: scale(0.95); }
                      25% { opacity: 1; transform: scale(1.05); box-shadow: 0 0 30px rgba(255,255,255,0.8); }
                      50%, 75% { opacity: 0.3; transform: scale(0.95); }
                    }
                    @keyframes slideRight {
                      0% { transform: translateX(-100%); }
                      100% { transform: translateX(200%); }
                    }
                    @keyframes slideLeft {
                      0% { transform: translateX(200%); }
                      100% { transform: translateX(-100%); }
                    }
                    @keyframes dodge {
                      0%, 100% { top: 20%; }
                      33% { top: 50%; }
                      66% { top: 75%; }
                    }
                    @keyframes fall {
                      0% { top: -20%; opacity: 1; }
                      90% { opacity: 1; }
                      100% { top: 100%; opacity: 0; }
                    }
                    @keyframes moveBasket {
                      0%, 100% { transform: translateX(-50%) translateX(-40px); }
                      50% { transform: translateX(-50%) translateX(40px); }
                    }
                    @keyframes popIn {
                      0%, 90% { opacity: 0; transform: scale(0); }
                      10%, 80% { opacity: 1; transform: scale(1); }
                    }
                    @keyframes popScale {
                      0%, 100% { opacity: 0; transform: scale(0); }
                      50% { opacity: 1; transform: scale(1); }
                    }
                  `}</style>
                  
                  {/* Play icon overlay */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 rounded-full p-4">
                      <svg className="w-8 h-8 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Game Info */}
                <div className="p-6 text-center">
                  <h3 className="text-2xl font-black text-white mb-2">{game.name}</h3>
                  <p className="text-gray-400 text-sm">{game.description}</p>
                </div>
                
                {/* Selected Indicator */}
                {selectedGame === game.id && (
                  <div className="absolute top-4 right-4 bg-yellow-500 rounded-full p-2 shadow-lg">
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
                Both players use the same RNG seed for fairness. Highest score wins ${(entryFee + entryFee * 0.85).toFixed(2)}!
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

