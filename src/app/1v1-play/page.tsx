'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import QuickClickGame from '@/components/games/QuickClickGame';
import ColorSequenceGame from '@/components/games/ColorSequenceGame';
import LaserDodgeGame from '@/components/games/LaserDodgeGame';
import FallingObjectGame from '@/components/games/FallingObjectGame';
import MultiTargetGame from '@/components/games/MultiTargetGame';
import SuddenDeathGame from '@/components/games/SuddenDeathGame';
import SwordParryGame from '@/components/games/SwordParryGameSimple';
import MatchmakingService from '@/lib/supabase/matchmakingService';
import { ActivityService } from '@/lib/supabase/activityService';
import { usePreventBackNavigation } from '@/hooks/usePreventBackNavigation';

function GamePlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const queueId = searchParams.get('queue');
  const gameType = searchParams.get('game') || 'quick-click';
  const entryFee = parseInt(searchParams.get('fee') || '1');
  const seed = parseInt(searchParams.get('seed') || '0');
  
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  // Prevent back button navigation during active game
  usePreventBackNavigation(gameStarted && !gameCompleted, '/dashboard');

  useEffect(() => {
    if (!user || !queueId) {
      router.push('/tournaments');
      return;
    }
    setGameStarted(true);
  }, [user, queueId, router]);

  const handleGameComplete = async (result: any) => {
    if (gameCompleted) return;
    setGameCompleted(true);

    console.log('🎮 [1v1 Game] Completed:', result);

    try {
      // Save game result to activity log
      await ActivityService.saveGameHistory({
        user_id: user!.id,
        game_type: gameType,
        score: result.score || 0,
        is_practice: false, // This is a 1v1 match
        avg_reaction_time: result.avgReactionTime || 0,
        accuracy: result.accuracy || 100,
        game_duration: result.duration || 0
      });

      // Submit score - this triggers automatic matching via database trigger
      console.log('📊 [1v1 Game] Submitting score to lot system...');
      console.log('🔍 [1v1 Game] QueueId:', queueId);
      console.log('🎯 [1v1 Game] Score:', result.score);
      
      const matchResult = await MatchmakingService.submitScore(
        queueId,
        user!.id,
        result.score || 0
      );
      
      if (matchResult.matched && matchResult.match) {
        console.log('🎉 [1v1 Game] MATCHED! Match ID:', matchResult.match.id);
        console.log('💰 [1v1 Game] Winner will be paid automatically!');
      } else {
        console.log('⏳ [1v1 Game] Score saved to lot. Waiting for opponent to complete their game...');
      }

      // Show completion screen
      setTimeout(() => {
        router.push(`/1v1-results?score=${result.score}&game=${gameType}&fee=${entryFee}&queueId=${queueId}`);
      }, 2000);

    } catch (error) {
      console.error('❌ [1v1 Game] Error saving result:', error);
      router.push('/tournaments');
    }
  };

  const renderGame = () => {
    switch (gameType) {
      case 'quick-click':
        return (
          <QuickClickGame
            onGameEnd={handleGameComplete}
            rngSeed={seed}
          />
        );
      case 'memory-color':
      case 'color-sequence':
        return (
          <ColorSequenceGame
            onGameEnd={handleGameComplete}
          />
        );
      case 'laser-dodge':
        return (
          <LaserDodgeGame
            onGameEnd={handleGameComplete}
            rngSeed={seed}
          />
        );
      case 'coin-catch':
      case 'falling-object':
        return (
          <FallingObjectGame
            onGameEnd={handleGameComplete}
            rngSeed={seed}
          />
        );
      case 'number-dash':
      case 'multi-target':
        return (
          <MultiTargetGame
            onGameEnd={handleGameComplete}
            rngSeed={seed}
          />
        );
      case 'shape-tap':
      case 'sword-parry':
        return (
          <SwordParryGame
            onGameEnd={handleGameComplete}
          />
        );
      default:
        return (
          <div className="text-center text-white p-12">
            <h2 className="text-2xl font-bold mb-4">Game not found</h2>
            <button
              onClick={() => router.push('/tournaments')}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg"
            >
              Back to Tournaments
            </button>
          </div>
        );
    }
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">🎮</div>
          <p className="text-white text-xl">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* 1v1 Match Header */}
        <div className="mb-4 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg p-4 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">⚔️ 1v1 MATCH</h2>
              <p className="text-sm text-purple-300">
                {gameType.replace('-', ' ').toUpperCase()} • ${entryFee} Entry • Win ${(entryFee + entryFee * 0.85).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">RNG Seed: {seed}</p>
              <p className="text-xs text-yellow-400">⚡ Play your best!</p>
            </div>
          </div>
        </div>

        {/* Game Container */}
        <div className="bg-black/30 rounded-xl p-4 border border-purple-500/20">
          {renderGame()}
        </div>
      </div>
    </div>
  );
}

export default function GamePlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading 1v1 match...</div>
      </div>
    }>
      <GamePlayContent />
    </Suspense>
  );
}

