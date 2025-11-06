'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RateLimitStatus {
  gamesLastHour: number;
  gamesLastDay: number;
  hourlyLimit: number;
  dailyLimit: number;
  isHourlyLimitReached: boolean;
  isDailyLimitReached: boolean;
  isBlocked: boolean;
  nextHourlyReset: Date | null;
  nextDailyReset: Date | null;
  lastGameAt: Date | null;
}

const HOURLY_LIMIT = 30;
const DAILY_LIMIT = 200;

export function useRateLimits() {
  const { user, isAuthenticated } = useAuth();
  const [rateLimits, setRateLimits] = useState<RateLimitStatus>({
    gamesLastHour: 0,
    gamesLastDay: 0,
    hourlyLimit: HOURLY_LIMIT,
    dailyLimit: DAILY_LIMIT,
    isHourlyLimitReached: false,
    isDailyLimitReached: false,
    isBlocked: false,
    nextHourlyReset: null,
    nextDailyReset: null,
    lastGameAt: null
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchRateLimits = async () => {
    if (!user || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_rate_limits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error fetching rate limits:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        const lastGameAt = data.last_game_at ? new Date(data.last_game_at) : null;
        const now = new Date();
        
        // Calculate reset times
        const nextHourlyReset = lastGameAt ? new Date(lastGameAt.getTime() + 60 * 60 * 1000) : null;
        const nextDailyReset = lastGameAt ? new Date(lastGameAt.getTime() + 24 * 60 * 60 * 1000) : null;

        const gamesLastHour = data.games_last_hour || 0;
        const gamesLastDay = data.games_last_day || 0;

        setRateLimits({
          gamesLastHour,
          gamesLastDay,
          hourlyLimit: HOURLY_LIMIT,
          dailyLimit: DAILY_LIMIT,
          isHourlyLimitReached: gamesLastHour >= HOURLY_LIMIT,
          isDailyLimitReached: gamesLastDay >= DAILY_LIMIT,
          isBlocked: gamesLastHour >= HOURLY_LIMIT || gamesLastDay >= DAILY_LIMIT,
          nextHourlyReset,
          nextDailyReset,
          lastGameAt
        });
      } else {
        // No rate limit record yet - user hasn't played any games
        setRateLimits({
          gamesLastHour: 0,
          gamesLastDay: 0,
          hourlyLimit: HOURLY_LIMIT,
          dailyLimit: DAILY_LIMIT,
          isHourlyLimitReached: false,
          isDailyLimitReached: false,
          isBlocked: false,
          nextHourlyReset: null,
          nextDailyReset: null,
          lastGameAt: null
        });
      }
    } catch (error) {
      console.error('Error in rate limit check:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRateLimits();
  }, [user, isAuthenticated]);

  // Refresh every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchRateLimits();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return {
    ...rateLimits,
    isLoading,
    refresh: fetchRateLimits
  };
}

