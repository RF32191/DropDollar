'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { FixedGamesService } from '@/lib/supabase/fixedGamesService';
import LaserDodgeGame from '@/components/games/LaserDodgeGame';
import MultiTargetGame from '@/components/games/MultiTargetGame';
import SwordParryGameSimple from '@/components/games/SwordParryGameSimple';
import QuickClickGame from '@/components/games/QuickClickGame';
import ColorSequenceGame from '@/components/games/ColorSequenceGame';
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
  onComplete: (score: number, accuracy: number) => void;
  onCancel: () => void;
}

export default function CompetitionGameFlow({ 
  gameType, 
  sessionId, 
  configId, 
  onComplete, 
  onCancel 
}: CompetitionGameFlowProps) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'completed' | 'error'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [gameScore, setGameScore] = useState(0);
  const [gameAccuracy, setGameAccuracy] = useState(0);
  const [gameDuration, setGameDuration] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);
  const [userRanking, setUserRanking] = useState(0);
  const [prizeWon, setPrizeWon] = useState(0);

  useEffect(() => {
    // Start countdown
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setGameState('playing');
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, []);

  const handleGameEnd = async (score: number, accuracy: number, duration: number) => {
    try {
      setGameScore(score);
      setGameAccuracy(accuracy);
      setGameDuration(duration);
      setGameState('completed');

      // Save game result
      if (user) {
        await SimpleGameService.saveGameHistory({
          userId: user.id,
          gameType: gameType,
          score: score,
          accuracy: accuracy,
          avgReactionTime: 0,
          gameDuration: duration,
          isPractice: false,
          listingId: sessionId,
          entryNumber: 1,
          placement: 0,
          prizeWon: 0,
          tokensWagered: 0,
          tokensWon: 0,
          metadata: { sessionId, configId }
        });

        // Update participant score
        await FixedGamesService.updateHotSellParticipantScore(sessionId, user.id, score);

        // Load updated participants for scoreboard
        const updatedParticipants = await FixedGamesService.getHotSellParticipants(sessionId);
        setParticipants(updatedParticipants);

        // Calculate user ranking
        const sortedParticipants = updatedParticipants.sort((a, b) => b.score - a.score);
        const userRank = sortedParticipants.findIndex(p => p.user_id === user.id) + 1;
        setUserRanking(userRank);

        // Calculate prize (simplified - would need proper prize calculation)
        if (userRank === 1) {
          setPrizeWon(100); // Example prize amount
        }
      }
    } catch (error) {
      console.error('Error saving game result:', error);
      setGameState('error');
    }
  };

  const getGameComponent = () => {
    const gameProps = {
      onGameEnd: handleGameEnd,
      isCompetitionMode: true,
      gameDuration: 60, // 60 seconds for competitions
      rngSeed: 1 // Use consistent RNG for competitions
    };

    switch (gameType) {
      case 'laser_dodge':
        return <LaserDodgeGame {...gameProps} />;
      case 'multi_target_reaction':
        return <MultiTargetGame {...gameProps} />;
      case 'sword_parry':
        return <SwordParryGameSimple {...gameProps} />;
      case 'number_tap':
        return <QuickClickGame {...gameProps} />;
      case 'memory_color':
        return <ColorSequenceGame {...gameProps} />;
      default:
        return <div className="text-white text-center">Unknown game type: {gameType}</div>;
    }
  };

  const getGameTitle = () => {
    switch (gameType) {
      case 'laser_dodge': return '🚀 Laser Dodge';
      case 'multi_target_reaction': return '🎯 Multi-Target Reaction';
      case 'sword_parry': return '⚔️ Sword Parry';
      case 'number_tap': return '⚡ Quick Click';
      case 'memory_color': return '🧠 Memory Color';
      default: return '🎮 Game';
    }
  };

  if (gameState === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">{getGameTitle()}</h1>
          <div className="text-8xl font-bold text-yellow-400 mb-8">
            {countdown}
          </div>
          <p className="text-xl text-gray-300">Get ready to play!</p>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
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
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-300 mb-6">There was an error saving your game result.</p>
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
