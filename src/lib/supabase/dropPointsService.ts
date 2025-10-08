import { supabase } from './client';

export interface UserLevel {
  id: string;
  user_id: string;
  username: string;
  current_level: number;
  total_points: number;
  spendable_points: number;
  points_to_next_level: number;
  level_progress_percentage: number;
  highest_game_score: number;
  games_played_today: number;
  games_played_total: number;
  consecutive_days_played: number;
  last_activity_date: string;
  achievements: string[];
  level_rewards_claimed: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  activity_date: string;
  games_played: number;
  points_earned: number;
  highest_score: number;
  time_played_minutes: number;
  tournaments_entered: number;
  achievements_unlocked: number;
  daily_bonus_claimed: boolean;
  streak_bonus_earned: boolean;
  created_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  transaction_type: 'game_score' | 'daily_bonus' | 'level_up' | 'achievement' | 'tournament_win' | 'store_purchase';
  points_change: number;
  points_before: number;
  points_after: number;
  source_reference?: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  points_awarded: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  unlocked_at: string;
  progress_data: Record<string, any>;
}

export interface LevelDefinition {
  level: number;
  level_name: string;
  points_required: number;
  games_required: number;
  level_color: string;
  level_icon: string;
  spendable_points_reward: number;
  tokens_reward: number;
  requirements: Record<string, any>;
  description: string;
}

export class DropPointsService {
  // Calculate points based on game performance
  static calculateGamePoints(gameScore: number, gameType: string, completionTime?: number): number {
    let basePoints = 10; // Base points for completing a game
    let scoreBonus = 0;
    let timeBonus = 0;
    
    // Game type multipliers
    const gameMultipliers: Record<string, number> = {
      'color-sequence': 1.0,
      'multi-target': 1.2,
      'falling-object': 1.1,
      'tournament': 1.5,
      'hot-sell': 2.0
    };
    
    const multiplier = gameMultipliers[gameType] || 1.0;
    
    // Score-based bonus (0-15 bonus points)
    if (gameScore >= 10000) scoreBonus = 15;
    else if (gameScore >= 5000) scoreBonus = 12;
    else if (gameScore >= 2000) scoreBonus = 8;
    else if (gameScore >= 1000) scoreBonus = 5;
    else if (gameScore >= 500) scoreBonus = 2;
    
    // Time bonus for quick completion (Multi-Target only)
    if (gameType === 'multi-target' && completionTime) {
      if (completionTime <= 10) timeBonus = 5;
      else if (completionTime <= 20) timeBonus = 3;
      else if (completionTime <= 30) timeBonus = 1;
    }
    
    return Math.floor((basePoints + scoreBonus + timeBonus) * multiplier);
  }

  // Calculate level based on games played (100,000 games = level 100)
  static calculateLevelFromGames(gamesPlayed: number): LevelDefinition {
    // Level formula: level = sqrt(games / 10) rounded down, max 100
    const level = Math.min(100, Math.max(1, Math.floor(Math.sqrt(gamesPlayed / 10))));
    
    return this.getLevelDefinition(level);
  }

  // Get level definition for a specific level
  static getLevelDefinition(level: number): LevelDefinition {
    // Games required: level^2 * 10
    const gamesRequired = level === 1 ? 0 : Math.pow(level, 2) * 10;
    // Points required: games * 15 (average points per game)
    const pointsRequired = level === 1 ? 0 : Math.floor(gamesRequired * 15);
    // Spendable points: 50% of total points
    const spendablePointsReward = Math.floor(pointsRequired * 0.5);
    // Tokens: level * 10
    const tokensReward = level * 10;

    // Level names and styling
    const levelData = this.getLevelStyling(level);

    return {
      level,
      level_name: levelData.name,
      points_required: pointsRequired,
      games_required: gamesRequired,
      level_color: levelData.color,
      level_icon: levelData.icon,
      spendable_points_reward: spendablePointsReward,
      tokens_reward: tokensReward,
      requirements: { games_played: gamesRequired },
      description: levelData.description
    };
  }

