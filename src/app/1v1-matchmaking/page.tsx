'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MatchmakingService from '@/lib/supabase/matchmakingService';
import { generate20Seeds } from '@/lib/rngSeeds';
import CleanNavigation from '@/components/navigation/CleanNavigation';

function MatchmakingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const entryFee = parseInt(searchParams.get('fee') || '1');
  const tier = searchParams.get('tier') || '$1 Quick Match';
  const gameType = searchParams.get('game') || 'quick-click';
  const queueId = searchParams.get('queueId');
  
  const [status, setStatus] = useState<'searching' | 'matched' | 'starting' | 'error'>('searching');
  const [message, setMessage] = useState('Finding opponent with similar skill...');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !queueId) {
      router.push('/tournaments');
      return;
    }
  }, [user, queueId]);

  // Poll for match every 2 seconds
  useEffect(() => {
    if (status === 'searching' && queueId) {
      const interval = setInterval(async () => {
        setSearchTime(prev => prev + 2);
        const skillRating = await MatchmakingService.getUserSkillRating(user!.id);
        const match = await MatchmakingService.findMatch(
          queueId,
          user!.id,
          user!.username || user!.email || 'Anonymous',
          entryFee,
          skillRating
        );
        
        if (match) {
          clearInterval(interval);
          setMatchId(match.id);
          setStatus('matched');
          setMessage(`Match found! Get ready...`);
          
          // Start countdown after 2 seconds
          setTimeout(() => {
            startGameCountdown(match.id);
          }, 2000);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [status, queueId, user]);

  const startGameCountdown = async (matchIdParam: string) => {
    setStatus('starting');
    setMessage('Game starting...');
    
    // Generate RNG seeds for this match
    const seeds = generate20Seeds();
    
    // 5 second countdown
    for (let i = 5; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setCountdown(null);
    
    // Redirect to game with match info and RNG seed
    const gameUrl = `/games?match=${matchIdParam}&game=${gameType}&fee=${entryFee}&seed=${seeds[0]}&matchmaking=true`;
    router.push(gameUrl);
  };

  const handleCancel = async () => {
    if (queueId) {
      await MatchmakingService.cancelQueue(queueId);
    }
    router.push('/tournaments');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation variant="gradient" currentPage="/tournaments" />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-white mb-4">
              ⚔️ 1v1 MATCHMAKING
            </h1>
            <p className="text-xl text-purple-300">{tier}</p>
            <p className="text-lg text-white mt-2">Game: {gameType.replace('-', ' ').toUpperCase()}</p>
            <p className="text-sm text-gray-400 mt-2">Entry: ${entryFee} | Prize: ${(entryFee * 2 * 0.85).toFixed(2)}</p>
          </div>

          {/* Status Card */}
          <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-12 shadow-2xl border-2 border-purple-500/30">
            {/* Animated Icon */}
            <div className="text-center mb-8">
              {countdown !== null ? (
                <div className="text-9xl font-black text-yellow-400 animate-pulse">
                  {countdown}
                </div>
              ) : status === 'searching' ? (
                <div className="text-8xl animate-bounce">🔍</div>
              ) : status === 'matched' ? (
                <div className="text-8xl animate-pulse">✅</div>
              ) : status === 'starting' ? (
                <div className="text-8xl animate-spin">🎮</div>
              ) : (
                <div className="text-8xl">❌</div>
              )}
            </div>

            {/* Status Message */}
            <h2 className="text-3xl font-bold text-white text-center mb-6">
              {countdown !== null ? 'GET READY!' : message}
            </h2>

            {/* Search Timer */}
            {status === 'searching' && countdown === null && (
              <div className="text-center mb-8">
                <p className="text-gray-400 text-lg mb-2">Searching for opponent...</p>
                <p className="text-2xl font-mono text-purple-400">{searchTime}s</p>
                <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse"
                    style={{width: `${Math.min((searchTime / 30) * 100, 100)}%`}}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Skill-based matching in progress...</p>
              </div>
            )}

            {/* Match Found Animation */}
            {status === 'matched' && countdown === null && (
              <div className="text-center mb-8">
                <div className="animate-bounce">
                  <p className="text-2xl text-green-400 font-bold mb-2">🎉 OPPONENT FOUND!</p>
                  <p className="text-gray-400">Preparing game...</p>
                </div>
              </div>
            )}

            {/* Countdown Instructions */}
            {countdown !== null && (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 mb-6">
                <p className="text-yellow-300 text-center text-sm">
                  🎮 <strong>Both players will use the same RNG seed for fairness!</strong>
                  <br/>Highest score wins the match!
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {status === 'searching' && countdown === null && (
              <div className="space-y-4">
                <button
                  onClick={handleCancel}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all"
                >
                  ❌ Cancel Search
                </button>
              </div>
            )}

            {/* Info */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-sm text-gray-400 text-center">
                💡 <strong>How 1v1 Works:</strong> We match you with players of similar skill level.
                Both play the same game with identical RNG. Winner gets ${(entryFee * 2 * 0.85).toFixed(2)}!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchmakingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading matchmaking...</div>
      </div>
    }>
      <MatchmakingContent />
    </Suspense>
  );
}
