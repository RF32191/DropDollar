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
  winner_username: string;
  prize_amount: number;
  current_pot: number;
  updated_at: string;
  winner_score: number;
  game_type: string;
}

interface ListingWinner {
  id: string;
  category: string;
  winner_username: string;
  winner_score: number;
}

interface HotSellWinner {
  id: string;
  config_id: string;
  winner_username: string;
  winner_score: number;
  prize_amount: number;
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'listings' | 'winner-takes-all' | 'hot-sell'>('winner-takes-all');
  const [winners, setWinners] = useState<WinnerResult[]>([]);
  const [listingWinners, setListingWinners] = useState<ListingWinner[]>([]);
  const [hotSellWinners, setHotSellWinners] = useState<HotSellWinner[]>([]);
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
    if (activeTab === 'winner-takes-all') {
      loadWinners();
    } else if (activeTab === 'listings') {
      loadListingWinners();
    } else if (activeTab === 'hot-sell') {
      loadHotSellWinners();
    }
  }, [activeTab]);

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
            .select('score')
            .eq('session_id', session.id)
            .eq('user_id', session.winner_user_id)
            .single();

          // Extract game type from config_id
          const gameType = prizeTierLabels[session.config_id] || session.config_id;

          return {
            id: session.id,
            config_id: session.config_id,
            winner_user_id: session.winner_user_id,
            winner_username: userData?.email?.split('@')[0] || 'Unknown',
            prize_amount: session.prize_amount || 0,
            current_pot: session.current_pot || 0,
            updated_at: session.updated_at,
            winner_score: participantData?.score || 0,
            game_type: gameType
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

  const loadListingWinners = async () => {
    try {
      setIsLoading(true);
      
      // Get completed game history from user_game_history (listings/tournaments)
      const { data: gameHistory, error: historyError } = await supabase
        .from('user_game_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (historyError) {
        console.error('Error loading listing winners:', historyError);
        setListingWinners([]);
        return;
      }

      if (!gameHistory || gameHistory.length === 0) {
        setListingWinners([]);
        return;
      }

      // Group by category and find winners (highest score per category)
      const categoryWinners: Record<string, any> = {};
      
      for (const game of gameHistory) {
        const category = game.game_type || 'Unknown';
        
        if (!categoryWinners[category] || game.score > categoryWinners[category].score) {
          // Get user email
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', game.user_id)
            .single();

          categoryWinners[category] = {
            id: game.id,
            category: category,
            winner_username: userData?.email?.split('@')[0] || 'Unknown',
            winner_score: game.score || 0
          };
        }
      }

      setListingWinners(Object.values(categoryWinners));
    } catch (error) {
      console.error('Error loading listing winners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHotSellWinners = async () => {
    try {
      setIsLoading(true);
      
      // Get completed hot sell sessions with winners
      const { data: sessions, error: sessionsError } = await supabase
        .from('hot_sell_sessions')
        .select('*')
        .not('first_place_user_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (sessionsError) {
        console.error('Error loading hot sell winners:', sessionsError);
        setHotSellWinners([]);
        return;
      }

      if (!sessions || sessions.length === 0) {
        setHotSellWinners([]);
        return;
      }

      // Get winner details for each session (top 3)
      const winnersData: any[] = [];
      
      for (const session of sessions) {
        // Get 1st place winner
        if (session.first_place_user_id) {
          const { data: user1 } = await supabase
            .from('users')
            .select('email')
            .eq('id', session.first_place_user_id)
            .single();
          
          const { data: participant1 } = await supabase
            .from('hot_sell_participants')
            .select('score')
            .eq('session_id', session.id)
            .eq('user_id', session.first_place_user_id)
            .single();
          
          winnersData.push({
            id: `${session.id}-1st`,
            config_id: session.config_id,
            winner_username: user1?.email?.split('@')[0] || 'Unknown',
            winner_score: participant1?.score || 0,
            prize_amount: session.first_place_prize || 0,
            rank: 1
          });
        }

        // Get 2nd place winner
        if (session.second_place_user_id) {
          const { data: user2 } = await supabase
            .from('users')
            .select('email')
            .eq('id', session.second_place_user_id)
            .single();
          
          const { data: participant2 } = await supabase
            .from('hot_sell_participants')
            .select('score')
            .eq('session_id', session.id)
            .eq('user_id', session.second_place_user_id)
            .single();
          
          winnersData.push({
            id: `${session.id}-2nd`,
            config_id: session.config_id,
            winner_username: user2?.email?.split('@')[0] || 'Unknown',
            winner_score: participant2?.score || 0,
            prize_amount: session.second_place_prize || 0,
            rank: 2
          });
        }

        // Get 3rd place winner
        if (session.third_place_user_id) {
          const { data: user3 } = await supabase
            .from('users')
            .select('email')
            .eq('id', session.third_place_user_id)
            .single();
          
          const { data: participant3 } = await supabase
            .from('hot_sell_participants')
            .select('score')
            .eq('session_id', session.id)
            .eq('user_id', session.third_place_user_id)
            .single();
          
          winnersData.push({
            id: `${session.id}-3rd`,
            config_id: session.config_id,
            winner_username: user3?.email?.split('@')[0] || 'Unknown',
            winner_score: participant3?.score || 0,
            prize_amount: session.third_place_prize || 0,
            rank: 3
          });
        }
      }

      setHotSellWinners(winnersData);
    } catch (error) {
      console.error('Error loading hot sell winners:', error);
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
              Competition Analytics
            </h1>
            <TrophyIcon className="w-12 h-12 text-yellow-400 ml-4" />
          </div>
          <p className="text-xl text-gray-300">All-time winners and results</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex justify-center gap-4">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
              activeTab === 'listings'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg scale-105'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📦 Listings
          </button>
          <button
            onClick={() => setActiveTab('winner-takes-all')}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
              activeTab === 'winner-takes-all'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg scale-105'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            👑 Winner Takes All
          </button>
          <button
            onClick={() => setActiveTab('hot-sell')}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
              activeTab === 'hot-sell'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🔥 Hot Sell
          </button>
        </div>


        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
            <span className="ml-4 text-lg text-gray-300">Loading winners...</span>
          </div>
        )}

        {/* No Results */}
        {!isLoading && activeTab === 'winner-takes-all' && winners.length === 0 && (
          <div className="text-center py-12">
            <TrophyIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-xl text-gray-400">No winners yet</p>
            <p className="text-gray-500 mt-2">Be the first to win!</p>
          </div>
        )}

        {!isLoading && activeTab === 'listings' && listingWinners.length === 0 && (
          <div className="text-center py-12">
            <TrophyIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-xl text-gray-400">No listing winners yet</p>
            <p className="text-gray-500 mt-2">Play to become a champion!</p>
          </div>
        )}

        {!isLoading && activeTab === 'hot-sell' && hotSellWinners.length === 0 && (
          <div className="text-center py-12">
            <TrophyIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-xl text-gray-400">No Hot Sell winners yet</p>
            <p className="text-gray-500 mt-2">Be the first to win!</p>
          </div>
        )}

        {/* Winner Takes All Table */}
        {!isLoading && activeTab === 'winner-takes-all' && winners.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-yellow-500 to-amber-500">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase">Username</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase">Score</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase">Prize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {winners.map((winner, index) => (
                  <tr
                    key={winner.id}
                    className={`hover:bg-gray-700/50 transition-colors ${
                      index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <UserIcon className="w-5 h-5 text-blue-400 mr-2" />
                        <span className="text-white font-semibold">{winner.winner_username}</span>
            </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FireIcon className="w-5 h-5 text-orange-400 mr-2" />
                        <span className="text-white font-bold text-lg">{winner.winner_score.toFixed(2)}</span>
            </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="w-5 h-5 text-green-400 mr-2" />
                        <span className="text-green-400 font-bold">{formatAmount(winner.prize_amount)}</span>
            </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Listings Table */}
        {!isLoading && activeTab === 'listings' && listingWinners.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-teal-500 to-cyan-500">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase">Winner</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {listingWinners.map((winner, index) => (
                  <tr
                    key={winner.id}
                    className={`hover:bg-gray-700/50 transition-colors ${
                      index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-teal-400 font-bold text-lg">📦</span>
                        <span className="ml-3 text-white font-semibold">{winner.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <UserIcon className="w-5 h-5 text-blue-400 mr-2" />
                        <span className="text-white font-semibold">{winner.winner_username}</span>
          </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FireIcon className="w-5 h-5 text-orange-400 mr-2" />
                        <span className="text-white font-bold text-lg">{winner.winner_score.toFixed(2)}</span>
        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hot Sell Table */}
        {!isLoading && activeTab === 'hot-sell' && hotSellWinners.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-500 to-red-500">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase">Rank & Username</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase">Score</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase">Prize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {hotSellWinners.map((winner, index) => (
                  <tr
                    key={winner.id}
                    className={`hover:bg-gray-700/50 transition-colors ${
                      index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {winner.rank && (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            winner.rank === 1 ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50' :
                            winner.rank === 2 ? 'bg-gray-400 shadow-lg shadow-gray-400/50' :
                            'bg-orange-600 shadow-lg shadow-orange-600/50'
                          }`}>
                            <span className="text-sm font-bold text-black">{winner.rank}</span>
                          </div>
                        )}
                        <UserIcon className="w-5 h-5 text-blue-400 mr-2" />
                        <span className="text-white font-semibold">{winner.winner_username}</span>
            </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FireIcon className="w-5 h-5 text-orange-400 mr-2" />
                        <span className="text-white font-bold text-lg">{winner.winner_score.toFixed(2)}</span>
            </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="w-5 h-5 text-green-400 mr-2" />
                        <span className="text-green-400 font-bold">{formatAmount(winner.prize_amount)}</span>
            </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats Summary */}
        {!isLoading && activeTab === 'winner-takes-all' && winners.length > 0 && (
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
