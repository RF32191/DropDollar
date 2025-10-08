'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ClockIcon, 
  FireIcon, 
  CurrencyDollarIcon, 
  TrophyIcon,
  UserGroupIcon,
  ChartBarIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  CalendarIcon,
  UsersIcon,
  SwordIcon,
  StarIcon,
  GiftIcon
} from '@heroicons/react/24/outline';
import EnhancedTournamentService, { 
  ActiveTournament, 
  UserTournamentCooldown 
} from '@/lib/supabase/enhancedTournamentService';
import { useAuth } from '@/contexts/AuthContext';
import GameEntryFlow from '@/components/games/GameEntryFlow';

export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<ActiveTournament[]>([]);
  const [matchTiers, setMatchTiers] = useState<any[]>([]);
  const [userCooldowns, setUserCooldowns] = useState<UserTournamentCooldown[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<{
    tournamentId: string;
    gameType: string;
    gameName: string;
  } | null>(null);
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  const [entryResult, setEntryResult] = useState<{ success: boolean; message: string } | null>(null);

  // Initialize tournament data
  useEffect(() => {
    loadTournamentData();
  }, [user]);

  const loadTournamentData = async () => {
    try {
      setLoading(true);
      
      const [tournamentsData, matchTiersData] = await Promise.all([
        EnhancedTournamentService.getActiveTournaments(),
        EnhancedTournamentService.getMatchTiers()
      ]);
      
      setTournaments(tournamentsData);
      setMatchTiers(matchTiersData);
      
      // Load user-specific data if logged in
      if (user) {
        const cooldownsData = await EnhancedTournamentService.getUserCooldowns(user.id);
        setUserCooldowns(cooldownsData);
      }
    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTournament = async (tournamentId: string, entryFee: number, gameType: string, gameName: string) => {
    if (!user) {
      alert('Please sign in to join tournaments');
      return;
    }

    setSelectedTournament({ tournamentId, gameType, gameName });
  };

  const handleCreateMatch = async (betAmount: number, gameType: string, gameName: string) => {
    if (!user) {
      alert('Please sign in to create matches');
      return;
    }

    try {
      setIsProcessingEntry(true);
      await EnhancedTournamentService.createMatch(user.id, betAmount, gameType);
      setEntryResult({ success: true, message: 'Match created! Waiting for opponent...' });
      loadTournamentData(); // Refresh data
    } catch (error: any) {
      setEntryResult({ success: false, message: error.message || 'Failed to create match' });
    } finally {
      setIsProcessingEntry(false);
    }
  };

  const handleJoinMatch = async (matchId: string) => {
    if (!user) {
      alert('Please sign in to join matches');
      return;
    }

    try {
      setIsProcessingEntry(true);
      await EnhancedTournamentService.joinMatch(matchId, user.id);
      setEntryResult({ success: true, message: 'Successfully joined match!' });
      loadTournamentData(); // Refresh data
    } catch (error: any) {
      setEntryResult({ success: false, message: error.message || 'Failed to join match' });
    } finally {
      setIsProcessingEntry(false);
    }
  };

  const isUserOnCooldown = (categoryId: string): UserTournamentCooldown | null => {
    return userCooldowns.find(cooldown => 
      cooldown.tournament_category_id === categoryId &&
      new Date(cooldown.cooldown_until) > new Date()
    ) || null;
  };

  const formatTimeRemaining = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const gameNames = {
    'multi-target': 'Multi-Target Reaction',
    'falling-objects': 'Falling Object Catch',
    'color-sequence': 'Color Sequence Memory'
  };

  const multiTournaments = tournaments.filter(t => t.tournament_type === 'multi');
  const oneVOneMatches = tournaments.filter(t => t.tournament_type === '1v1');

  // Hot Sell style tournament configurations
  const hotSellTournaments = [
    {
      id: 'elite-500',
      name: '$500 Elite Championship',
      prize: 500,
      color: 'red',
      gameType: 'multi-target',
      gameName: 'Multi-Target Reaction',
      entryFee: 5,
      maxParticipants: 100,
      duration: '24h',
      description: 'High-stakes tournament with $500 prize pool'
    },
    {
      id: 'pro-250',
      name: '$250 Pro Tournament',
      prize: 250,
      color: 'orange',
      gameType: 'falling-objects',
      gameName: 'Falling Object Catch',
      entryFee: 5,
      maxParticipants: 50,
      duration: '24h',
      description: 'Mid-tier tournament with $250 prize pool'
    },
    {
      id: 'challenger-100',
      name: '$100 Challenger Cup',
      prize: 100,
      color: 'yellow',
      gameType: 'color-sequence',
      gameName: 'Color Sequence Memory',
      entryFee: 5,
      maxParticipants: 25,
      duration: '24h',
      description: 'Entry-level tournament with $100 prize pool'
    }
  ];

  const matchTierConfigs = [
    { name: 'Bronze Match', bet: 5, color: 'amber', gameType: 'multi-target' },
    { name: 'Silver Match', bet: 10, color: 'gray', gameType: 'falling-objects' },
    { name: 'Gold Match', bet: 25, color: 'yellow', gameType: 'color-sequence' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Logo */}
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center space-x-3">
                  <span className="text-3xl">💧</span>
                  <span className="text-2xl font-black text-white">DropDollar</span>
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center space-x-1">
                <Link href="/categories" className="text-white/80 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  Browse
                </Link>
                <Link href="/games" className="text-white/80 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  Games
                </Link>
                <Link href="/tournaments" className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-bold">
                  🏆 Tournaments
                </Link>
                <Link href="/hot-sell" className="text-white/80 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  🔥 Hot Sell
                </Link>
                <Link href="/dropafund" className="text-cyan-300 hover:text-cyan-200 px-4 py-2 rounded-lg font-medium transition-colors">
                  💧 DropAFund
                </Link>
              </div>

              {/* User Actions */}
              <div className="flex items-center space-x-3">
                {user ? (
                  <div className="text-white font-medium">
                    Welcome, {user.email?.split('@')[0]}!
                  </div>
                ) : (
                  <>
                    <Link href="/auth/login" className="text-white/80 hover:text-white font-medium transition-colors">
                      Sign In
                    </Link>
                    <Link href="/auth/register" className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative py-20 text-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <div className="text-8xl mb-6">🏆</div>
              <h1 className="text-6xl md:text-8xl font-black mb-6">
                <span className="bg-gradient-to-r from-purple-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-2xl">
                  SKILL TOURNAMENTS
                </span>
              </h1>
              <p className="text-2xl md:text-3xl text-purple-100 font-bold tracking-wide max-w-4xl mx-auto mb-8">
                Weekly tournaments with auto-generation, winner tracking, and fair play rules!
              </p>
              
              {/* Tournament Rules */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <ShieldCheckIcon className="h-12 w-12 text-purple-300 mx-auto mb-3" />
                  <div className="text-white font-bold text-lg mb-2">One Submission</div>
                  <div className="text-purple-200 text-sm">Only 1 attempt per tournament</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <CalendarIcon className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                  <div className="text-white font-bold text-lg mb-2">Weekly Limits</div>
                  <div className="text-blue-200 text-sm">Win 1 category per week max</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <BoltIcon className="h-12 w-12 text-indigo-300 mx-auto mb-3" />
                  <div className="text-white font-bold text-lg mb-2">Auto-Generation</div>
                  <div className="text-indigo-200 text-sm">New tournaments auto-created</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <CurrencyDollarIcon className="h-12 w-12 text-green-300 mx-auto mb-3" />
                  <div className="text-white font-bold text-lg mb-2">$5 Max Bet</div>
                  <div className="text-green-200 text-sm">Affordable entry fees</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* User Cooldowns Warning */}
        {user && userCooldowns.length > 0 && (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-6">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-8 w-8 text-orange-300 mr-4 mt-1" />
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      🚫 Active Cooldowns
                    </h3>
                    <p className="text-orange-200 mb-4 text-lg">
                      You have won tournaments this week and are on cooldown for the following categories:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userCooldowns.map(cooldown => (
                        <div key={cooldown.id} className="bg-orange-400/20 rounded-xl p-4 border border-orange-300/30">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white text-lg">
                              Category Cooldown
                            </span>
                            <span className="text-orange-200">
                              Until: {new Date(cooldown.cooldown_until).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Multi-Player Tournaments */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black text-white mb-4">
                🏆 LIVE TOURNAMENTS
              </h2>
              <p className="text-xl text-purple-200">
                Join skill-based tournaments with guaranteed prize pools and winner tracking!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {hotSellTournaments.map((tournament, index) => {
                const actualTournament = multiTournaments.find(t => 
                  t.game_type === tournament.gameType
                );
                const cooldown = isUserOnCooldown(actualTournament?.category_id || '');
                const canJoin = !cooldown && actualTournament && 
                  actualTournament.current_participants < actualTournament.max_participants;

                return (
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
                      <h3 className="text-3xl font-black text-white mb-2">
                        ${tournament.prize}
                      </h3>
                      <p className="text-xl font-bold text-white/90 mb-1">
                        {tournament.name}
                      </p>
                      <p className="text-white/80">
                        {tournament.gameName}
                      </p>
                    </div>

                    {/* Tournament Stats */}
                    <div className="relative z-10 space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold text-white">
                            {actualTournament?.current_participants || 0}/{tournament.maxParticipants}
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
                            {actualTournament ? 
                              Math.round((actualTournament.current_participants / tournament.maxParticipants) * 100) 
                              : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-white/60 to-white/80 h-3 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${actualTournament ? 
                                Math.min((actualTournament.current_participants / tournament.maxParticipants) * 100, 100) 
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Time Remaining */}
                      {actualTournament && (
                        <div className="flex items-center justify-center text-white/90">
                          <ClockIcon className="h-5 w-5 mr-2" />
                          <span className="font-medium">
                            {formatTimeRemaining(actualTournament.deadline)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Join Button */}
                    <div className="relative z-10">
                      {cooldown ? (
                        <div className="bg-red-500/30 border border-red-400/50 rounded-xl p-4 text-center">
                          <div className="text-red-200 font-bold mb-1">🚫 On Cooldown</div>
                          <div className="text-xs text-red-300">
                            Until: {new Date(cooldown.cooldown_until).toLocaleDateString()}
                          </div>
                        </div>
                      ) : !actualTournament ? (
                        <button
                          disabled
                          className="w-full bg-gray-500/50 text-gray-300 font-bold py-4 px-6 rounded-xl cursor-not-allowed"
                        >
                          Tournament Loading...
                        </button>
                      ) : !canJoin ? (
                        <button
                          disabled
                          className="w-full bg-gray-500/50 text-gray-300 font-bold py-4 px-6 rounded-xl cursor-not-allowed"
                        >
                          Tournament Full
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinTournament(
                            actualTournament.id, 
                            tournament.entryFee, 
                            tournament.gameType, 
                            tournament.gameName
                          )}
                          className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-white/30"
                        >
                          🎯 JOIN TOURNAMENT - ${tournament.entryFee}
                        </button>
                      )}
                    </div>

                    {/* Generation Round Badge */}
                    {actualTournament && (
                      <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-white">
                        Round {actualTournament.generation_round}
                        {actualTournament.auto_generated && <span className="ml-1">🤖</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 1v1 Matches */}
        <section className="py-12 bg-black/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black text-white mb-4">
                ⚔️ 1v1 SKILL MATCHES
              </h2>
              <p className="text-xl text-blue-200">
                Challenge opponents in direct skill competitions with winner tracking!
              </p>
            </div>

            {/* Create Match Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {matchTierConfigs.map((tier, index) => (
                <div
                  key={tier.name}
                  className={`bg-gradient-to-br ${
                    tier.color === 'amber' ? 'from-amber-600 via-amber-700 to-amber-800' :
                    tier.color === 'gray' ? 'from-gray-600 via-gray-700 to-gray-800' :
                    'from-yellow-500 via-yellow-600 to-yellow-700'
                  } rounded-3xl p-8 shadow-2xl border-2 ${
                    tier.color === 'amber' ? 'border-amber-400/50' :
                    tier.color === 'gray' ? 'border-gray-400/50' :
                    'border-yellow-400/50'
                  } hover:scale-105 transition-all duration-300`}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">
                      {tier.color === 'amber' ? '🥉' : 
                       tier.color === 'gray' ? '🥈' : '🥇'}
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-white/80 mb-4">
                      {gameNames[tier.gameType as keyof typeof gameNames]}
                    </p>
                    <div className="text-4xl font-black text-white mb-6">
                      ${tier.bet}
                    </div>
                    <button
                      onClick={() => handleCreateMatch(tier.bet, tier.gameType, gameNames[tier.gameType as keyof typeof gameNames])}
                      disabled={isProcessingEntry}
                      className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-white/30 disabled:opacity-50"
                    >
                      {isProcessingEntry ? 'Creating...' : `🎯 CREATE MATCH`}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Active 1v1 Matches */}
            {oneVOneMatches.length > 0 && (
              <div>
                <h3 className="text-3xl font-black text-white text-center mb-8">
                  🔥 WAITING FOR OPPONENTS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {oneVOneMatches.map((match) => {
                    const canJoin = match.current_participants < 2 && match.challenger_id !== user?.id;
                    
                    return (
                      <div
                        key={match.id}
                        className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-6 shadow-xl border-2 border-blue-400/50"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-xl font-black text-white">
                              ${match.bet_amount} Match
                            </h4>
                            <p className="text-blue-200">
                              {gameNames[match.game_type as keyof typeof gameNames]}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-white">
                              ${match.prize_pool}
                            </div>
                            <div className="text-xs text-blue-200">
                              Winner Takes All
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-blue-200">
                            <ClockIcon className="h-4 w-4 inline mr-1" />
                            {formatTimeRemaining(match.deadline)}
                          </div>
                          
                          {canJoin ? (
                            <button
                              onClick={() => handleJoinMatch(match.id)}
                              disabled={isProcessingEntry}
                              className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isProcessingEntry ? 'Joining...' : 'Accept Challenge'}
                            </button>
                          ) : match.challenger_id === user?.id ? (
                            <div className="text-sm text-blue-300 font-medium">
                              Your Match
                            </div>
                          ) : (
                            <div className="text-sm text-blue-400">
                              Match Full
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

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
            tournamentId={selectedTournament.tournamentId}
            gameType={selectedTournament.gameType}
            gameName={selectedTournament.gameName}
            onClose={() => setSelectedTournament(null)}
            onSuccess={() => {
              setSelectedTournament(null);
              loadTournamentData();
            }}
          />
        )}
      </div>
    </div>
  );
}
