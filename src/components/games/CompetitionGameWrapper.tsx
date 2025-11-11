'use client';

import React, { useState, useEffect } from 'react';
import MultiTargetGame from './MultiTargetGame';
import FallingObjectGame from './FallingObjectGame';
import ColorSequenceGame from './ColorSequenceGame';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { useAuth } from '@/contexts/AuthContext';

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime?: number;
  avgTiming?: number;
}

interface CompetitionGameWrapperProps {
  listingId: string;
  gameType: string;
  maxEntries: number; // 1, 2, or 3
  onAllGamesComplete: (results: GameResult[]) => void;
  onExit: () => void;
}

export default function CompetitionGameWrapper({ 
  listingId, 
  gameType, 
  maxEntries, 
  onAllGamesComplete, 
  onExit 
}: CompetitionGameWrapperProps) {
  const { user } = useAuth();
  const [currentEntry, setCurrentEntry] = useState(1);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Use authenticated user's ID
  const userId = user?.id || 'guest-user';

  const handleGameEnd = async (result: GameResult) => {
    console.log(`🎮 Entry ${currentEntry} completed with score: ${result.score}`);
    
    try {
      // Save game history using SimpleGameService (same as practice games)
      await SimpleGameService.saveGameHistory({
        user_id: userId,
        game_type: gameType,
        score: result.score,
        accuracy: result.accuracy,
        avg_reaction_time: result.avgReactionTime || 0,
        game_duration: 60,
        is_practice: false, // This is a competition game
        listing_id: listingId,
        entry_number: currentEntry,
        placement: null, // Will be determined later
        prize_won: 0, // Will be calculated later
        tokens_wagered: 1, // Assuming 1 token per entry
        tokens_won: 0, // Will be calculated later
        metadata: {
          competition_mode: true,
          entry_number: currentEntry,
          max_entries: maxEntries
        }
      });
      
      console.log('✅ [CompetitionGameWrapper] Game history saved successfully');
    } catch (error) {
      console.error('❌ [CompetitionGameWrapper] Error saving game history:', error);
    }

    const newResults = [...gameResults, result];
    setGameResults(newResults);

    if (currentEntry < maxEntries) {
      // Move to next entry
      setCurrentEntry(currentEntry + 1);
      setShowInstructions(true);
    } else {
      // All entries complete
      setIsComplete(true);
      onAllGamesComplete(newResults);
    }
  };

  const renderGameComponent = () => {
    const gameProps = {
      onGameEnd: handleGameEnd,
      onExit,
      listingId,
      entryNumber: currentEntry,
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

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <h1 className="text-4xl font-bold mb-6">🎉 Competition Complete!</h1>
          <p className="text-xl mb-8">All {maxEntries} entries submitted for {getGameDisplayName(gameType)}</p>
          
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-2xl font-bold mb-4">Your Results:</h3>
            {gameResults.map((result, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                <span>Entry {index + 1}:</span>
                <span className="font-bold text-green-400">{result.score} points</span>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-xl">Best Score:</span>
                <span className="text-2xl font-bold text-yellow-400">
                  {Math.max(...gameResults.map(r => r.score))} points
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900 rounded-lg p-4 mb-6">
            <p className="text-sm">
              🏆 Your best score will be used for the competition ranking.
              Results will be revealed when the listing closes!
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

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <h1 className="text-4xl font-bold mb-6">
            Entry {currentEntry} of {maxEntries}
          </h1>
          <h2 className="text-2xl mb-8">{getGameDisplayName(gameType)}</h2>
          
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">🎯 Competition Rules:</h3>
            <ul className="text-left space-y-2">
              <li>• Each entry uses a different game variation</li>
              <li>• All players get identical challenges per entry</li>
              <li>• Your best score across all entries counts</li>
              <li>• Scores are hidden until competition ends</li>
              <li>• Ties trigger sudden death rounds</li>
            </ul>
          </div>

          {gameResults.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <h4 className="font-bold mb-2">Previous Entries:</h4>
              {gameResults.map((result, index) => (
                <div key={index} className="flex justify-between">
                  <span>Entry {index + 1}:</span>
                  <span className="text-green-400">{result.score} points</span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-yellow-900 rounded-lg p-4 mb-6">
            <p className="text-sm">
              ⚖️ <strong>Legal Compliance:</strong> This entry uses deterministic game mechanics 
              ensuring all players face identical challenges for fair competition.
            </p>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Start Entry {currentEntry}
          </button>
        </div>
      </div>
    );
  }

  return renderGameComponent();
}
