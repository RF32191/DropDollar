-- ============================================
-- 🔧 SIMPLE FIX: Add Missing flags Column
-- ============================================
-- Run this in Supabase SQL Editor
-- This is safe to run multiple times
-- ============================================

-- Step 1: Add the missing columns
ALTER TABLE public.game_audit_log 
ADD COLUMN IF NOT EXISTS flags TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.game_audit_log 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

ALTER TABLE public.game_audit_log 
ADD COLUMN IF NOT EXISTS reaction_time_ms NUMERIC DEFAULT 0;

-- Step 2: Drop and recreate the function with correct signature
DROP FUNCTION IF EXISTS frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB);
DROP FUNCTION IF EXISTS frontend_log_game_completion(TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION frontend_log_game_completion(
    p_game_type TEXT,
    p_game_mode TEXT,
    p_score NUMERIC,
    p_accuracy NUMERIC DEFAULT NULL,
    p_reaction_time NUMERIC DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_username TEXT;
    v_audit_id UUID;
    v_cheat_score INTEGER := 0;
    v_score_rating NUMERIC;
    v_threat_level TEXT := 'LOW';
    v_flags TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get user from auth context
    v_user_id := auth.uid();
    
    -- Get username with multiple fallback methods
    IF v_user_id IS NOT NULL THEN
        -- Try public.users table first
        SELECT COALESCE(username, email, 'player_' || LEFT(v_user_id::TEXT, 8))
        INTO v_username
        FROM public.users
        WHERE id = v_user_id;
        
        -- If still null, try auth.users
        IF v_username IS NULL THEN
            SELECT COALESCE(email, 'player_' || LEFT(v_user_id::TEXT, 8))
            INTO v_username
            FROM auth.users
            WHERE id = v_user_id;
        END IF;
    END IF;

    IF v_username IS NULL THEN
        v_username := 'ANONYMOUS';
    END IF;

    -- Simple cheat detection
    IF p_score > 10000 AND p_game_mode = 'practice' THEN
        v_cheat_score := 1;
        v_threat_level := 'HIGH';
        v_flags := array_append(v_flags, 'HIGH_SCORE_ANOMALY');
    ELSIF p_accuracy IS NOT NULL AND p_accuracy > 99.9 AND p_reaction_time IS NOT NULL AND p_reaction_time < 50 THEN
        v_cheat_score := 1;
        v_threat_level := 'CRITICAL';
        v_flags := array_append(v_flags, 'IMPOSSIBLE_STATS');
    END IF;

    -- Calculate score rating (1-10 scale)
    v_score_rating := LEAST(10.0, GREATEST(1.0, ROUND((p_score / 1000.0) * (1.0 - v_cheat_score), 1)));
    
    -- Ensure threat_level is always uppercase
    v_threat_level := UPPER(v_threat_level);

    -- Insert into game_audit_log
    INSERT INTO public.game_audit_log (
        user_id,
        username,
        game_type,
        game_mode,
        score,
        accuracy,
        reaction_time_ms,
        duration_seconds,
        cheat_score,
        score_rating,
        threat_level,
        additional_data,
        flags,
        metadata
    )
    VALUES (
        v_user_id,
        v_username,
        p_game_type,
        p_game_mode,
        p_score,
        p_accuracy,
        p_reaction_time,
        p_duration_seconds,
        v_cheat_score,
        v_score_rating,
        v_threat_level,
        p_additional_data,
        v_flags,
        '{}'::JSONB
    )
    RETURNING id INTO v_audit_id;

    -- Return success
    RETURN jsonb_build_object(
        'success', TRUE,
        'audit_id', v_audit_id,
        'cheat_score', v_cheat_score,
        'score_rating', v_score_rating,
        'threat_level', v_threat_level,
        'message', 'Game logged successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to log game for user %: %', v_user_id, SQLERRM;
        RETURN jsonb_build_object(
            'success', FALSE,
            'audit_id', NULL,
            'cheat_score', NULL,
            'score_rating', NULL,
            'threat_level', 'UNKNOWN',
            'message', 'Failed to log game: ' || SQLERRM
        );
END;
$$;

-- Step 3: Verify it worked
SELECT 
    '✅ COLUMNS ADDED!' as status,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'game_audit_log' 
AND column_name IN ('flags', 'metadata', 'reaction_time_ms');

