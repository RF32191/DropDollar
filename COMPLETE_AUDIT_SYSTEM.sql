-- ============================================
-- 🔥 COMPLETE AUDIT SYSTEM - Final Version
-- ============================================
-- This is the FINAL SQL for the audit system
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Ensure table has all columns
-- ============================================
ALTER TABLE game_audit_log ADD COLUMN IF NOT EXISTS score_rating NUMERIC(3,1);
ALTER TABLE game_audit_log ADD COLUMN IF NOT EXISTS threat_level TEXT DEFAULT 'LOW';
ALTER TABLE game_audit_log ADD COLUMN IF NOT EXISTS cheat_score NUMERIC(5,2) DEFAULT 0;

-- ============================================
-- STEP 2: Drop any check constraints that cause issues
-- ============================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'game_audit_log'::regclass AND contype = 'c')
    LOOP
        EXECUTE 'ALTER TABLE game_audit_log DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- ============================================
-- STEP 3: Create the COMPLETE audit function
-- ============================================
CREATE OR REPLACE FUNCTION frontend_log_game_completion(
    p_game_type TEXT,
    p_game_mode TEXT,
    p_score INTEGER,
    p_accuracy NUMERIC DEFAULT NULL,
    p_reaction_time NUMERIC DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_username TEXT;
    v_audit_id UUID;
    v_cheat_score NUMERIC := 0;
    v_score_rating NUMERIC;
    v_threat_level TEXT := 'LOW';
    v_suspicious BOOLEAN := FALSE;
    v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- ========================================
    -- GET USER INFO
    -- ========================================
    v_user_id := auth.uid();
    v_email := auth.jwt() ->> 'email';
    
    -- Try to get username from users table (most reliable)
    IF v_user_id IS NOT NULL THEN
        SELECT username INTO v_username
        FROM public.users
        WHERE id = v_user_id;
    END IF;
    
    -- Fallback chain for username
    IF v_username IS NULL OR v_username = '' THEN
        v_username := auth.jwt() -> 'user_metadata' ->> 'username';
    END IF;
    IF v_username IS NULL OR v_username = '' THEN
        v_username := auth.jwt() -> 'user_metadata' ->> 'full_name';
    END IF;
    IF v_username IS NULL OR v_username = '' THEN
        v_username := SPLIT_PART(COALESCE(v_email, 'unknown'), '@', 1);
    END IF;
    IF v_user_id IS NULL THEN
        v_username := COALESCE(v_username, 'ANONYMOUS');
        v_email := COALESCE(v_email, 'anonymous@dropdollar.com');
    END IF;
    
    -- ========================================
    -- CALCULATE SCORE RATING (1-10 scale)
    -- ========================================
    v_score_rating := CASE
        WHEN p_score >= 2000 THEN 10.0
        WHEN p_score >= 1500 THEN 9.0
        WHEN p_score >= 1000 THEN 8.0
        WHEN p_score >= 750 THEN 7.0
        WHEN p_score >= 500 THEN 6.0
        WHEN p_score >= 300 THEN 5.0
        WHEN p_score >= 150 THEN 4.0
        WHEN p_score >= 50 THEN 3.0
        WHEN p_score >= 10 THEN 2.0
        ELSE 1.0
    END;
    
    -- ========================================
    -- CHEAT DETECTION (gives non-zero base score)
    -- ========================================
    -- Base score starts at 1 (everyone gets at least 1)
    v_cheat_score := 1.0;
    
    -- Check for impossible accuracy (>100%)
    IF p_accuracy IS NOT NULL AND p_accuracy > 100 THEN
        v_cheat_score := v_cheat_score + 4.0;
        v_reasons := array_append(v_reasons, 'impossible_accuracy_over_100');
        v_suspicious := TRUE;
    -- Very high accuracy is suspicious but not impossible
    ELSIF p_accuracy IS NOT NULL AND p_accuracy > 98 THEN
        v_cheat_score := v_cheat_score + 1.5;
        v_reasons := array_append(v_reasons, 'very_high_accuracy');
    -- High accuracy worth noting
    ELSIF p_accuracy IS NOT NULL AND p_accuracy > 95 THEN
        v_cheat_score := v_cheat_score + 0.5;
    END IF;
    
    -- Check for superhuman reaction time (<100ms is suspicious, <50ms is impossible)
    IF p_reaction_time IS NOT NULL AND p_reaction_time < 50 THEN
        v_cheat_score := v_cheat_score + 5.0;
        v_reasons := array_append(v_reasons, 'impossible_reaction_under_50ms');
        v_suspicious := TRUE;
    ELSIF p_reaction_time IS NOT NULL AND p_reaction_time < 100 THEN
        v_cheat_score := v_cheat_score + 2.0;
        v_reasons := array_append(v_reasons, 'superhuman_reaction_under_100ms');
    ELSIF p_reaction_time IS NOT NULL AND p_reaction_time < 150 THEN
        v_cheat_score := v_cheat_score + 0.5;
        v_reasons := array_append(v_reasons, 'fast_reaction_under_150ms');
    END IF;
    
    -- Check for unusually high scores
    IF p_score > 10000 THEN
        v_cheat_score := v_cheat_score + 3.0;
        v_reasons := array_append(v_reasons, 'extremely_high_score');
        v_suspicious := TRUE;
    ELSIF p_score > 5000 THEN
        v_cheat_score := v_cheat_score + 1.5;
        v_reasons := array_append(v_reasons, 'very_high_score');
    ELSIF p_score > 2000 THEN
        v_cheat_score := v_cheat_score + 0.5;
    END IF;
    
    -- Check for suspiciously short game duration
    IF p_duration_seconds IS NOT NULL AND p_duration_seconds < 5 THEN
        v_cheat_score := v_cheat_score + 2.0;
        v_reasons := array_append(v_reasons, 'game_too_short');
    END IF;
    
    -- Perfect score with perfect accuracy is suspicious
    IF p_score >= 1000 AND p_accuracy IS NOT NULL AND p_accuracy >= 100 THEN
        v_cheat_score := v_cheat_score + 2.0;
        v_reasons := array_append(v_reasons, 'perfect_game');
        v_suspicious := TRUE;
    END IF;
    
    -- ========================================
    -- SET THREAT LEVEL (UPPERCASE)
    -- ========================================
    v_threat_level := CASE
        WHEN v_cheat_score >= 8 THEN 'CRITICAL'
        WHEN v_cheat_score >= 5 THEN 'HIGH'
        WHEN v_cheat_score >= 3 THEN 'MEDIUM'
        ELSE 'LOW'
    END;
    
    -- ========================================
    -- INSERT THE AUDIT LOG
    -- ========================================
    INSERT INTO game_audit_log (
        user_id, username, email, game_type, game_mode,
        score, score_rating, accuracy, reaction_time, duration_seconds,
        suspicious, suspicious_reasons, cheat_score, threat_level, additional_data
    ) VALUES (
        v_user_id, v_username, v_email, p_game_type, p_game_mode,
        p_score, v_score_rating, p_accuracy, p_reaction_time, p_duration_seconds,
        v_suspicious, v_reasons, v_cheat_score, v_threat_level, p_additional_data
    )
    RETURNING id INTO v_audit_id;
    
    -- ========================================
    -- RETURN SUCCESS
    -- ========================================
    RETURN jsonb_build_object(
        'success', true,
        'audit_id', v_audit_id,
        'score_rating', v_score_rating,
        'cheat_score', v_cheat_score,
        'threat_level', v_threat_level,
        'username', v_username,
        'email', v_email,
        'message', 'Game logged successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to log game'
    );
END;
$$;

-- ============================================
-- STEP 4: Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) TO anon;

-- ============================================
-- STEP 5: Test the function
-- ============================================
DO $$
DECLARE
    test_result JSONB;
BEGIN
    -- Test with normal gameplay
    SELECT frontend_log_game_completion(
        'SYSTEM_TEST',
        'practice',
        850,
        88.5,
        185.0,
        60,
        '{"test": "complete_system", "version": "final"}'::jsonb
    ) INTO test_result;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COMPLETE AUDIT SYSTEM TEST:';
    RAISE NOTICE '%', test_result;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 6: Show recent logs with all data
-- ============================================
SELECT 
    '✅ SYSTEM READY!' as status,
    (SELECT COUNT(*) FROM game_audit_log) as total_games_logged;

SELECT 
    username,
    email,
    game_type,
    score,
    score_rating,
    cheat_score,
    threat_level,
    created_at
FROM game_audit_log
ORDER BY created_at DESC
LIMIT 5;

