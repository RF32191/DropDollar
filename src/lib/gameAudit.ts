/**
 * Game Audit System
 * 
 * Automatically logs all game plays to admin audit system.
 * Required for fair skill-based gaming compliance.
 * 
 * This is integrated into every game just like RNG seeding.
 * 
 * @version 8.0.0 - All games updated with cache busters
 * @lastUpdated 2025-11-27 @ 7:00 PM EST
 * @deploymentId v8-all-games
 */

// 🔥🔥🔥 CACHE BUSTER - BUILD 20251127-V8 🔥🔥🔥
console.log('');
console.log('🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐');
console.log('🔐 GAME AUDIT SYSTEM v8.0 - BUILD 20251127-1900');
console.log('🔐 If you see this, AUDIT CODE IS RUNNING!');
console.log('🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐');
console.log('');

// Use the SHARED Supabase client that has the user's session
import { supabase } from '@/lib/supabase/client';

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
  console.log('');
  console.log('========================================');
  console.log('🎮 GAME AUDIT LOGGING STARTED');
  console.log('========================================');
  console.log('🎮 Attempting to log game:', {
    game: data.gameType,
    mode: data.gameMode,
    score: data.score
  });
  console.log('📊 Full data:', data);
  
  try {
    // Use SHARED supabase client (imported at top) - has the auth session
    console.log('📡 Using shared Supabase client...');
    
    // Try multiple methods to get the user
    let user = null;
    let userEmail = 'unknown';
    let userId = null;
    
    // Method 1: getUser()
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      user = userData.user;
      userEmail = user.email || 'unknown';
      userId = user.id;
      console.log('✅ Method 1 (getUser) SUCCESS:', userEmail);
    } else {
      console.log('⚠️ Method 1 (getUser) failed, trying getSession...');
      
      // Method 2: getSession()
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        user = sessionData.session.user;
        userEmail = user.email || 'unknown';
        userId = user.id;
        console.log('✅ Method 2 (getSession) SUCCESS:', userEmail);
      } else {
        console.log('⚠️ Method 2 (getSession) failed, checking localStorage...');
        
        // Method 3: Check localStorage directly
        if (typeof window !== 'undefined') {
          const storedAuth = localStorage.getItem('dropdollar-auth-token');
          if (storedAuth) {
            try {
              const parsed = JSON.parse(storedAuth);
              if (parsed?.user) {
                userEmail = parsed.user.email || 'unknown';
                userId = parsed.user.id;
                console.log('✅ Method 3 (localStorage) SUCCESS:', userEmail);
              }
            } catch (e) {
              console.log('⚠️ Method 3 (localStorage) parse error');
            }
          }
        }
      }
    }
    
    // If still no user, log anyway with anonymous
    if (!userId) {
      console.warn('⚠️ Game audit: Could not determine user, logging as anonymous');
      userEmail = 'anonymous-player';
    }
    
    console.log('✅ Final user for audit:', userEmail);
    console.log('✅ User ID:', userId || 'anonymous');
    
    // Call backend audit function
    console.log('========================================');
    console.log('📡 CALLING BACKEND RPC FUNCTION');
    console.log('========================================');
    console.log('📡 Function: frontend_log_game_completion');
    console.log('📡 Parameters:', {
      game_type: data.gameType,
      game_mode: data.gameMode,
      score: data.score,
      accuracy: data.accuracy,
      reaction_time: data.reactionTime,
      duration: data.durationSeconds
    });
    // Don't stringify - Supabase handles JSONB conversion automatically
    const { data: result, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: data.gameType,
      p_game_mode: data.gameMode,
      p_score: data.score,
      p_accuracy: data.accuracy ?? null,
      p_reaction_time: data.reactionTime ?? null,
      p_duration_seconds: data.durationSeconds ?? null,
      p_additional_data: data.additionalData ?? null
    });

    if (error) {
      console.log('========================================');
      console.error('❌ BACKEND ERROR OCCURRED');
      console.log('========================================');
      console.error('❌ Game audit error:', error);
      console.error('📋 Error details:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
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

    console.log('========================================');
    console.log('✅ BACKEND SUCCESS - AUDIT LOGGED!');
    console.log('========================================');
    console.log('✅ Game audited successfully:', {
      game: data.gameType,
      score: data.score,
      rating: result?.score_rating,
      cheatScore: result?.cheat_score,
      auditId: result?.audit_id
    });
    console.log('📊 Full result from backend:', result);
    console.log('========================================');

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
  PENNY_PASSER: 'penny_passer',
  COIN_SORTER: 'coin_sorter',
  FALLING_OBJECT: 'falling_object',
  DEAD_SHOT: 'dead_shot',
  LIGHTNING_MAZE: 'lightning_maze',
  FLAPPY_COIN: 'flappy_coin',
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

