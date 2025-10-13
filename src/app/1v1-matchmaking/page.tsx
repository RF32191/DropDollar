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
  
  const [status, setStatus] = useState<'starting' | 'error'>('starting');
  const [message, setMessage] = useState('Get ready to play!');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !queueId) {
      router.push('/tournaments');
      return;
    }

    // Start game immediately after 1 second
    const timer = setTimeout(() => {
      startGameCountdown();
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, queueId]);

  const startGameCountdown = async () => {
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
    
    // Redirect to dedicated 1v1 play page with queue info
    const gameUrl = `/1v1-play?queue=${queueId}&game=${gameType}&fee=${entryFee}&seed=${seeds[0]}`;
    router.push(gameUrl);
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
              ) : (
                <div className="text-8xl animate-spin">🎮</div>
              )}
            </div>

            {/* Status Message */}
            <h2 className="text-3xl font-bold text-white text-center mb-6">
              {countdown !== null ? 'GET READY!' : message}
            </h2>

            {/* Countdown Instructions */}
            {countdown !== null ? (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 mb-6">
                <p className="text-yellow-300 text-center text-sm">
                  🎮 <strong>Play your best! You'll be matched with opponents who chose the same game.</strong>
                  <br/>Highest score wins the match!
                </p>
              </div>
            ) : (
              <div className="bg-purple-500/20 border border-purple-500 rounded-xl p-4 mb-6">
                <p className="text-purple-300 text-center">
                  ⚡ <strong>You'll play immediately!</strong>
                  <br/>
                  <span className="text-sm text-gray-300">
                    We'll match you with an opponent who chose {gameType.replace('-', ' ')} at the same entry fee.
                    If no one's available now, we'll match you when someone plays!
                  </span>
                </p>
              </div>
            )}

            {/* Info */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-sm text-gray-400 text-center">
                💡 <strong>How 1v1 Works (Like Triumph):</strong> Play immediately, then we match you retroactively.
                Both players use identical RNG. Winner gets ${(entryFee * 2 * 0.85).toFixed(2)}!
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
