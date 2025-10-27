'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import {
  TrophyIcon,
  ChartBarIcon,
  UserIcon,
  CurrencyDollarIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface WinnerResult {
  id: string;
  config_id: string;
  winner_user_id: string;
  winner_email: string;
  prize_amount: number;
  platform_fee: number;
  current_pot: number;
  created_at: string;
  updated_at: string;
  // From participants
  winner_score: number;
  winner_accuracy: number;
}

export default function AnalyticsPage() {
  const [winners, setWinners] = useState<WinnerResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '2' | '5' | '10' | '25' | '50' | '100' | '250' | '1000' | '2500' | '5000' | '10000' | '25000'>('all');

  // Prize tier labels
  const prizeTierLabels: Record<string, string> = {
    'wta-2-sword-parry': '$2 Sword Parry',
    'wta-5-blade-bounce': '$5 Blade Bounce',
    'wta-10-laser-dodge': '$10 Laser Dodge',
    'wta-25-multi-target': '$25 Multi Target',
    'wta-50-sword-parry': '$50 Sword Parry',
    'wta-100-laser-dodge': '$100 Laser Dodge',
    'wta-250-multi-target': '$250 Multi Target',
    'wta-1000-cash-stack': '$1000 Cash Stack',
    'wta-2500-falling-objects': '$2500 Falling Objects',
    'wta-5000-color-sequence': '$5000 Color Sequence',
    'wta-10000-laser-dodge': '$10000 Laser Dodge',
    'wta-25000-multi-target': '$25000 Multi Target'
  };

  useEffect(() => {
    loadWinners();
  }, []);

  const loadWinners = async () => {
    try {
      setIsLoading(true);
      
      // Get all completed sessions with winners
      const { data: sessions, error: sessionsError } = await supabase
        .from('winner_takes_all_sessions')
        .select('*')
        .eq('status', 'completed')
        .not('winner_user_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError);
        return;
      }

      if (!sessions || sessions.length === 0) {
        setWinners([]);
        return;
      }

      // Get winner details for each session
      const winnersData = await Promise.all(
        sessions.map(async (session) => {
          // Get user email
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', session.winner_user_id)
            .single();

          // Get winner's score from participants
          const { data: participantData } = await supabase
            .from('winner_takes_all_participants')
            .select('score, accuracy')
            .eq('session_id', session.id)
            .eq('user_id', session.winner_user_id)
            .single();

          return {
            ...session,
            winner_email: userData?.email || 'Unknown',
            winner_score: participantData?.score || 0,
            winner_accuracy: participantData?.accuracy || 0
          };
        })
      );

      setWinners(winnersData);
    } catch (error) {
      console.error('Error loading winners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWinners = winners.filter(winner => {
    if (filter === 'all') return true;
    return winner.config_id.includes(`-${filter}-`);
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getTierColor = (configId: string) => {
    if (configId.includes('-2-')) return 'from-green-500 to-emerald-500';
    if (configId.includes('-5-')) return 'from-blue-500 to-cyan-500';
    if (configId.includes('-10-')) return 'from-purple-500 to-pink-500';
    if (configId.includes('-25-')) return 'from-orange-500 to-red-500';
    if (configId.includes('-50-')) return 'from-yellow-500 to-amber-500';
    if (configId.includes('-100-')) return 'from-indigo-500 to-purple-500';
    if (configId.includes('-250-')) return 'from-pink-500 to-rose-500';
    if (configId.includes('-1000-')) return 'from-red-500 to-orange-500';
    if (configId.includes('-2500-')) return 'from-violet-500 to-purple-500';
    if (configId.includes('-5000-')) return 'from-fuchsia-500 to-pink-500';
    if (configId.includes('-10000-')) return 'from-amber-500 to-yellow-500';
    return 'from-gray-500 to-slate-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <ChartBarIcon className="w-12 h-12 text-yellow-400 mr-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Winner Takes All Analytics
            </h1>
            <TrophyIcon className="w-12 h-12 text-yellow-400 ml-4" />
          </div>
          <p className="text-xl text-gray-300">All-time winners and results</p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All Tiers
          </button>
          {['2', '5', '10', '25', '50', '100', '250', '1000', '2500', '5000', '10000', '25000'].map(tier => (
            <button
              key={tier}
              onClick={() => setFilter(tier as any)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === tier
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ${tier}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
            <span className="ml-4 text-lg text-gray-300">Loading winners...</span>
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredWinners.length === 0 && (
          <div className="text-center py-12">
            <TrophyIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-xl text-gray-400">No winners yet for this tier</p>
            <p className="text-gray-500 mt-2">Be the first to win!</p>
          </div>
        )}

        {/* Winners Grid */}
        {!isLoading && filteredWinners.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWinners.map((winner, index) => (
              <div
                key={winner.id}
                className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105"
              >
                {/* Rank Badge */}
                {index < 3 && (
                  <div className="flex justify-end mb-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      'bg-orange-600 text-white'
                    }`}>
                      #{index + 1}
                    </div>
                  </div>
                )}

                {/* Prize Tier */}
                <div className={`bg-gradient-to-r ${getTierColor(winner.config_id)} rounded-xl p-4 mb-4`}>
                  <h3 className="text-white font-bold text-lg text-center">
                    {prizeTierLabels[winner.config_id] || winner.config_id}
                  </h3>
                </div>

                {/* Winner Info */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <UserIcon className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-gray-300 text-sm">Winner:</span>
                    <span className="text-white font-semibold ml-2 truncate">
                      {winner.winner_email.split('@')[0]}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <FireIcon className="w-5 h-5 text-orange-400 mr-2" />
                    <span className="text-gray-300 text-sm">Score:</span>
                    <span className="text-white font-bold ml-2">
                      {winner.winner_score.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-400 mr-2" />
                    <span className="text-gray-300 text-sm">Prize Won:</span>
                    <span className="text-green-400 font-bold ml-2">
                      {formatAmount(winner.prize_amount)}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <TrophyIcon className="w-5 h-5 text-purple-400 mr-2" />
                    <span className="text-gray-300 text-sm">Total Pot:</span>
                    <span className="text-purple-400 font-semibold ml-2">
                      {formatAmount(winner.current_pot)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-700">
                    <span className="text-gray-500 text-xs">
                      {formatDate(winner.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {!isLoading && winners.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-2xl p-6 border border-yellow-500/30">
              <h3 className="text-yellow-400 font-bold text-lg mb-2">Total Winners</h3>
              <p className="text-4xl font-black text-white">{winners.length}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/30">
              <h3 className="text-green-400 font-bold text-lg mb-2">Total Paid Out</h3>
              <p className="text-4xl font-black text-white">
                {formatAmount(winners.reduce((sum, w) => sum + w.prize_amount, 0))}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
              <h3 className="text-purple-400 font-bold text-lg mb-2">Highest Score</h3>
              <p className="text-4xl font-black text-white">
                {Math.max(...winners.map(w => w.winner_score)).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
