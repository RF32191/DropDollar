'use client';

import React, { useEffect, useState } from 'react';
import { UserXPData } from '@/lib/supabase/xpService';
import { XPService } from '@/lib/supabase/xpService';
import { StarIcon, TrophyIcon, SparklesIcon, FireIcon } from '@heroicons/react/24/solid';
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
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Animate progress bar - update immediately when progress changes
  useEffect(() => {
    console.log('📊 [LevelDisplay] Progress changed:', {
      progress,
      total_xp: xpData.total_xp,
      current_level: xpData.current_level,
      xp_to_next_level: xpData.xp_to_next_level
    });
    
    // Update immediately, then animate
    setAnimatedProgress(progress);
    
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 50);
    return () => clearTimeout(timer);
  }, [progress, xpData.total_xp, xpData.current_level, xpData.xp_to_next_level]);

  const sizeClasses = {
    sm: {
      container: 'p-3',
      level: 'text-xl',
      title: 'text-xs',
      progress: 'h-2',
      progressBar: 'h-2'
    },
    md: {
      container: 'p-5',
      level: 'text-3xl',
      title: 'text-sm',
      progress: 'h-3',
      progressBar: 'h-3'
    },
    lg: {
      container: 'p-6',
      level: 'text-5xl',
      title: 'text-lg',
      progress: 'h-4',
      progressBar: 'h-4'
    }
  };

  const classes = sizeClasses[size];

  // Get dynamic gradient based on progress
  const getProgressGradient = () => {
    if (progress >= 90) return 'from-yellow-400 via-yellow-300 to-yellow-500';
    if (progress >= 70) return 'from-purple-400 via-pink-400 to-purple-500';
    if (progress >= 50) return 'from-blue-400 via-cyan-400 to-blue-500';
    if (progress >= 30) return 'from-green-400 via-emerald-400 to-green-500';
    return 'from-orange-400 via-red-400 to-orange-500';
  };

  return (
    <div className={`
      relative overflow-hidden
      bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900
      rounded-2xl border-2 border-purple-500/30
      shadow-2xl shadow-purple-500/20
      ${classes.container}
      transition-all duration-300
      hover:border-purple-400/50 hover:shadow-purple-500/30
    `}>
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-purple-600/10 animate-pulse" />
      
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Glowing star icon */}
              <div className="absolute inset-0 blur-md bg-yellow-400/50 rounded-full animate-pulse" />
              <StarIcon className={`${classes.level} text-yellow-400 drop-shadow-lg relative z-10`} />
              {xpData.rank_tier >= 5 && (
                <>
                  <SparklesOutline className="absolute -top-1 -right-1 w-5 h-5 text-yellow-300 animate-pulse z-20" />
                  <SparklesOutline className="absolute -bottom-1 -left-1 w-4 h-4 text-pink-300 animate-pulse z-20" style={{ animationDelay: '0.5s' }} />
                </>
              )}
            </div>
            <div>
              <div className={`
                font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300
                ${classes.level} drop-shadow-lg
                animate-pulse
              `}>
                LEVEL {xpData.current_level}
              </div>
              {showFullDetails && (
                <div className={`
                  text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300
                  ${classes.title} font-bold
                  tracking-wider
                `}>
                  {xpData.rank_title.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          {showFullDetails && (
            <div className="text-right">
              <div className={`
                text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300
                ${classes.title} font-black
                drop-shadow-lg
              `}>
                {xpData.total_xp.toLocaleString()} XP
              </div>
              <div className={`
                text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-300
                ${classes.title} font-bold
              `}>
                {xpData.reward_points} RP
              </div>
            </div>
          )}
        </div>

        {showFullDetails && (
          <>
            {/* Epic Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className={`
                  text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300
                  ${classes.title} font-bold
                  tracking-wide
                `}>
                  → LEVEL {xpData.current_level + 1}
                </span>
                <span className={`
                  text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300
                  ${classes.title} font-black
                `}>
                  {xpData.xp_to_next_level} XP
                </span>
              </div>
              
              {/* Progress bar container with game-like styling */}
              <div className={`
                relative
                bg-gray-900/80
                rounded-full
                ${classes.progressBar}
                border-2 border-purple-500/30
                shadow-inner
                overflow-hidden
              `}>
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" 
                       style={{ 
                         backgroundSize: '200% 100%',
                         animation: 'shimmer 2s infinite'
                       }} 
                  />
                </div>
                
                {/* Progress fill with animated gradient */}
                <div
                  className={`
                    relative h-full
                    bg-gradient-to-r ${getProgressGradient()}
                    rounded-full
                    transition-all duration-700 ease-out
                    shadow-lg
                    overflow-hidden
                  `}
                  style={{ width: `${animatedProgress}%` }}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                       style={{ 
                         backgroundSize: '200% 100%',
                         animation: 'shimmer 1.5s infinite'
                       }} 
                  />
                  
                  {/* Glow effect */}
                  <div className="absolute inset-0 blur-sm bg-gradient-to-r from-white/20 via-transparent to-white/20" />
                  
                  {/* Sparkle particles at the end */}
                  {animatedProgress > 0 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg shadow-white/50 animate-pulse" />
                  )}
                </div>
                
                {/* Progress percentage overlay */}
                {animatedProgress > 10 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`
                      text-white font-black
                      text-xs
                      drop-shadow-lg
                      ${animatedProgress >= 90 ? 'animate-pulse' : ''}
                    `}>
                      {Math.round(animatedProgress)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Rank Badge with game-like styling */}
            <div className={`
              flex items-center gap-3
              bg-gradient-to-r from-purple-900/50 to-pink-900/50
              rounded-lg p-3
              border border-purple-500/30
              backdrop-blur-sm
            `}>
              <div className="relative">
                <TrophyIcon className={`w-6 h-6 text-yellow-400 drop-shadow-lg`} />
                <div className="absolute inset-0 blur-md bg-yellow-400/30 rounded-full animate-pulse" />
              </div>
              <div>
                <span className={`
                  text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300
                  ${classes.title} font-black
                  tracking-wide
                `}>
                  TIER {xpData.rank_tier}
                </span>
                <span className={`text-gray-300 ${classes.title} mx-2`}>•</span>
                <span className={`
                  text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300
                  ${classes.title} font-bold
                `}>
                  {xpData.rank_title}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}

