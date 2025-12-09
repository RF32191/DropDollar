'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import MultiTargetGame from '@/components/games/MultiTargetGame';
import FallingObjectGame from '@/components/games/FallingObjectGame';
import ColorSequenceGame from '@/components/games/ColorSequenceGame';
import LaserDodgeGame from '@/components/games/LaserDodgeGame';
import QuickClickGame from '@/components/games/QuickClickGame';
import SwordParryGame from '@/components/games/SwordParryGameSimple';
import BladeBounceGame from '@/components/games/BladeBounceGame';
import VictoryAnimation from '@/components/VictoryAnimation';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { TriumphMatchmakingService } from '@/lib/supabase/triumphMatchmaking';
import { useAuth } from '@/contexts/AuthContext';
import { 
  StarIcon, 
  TrophyIcon, 
  FireIcon,
  ArrowLeftIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const GAMES = [
  {
    id: 'sword-parry',
    name: 'Sword Parry',
    component: SwordParryGame,
    icon: <FireIcon className="w-6 h-6 text-red-500" />
  },
  {
    id: 'quick-click',
    name: 'Quick Click',
    component: QuickClickGame,
    icon: <StarIcon className="w-6 h-6 text-yellow-500" />
  },
  {
    id: 'memory-color',
    name: 'Memory Color',
    component: ColorSequenceGame,
    icon: <StarIcon className="w-6 h-6 text-purple-500" />
  },
  {
    id: 'multi-target',
    name: 'Multi-Target Reaction',
    component: MultiTargetGame,
    icon: <StarIcon className="w-6 h-6 text-blue-500" />
  },
  {
    id: 'laser-dodge',
    name: 'Laser Dodge',
    component: LaserDodgeGame,
    icon: <StarIcon className="w-6 h-6 text-green-500" />
  },
  {
    id: 'falling-object',
    name: 'Falling Objects',
    component: FallingObjectGame,
    icon: <StarIcon className="w-6 h-6 text-indigo-500" />
  },
  {
    id: 'blade-bounce',
    name: 'Blade Bounce',
    component: BladeBounceGame,
    icon: <StarIcon className="w-6 h-6 text-red-500" />
  }
];

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
  gameDuration: number;
}

