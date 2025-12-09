'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { XPService } from '@/lib/supabase/xpService';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import LevelDisplay from '@/components/xp/LevelDisplay';
import Link from 'next/link';
import { ArrowLeftIcon, TrophyIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/outline';

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

export default function RanksPage() {
  const { user } = useAuth();
  const [ranks, setRanks] = useState<RankTier[]>([]);
  const [userXP, setUserXP] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'early' | 'mid' | 'late'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ranksData, xpData] = await Promise.all([
        supabase
          .from('ranking_tiers')
          .select('*')
          .order('tier', { ascending: true })
          .then(({ data, error }) => {
            if (error) {
              console.error('Error loading ranks:', error);
              return [];
            }
            return data || [];
          }),
        user ? XPService.getUserXP(user.id).catch(() => null) : Promise.resolve(null)
      ]);

      setRanks(ranksData);
      setUserXP(xpData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRanks = ranks.filter(rank => {
    if (filter === 'early') return rank.tier <= 30;
    if (filter === 'mid') return rank.tier > 30 && rank.tier <= 60;
    if (filter === 'late') return rank.tier > 60;
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-white">Loading rank system...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-purple-300 hover:text-white mb-4">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-5xl font-black text-white mb-4 text-center">
            🎖️ Rank System
          </h1>
          <p className="text-center text-gray-300 text-lg max-w-3xl mx-auto">
            Level up by playing games! Earn XP, unlock new ranks, and climb to the top.
            Each practice game awards 5 XP. Complete daily and weekly challenges for bonus rewards.
          </p>
        </div>

        {/* User's Current Rank */}
        {userXP && (
          <div className="mb-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-white mb-4 text-center">Your Current Rank</h2>
            <LevelDisplay xpData={userXP} showFullDetails={true} size="lg" />
          </div>
        )}

        {/* How It Works Section */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 mb-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4 flex items-center gap-2">
            <TrophyIcon className="w-8 h-8 text-yellow-400" />
            How the Level Up System Works
          </h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">✨ Earning XP</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Practice Games:</strong> 5 XP per game (no reward points)</li>
                <li><strong>Daily Challenges:</strong> 25-50 XP + 5-10 Reward Points</li>
                <li><strong>Weekly Challenges:</strong> 200-700 XP + 50-150 Reward Points</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">📈 Leveling Up</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>XP required increases exponentially: <code className="bg-gray-800 px-2 py-1 rounded">100 × level^1.5</code></li>
                <li>Each level unlocks a new rank with a unique symbol</li>
                <li>Your rank automatically updates when you level up</li>
                <li>100 unique ranks from Stardust to Omniverse</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">🎁 Rewards</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Reward Points (RP):</strong> Earned from challenges, can be used for future features</li>
                <li><strong>Rank Badges:</strong> Display your rank symbol and title on your profile</li>
                <li><strong>Status:</strong> Higher ranks show your dedication and skill</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              filter === 'all'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Ranks ({ranks.length})
          </button>
          <button
            onClick={() => setFilter('early')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              filter === 'early'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Early (1-30)
          </button>
          <button
            onClick={() => setFilter('mid')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              filter === 'mid'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Mid (31-60)
          </button>
          <button
            onClick={() => setFilter('late')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              filter === 'late'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Late (61-100)
          </button>
        </div>

        {/* Ranks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {filteredRanks.map((rank) => {
            const isUserRank = userXP && userXP.current_level >= rank.min_level && userXP.current_level <= rank.max_level;
            
            return (
              <div
                key={rank.tier}
                className={`bg-white/10 backdrop-blur-xl rounded-xl p-6 border-2 transition-all hover:scale-105 hover:shadow-2xl ${
                  isUserRank ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''
                }`}
                style={{
                  borderColor: rank.color_hex + '80',
                  backgroundColor: rank.color_hex + '15'
                }}
              >
                <div className="text-center mb-4">
                  <div className="text-6xl mb-2 font-bold" style={{ color: rank.color_hex }}>
                    {rank.symbol}
                  </div>
                  <div
                    className="text-2xl font-black mb-1"
                    style={{ color: rank.color_hex }}
                  >
                    {rank.title}
                    {isUserRank && (
                      <span className="ml-2 text-yellow-400 text-lg">★</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-300 mb-2">
                    Tier {rank.tier} • Level {rank.level_range}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-gray-400 italic mb-2">
                    {rank.description}
                  </div>
                  {isUserRank && (
                    <div className="text-xs text-yellow-400 font-bold mt-2">
                      Your Current Rank!
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredRanks.length === 0 && (
          <div className="text-center text-white py-12 bg-white/10 rounded-xl">
            <p className="text-xl mb-4">No ranks found</p>
            <p className="text-gray-400">
              Run CREATE_100_LEVEL_RANK_SYSTEM.sql in Supabase to create the rank system
            </p>
          </div>
        )}

        {/* Tips Section */}
        <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-6 border border-purple-500/30 max-w-4xl mx-auto mt-8">
          <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-yellow-400" />
            Pro Tips
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-gray-300">
            <div>
              <h3 className="font-bold text-white mb-2">🎮 Play Regularly</h3>
              <p>Practice games give consistent XP. Play daily to level up faster!</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-2">🏆 Complete Challenges</h3>
              <p>Daily and weekly challenges offer bonus XP and reward points.</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-2">📊 Track Progress</h3>
              <p>Check your dashboard to see your XP progress and next rank.</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-2">🌟 Set Goals</h3>
              <p>Pick a target rank and work towards it. Higher ranks = more prestige!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

