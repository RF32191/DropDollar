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
import OpponentAssignmentService from '@/lib/supabase/opponentAssignmentService';
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
  
  // Generate lot number for this match
  const lotNumber = `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
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
    console.log('🎮 [1v1 Game] User:', user);
    console.log('🎮 [1v1 Game] Game Type:', gameType);
    console.log('🎮 [1v1 Game] Queue ID:', queueId);

    try {
      // Save game result to activity log
      console.log('💾 [1v1 Game] Saving to ActivityService...');
      const activityResult = await ActivityService.saveGameHistory({
        user_id: user!.id,
        game_type: gameType,
        score: result.score || 0,
        is_practice: false, // This is a 1v1 match
        avg_reaction_time: result.avgReactionTime || 0,
        accuracy: result.accuracy || 100,
        game_duration: result.duration || 0,
        lot_number: lotNumber
      });
      
      console.log('✅ [1v1 Game] ActivityService result:', activityResult);

      // Use the new opponent assignment service
      console.log('🎯 [1v1 Game] Attempting automatic opponent assignment...');
      console.log('🔍 [1v1 Game] QueueId:', queueId);
      console.log('🎯 [1v1 Game] Score:', result.score);
      
      const assignmentResult = await OpponentAssignmentService.assignOpponent(
        queueId,
        user!.id,
        user!.username,
        gameType,
        entryFee,
        lotNumber,
        result.score || 0
      );
      
      console.log('🎯 [1v1 Game] Assignment result:', assignmentResult);
      
      if (assignmentResult.matched && assignmentResult.opponent) {
        console.log('🎉 [1v1 Game] OPPONENT ASSIGNED!');
        console.log('🎉 [1v1 Game] Opponent:', assignmentResult.opponent.username);
        console.log('🎉 [1v1 Game] Match ID:', assignmentResult.matchId);
        console.log('💰 [1v1 Game] Winner will be paid automatically!');
        
        // Update the game history with match information
        console.log('💾 [1v1 Game] Updating game history with match info...');
        await ActivityService.saveGameHistory({
          user_id: user!.id,
          game_type: gameType,
          score: result.score || 0,
          is_practice: false,
          avg_reaction_time: result.avgReactionTime || 0,
          accuracy: result.accuracy || 100,
          game_duration: result.duration || 0,
          lot_number: lotNumber,
          match_id: assignmentResult.matchId
        });
      } else {
        console.log('⏳ [1v1 Game] No opponent found yet. Score saved for later matching...');
      }

      // Show completion screen
      console.log('⏳ [1v1 Game] Showing completion screen for 2 seconds...');
      setTimeout(() => {
        console.log('🚀 [1v1 Game] Redirecting to results page...');
        
        // Try to redirect to results page, fallback to dashboard if it fails
        const resultsUrl = `/1v1-results?score=${result.score}&game=${gameType}&fee=${entryFee}&queueId=${queueId}&matchId=${assignmentResult.matchId || ''}`;
        
        // Store game result in localStorage for dashboard to show
        localStorage.setItem('lastGameResult', JSON.stringify({
          score: result.score,
          gameType: gameType,
          entryFee: entryFee,
          queueId: queueId,
          matchId: assignmentResult.matchId,
          opponent: assignmentResult.opponent,
          timestamp: new Date().toISOString()
        }));
        
        // Force dashboard reload with game data
        localStorage.setItem('forceDashboardReload', 'true');
        localStorage.setItem('hasNewGameScore', 'true');
        
        // Redirect to dashboard
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('❌ [1v1 Game] Error saving result:', error);
      console.error('❌ [1v1 Game] Error details:', JSON.stringify(error, null, 2));
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

  // Show completion screen after game ends
  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-6 animate-bounce">🎉</div>
          <h1 className="text-4xl font-black text-white mb-4">GAME COMPLETE!</h1>
          <p className="text-xl text-purple-300 mb-6">Processing your results...</p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
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

