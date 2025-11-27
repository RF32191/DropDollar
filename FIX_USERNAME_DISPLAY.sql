-- ============================================
-- 🔥 FIX USERNAME DISPLAY IN AUDIT LOGS
-- ============================================
-- Run this in Supabase SQL Editor

-- Update the function to get username from the users table
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
    -- Get user ID and email from JWT
    v_user_id := auth.uid();
    v_email := auth.jwt() ->> 'email';
    
    -- Try to get username from users table first (most reliable)
    IF v_user_id IS NOT NULL THEN
        SELECT username INTO v_username
        FROM public.users
        WHERE id = v_user_id;
    END IF;
    
    -- Fallback: try JWT metadata
    IF v_username IS NULL OR v_username = '' THEN
        v_username := auth.jwt() -> 'user_metadata' ->> 'username';
    END IF;
    
    -- Fallback: try full_name from metadata
    IF v_username IS NULL OR v_username = '' THEN
        v_username := auth.jwt() -> 'user_metadata' ->> 'full_name';
    END IF;
    
    -- Fallback: use email prefix
    IF v_username IS NULL OR v_username = '' THEN
        v_username := SPLIT_PART(COALESCE(v_email, 'unknown@unknown.com'), '@', 1);
    END IF;
    
    -- Final fallback for anonymous
    IF v_user_id IS NULL THEN
        v_username := COALESCE(v_username, 'ANONYMOUS');
        v_email := COALESCE(v_email, 'anonymous@dropdollar.com');
    END IF;
    
    -- Score rating (1-10)
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
    
    -- Cheat detection
    IF p_accuracy IS NOT NULL AND p_accuracy > 100 THEN
        v_cheat_score := v_cheat_score + 3;
        v_reasons := array_append(v_reasons, 'impossible_accuracy');
        v_suspicious := TRUE;
    END IF;
    
    IF p_reaction_time IS NOT NULL AND p_reaction_time < 50 THEN
        v_cheat_score := v_cheat_score + 5;
        v_reasons := array_append(v_reasons, 'superhuman_reaction');
        v_suspicious := TRUE;
    END IF;
    
    IF p_score > 5000 THEN
        v_cheat_score := v_cheat_score + 2;
        v_reasons := array_append(v_reasons, 'unusually_high_score');
    END IF;
    
    -- Threat level (UPPERCASE)
    v_threat_level := CASE
        WHEN v_cheat_score >= 5 THEN 'HIGH'
        WHEN v_cheat_score >= 3 THEN 'MEDIUM'
        ELSE 'LOW'
    END;
    
    -- Insert
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
    
    RETURN jsonb_build_object(
        'success', true,
        'audit_id', v_audit_id,
        'score_rating', v_score_rating,
        'cheat_score', v_cheat_score,
        'threat_level', v_threat_level,
        'username', v_username,
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

-- Test it
DO $$
DECLARE
    test_result JSONB;
BEGIN
    SELECT frontend_log_game_completion(
        'USERNAME_FIX_TEST',
        'practice',
        750,
        92.0,
        180.0,
        45,
        '{"test": "username_fix"}'::jsonb
    ) INTO test_result;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ USERNAME FIX TEST RESULT:';
    RAISE NOTICE '%', test_result;
    RAISE NOTICE '========================================';
END $$;

-- Show results
SELECT 
    '✅ USERNAME FIX COMPLETE!' as status,
    username,
    email,
    game_type,
    score
FROM game_audit_log
ORDER BY created_at DESC
LIMIT 3;

