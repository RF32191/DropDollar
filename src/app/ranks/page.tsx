'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { XPService } from '@/lib/supabase/xpService';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import LevelDisplay from '@/components/xp/LevelDisplay';
import Link from 'next/link';
import { ArrowLeftIcon, TrophyIcon, StarIcon, SparklesIcon, InformationCircleIcon, FireIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

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

        {/* Comprehensive Level Up System Explanation */}
        <div className="space-y-6 mb-12 max-w-6xl mx-auto">
          {/* Main Explanation Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-8 border border-white/20">
            <h2 className="text-4xl font-black text-white mb-6 flex items-center gap-3">
              <TrophyIcon className="w-10 h-10 text-yellow-400" />
              Complete Level Up System Guide
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Earning XP */}
              <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-500/30">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <FireIcon className="w-6 h-6 text-orange-400" />
                  Earning XP
                </h3>
                <div className="space-y-3 text-gray-300">
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="font-bold text-green-400 mb-1">🎮 Practice Games</div>
                    <div className="text-sm">5 XP per game (no reward points)</div>
                    <div className="text-xs text-gray-400 mt-1">Perfect for consistent progression</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="font-bold text-yellow-400 mb-1">📅 Daily Challenges</div>
                    <div className="text-sm">25-50 XP + 5-10 Reward Points</div>
                    <div className="text-xs text-gray-400 mt-1">Refreshes every day at midnight</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="font-bold text-purple-400 mb-1">📆 Weekly Challenges</div>
                    <div className="text-sm">200-700 XP + 50-150 Reward Points</div>
                    <div className="text-xs text-gray-400 mt-1">Bigger rewards for dedicated players</div>
                  </div>
                </div>
              </div>

              {/* Leveling Up */}
              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg p-6 border border-purple-500/30">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <AcademicCapIcon className="w-6 h-6 text-purple-400" />
                  Leveling Up
                </h3>
                <div className="space-y-3 text-gray-300">
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="font-bold text-blue-400 mb-1">📊 XP Formula</div>
                    <div className="text-sm font-mono bg-gray-900/50 px-2 py-1 rounded my-2">100 × level^1.5</div>
                    <div className="text-xs text-gray-400">Exponential growth ensures meaningful progression</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="font-bold text-pink-400 mb-1">🎖️ Rank Unlocks</div>
                    <div className="text-sm">Each level = unique rank symbol</div>
                    <div className="text-xs text-gray-400 mt-1">100 unique ranks from ◉ Stardust to ♌ Omniverse</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="font-bold text-yellow-400 mb-1">⚡ Auto-Update</div>
                    <div className="text-sm">Rank updates automatically on level up</div>
                    <div className="text-xs text-gray-400 mt-1">No manual actions needed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Challenge Types */}
            <div className="bg-gradient-to-br from-green-900/30 to-teal-900/30 rounded-lg p-6 border border-green-500/30 mb-6">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <SparklesIcon className="w-6 h-6 text-green-400" />
                Challenge Types
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-gray-300">
                <div>
                  <h4 className="font-bold text-green-400 mb-2">Daily Challenges</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                    <li>Play Practice Games (3-5 games)</li>
                    <li>Play Competition Games (1-2 games)</li>
                    <li>Score Threshold (800-1200+ points)</li>
                    <li>Game Marathon (4-6 total games)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-teal-400 mb-2">Weekly Challenges</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                    <li>Weekly Practice Champion (15-25 games)</li>
                    <li>Weekly Competitor (10-15 games)</li>
                    <li>XP Collector (100-200 XP)</li>
                    <li>Level Up Legend (1-3 levels)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Rewards System */}
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-lg p-6 border border-yellow-500/30">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <StarIcon className="w-6 h-6 text-yellow-400" />
                Rewards & Benefits
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-gray-300">
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-3xl mb-2">💎</div>
                  <div className="font-bold text-yellow-400 mb-1">Reward Points</div>
                  <div className="text-sm">Earned from challenges, saved for future features like cosmetics, boosts, and special items</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-3xl mb-2">🏆</div>
                  <div className="font-bold text-purple-400 mb-1">Rank Badges</div>
                  <div className="text-sm">Display your unique rank symbol and title on your profile and leaderboards</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-3xl mb-2">⭐</div>
                  <div className="font-bold text-blue-400 mb-1">Status & Prestige</div>
                  <div className="text-sm">Higher ranks showcase your dedication, skill, and commitment to the platform</div>
                </div>
              </div>
            </div>
          </div>

          {/* XP Calculation Examples */}
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <InformationCircleIcon className="w-6 h-6 text-blue-400" />
              XP Requirements by Level
            </h3>
            <div className="grid md:grid-cols-5 gap-4 text-sm">
              {[1, 10, 25, 50, 100].map(level => {
                const xpNeeded = Math.floor(100 * Math.pow(level, 1.5));
                return (
                  <div key={level} className="bg-black/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-1">Level {level}</div>
                    <div className="text-gray-300">{xpNeeded.toLocaleString()} XP</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {level === 1 ? 'Starting point' :
                       level === 10 ? '~200 practice games' :
                       level === 25 ? '~1,000 practice games' :
                       level === 50 ? '~5,000 practice games' :
                       '~20,000 practice games'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>


        {/* All 100 Ranks Grid - Enhanced Display */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-6 text-center">
            🎖️ All 100 Rank Symbols
          </h2>
          <p className="text-center text-gray-300 mb-8 max-w-3xl mx-auto">
            Every level unlocks a unique rank with a special Unicode symbol. From the humble Stardust (◉) at Level 1 
            to the ultimate Omniverse (♌) at Level 100, each rank represents your cosmic journey through the game.
          </p>

          {/* Filter Buttons */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Ranks ({ranks.length})
            </button>
            <button
              onClick={() => setFilter('early')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                filter === 'early'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Early (1-30)
            </button>
            <button
              onClick={() => setFilter('mid')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                filter === 'mid'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Mid (31-60)
            </button>
            <button
              onClick={() => setFilter('late')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                filter === 'late'
                  ? 'bg-red-600 text-white shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Late (61-100)
            </button>
          </div>

          {/* Rank Progression Timeline */}
          {filter === 'all' && (
            <div className="mb-8 bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 text-center">Rank Progression Timeline</h3>
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
                {[1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((level, idx, arr) => {
                  const rank = ranks.find(r => r.min_level === level);
                  const isLast = idx === arr.length - 1;
                  return (
                    <React.Fragment key={level}>
                      <div className="flex flex-col items-center min-w-[80px]">
                        <div 
                          className="text-3xl mb-1"
                          style={{ color: rank?.color_hex || '#fff' }}
                        >
                          {rank?.symbol || '?'}
                        </div>
                        <div className="text-xs text-gray-300 font-bold">Lv.{level}</div>
                        <div className="text-xs text-gray-400 truncate w-full text-center" title={rank?.title}>
                          {rank?.title || 'Unknown'}
                        </div>
                      </div>
                      {!isLast && (
                        <div className="flex-1 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 mx-2" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-8">
            {filteredRanks.map((rank) => {
              const isUserRank = userXP && userXP.current_level >= rank.min_level && userXP.current_level <= rank.max_level;
              
              return (
                <div
                  key={rank.tier}
                  className={`bg-white/10 backdrop-blur-xl rounded-lg p-4 border-2 transition-all hover:scale-105 hover:shadow-xl cursor-pointer ${
                    isUserRank ? 'ring-2 ring-yellow-400 ring-opacity-75 shadow-yellow-400/50' : ''
                  }`}
                  style={{
                    borderColor: rank.color_hex + '80',
                    backgroundColor: rank.color_hex + '15'
                  }}
                  title={`${rank.title} - ${rank.description}`}
                >
                  <div className="text-center">
                    {/* Symbol */}
                    <div className="text-5xl mb-2 font-bold" style={{ color: rank.color_hex }}>
                      {rank.symbol}
                    </div>
                    
                    {/* Title */}
                    <div
                      className="text-sm font-black mb-1 truncate"
                      style={{ color: rank.color_hex }}
                      title={rank.title}
                    >
                      {rank.title}
                      {isUserRank && (
                        <span className="ml-1 text-yellow-400 text-xs">★</span>
                      )}
                    </div>
                    
                    {/* Level Info */}
                    <div className="text-xs text-gray-300 mb-1">
                      Lv.{rank.min_level}
                    </div>
                    
                    {/* Description */}
                    <div className="text-xs text-gray-400 italic truncate" title={rank.description}>
                      {rank.description}
                    </div>
                    
                    {/* User's Current Rank Indicator */}
                    {isUserRank && (
                      <div className="text-xs text-yellow-400 font-bold mt-2 animate-pulse">
                        YOUR RANK
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

