'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ClockIcon, 
  FireIcon, 
  CurrencyDollarIcon, 
  EyeSlashIcon,
  TrophyIcon,
  UserGroupIcon,
  ChartBarIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import TournamentPaymentService from '@/lib/tournamentPayments';
import GameEntryFlow from '@/components/games/GameEntryFlow';
import ViewResultsButton from '@/components/games/ViewResultsButton';

export default function HotSellPage() {
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  const [entryResult, setEntryResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedDollars, setSelectedDollars] = useState<{ [key: string]: number }>({});
  const [tournamentData, setTournamentData] = useState<any[]>([]);
  const [dailyWinners, setDailyWinners] = useState<any>({});
  const [showGameEntry, setShowGameEntry] = useState<{
    tournamentId: string;
    gameType: string;
    gameName: string;
  } | null>(null);
  
  // Mock token price for display
  const tokenPrice = 2.45; // $2.45 per token

  // Calculate dynamic final pot after 15% platform fee
  const calculateFinalPot = (collected: number) => {
    return Math.round((collected * 0.85) * 100) / 100; // 85% goes to winners, 15% to platform
  };

  // Initialize tournament data
  useEffect(() => {
    const tournaments = [
      {
        id: 'micro-10',
        name: '$10 Micro Tournament',
        prize: 10,
        minThreshold: 10,
        collected: 0, // Reset to zero
        participants: 0,
        color: 'yellow',
        maxWinnersPerDay: Infinity, // Infinite plays per day
        todaysWinners: 0,
        finalPot: 0,
        recentWinners: [],
        gameType: 'multi-target',
        gameName: 'Multi-Target Reaction'
      },
      {
        id: 'starter-100',
        name: 'Starter Tournament',
        prize: 100,
        minThreshold: 100,
        collected: 0, // Reset to zero
        participants: 0,
        color: 'green',
        maxWinnersPerDay: 10,
        todaysWinners: 0,
        finalPot: 0,
        recentWinners: [],
        gameType: 'falling-objects',
        gameName: 'Falling Objects Catch'
      },
      {
        id: 'intermediate-500',
        name: 'Intermediate Tournament',
        prize: 500,
        minThreshold: 500,
        collected: 0, // Reset to zero
        participants: 0,
        color: 'blue',
        maxWinnersPerDay: 5,
        todaysWinners: 0,
        finalPot: 0,
        recentWinners: [],
        gameType: 'color-sequence',
        gameName: 'Color Sequence Memory'
      },
      {
        id: 'advanced-2500',
        name: 'Advanced Tournament',
        prize: 2500,
        minThreshold: 2500,
        collected: 0, // Reset to zero
        participants: 0,
        color: 'purple',
        maxWinnersPerDay: 5,
        todaysWinners: 0,
        finalPot: 0,
        recentWinners: [],
        gameType: 'multi-target',
        gameName: 'Multi-Target Reaction'
      },
      {
        id: 'elite-25000',
        name: 'Elite Championship',
        prize: 25000,
        minThreshold: 25000,
        collected: 0, // Reset to zero
        participants: 0,
        color: 'red',
        maxWinnersPerDay: 2,
        todaysWinners: 0,
        finalPot: 0,
        recentWinners: [],
        gameType: 'falling-objects',
        gameName: 'Falling Objects Catch'
      }
    ];

    setTournamentData(tournaments);

    // Initialize selectedDollars for all tournaments to 1
    const initialSelectedDollars: { [key: string]: number } = {};
    tournaments.forEach(t => {
      initialSelectedDollars[t.id] = 1;
    });
    setSelectedDollars(initialSelectedDollars);

    // Load daily winners
    const mockDailyWinners = TournamentPaymentService.getDailyWinners();
    setDailyWinners(mockDailyWinners);
  }, []);

  const handleTournamentEntry = async (tournamentId: string) => {
    // Find the tournament and use its assigned game
    const tournament = tournamentData.find(t => t.id === tournamentId);
    if (!tournament) {
      setEntryResult({
        success: false,
        message: 'Tournament not found!'
      });
      return;
    }
    
    // Show the game entry flow with the tournament's assigned game
    setShowGameEntry({
      tournamentId,
      gameType: tournament.gameType,
      gameName: tournament.gameName
    });
  };

  // Function to handle successful tournament entry (called when user completes payment)
  const handleTournamentEntryComplete = (tournamentId: string, amountPaid: number) => {
    setTournamentData(prevData => 
      prevData.map(tournament => {
        if (tournament.id === tournamentId) {
          const newCollected = tournament.collected + amountPaid;
          const newParticipants = tournament.participants + 1;
          return {
            ...tournament,
            collected: newCollected,
            participants: newParticipants,
            finalPot: Math.round((newCollected * 0.85) * 100) / 100
          };
        }
        return tournament;
      })
    );
  };

  const getProgressBarColor = (color: string) => {
    switch (color) {
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-500';
      case 'purple': return 'bg-purple-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Show game entry flow if user clicked on a tournament
  if (showGameEntry) {
    return (
      <GameEntryFlow
        listingId={`tournament-${showGameEntry.tournamentId}`}
        tournamentId={showGameEntry.tournamentId}
        gameType={showGameEntry.gameType}
        gameName={showGameEntry.gameName}
        onExit={() => setShowGameEntry(null)}
        onPaymentSuccess={handleTournamentEntryComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/DropCoin.png" alt="Dollar Drop" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Dollar Drop</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">Browse</Link>
              <Link href="/categories" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">Categories</Link>
              <Link href="/games" className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors">🎮 Games</Link>
              <Link href="/hot-sell" className="text-red-600 dark:text-green-400 hover:text-red-700 dark:hover:text-green-300 font-bold transition-colors">🔥 Hot Sell</Link>
              <Link href="/how-it-works" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">How It Works</Link>
              <Link href="/buy-tokens" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">💰 Buy Tokens</Link>
              <Link href="/tournaments" className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors">🏆 Tournaments</Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 transition-colors">
                <Link href="/wallet" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">👛 Wallet</Link>
                <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors">⚙️ Settings</Link>
                <Link href="/auth/login" className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors">Sign In</Link>
                <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sign Up</Link>
                <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sell</Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            🔥 Hot Sell Tournaments 🔥
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Compete in skill-based games for amazing prizes!
          </p>
        </div>

        {entryResult && (
          <div className={`mb-6 p-4 rounded-lg text-center ${entryResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {entryResult.message}
          </div>
        )}


        {/* Daily Tournaments Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            🏆 Daily Tournaments - Multiple Winners!
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {tournamentData.map(tournament => {
              const progressPercentage = Math.min(100, (tournament.collected / tournament.minThreshold) * 100);
              const thresholdMet = tournament.collected >= tournament.minThreshold;
              const dollarsToUse = selectedDollars[tournament.id] || 1;
              const tokensNeeded = (dollarsToUse / tokenPrice).toFixed(4);
              const availableSlots = tournament.maxWinnersPerDay === Infinity ? Infinity : tournament.maxWinnersPerDay - tournament.todaysWinners;

              return (
                <div key={tournament.id} className={`bg-gradient-to-br from-${tournament.color}-50 to-${tournament.color}-100 rounded-2xl p-6 border-2 border-${tournament.color}-200 shadow-lg hover:shadow-xl transition-all`}>
                  <div className="text-center mb-4">
                    <TrophyIcon className={`h-12 w-12 mx-auto text-${tournament.color}-600 mb-3`} />
                    <h3 className="text-xl font-bold text-gray-900">{tournament.name}</h3>
                    <div className={`text-3xl font-bold text-${tournament.color}-600 mt-2`}>${tournament.prize.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Token Prize Pool</div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry:</span>
                      <span className="font-bold text-gray-900">$1-$3 worth of tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Token Price:</span>
                      <span className="font-bold text-blue-600">${tokenPrice.toFixed(4)} per token</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Final Pot:</span>
                      <span className="font-bold text-green-600">${tournament.finalPot.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Winners:</span>
                      <span className="font-bold text-purple-600">
                        {tournament.maxWinnersPerDay === Infinity ? 'Unlimited' : `${tournament.maxWinnersPerDay} max`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Slots Left:</span>
                      <span className={`font-bold ${availableSlots === Infinity || availableSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {availableSlots === Infinity ? 'Unlimited' : availableSlots}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cooldown:</span>
                      <span className="font-bold text-orange-600">3 months</span>
                    </div>
                  </div>

                  {/* Tournament Game Display */}
                  <div className="bg-white rounded-lg p-4 mb-4 border-2 border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center justify-center">
                      🎮 Tournament Game
                    </h4>
                    <div className="text-center">
                      <div className="text-2xl mb-2">
                        {(() => {
                          const gameEmojis = {
                            'multi-target': '🎯',
                            'falling-objects': '💼',
                            'color-sequence': '🌈'
                          };
                          return gameEmojis[tournament.gameType as keyof typeof gameEmojis] || '🎮';
                        })()}
                      </div>
                      <div className="font-bold text-gray-900 mb-1">
                        {tournament.gameName}
                      </div>
                      <div className="text-sm text-gray-600">
                        {(() => {
                          const descriptions = {
                            'multi-target': 'Click all glowing targets quickly',
                            'falling-objects': 'Catch coins and dollars with briefcase',
                            'color-sequence': 'Remember and repeat color sequences'
                          };
                          return descriptions[tournament.gameType as keyof typeof descriptions] || 'Skill-based competition';
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress to Start:</span>
                      <span className="font-bold text-gray-900">{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`${getProgressBarColor(tournament.color)} h-2.5 rounded-full`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    {thresholdMet ? (
                      <div className="text-sm text-green-600 mt-1 font-medium flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-1" /> Tournament Active!
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">
                        ${tournament.minThreshold - tournament.collected} more needed to start.
                      </p>
                    )}
                  </div>

                  {/* Winner Slots Warning */}
                  {availableSlots === 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center text-red-700">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">All daily winner slots filled!</span>
                      </div>
                    </div>
                  )}

                  {/* Dollar Amount Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Dollar Amount:</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3].map(dollars => (
                        <button
                          key={dollars}
                          onClick={() => setSelectedDollars(prev => ({ ...prev, [tournament.id]: dollars }))}
                          className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                            (selectedDollars[tournament.id] || 1) === dollars
                              ? `bg-${tournament.color}-600 text-white`
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <div className="text-center">
                            <div>${dollars}</div>
                            <div className="text-xs opacity-75">
                              {((dollars / tokenPrice)).toFixed(4)} tokens
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleTournamentEntry(tournament.id)}
                      disabled={isProcessingEntry || (availableSlots === 0 && availableSlots !== Infinity)}
                      className={`w-full font-bold py-3 rounded-lg transition-colors ${
                        isProcessingEntry || (availableSlots === 0 && availableSlots !== Infinity)
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : `bg-${tournament.color}-600 hover:bg-${tournament.color}-700 text-white`
                      }`}
                    >
                      {isProcessingEntry ? '⏳ Processing...' : 
                       (availableSlots === 0 && availableSlots !== Infinity) ? '🚫 No Slots Available' :
                       `🪙 Enter with $${dollarsToUse} worth of tokens`}
                    </button>

                    {/* View Results Button */}
                    <ViewResultsButton
                      listingId={`tournament-${tournament.id}`}
                      tournamentId={tournament.id}
                      gameType={tournament.gameType}
                      gameName={tournament.gameName}
                      className="w-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 Dollar Drop - Revolutionary Multi-Winner Tournament System</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
            <Link href="/categories" className="text-gray-400 hover:text-white">Categories</Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-400 hover:text-white">Terms & Conditions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}