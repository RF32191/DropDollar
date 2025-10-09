import React, { useState, useEffect } from 'react';
import { TrophyIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSkillMatchmaking } from '@/hooks/useSkillMatchmaking';
import { PvPMatch } from '@/lib/supabase/skillMatchmakingService';

interface MatchResultModalProps {
  match: PvPMatch;
  playerScore: number;
  onClose: () => void;
  onSubmit: () => void;
}

export default function MatchResultModal({ 
  match, 
  playerScore, 
  onClose, 
  onSubmit 
}: MatchResultModalProps) {
  const { submitMatchResult, isLoading } = useSkillMatchmaking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (submitted || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await submitMatchResult(match.id, playerScore);
      setSubmitted(true);
      
      // Wait a moment then call onSubmit to refresh data
      setTimeout(() => {
        onSubmit();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit match result:', error);
      setIsSubmitting(false);
    }
  };

  // Auto-submit when component mounts if score is available
  useEffect(() => {
    if (playerScore > 0 && !submitted && !isSubmitting) {
      handleSubmit();
    }
  }, [playerScore, submitted, isSubmitting]);

  const isPlayer1 = match.player1_id === match.player1_id; // This would need actual user ID
  const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
  const playerWon = opponentScore !== null && playerScore > opponentScore;
  const matchComplete = match.player1_score !== null && match.player2_score !== null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Match Result
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="text-4xl mb-4">
            {submitted ? (matchComplete && playerWon ? '🏆' : matchComplete && !playerWon ? '😔' : '⏳') : '🎮'}
          </div>
          
          {submitted ? (
            <div>
              {matchComplete ? (
                <div>
                  <h4 className={`text-xl font-bold mb-2 ${
                    playerWon ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {playerWon ? 'Victory!' : 'Defeat'}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Your score: {playerScore} | Opponent: {opponentScore}
                  </p>
                  {playerWon && (
                    <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                      <div className="text-green-800 dark:text-green-200 font-bold">
                        You won ${match.winner_payout.toFixed(2)}!
                      </div>
                      <div className="text-green-600 dark:text-green-400 text-sm">
                        Your skill rating has been updated
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="text-xl font-bold mb-2 text-blue-600">
                    Score Submitted!
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Your score: {playerScore}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Waiting for opponent to finish...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h4 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                Submitting Score...
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your final score: {playerScore}
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          )}
        </div>

        {/* Match Details */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Game Type</div>
              <div className="text-gray-600 dark:text-gray-400 capitalize">
                {match.game_type.replace('-', ' ')}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Bet Amount</div>
              <div className="text-gray-600 dark:text-gray-400">${match.bet_amount}</div>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Your Rating</div>
              <div className="text-gray-600 dark:text-gray-400">{match.player1_rating}</div>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Opponent Rating</div>
              <div className="text-gray-600 dark:text-gray-400">{match.player2_rating}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {submitted && matchComplete ? (
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
