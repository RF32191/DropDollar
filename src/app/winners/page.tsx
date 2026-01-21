'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import PageWalletDisplay from '@/components/wallet/PageWalletDisplay';
import {
  TrophyIcon,
  FireIcon,
  BanknotesIcon,
  ClockIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface WTAWinner {
  session_id: string;
  config_id: string;
  game_title: string;
  game_type: string;
  winner_user_id: string;
  winner_username: string;
  winner_score: number;
  winner_prize: number;
  platform_fee_amount: number;
  total_pot: number;
  completed_at: string;
}

interface HotSellWinner {
  session_id: string;
  config_id: string;
  game_title: string;
  game_type: string;
  winner_user_id: string;
  winner_username: string;
  winner_placement: string;
  winner_score: number;
  winner_prize: number;
  platform_fee: number;
  total_pot: number;
  completed_at: string;
}

type Category = 'all' | 'wta' | 'hot-sell' | 'coin-play' | '1v1';

export default function WinnersPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [wtaWinners, setWtaWinners] = useState<WTAWinner[]>([]);
  const [hotSellWinners, setHotSellWinners] = useState<HotSellWinner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async () => {
    setIsLoading(true);
    try {
      // Fetch Winner Takes All winners
      const { data: wtaData, error: wtaError } = await supabase.rpc('get_wta_winners', {
        limit_count: 100
      });

      if (wtaError) {
        console.error('Error fetching WTA winners:', wtaError);
      } else {
        setWtaWinners(wtaData || []);
      }

      // Fetch Hot Sell winners
      const { data: hotSellData, error: hotSellError } = await supabase.rpc('get_hot_sell_winners', {
        limit_count: 100
      });

      if (hotSellError) {
        console.error('Error fetching Hot Sell winners:', hotSellError);
      } else {
        setHotSellWinners(hotSellData || []);
      }
    } catch (error) {
      console.error('Error fetching winners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatMoney = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case 'wta':
        return <TrophyIcon className="w-5 h-5" />;
      case 'hot-sell':
        return <FireIcon className="w-5 h-5" />;
      case 'coin-play':
        return <BanknotesIcon className="w-5 h-5" />;
      case '1v1':
        return <ChartBarIcon className="w-5 h-5" />;
      default:
        return <TrophyIcon className="w-5 h-5" />;
    }
  };

  const filteredWTAWinners = wtaWinners;
  const filteredHotSellWinners = hotSellWinners;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <CleanNavigation variant="gradient" currentPage="winners" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Wallet Display */}
        <PageWalletDisplay variant="winners" />

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <TrophyIcon className="w-16 h-16 text-yellow-400 animate-bounce" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mx-6">
              WINNERS HALL
            </h1>
            <TrophyIcon className="w-16 h-16 text-yellow-400 animate-bounce" />
          </div>
          <p className="text-2xl text-purple-200 mb-2 font-semibold">
            Celebrating Our Champions
          </p>
          <p className="text-xl text-purple-300">
            See who's winning across all game categories
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {[
            { id: 'all' as Category, label: 'All Winners', count: wtaWinners.length + hotSellWinners.length },
            { id: 'wta' as Category, label: 'Winner Takes All', count: wtaWinners.length },
            { id: 'hot-sell' as Category, label: 'Hot Sell', count: hotSellWinners.length },
            { id: 'coin-play' as Category, label: 'Coin Play', count: 0 },
            { id: '1v1' as Category, label: '1v1 Battles', count: 0 }
          ].map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 shadow-xl'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {getCategoryIcon(category.id)}
              <span>{category.label}</span>
              <span className="bg-black/30 px-2 py-1 rounded-full text-sm">
                {category.count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-xl text-purple-200">Loading winners...</p>
          </div>
        )}

        {/* Winners Content */}
        {!isLoading && (
          <div className="space-y-8">
            {/* Winner Takes All Section */}
            {(selectedCategory === 'all' || selectedCategory === 'wta') && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <TrophyIcon className="w-8 h-8 text-yellow-400" />
                  <h2 className="text-3xl font-bold text-yellow-400">
                    Winner Takes All Champions
                  </h2>
                </div>
                
                {filteredWTAWinners.length === 0 ? (
                  <div className="bg-white/10 rounded-xl p-8 text-center">
                    <p className="text-xl text-purple-200">No winners yet in this category</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredWTAWinners.map((winner, index) => (
                      <div
                        key={`${winner.session_id}-${index}`}
                        className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-xl p-6 hover:border-yellow-400/50 transition-all hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-yellow-400 rounded-full p-3">
                              <TrophyIcon className="w-8 h-8 text-gray-900" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-yellow-400">
                                {winner.winner_username}
                              </h3>
                              <p className="text-purple-200">{winner.game_title}</p>
                              <p className="text-purple-300 text-sm">
                                <ClockIcon className="w-4 h-4 inline mr-1" />
                                {formatDate(winner.completed_at)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-3xl font-bold text-green-400">
                              {formatMoney(winner.winner_prize)}
                            </div>
                            <div className="text-purple-200 text-sm">
                              Score: {winner.winner_score}
                            </div>
                            <div className="text-purple-300 text-xs">
                              Pool: {formatMoney(winner.total_pot)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hot Sell Section */}
            {(selectedCategory === 'all' || selectedCategory === 'hot-sell') && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <FireIcon className="w-8 h-8 text-orange-400" />
                  <h2 className="text-3xl font-bold text-orange-400">
                    Hot Sell Champions
                  </h2>
                </div>
                
                {filteredHotSellWinners.length === 0 ? (
                  <div className="bg-white/10 rounded-xl p-8 text-center">
                    <p className="text-xl text-purple-200">No winners yet in this category</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredHotSellWinners.map((winner, index) => (
                      <div
                        key={`${winner.session_id}-${winner.winner_placement}-${index}`}
                        className={`border rounded-xl p-6 hover:scale-[1.02] transition-all ${
                          winner.winner_placement === '1st Place'
                            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30 hover:border-yellow-400/50'
                            : winner.winner_placement === '2nd Place'
                            ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30 hover:border-gray-400/50'
                            : 'bg-gradient-to-r from-orange-700/20 to-orange-800/20 border-orange-600/30 hover:border-orange-600/50'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`rounded-full p-3 ${
                              winner.winner_placement === '1st Place'
                                ? 'bg-yellow-400'
                                : winner.winner_placement === '2nd Place'
                                ? 'bg-gray-400'
                                : 'bg-orange-600'
                            }`}>
                              <FireIcon className="w-8 h-8 text-gray-900" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-bold text-yellow-400">
                                  {winner.winner_username}
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  winner.winner_placement === '1st Place'
                                    ? 'bg-yellow-400 text-gray-900'
                                    : winner.winner_placement === '2nd Place'
                                    ? 'bg-gray-400 text-gray-900'
                                    : 'bg-orange-600 text-white'
                                }`}>
                                  {winner.winner_placement}
                                </span>
                              </div>
                              <p className="text-purple-200">{winner.game_title}</p>
                              <p className="text-purple-300 text-sm">
                                <ClockIcon className="w-4 h-4 inline mr-1" />
                                {formatDate(winner.completed_at)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-3xl font-bold text-green-400">
                              {formatMoney(winner.winner_prize)}
                            </div>
                            <div className="text-purple-200 text-sm">
                              Score: {winner.winner_score}
                            </div>
                            <div className="text-purple-300 text-xs">
                              Pool: {formatMoney(winner.total_pot)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Coin Play Section (Coming Soon) */}
            {selectedCategory === 'coin-play' && (
              <div className="bg-white/10 rounded-xl p-12 text-center">
                <BanknotesIcon className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-purple-200 mb-2">
                  Coin Play Winners Coming Soon
                </h3>
                <p className="text-purple-300">
                  This category will be available once Coin Play games are launched
                </p>
              </div>
            )}

            {/* 1v1 Section (Coming Soon) */}
            {selectedCategory === '1v1' && (
              <div className="bg-white/10 rounded-xl p-12 text-center">
                <ChartBarIcon className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-purple-200 mb-2">
                  1v1 Battle Winners Coming Soon
                </h3>
                <p className="text-purple-300">
                  This category will be available once 1v1 battles are launched
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