  // Get level styling and names
  static getLevelStyling(level: number): { name: string; color: string; icon: string; description: string } {
    const levelNames = [
      // 1-10: Beginner
      'Rookie', 'Novice', 'Apprentice', 'Student', 'Trainee', 'Player', 'Gamer', 'Competitor', 'Skilled', 'Talented',
      // 11-25: Intermediate
      'Adept', 'Proficient', 'Expert', 'Specialist', 'Veteran', 'Elite', 'Master', 'Grandmaster', 'Champion', 'Hero', 'Legend', 'Mythic', 'Immortal', 'Divine', 'Ascended',
      // 26-50: Advanced (25 levels)
      'Cosmic', 'Galactic', 'Universal', 'Infinite', 'Eternal', 'Omega', 'Alpha', 'Prime', 'Supreme', 'Ultimate',
      'Transcendent', 'Apex', 'Zenith', 'Pinnacle', 'Paragon', 'Sovereign', 'Emperor', 'Deity', 'Avatar', 'Omnipotent',
      'Omniscient', 'Omnipresent', 'Absolute', 'Perfect', 'Flawless',
      // 51-75: Master (25 levels)
      'Unstoppable', 'Invincible', 'Unbeatable', 'Legendary', 'Mythical', 'Celestial', 'Stellar', 'Galactic Lord', 'Universe Master', 'Reality Bender',
      'Time Lord', 'Space Conqueror', 'Dimension Walker', 'Multiverse Guardian', 'Infinity Master', 'Eternity Keeper', 'Creation Force', 'Destruction Power', 'Balance Keeper', 'Chaos Master',
      'Order Guardian', 'Void Walker', 'Light Bearer', 'Shadow Master', 'Nexus Point',
      // 76-90: Transcendent (15 levels)
      'Origin', 'Genesis', 'Exodus', 'Revelation', 'Ascension', 'Enlightenment', 'Nirvana', 'Moksha', 'Satori', 'Samadhi',
      'Kaivalya', 'Turiya', 'Brahman', 'Atman', 'Parabrahman',
      // 91-100: God Tier (10 levels)
      'One', 'All', 'Nothing', 'Everything', 'Beyond', 'Impossible', 'Paradox', 'Singularity', 'Omega Point', 'DropGod'
    ];

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

    const levelColors = [
      // 1-10: Beginner colors
      '#6B7280', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#EC4899', '#84CC16', '#F97316',
      // 11-25: Intermediate colors
      '#DC2626', '#7C3AED', '#059669', '#0891B2', '#BE185D', '#9333EA', '#C2410C', '#991B1B', '#92400E', '#1F2937',
      '#FFD700', '#FF6B35', '#4ECDC4', '#FF1744', '#9C27B0',
      // 26-50: Advanced colors
      '#3F51B5', '#00BCD4', '#4CAF50', '#FF9800', '#E91E63', '#795548', '#607D8B', '#1A237E', '#B71C1C', '#1B5E20',
      '#4A148C', '#BF360C', '#E65100', '#1565C0', '#2E7D32', '#C62828', '#6A1B9A', '#00695C', '#F57C00', '#5D4037',
      '#455A64', '#3E2723', '#263238', '#FFFFFF', '#000000',
      // 51-75: Master colors
      '#FF0000', '#00FF00', '#0000FF', '#FFD700', '#FF69B4', '#87CEEB', '#FFA500', '#8A2BE2', '#DC143C', '#00CED1',
      '#9932CC', '#FF1493', '#32CD32', '#FF4500', '#4169E1', '#FF6347', '#20B2AA', '#B22222', '#708090', '#8B0000',
      '#FFFFFF', '#000000', '#FFFF00', '#2F4F4F', '#8A2BE2',
      // 76-90: Transcendent colors
      '#FF0080', '#00FF80', '#8000FF', '#FF8000', '#0080FF', '#FFFF80', '#80FFFF', '#FF80FF', '#80FF80', '#FF8080',
      '#8080FF', '#FFFF40', '#4040FF', '#40FF40', '#FF4040',
      // 91-100: God Tier colors
      '#FFFFFF', '#000000', '#808080', '#C0C0C0', '#FFD700', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#RAINBOW'
    ];

    const name = levelNames[level - 1] || `Level ${level}`;
    const color = levelColors[level - 1] || '#6B7280';
    const icon = levelIcons[level - 1] || '🎮';
    
    let description = `Reach ${Math.pow(level, 2) * 10} games to unlock this level.`;
    if (level === 100) {
      description = 'The ultimate DropDollar deity! You have transcended all limits and become the DropGod!';
    }

    return { name, color, icon, description };
  }

