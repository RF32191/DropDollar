'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { TrophyIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { TrophyIcon as TrophySolid } from '@heroicons/react/24/solid';

interface RecentAward {
  award_id: string;
  name: string;
  icon: string;
  rarity: string;
  earned_at: string;
  is_new: boolean;
}

const rarityColors: { [key: string]: string } = {
  common: 'text-gray-300 border-gray-500/30',
  uncommon: 'text-green-400 border-green-500/30',
  rare: 'text-blue-400 border-blue-500/30',
  epic: 'text-purple-400 border-purple-500/30',
  legendary: 'text-yellow-400 border-yellow-400/50'
};

export default function RecentAwardsBanner() {
  const { user } = useAuth();
  const [recentAwards, setRecentAwards] = useState<RecentAward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const loadRecentAwards = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_recent_awards', { p_limit: 5 });
      
      if (!error && data) {
        setRecentAwards(data);
        setNewCount(data.filter((a: RecentAward) => a.is_new).length);
      }
    } catch (error) {
      console.error('Error loading recent awards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadRecentAwards();
  }, [loadRecentAwards]);

  if (isLoading || !user?.id) {
    return null;
  }

  if (recentAwards.length === 0) {
    return (
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-xl p-4 border border-white/10 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrophyIcon className="w-8 h-8 text-gray-500" />
            <div>
              <h3 className="font-semibold text-gray-300">No Awards Yet</h3>
              <p className="text-sm text-gray-500">Play games to earn achievements!</p>
            </div>
          </div>
          <Link 
            href="/awards"
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition-all"
          >
            View All
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-yellow-500/10 rounded-xl p-4 border border-yellow-500/20 mb-6 relative overflow-hidden">
      {/* Animated background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/5 to-transparent animate-shimmer" 
           style={{ 
             backgroundSize: '200% 100%',
             animation: 'shimmer 3s infinite'
           }} 
      />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrophySolid className="w-6 h-6 text-yellow-400" />
            <h3 className="font-bold text-white">Recent Awards</h3>
            {newCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                {newCount} NEW
              </span>
            )}
          </div>
          <Link 
            href="/awards"
            className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors group"
          >
            View All 
            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        {/* Awards Row */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {recentAwards.map((award) => (
            <Link
              key={award.award_id}
              href="/awards"
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border bg-black/20 hover:bg-black/30 transition-all ${rarityColors[award.rarity] || rarityColors.common} ${award.is_new ? 'ring-2 ring-yellow-400/50' : ''}`}
            >
              <span className="text-2xl">{award.icon}</span>
              <div>
                <p className="font-medium text-white text-sm whitespace-nowrap">{award.name}</p>
                <p className="text-xs text-gray-400 capitalize">{award.rarity}</p>
              </div>
              {award.is_new && (
                <SparklesIcon className="w-4 h-4 text-yellow-400 animate-pulse" />
              )}
            </Link>
          ))}
        </div>
      </div>
      
      {/* CSS for shimmer */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

