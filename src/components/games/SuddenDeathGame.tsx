'use client';

import React, { useState, useEffect } from 'react';
import SimonSaysGame from './SimonSaysGame';
import MultiTargetGame from './MultiTargetGame';
import CognitiveReflexGame from './CognitiveReflexGame';
import RhythmGame from './RhythmGame';
import FallingObjectGame from './FallingObjectGame';
import PatternMemoryGame from './PatternMemoryGame';
import ColorSequenceGame from './ColorSequenceGame';
import WordChainGame from './WordChainGame';
import NumberSequenceGame from './NumberSequenceGame';
import GameCompetitionService from '@/lib/gameCompetitionService';

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime?: number;
  avgTiming?: number;
}

interface SuddenDeathGameProps {
  listingId: string;
  gameType: string;
  tiedUsers: string[];
  onSuddenDeathComplete: (winner: string, finalScore: number) => void;
  onExit: () => void;
}

export default function SuddenDeathGame({ 
  listingId, 
  gameType, 
  tiedUsers, 
  onSuddenDeathComplete, 
  onExit 
}: SuddenDeathGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Mock user ID (in real app, get from auth)
  const userId = 'user-123';
  const isUserInTiebreak = tiedUsers.includes(userId);

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setGameStarted(true);
      setShowCountdown(false);
    }
  }, [showCountdown, countdown]);

  const handleGameEnd = (result: GameResult) => {
    setFinalScore(result.score);
    setGameComplete(true);
    
    // Submit sudden death result
    const success = GameCompetitionService.submitSuddenDeathResult(
      listingId,
      gameType,
      userId,
      result.score
    );

    if (success) {
      console.log(`⚔️ Sudden death score submitted: ${result.score}`);
      
      // Check if all tied users have submitted their scores
      const tiebreakGame = GameCompetitionService.getTiebreakGame(listingId, gameType);
      if (tiebreakGame && tiebreakGame.winner) {
        onSuddenDeathComplete(tiebreakGame.winner, result.score);
      }
    }
  };

  const renderGameComponent = () => {
    const gameProps = {
      onGameEnd: handleGameEnd,
      onExit,
      listingId: `${listingId}-SUDDEN-DEATH`,
      entryNumber: 999, // Special entry number for sudden death
      isCompetitionMode: true // Fixed: was isCompetition, should be isCompetitionMode
    };

    switch (gameType) {
      case 'multi-target':
        return <MultiTargetGame {...gameProps} />;
      case 'falling-objects':
        return <FallingObjectGame {...gameProps} />;
      case 'color-sequence':
        return <ColorSequenceGame {...gameProps} />;
      default:
        return <div>Unknown game type: {gameType}</div>;
    }
  };

  const getGameDisplayName = (type: string) => {
    const names: { [key: string]: string } = {
      'multi-target': 'Multi-Target Reaction',
      'falling-objects': 'Falling Object Catch',
      'color-sequence': 'Color Sequence Memory'
    };
    return names[type] || type;
  };

  if (!isUserInTiebreak) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <h1 className="text-4xl font-bold mb-6">⚔️ Sudden Death in Progress</h1>
          <p className="text-xl mb-8">
            A tiebreaker is currently underway between {tiedUsers.length} players.
          </p>
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold mb-4">Tied Players:</h3>
            <div className="space-y-2">
              {tiedUsers.map((user, index) => (
                <div key={index} className="text-yellow-400">
                  🏆 {user}
                </div>
              ))}
            </div>
          </div>
          <p className="text-gray-400 mb-6">
            Please wait for the sudden death round to complete...
          </p>
          <button
            onClick={onExit}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Return to Listing
          </button>
        </div>
      </div>
    );
  }

  if (gameComplete) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <h1 className="text-4xl font-bold mb-6">⚔️ Sudden Death Complete!</h1>
          <p className="text-xl mb-8">Your sudden death score: <span className="text-yellow-400 font-bold">{finalScore}</span></p>
          
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold mb-4">Waiting for other players...</h3>
            <p className="text-gray-400">
              All tied players must complete their sudden death round before the winner is determined.
            </p>
          </div>

          <button
            onClick={onExit}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Return to Listing
          </button>
        </div>
      </div>
    );
  }

  if (showCountdown) {
    return (
      <div className="min-h-screen bg-red-900 text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <h1 className="text-6xl font-bold mb-6">⚔️</h1>
          <h2 className="text-4xl font-bold mb-8">SUDDEN DEATH</h2>
          <p className="text-2xl mb-8">{getGameDisplayName(gameType)}</p>
          
          <div className="text-8xl font-bold text-red-400 mb-8">
            {countdown}
          </div>
          
          <p className="text-xl">Get ready for the tiebreaker round!</p>
        </div>
      </div>
    );
  }

  if (gameStarted) {
    return renderGameComponent();
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-6">⚔️ Sudden Death Tiebreaker</h1>
        <p className="text-xl mb-8">
          You tied with {tiedUsers.length - 1} other player{tiedUsers.length > 2 ? 's' : ''}!
        </p>
        
        <div className="bg-red-900 rounded-lg p-6 mb-8">
          <h3 className="text-2xl font-bold mb-4">🏆 Tied Players:</h3>
          <div className="space-y-2">
            {tiedUsers.map((user, index) => (
              <div key={index} className={`text-lg ${user === userId ? 'text-yellow-400 font-bold' : 'text-white'}`}>
                {user === userId ? '👤 You' : `🏆 ${user}`}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">⚔️ Sudden Death Rules:</h3>
          <ul className="text-left space-y-2">
            <li>• All tied players play the same enhanced difficulty game</li>
            <li>• Highest score wins the entire competition</li>
            <li>• Game mechanics are identical for all players</li>
            <li>• This is your final chance to win!</li>
          </ul>
        </div>

        <div className="bg-yellow-900 rounded-lg p-4 mb-6">
          <p className="text-sm">
            ⚖️ <strong>Legal Compliance:</strong> Sudden death uses the same deterministic 
            mechanics ensuring fair competition for all tied players.
          </p>
        </div>

        <button
          onClick={() => setShowCountdown(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg transition-colors text-xl"
        >
          Enter Sudden Death
        </button>
      </div>
    </div>
  );
}
