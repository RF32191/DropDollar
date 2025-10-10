'use client';

import React, { useState } from 'react';
import { EyeIcon, LockClosedIcon, TrophyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import GameSessionService from '@/lib/gameSessionService';
import GameEntryFlow from './GameEntryFlow';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalLocation } from '@/hooks/useGlobalLocation';

interface ViewResultsButtonProps {
  listingId: string;
  gameType: string;
  gameName: string;
  className?: string;
  tournamentId?: string;
}

export default function ViewResultsButton({
  listingId,
  gameType,
  gameName,
  className = '',
  tournamentId
}: ViewResultsButtonProps) {
  const { user } = useAuth();
  const globalLocation = useGlobalLocation();
  const [showResults, setShowResults] = useState(false);
  const [showEntryFlow, setShowEntryFlow] = useState(false);

  // Use authenticated user's ID
  const userId = user?.id || 'guest-user';

  const handleViewResults = () => {
    // Check location verification first
    if (globalLocation.status !== 'granted' || !globalLocation.isGamingAllowed) {
      if (globalLocation.status === 'restricted') {
        alert('Gaming is not allowed in your location');
        return;
      } else {
        // Request location verification
        globalLocation.requestLocation();
        return;
      }
    }

    const leaderboardAccess = GameSessionService.canUserViewLeaderboard(userId, listingId);
    
    if (leaderboardAccess.canView) {
      // User can view leaderboard - show it directly
      setShowResults(true);
    } else if (leaderboardAccess.hasPlayed) {
      // User has played but has remaining entries - force them to use them
      setShowEntryFlow(true);
    } else {
      // User hasn't played - start entry flow
      setShowEntryFlow(true);
    }
  };

  const getButtonContent = () => {
    // Check location verification first
    if (globalLocation.status !== 'granted' || !globalLocation.isGamingAllowed) {
      if (globalLocation.status === 'restricted') {
        return {
          icon: <ShieldCheckIcon className="h-5 w-5" />,
          text: 'Gaming Not Allowed',
          description: 'Restricted in your location',
          bgColor: 'bg-red-600 hover:bg-red-700',
          disabled: true
        };
      } else {
        return {
          icon: <ShieldCheckIcon className="h-5 w-5" />,
          text: 'Location Verification Required',
          description: 'Enable location to play',
          bgColor: 'bg-green-600 hover:bg-green-700',
          disabled: false
        };
      }
    }

    const leaderboardAccess = GameSessionService.canUserViewLeaderboard(userId, listingId);
    
    if (!leaderboardAccess.hasPlayed) {
      return {
        icon: <TrophyIcon className="h-5 w-5" />,
        text: 'Enter Competition',
        description: 'Play to see results',
        bgColor: 'bg-green-600 hover:bg-green-700',
        disabled: false
      };
    }
    
    if (leaderboardAccess.remainingEntries > 0) {
      return {
        icon: <LockClosedIcon className="h-5 w-5" />,
        text: `${leaderboardAccess.remainingEntries} Entries Left`,
        description: 'Use all entries to see leaderboard',
        bgColor: 'bg-yellow-600 hover:bg-yellow-700',
        disabled: false
      };
    }
    
    return {
      icon: <EyeIcon className="h-5 w-5" />,
      text: 'View Leaderboard',
      description: 'See current rankings',
      bgColor: 'bg-blue-600 hover:bg-blue-700',
      disabled: false
    };
  };

  // Show entry flow if needed
  if (showEntryFlow) {
    return (
      <GameEntryFlow
        listingId={listingId}
        tournamentId={tournamentId}
        gameType={gameType}
        gameName={gameName}
        onExit={() => setShowEntryFlow(false)}
      />
    );
  }

  // Show results if user has access
  if (showResults) {
    const leaderboard = tournamentId 
      ? GameSessionService.generateTournamentLeaderboard(tournamentId, gameType)
      : GameSessionService.generateLeaderboard(listingId, gameType);
    const userScoreData = GameSessionService.getUserBestScoreForListing(userId, listingId);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900 text-white rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold mb-2">Competition Results</h2>
            <p className="text-xl text-gray-300">{gameName}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">Your Performance</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{userScoreData.bestScore}</div>
                <div className="text-sm text-gray-400">Best Score</div>
              </div>
              <div className="bg-purple-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{userScoreData.totalEntries}/3</div>
                <div className="text-sm text-gray-400">Entries Used</div>
              </div>
              <div className="bg-green-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{leaderboard.totalPlayers}</div>
                <div className="text-sm text-gray-400">Total Players</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">🏆 Current Rankings</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {leaderboard.entries.slice(0, 20).map((entry, index) => (
                <div 
                  key={index}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    entry.username.includes(userId) ? 'bg-yellow-900 border-2 border-yellow-600' : 'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm ${
                      index === 0 ? 'bg-yellow-600' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-600' : 'bg-gray-600'
                    }`}>
                      {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                    </div>
                    <div>
                      <div className="font-bold">{entry.username}</div>
                      <div className="text-sm text-gray-400">
                        {entry.accuracy && `${entry.accuracy}% accuracy`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-400">{entry.score}</div>
                    <div className="text-xs text-gray-400">points</div>
                  </div>
                </div>
              ))}
            </div>
            
            {leaderboard.entries.length === 0 && (
              <p className="text-gray-400 text-center py-8">No players yet. Be the first to compete!</p>
            )}
          </div>

          <div className="bg-blue-900 rounded-lg p-4 mb-6">
            <p className="text-sm text-center">
              🎮 Competition is live! Rankings update as more players join. 
              Final results revealed when listing closes.
            </p>
          </div>

          <button
            onClick={() => setShowResults(false)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Close Results
          </button>
        </div>
      </div>
    );
  }

  const buttonContent = getButtonContent();

  return (
    <button
      onClick={handleViewResults}
      disabled={buttonContent.disabled}
      className={`${buttonContent.bgColor} disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2 ${className}`}
    >
      {buttonContent.icon}
      <div className="text-left">
        <div className="text-sm">{buttonContent.text}</div>
        <div className="text-xs opacity-75">{buttonContent.description}</div>
      </div>
    </button>
  );
}