  // Award points to user for game completion
  static async awardGamePoints(
    userId: string, 
    gameScore: number, 
    gameType: string, 
    completionTime?: number
  ): Promise<{ success: boolean; pointsAwarded: number; newLevel?: number; leveledUp: boolean }> {
    try {
      const pointsAwarded = this.calculateGamePoints(gameScore, gameType, completionTime);
      
      // Get current user level data
      const { data: currentLevel, error: levelError } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (levelError) {
        console.error('Error fetching user level:', levelError);
        return { success: false, pointsAwarded: 0, leveledUp: false };
      }

      const newTotalPoints = currentLevel.total_points + pointsAwarded;
      const newSpendablePoints = currentLevel.spendable_points + Math.floor(pointsAwarded * 0.5);
      const newGamesTotal = currentLevel.games_played_total + 1;
      const newHighestScore = Math.max(currentLevel.highest_game_score, gameScore);

      // Calculate new level based on games played
      const newLevelData = this.calculateLevelFromGames(newGamesTotal);
      const leveledUp = newLevelData.level > currentLevel.current_level;

      // Update user level
      const { error: updateError } = await supabase
        .from('user_levels')
        .update({
          total_points: newTotalPoints,
          spendable_points: newSpendablePoints,
          games_played_total: newGamesTotal,
          games_played_today: currentLevel.games_played_today + 1,
          highest_game_score: newHighestScore,
          current_level: newLevelData.level,
          points_to_next_level: Math.max(0, this.getLevelDefinition(newLevelData.level + 1).points_required - newTotalPoints),
          level_progress_percentage: this.calculateLevelProgress(newTotalPoints, newLevelData.level),
          last_activity_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user level:', updateError);
        return { success: false, pointsAwarded: 0, leveledUp: false };
      }

      // Record points transaction
      await supabase
        .from('points_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'game_score',
          points_change: pointsAwarded,
          points_before: currentLevel.total_points,
          points_after: newTotalPoints,
          source_reference: gameType,
          description: `Earned ${pointsAwarded} points playing ${gameType} (Score: ${gameScore})`,
          metadata: { game_type: gameType, score: gameScore, completion_time: completionTime }
        });

      // Update daily activity
      await this.updateDailyActivity(userId, pointsAwarded, gameScore);

      return {
        success: true,
        pointsAwarded,
        newLevel: leveledUp ? newLevelData.level : undefined,
        leveledUp
      };
    } catch (error) {
      console.error('Error awarding game points:', error);
      return { success: false, pointsAwarded: 0, leveledUp: false };
    }
  }

  // Calculate level progress percentage
  static calculateLevelProgress(totalPoints: number, currentLevel: number): number {
    const currentLevelData = this.getLevelDefinition(currentLevel);
    const nextLevelData = this.getLevelDefinition(currentLevel + 1);
    
    if (currentLevel >= 100) return 100;
    
    const pointsIntoLevel = totalPoints - currentLevelData.points_required;
    const pointsNeededForNextLevel = nextLevelData.points_required - currentLevelData.points_required;
    
    return Math.min(100, Math.max(0, (pointsIntoLevel / pointsNeededForNextLevel) * 100));
  }

  // Update daily activity
  static async updateDailyActivity(userId: string, pointsEarned: number, highestScore: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing } = await supabase
      .from('daily_activity')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_date', today)
      .single();

    if (existing) {
      await supabase
        .from('daily_activity')
        .update({
          games_played: existing.games_played + 1,
          points_earned: existing.points_earned + pointsEarned,
          highest_score: Math.max(existing.highest_score, highestScore),
          time_played_minutes: existing.time_played_minutes + 2 // Estimate 2 minutes per game
        })
        .eq('user_id', userId)
        .eq('activity_date', today);
    } else {
      await supabase
        .from('daily_activity')
        .insert({
          user_id: userId,
          activity_date: today,
          games_played: 1,
          points_earned: pointsEarned,
          highest_score: highestScore,
          time_played_minutes: 2
        });
    }
  }

  // Get user level data
  static async getUserLevel(userId: string): Promise<UserLevel | null> {
    const { data, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user level:', error);
      return null;
    }

    return data;
  }

  // Get user's points transactions
  static async getUserTransactions(userId: string, limit = 50): Promise<PointsTransaction[]> {
    const { data, error } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  }

  // Get leaderboard
  static async getLeaderboard(type: 'points' | 'level' | 'games' = 'points', limit = 100) {
    let orderBy = 'total_points';
    if (type === 'level') orderBy = 'current_level';
    if (type === 'games') orderBy = 'games_played_total';

    const { data, error } = await supabase
      .from('user_levels')
      .select('username, current_level, total_points, games_played_total')
      .order(orderBy, { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data || [];
  }
}

export default DropPointsService;
