'use client';

import React from 'react';
import { UserXPData } from '@/lib/supabase/xpService';
import { XPService } from '@/lib/supabase/xpService';
import { StarIcon, TrophyIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { SparklesIcon as SparklesOutline } from '@heroicons/react/24/outline';

interface LevelDisplayProps {
  xpData: UserXPData;
  showFullDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function LevelDisplay({ xpData, showFullDetails = true, size = 'md' }: LevelDisplayProps) {
  const progress = XPService.calculateXPProgress(xpData);
  const rankGradient = XPService.getRankGradient(xpData.rank_tier);
  const rankColor = XPService.getRankColor(xpData.rank_tier);

  const sizeClasses = {
    sm: {
      container: 'p-2',
      level: 'text-lg',
      title: 'text-xs',
      progress: 'h-1.5'
    },
    md: {
      container: 'p-4',
      level: 'text-2xl',
      title: 'text-sm',
      progress: 'h-2'
    },
    lg: {
      container: 'p-6',
      level: 'text-4xl',
      title: 'text-lg',
      progress: 'h-3'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`bg-gradient-to-br ${rankGradient} rounded-xl shadow-lg ${classes.container}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <StarIcon className={`${classes.level} text-yellow-300 drop-shadow-lg`} />
            {xpData.rank_tier >= 5 && (
              <SparklesOutline className="absolute -top-1 -right-1 w-4 h-4 text-yellow-200 animate-pulse" />
            )}
          </div>
          <div>
            <div className={`font-black text-white ${classes.level} drop-shadow-md`}>
              Level {xpData.current_level}
            </div>
            {showFullDetails && (
              <div className={`text-white/90 ${classes.title} font-semibold`}>
                {xpData.rank_title}
              </div>
            )}
          </div>
        </div>
        {showFullDetails && (
          <div className="text-right">
            <div className={`text-white/90 ${classes.title} font-bold`}>
              {xpData.total_xp.toLocaleString()} XP
            </div>
            <div className={`text-white/80 ${classes.title}`}>
              {xpData.reward_points} RP
            </div>
          </div>
        )}
      </div>

      {showFullDetails && (
        <>
          <div className="mb-1">
            <div className="flex justify-between items-center mb-1">
              <span className={`text-white/90 ${classes.title} font-semibold`}>
                Progress to Level {xpData.current_level + 1}
              </span>
              <span className={`text-white/90 ${classes.title} font-bold`}>
                {xpData.xp_to_next_level} XP needed
              </span>
            </div>
            <div className={`bg-white/20 rounded-full overflow-hidden ${classes.progress}`}>
              <div
                className={`bg-white rounded-full h-full transition-all duration-500 ease-out`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Rank Badge */}
          <div className="mt-3 flex items-center gap-2">
            <TrophyIcon className={`w-5 h-5 text-yellow-300`} />
            <span className={`text-white/90 ${classes.title} font-semibold`}>
              Tier {xpData.rank_tier} - {xpData.rank_title}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

