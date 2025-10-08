'use client';

import React, { useState, useEffect } from 'react';
import { CurrencyDollarIcon, PlayIcon, TrophyIcon, ClockIcon } from '@heroicons/react/24/outline';
import GameSessionService, { GameSession } from '@/lib/gameSessionService';
import CompetitionGameWrapper from './CompetitionGameWrapper';
import { useAuth } from '@/contexts/AuthContext';

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime?: number;
  avgTiming?: number;
}

interface GameEntryFlowProps {
  listingId: string;
  tournamentId?: string;
  gameType: string;
  gameName: string;
  basePrice?: number;
  onExit: () => void;
  onPaymentSuccess?: (tournamentId: string, amount: number) => void;
}

export default function GameEntryFlow({
  listingId,
  tournamentId,
  gameType,
  gameName,
  basePrice = 1,
  onExit,
  onPaymentSuccess
}: GameEntryFlowProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'payment' | 'waiting' | 'playing' | 'completed' | 'score_review' | 'leaderboard'>('payment');
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [tokenAmount, setTokenAmount] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [userEntryStatus, setUserEntryStatus] = useState<any>(null);

  // Use authenticated user's ID and username
  const userId = user?.id || 'guest-user';
  const username = user?.username || 'Guest Player';

  useEffect(() => {
    // Check user's entry status for this listing
    const entryStatus = GameSessionService.canUserMakeEntry(userId, listingId);
    setUserEntryStatus(entryStatus);
  }, [userId, listingId]);

  const handleTokenPayment = async () => {
    if (!user) {
      alert('Please sign in to participate in tournaments');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate token payment processing
      console.log(`💳 Processing payment: ${tokenAmount} tokens for ${gameName}`);
      
      // Create game session after successful payment
      const session = GameSessionService.simulateTokenPayment(
        listingId,
        userId,
        username,
        gameType,
        tokenAmount,
        tournamentId
      );
      
      setGameSession(session);
      setCurrentStep('waiting');
      
      console.log(`✅ Payment successful! Session created: ${session.sessionId}`);
      
      // Update tournament progress if this is a tournament
      if (tournamentId && onPaymentSuccess) {
        onPaymentSuccess(tournamentId, tokenAmount);
      }
      
    } catch (error: any) {
      alert(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartGame = () => {
    if (!gameSession) return;
    
    const success = GameSessionService.startGameSession(gameSession.sessionId);
    if (success) {
      setCurrentStep('playing');
    } else {
      alert('Failed to start game session');
    }
  };

  const handleGameComplete = (results: GameResult[]) => {
    if (!gameSession || results.length === 0) return;
    
    // Use the best score from all entries
    const bestResult = results.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    // Complete the game session
    const success = GameSessionService.completeGameSession(
      gameSession.sessionId,
      bestResult.score,
      bestResult.accuracy,
      bestResult.avgReactionTime
    );
    
    if (success) {
      setGameResults(results);
      setCurrentStep('score_review'); // Go to score review first
    }
  };

  const handleScoreReview = (action: 'improve' | 'view_results') => {
    if (action === 'improve') {
      // User wants to make another entry
      setCurrentStep('payment');
      setGameSession(null);
      setGameResults([]);
    } else {
      // User wants to see results - check if they can
      const leaderboardAccess = GameSessionService.canUserViewLeaderboard(userId, listingId);
      if (leaderboardAccess.canView) {
        setCurrentStep('leaderboard');
      } else {
        // Force them to use remaining entries first
        setCurrentStep('payment');
        setGameSession(null);
        setGameResults([]);
      }
    }
  };

  const getGameEmoji = (type: string) => {
    const emojis: { [key: string]: string } = {
      'multi-target': '🎪',
      'falling-objects': '🏀',
      'color-sequence': '🌈'
    };
    return emojis[type] || '🎮';
  };

  // Payment Step
  if (currentStep === 'payment') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="mb-8">
            <div className="text-6xl mb-4">{getGameEmoji(gameType)}</div>
            <h1 className="text-4xl font-bold mb-4">{gameName}</h1>
            <p className="text-xl text-gray-300">
              {tournamentId ? 'Tournament Entry' : 'Listing Competition'}
            </p>
          </div>

          {!userEntryStatus?.canEnter ? (
            <div className="bg-red-900 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold mb-2">❌ Cannot Enter</h3>
              <p className="text-red-300">{userEntryStatus?.reason}</p>
              <button
                onClick={onExit}
                className="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold mb-4">💰 Entry Payment</h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-900 rounded-lg p-4 mb-4">
                    <h4 className="font-bold text-blue-300 mb-2">👤 Player Information</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Username:</span>
                      <span className="font-bold text-blue-100">{username}</span>
                    </div>
                    <div className="text-xs text-blue-300 mt-1">
                      Using your account username
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Token Amount ($1-$3):</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3].map(amount => (
                        <button
                          key={amount}
                          onClick={() => setTokenAmount(amount)}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                            tokenAmount === amount
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-900 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span>Entry Fee:</span>
                    <span className="font-bold">${tokenAmount}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span>Remaining Entries:</span>
                    <span className="font-bold text-green-400">{userEntryStatus?.remainingEntries}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Game Layout:</span>
                    <span className="font-bold text-yellow-400">Identical for all players</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-900 rounded-lg p-4 mb-6">
                <p className="text-sm">
                  ⚖️ <strong>Fair Play:</strong> All players get the exact same game layout and challenges.
                  Your skill determines your score, not luck!
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={onExit}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTokenPayment}
                  disabled={isProcessing || !user}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                      Pay ${tokenAmount} & Enter
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Waiting to Start Step
  if (currentStep === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="mb-8">
            <div className="text-6xl mb-4">{getGameEmoji(gameType)}</div>
            <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
            <p className="text-xl text-gray-300">Ready to play {gameName}</p>
          </div>

          <div className="bg-green-900 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">✅ Entry Confirmed</h3>
            <div className="space-y-2 text-left">
              <div className="flex justify-between">
                <span>Session ID:</span>
                <span className="font-mono text-green-400">{gameSession?.sessionId.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span>Username:</span>
                <span className="font-bold text-green-400">{gameSession?.username}</span>
              </div>
              <div className="flex justify-between">
                <span>Entry Number:</span>
                <span className="font-bold text-green-400">{gameSession?.entryNumber}/3</span>
              </div>
              <div className="flex justify-between">
                <span>Tokens Paid:</span>
                <span className="font-bold text-green-400">${gameSession?.tokensPaid}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">🎮 Game Information</h3>
            <ul className="text-left space-y-2">
              <li>• Same game layout for all players</li>
              <li>• 60-90 second time limit</li>
              <li>• Score based on accuracy and speed</li>
              <li>• Start when you're ready</li>
              <li>• Results saved automatically</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onExit}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Exit (Forfeit Entry)
            </button>
            <button
              onClick={handleStartGame}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <PlayIcon className="h-5 w-5 mr-2" />
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing Step
  if (currentStep === 'playing') {
    return (
      <CompetitionGameWrapper
        listingId={listingId}
        gameType={gameType}
        maxEntries={gameSession?.entryNumber || 1}
        onAllGamesComplete={handleGameComplete}
        onExit={() => {
          if (gameSession) {
            GameSessionService.abandonGameSession(gameSession.sessionId);
          }
          onExit();
        }}
      />
    );
  }

  // Score Review Step - Offer improvement or view results
  if (currentStep === 'score_review') {
    const bestScore = Math.max(...gameResults.map(r => r.score));
    const userScoreData = GameSessionService.getUserBestScoreForListing(userId, listingId);
    const leaderboardAccess = GameSessionService.canUserViewLeaderboard(userId, listingId);
    
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="mb-8">
            <div className="text-6xl mb-4">🎯</div>
            <h1 className="text-4xl font-bold mb-4">Entry Complete!</h1>
            <p className="text-xl text-gray-300">{gameName} - Entry {gameSession?.entryNumber}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-2xl font-bold mb-4">Your Score: {bestScore}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-900 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-400">{userScoreData.bestScore}</div>
                <div className="text-sm text-gray-400">Your Best Score</div>
              </div>
              <div className="bg-purple-900 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-400">{userScoreData.totalEntries}/3</div>
                <div className="text-sm text-gray-400">Entries Used</div>
              </div>
            </div>

            {userScoreData.scores.length > 1 && (
              <div className="space-y-2 text-sm">
                <h4 className="font-bold">Your Entry History:</h4>
                {userScoreData.scores.map((score, index) => (
                  <div key={index} className="flex justify-between">
                    <span>Entry {index + 1}:</span>
                    <span className="font-bold">{score} points</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {leaderboardAccess.remainingEntries > 0 ? (
            <div className="bg-yellow-900 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">💡 Improve Your Score?</h3>
              <p className="text-yellow-200 mb-4">
                You have {leaderboardAccess.remainingEntries} entries remaining. 
                Want to try for a better score before seeing the leaderboard?
              </p>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => handleScoreReview('improve')}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  💪 Try Again (${tokenAmount})
                </button>
                <button
                  onClick={() => handleScoreReview('view_results')}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Use All Entries First
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-900 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">🏆 All Entries Used!</h3>
              <p className="text-green-200 mb-4">
                You've used all 3 entries. Time to see how you rank against other players!
              </p>
              
              <button
                onClick={() => handleScoreReview('view_results')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                🏆 View Leaderboard
              </button>
            </div>
          )}

          <button
            onClick={onExit}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors mt-4"
          >
            Return to Listing
          </button>
        </div>
      </div>
    );
  }

  // Leaderboard Step
  if (currentStep === 'leaderboard') {
    const leaderboard = GameSessionService.generateLeaderboard(listingId, gameType);
    const userScoreData = GameSessionService.getUserBestScoreForListing(userId, listingId);
    const userRank = leaderboard.entries.findIndex(entry => entry.username === username) + 1;
    
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-4xl mx-auto p-8">
          <div className="mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold mb-4">Leaderboard</h1>
            <p className="text-xl text-gray-300">{gameName} Competition</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-2xl font-bold mb-4">Your Performance</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-900 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-400">{userScoreData.bestScore}</div>
                <div className="text-sm text-gray-400">Your Best Score</div>
              </div>
              <div className="bg-purple-900 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-400">#{userRank || 'N/A'}</div>
                <div className="text-sm text-gray-400">Current Rank</div>
              </div>
              <div className="bg-green-900 rounded-lg p-3">
                <div className="text-lg font-bold text-green-400">{leaderboard.totalPlayers}</div>
                <div className="text-sm text-gray-400">Total Players</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-2xl font-bold mb-4">🏆 Top Players</h3>
            <div className="space-y-3">
              {leaderboard.entries.slice(0, 10).map((entry, index) => (
                <div 
                  key={index}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    entry.username === username ? 'bg-yellow-900 border-2 border-yellow-600' : 'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
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
                    <div className="text-xl font-bold text-yellow-400">{entry.score}</div>
                    <div className="text-sm text-gray-400">points</div>
                  </div>
                </div>
              ))}
            </div>
            
            {leaderboard.entries.length === 0 && (
              <p className="text-gray-400">No other players yet. You're the first!</p>
            )}
          </div>

          <div className="bg-blue-900 rounded-lg p-4 mb-6">
            <p className="text-sm">
              🎮 Competition is ongoing! Final results will be revealed when the listing closes.
              Rankings may change as more players join.
            </p>
          </div>

          <button
            onClick={onExit}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Return to Listing
          </button>
        </div>
      </div>
    );
  }

  return null;
}
