'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CleanNavigation from '@/components/navigation/CleanNavigation';

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const score = parseInt(searchParams.get('score') || '0');
  const gameType = searchParams.get('game') || 'quick-click';
  const entryFee = parseInt(searchParams.get('fee') || '1');
  const prizeAmount = (entryFee * 2 * 0.85).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation variant="gradient" currentPage="/tournaments" />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="text-8xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-5xl font-black text-white mb-4">
              GAME COMPLETE!
            </h1>
            <p className="text-2xl text-purple-300">Nice work!</p>
          </div>

          {/* Score Card */}
          <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-12 shadow-2xl border-2 border-yellow-500/30 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-gray-400 text-lg mb-2">Your Score</h2>
              <div className="text-7xl font-black text-yellow-400 mb-4">
                {score.toLocaleString()}
              </div>
              <p className="text-xl text-white">
                {gameType.replace('-', ' ').toUpperCase()}
              </p>
            </div>

            <div className="bg-purple-500/20 border border-purple-500 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-3 text-center">
                🎯 What Happens Next
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✅</span>
                  <span>Your score has been saved</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">🔍</span>
                  <span>We're matching you with opponents who chose the same game</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">⚔️</span>
                  <span>When matched, highest score wins ${prizeAmount}!</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">💰</span>
                  <span>Winnings will be added to your wallet automatically</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Match Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Entry Fee</p>
                <p className="text-2xl font-bold text-white">${entryFee}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Potential Prize</p>
                <p className="text-2xl font-bold text-yellow-400">${prizeAmount}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg"
            >
              📊 View Dashboard
            </button>
            <button
              onClick={() => router.push('/tournaments')}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg"
            >
              ⚔️ Play Another 1v1
            </button>
            <button
              onClick={() => router.push('/games')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              🎮 Practice Mode
            </button>
          </div>

          {/* Info Note */}
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>💡 Check your dashboard to see if you've been matched yet!</p>
            <p className="mt-2">Matching happens automatically when someone else plays the same game.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading results...</div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}

