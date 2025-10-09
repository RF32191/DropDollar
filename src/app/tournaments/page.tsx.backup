'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrophyIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  FireIcon,
  CalendarIcon,
  StarIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import TournamentService, { DailyTournament } from '@/lib/supabase/tournamentService';
import EnhancedTournamentService from '@/lib/supabase/enhancedTournamentService';
import { useAuth } from '@/contexts/AuthContext';
import GameEntryFlow from '@/components/games/GameEntryFlow';
import { useSkillMatchmaking } from '@/hooks/useSkillMatchmaking';
import { SkillMatchmakingService } from '@/lib/supabase/skillMatchmakingService';
import PaymentModal from '@/components/payments/PaymentModal';
import { usePayment } from '@/hooks/usePayment';

// Game rotation system - changes daily
const GAME_ROTATION = [
  { gameType: 'multi-target', name: 'Multi-Target Reaction', emoji: '🎯' },
  { gameType: 'falling-objects', name: 'Falling Object Catch', emoji: '💰' },
  { gameType: 'color-sequence', name: 'Color Sequence Memory', emoji: '🌈' }
];

// Get today's game based on date
const getTodaysGame = () => {
  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  return GAME_ROTATION[dayIndex % GAME_ROTATION.length];
};

export default function TournamentsPage() {
  const { user } = useAuth();
  const { getPaymentAmounts } = usePayment();
  const {
    skillRatings,
    matchmakingState,
    matchHistory,
    isLoading: matchmakingLoading,
    error: matchmakingError,
    joinQueue,
    cancelMatchmaking,
    submitMatchResult,
    getSkillRating,
    getSkillTier,
    getWinRate,
    clearError
  } = useSkillMatchmaking();
  
  // Tournament state
  const [tournaments, setTournaments] = useState<DailyTournament[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<{
    tournamentId: string;
    gameType: string;
    gameName: string;
  } | null>(null);
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  const [entryResult, setEntryResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    amount: number;
    title: string;
    description: string;
    type: 'tournament' | 'match';
    metadata: any;
  } | null>(null);
  
  const todaysGame = getTodaysGame();
  const paymentAmounts = getPaymentAmounts();

  // Enhanced Tournament Configurations (Hot Sell Style)
  const enhancedTournaments = [
    {
      id: 'elite-500',
      name: '$500 Elite Championship',
      prize: 500,
      actualPrize: 425, // 500 - 15% = 425
      color: 'red',
      gameType: 'multi-target',
      gameName: 'Multi-Target Reaction',
      entryFee: 5,
      maxParticipants: 100,
      description: 'High-stakes tournament - 1 submission per user, weekly win limit',
      participants: 0
    },
    {
      id: 'pro-250',
      name: '$250 Pro Tournament',
      prize: 250,
      actualPrize: 212.50, // 250 - 15% = 212.50
      color: 'orange',
      gameType: 'falling-objects',
      gameName: 'Falling Object Catch',
      entryFee: 5,
      maxParticipants: 50,
      description: 'Mid-tier tournament - 1 submission per user, weekly win limit',
      participants: 0
    },
    {
      id: 'challenger-100',
      name: '$100 Challenger Cup',
      prize: 100,
      actualPrize: 85, // 100 - 15% = 85
      color: 'yellow',
      gameType: 'color-sequence',
      gameName: 'Color Sequence Memory',
      entryFee: 5,
      maxParticipants: 25,
      description: 'Entry-level tournament - 1 submission per user, weekly win limit',
      participants: 0
    }
  ];

  // 1v1 Match Configurations
  const matchTiers = [
    { name: 'Bronze Match', bet: 5, color: 'amber', gameType: 'multi-target', gameName: 'Multi-Target Reaction' },
    { name: 'Silver Match', bet: 10, color: 'gray', gameType: 'falling-objects', gameName: 'Falling Object Catch' },
    { name: 'Gold Match', bet: 25, color: 'yellow', gameType: 'color-sequence', gameName: 'Color Sequence Memory' }
  ];

  const handleJoinTournament = async (tournamentId: string, entryFee: number, gameType: string, gameName: string) => {
    if (!user) {
      alert('Please sign in to join tournaments');
      return;
    }
    
    // Set up payment for tournament entry
    setPaymentConfig({
      amount: entryFee * 100, // Convert to cents
      title: `Join Tournament`,
      description: `Enter the ${gameName} tournament - Entry fee: $${entryFee.toFixed(2)}`,
      type: 'tournament',
      metadata: {
        tournamentId,
        gameType,
        gameName
      }
    });
    setShowPaymentModal(true);
  };

  const handleCreateMatch = async (betAmount: number, gameType: string, gameName: string) => {
    if (!user) {
      alert('Please sign in to create matches');
      return;
    }

    // Set up payment for 1v1 match
    setPaymentConfig({
      amount: betAmount * 100, // Convert to cents
      title: `Join 1v1 Match`,
      description: `Enter ${gameName} 1v1 match - Entry fee: $${betAmount.toFixed(2)}`,
      type: 'match',
      metadata: {
        gameType,
        gameName,
        betAmount
      }
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentIntent: any) => {
    if (!paymentConfig) return;

    try {
      setIsProcessingEntry(true);
      clearError();

      if (paymentConfig.type === 'tournament') {
        // Process tournament entry after payment
        setEntryResult({ 
          success: true, 
          message: `Payment successful! You've been entered into the ${paymentConfig.metadata.gameName} tournament.` 
        });
        setSelectedTournament({
          tournamentId: paymentConfig.metadata.tournamentId,
          gameType: paymentConfig.metadata.gameType,
          gameName: paymentConfig.metadata.gameName
        });
      } else if (paymentConfig.type === 'match') {
        // Process 1v1 match entry after payment
        await joinQueue(paymentConfig.metadata.gameType, paymentConfig.metadata.betAmount, 150);
        setEntryResult({ 
          success: true, 
          message: `Payment successful! Searching for opponent with similar skill level...` 
        });
      }
    } catch (error: any) {
      setEntryResult({ success: false, message: error.message || 'Failed to join after payment' });
    } finally {
      setIsProcessingEntry(false);
      setShowPaymentModal(false);
      setPaymentConfig(null);
    }
  };

  const handlePaymentError = (error: string) => {
    setEntryResult({ success: false, message: `Payment failed: ${error}` });
    setShowPaymentModal(false);
    setPaymentConfig(null);
  };

  // Load tournaments from Supabase
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let tournamentsData: DailyTournament[];
        
        if (selectedFilter === 'all') {
          tournamentsData = await TournamentService.getActiveTournaments();
        } else {
          tournamentsData = await TournamentService.getTournamentsByStatus(selectedFilter);
        }
        
        setTournaments(tournamentsData);
      } catch (err) {
        console.error('Error loading tournaments:', err);
        setError('Failed to load tournaments. Please try again.');
        // Fallback to empty array
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    loadTournaments();
  }, [selectedFilter]);

  // Generate tournaments if none exist (for demo purposes)
  useEffect(() => {
    const generateTournamentsIfNeeded = async () => {
      try {
        if (tournaments.length === 0 && !loading && !error) {
          await TournamentService.generateDailyTournaments();
          // Reload tournaments after generation
          const newTournaments = await TournamentService.getActiveTournaments();
          setTournaments(newTournaments);
        }
      } catch (err) {
        console.error('Error generating tournaments:', err);
      }
    };

    generateTournamentsIfNeeded();
  }, [tournaments.length, loading, error]);

  const filteredTournaments = tournaments.filter(tournament => {
    return selectedFilter === 'all' || tournament.status === selectedFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-600 bg-green-100';
      case 'Intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'Expert': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Daily': return '📅';
      case 'Weekly': return '🗓️';
      case 'Monthly': return '📆';
      case 'Special': return '⭐';
      default: return '🏆';
    }
  };

  const formatTimeUntil = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();
    
    if (diff < 0) return 'Started';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* GOLD TOURNAMENTS Header */}
      <header className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 dark:from-yellow-600 dark:via-yellow-700 dark:to-amber-800 shadow-2xl border-b-4 border-yellow-600 dark:border-yellow-500">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo Section */}
            <Link href="/" className="flex items-center group">
              <div className="bg-gradient-to-br from-yellow-300 to-amber-500 dark:from-yellow-400 dark:to-amber-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 mr-4">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-white to-yellow-100 dark:from-yellow-100 dark:to-white bg-clip-text text-transparent group-hover:from-yellow-100 group-hover:to-white transition-all duration-300">
                DropDollar
              </div>
            </Link>

            {/* GOLD Navigation */}
            <nav className="flex-1 mx-4">
              <div className="flex items-center justify-center space-x-4">
                <Link href="/listings" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">Browse</Link>
                <Link href="/categories" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">Categories</Link>
                <Link href="/games" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">🎮 Games</Link>
                
                {/* Active Tournaments Link */}
                <div className="bg-gradient-to-r from-yellow-300 to-amber-400 dark:from-yellow-400 dark:to-amber-500 px-4 py-2 rounded-xl shadow-lg">
                  <Link href="/tournaments" className="text-yellow-900 dark:text-yellow-800 hover:text-yellow-800 dark:hover:text-yellow-700 font-bold transition-colors text-sm">🏆 Tournaments</Link>
                </div>
                
                <Link href="/hot-sell" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">🔥 Hot Sell</Link>
                <Link href="/how-it-works" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">How It Works</Link>
              </div>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-2">
              <Link href="/auth/login" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">Sign In</Link>
              <Link href="/auth/register" className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-white/30">Sign Up</Link>
              <Link href="/seller/apply" className="bg-yellow-300 hover:bg-yellow-200 text-yellow-900 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg">Sell</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* GOLD Hero Section */}
        <div className="bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 dark:from-yellow-600 dark:via-amber-700 dark:to-yellow-800 rounded-3xl p-8 mb-8 shadow-2xl border-4 border-yellow-500 dark:border-yellow-400">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              🏆 Daily Tournament Arena 🏆
            </h1>
            <p className="text-xl text-yellow-100 dark:text-yellow-200 max-w-4xl mx-auto mb-6">
              Compete in $5 daily tournaments with smaller player pools for better winning odds!
            </p>
            
            {/* Today's Game Showcase */}
            <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-6 max-w-3xl mx-auto border border-white/30">
              <h2 className="text-2xl font-bold text-white mb-4">
                Today's Featured Game: {todaysGame.emoji} {todaysGame.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold">$5</div>
                  <div className="text-sm">Entry Fee</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold">15%</div>
                  <div className="text-sm">Platform Fee</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold">4</div>
                  <div className="text-sm">Daily Tournaments</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Fee Notice */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-700 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" />
            <h3 className="text-lg font-bold text-red-900 dark:text-red-100">💰 Daily Tournament Rules</h3>
          </div>
          <div className="text-red-800 dark:text-red-200 text-center mb-4">
            <p className="mb-2"><strong>$5 Entry Fee:</strong> All daily tournaments have a fixed $5 entry fee to keep competition accessible.</p>
            <p className="mb-2"><strong>15% Platform Fee:</strong> DropDollar takes 15% of the total prize pool. Winners get 85% of collected fees.</p>
            <p><strong>Daily Reset:</strong> Tournaments reset every day unless they haven't filled up - then they continue until complete.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-2xl mx-auto">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">Example Prize Breakdown</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">$50</div>
                <div className="text-gray-600 dark:text-gray-400 mb-1">10 Players × $5</div>
                <div className="text-sm text-red-600 dark:text-red-400">-$7.50 (15%)</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">$42.50</div>
                <div className="text-gray-600 dark:text-gray-400">Winner Prize</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">$125</div>
                <div className="text-gray-600 dark:text-gray-400 mb-1">25 Players × $5</div>
                <div className="text-sm text-red-600 dark:text-red-400">-$18.75 (15%)</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">$106.25</div>
                <div className="text-gray-600 dark:text-gray-400">Winner Prize</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">$500</div>
                <div className="text-gray-600 dark:text-gray-400 mb-1">100 Players × $5</div>
                <div className="text-sm text-red-600 dark:text-red-400">-$75 (15%)</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">$425</div>
                <div className="text-gray-600 dark:text-gray-400">Winner Prize</div>
              </div>
            </div>
          </div>
        </div>

        {/* 1v1 Match Arena - Tournament Banner Style */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl p-8 shadow-2xl border-2 border-purple-300 dark:border-purple-600 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-purple-600 dark:text-purple-400 mb-4">
              ⚔️ 1v1 SKILL MATCHES
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Challenge opponents in direct skill competitions!
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* $5 Match - Tournament Banner Style */}
            <div className="relative bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-3xl p-8 shadow-2xl border-2 border-green-400/50 hover:scale-105 transition-all duration-300 group overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 right-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-4 left-4 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse delay-1000"></div>
              </div>

              {/* Match Header */}
              <div className="relative z-10 text-center mb-6">
                <div className="text-6xl mb-4">💚</div>
                <h3 className="text-2xl font-black text-white mb-2">
                  $10 Prize Pool
                </h3>
                <div className="text-3xl font-black text-yellow-300 mb-2">
                  Winner Gets: $8.50
                </div>
                <p className="text-xl font-bold text-white/90 mb-1">
                  $5 Quick Match
                </p>
                <p className="text-white/80">
                  Direct 1v1 Competition
                </p>
                <div className="text-sm text-white/70 mt-2">
                  (-15% platform fee)
                </div>
              </div>

              {/* Match Stats */}
              <div className="relative z-10 space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">$5</div>
                    <div className="text-xs text-white/80">Entry Fee</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">1v1</div>
                    <div className="text-xs text-white/80">Players</div>
                  </div>
                </div>

                {/* Match Rules */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <div className="flex items-center justify-between text-sm text-white/90">
                    <div className="flex items-center">
                      <span>⚡ Instant Match</span>
                    </div>
                    <div className="flex items-center">
                      <span>Best of 1</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Challenge Button */}
              <div className="relative z-10">
                <button className="w-full bg-gradient-to-r from-white/20 to-white/30 hover:from-white/30 hover:to-white/40 backdrop-blur-sm text-white font-black py-4 rounded-2xl transition-all shadow-xl hover:shadow-2xl border-2 border-white/30 hover:border-white/50">
                  <span className="flex items-center justify-center">
                    <span className="mr-2">⚔️</span>
                    CHALLENGE PLAYER
                    <span className="ml-2">💚</span>
                  </span>
                </button>
              </div>
            </div>

            {/* $10 Match - Tournament Banner Style */}
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-8 shadow-2xl border-2 border-blue-400/50 hover:scale-105 transition-all duration-300 group overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 right-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-4 left-4 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse delay-1000"></div>
              </div>

              {/* Match Header */}
              <div className="relative z-10 text-center mb-6">
                <div className="text-6xl mb-4">💙</div>
                <h3 className="text-2xl font-black text-white mb-2">
                  $20 Prize Pool
                </h3>
                <div className="text-3xl font-black text-yellow-300 mb-2">
                  Winner Gets: $17.00
                </div>
                <p className="text-xl font-bold text-white/90 mb-1">
                  $10 Standard Match
                </p>
                <p className="text-white/80">
                  Direct 1v1 Competition
                </p>
                <div className="text-sm text-white/70 mt-2">
                  (-15% platform fee)
                </div>
              </div>

              {/* Match Stats */}
              <div className="relative z-10 space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">$10</div>
                    <div className="text-xs text-white/80">Entry Fee</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">1v1</div>
                    <div className="text-xs text-white/80">Players</div>
                  </div>
                </div>

                {/* Match Rules */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <div className="flex items-center justify-between text-sm text-white/90">
                    <div className="flex items-center">
                      <span>⚡ Instant Match</span>
                    </div>
                    <div className="flex items-center">
                      <span>Best of 1</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Challenge Button */}
              <div className="relative z-10">
                <button className="w-full bg-gradient-to-r from-white/20 to-white/30 hover:from-white/30 hover:to-white/40 backdrop-blur-sm text-white font-black py-4 rounded-2xl transition-all shadow-xl hover:shadow-2xl border-2 border-white/30 hover:border-white/50">
                  <span className="flex items-center justify-center">
                    <span className="mr-2">⚔️</span>
                    CHALLENGE PLAYER
                    <span className="ml-2">💙</span>
                  </span>
                </button>
              </div>
            </div>

            {/* $25 Match - Tournament Banner Style */}
            <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-3xl p-8 shadow-2xl border-2 border-purple-400/50 hover:scale-105 transition-all duration-300 group overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 right-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-4 left-4 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse delay-1000"></div>
              </div>

              {/* Match Header */}
              <div className="relative z-10 text-center mb-6">
                <div className="text-6xl mb-4">💜</div>
                <h3 className="text-2xl font-black text-white mb-2">
                  $50 Prize Pool
                </h3>
                <div className="text-3xl font-black text-yellow-300 mb-2">
                  Winner Gets: $42.50
                </div>
                <p className="text-xl font-bold text-white/90 mb-1">
                  $25 Premium Match
                </p>
                <p className="text-white/80">
                  Direct 1v1 Competition
                </p>
                <div className="text-sm text-white/70 mt-2">
                  (-15% platform fee)
                </div>
              </div>

              {/* Match Stats */}
              <div className="relative z-10 space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">$25</div>
                    <div className="text-xs text-white/80">Entry Fee</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">1v1</div>
                    <div className="text-xs text-white/80">Players</div>
                  </div>
                </div>

                {/* Match Rules */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <div className="flex items-center justify-between text-sm text-white/90">
                    <div className="flex items-center">
                      <span>⚡ Instant Match</span>
                    </div>
                    <div className="flex items-center">
                      <span>Best of 1</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Challenge Button */}
              <div className="relative z-10">
                <button className="w-full bg-gradient-to-r from-white/20 to-white/30 hover:from-white/30 hover:to-white/40 backdrop-blur-sm text-white font-black py-4 rounded-2xl transition-all shadow-xl hover:shadow-2xl border-2 border-white/30 hover:border-white/50">
                  <span className="flex items-center justify-center">
                    <span className="mr-2">⚔️</span>
                    CHALLENGE PLAYER
                    <span className="ml-2">💜</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 1v1 Match Info - Updated */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-300 dark:border-purple-600 rounded-2xl p-6">
            <div className="flex items-start">
              <span className="text-purple-600 dark:text-purple-400 text-2xl mr-3 mt-0.5">⚔️</span>
              <div className="text-sm text-purple-800 dark:text-purple-200">
                <p className="font-bold mb-3 text-lg">💡 1v1 Match Prize Breakdown</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>$5 Match:</strong> $10 pool → Winner gets $8.50 (-15%)</li>
                    <li>• <strong>$10 Match:</strong> $20 pool → Winner gets $17.00 (-15%)</li>
                    <li>• <strong>$25 Match:</strong> $50 pool → Winner gets $42.50 (-15%)</li>
                    <li>• <strong>Platform Fee:</strong> 15% deducted from total prize pool</li>
                  </ul>
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>Direct Competition:</strong> Face off against one other player</li>
                    <li>• <strong>Instant Matching:</strong> Get matched with similar skill players</li>
                    <li>• <strong>Same Games:</strong> Uses skill-based games from tournaments</li>
                    <li>• <strong>Quick Results:</strong> Winner determined immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Match Alert */}
        {matchmakingState.activeMatch && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 shadow-2xl mb-8 border-2 border-green-400">
            <div className="text-center text-white">
              <div className="text-3xl mb-4">⚔️</div>
              <h3 className="text-2xl font-bold mb-2">MATCH FOUND!</h3>
              <p className="text-lg mb-4">
                1v1 {matchmakingState.activeMatch.game_type.replace('-', ' ')} match for ${matchmakingState.activeMatch.bet_amount}
              </p>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-bold">Your Rating</div>
                    <div>{matchmakingState.activeMatch.player1_rating}</div>
                  </div>
                  <div>
                    <div className="font-bold">Opponent Rating</div>
                    <div>{matchmakingState.activeMatch.player2_rating || 'Loading...'}</div>
                  </div>
                </div>
              </div>
              <Link
                href={`/games?listingId=match-${matchmakingState.activeMatch.id}&gameType=${matchmakingState.activeMatch.game_type}`}
                className="inline-block bg-white text-green-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-all shadow-lg"
              >
                🎮 PLAY MATCH
              </Link>
            </div>
          </div>
        )}

        {/* Skill Rating Overview */}
        {skillRatings.length > 0 && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 shadow-2xl mb-8 border-2 border-purple-400">
            <h3 className="text-2xl font-bold text-white text-center mb-6">⭐ Your Skill Ratings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {skillRatings.map((rating) => {
                const tier = getSkillTier(rating.skill_rating);
                const winRate = getWinRate(rating);
                const gameInfo = GAME_ROTATION.find(g => g.gameType === rating.game_type);
                
                return (
                  <div key={rating.game_type} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl mb-2">{gameInfo?.emoji || '🎮'}</div>
                      <div className="text-sm text-white/80 mb-1">{gameInfo?.name || rating.game_type}</div>
                      <div className={`text-lg font-bold mb-1 ${
                        tier.color === 'amber' ? 'text-amber-300' :
                        tier.color === 'gray' ? 'text-gray-300' :
                        tier.color === 'yellow' ? 'text-yellow-300' :
                        tier.color === 'blue' ? 'text-blue-300' :
                        tier.color === 'purple' ? 'text-purple-300' :
                        tier.color === 'red' ? 'text-red-300' :
                        'text-white'
                      }`}>
                        {tier.name}
                      </div>
                      <div className="text-white font-bold text-xl mb-2">{rating.skill_rating}</div>
                      <div className="text-xs text-white/70">
                        {rating.games_played} games • {winRate}% win rate
                      </div>
                      {rating.win_streak > 0 && (
                        <div className="text-xs text-yellow-300 mt-1">
                          🔥 {rating.win_streak} win streak!
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Display */}
        {matchmakingError && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-8">
            <div className="text-red-300 font-bold">Matchmaking Error</div>
            <div className="text-red-200 text-sm">{matchmakingError}</div>
            <button
              onClick={clearError}
              className="mt-2 text-red-300 hover:text-red-100 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Enhanced Tournament Banners (Hot Sell Style) */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-yellow-600 dark:text-yellow-400 mb-4">
              🏆 LIVE SKILL TOURNAMENTS
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Join high-stakes tournaments with winner tracking and weekly limits!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {enhancedTournaments.map((tournament, index) => (
              <div
                key={tournament.id}
                className={`relative bg-gradient-to-br ${
                  tournament.color === 'red' ? 'from-red-600 via-red-700 to-red-800' :
                  tournament.color === 'orange' ? 'from-orange-600 via-orange-700 to-orange-800' :
                  'from-yellow-600 via-yellow-700 to-yellow-800'
                } rounded-3xl p-8 shadow-2xl border-2 ${
                  tournament.color === 'red' ? 'border-red-400/50' :
                  tournament.color === 'orange' ? 'border-orange-400/50' :
                  'border-yellow-400/50'
                } hover:scale-105 transition-all duration-300 group overflow-hidden`}
              >
                {/* Animated Background Elements */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 right-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                  <div className="absolute bottom-4 left-4 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse delay-1000"></div>
                </div>

                {/* Tournament Header */}
                <div className="relative z-10 text-center mb-6">
                  <div className="text-6xl mb-4">
                    {tournament.color === 'red' ? '🔥' : 
                     tournament.color === 'orange' ? '⚡' : '⭐'}
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">
                    ${tournament.prize} Prize Pool
                  </h3>
                  <div className="text-3xl font-black text-yellow-300 mb-2">
                    Winner Gets: ${tournament.actualPrize}
                  </div>
                  <p className="text-xl font-bold text-white/90 mb-1">
                    {tournament.name}
                  </p>
                  <p className="text-white/80">
                    {tournament.gameName}
                  </p>
                  <div className="text-sm text-white/70 mt-2">
                    (After 15% platform fee)
                  </div>
                </div>

                {/* Tournament Stats */}
                <div className="relative z-10 space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-white">
                        {tournament.participants}/{tournament.maxParticipants}
                      </div>
                      <div className="text-xs text-white/80">Participants</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-white">
                        ${tournament.entryFee}
                      </div>
                      <div className="text-xs text-white/80">Entry Fee</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/90 font-medium">Tournament Progress</span>
                      <span className="text-white/70">
                        {Math.round((tournament.participants / tournament.maxParticipants) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-white/60 to-white/80 h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min((tournament.participants / tournament.maxParticipants) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Tournament Rules */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <div className="flex items-center justify-between text-sm text-white/90">
                      <div className="flex items-center">
                        <ShieldCheckIcon className="h-4 w-4 mr-1" />
                        <span>1 Submission Only</span>
                      </div>
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>Weekly Limit</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Join Button */}
                <div className="relative z-10">
                  <button
                    onClick={() => handleJoinTournament(
                      tournament.id, 
                      tournament.entryFee, 
                      tournament.gameType, 
                      tournament.gameName
                    )}
                    className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-white/30"
                  >
                    🎯 JOIN TOURNAMENT - ${tournament.entryFee}
                  </button>
                </div>

                {/* Auto-Generation Badge */}
                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-white">
                  🤖 Auto-Generated
                </div>
              </div>
            ))}
          </div>

          {/* 1v1 Matches Section */}
          <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-black rounded-3xl p-8 mb-12">
            <div className="text-center mb-8">
              <h3 className="text-4xl font-black text-white mb-4">
                ⚔️ 1v1 SKILL MATCHES
              </h3>
              <p className="text-xl text-gray-300">
                Challenge opponents in direct skill competitions!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {matchTiers.map((tier, index) => {
                // Calculate prize pool and winner amount
                const prizePool = tier.bet * 2; // Two players
                const platformFee = prizePool * 0.15; // 15% fee
                const winnerAmount = prizePool - platformFee; // 85% to winner
                
                // Get player's skill rating for this game type
                const playerRating = getSkillRating(tier.gameType);
                const skillTier = playerRating ? getSkillTier(playerRating.skill_rating) : null;
                const winRate = playerRating ? getWinRate(playerRating) : 0;
                
                // Check if player is in queue for this game type
                const isInQueueForGame = matchmakingState.isInQueue && 
                  matchmakingState.queueEntry?.game_type === tier.gameType &&
                  matchmakingState.queueEntry?.bet_amount === tier.bet;
                
                return (
                  <div
                    key={tier.name}
                    className={`bg-gradient-to-br ${
                      tier.color === 'amber' ? 'from-amber-600 via-amber-700 to-amber-800' :
                      tier.color === 'gray' ? 'from-gray-600 via-gray-700 to-gray-800' :
                      'from-yellow-500 via-yellow-600 to-yellow-700'
                    } rounded-2xl p-6 shadow-xl border-2 ${
                      tier.color === 'amber' ? 'border-amber-400/50' :
                      tier.color === 'gray' ? 'border-gray-400/50' :
                      'border-yellow-400/50'
                    } hover:scale-105 transition-all duration-300 ${
                      isInQueueForGame ? 'ring-4 ring-green-400 animate-pulse' : ''
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-5xl mb-4">
                        {tier.color === 'amber' ? '🥉' : 
                         tier.color === 'gray' ? '🥈' : '🥇'}
                      </div>
                      <h4 className="text-xl font-black text-white mb-2">
                        {tier.name}
                      </h4>
                      <p className="text-white/80 mb-4 text-sm">
                        {tier.gameName}
                      </p>
                      
                      {/* Player Skill Rating */}
                      {playerRating && skillTier && (
                        <div className="mb-4 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                          <div className="text-sm text-white/90 mb-1">Your Skill Level</div>
                          <div className={`text-lg font-bold mb-1 ${
                            skillTier.color === 'amber' ? 'text-amber-300' :
                            skillTier.color === 'gray' ? 'text-gray-300' :
                            skillTier.color === 'yellow' ? 'text-yellow-300' :
                            skillTier.color === 'blue' ? 'text-blue-300' :
                            skillTier.color === 'purple' ? 'text-purple-300' :
                            skillTier.color === 'red' ? 'text-red-300' :
                            'text-rainbow-300'
                          }`}>
                            {skillTier.name} ({playerRating.skill_rating})
                          </div>
                          <div className="text-xs text-white/70">
                            {playerRating.games_played} games • {winRate}% win rate
                          </div>
                        </div>
                      )}
                      
                      {/* Matchmaking Status */}
                      {isInQueueForGame && (
                        <div className="mb-4 bg-green-500/20 backdrop-blur-sm rounded-lg p-3 border border-green-400">
                          <div className="text-green-300 font-bold text-sm mb-1">
                            🔍 SEARCHING FOR OPPONENT
                          </div>
                          <div className="text-green-200 text-xs">
                            Est. wait: {Math.floor(matchmakingState.estimatedWaitTime / 60)}:{String(matchmakingState.estimatedWaitTime % 60).padStart(2, '0')}
                          </div>
                          <div className="text-green-200 text-xs mt-1">
                            Skill range: ±150 rating
                          </div>
                        </div>
                      )}
                      
                      {/* Prize Pool Display */}
                      <div className="mb-4">
                        <div className="text-lg font-bold text-white/90 mb-1">
                          ${prizePool} Prize Pool
                        </div>
                        <div className="text-2xl font-black text-yellow-300 mb-2">
                          Winner Gets: ${winnerAmount.toFixed(2)}
                        </div>
                        <div className="text-xs text-white/70">
                          (-15% platform fee)
                        </div>
                      </div>
                      
                      {/* Entry Fee */}
                      <div className="text-lg font-bold text-white mb-4">
                        Entry Fee: ${tier.bet}
                      </div>
                      
                      {/* Action Button */}
                      {isInQueueForGame ? (
                        <button
                          onClick={() => cancelMatchmaking(tier.gameType)}
                          className="w-full bg-red-500/80 hover:bg-red-500 backdrop-blur-sm text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 shadow-lg border border-red-400"
                        >
                          ❌ CANCEL SEARCH
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCreateMatch(tier.bet, tier.gameType, tier.gameName)}
                          disabled={isProcessingEntry || matchmakingLoading}
                          className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 shadow-lg border border-white/30 disabled:opacity-50"
                        >
                          {isProcessingEntry || matchmakingLoading ? 'Joining Queue...' : `🎯 FIND MATCH`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tournament Status Filter */}
        <div className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-6 shadow-lg mb-8 border-2 border-yellow-300 dark:border-yellow-600">
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <span className="font-bold text-yellow-900 dark:text-yellow-100 text-lg">Tournament Status:</span>
            <div className="flex space-x-3">
              {(['all', 'upcoming', 'active', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedFilter(status)}
                  className={`px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg ${
                    selectedFilter === status
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-xl scale-105'
                      : 'bg-white dark:bg-gray-800 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-50 dark:hover:bg-gray-700 hover:scale-105'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Tournament Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
          {filteredTournaments.map((tournament) => (
            <div key={tournament.id} className="bg-gradient-to-br from-white to-yellow-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-6 shadow-2xl hover:shadow-3xl transition-all border-2 border-yellow-200 dark:border-yellow-600 hover:scale-105 group">
              {/* Tournament Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-yellow-600 transition-colors">
                  {tournament.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{tournament.description}</p>
                
                {/* Status Badge */}
                <div className="flex justify-center mb-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(tournament.status)} shadow-lg`}>
                    {tournament.status === 'active' ? '🔴 LIVE NOW' : 
                     tournament.status === 'upcoming' ? '⏰ Starting Soon' : 
                     tournament.status === 'completed' ? '✅ Completed' : '📅 Scheduled'}
                  </span>
                </div>
              </div>

              {/* Game Showcase */}
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-2xl p-4 mb-6 border border-yellow-300 dark:border-yellow-600">
                <div className="text-center">
                  <div className="text-4xl mb-2">{todaysGame.emoji}</div>
                  <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">{tournament.game_name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Today's Featured Game</div>
                </div>
              </div>

              {/* Prize Pool Display */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 mb-6 border border-green-200 dark:border-green-700">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                    ${tournament.final_prize_pool.toFixed(2)}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">Winner Takes All</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ${tournament.prize_pool} collected - ${tournament.platform_fee.toFixed(2)} platform fee
                  </div>
                </div>
              </div>

              {/* Tournament Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-700">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${tournament.entry_fee}</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Entry Fee</div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center border border-purple-200 dark:border-purple-700">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {tournament.current_participants}/{tournament.max_participants}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Players</div>
                  <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mt-2">
                    <div 
                      className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(tournament.current_participants / tournament.max_participants) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Tournament Timing */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-6 border border-orange-200 dark:border-orange-700">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <ClockIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      {tournament.status === 'upcoming' ? 'Starts In' : 
                       tournament.status === 'active' ? 'Time Remaining' : 'Completed'}
                    </span>
                  </div>
                  <div className="font-bold text-orange-900 dark:text-orange-100">
                    {tournament.status === 'upcoming' ? formatTimeUntil(tournament.start_time) : 
                     tournament.status === 'active' ? formatTimeUntil(tournament.end_time) : 'Tournament Ended'}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={tournament.status === 'completed' || tournament.is_filled}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-bold py-4 rounded-2xl transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group-hover:scale-105 border-2 border-yellow-400"
              >
                {tournament.status === 'completed' ? (
                  <>
                    <TrophyIcon className="h-6 w-6 mr-2" />
                    View Results
                  </>
                ) : tournament.is_filled ? (
                  <>
                    <UserGroupIcon className="h-6 w-6 mr-2" />
                    Tournament Full
                  </>
                ) : tournament.status === 'active' ? (
                  <>
                    <PlayIcon className="h-6 w-6 mr-2" />
                    🔴 JOIN LIVE - $5
                  </>
                ) : (
                  <>
                    <CurrencyDollarIcon className="h-6 w-6 mr-2" />
                    Register for $5
                  </>
                )}
                <ChevronRightIcon className="h-5 w-5 ml-2" />
              </button>
            </div>
          ))}
        </div>

        {/* Daily Tournament Info */}
        <div className="mt-12 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-3xl p-8 shadow-2xl border-2 border-yellow-300 dark:border-yellow-600">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
            🏆 How Daily Tournaments Work 🏆
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-yellow-200 dark:border-yellow-600">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">1. Pay $5</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Fixed $5 entry fee for all daily tournaments. No hidden costs or variable pricing.
              </p>
            </div>
            
            <div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-yellow-200 dark:border-yellow-600">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlayIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">2. Play Game</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Compete in today's featured game. Each day rotates between different skill-based games.
              </p>
            </div>
            
            <div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-yellow-200 dark:border-yellow-600">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrophyIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">3. Win Prize</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Winner takes 85% of the prize pool. Smaller pools mean better odds of winning!
              </p>
            </div>

            <div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-yellow-200 dark:border-yellow-600">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">4. Daily Reset</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                New tournaments every day with fresh games and prize pools. Play daily for more chances!
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 border-2 border-red-300 dark:border-red-600 rounded-2xl p-6">
            <div className="flex items-start">
              <StarIcon className="h-6 w-6 text-red-600 dark:text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-bold mb-3 text-lg">💡 Daily Tournament Rules & Tips</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>$5 Fixed Entry:</strong> All tournaments cost exactly $5 to enter</li>
                    <li>• <strong>15% Platform Fee:</strong> DropDollar takes 15% of total prize pool</li>
                    <li>• <strong>Winner Takes All:</strong> Single winner gets 85% of collected fees</li>
                    <li>• <strong>Daily Game Rotation:</strong> Games change every day (no mystery games)</li>
                  </ul>
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>Smaller Pools:</strong> Better odds with 10-100 player limits</li>
                    <li>• <strong>Daily Reset:</strong> Tournaments reset daily unless unfilled</li>
                    <li>• <strong>Practice First:</strong> Play games for free in the Games section</li>
                    <li>• <strong>Real-Time Results:</strong> All data stored on Supabase server</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Display */}
      {entryResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center">
            <div className={`text-6xl mb-4 ${entryResult.success ? 'text-green-500' : 'text-red-500'}`}>
              {entryResult.success ? '✅' : '❌'}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {entryResult.success ? 'Success!' : 'Error'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
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

      {/* Game Entry Flow */}
      {selectedTournament && (
        <GameEntryFlow
          listingId={`tournament-${selectedTournament.tournamentId}`}
          tournamentId={selectedTournament.tournamentId}
          gameType={selectedTournament.gameType}
          gameName={selectedTournament.gameName}
          onExit={() => setSelectedTournament(null)}
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
          type={paymentConfig.type}
          metadata={paymentConfig.metadata}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
    </div>
  );
}
