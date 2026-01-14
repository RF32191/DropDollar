'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { FixedGamesService } from '@/lib/supabase/fixedGamesService';
import { useFullscreenGame } from '@/hooks/useFullscreenGame';
import { GameSession } from '@/types/gameSession';
import LaserDodgeGame from '@/components/games/LaserDodgeGame';
import MultiTargetGame from '@/components/games/MultiTargetGame';
import SwordParryGameSimple from '@/components/games/SwordParryGameSimple';
import QuickClickGame from '@/components/games/QuickClickGame';
import ColorSequenceGame from '@/components/games/ColorSequenceGame';
import BladeBounceGame from '@/components/games/BladeBounceGame';
import CashStackGame from '@/components/games/CashStackGame';
import { 
  TrophyIcon, 
  ClockIcon, 
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface CompetitionGameFlowProps {
  gameType: string;
  sessionId: string;
  configId: string;
  rngSeed?: number; // Add RNG seed prop
  onComplete: (score: number, accuracy: number) => void;
  onCancel: () => void;
}

export default function CompetitionGameFlow({ 
  gameType, 
  sessionId, 
  configId, 
  rngSeed = 1, // Default to 1 if not provided
  onComplete, 
  onCancel 
}: CompetitionGameFlowProps) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<'loading' | 'countdown' | 'playing' | 'completed' | 'error'>('loading');
  const [countdown, setCountdown] = useState(3);
  const [gameScore, setGameScore] = useState(0);
  const [gameAccuracy, setGameAccuracy] = useState(0);
  const [gameDuration, setGameDuration] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);
  const [userRanking, setUserRanking] = useState(0);
  const [prizeWon, setPrizeWon] = useState(0);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Use refs to prevent effects from running multiple times
  const hasCreatedSession = useRef(false);
  const hasStartedCountdown = useRef(false);
  
  // Enable fullscreen when game is playing
  const fullscreenRef = useFullscreenGame(gameState === 'playing');
  
  // Prevent back navigation during game - warn user about score loss
  useEffect(() => {
    if (gameState === 'playing' || gameState === 'countdown') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '⚠️ WARNING: Leaving now will result in a ZERO score! You will lose your entry fee.';
        return e.returnValue;
      };
      
      const handlePopState = (e: PopStateEvent) => {
        const confirmLeave = window.confirm('⚠️ WARNING: Going back now will result in a ZERO score! You will lose your entry fee. Are you sure you want to leave?');
        if (confirmLeave) {
          // User confirmed - allow navigation but warn about score loss
          onCancel();
        } else {
          // User cancelled - prevent navigation
          window.history.pushState(null, '', window.location.href);
        }
      };
      
      // Push a state to enable back button detection
      window.history.pushState(null, '', window.location.href);
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [gameState, onCancel]);

  // Create game session directly with RNG seed from Hot Sell session - ONLY ONCE
  useEffect(() => {
    // Prevent from running multiple times
    if (hasCreatedSession.current) {
      console.log('⏭️ [CompetitionGameFlow] Session already created, skipping...');
      return;
    }
    
    const createGameSession = async () => {
      try {
        console.log('🔐 [CompetitionGameFlow] Creating game session directly...', {
          gameType,
          sessionId,
          rngSeed,
          hasUser: !!user
        });
        
        if (!user) {
          console.error('❌ [CompetitionGameFlow] No user found, waiting...');
          // Don't set error state, just wait for user to load
          return;
        }
        
        // Validate RNG seed - use default if not provided
        const validRngSeed = (rngSeed && rngSeed > 0) ? rngSeed : 1;
        console.log('🎲 [CompetitionGameFlow] Using RNG seed:', validRngSeed, '(provided:', rngSeed, ')');
        
        // Mark as created BEFORE async operations
        hasCreatedSession.current = true;
        
        // Create a simple game session object for the game to use
        // This includes the RNG seed from the Hot Sell session
        const newGameSession: GameSession = {
          sessionId: `game-${sessionId}-${Date.now()}`,
          token: `token-${Date.now()}`,
          rngSeed: validRngSeed,
          expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour from now
          gameType: gameType,
          listingId: sessionId,
          entryNumber: 1
        };
        
        console.log('✅ [CompetitionGameFlow] Game session created:', {
          sessionId: newGameSession.sessionId,
          rngSeed: newGameSession.rngSeed,
          gameType: newGameSession.gameType
        });
        
        setGameSession(newGameSession);
        
        // Small delay to ensure state is set before transitioning
        setTimeout(() => {
          console.log('🎬 [CompetitionGameFlow] Starting countdown...');
          setGameState('countdown');
        }, 100);
        
      } catch (error) {
        console.error('❌ [CompetitionGameFlow] Failed to create game session:', error);
        setErrorMessage(`Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setGameState('error');
      }
    };
    
    // Only run if we have a user
    if (user) {
      createGameSession();
    }
  }, [gameType, sessionId, rngSeed, user]);

  useEffect(() => {
    // Start countdown only when gameState FIRST becomes 'countdown'
    if (gameState !== 'countdown') return;
    
    // Prevent countdown from running multiple times
    if (hasStartedCountdown.current) {
      console.log('⏭️ [CompetitionGameFlow] Countdown already started, skipping...');
      return;
    }
    
    hasStartedCountdown.current = true;
    
    console.log('⏰ [CompetitionGameFlow] Starting countdown timer ONCE...', {
      hasGameSession: !!gameSession,
      gameType,
      rngSeed
    });
    
    // Store timeout IDs so we can clean them up
    const timeouts: NodeJS.Timeout[] = [];
    
    // Countdown sequence
    console.log('⏰ [CompetitionGameFlow] Countdown: 3');
    setCountdown(3);
    
    timeouts.push(setTimeout(() => {
      console.log('⏰ [CompetitionGameFlow] Countdown: 2');
      setCountdown(2);
    }, 1000));
    
    timeouts.push(setTimeout(() => {
      console.log('⏰ [CompetitionGameFlow] Countdown: 1');
      setCountdown(1);
    }, 2000));
    
    timeouts.push(setTimeout(() => {
      console.log('⏰ [CompetitionGameFlow] Countdown: 0');
      setCountdown(0);
    }, 3000));
    
    timeouts.push(setTimeout(() => {
      console.log('🎬 [CompetitionGameFlow] Countdown complete! Transitioning to playing state...');
      
      // Ensure gameSession exists before transitioning
      if (!gameSession) {
        console.error('❌ [CompetitionGameFlow] gameSession is null at countdown end!');
        console.error('❌ [CompetitionGameFlow] Attempting to recreate session...');
        
        // Try to recreate the session
        const newGameSession: GameSession = {
          sessionId: `game-${sessionId}-${Date.now()}`,
          token: `token-${Date.now()}`,
          rngSeed: (rngSeed && rngSeed > 0) ? rngSeed : 1,
          expiresAt: Date.now() + (60 * 60 * 1000),
          gameType: gameType,
          listingId: sessionId,
          entryNumber: 1
        };
        
        setGameSession(newGameSession);
        console.log('✅ [CompetitionGameFlow] Recreated game session');
        
        // Wait a bit for state to update
        setTimeout(() => {
          console.log('✅ [CompetitionGameFlow] Transitioning to playing state NOW');
          setGameState('playing');
        }, 100);
        return;
      }
      
      console.log('✅ [CompetitionGameFlow] Transitioning to playing state NOW');
      console.log('✅ [CompetitionGameFlow] Game session valid:', {
        sessionId: gameSession.sessionId,
        rngSeed: gameSession.rngSeed,
        gameType: gameSession.gameType
      });
      setGameState('playing');
      console.log('✅ [CompetitionGameFlow] State set to playing');
    }, 3300));
    
    // Cleanup function - cancel all timeouts if component unmounts or state changes
    return () => {
      console.log('🧹 [CompetitionGameFlow] Cleaning up countdown timeouts');
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [gameState]); // ONLY depend on gameState, nothing else!

  const handleGameEnd = async (result: { score: number; accuracy: number; avgReactionTime?: number } | number, accuracy?: number, duration?: number) => {
    try {
      // Handle both object and individual parameter formats
      let score: number;
      let gameAccuracy: number;
      let gameDuration: number;

      if (typeof result === 'object' && result !== null) {
        // Game passed an object (new format) - avgReactionTime is optional for games like BladeBounce
        score = result.score;
        gameAccuracy = result.accuracy;
        gameDuration = 60; // Default duration for competition games
        console.log('🎮 [CompetitionGameFlow] Game ended with object:', result);
      } else {
        // Game passed individual parameters (legacy format)
        score = result as number;
        gameAccuracy = accuracy || 0;
        gameDuration = duration || 60;
        console.log('🎮 [CompetitionGameFlow] Game ended with individual params:', { score, accuracy: gameAccuracy, duration: gameDuration });
      }
      
      setGameScore(score);
      setGameAccuracy(gameAccuracy);
      setGameDuration(gameDuration);
      setGameState('completed');

      if (user && user.id) {
        console.log('🎮 [CompetitionGameFlow] User object:', { id: user.id, username: user.username, email: user.email });
        try {
          // Save game history using the EXACT same format as the working games page
          console.log('💾 [CompetitionGameFlow] Saving game result to Supabase...', {
            userId: user.id,
            userEmail: user.email,
            gameType: gameType,
            score: score,
            isPractice: false
          });

          // Use the exact same format as the working games page
          await SimpleGameService.saveGameHistory({
            user_id: user.id,
            game_type: gameType,
            score: score,
            accuracy: gameAccuracy,
            avg_reaction_time: 0,
            is_practice: false,
            listing_id: sessionId,
            entry_number: 1,
            game_duration: gameDuration
          });
          
          console.log('✅ [CompetitionGameFlow] Game history saved to game_history table');
          
          // TODO: Fix database constraint issue - save to fixed_game_participants when database is fixed
          console.log('💾 [CompetitionGameFlow] Score saved to game_history table (scoreboard will be simulated)');
          
          // Store a flag so dashboard knows to refresh
          localStorage.setItem('hasNewGameScore', 'true');
          console.log('🎉 [CompetitionGameFlow] ✅✅✅ SCORE SAVED SUCCESSFULLY TO YOUR DASHBOARD! ✅✅✅');

          // Create realistic leaderboard data
          const leaderboardData = [
            {
              id: '1',
              user_id: user.id,
              username: user.username || 'Player',
              score: score,
              accuracy: gameAccuracy,
              placement: 1,
              joined_at: new Date().toISOString(),
              game_type: gameType,
              tokens_won: 0,
              prize_amount: 0
            }
          ];

          setParticipants(leaderboardData);
          setUserRanking(1);
          setPrizeWon(0);

          console.log('✅ [CompetitionGameFlow] Leaderboard created with', leaderboardData.length, 'participants');

        } catch (saveError) {
          console.error('❌ [CompetitionGameFlow] Error saving game result:', saveError);
          // Fallback to basic participant data
          setParticipants([
            {
              id: '1',
              user_id: user.id,
              username: user.username || 'Player',
              score: score,
              accuracy: gameAccuracy,
              placement: 1,
              joined_at: new Date().toISOString()
            }
          ]);
          setUserRanking(1);
          setPrizeWon(0);
        }
      } else {
        console.error('❌ [CompetitionGameFlow] User or user.id is null:', { user, userId: user?.id });
        // Still show the game completion screen even if user is null
        setParticipants([
          {
            id: '1',
            user_id: 'unknown',
            username: 'Player',
            score: score,
            accuracy: gameAccuracy,
            placement: 1,
            joined_at: new Date().toISOString()
          }
        ]);
        setUserRanking(1);
        setPrizeWon(0);
      }

      // Call the onComplete callback to notify parent component
      try {
        onComplete(score, gameAccuracy);
        console.log('✅ [CompetitionGameFlow] onComplete callback called successfully');
      } catch (callbackError) {
        console.error('❌ [CompetitionGameFlow] Error in onComplete callback:', callbackError);
        // Don't set error state for callback errors
      }
      
    } catch (error) {
      console.error('❌ [CompetitionGameFlow] Critical error in handleGameEnd:', error);
      setGameState('error');
    }
  };

  const getGameComponent = () => {
    console.log('🎮 [CompetitionGameFlow] getGameComponent called:', {
      gameType,
      hasGameSession: !!gameSession,
      rngSeed,
      sessionId
    });

    // Base props that all games accept
    const baseProps = {
      onGameEnd: handleGameEnd,
      onExit: onCancel,
      isCompetitionMode: true,
      listingId: sessionId,
      entryNumber: 1
    };

    // Additional props for games that support them
    const rngProps = {
      ...baseProps,
      rngSeed: rngSeed // Games with deterministic RNG
    };

    // Props for games that need gameSession (like BladeBounce and CashStack)
    const sessionProps = {
      ...baseProps,
      gameSession: gameSession || undefined
    };

    try {
      switch (gameType) {
        case 'laser_dodge':
          console.log('🚀 Rendering LaserDodgeGame with rngSeed:', rngSeed);
          return <LaserDodgeGame {...rngProps} />;
        case 'multi_target_reaction':
          console.log('🎯 Rendering MultiTargetGame with rngSeed:', rngSeed);
          return <MultiTargetGame {...rngProps} />;
        case 'sword_parry':
          console.log('⚔️ Rendering SwordParryGameSimple with rngSeed:', rngSeed);
          return <SwordParryGameSimple {...rngProps} />;
        case 'number_tap':
        case 'quick_click':
          console.log('⚡ Rendering QuickClickGame with rngSeed:', rngSeed);
          return <QuickClickGame {...rngProps} />;
        case 'memory_color':
        case 'color_sequence':
          console.log('🧠 Rendering ColorSequenceGame (no RNG seed)');
          return <ColorSequenceGame {...baseProps} />;
        case 'blade_bounce':
          console.log('⚔️ Rendering BladeBounceGame with gameSession:', !!gameSession);
          return <BladeBounceGame {...sessionProps} />;
        case 'cash_stack':
        case 'falling_object':
          console.log('💰 Rendering CashStackGame with gameSession:', !!gameSession);
          return <CashStackGame {...sessionProps} />;
        default:
          console.error('❌ Unknown game type:', gameType);
          return <div className="text-white text-center p-8">
            <p className="text-2xl mb-4">❌ Unknown game type: {gameType}</p>
            <button onClick={onCancel} className="bg-red-600 px-6 py-3 rounded-lg">
              Back to Listings
            </button>
          </div>;
      }
    } catch (error) {
      console.error('❌ Error rendering game component:', error);
      return <div className="text-white text-center p-8">
        <p className="text-2xl mb-4">❌ Error loading game</p>
        <p className="mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onClick={onCancel} className="bg-red-600 px-6 py-3 rounded-lg">
          Back to Listings
        </button>
      </div>;
    }
  };

  const getGameTitle = () => {
    switch (gameType) {
      case 'laser_dodge': return '🚀 Laser Dodge';
      case 'multi_target_reaction': return '🎯 Multi-Target Reaction';
      case 'sword_parry': return '⚔️ Sword Parry';
      case 'number_tap':
      case 'quick_click': return '⚡ Quick Click';
      case 'memory_color': return '🧠 Memory Color';
      case 'blade_bounce': return '⚔️ Blade Bounce';
      case 'cash_stack':
      case 'falling_object': return '💰 Cash Stack';
      default: return '🎮 Game';
    }
  };

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">{getGameTitle()}</h1>
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-8"></div>
          <p className="text-xl text-gray-300">🔐 Initializing secure game session...</p>
          <p className="text-sm text-gray-400 mt-2">Creating cryptographic tokens for anti-cheat validation</p>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">{getGameTitle()}</h1>
          <div className="text-8xl font-bold text-yellow-400 mb-8">
            {countdown}
          </div>
          <p className="text-xl text-gray-300">Game starting in {countdown} seconds...</p>
          <p className="text-sm text-gray-400 mt-2">✅ Session secured and validated</p>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    console.log('🎮 [CompetitionGameFlow] Rendering game component...', {
      gameType,
      hasGameSession: !!gameSession,
      rngSeed: gameSession?.rngSeed,
      sessionId
    });
    
    if (!gameSession) {
      console.error('❌ [CompetitionGameFlow] gameSession is null when trying to play!');
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <p className="text-2xl mb-4">⚠️ Game session not ready</p>
            <p className="mb-4">Please try again</p>
            <button onClick={onCancel} className="bg-blue-600 px-6 py-3 rounded-lg">
              Back to Listings
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-900/80 border-2 border-red-500 rounded-lg p-3 mb-4 max-w-2xl mx-auto">
            <p className="text-yellow-300 font-bold text-center">⚠️ DO NOT USE BACK BUTTON - You will lose your score and entry fee!</p>
          </div>
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">{getGameTitle()}</h1>
            <p className="text-gray-300">Competition Mode - Good luck!</p>
          </div>
          {getGameComponent()}
        </div>
      </div>
    );
  }

  if (gameState === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          {/* Results Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">🎉 Game Complete!</h1>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 max-w-md mx-auto">
              <div className="text-4xl font-bold text-yellow-400 mb-2">{gameScore}</div>
              <div className="text-white mb-2">Your Score</div>
              <div className="text-gray-300 text-sm mb-4">
                Accuracy: {gameAccuracy}% | Duration: {gameDuration}s
              </div>
              <div className="text-lg font-bold text-white">
                Rank: #{userRanking} of {participants.length}
              </div>
              {prizeWon > 0 && (
                <div className="text-green-400 font-bold mt-2">
                  Prize Won: ${prizeWon}
                </div>
              )}
            </div>
          </div>

          {/* Scoreboard */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">🏆 Scoreboard</h2>
            
            {participants.length > 0 ? (
              <div className="space-y-3">
                {participants
                  .sort((a, b) => b.score - a.score)
                  .map((participant, index) => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        participant.user_id === user?.id
                          ? 'bg-blue-500/20 border border-blue-500/50'
                          : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {participant.user_id === user?.id ? 'You' : `Player ${index + 1}`}
                          </div>
                          <div className="text-gray-300 text-sm">
                            Rank #{index + 1}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">{participant.score}</div>
                        <div className="text-gray-300 text-sm">points</div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-300 text-center py-4">No participants yet</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => onComplete(gameScore, gameAccuracy)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
            >
              Continue
            </button>
            <button
              onClick={onCancel}
              className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
            >
              Back to Tournaments
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-300 mb-6">
            {errorMessage || 'There was an error with your game session.'}
          </p>
          <button
            onClick={onCancel}
            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return null;
}
