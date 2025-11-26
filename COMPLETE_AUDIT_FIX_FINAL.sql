-- ============================================================================
-- COMPLETE AUDIT FIX - RLS INSERT POLICY + FIXED FUNCTIONS
-- ============================================================================
-- This fixes EVERYTHING:
-- 1. Adds INSERT policy for RLS
-- 2. Updates main frontend_log_game_completion function
-- 3. Makes it standalone (no dependencies on missing functions)
-- ============================================================================

-- Step 1: Add INSERT policy for game_audit_log
GRANT INSERT ON public.game_audit_log TO authenticated;
GRANT INSERT ON public.game_audit_log TO service_role;

DROP POLICY IF EXISTS "users_can_insert_audit_log" ON public.game_audit_log;

CREATE POLICY "users_can_insert_audit_log"
ON public.game_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 2: Replace frontend_log_game_completion with working version
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
    
    -- Get email and username from auth.users
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
    
    -- Calculate score rating (0-10 scale)
    v_score_rating := ROUND((p_score::NUMERIC / 10000.0) * 10, 1);
    v_score_rating := LEAST(v_score_rating, 10.0);
    
    -- Simple cheat detection
    IF p_accuracy > 95 THEN
        v_cheat_score := v_cheat_score + 20;
    END IF;
    
    IF p_reaction_time IS NOT NULL AND p_reaction_time < 0.1 THEN
        v_cheat_score := v_cheat_score + 30;
    END IF;
    
    IF p_duration_seconds IS NOT NULL AND p_duration_seconds < 10 AND p_score > 1000 THEN
        v_cheat_score := v_cheat_score + 25;
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
    
    -- Insert directly into game_audit_log (RLS now allows this)
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
    
    -- Return success with audit details
    RETURN jsonb_build_object(
        'success', true,
        'audit_id', v_audit_id,
        'cheat_score', v_cheat_score,
        'score_rating', v_score_rating,
        'message', 'Game logged successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error details for debugging
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM,
        'error_code', SQLSTATE,
        'detail', 'Check RLS policies and permissions'
    );
END;
$$;

-- Step 3: Test it
SELECT frontend_log_game_completion(
    'final_fix_test',
    'practice',
    4444,
    92.5,
    0.45,
    65,
    jsonb_build_object('test', 'complete_fix', 'timestamp', NOW()::TEXT)
) as test_result;

-- Step 4: Verify it was inserted
SELECT 
    game_type,
    score,
    username,
    email,
    score_rating,
    cheat_score,
    threat_level,
    created_at
FROM game_audit_log
WHERE game_type = 'final_fix_test'
ORDER BY created_at DESC
LIMIT 1;

-- Step 5: Show total count
SELECT 
    COUNT(*) as total_logs,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes') as recent_logs
FROM game_audit_log;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 COMPLETE AUDIT FIX DEPLOYED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'What was fixed:';
    RAISE NOTICE '1. ✅ Added INSERT policy for authenticated users';
    RAISE NOTICE '2. ✅ Replaced frontend_log_game_completion with working version';
    RAISE NOTICE '3. ✅ No dependencies on missing functions';
    RAISE NOTICE '4. ✅ Proper error handling';
    RAISE NOTICE '5. ✅ Built-in cheat detection';
    RAISE NOTICE '';
    RAISE NOTICE 'Check results above:';
    RAISE NOTICE '- test_result should show success=true';
    RAISE NOTICE '- Should see final_fix_test record';
    RAISE NOTICE '- recent_logs should be > 0';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. If test_result shows success=true: ✅ BACKEND WORKS!';
    RAISE NOTICE '2. Now play a game and check console for 🎯 messages';
    RAISE NOTICE '3. Game should appear in Admin Dashboard → Audit Logs';
    RAISE NOTICE '';
    RAISE NOTICE 'If games still dont log: Frontend code not deployed yet';
    RAISE NOTICE 'Check Vercel deployment status and clear browser cache';
    RAISE NOTICE '';
END $$;

