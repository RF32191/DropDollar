'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import CleanNavigation from '@/components/navigation/CleanNavigation';

interface RankTier {
  tier: number;
  level_range: string;
  min_level: number;
  max_level: number;
  title: string;
  symbol: string;
  color_hex: string;
  description: string;
}

export default function RanksPreviewPage() {
  const [ranks, setRanks] = useState<RankTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tiers' | 'levels'>('all');

  useEffect(() => {
    loadRanks();
  }, []);

  const loadRanks = async () => {
    try {
      const { data, error } = await supabase
        .from('ranking_tiers')
        .select('*')
        .order('tier', { ascending: true });

      if (error) {
        console.error('Error loading ranks:', error);
        return;
      }

      setRanks(data || []);
    } catch (error) {
      console.error('Exception loading ranks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankColor = (colorHex: string) => {
    return { backgroundColor: colorHex + '20', borderColor: colorHex, color: colorHex };
  };

  const filteredRanks = ranks.filter(rank => {
    if (filter === 'tiers') return rank.min_level === rank.max_level && rank.tier <= 20;
    if (filter === 'levels') return rank.min_level !== rank.max_level || rank.tier > 20;
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-white">Loading ranks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-black text-white mb-6 text-center">
          🎖️ Rank System Preview
        </h1>

        {/* Filter Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Ranks ({ranks.length})
          </button>
          <button
            onClick={() => setFilter('tiers')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              filter === 'tiers'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Main Tiers (1-20)
          </button>
          <button
            onClick={() => setFilter('levels')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              filter === 'levels'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Individual Levels (21-100)
          </button>
        </div>

        {/* Ranks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRanks.map((rank) => (
            <div
              key={rank.tier}
              className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border-2 transition-all hover:scale-105 hover:shadow-2xl"
              style={{
                borderColor: rank.color_hex + '80',
                backgroundColor: rank.color_hex + '15'
              }}
            >
              <div className="text-center mb-4">
                <div className="text-6xl mb-2">{rank.symbol}</div>
                <div
                  className="text-2xl font-black mb-1"
                  style={{ color: rank.color_hex }}
                >
                  {rank.title}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  Tier {rank.tier} • Levels {rank.level_range}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-gray-400 italic">
                  {rank.description}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Color: <span style={{ color: rank.color_hex }}>{rank.color_hex}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRanks.length === 0 && (
          <div className="text-center text-white py-12">
            <p className="text-xl mb-4">No ranks found</p>
            <p className="text-gray-400">
              Run CREATE_100_LEVEL_RANK_SYSTEM.sql to create the rank system
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

