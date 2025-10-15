'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TrophyIcon, StarIcon, FireIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import CleanNavigation from '@/components/navigation/CleanNavigation';

interface GameResult {
  score: number;
  opponent?: string;
  opponentScore?: number;
  winner?: string;
  gameType: string;
  entryFee: number;
  matchId?: string;
  isWinner: boolean;
}

export default function PostGameResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<GameResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Get result from URL params or localStorage
    const score = parseFloat(searchParams.get('score') || '0');
    const gameType = searchParams.get('game') || 'quick-click';
    const entryFee = parseInt(searchParams.get('fee') || '1');
    const queueId = searchParams.get('queueId') || '';
    const matchId = searchParams.get('matchId') || '';

    // Try to get opponent info from localStorage
    const lastGameResult = localStorage.getItem('lastGameResult');
    let opponentInfo = null;
    if (lastGameResult) {
      try {
        opponentInfo = JSON.parse(lastGameResult);
      } catch (error) {
        console.error('Error parsing last game result:', error);
      }
    }

    const gameResult: GameResult = {
      score,
      opponent: opponentInfo?.opponent,
      opponentScore: opponentInfo?.opponentScore,
      winner: opponentInfo?.winner,
      gameType,
      entryFee,
      matchId: matchId || queueId,
      isWinner: opponentInfo?.winner === 'You' || opponentInfo?.winner === opponentInfo?.username
    };

    setResult(gameResult);

    // Show confetti if winner
    if (gameResult.isWinner) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [searchParams]);

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-white text-xl">Loading results...</div>
        </div>
      </div>
    );
  }

  const gameTypeDisplay = result.gameType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
          <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-red-400 rounded-full animate-bounce delay-100"></div>
          <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
          <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-green-400 rounded-full animate-bounce delay-300"></div>
          <div className="absolute top-3/4 left-1/2 w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-400"></div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Main Results Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-yellow-900/70 to-orange-900/70 backdrop-blur-xl p-8 rounded-3xl border-4 border-yellow-500/70 shadow-2xl">
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <TrophyIcon className="h-16 w-16 text-yellow-400 mr-4 animate-pulse" />
                <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {result.isWinner ? '🏆 VICTORY! 🏆' : '🎮 GAME COMPLETE'}
                </h1>
                <TrophyIcon className="h-16 w-16 text-yellow-400 ml-4 animate-pulse" />
              </div>
              <p className="text-xl text-yellow-200">
                {gameTypeDisplay} - ${result.entryFee} Entry
              </p>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              
              {/* Your Score */}
              <div className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-yellow-500/30">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4 flex items-center">
                  <ChartBarIcon className="h-6 w-6 mr-2" />
                  Your Performance
                </h3>
                <div className="space-y-3 text-white">
                  <div className="text-3xl font-bold text-yellow-400">
                    Score: {result.score.toFixed(2)}
                  </div>
                  <div className="text-lg">
                    <span className="text-yellow-400 font-semibold">Game:</span> {gameTypeDisplay}
                  </div>
                  <div className="text-lg">
                    <span className="text-yellow-400 font-semibold">Entry Fee:</span> ${result.entryFee}
                  </div>
                  <div className="text-lg">
                    <span className="text-yellow-400 font-semibold">Match ID:</span> {result.matchId}
                  </div>
                </div>
              </div>

              {/* Opponent Score */}
              <div className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-yellow-500/30">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4 flex items-center">
                  <FireIcon className="h-6 w-6 mr-2" />
                  {result.opponent ? 'Opponent' : 'Match Status'}
                </h3>
                <div className="space-y-3 text-white">
                  {result.opponent ? (
                    <>
                      <div className="text-3xl font-bold text-blue-400">
                        {result.opponent}
                      </div>
                      <div className="text-2xl font-bold text-blue-300">
                        Score: {result.opponentScore?.toFixed(2) || 'Pending...'}
                      </div>
                      <div className="text-lg">
                        <span className="text-blue-400 font-semibold">Status:</span> 
                        {result.opponentScore ? ' Completed' : ' Playing...'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-yellow-400">
                        Waiting for Opponent...
                      </div>
                      <div className="text-lg text-yellow-300">
                        Your score has been saved and will be matched when another player joins.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Winner Announcement */}
            {result.winner && (
              <div className="text-center mb-8">
                <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 rounded-2xl border-2 border-green-400">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    🏆 WINNER: {result.winner} 🏆
                  </h2>
                  <p className="text-xl text-green-200">
                    Prize: ${(result.entryFee * 2).toFixed(2)} tokens
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/tournaments')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Play Another Match
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                View Dashboard
              </button>
              <button
                onClick={() => router.push('/games')}
                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Practice Mode
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
