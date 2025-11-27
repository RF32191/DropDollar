-- ============================================
-- 🔧 FIX SCORE TYPE - Accept Decimal Scores
-- ============================================
-- The error: "invalid input syntax for type integer: 708.63"
-- The fix: Change p_score from INTEGER to NUMERIC
-- ============================================

-- Drop the old function
DROP FUNCTION IF EXISTS frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB);
DROP FUNCTION IF EXISTS frontend_log_game_completion(TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, INTEGER, JSONB);

-- Recreate with NUMERIC score type
CREATE OR REPLACE FUNCTION frontend_log_game_completion(
    p_game_type TEXT,
    p_game_mode TEXT,
    p_score NUMERIC,  -- Changed from INTEGER to NUMERIC
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
        
        -- If still null, try JWT metadata
        IF v_username IS NULL THEN
            v_username := COALESCE(
                auth.jwt() ->> 'email',
                auth.jwt() -> 'user_metadata' ->> 'username',
                auth.jwt() -> 'user_metadata' ->> 'name',
                auth.jwt() -> 'user_metadata' ->> 'full_name',
                'player_' || LEFT(v_user_id::TEXT, 8)
            );
        END IF;
    ELSE
        v_username := 'ANONYMOUS';
    END IF;
    
    -- Calculate score rating (1-10 scale based on game type)
    -- Higher scores = better rating
    v_score_rating := LEAST(10, GREATEST(1, 
        CASE 
            WHEN p_game_type = 'quick_click' THEN (COALESCE(p_score, 0) / 100.0)
            WHEN p_game_type = 'sword_parry' THEN (COALESCE(p_score, 0) / 500.0)
            WHEN p_game_type = 'laser_dodge' THEN (COALESCE(p_score, 0) / 200.0)
            WHEN p_game_type = 'cash_stack' THEN (COALESCE(p_score, 0) / 300.0)
            WHEN p_game_type = 'blade_bounce' THEN (COALESCE(p_score, 0) / 400.0)
            WHEN p_game_type = 'multi_target' THEN (COALESCE(p_score, 0) / 150.0)
            WHEN p_game_type = 'color_sequence' THEN (COALESCE(p_score, 0) / 100.0)
            WHEN p_game_type = 'falling_object' THEN (COALESCE(p_score, 0) / 200.0)
            ELSE (COALESCE(p_score, 0) / 100.0)
        END
    ));
    
    -- Cheat detection (basic)
    -- Check for impossible scores
    IF p_score > 10000 THEN
        v_cheat_score := v_cheat_score + 3;
        v_flags := array_append(v_flags, 'IMPOSSIBLE_SCORE');
    END IF;
    
    -- Check for perfect accuracy in skill games
    IF p_accuracy = 100 AND p_score > 1000 THEN
        v_cheat_score := v_cheat_score + 2;
        v_flags := array_append(v_flags, 'PERFECT_ACCURACY_HIGH_SCORE');
    END IF;
    
    -- Check for inhuman reaction times
    IF p_reaction_time IS NOT NULL AND p_reaction_time < 100 THEN
        v_cheat_score := v_cheat_score + 2;
        v_flags := array_append(v_flags, 'INHUMAN_REACTION');
    END IF;
    
    -- Check for suspicious game duration
    IF p_duration_seconds IS NOT NULL AND p_duration_seconds < 5 AND p_score > 500 THEN
        v_cheat_score := v_cheat_score + 3;
        v_flags := array_append(v_flags, 'SPEED_HACK_SUSPECTED');
    END IF;
    
    -- Set threat level based on cheat score
    v_threat_level := CASE
        WHEN v_cheat_score >= 6 THEN 'CRITICAL'
        WHEN v_cheat_score >= 4 THEN 'HIGH'
        WHEN v_cheat_score >= 2 THEN 'MEDIUM'
        ELSE 'LOW'
    END;
    
    -- Insert the audit log
    INSERT INTO game_audit_log (
        id,
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
        flags,
        additional_data,
        created_at
    ) VALUES (
        gen_random_uuid(),
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
        v_flags,
        p_additional_data,
        NOW()
    )
    RETURNING id INTO v_audit_id;
    
    -- Notify admin if high threat or high score rating
    IF v_score_rating > 6 OR v_threat_level IN ('HIGH', 'CRITICAL') THEN
        INSERT INTO user_messages (
            user_id,
            subject,
            content,
            message_type,
            created_at
        )
        SELECT 
            u.id,
            CASE 
                WHEN v_threat_level IN ('HIGH', 'CRITICAL') THEN '⚠️ SUSPICIOUS GAME DETECTED'
                ELSE '🎮 High Score Alert'
            END,
            format(
                'Player: %s\nGame: %s\nScore: %s\nRating: %s/10\nThreat: %s\nFlags: %s',
                v_username,
                p_game_type,
                p_score::TEXT,
                ROUND(v_score_rating, 1)::TEXT,
                v_threat_level,
                COALESCE(array_to_string(v_flags, ', '), 'None')
            ),
            'system',
            NOW()
        FROM public.users u
        WHERE u.email = 'rf32191@gmail.com';
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'audit_id', v_audit_id,
        'cheat_score', v_cheat_score,
        'score_rating', v_score_rating,
        'threat_level', v_threat_level,
        'username', v_username
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the game
    RAISE WARNING 'Audit log failed: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to log game but game continues'
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION frontend_log_game_completion(TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION frontend_log_game_completion(TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, INTEGER, JSONB) TO anon;

-- Verify the function signature
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'frontend_log_game_completion';

-- Test with a decimal score
SELECT frontend_log_game_completion(
    'score_type_test',
    'practice',
    708.63,  -- Decimal score that was failing
    85.5,
    250.5,
    60,
    '{"test": "decimal_score"}'::jsonb
);

-- Show recent logs
SELECT 
    username,
    game_type,
    score,
    score_rating,
    threat_level,
    created_at
FROM game_audit_log
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- ✅ EXPECTED OUTPUT:
-- The function should now accept decimal scores
-- The test insert should succeed
-- You should see the test record in the results
-- ============================================

