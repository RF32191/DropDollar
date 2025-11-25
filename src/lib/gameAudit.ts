/**
 * Game Audit System
 * 
 * Automatically logs all game plays to admin audit system.
 * Required for fair skill-based gaming compliance.
 * 
 * This is integrated into every game just like RNG seeding.
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface GameAuditData {
  gameType: string;
  gameMode: string;
  score: number;
  accuracy?: number;
  reactionTime?: number;
  durationSeconds?: number;
  additionalData?: Record<string, any>;
}

/**
 * Log game completion to audit system
 * Called automatically at the end of every game
 * 
 * @param data Game performance data
 * @returns Promise resolving to audit result
 */
export async function logGameCompletion(data: GameAuditData): Promise<{
  success: boolean;
  auditId?: string;
  cheatScore?: number;
  scoreRating?: number;
  message?: string;
}> {
  console.log('🎮 Attempting to log game:', {
    game: data.gameType,
    mode: data.gameMode,
    score: data.score
  });
  
  try {
    const supabase = createClientComponentClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ Game audit: User not authenticated');
      return {
        success: false,
        message: 'User not authenticated'
      };
    }
    
    console.log('✅ User authenticated:', user.email);
    
    // Call backend audit function
    console.log('📡 Calling frontend_log_game_completion...');
    const { data: result, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: data.gameType,
      p_game_mode: data.gameMode,
      p_score: data.score,
      p_accuracy: data.accuracy || null,
      p_reaction_time: data.reactionTime || null,
      p_duration_seconds: data.durationSeconds || null,
      p_additional_data: data.additionalData ? JSON.stringify(data.additionalData) : null
    });

    if (error) {
      console.error('❌ Game audit error:', error);
      console.error('📋 Error details:', {
        message: error.message,
        code: error.code,
        hint: error.hint
      });
      
      // Check if function doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42883') {
        console.error('🚨 FUNCTION DOES NOT EXIST!');
        console.error('📦 You need to deploy the SQL file: DEPLOY_AUDIT_NO_DEADLOCK.sql');
        console.error('🔗 Go to Supabase Dashboard → SQL Editor and run the file');
      }
      
      return {
        success: false,
        message: error.message
      };
    }

    console.log('✅ Game audited successfully:', {
      game: data.gameType,
      score: data.score,
      rating: result?.score_rating,
      cheatScore: result?.cheat_score,
      auditId: result?.audit_id
    });

    return {
      success: true,
      auditId: result?.audit_id,
      cheatScore: result?.cheat_score,
      scoreRating: result?.score_rating,
      message: 'Game logged successfully'
    };
  } catch (err) {
    console.error('❌ Failed to log game:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Game type identifiers for audit system
 * Use these exact strings for consistency
 */
export const GAME_TYPES = {
  LASER_DODGE: 'laser_dodge',
  MULTI_TARGET: 'multi_target_reaction',
  SWORD_PARRY: 'sword_parry',
  QUICK_CLICK: 'quick_click',
  COLOR_SEQUENCE: 'color_sequence',
  BLADE_BOUNCE: 'blade_bounce',
  CASH_STACK: 'cash_stack',
  FALLING_OBJECT: 'falling_object',
  ONE_V_ONE: 'one_v_one',
  WINNER_TAKES_ALL: 'winner_takes_all',
  HOT_SELL: 'hot_sell',
  SUDDEN_DEATH: 'sudden_death'
} as const;

/**
 * Game mode identifiers
 */
export const GAME_MODES = {
  PRACTICE: 'practice',
  ONE_V_ONE: '1v1',
  WINNER_TAKES_ALL: 'wta',
  TOURNAMENT: 'tournament'
} as const;

