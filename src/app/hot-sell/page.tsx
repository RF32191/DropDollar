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
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import TournamentPaymentService from '@/lib/tournamentPayments';
import GameEntryFlow from '@/components/games/GameEntryFlow';
import ViewResultsButton from '@/components/games/ViewResultsButton';
import { useGlobalLocation } from '@/hooks/useGlobalLocation';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import PaymentModal from '@/components/payments/PaymentModal';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/contexts/AuthContext';
import CleanNavigation from '@/components/navigation/CleanNavigation';

export default function HotSellPage() {
  const { user } = useAuth();
  const { getPaymentAmounts } = usePayment();
  const globalLocation = useGlobalLocation();
  
  // 10-minute inactivity timeout
  useInactivityTimeout({
    timeout: 10 * 60 * 1000, // 10 minutes
    onTimeout: () => {
      console.log('🕐 Hot-sell page timeout - reloading for fresh content');
      window.location.reload();
    },
    enabled: true
  });
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
  
  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    amount: number;
    title: string;
    description: string;
    metadata: any;
  } | null>(null);
  
  const paymentAmounts = getPaymentAmounts();
  
  // Check if gaming is allowed in the user's state
  const isGamingAllowed = (state: string): { allowed: boolean; message: string } => {
    const stateLower = state.toLowerCase();
    
    // States where skill-based gaming is generally allowed
    const allowedStates = [
      'california', 'texas', 'florida', 'new york', 'illinois', 'pennsylvania',
      'ohio', 'georgia', 'north carolina', 'michigan', 'new jersey', 'virginia',
      'washington', 'arizona', 'massachusetts', 'tennessee', 'indiana', 'missouri',
      'maryland', 'wisconsin', 'colorado', 'minnesota', 'south carolina', 'alabama',
      'louisiana', 'kentucky', 'oregon', 'oklahoma', 'connecticut', 'utah',
      'iowa', 'nevada', 'arkansas', 'mississippi', 'kansas', 'new mexico',
      'nebraska', 'west virginia', 'idaho', 'hawaii', 'new hampshire', 'maine',
      'montana', 'rhode island', 'delaware', 'south dakota', 'north dakota',
      'alaska', 'vermont', 'wyoming'
    ];

    if (allowedStates.includes(stateLower)) {
      return {
        allowed: true,
        message: `✅ Gaming allowed in ${state}! You can participate in skill-based competitions.`
      };
    } else {
      return {
        allowed: false,
        message: `⚠️ Gaming restrictions may apply in ${state}. Please check local regulations.`
      };
    }
  };
  
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
        maxWinnersPerDay: Infinity, // Changed to infinite
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
        maxWinnersPerDay: 10, // Changed to 10 games max per day
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
    if (!user) {
      alert('Please sign in to enter Hot Sell competitions');
      return;
    }

    // Find the tournament and use its assigned game
    const tournament = tournamentData.find(t => t.id === tournamentId);
    if (!tournament) {
      setEntryResult({
        success: false,
        message: 'Tournament not found!'
      });
      return;
    }
    
    const entryAmount = selectedDollars[tournamentId] || 1;
    
    // Set up payment for Hot Sell entry
    setPaymentConfig({
      amount: entryAmount * 100, // Convert to cents
      title: `Enter ${tournament.name}`,
      description: `Entry fee: $${entryAmount.toFixed(2)} - ${tournament.gameName}`,
      metadata: {
        tournamentId,
        gameType: tournament.gameType,
        gameName: tournament.gameName,
        entryAmount
      }
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentIntent: any) => {
    if (!paymentConfig) return;

    const { tournamentId, gameType, gameName, entryAmount } = paymentConfig.metadata;

    // Complete tournament entry after payment
    handleTournamentEntryComplete(tournamentId, entryAmount);
    
    // Show game entry flow
    setShowGameEntry({
      tournamentId,
      gameType,
      gameName
    });

    setEntryResult({
      success: true,
      message: `Payment successful! You've entered the ${gameName} competition with $${entryAmount.toFixed(2)}.`
    });

    setShowPaymentModal(false);
    setPaymentConfig(null);
  };

  const handlePaymentError = (error: string) => {
    setEntryResult({ success: false, message: `Payment failed: ${error}` });
    setShowPaymentModal(false);
    setPaymentConfig(null);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Clean Navigation */}
      <CleanNavigation variant="gradient" currentPage="/hot-sell" />

      {/* FIRE HERO SECTION */}
      <div className="relative bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-800 dark:via-orange-700 dark:to-yellow-600 py-20 overflow-hidden">
        {/* Animated Fire Elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-40 h-40 bg-red-400/40 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute top-20 right-20 w-32 h-32 bg-orange-400/50 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-10 left-1/3 w-48 h-48 bg-yellow-400/30 rounded-full blur-2xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-20 right-1/4 w-36 h-36 bg-red-500/40 rounded-full blur-2xl animate-pulse delay-3000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-7xl md:text-8xl font-black mb-6 bg-gradient-to-r from-white via-yellow-100 to-orange-100 bg-clip-text text-transparent drop-shadow-2xl">
              🔥 HOT SELL 🔥
            </h1>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">
              Winner Cooldown Tournaments
            </h2>
            <p className="text-3xl font-bold text-yellow-200 mb-8 italic drop-shadow-lg">
              "Don't drop out, drop a dollar."
            </p>
            <p className="text-xl text-orange-100 max-w-4xl mx-auto drop-shadow-md">
              🚀 FAST-PACED CASH COMPETITIONS! 💰 Limited time tournaments with REAL money prizes!
            </p>
            
            {/* Fire Stats Bar */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50">
                <div className="text-2xl font-bold text-yellow-300">5 MIN</div>
                <div className="text-orange-200 text-xs">$10 Tournaments</div>
              </div>
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50">
                <div className="text-2xl font-bold text-green-300">10 MIN</div>
                <div className="text-orange-200 text-xs">$100 Tournaments</div>
              </div>
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50">
                <div className="text-2xl font-bold text-blue-300">30 MIN</div>
                <div className="text-orange-200 text-xs">$500 Tournaments</div>
              </div>
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50">
                <div className="text-2xl font-bold text-purple-300">1 HOUR</div>
                <div className="text-orange-200 text-xs">$2500 Tournaments</div>
              </div>
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50">
                <div className="text-2xl font-bold text-pink-300">2 HOURS</div>
                <div className="text-orange-200 text-xs">$25000 Tournaments</div>
              </div>
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50">
                <div className="text-2xl font-bold text-red-300">LIVE</div>
                <div className="text-orange-200 text-xs">Active Now</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-16 bg-gradient-to-br from-gray-900 to-red-950">

        {entryResult && (
          <div className={`mb-6 p-4 rounded-lg text-center ${entryResult.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {entryResult.message}
          </div>
        )}


        {/* FIRE TOURNAMENTS SECTION */}
        <section className="mb-20">
          <h2 className="text-5xl font-black text-center mb-4 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
            🔥 LIVE FIRE TOURNAMENTS 🔥
          </h2>
          <p className="text-xl text-center text-gray-600 dark:text-gray-300 mb-12 transition-colors">
            ⚡ FAST & FURIOUS ⚡ Multiple Winners Every Round!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full overflow-x-auto">
            <div className="contents">{/* Wrapper for grid items */}
            {tournamentData.map(tournament => {
              const progressPercentage = Math.min(100, (tournament.collected / tournament.minThreshold) * 100);
              const thresholdMet = tournament.collected >= tournament.minThreshold;
              const dollarsToUse = selectedDollars[tournament.id] || 1;
              const tokensNeeded = (dollarsToUse / tokenPrice).toFixed(4);
              const availableSlots = tournament.maxWinnersPerDay === Infinity ? Infinity : tournament.maxWinnersPerDay - tournament.todaysWinners;

              // Get timer duration based on tournament
              const getTimerDuration = (tournamentId: string) => {
                if (tournamentId === 'micro-10') return '5 minutes';
                if (tournamentId === 'starter-100') return '10 minutes';
                if (tournamentId === 'intermediate-500') return '30 minutes';
                if (tournamentId === 'advanced-2500') return '1 hour';
                if (tournamentId === 'elite-25000') return '2 hours';
                return 'Variable';
              };

              return (
                <div key={tournament.id} className={`relative group bg-gradient-to-br from-gray-900 via-${tournament.color}-900/30 to-black dark:from-black dark:via-${tournament.color}-950/50 dark:to-gray-950 rounded-3xl p-6 border-2 border-${tournament.color}-500/50 shadow-2xl hover:shadow-${tournament.color}-500/25 transition-all duration-500 hover:scale-105 overflow-hidden`}>
                  {/* Fire Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-${tournament.color}-500/10 via-transparent to-${tournament.color}-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  {/* Prize Header */}
                  <div className="relative z-10 text-center mb-6">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-${tournament.color}-400 to-${tournament.color}-600 mb-4 shadow-lg shadow-${tournament.color}-500/50`}>
                      <span className="text-2xl font-black text-white">💰</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{tournament.name}</h3>
                    <div className={`text-5xl font-black bg-gradient-to-r from-${tournament.color}-400 to-${tournament.color}-200 bg-clip-text text-transparent mb-2`}>
                      ${tournament.prize.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-300 bg-gray-800/50 rounded-full px-3 py-1 inline-block">
                      💵 CASH PRIZE
                    </div>
                  </div>

                  {/* Tournament Stats */}
                  <div className="relative z-10 space-y-3 mb-6">
                    {/* Timer Duration - NEW */}
                    <div className="flex justify-between items-center bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-lg p-3 border border-orange-500/30">
                      <span className="text-orange-200 font-medium flex items-center">
                        ⏱️ Tournament Timer:
                      </span>
                      <span className="font-bold text-yellow-300 text-lg">
                        {getTimerDuration(tournament.id)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-gray-400 text-xs">Entry Range</div>
                        <div className="font-bold text-white">$1-$3</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-gray-400 text-xs">Token Price</div>
                        <div className="font-bold text-blue-300">${tokenPrice.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="bg-green-900/30 rounded-lg p-3 border border-green-500/30">
                      <div className="flex justify-between">
                        <span className="text-green-200">💰 Final Pot:</span>
                        <span className="font-bold text-green-300 text-lg">${tournament.finalPot.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-500/30">
                        <div className="text-purple-200 text-xs">Daily Winners</div>
                        <div className="font-bold text-purple-300">
                          {tournament.maxWinnersPerDay === Infinity ? '∞' : tournament.maxWinnersPerDay}
                        </div>
                      </div>
                      <div className="bg-cyan-900/30 rounded-lg p-3 text-center border border-cyan-500/30">
                        <div className="text-cyan-200 text-xs">Slots Left</div>
                        <div className={`font-bold ${availableSlots === Infinity || availableSlots > 0 ? 'text-green-300' : 'text-red-300'}`}>
                          {availableSlots === Infinity ? '∞' : availableSlots}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-orange-900/30 rounded-lg p-3 border border-orange-500/30">
                      <div className="flex justify-between">
                        <span className="text-orange-200">🏆 Winner Cooldown:</span>
                        <span className="font-bold text-orange-300">
                          {tournament.id === 'micro-10' ? '1 week' : 
                           tournament.id === 'starter-100' ? '1 month' :
                           tournament.id === 'intermediate-500' ? '2 months' : '3 months'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FIRE Game Display */}
                  <div className="relative z-10 bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-xl p-4 mb-6 border-2 border-yellow-500/50 shadow-lg">
                    <h4 className="font-bold text-yellow-300 mb-3 flex items-center justify-center text-lg">
                      🎮 TOURNAMENT GAME
                    </h4>
                    <div className="text-center">
                      <div className="text-5xl mb-3 animate-pulse">
                        {(() => {
                          const gameEmojis = {
                            'multi-target': '🎯',
                            'falling-objects': '💼',
                            'color-sequence': '🌈'
                          };
                          return gameEmojis[tournament.gameType as keyof typeof gameEmojis] || '🎮';
                        })()}
                      </div>
                      <div className="font-bold text-white mb-2 text-lg">
                        {tournament.gameName}
                      </div>
                      <div className="text-sm text-gray-300 bg-gray-700/50 rounded-full px-3 py-1 inline-block">
                        {(() => {
                          const descriptions = {
                            'multi-target': '🎯 Click all glowing targets quickly',
                            'falling-objects': '💰 Catch coins and dollars with cash case',
                            'color-sequence': '🌈 Remember and repeat color sequences'
                          };
                          return descriptions[tournament.gameType as keyof typeof descriptions] || '🎮 Skill-based competition';
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* FIRE Progress Bar */}
                  <div className="relative z-10 mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300 font-medium">🔥 FIRE PROGRESS:</span>
                      <span className="font-bold text-white bg-gray-800/50 px-2 py-1 rounded">{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 border border-gray-600">
                      <div
                        className={`bg-gradient-to-r from-${tournament.color}-500 to-${tournament.color}-300 h-3 rounded-full transition-all duration-500 shadow-lg shadow-${tournament.color}-500/50`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    {thresholdMet ? (
                      <div className="text-sm text-green-300 mt-2 font-bold flex items-center justify-center bg-green-900/30 rounded-lg p-2 border border-green-500/30">
                        <CheckCircleIcon className="h-4 w-4 mr-2" /> 🔥 TOURNAMENT BLAZING! 🔥
                      </div>
                    ) : (
                      <p className="text-sm text-orange-300 mt-2 text-center bg-orange-900/30 rounded-lg p-2 border border-orange-500/30">
                        💰 ${tournament.minThreshold - tournament.collected} more to ignite!
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
                          disabled={!(globalLocation.status === 'granted' && globalLocation.isGamingAllowed)}
                          className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                            !(globalLocation.status === 'granted' && globalLocation.isGamingAllowed)
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : (selectedDollars[tournament.id] || 1) === dollars
                              ? `bg-${tournament.color}-600 text-white`
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                    {globalLocation.status === 'granted' && globalLocation.isGamingAllowed ? (
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
                         `🔥 Enter Competition - $${dollarsToUse}`}
                      </button>
                    ) : globalLocation.status === 'restricted' ? (
                      <div className="w-full py-3 px-4 rounded-lg bg-red-700 border border-red-600 text-center">
                        <div className="text-red-300 text-sm mb-2">
                          <ShieldExclamationIcon className="h-5 w-5 inline mr-2" />
                          Gaming Not Allowed in Your Location
                        </div>
                        <div className="text-red-200 text-xs">
                          Skill-based gaming is restricted in your state
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => globalLocation.requestLocation()}
                        className={`w-full font-bold py-3 rounded-lg transition-colors bg-${tournament.color}-600 hover:bg-${tournament.color}-700 text-white`}
                      >
                        Location Verification Required
                      </button>
                    )}

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
            </div>{/* End wrapper */}
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 DropDollar - Revolutionary Multi-Winner Tournament System</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
            <Link href="/categories" className="text-gray-400 hover:text-white">Categories</Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-400 hover:text-white">Terms & Conditions</Link>
          </div>
        </div>
      </footer>

      {/* Game Entry Flow */}
      {showGameEntry && (
        <GameEntryFlow
          listingId={`hotsell-${showGameEntry.tournamentId}`}
          tournamentId={showGameEntry.tournamentId}
          gameType={showGameEntry.gameType}
          gameName={showGameEntry.gameName}
          onExit={() => setShowGameEntry(null)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentConfig && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentConfig(null);
          }}
          amount={paymentConfig.amount}
          title={paymentConfig.title}
          description={paymentConfig.description}
          type="hotsell"
          metadata={paymentConfig.metadata}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}

      {/* Entry Result Modal */}
      {entryResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center">
            <div className={`text-6xl mb-4 ${entryResult.success ? 'text-green-500' : 'text-red-500'}`}>
              {entryResult.success ? '✅' : '❌'}
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              {entryResult.success ? 'Success!' : 'Error'}
            </h3>
            <p className="text-gray-300 mb-6">
              {entryResult.message}
            </p>
            <button
              onClick={() => setEntryResult(null)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}