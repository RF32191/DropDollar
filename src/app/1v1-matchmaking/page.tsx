'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/lib/supabase/userService';
import MatchmakingService from '@/lib/supabase/matchmakingService';
import CleanNavigation from '@/components/navigation/CleanNavigation';

function MatchmakingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const entryFee = parseInt(searchParams.get('fee') || '1');
  const tier = searchParams.get('tier') || '$1 Quick Match';
  
  const [status, setStatus] = useState<'checking' | 'joining' | 'searching' | 'matched' | 'error'>('checking');
  const [message, setMessage] = useState('Checking your tokens...');
  const [userTokens, setUserTokens] = useState(0);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    checkTokensAndJoin();
  }, [user]);

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
          setMessage(`Match found! Starting game...`);
          
          // Redirect to game with match info
          setTimeout(() => {
            router.push(`/games?match=${match.id}&fee=${entryFee}`);
          }, 2000);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [status, queueId, user]);

  const checkTokensAndJoin = async () => {
    if (!user) return;

    try {
      setStatus('checking');
      setMessage('Checking your token balance...');

      const profile = await UserService.getUserProfile(user.id);
      const tokens = profile?.tokens || 0;
      setUserTokens(tokens);

      if (tokens < entryFee) {
        setStatus('error');
        setMessage(`Insufficient tokens! You need ${entryFee} tokens but only have ${tokens}.`);
        setTimeout(() => router.push('/buy-tokens'), 3000);
        return;
      }

      // Deduct tokens
      setStatus('joining');
      setMessage('Deducting tokens and joining queue...');
      
      const newBalance = tokens - entryFee;
      await UserService.updateUserTokens(user.id, newBalance);

      // Record transaction
      await UserService.addTokenTransaction({
        user_id: user.id,
        amount: -entryFee,
        type: 'game_entry',
        description: `Joined 1v1 matchmaking - ${tier}`,
        balance_before: tokens,
        balance_after: newBalance,
        metadata: {
          match_type: '1v1',
          entry_fee: entryFee,
          tier: tier
        }
      });

      // Transfer to Stripe escrow
      await fetch('/api/escrow/transfer-to-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: entryFee,
          type: '1v1_match',
          metadata: {
            tier: tier,
            user_email: user.email || user.username
          }
        })
      });

      setUserTokens(newBalance);

      // Join matchmaking queue
      const skillRating = await MatchmakingService.getUserSkillRating(user.id);
      const queue = await MatchmakingService.joinQueue(
        user.id,
        user.username || user.email || 'Anonymous',
        entryFee,
        skillRating
      );

      if (!queue) {
        throw new Error('Failed to join matchmaking queue');
      }

      setQueueId(queue.id);
      setStatus('searching');
      setMessage(`Finding opponent with similar skill level...`);

    } catch (error: any) {
      console.error('❌ [Matchmaking] Error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to join matchmaking. Please try again.');
    }
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
            <p className="text-lg text-white mt-2">Entry Fee: ${entryFee} (Prize: ${(entryFee * 2 * 0.85).toFixed(2)})</p>
          </div>

          {/* Status Card */}
          <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-12 shadow-2xl border-2 border-purple-500/30">
            {/* Animated Icon */}
            <div className="text-center mb-8">
              {status === 'checking' && (
                <div className="text-8xl animate-pulse">⏳</div>
              )}
              {status === 'joining' && (
                <div className="text-8xl animate-spin">🎮</div>
              )}
              {status === 'searching' && (
                <div className="text-8xl animate-bounce">🔍</div>
              )}
              {status === 'matched' && (
                <div className="text-8xl animate-pulse">✅</div>
              )}
              {status === 'error' && (
                <div className="text-8xl">❌</div>
              )}
            </div>

            {/* Status Message */}
            <h2 className="text-3xl font-bold text-white text-center mb-6">
              {message}
            </h2>

            {/* Search Timer */}
            {status === 'searching' && (
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

            {/* Token Balance */}
            {status !== 'error' && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Your Tokens:</span>
                  <span className="text-xl font-bold text-yellow-400">{userTokens} tokens</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              {status === 'searching' && (
                <button
                  onClick={handleCancel}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all"
                >
                  ❌ Cancel Search
                </button>
              )}

              {status === 'error' && (
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/buy-tokens')}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-xl transition-all"
                  >
                    💳 Buy More Tokens
                  </button>
                  <button
                    onClick={() => router.push('/tournaments')}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    ← Back to Tournaments
                  </button>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-sm text-gray-400 text-center">
                💡 <strong>How 1v1 Works:</strong> We match you with players of similar skill level.
                Both players compete in the same game. Highest score wins {(entryFee * 2 * 0.85).toFixed(2)}!
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

