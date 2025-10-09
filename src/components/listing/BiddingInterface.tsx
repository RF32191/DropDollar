'use client';

import { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  EyeSlashIcon,
  DevicePhoneMobileIcon,
  PuzzlePieceIcon,
  CursorArrowRaysIcon,
  MusicalNoteIcon,
  TrophyIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import type { Listing, Bid } from '@/types';
import type { StoredListing } from '@/lib/listingStorage';
import { userEntryTrackingService, type UserListingStats } from '@/lib/userEntryTracking';
import { useAuth } from '@/contexts/AuthContext';
import MultiTargetGame from '@/components/games/MultiTargetGame';
import FallingObjectGame from '@/components/games/FallingObjectGame';
import ColorSequenceGame from '@/components/games/ColorSequenceGame';

interface BiddingInterfaceProps {
  listing: Listing | StoredListing;
  onClose: () => void;
  onBidPlaced: (bid: Bid) => void;
}

const GAME_TYPES = [
  { 
    id: 'multi-target',
    name: 'Multi-Target Reaction', 
    icon: CursorArrowRaysIcon, 
    color: 'green', 
    difficulty: 'Easy',
    description: 'Click the correct highlighted target among multiple shapes',
    skills: ['Visual Processing', 'Speed', 'Accuracy']
  },
  { 
    id: 'falling-objects',
    name: 'Falling Object Catch', 
    icon: DevicePhoneMobileIcon, 
    color: 'red', 
    difficulty: 'Medium',
    description: 'Catch objects with realistic physics and bouncing',
    skills: ['Coordination', 'Physics', 'Prediction']
  },
  { 
    id: 'color-sequence',
    name: 'Color Sequence Memory', 
    icon: PuzzlePieceIcon, 
    color: 'pink', 
    difficulty: 'Medium',
    description: 'Remember color sequences with unique audio cues',
    skills: ['Audio-Visual Memory', 'Sequential Processing', 'Multi-Sensory']
  }
];

export default function BiddingInterface({ listing, onClose, onBidPlaced }: BiddingInterfaceProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'entry' | 'playing' | 'score_submitted'>('entry');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [userListingStats, setUserListingStats] = useState<UserListingStats | null>(null);
  const [isPlayingGame, setIsPlayingGame] = useState(false);
  const [currentGameScore, setCurrentGameScore] = useState<number | null>(null);
  const [isNewBestScore, setIsNewBestScore] = useState(false); // Track if current score is a new best
  
  // Get the seller's chosen game for this listing
  const assignedGame = GAME_TYPES.find(game => game.id === listing.gameType) || GAME_TYPES[0];

  // Load user's existing stats for this listing
  useEffect(() => {
    if (user && listing.id) {
      const stats = userEntryTrackingService.getUserListingStats(user.id, listing.id);
      setUserListingStats(stats);
    }
  }, [user, listing.id]);

  // Helper function to get the best score
  const getBestScore = () => {
    return userListingStats?.bestScore || 0;
  };

  // Helper function to get user scores array
  const getUserScores = () => {
    return userListingStats?.entries.map(entry => entry.score) || [];
  };

  // Helper function to get current entries count
  const getCurrentEntries = () => {
    return userListingStats?.totalEntries || 0;
  };

  // Helper function to get remaining attempts
  const getRemainingAttempts = () => {
    return userListingStats?.remainingAttempts || 3;
  };

  // Mock user tokens and daily limits (in a real app, this would come from auth context)
  const [userTokens] = useState(250);
  const [dailyWins] = useState(1); // Current wins today (max 3)
  const [dailyListings] = useState(7); // Listings participated in today (max 10)

  const handleGameEntry = () => {
    // Check daily win limit
    if (dailyWins >= 3) {
      setError('You have reached the daily win limit (3 wins). Try again tomorrow!');
      return;
    }

    // Check daily listing limit
    if (dailyListings >= 10) {
      setError('You have reached the daily listing limit (10 listings). Try again tomorrow!');
      return;
    }

    // Check if user has enough tokens for one entry
    if (userTokens < 1) {
      setError('You need 1 token to enter this competition.');
      return;
    }

    // Check if user can make more entries for this listing
    if (!user || !userEntryTrackingService.canUserMakeEntry(user.id, listing.id)) {
      setError('You have already made the maximum 3 entries for this listing.');
      return;
    }

    // Start the game immediately after payment
    setIsPlayingGame(true);
    setStep('playing');
  };

  const handleGameComplete = (result: number | any) => {
    // Extract score from result (could be just a number or a GameResult object)
    const score = typeof result === 'number' ? result : result.score;
    if (!user) {
      setError('User not found');
      return;
    }

    // Record the entry in the tracking service
    const entry = userEntryTrackingService.recordEntry(
      user.id,
      listing.id,
      score,
      assignedGame.name
    );

    if (!entry) {
      setError('Failed to record entry');
      return;
    }

    // Check if this is a new best score (before updating stats)
    const previousBest = getBestScore();
    const isNewBest = score > previousBest;
    
    // Update local stats
    const updatedStats = userEntryTrackingService.getUserListingStats(user.id, listing.id);
    setUserListingStats(updatedStats);
    setIsNewBestScore(isNewBest);
    
    setCurrentGameScore(score);
    setIsPlayingGame(false);
    setStep('score_submitted');
    
    // Debug logging
    console.log('Game completed:', {
      score,
      previousBest,
      isNewBest,
      totalEntries: updatedStats.totalEntries,
      bestScore: updatedStats.bestScore
    });
    
    // Submit the entry with hidden score (only the best score matters for competition)
    const bestScore = updatedStats.bestScore;
    const newBid: Bid = {
      id: `game_entry_${Date.now()}_${entry.entryNumber}`,
      listingId: listing.id,
      bidderId: user.id,
      bidder: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'buyer',
        createdAt: new Date(),
        isVerified: true,
        tokens: userTokens - updatedStats.totalEntries,
      },
      amount: 1, // $1 per entry
      priceGuess: 0, // No guessing in game system
      timestamp: new Date(),
      backupChoices: [], // No backup choices in game system
      isShunned: false,
      gameType: assignedGame.name,
      gameScore: bestScore, // Submit best score for competition
    };

    onBidPlaced(newBid);
  };

  const handlePlayAgain = () => {
    if (!user || !userEntryTrackingService.canUserMakeEntry(user.id, listing.id)) {
      setError('You have already made the maximum 3 entries for this listing.');
      return;
    }
    
    const currentEntryCount = getCurrentEntries();
    if (userTokens < currentEntryCount + 1) {
      setError('You need 1 more token to play again.');
      return;
    }

    // Reset for next attempt
    setCurrentGameScore(null);
    setError('');
    setStep('entry');
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600 border-blue-300',
      green: 'from-green-500 to-green-600 border-green-300',
      purple: 'from-purple-500 to-purple-600 border-purple-300',
      yellow: 'from-yellow-500 to-yellow-600 border-yellow-300',
      red: 'from-red-500 to-red-600 border-red-300'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      'Easy': 'text-green-600 bg-green-100',
      'Medium': 'text-yellow-600 bg-yellow-100',
      'Hard': 'text-red-600 bg-red-100'
    };
    return colors[difficulty as keyof typeof colors] || colors['Medium'];
  };

  const renderGameComponent = () => {
    // Create deterministic seed using listing ID and next entry number
    const gameId = `${listing.id}_${getCurrentEntries() + 1}`;
    
    const commonProps = {
      onGameEnd: handleGameComplete,
      isCompetitionMode: true,
      listingId: listing.id,
      entryNumber: getCurrentEntries() + 1, // Next entry number
      gameId: gameId, // For deterministic gameplay
    };

    switch (assignedGame.id) {
      case 'multi-target':
        return <MultiTargetGame {...commonProps} />;
      case 'falling-objects':
        return <FallingObjectGame {...commonProps} />;
      case 'color-sequence':
        return <ColorSequenceGame {...commonProps} />;
      default:
        return (
          <div className="bg-red-100 rounded-xl p-8 text-center">
            <p className="text-red-600 mb-4">❌ Game not found: {assignedGame.id}</p>
            <button 
              onClick={() => handleGameComplete(0)}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
            >
              Skip Game (Score: 0)
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 'entry' && `🎮 ${assignedGame.name} Competition`}
              {step === 'playing' && `🎯 Playing ${assignedGame.name}`}
              {step === 'score_submitted' && '✅ Score Submitted!'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 'entry' && `Pay $1 to play ${assignedGame.name} and compete for this item`}
              {step === 'playing' && 'Play your best - your score will be hidden until the listing closes'}
              {step === 'score_submitted' && 'Your score has been recorded. You can play up to 2 more times.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* User Balance */}
          <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-green-800 font-medium">💰 Your Token Balance:</span>
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 text-green-600 mr-1" />
                <span className="text-green-900 font-bold text-lg">{userTokens} tokens</span>
              </div>
            </div>
          </div>

          {/* Step 1: Game Entry */}
          {step === 'entry' && (
            <div className="space-y-6">
              {/* Game Preview */}
              <div className={`bg-gradient-to-r ${getColorClasses(assignedGame.color)} text-white rounded-xl p-8 border-2 text-center`}>
                <div className="mb-4">
                  <assignedGame.icon className="h-16 w-16 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">🎮 Competition Game:</h3>
                  <div className="text-3xl font-bold mb-2">{assignedGame.name}</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium bg-white/20`}>
                    {assignedGame.difficulty} Difficulty
                  </div>
                </div>
                <p className="text-lg mb-4 opacity-90">{assignedGame.description}</p>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-sm font-medium mb-2">Skills Tested:</div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {assignedGame.skills.map((skill, index) => (
                      <span key={index} className="bg-white/20 px-2 py-1 rounded-full text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Competition Overview */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Competition Details</h3>
                  <p className="text-gray-700 mb-4">
                    Win <strong>{listing.title}</strong> (${(listing.basePrice || 0).toLocaleString()} value) by getting the highest score!
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-white/50 rounded-lg p-3">
                      <div className="font-bold text-purple-600">Prize Value</div>
                      <div className="text-lg font-bold">${(listing.basePrice || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <div className="font-bold text-purple-600">Your Attempts</div>
                      <div className="text-lg font-bold">{getCurrentEntries()}/3</div>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <div className="font-bold text-purple-600">Cost Per Try</div>
                      <div className="text-lg font-bold">$1</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Play Now Section */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-green-500 mr-2" />
                  Ready to Play?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Pay $1 to play {assignedGame.name} and submit your score. You can play up to 3 times total - your highest score wins!
                </p>
                
                {getCurrentEntries() > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                      <div>
                        <strong>Previous Attempts:</strong> {getCurrentEntries()}/3 completed<br/>
                        <strong>Remaining Attempts:</strong> {getRemainingAttempts()}
                      </div>
                      <div>
                        <strong>Amount Spent:</strong> ${userListingStats?.totalAmountPaid || 0}<br/>
                        <strong>Best Score:</strong> {getBestScore().toFixed(0)} points
                      </div>
                    </div>
                  </div>
                )}

                {/* Play Button */}
                <button
                  onClick={handleGameEntry}
                  disabled={dailyWins >= 3 || dailyListings >= 10 || getRemainingAttempts() === 0 || userTokens < 1}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
                    dailyWins >= 3 || dailyListings >= 10 || getRemainingAttempts() === 0 || userTokens < 1
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  <div className="text-center">
                    {dailyWins >= 3 ? '🚫 Daily Win Limit Reached' :
                     dailyListings >= 10 ? '🚫 Daily Listing Limit Reached' :
                     getRemainingAttempts() === 0 ? '✅ Max Attempts Completed' :
                     userTokens < 1 ? '💰 Need More Tokens' :
                     (
                       <>
                         <div className="text-xl">🎮 Play {assignedGame.name} - $1</div>
                         <div className="text-sm opacity-90 mt-1">
                           Attempt {getCurrentEntries() + 1}/3 • 
                           {getCurrentEntries() === 0 ? ' First try!' : ` ${getRemainingAttempts()} left`}
                         </div>
                       </>
                     )}
                  </div>
                </button>
              </div>

              {/* Daily Limits Status */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h4 className="font-bold text-yellow-800 mb-2 flex items-center">
                  <InformationCircleIcon className="h-4 w-4 mr-2" />
                  Daily Limits Status
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-yellow-700">Daily Wins: <strong>{dailyWins}/3</strong></div>
                    <div className="text-xs text-yellow-600">
                      {dailyWins >= 3 ? 'Limit reached - no more games today' : `${3 - dailyWins} wins remaining`}
                    </div>
                  </div>
                  <div>
                    <div className="text-yellow-700">Daily Listings: <strong>{dailyListings}/10</strong></div>
                    <div className="text-xs text-yellow-600">
                      {dailyListings >= 10 ? 'Limit reached - no more listings today' : `${10 - dailyListings} listings remaining`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Information */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">🎮 Competition Game: {assignedGame.name}</p>
                    <p className="mb-2">{assignedGame.description} This game is skill-based and bot-proof, ensuring fair competition for all players.</p>
                    <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 mt-2">
                      <p className="font-bold text-purple-800">🔒 Complete Score Privacy:</p>
                      <p className="text-purple-700 text-xs mt-1">
                        • Your scores are only visible to you<br/>
                        • No other player can see your performance<br/>
                        • All scores remain secret until the listing closes<br/>
                        • Fair competition with identical game conditions for everyone
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How It Works */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <TrophyIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  How Gaming Competitions Work
                </h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                    <div>
                      <strong>Enter for $1:</strong> One entry per person, fair competition for everyone
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                    <div>
                      <strong>Play {assignedGame.name}:</strong> Compete in the seller's chosen skill game
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                    <div>
                      <strong>Timer Countdown:</strong> When base price is reached, countdown begins
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-orange-100 text-orange-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                    <div>
                      <strong>Play & Win:</strong> When timer ends, highest score wins the item!
                    </div>
                  </div>
                </div>
              </div>

              {/* 9 Possible Games Preview */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">🎮 Possible Games (Random Assignment)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {GAME_TYPES.map((game, index) => {
                    const IconComponent = game.icon;
                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center mb-2">
                          <IconComponent className="h-5 w-5 text-gray-600 mr-2" />
                          <span className="font-medium text-sm text-gray-900">{game.name}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ml-auto ${getDifficultyColor(game.difficulty)}`}>
                            {game.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{game.description}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-gray-500 text-center">
                  ❓ You'll get one of these games randomly - no one knows which until they enter!
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Step 2: Playing Game */}
          {step === 'playing' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-8">
                  <h3 className="text-2xl font-bold mb-4">🎮 Playing {assignedGame.name}</h3>
                  <p className="text-lg mb-4">Game is loading... Get ready to play!</p>
                  <div className="bg-white/20 rounded-lg p-4">
                    <p className="text-sm">
                      • Your score will be hidden until the listing closes<br/>
                      • Play your best - this counts toward the competition<br/>
                      • You can play up to {getRemainingAttempts() - 1} more times after this
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Actual Game Component */}
              <div className="bg-white rounded-xl border-2 border-gray-200">
                {renderGameComponent()}
              </div>
            </div>
          )}

          {/* Step 3: Score Submitted */}
          {step === 'score_submitted' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className={`bg-gradient-to-r ${isNewBestScore ? 'from-yellow-500 to-orange-500' : 'from-green-500 to-blue-500'} text-white rounded-xl p-8`}>
                  {isNewBestScore ? (
                    <div className="mb-4">
                      <div className="text-6xl mb-2">🏆</div>
                      <h3 className="text-2xl font-bold mb-2">🎉 NEW BEST SCORE!</h3>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <CheckCircleIcon className="h-16 w-16 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold mb-2">✅ Score Submitted!</h3>
                    </div>
                  )}
                  
                  {/* Current Score Display */}
                  <div className="bg-white/20 rounded-lg p-6 mb-4 border-2 border-white/30">
                    <div className="text-center">
                      <div className="text-5xl font-bold mb-2 text-white drop-shadow-lg">
                        {currentGameScore !== null ? currentGameScore.toFixed(0) : '---'} 
                      </div>
                      <div className="text-xl font-medium opacity-90 mb-2">POINTS</div>
                      <div className="text-lg opacity-75">Your Score This Round</div>
                      {currentGameScore === null && (
                        <div className="text-sm text-red-200 mt-2">⚠️ Score not recorded - please try again</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Best Score Display */}
                  {getUserScores().length > 1 && (
                    <div className="bg-white/10 rounded-lg p-4 mb-4">
                      <div className="text-xl font-bold mb-1">🏆 Your Best: {getBestScore().toFixed(0)} Points</div>
                      <div className="text-sm opacity-75">
                        {isNewBestScore ? 'You just beat your previous best!' : 'This is your competition score'}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white/20 rounded-lg p-4 border border-white/30">
                    <p className="text-sm">
                      🔒 <strong>Complete Privacy:</strong> Your scores are completely private - no other player can see them.<br/>
                      🙈 <strong>Hidden Until Close:</strong> All scores remain secret until the listing closes.<br/>
                      🏆 <strong>Best Score Wins:</strong> Your highest score across all attempts will be your final competition score.<br/>
                      ⚖️ <strong>Fair Competition:</strong> Everyone plays the same game with identical conditions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-bold text-blue-800 mb-3">📊 Your Competition Status</h4>
                
                {/* Current Score Highlight */}
                {currentGameScore !== null && (
                  <div className="bg-blue-100 rounded-lg p-4 mb-4 border border-blue-300">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-800 mb-1">
                        Latest Score: {currentGameScore.toFixed(0)} Points
                      </div>
                      <div className="text-sm text-blue-600">
                        {isNewBestScore ? '🎉 New Personal Best!' : `Best: ${getBestScore().toFixed(0)} points`}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <div className="text-blue-700">Attempts Made: <strong>{getCurrentEntries()}/3</strong></div>
                    <div className="text-blue-700">Remaining Attempts: <strong>{getRemainingAttempts()}</strong></div>
                    <div className="text-blue-700">Amount Spent: <strong>${userListingStats?.totalAmountPaid || 0}</strong></div>
                  </div>
                  <div>
                    <div className="text-blue-700">Competition: <strong>{assignedGame.name}</strong></div>
                    <div className="text-blue-700">Prize Value: <strong>${(listing.basePrice || 0).toLocaleString()}</strong></div>
                    <div className="text-blue-700">Your Best Score: <strong>{getBestScore().toFixed(0)} pts</strong></div>
                  </div>
                </div>
                
                {/* Score History */}
                {getUserScores().length > 0 && (
                  <div className="border-t border-blue-200 pt-4">
                    <div className="text-blue-800 font-medium mb-2">🎯 Your Score History:</div>
                    <div className="flex flex-wrap gap-2">
                      {getUserScores().map((score, index) => (
                        <div 
                          key={index}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            score === getBestScore() 
                              ? 'bg-yellow-200 text-yellow-800 border-2 border-yellow-400' 
                              : 'bg-blue-200 text-blue-800'
                          }`}
                        >
                          Attempt {index + 1}: {score.toFixed(0)}
                          {score === getBestScore() && ' 👑'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {getRemainingAttempts() > 0 && (
                <div className="space-y-4">
                  {/* Encouragement Message */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-center">
                      <div className="text-purple-800 font-medium mb-1">
                        {isNewBestScore 
                          ? "🔥 You're on fire! Can you beat that score?" 
                          : currentGameScore && currentGameScore < getBestScore()
                            ? `💪 You can do better! Your best is ${getBestScore().toFixed(0)} points.`
                            : "🎯 Want to improve your score?"}
                      </div>
                      <div className="text-sm text-purple-600">
                        You have {getRemainingAttempts()} attempt{getRemainingAttempts() !== 1 ? 's' : ''} remaining • Only $1 each
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={handlePlayAgain}
                      className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <div className="text-center">
                        <div className="text-lg">🎮 Play Again - $1</div>
                        <div className="text-sm opacity-90 mt-1">
                          Attempt {getCurrentEntries() + 1}/3 • Beat your {getBestScore().toFixed(0)} points!
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                    >
                      ✅ Done for Now
                    </button>
                  </div>
                </div>
              )}

              {getRemainingAttempts() === 0 && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200 text-center">
                    <div className="text-yellow-800 font-bold text-xl mb-3">🏁 All 3 Attempts Complete!</div>
                    
                    {/* Final Score Summary */}
                    <div className="bg-white/50 rounded-lg p-4 mb-4">
                      <div className="text-3xl font-bold text-yellow-800 mb-2">
                        {getBestScore().toFixed(0)} Points
                      </div>
                      <div className="text-lg text-yellow-700 mb-2">Your Final Competition Score</div>
                      <div className="text-sm text-yellow-600">
                        Total Spent: ${userListingStats?.totalAmountPaid || 0} • 
                        Best of {getCurrentEntries()} attempts
                      </div>
                    </div>
                    
                    {/* All Scores Summary */}
                    {getUserScores().length > 1 && (
                      <div className="text-sm text-yellow-600 mb-3">
                        All your scores: {getUserScores().map(score => score.toFixed(0)).join(', ')} points
                      </div>
                    )}
                    
                    <div className="text-sm text-yellow-600">
                      This score will compete against other players when the listing closes.
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-xl transition-all"
                  >
                    ✅ Competition Entry Complete - Good Luck!
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}