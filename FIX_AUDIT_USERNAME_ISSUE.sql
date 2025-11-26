-- ============================================================================
-- FIX AUDIT LOGGING - USERNAME RETRIEVAL ISSUE
-- ============================================================================
-- Problem: frontend_log_game_completion is failing because it tries to query
-- username from auth.users, but Supabase stores it in user_profiles table
-- ============================================================================

-- Fix the frontend_log_game_completion function to get username correctly
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
    v_cheat_score NUMERIC;
    v_score_rating NUMERIC;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get username from user_profiles (FIXED: was trying auth.users)
    SELECT username INTO v_username 
    FROM public.user_profiles 
    WHERE id = v_user_id;
    
    -- Get email from auth.users
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = v_user_id;
    
    -- If no username in profiles, use email prefix as fallback
    IF v_username IS NULL AND v_email IS NOT NULL THEN
        v_username := split_part(v_email, '@', 1);
    END IF;
    
    -- Call the main logging function
    SELECT log_game_play(
        v_user_id, 
        p_game_type, 
        p_game_mode, 
        gen_random_uuid(),
        p_score, 
        p_accuracy, 
        p_reaction_time, 
        p_duration_seconds, 
        p_additional_data
    ) INTO v_audit_id;
    
    -- Get the calculated scores
    SELECT cheat_score, score_rating 
    INTO v_cheat_score, v_score_rating
    FROM public.game_audit_log 
    WHERE id = v_audit_id;
    
    -- Return success with audit details
    RETURN jsonb_build_object(
        'success', true,
        'audit_id', v_audit_id,
        'cheat_score', COALESCE(v_cheat_score, 0),
        'score_rating', COALESCE(v_score_rating, 0),
        'message', 'Game logged successfully'
    );
END;
$$;

-- Also fix log_game_play function to get username correctly
CREATE OR REPLACE FUNCTION log_game_play(
    p_user_id UUID,
    p_game_type TEXT,
    p_game_mode TEXT,
    p_session_id UUID,
    p_score INTEGER,
    p_accuracy NUMERIC DEFAULT NULL,
    p_reaction_time NUMERIC DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audit_id UUID;
    v_username TEXT;
    v_email TEXT;
    v_game_cheat_check JSONB;
    v_is_suspicious BOOLEAN := FALSE;
    v_suspicious_reasons TEXT[] := '{}';
    v_cheat_score NUMERIC := 0;
    v_threat_level TEXT := 'NONE';
    v_max_score INTEGER := 10000;  -- Reasonable default
    v_score_rating NUMERIC;
BEGIN
    -- Get username from user_profiles (FIXED: was trying auth.users.username)
    SELECT username INTO v_username 
    FROM public.user_profiles 
    WHERE id = p_user_id;
    
    -- Get email from auth.users
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = p_user_id;
    
    -- If no username, use email prefix as fallback
    IF v_username IS NULL AND v_email IS NOT NULL THEN
        v_username := split_part(v_email, '@', 1);
    END IF;
    
    -- Calculate score rating (0-10 scale)
    v_score_rating := ROUND((p_score::NUMERIC / v_max_score) * 10, 1);
    v_score_rating := LEAST(v_score_rating, 10.0);
    
    -- Detect cheating
    v_game_cheat_check := detect_game_specific_cheating(
        p_game_type, p_score, p_accuracy, p_reaction_time, p_duration_seconds
    );
    
    IF (v_game_cheat_check->>'suspicious')::BOOLEAN THEN
        v_is_suspicious := TRUE;
        v_cheat_score := (v_game_cheat_check->>'cheat_score')::NUMERIC;
        SELECT array_agg(value::TEXT) INTO v_suspicious_reasons
        FROM jsonb_array_elements_text(v_game_cheat_check->'reasons');
    END IF;
    
    -- Calculate threat level based on cheat score
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
    
    -- Insert audit log
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
        additional_data
    ) VALUES (
        p_user_id, 
        COALESCE(v_username, 'Unknown'), 
        COALESCE(v_email, 'unknown@example.com'), 
        p_game_type, 
        p_game_mode, 
        p_session_id,
        p_score, 
        v_score_rating, 
        v_max_score, 
        p_accuracy, 
        p_reaction_time,
        p_duration_seconds, 
        inet_client_addr(), 
        v_is_suspicious, 
        v_suspicious_reasons,
        v_cheat_score, 
        v_threat_level, 
        p_additional_data
    ) RETURNING id INTO v_audit_id;
    
    -- Check for suspicious patterns
    PERFORM detect_suspicious_patterns(v_audit_id, p_user_id, p_game_type, p_score);
    
    -- Notify admin for high scores
    IF v_score_rating >= 7.0 THEN
        PERFORM notify_admin_high_score(
            p_user_id, 
            COALESCE(v_username, 'Player'), 
            p_game_type, 
            p_score, 
            v_max_score
        );
    END IF;
    
    RETURN v_audit_id;
END;
$$;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ AUDIT USERNAME FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed issues:';
    RAISE NOTICE '1. frontend_log_game_completion now gets username from user_profiles';
    RAISE NOTICE '2. log_game_play now gets username from user_profiles';
    RAISE NOTICE '3. Added fallback to use email prefix if no username';
    RAISE NOTICE '4. Added COALESCE to prevent NULL values';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Play a game and check console for audit messages!';
    RAISE NOTICE '';
END $$;

