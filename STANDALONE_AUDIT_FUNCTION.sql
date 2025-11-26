-- ============================================================================
-- STANDALONE AUDIT FUNCTION - No Dependencies
-- ============================================================================
-- This version doesn't call any helper functions
-- It does everything inline so we can see where it fails
-- ============================================================================

CREATE OR REPLACE FUNCTION frontend_log_game_completion_standalone(
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
AS $$
DECLARE
    v_audit_id UUID;
    v_user_id UUID;
    v_username TEXT;
    v_email TEXT;
    v_score_rating NUMERIC;
    v_cheat_score NUMERIC := 0;
    v_threat_level TEXT := 'NONE';
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get email and username
    SELECT 
        email,
        COALESCE(
            raw_user_meta_data->>'username',
            raw_user_meta_data->>'user_name',
            split_part(email, '@', 1)
        )
    INTO v_email, v_username
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Calculate score rating (simple 0-10 scale)
    v_score_rating := ROUND((p_score::NUMERIC / 10000.0) * 10, 1);
    v_score_rating := LEAST(v_score_rating, 10.0);
    
    -- Simple cheat detection
    IF p_accuracy > 95 THEN
        v_cheat_score := v_cheat_score + 20;
    END IF;
    
    IF p_reaction_time IS NOT NULL AND p_reaction_time < 0.1 THEN
        v_cheat_score := v_cheat_score + 30;
    END IF;
    
    -- Determine threat level
    IF v_cheat_score >= 80 THEN
        v_threat_level := 'CRITICAL';
    ELSIF v_cheat_score >= 60 THEN
        v_threat_level := 'HIGH';
    ELSIF v_cheat_score >= 40 THEN
        v_threat_level := 'MEDIUM';
    ELSIF v_cheat_score >= 20 THEN
        v_threat_level := 'LOW';
    ELSE
        v_threat_level := 'NONE';
    END IF;
    
    -- Insert directly into game_audit_log
    INSERT INTO public.game_audit_log (
        user_id,
        username,
        email,
        game_type,
        game_mode,
        session_id,
        score,
        score_rating,
        max_score,
        accuracy,
        reaction_time,
        duration_seconds,
        ip_address,
        suspicious,
        suspicious_reasons,
        cheat_score,
        threat_level,
        additional_data,
        created_at
    ) VALUES (
        v_user_id,
        COALESCE(v_username, 'Unknown'),
        COALESCE(v_email, 'unknown@example.com'),
        p_game_type,
        p_game_mode,
        gen_random_uuid(),
        p_score,
        v_score_rating,
        10000,
        p_accuracy,
        p_reaction_time,
        p_duration_seconds,
        inet_client_addr(),
        (v_cheat_score > 0),
        ARRAY[]::TEXT[],
        v_cheat_score,
        v_threat_level,
        p_additional_data,
        NOW()
    ) RETURNING id INTO v_audit_id;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'audit_id', v_audit_id,
        'cheat_score', v_cheat_score,
        'score_rating', v_score_rating,
        'message', 'Game logged successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

-- Test it immediately
SELECT frontend_log_game_completion_standalone(
    'standalone_test',
    'practice',
    2222,
    77.7,
    0.5,
    60,
    '{"test": "standalone", "version": 2}'::jsonb
) as result;

-- Check if it was created
SELECT 
    game_type,
    score,
    username,
    cheat_score,
    threat_level,
    created_at
FROM game_audit_log
WHERE game_type = 'standalone_test'
ORDER BY created_at DESC
LIMIT 1;

-- Count total logs
SELECT COUNT(*) as total_logs FROM game_audit_log;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ STANDALONE FUNCTION CREATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Check the results above:';
    RAISE NOTICE '1. First result should show success=true';
    RAISE NOTICE '2. Second result should show standalone_test record';
    RAISE NOTICE '3. Third result should show count increased by 1';
    RAISE NOTICE '';
    RAISE NOTICE 'If this works: Backend is functional!';
    RAISE NOTICE 'If this fails: Send me the error from result column';
    RAISE NOTICE '';
END $$;

