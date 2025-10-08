import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

export interface UserLevel {
  id: string;
  user_id: string;
  username: string;
  current_level: number;
  total_points: number;
  spendable_points: number;
  games_played_total: number;
  highest_game_score: number;
  created_at: string;
  updated_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  points_change: number;
  points_before: number;
  points_after: number;
  source_reference?: string;
  description?: string;
  created_at: string;
}

export function useDropPoints() {
  const { user } = useAuth();
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user level data
  const fetchUserLevel = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user level:', error);
        setError('Failed to load user level data');
        return;
      }

      if (data) {
        setUserLevel(data);
      } else {
        // Create user level entry if it doesn't exist
        const { data: newLevel, error: createError } = await supabase
          .from('user_levels')
          .insert({
            user_id: user.id,
            username: user.username || 'Player'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating user level:', createError);
          setError('Failed to create user level');
        } else {
          setUserLevel(newLevel);
        }
      }
    } catch (err) {
      console.error('Error in fetchUserLevel:', err);
      setError('Failed to load user data');
    }
  };

  // Fetch user transactions
  const fetchTransactions = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error('Error in fetchTransactions:', err);
    }
  };

  // Award points for game completion
  const awardGamePoints = async (gameScore: number, gameType: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase.rpc('award_game_points', {
        p_user_id: user.id,
        p_game_score: gameScore,
        p_game_type: gameType
      });

      if (error) {
        console.error('Error awarding points:', error);
        throw new Error('Failed to award points');
      }

      // Refresh user level data
      await fetchUserLevel();
      await fetchTransactions();

      return data;
    } catch (err) {
      console.error('Error in awardGamePoints:', err);
      throw err;
    }
  };

  // Calculate level from games played
  const calculateLevel = (gamesPlayed: number): number => {
    return Math.min(100, Math.max(1, Math.floor(Math.sqrt(gamesPlayed / 10))));
  };

  // Get level name based on level number
  const getLevelName = (level: number): string => {
    const levelNames = [
      // 1-10: Beginner
      'Rookie', 'Novice', 'Apprentice', 'Student', 'Trainee', 'Player', 'Gamer', 'Competitor', 'Skilled', 'Talented',
      // 11-25: Intermediate
      'Adept', 'Proficient', 'Expert', 'Specialist', 'Veteran', 'Elite', 'Master', 'Grandmaster', 'Champion', 'Hero', 'Legend', 'Mythic', 'Immortal', 'Divine', 'Ascended',
      // 26-50: Advanced
      'Cosmic', 'Galactic', 'Universal', 'Infinite', 'Eternal', 'Omega', 'Alpha', 'Prime', 'Supreme', 'Ultimate',
      'Transcendent', 'Apex', 'Zenith', 'Pinnacle', 'Paragon', 'Sovereign', 'Emperor', 'Deity', 'Avatar', 'Omnipotent',
      'Omniscient', 'Omnipresent', 'Absolute', 'Perfect', 'Flawless',
      // 51-75: Master
      'Unstoppable', 'Invincible', 'Unbeatable', 'Legendary', 'Mythical', 'Celestial', 'Stellar', 'Galactic Lord', 'Universe Master', 'Reality Bender',
      'Time Lord', 'Space Conqueror', 'Dimension Walker', 'Multiverse Guardian', 'Infinity Master', 'Eternity Keeper', 'Creation Force', 'Destruction Power', 'Balance Keeper', 'Chaos Master',
      'Order Guardian', 'Void Walker', 'Light Bearer', 'Shadow Master', 'Nexus Point',
      // 76-90: Transcendent
      'Origin', 'Genesis', 'Exodus', 'Revelation', 'Ascension', 'Enlightenment', 'Nirvana', 'Moksha', 'Satori', 'Samadhi',
      'Kaivalya', 'Turiya', 'Brahman', 'Atman', 'Parabrahman',
      // 91-100: God Tier
      'One', 'All', 'Nothing', 'Everything', 'Beyond', 'Impossible', 'Paradox', 'Singularity', 'Omega Point', 'DropGod'
    ];

    return levelNames[level - 1] || `Level ${level}`;
  };

  // Get level icon based on level number
  const getLevelIcon = (level: number): string => {
    const levelIcons = [
      // 1-10
      '🎮', '🎯', '🎲', '📚', '⚡', '🔥', '💎', '🏃', '🎪', '🌟',
      // 11-25
      '⚔️', '🛡️', '🔮', '🎭', '🏅', '💫', '👑', '🏆', '🥇', '🦸', '⭐', '🌠', '💀', '😇', '🚀',
      // 26-50
      '🌌', '🌠', '🌍', '♾️', '⏳', 'Ω', 'Α', '🔱', '👑', '🏅',
      '🔮', '⛰️', '🌅', '🏔️', '💎', '👑', '🏛️', '🕊️', '🌀', '⚡',
      '👁️', '🌐', '🔥', '✨', '💯',
      // 51-75
      '🚀', '🛡️', '⚔️', '🏆', '🦄', '⭐', '🌟', '🌌', '🌍', '🌀',
      '⏰', '🚀', '🚪', '🛡️', '♾️', '⏳', '✨', '💥', '⚖️', '🌪️',
      '🏛️', '🕳️', '💡', '👤', '🔗',
      // 76-90
      '🌀', '🌱', '🚪', '📜', '🚀', '💡', '🕉️', '🌸', '🧘', '🔮',
      '♦️', '👁️', '🕉️', '💎', '🌟',
      // 91-100
      '1️⃣', '∞', '⭕', '🌍', '🚀', '❌', '🔄', '⚫', 'Ω', '🎮👑'
    ];

    return levelIcons[level - 1] || '🎮';
  };

  // Get level color based on tier
  const getLevelColor = (level: number): string => {
    if (level <= 10) return '#10B981'; // Green
    if (level <= 25) return '#3B82F6'; // Blue
    if (level <= 50) return '#F59E0B'; // Orange
    if (level <= 75) return '#8B5CF6'; // Purple
    if (level <= 90) return '#EAB308'; // Yellow
    return '#EC4899'; // Pink for God Tier
  };

  // Calculate progress to next level
  const getProgressToNextLevel = (): { current: number; required: number; percentage: number } => {
    if (!userLevel) return { current: 0, required: 100, percentage: 0 };

    const currentLevelGames = Math.pow(userLevel.current_level, 2) * 10;
    const nextLevelGames = Math.pow(userLevel.current_level + 1, 2) * 10;
    const gamesIntoLevel = userLevel.games_played_total - currentLevelGames;
    const gamesNeededForNext = nextLevelGames - currentLevelGames;
    const percentage = Math.min(100, Math.max(0, (gamesIntoLevel / gamesNeededForNext) * 100));

    return {
      current: gamesIntoLevel,
      required: gamesNeededForNext,
      percentage
    };
  };

  // Initialize data on mount or user change
  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      setError(null);
      
      Promise.all([
        fetchUserLevel(),
        fetchTransactions()
      ]).finally(() => {
        setLoading(false);
      });
    } else {
      setUserLevel(null);
      setTransactions([]);
      setLoading(false);
    }
  }, [user?.id]);

  return {
    userLevel,
    transactions,
    loading,
    error,
    awardGamePoints,
    calculateLevel,
    getLevelName,
    getLevelIcon,
    getLevelColor,
    getProgressToNextLevel,
    refreshData: () => {
      fetchUserLevel();
      fetchTransactions();
    }
  };
}
