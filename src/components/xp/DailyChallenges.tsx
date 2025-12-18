'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { XPService, DailyChallenge, WeeklyChallenge } from '@/lib/supabase/xpService';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircleIcon, ClockIcon, FireIcon, TrophyIcon, CalendarIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { SparklesIcon as SparklesOutline } from '@heroicons/react/24/outline';

interface DailyChallengesProps {
  userId: string;
  initialLoading?: boolean;
}

// Get time until midnight in user's local timezone
const getTimeUntilDailyReset = (): string => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};

// Get time until next Monday in user's local timezone
const getTimeUntilWeeklyReset = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  
  const nextMonday = new Date(now);
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  
  const diff = nextMonday.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h`;
};

// Check if challenges should be reset based on local time
const shouldResetDaily = (): boolean => {
  const lastResetKey = 'dailyChallengesLastReset';
  const lastReset = localStorage.getItem(lastResetKey);
  
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  if (!lastReset) {
    localStorage.setItem(lastResetKey, todayStart.toISOString());
    return true;
  }
  
  const lastResetDate = new Date(lastReset);
  if (lastResetDate < todayStart) {
    localStorage.setItem(lastResetKey, todayStart.toISOString());
    return true;
  }
  
  return false;
};

const shouldResetWeekly = (): boolean => {
  const lastResetKey = 'weeklyChallengesLastReset';
  const lastReset = localStorage.getItem(lastResetKey);
  
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const thisMonday = new Date(now);
  thisMonday.setDate(thisMonday.getDate() - daysFromMonday);
  thisMonday.setHours(0, 0, 0, 0);
  
  if (!lastReset) {
    localStorage.setItem(lastResetKey, thisMonday.toISOString());
    return true;
  }
  
  const lastResetDate = new Date(lastReset);
  if (lastResetDate < thisMonday) {
    localStorage.setItem(lastResetKey, thisMonday.toISOString());
    return true;
  }
  
  return false;
};

export default function DailyChallenges({ userId, initialLoading = false }: DailyChallengesProps) {
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<WeeklyChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(!initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [dailyResetTime, setDailyResetTime] = useState<string>('');
  const [weeklyResetTime, setWeeklyResetTime] = useState<string>('');

  // Update reset countdown timers
  useEffect(() => {
    const updateTimers = () => {
      setDailyResetTime(getTimeUntilDailyReset());
      setWeeklyResetTime(getTimeUntilWeeklyReset());
    };
    
    updateTimers();
    const timerInterval = setInterval(updateTimers, 60000); // Update every minute
    
    return () => clearInterval(timerInterval);
  }, []);
  
  useEffect(() => {
    if (!userId) {
      console.warn('⚠️ [DailyChallenges] No userId provided');
      setError('User not loaded');
      return;
    }
    
    console.log('✅ [DailyChallenges] Component mounted with userId:', userId);
    
    // Check for local time-based resets
    const dailyNeedsReset = shouldResetDaily();
    const weeklyNeedsReset = shouldResetWeekly();
    
    if (dailyNeedsReset) {
      console.log('🔄 [DailyChallenges] Daily reset triggered based on local time');
    }
    if (weeklyNeedsReset) {
      console.log('🔄 [DailyChallenges] Weekly reset triggered based on local time');
    }
    
    // Initial load
    loadChallenges();
    
    // Auto-refresh challenges every 60 seconds
    const refreshInterval = setInterval(() => {
      // Check if a reset should happen
      if (shouldResetDaily() || shouldResetWeekly()) {
        console.log('🔄 [DailyChallenges] Time-based reset detected, refreshing...');
      }
      loadChallenges();
    }, 60000);
    
    // Refresh when window gains focus (user comes back to tab)
    const handleFocus = () => {
      loadChallenges();
    };
    window.addEventListener('focus', handleFocus);
    
    // Refresh when page becomes visible (user switches tabs back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadChallenges();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Refresh when localStorage indicates a new game was completed
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hasNewGameScore') {
        loadChallenges();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Check localStorage periodically for new games - less aggressive
    const checkStorageInterval = setInterval(() => {
      if (localStorage.getItem('hasNewGameScore')) {
        localStorage.removeItem('hasNewGameScore');
        // Longer delay to ensure database trigger has completed
        setTimeout(() => {
          console.log('🔄 [DailyChallenges] Refreshing after game completion...');
          loadChallenges();
        }, 3000); // 3 second delay for database updates
      }
    }, 15000); // Check every 15 seconds
    
    return () => {
      clearInterval(refreshInterval);
      clearInterval(checkStorageInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  const loadChallenges = async () => {
    if (!userId) return;
    
    // Only show loading on initial load, not on refreshes
    const isInitialLoad = dailyChallenges.length === 0 && weeklyChallenges.length === 0;
    if (isInitialLoad) {
      setIsLoading(true);
    }
    
    try {
      console.log('🔄 [DailyChallenges] Loading challenges for user:', userId);
      const [daily, weekly] = await Promise.all([
        XPService.getDailyChallenges(userId).catch((err) => {
          console.error('❌ [DailyChallenges] Error fetching daily:', err);
          return [];
        }),
        XPService.getWeeklyChallenges(userId).catch((err) => {
          console.error('❌ [DailyChallenges] Error fetching weekly:', err);
          return [];
        })
      ]);
      
      console.log('📊 [DailyChallenges] Received data:', {
        daily: daily.length,
        weekly: weekly.length,
        dailyProgress: daily.map(c => ({ 
          id: c.challenge_id?.substring(0, 8), 
          name: c.challenge_name, 
          progress: c.progress, 
          target: c.target_value,
          type: c.challenge_type,
          completed: c.is_completed
        })),
        weeklyProgress: weekly.map(c => ({ 
          id: c.challenge_id?.substring(0, 8), 
          name: c.challenge_name, 
          progress: c.progress, 
          target: c.target_value,
          type: c.challenge_type,
          completed: c.is_completed
        }))
      });
      
      // Compare by challenge_id, not index (more reliable)
      const dailyChanged = daily.length !== dailyChallenges.length || 
        daily.some((challenge) => {
          const existing = dailyChallenges.find(c => c.challenge_id === challenge.challenge_id);
          return !existing || 
                 existing.progress !== challenge.progress ||
                 existing.is_completed !== challenge.is_completed;
        });
      
      const weeklyChanged = weekly.length !== weeklyChallenges.length ||
        weekly.some((challenge) => {
          const existing = weeklyChallenges.find(c => c.challenge_id === challenge.challenge_id);
          return !existing || 
                 existing.progress !== challenge.progress ||
                 existing.is_completed !== challenge.is_completed;
        });
      
      // ALWAYS update state to ensure latest data is shown (force update)
      if (daily.length > 0 || isInitialLoad) {
        setDailyChallenges(daily || []);
        if (dailyChanged) {
          console.log('✅ [DailyChallenges] Daily challenges updated - progress changed');
        } else if (daily.length > 0) {
          console.log('🔄 [DailyChallenges] Daily challenges refreshed (same data)');
        }
      }
      
      if (weekly.length > 0 || isInitialLoad) {
        setWeeklyChallenges(weekly || []);
        if (weeklyChanged) {
          console.log('✅ [DailyChallenges] Weekly challenges updated - progress changed');
        } else if (weekly.length > 0) {
          console.log('🔄 [DailyChallenges] Weekly challenges refreshed (same data)');
        }
      }
    } catch (error) {
      console.error('❌ [DailyChallenges] Error loading challenges:', error);
      setError('Failed to load challenges. Please refresh.');
      // Don't clear existing data on error, just log it
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'play_practice':
        return <ClockIcon className="w-6 h-6 text-blue-400" />;
      case 'play_competition':
        return <TrophyIcon className="w-6 h-6 text-yellow-400" />;
      case 'score_threshold':
        return <FireIcon className="w-6 h-6 text-orange-400" />;
      case 'games_count':
        return <SparklesIcon className="w-6 h-6 text-purple-400" />;
      case 'total_xp':
        return <SparklesOutline className="w-6 h-6 text-green-400" />;
      case 'level_up':
        return <TrophyIcon className="w-6 h-6 text-pink-400" />;
      default:
        return <TrophyIcon className="w-6 h-6 text-gray-400" />;
    }
  };

  const getChallengeColor = (type: string) => {
    switch (type) {
      case 'play_practice':
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
      case 'play_competition':
        return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
      case 'score_threshold':
        return 'from-orange-500/20 to-orange-600/20 border-orange-500/30';
      case 'games_count':
        return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      case 'total_xp':
        return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'level_up':
        return 'from-pink-500/20 to-pink-600/20 border-pink-500/30';
      default:
        return 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
    }
  };

  const renderChallenge = (challenge: DailyChallenge | WeeklyChallenge, isWeekly: boolean = false) => {
    const progressPercent = (challenge.progress / challenge.target_value) * 100;
    const isCompleted = challenge.is_completed;
    
    return (
      <div
        key={challenge.challenge_id}
        className={`bg-gradient-to-r ${getChallengeColor(challenge.challenge_type)} rounded-lg p-4 border transition-all ${
          isCompleted ? 'opacity-75' : ''
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              {getChallengeIcon(challenge.challenge_type)}
            </div>
            <div className="flex-1">
              <h4 className={`font-bold text-white mb-1 ${isCompleted ? 'line-through' : ''}`}>
                {challenge.challenge_name}
              </h4>
              <p className="text-sm text-gray-300">
                {challenge.challenge_description}
              </p>
            </div>
          </div>
          {isCompleted && (
            <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">
              {challenge.progress} / {challenge.target_value}
            </span>
            {!isCompleted && (
              <span className="text-xs text-yellow-400 font-semibold">
                +{challenge.xp_reward} XP • {challenge.reward_points} RP
              </span>
            )}
            {isCompleted && (
              <span className="text-xs text-green-400 font-semibold">
                Completed!
              </span>
            )}
          </div>
          <div className="bg-gray-800/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isCompleted ? 'bg-green-500' : isWeekly ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-gray-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700/50 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-700/30 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleManualRefresh = async () => {
    console.log('🔄 [DailyChallenges] Manual refresh triggered');
    await loadChallenges();
  };

  return (
    <div className="space-y-6">
      {/* Daily Challenges */}
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <ClockIcon className="w-6 h-6 text-blue-400" />
            Daily Challenges
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-lg">
              ⏰ Resets in {dailyResetTime}
            </span>
            <button
              onClick={handleManualRefresh}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              🔄
            </button>
          </div>
        </div>
        
        {error ? (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
            <button
              onClick={handleManualRefresh}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        ) : dailyChallenges.length === 0 ? (
          <p className="text-gray-400">No daily challenges available. They will be generated automatically!</p>
        ) : (
          <div className="space-y-3">
            {dailyChallenges.map((challenge) => renderChallenge(challenge, false))}
          </div>
        )}
      </div>

      {/* Weekly Challenges */}
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-purple-400" />
            Weekly Challenges
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-lg">
              ⏰ Resets in {weeklyResetTime}
            </span>
            <button
              onClick={handleManualRefresh}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              🔄
            </button>
          </div>
        </div>
        
        {weeklyChallenges.length === 0 ? (
          <p className="text-gray-400">No weekly challenges available. They will be generated automatically!</p>
        ) : (
          <div className="space-y-3">
            {weeklyChallenges.map((challenge) => renderChallenge(challenge, true))}
          </div>
        )}
      </div>
    </div>
  );
}
