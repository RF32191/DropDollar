'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';
import GameCard from '@/components/ui/GameCard';
import EnhancedTournamentService, { 
  ActiveTournament, 
  TournamentCategory, 
  MatchTier, 
  UserTournamentCooldown 
} from '@/lib/supabase/enhancedTournamentService';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrophyIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  FireIcon,
  StarIcon,
  PuzzlePieceIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  BoltIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  EyeIcon,
  CalendarIcon,
  UsersIcon,
  SwordIcon,
  GiftIcon
} from '@heroicons/react/24/outline';

const gameIcons = {
  'multi-target': CursorArrowRaysIcon,
  'falling-objects': DevicePhoneMobileIcon,
  'color-sequence': PuzzlePieceIcon
};

const gameNames = {
  'multi-target': 'Multi-Target Reaction',
  'falling-objects': 'Falling Object Catch',
  'color-sequence': 'Color Sequence Memory'
};

export default function EnhancedTournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<ActiveTournament[]>([]);
  const [matchTiers, setMatchTiers] = useState<MatchTier[]>([]);
  const [userCooldowns, setUserCooldowns] = useState<UserTournamentCooldown[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'tournaments' | 'matches' | 'history'>('tournaments');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
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

  const handleJoinTournament = async (tournamentId: string, entryFee: number) => {
    if (!user) {
      alert('Please sign in to join tournaments');
      return;
    }

    try {
      await EnhancedTournamentService.joinTournament(tournamentId, user.id, entryFee);
      alert('Successfully joined tournament!');
      loadData(); // Refresh data
    } catch (error: any) {
      alert(error.message || 'Failed to join tournament');
    }
  };

  const handleCreateMatch = async (betAmount: number, gameType: string) => {
    if (!user) {
      alert('Please sign in to create matches');
      return;
    }

    try {
      await EnhancedTournamentService.createMatch(user.id, betAmount, gameType);
      alert('Match created! Waiting for opponent...');
      loadData(); // Refresh data
    } catch (error: any) {
      alert(error.message || 'Failed to create match');
    }
  };

  const handleJoinMatch = async (matchId: string) => {
    if (!user) {
      alert('Please sign in to join matches');
      return;
    }

    try {
      await EnhancedTournamentService.joinMatch(matchId, user.id);
      alert('Successfully joined match!');
      loadData(); // Refresh data
    } catch (error: any) {
      alert(error.message || 'Failed to join match');
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

  const multiTournaments = tournaments.filter(t => t.tournament_type === 'multi');
  const oneVOneMatches = tournaments.filter(t => t.tournament_type === '1v1');

  return (
    <PageLayout
      title="🏆 ENHANCED TOURNAMENTS"
      subtitle="Compete in skill-based tournaments with weekly limits and automatic generation!"
      icon="🏆"
      gradient="yellow"
    >
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Tournament Rules & Info */}
        <GameCard className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              🎯 Tournament System Rules
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-4xl mx-auto">
              Our enhanced tournament system features automatic generation, weekly win limits, and fair competition rules.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">One Submission</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Only 1 attempt per tournament. Make it count!
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Weekly Limits</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Win only 1 category per week. Cooldown until next Monday.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BoltIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Auto-Generation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                New tournaments automatically created when current ones finish.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">$5 Max Bet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Affordable entry fees with big prize pools.
              </p>
            </div>
          </div>
        </GameCard>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: 'tournaments', label: 'Multi-Player Tournaments', icon: UsersIcon },
            { key: 'matches', label: '1v1 Matches', icon: SwordIcon },
            { key: 'history', label: 'My History', icon: ClockIcon }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                selectedTab === tab.key
                  ? 'bg-yellow-500 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* User Cooldowns Warning */}
        {user && userCooldowns.length > 0 && (
          <GameCard className="mb-8 border-l-4 border-orange-500">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-500 mr-3 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  🚫 Active Cooldowns
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-3">
                  You have won tournaments this week and are on cooldown for the following categories:
                </p>
                <div className="space-y-2">
                  {userCooldowns.map(cooldown => (
                    <div key={cooldown.id} className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 dark:text-white">
                          Category Cooldown
                        </span>
                        <span className="text-sm text-orange-600 dark:text-orange-400">
                          Until: {new Date(cooldown.cooldown_until).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GameCard>
        )}

        {/* Multi-Player Tournaments Tab */}
        {selectedTab === 'tournaments' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                🏆 Multi-Player Tournaments
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {multiTournaments.length} active tournaments
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-300 mt-4">Loading tournaments...</p>
              </div>
            ) : multiTournaments.length === 0 ? (
              <GameCard className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  No Active Tournaments
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  New tournaments are automatically generated. Check back soon!
                </p>
              </GameCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {multiTournaments.map((tournament) => {
                  const GameIcon = gameIcons[tournament.game_type];
                  const cooldown = isUserOnCooldown(tournament.category_id);
                  const canJoin = !cooldown && tournament.current_participants < tournament.max_participants;
                  
                  return (
                    <GameCard key={tournament.id} className="hover:shadow-xl transition-all duration-300">
                      {/* Tournament Header */}
                      <div className="relative mb-4">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 text-white">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <GameIcon className="h-6 w-6 mr-2" />
                              <span className="font-bold text-lg">${tournament.prize_pool}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs opacity-90">Round {tournament.generation_round}</div>
                              {tournament.auto_generated && (
                                <div className="text-xs opacity-75">🤖 Auto-Generated</div>
                              )}
                            </div>
                          </div>
                          <h3 className="font-bold text-lg mb-1">{tournament.title}</h3>
                          <p className="text-sm opacity-90">{gameNames[tournament.game_type]}</p>
                        </div>
                      </div>

                      {/* Tournament Info */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {tournament.current_participants}/{tournament.max_participants}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Participants</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              ${tournament.entry_fee}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Entry Fee</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-300">Progress</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {Math.round((tournament.current_participants / tournament.max_participants) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((tournament.current_participants / tournament.max_participants) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Time Remaining */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {formatTimeRemaining(tournament.deadline)}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {tournament.status.toUpperCase()}
                          </div>
                        </div>

                        {/* Join Button */}
                        <div className="pt-2">
                          {cooldown ? (
                            <div className="bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3 text-center">
                              <div className="text-orange-600 dark:text-orange-400 text-sm font-medium">
                                🚫 On Cooldown
                              </div>
                              <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                                Until: {new Date(cooldown.cooldown_until).toLocaleDateString()}
                              </div>
                            </div>
                          ) : !canJoin ? (
                            <button
                              disabled
                              className="w-full bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold py-3 px-4 rounded-lg cursor-not-allowed"
                            >
                              Tournament Full
                            </button>
                          ) : (
                            <button
                              onClick={() => handleJoinTournament(tournament.id, tournament.entry_fee)}
                              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 shadow-lg"
                            >
                              Join Tournament - ${tournament.entry_fee}
                            </button>
                          )}
                        </div>
                      </div>
                    </GameCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 1v1 Matches Tab */}
        {selectedTab === 'matches' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                ⚔️ 1v1 Skill Matches
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {oneVOneMatches.length} active matches
              </div>
            </div>

            {/* Match Tiers */}
            <GameCard className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                🎯 Create New Match
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {matchTiers.map((tier) => {
                  const GameIcon = gameIcons[tier.game_type];
                  return (
                    <div key={tier.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="text-center">
                        <div className="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                          <GameIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                          {tier.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {gameNames[tier.game_type]}
                        </p>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                          ${tier.bet_amount}
                        </div>
                        <button
                          onClick={() => handleCreateMatch(tier.bet_amount, tier.game_type)}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                          Create Match
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GameCard>

            {/* Active Matches */}
            {oneVOneMatches.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  🔥 Waiting for Opponents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {oneVOneMatches.map((match) => {
                    const GameIcon = gameIcons[match.game_type];
                    const canJoin = match.current_participants < 2 && match.challenger_id !== user?.id;
                    
                    return (
                      <GameCard key={match.id} className="border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <GameIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white">
                                ${match.bet_amount} Match
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {gameNames[match.game_type]}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              ${match.prize_pool}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Winner Takes All
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            <ClockIcon className="h-4 w-4 inline mr-1" />
                            {formatTimeRemaining(match.deadline)}
                          </div>
                          
                          {canJoin ? (
                            <button
                              onClick={() => handleJoinMatch(match.id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                              Accept Challenge
                            </button>
                          ) : match.challenger_id === user?.id ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Your Match
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Match Full
                            </div>
                          )}
                        </div>
                      </GameCard>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {selectedTab === 'history' && (
          <div>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Tournament History
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {user ? 'Your tournament history will appear here.' : 'Please sign in to view your tournament history.'}
              </p>
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