export default function EnhancedGamesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const gameType = searchParams.get('game');
  const mode = searchParams.get('mode'); // 'practice' or 'competition'
  const listingId = searchParams.get('listingId');
  const tournamentId = searchParams.get('tournament');
  const entryFee = parseFloat(searchParams.get('entryFee') || '1');
  
  const isPracticeMode = mode === 'practice';
  const isCompetitionMode = !!listingId || !!tournamentId || mode === 'competition';
  
  const [currentGame, setCurrentGame] = useState<string | null>(gameType);
  const [gameResults, setGameResults] = useState<GameResult | null>(null);
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [opponentInfo, setOpponentInfo] = useState<any>(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (gameType && GAMES.find(g => g.id === gameType)) {
      setCurrentGame(gameType);
    }
  }, [gameType]);

  const handleGameEnd = async (result: GameResult) => {
    if (!currentGame || !user) return;

    setIsGameActive(false);
    setGameResults(result);
    setIsLoading(true);

    try {
      console.log('🎮 [Games] Game completed:', result);

      if (isPracticeMode) {
        // Practice mode - save score using simple service
        const gameHistory = await SimpleGameService.saveGameHistory({
          user_id: user.id,
          game_type: currentGame,
          score: result.score,
          accuracy: result.accuracy,
          avg_reaction_time: result.avgReactionTime,
          is_practice: true,
          game_duration: result.gameDuration
        });

        // Award XP for practice game
        if (gameHistory?.id) {
          try {
            const { XPService } = await import('@/lib/supabase/xpService');
            const xpResult = await XPService.awardPracticeGameXP(
              user.id,
              gameHistory.id,
              result.score
            );
            
            if (xpResult?.leveled_up) {
              console.log('🎉 [Games] Level up! New level:', xpResult.new_level);
            }
            
            // Update daily challenge progress
            await XPService.updateDailyChallengeProgress(user.id, 'play_practice', 1);
            await XPService.updateDailyChallengeProgress(user.id, 'games_count', 1);
            
            // Check score threshold challenge (1000+ points)
            if (result.score >= 1000) {
              await XPService.updateDailyChallengeProgress(user.id, 'score_threshold', 1);
            }
          } catch (error) {
            console.error('❌ [Games] Error awarding XP:', error);
            // Don't block game completion if XP fails
          }
        }

        // Show victory animation for practice
        setShowVictoryAnimation(true);
        console.log('✅ [Games] Practice game saved successfully');
      } else if (isCompetitionMode) {
        // Competition mode - handle matchmaking and results
        console.log('🏆 [Games] Competition game completed, handling matchmaking...');
        
        // Find or create match
        const match = await TriumphMatchmakingService.findMatch(user.id, currentGame, entryFee);
        
        if (match) {
          // Complete the match
          const completedMatch = await TriumphMatchmakingService.completeMatch(
            match.id,
            result.score,
            result.accuracy
          );

          if (completedMatch) {
            setMatchResult(completedMatch);
            
            // Get opponent info if there was an opponent
            if (completedMatch.opponent_id) {
              const opponent = await TriumphMatchmakingService.getOpponentInfo(completedMatch.opponent_id);
              setOpponentInfo(opponent);
            }

            // Show victory animation with match results
            setShowVictoryAnimation(true);
            console.log('✅ [Games] Competition match completed successfully');
          }
        } else {
          console.log('❌ [Games] No match found, treating as practice');
          // Fallback to practice mode
          await SimpleGameService.saveGameHistory({
            user_id: user.id,
            game_type: currentGame,
            score: result.score,
            accuracy: result.accuracy,
            avg_reaction_time: result.avgReactionTime,
            is_practice: true,
            game_duration: result.gameDuration
          });
          setShowVictoryAnimation(true);
        }
      }
    } catch (error) {
      console.error('❌ [Games] Error handling game completion:', error);
      // Still show victory animation even if save fails
      setShowVictoryAnimation(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVictoryAnimationComplete = () => {
    setShowVictoryAnimation(false);
    
    // Redirect to dashboard to show results
    if (isPracticeMode) {
      router.push('/dashboard?tab=practice&newScore=true');
    } else {
      router.push('/dashboard?tab=competition&newMatch=true');
    }
  };

  const startGame = () => {
    setIsGameActive(true);
    setGameResults(null);
    setShowVictoryAnimation(false);
    setMatchResult(null);
    setOpponentInfo(null);
  };

  const renderGame = () => {
    if (!currentGame) return null;

    const game = GAMES.find(g => g.id === currentGame);
    if (!game) return null;

    const GameComponent = game.component;

    return (
      <GameComponent
        onGameEnd={handleGameEnd}
        rngSeed={Math.random()}
      />
    );
  };

  if (!currentGame) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Game Not Found</h1>
          <p className="text-gray-400 mb-6">The requested game could not be found.</p>
          <Link 
            href={isPracticeMode ? '/practice' : '/tournaments'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5 inline mr-2" />
            Back to {isPracticeMode ? 'Practice' : 'Tournaments'}
          </Link>
        </div>
      </div>
    );
  }

  const game = GAMES.find(g => g.id === currentGame);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <CleanNavigation />
      
      {/* Game Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                href={isPracticeMode ? '/practice' : '/tournaments'}
                className="text-gray-400 hover:text-white mr-4"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>
              <div className="flex items-center">
                {game?.icon}
                <h1 className="text-xl font-bold ml-3">{game?.name}</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                {isPracticeMode ? (
                  <div className="flex items-center">
                    <StarIcon className="w-4 h-4 mr-1" />
                    Practice Mode
                  </div>
                ) : (
                  <div className="flex items-center">
                    <TrophyIcon className="w-4 h-4 mr-1" />
                    Competition Mode
                  </div>
                )}
              </div>
              
              {isCompetitionMode && (
                <div className="text-sm text-gray-400">
                  Entry Fee: ${entryFee.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="container mx-auto px-4 py-8">
        {!isGameActive && !gameResults && (
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">Ready to Play?</h2>
              <p className="text-gray-400 mb-6">
                {isPracticeMode 
                  ? 'Practice your skills and improve your score!'
                  : 'Compete for real prizes and tokens!'
                }
              </p>
              
              <button
                onClick={startGame}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  `Start ${isPracticeMode ? 'Practice' : 'Competition'}`
                )}
              </button>
            </div>
          </div>
        )}

        {isGameActive && renderGame()}

        {gameResults && !showVictoryAnimation && (
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">Game Complete!</h2>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Score:</span>
                  <span className="text-white font-bold">{gameResults.score.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Accuracy:</span>
                  <span className="text-white font-bold">{gameResults.accuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reaction Time:</span>
                  <span className="text-white font-bold">{gameResults.avgReactionTime}ms</span>
                </div>
              </div>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                View Results
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Victory Animation */}
      {showVictoryAnimation && gameResults && (
        <VictoryAnimation
          isVisible={showVictoryAnimation}
          tokensWon={matchResult?.tokens_won || 0}
          isWinner={matchResult ? (gameResults.score > (matchResult.opponent_score || 0)) : true}
          opponentName={opponentInfo?.username}
          userScore={gameResults.score}
          opponentScore={matchResult?.opponent_score}
          gameType={currentGame}
          onAnimationComplete={handleVictoryAnimationComplete}
        />
      )}
    </div>
  );
}
