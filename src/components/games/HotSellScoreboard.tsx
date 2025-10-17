'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TournamentService, HotSellListing, HotSellParticipant } from '@/lib/supabase/tournamentService';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { 
  FireIcon, 
  TrophyIcon, 
  UsersIcon,
  ClockIcon,
  StarIcon,
  CrownIcon,
  MedalIcon
} from '@heroicons/react/24/outline';

interface ScoreboardEntry {
  id: string;
  user_id: string;
  username: string;
  score: number;
  accuracy: number;
  game_type: string;
  rng_seed: number;
  placement: number;
  prize_won: number;
  created_at: string;
}

interface HotSellScoreboardProps {
  listing: HotSellListing;
}

export default function HotSellScoreboard({ listing }: HotSellScoreboardProps) {
  const { user, isAuthenticated } = useAuth();
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'accuracy' | 'placement'>('placement');

  useEffect(() => {
    loadScoreboard();
  }, [listing.id]);

  const loadScoreboard = async () => {
    try {
      setIsLoading(true);
      
      // Get all participants with their scores
      const participants = await TournamentService.getHotSellParticipants(listing.id);
      
      // Sort by score and assign placements
      const sortedParticipants = participants
        .filter(p => p.score !== null && p.score !== undefined)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map((participant, index) => ({
          id: participant.id,
          user_id: participant.user_id,
          username: `Player ${participant.user_id.slice(0, 8)}...`,
          score: participant.score || 0,
          accuracy: 0, // Would need to be stored separately
          game_type: 'sword-parry', // Would need to be stored separately
          rng_seed: 0, // Would need to be stored separately
          placement: index + 1,
          prize_won: participant.prize_won || 0,
          created_at: participant.joined_at
        }));
      
      setScoreboard(sortedParticipants);
    } catch (error) {
      console.error('❌ [Scoreboard] Error loading scoreboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlacementIcon = (placement: number) => {
    switch (placement) {
      case 1:
        return <CrownIcon className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <MedalIcon className="w-6 h-6 text-gray-400" />;
      case 3:
        return <MedalIcon className="w-6 h-6 text-orange-500" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{placement}</span>;
    }
  };

  const getPlacementColor = (placement: number) => {
    switch (placement) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-orange-500 to-orange-600';
      default:
        return 'bg-white/10';
    }
  };

  const formatPrizeAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            <span className="ml-4 text-lg">Loading scoreboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <TrophyIcon className="w-12 h-12 text-yellow-500 mr-4 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              SCOREBOARD
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">{listing.title}</p>
          <p className="text-lg text-gray-400">Prize Pool: ${listing.prize_pool.toLocaleString()}</p>
        </div>

        {/* Sort Controls */}
        <div className="mb-6 flex justify-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-2 border border-white/20">
            <div className="flex space-x-2">
              {[
                { key: 'placement', label: 'Placement', icon: TrophyIcon },
                { key: 'score', label: 'Score', icon: StarIcon },
                { key: 'accuracy', label: 'Accuracy', icon: ClockIcon }
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSortBy(option.key as any)}
                  className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
                    sortBy === option.key
                      ? 'bg-red-500 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <option.icon className="w-4 h-4 mr-2" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            {scoreboard.length === 0 ? (
              <div className="text-center py-12">
                <TrophyIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Scores Yet</h3>
                <p className="text-gray-400">Be the first to play and see your score here!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="grid grid-cols-6 gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-center font-semibold text-gray-300">Place</div>
                  <div className="text-center font-semibold text-gray-300">Player</div>
                  <div className="text-center font-semibold text-gray-300">Score</div>
                  <div className="text-center font-semibold text-gray-300">Accuracy</div>
                  <div className="text-center font-semibold text-gray-300">Prize</div>
                  <div className="text-center font-semibold text-gray-300">Time</div>
                </div>

                {/* Entries */}
                {scoreboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-6 gap-4 p-4 rounded-xl border transition-all duration-300 hover:scale-105 ${
                      entry.placement <= 3 
                        ? `${getPlacementColor(entry.placement)} border-white/30` 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      {getPlacementIcon(entry.placement)}
                    </div>
                    <div className="text-center">
                      <span className={`font-medium ${
                        entry.user_id === user?.id ? 'text-yellow-300 font-bold' : 'text-white'
                      }`}>
                        {entry.user_id === user?.id ? 'YOU' : entry.username}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-white font-bold text-lg">{entry.score.toLocaleString()}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-white font-medium">{entry.accuracy}%</span>
                    </div>
                    <div className="text-center">
                      <span className={`font-bold ${
                        entry.prize_won > 0 ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {entry.prize_won > 0 ? formatPrizeAmount(entry.prize_won) : '-'}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-300 text-sm">{formatDate(entry.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prize Distribution Info */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-6 text-center">Prize Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CrownIcon className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">1st Place</h4>
                <p className="text-yellow-400 font-bold text-xl">
                  {formatPrizeAmount(listing.prize_pool * 0.5 * 0.85)}
                </p>
                <p className="text-gray-400 text-sm">50% of prize pool (minus 15% fee)</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MedalIcon className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">2nd Place</h4>
                <p className="text-gray-300 font-bold text-xl">
                  {formatPrizeAmount(listing.prize_pool * 0.3 * 0.85)}
                </p>
                <p className="text-gray-400 text-sm">30% of prize pool (minus 15% fee)</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MedalIcon className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">3rd Place</h4>
                <p className="text-orange-400 font-bold text-xl">
                  {formatPrizeAmount(listing.prize_pool * 0.2 * 0.85)}
                </p>
                <p className="text-gray-400 text-sm">20% of prize pool (minus 15% fee)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/hot-sell'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center">
                <FireIcon className="w-5 h-5 mr-2" />
                Back to Hot Sell
              </div>
            </button>
            <button
              onClick={loadScoreboard}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center">
                <ClockIcon className="w-5 h-5 mr-2" />
                Refresh Scoreboard
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
