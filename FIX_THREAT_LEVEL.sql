-- ============================================
-- 🔥 FIX THREAT LEVEL CHECK CONSTRAINT
-- ============================================
-- Run this in Supabase SQL Editor

-- Step 1: Drop the problematic check constraint
ALTER TABLE game_audit_log DROP CONSTRAINT IF EXISTS game_audit_log_threat_level_check;

-- Step 2: Check what other constraints might exist and drop them
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'game_audit_log'::regclass AND contype = 'c')
    LOOP
        EXECUTE 'ALTER TABLE game_audit_log DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Step 3: Update existing data to use consistent values
UPDATE game_audit_log SET threat_level = UPPER(COALESCE(threat_level, 'LOW'));

-- Step 4: Recreate the function with UPPERCASE threat levels
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
    v_threat_level TEXT := 'LOW';  -- UPPERCASE!
    v_suspicious BOOLEAN := FALSE;
    v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get user from JWT
    BEGIN
        v_user_id := auth.uid();
        v_email := auth.jwt() ->> 'email';
        v_username := COALESCE(
            auth.jwt() -> 'user_metadata' ->> 'username',
            auth.jwt() -> 'user_metadata' ->> 'full_name',
            SPLIT_PART(COALESCE(v_email, 'unknown@unknown.com'), '@', 1)
        );
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
        v_email := NULL;
        v_username := NULL;
    END;
    
    -- Fallback
    IF v_user_id IS NULL OR v_email IS NULL THEN
        v_username := COALESCE(v_username, 'ANONYMOUS_PLAYER');
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
    
    -- Threat level (UPPERCASE!)
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

-- Step 5: Test it
DO $$
DECLARE
    test_result JSONB;
BEGIN
    SELECT frontend_log_game_completion(
        'THREAT_LEVEL_FIX_TEST',
        'practice',
        500,
        85.0,
        200.0,
        30,
        '{"test": "threat_level_fix"}'::jsonb
    ) INTO test_result;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ THREAT LEVEL FIX TEST RESULT:';
    RAISE NOTICE '%', test_result;
    RAISE NOTICE '========================================';
END $$;

-- Step 6: Verify
SELECT 
    '✅ FIX COMPLETE!' as status,
    (SELECT COUNT(*) FROM game_audit_log) as total_logs,
    (SELECT COUNT(*) FROM game_audit_log WHERE created_at > NOW() - INTERVAL '1 minute') as new_logs,
    (SELECT threat_level FROM game_audit_log ORDER BY created_at DESC LIMIT 1) as last_threat_level;

