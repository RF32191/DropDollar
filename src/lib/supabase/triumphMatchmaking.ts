'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface MatchResult {
  id: string;
  user_id: string;
  opponent_id?: string;
  game_type: string;
  user_score: number;
  opponent_score?: number;
  user_accuracy: number;
  opponent_accuracy?: number;
  tokens_wagered: number;
  tokens_won: number;
  match_status: 'waiting' | 'completed' | 'forfeited';
  created_at: string;
  completed_at?: string;
}

export interface OpponentInfo {
  id: string;
  username: string;
  avatar_url?: string;
  skill_level: number;
  games_played: number;
  win_rate: number;
}

export class TriumphMatchmakingService {
  /**
   * Find or create a match for the user
   */
  static async findMatch(
    userId: string, 
    gameType: string, 
    entryFee: number = 1
  ): Promise<MatchResult | null> {
    try {
      console.log('🎯 [Matchmaking] Finding match for user:', userId, 'game:', gameType);
      
      // First, try to find an existing waiting match
      const { data: existingMatch, error: findError } = await supabase
        .from('matches')
        .select('*')
        .eq('game_type', gameType)
        .eq('match_status', 'waiting')
        .neq('user_id', userId)
        .eq('tokens_wagered', entryFee)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (existingMatch && !findError) {
        // Join existing match
        const { data: updatedMatch, error: updateError } = await supabase
          .from('matches')
          .update({
            opponent_id: userId,
            match_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMatch.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ [Matchmaking] Error joining match:', updateError);
          return null;
        }

        console.log('✅ [Matchmaking] Joined existing match:', updatedMatch.id);
        return updatedMatch;
      }

      // No existing match found, create new one
      const { data: newMatch, error: createError } = await supabase
        .from('matches')
        .insert({
          user_id: userId,
          game_type: gameType,
          tokens_wagered: entryFee,
          match_status: 'waiting',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ [Matchmaking] Error creating match:', createError);
        return null;
      }

      console.log('✅ [Matchmaking] Created new match:', newMatch.id);
      return newMatch;
    } catch (error) {
      console.error('❌ [Matchmaking] Error in findMatch:', error);
      return null;
    }
  }

  /**
   * Get opponent information
   */
  static async getOpponentInfo(opponentId: string): Promise<OpponentInfo | null> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', opponentId)
        .single();

      if (error || !profile) {
        console.error('❌ [Matchmaking] Error getting opponent profile:', error);
        return null;
      }

      // Get opponent stats
      const { data: stats, error: statsError } = await supabase
        .from('user_game_stats')
        .select('total_games_played, win_rate')
        .eq('user_id', opponentId)
        .single();

      return {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        skill_level: stats?.win_rate || 50,
        games_played: stats?.total_games_played || 0,
        win_rate: stats?.win_rate || 50
      };
    } catch (error) {
      console.error('❌ [Matchmaking] Error getting opponent info:', error);
      return null;
    }
  }

  /**
   * Complete a match with results
   */
  static async completeMatch(
    matchId: string,
    userScore: number,
    userAccuracy: number,
    opponentScore?: number,
    opponentAccuracy?: number
  ): Promise<MatchResult | null> {
    try {
      console.log('🏁 [Matchmaking] Completing match:', matchId);
      
      const isWinner = !opponentScore || userScore > opponentScore;
      const tokensWon = isWinner ? 2 : 0; // Winner gets double the entry fee
      
      const { data: completedMatch, error } = await supabase
        .from('matches')
        .update({
          user_score: userScore,
          user_accuracy: userAccuracy,
          opponent_score: opponentScore,
          opponent_accuracy: opponentAccuracy,
          tokens_won: tokensWon,
          match_status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) {
        console.error('❌ [Matchmaking] Error completing match:', error);
        return null;
      }

      console.log('✅ [Matchmaking] Match completed:', completedMatch.id);
      return completedMatch;
    } catch (error) {
      console.error('❌ [Matchmaking] Error in completeMatch:', error);
      return null;
    }
  }

  /**
   * Get user's match history
   */
  static async getUserMatchHistory(userId: string): Promise<MatchResult[]> {
    try {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq('match_status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ [Matchmaking] Error getting match history:', error);
        return [];
      }

      return matches || [];
    } catch (error) {
      console.error('❌ [Matchmaking] Error in getUserMatchHistory:', error);
      return [];
    }
  }

  /**
   * Check if user is currently in a match
   */
  static async getCurrentMatch(userId: string): Promise<MatchResult | null> {
    try {
      const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user_id.eq.${userId},opponent_id.eq.${userId}`)
        .in('match_status', ['waiting', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return null; // No current match
      }

      return match;
    } catch (error) {
      console.error('❌ [Matchmaking] Error getting current match:', error);
      return null;
    }
  }
}
