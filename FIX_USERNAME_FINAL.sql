-- ============================================
-- 🔥 FIX USERNAME - FINAL VERSION
-- ============================================
-- Run this in Supabase SQL Editor

-- STEP 1: Check what columns exist in the users table
SELECT 'USERS TABLE COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: Check if there's data in users table
SELECT 'SAMPLE USERS:' as info;
SELECT id, email, username 
FROM public.users 
LIMIT 5;

-- STEP 3: Check what the admin user looks like
SELECT 'ADMIN USER:' as info;
SELECT id, email, username 
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- STEP 4: Update the function to try multiple username sources
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
    v_cheat_score NUMERIC := 1.0;
    v_score_rating NUMERIC;
    v_threat_level TEXT := 'LOW';
    v_suspicious BOOLEAN := FALSE;
    v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get user ID and email from JWT
    v_user_id := auth.uid();
    v_email := COALESCE(auth.jwt() ->> 'email', 'unknown@email.com');
    
    -- USERNAME RETRIEVAL - Try multiple sources
    -- Source 1: public.users table (username column)
    IF v_user_id IS NOT NULL THEN
        SELECT username INTO v_username
        FROM public.users
        WHERE id = v_user_id;
    END IF;
    
    -- Source 2: If username is null/empty, try email from users table
    IF v_username IS NULL OR v_username = '' THEN
        SELECT email INTO v_username
        FROM public.users
        WHERE id = v_user_id;
        -- Use just the part before @
        IF v_username IS NOT NULL AND v_username LIKE '%@%' THEN
            v_username := SPLIT_PART(v_username, '@', 1);
        END IF;
    END IF;
    
    -- Source 3: JWT metadata - username
    IF v_username IS NULL OR v_username = '' THEN
        v_username := auth.jwt() -> 'user_metadata' ->> 'username';
    END IF;
    
    -- Source 4: JWT metadata - full_name
    IF v_username IS NULL OR v_username = '' THEN
        v_username := auth.jwt() -> 'user_metadata' ->> 'full_name';
    END IF;
    
    -- Source 5: JWT metadata - name
    IF v_username IS NULL OR v_username = '' THEN
        v_username := auth.jwt() -> 'user_metadata' ->> 'name';
    END IF;
    
    -- Source 6: Email prefix from JWT
    IF v_username IS NULL OR v_username = '' THEN
        v_username := SPLIT_PART(v_email, '@', 1);
    END IF;
    
    -- Source 7: Final fallback
    IF v_username IS NULL OR v_username = '' THEN
        v_username := 'player_' || SUBSTRING(COALESCE(v_user_id::TEXT, 'anon'), 1, 8);
    END IF;
    
    -- For anonymous users
    IF v_user_id IS NULL THEN
        v_username := 'ANONYMOUS';
        v_email := 'anonymous@dropdollar.com';
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
        v_cheat_score := v_cheat_score + 4.0;
        v_reasons := array_append(v_reasons, 'impossible_accuracy');
        v_suspicious := TRUE;
    ELSIF p_accuracy IS NOT NULL AND p_accuracy > 98 THEN
        v_cheat_score := v_cheat_score + 1.5;
    END IF;
    
    IF p_reaction_time IS NOT NULL AND p_reaction_time < 50 THEN
        v_cheat_score := v_cheat_score + 5.0;
        v_reasons := array_append(v_reasons, 'impossible_reaction');
        v_suspicious := TRUE;
    ELSIF p_reaction_time IS NOT NULL AND p_reaction_time < 100 THEN
        v_cheat_score := v_cheat_score + 2.0;
    END IF;
    
    IF p_score > 5000 THEN
        v_cheat_score := v_cheat_score + 1.5;
    END IF;
    
    -- Threat level
    v_threat_level := CASE
        WHEN v_cheat_score >= 8 THEN 'CRITICAL'
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

-- STEP 5: Update existing "unknown" entries with correct usernames
UPDATE game_audit_log gal
SET username = u.username
FROM public.users u
WHERE gal.user_id = u.id
  AND (gal.username IS NULL OR gal.username = 'unknown' OR gal.username = '');

-- STEP 6: For entries where we have email, update username from email
UPDATE game_audit_log
SET username = SPLIT_PART(email, '@', 1)
WHERE (username IS NULL OR username = 'unknown' OR username = '')
  AND email IS NOT NULL 
  AND email LIKE '%@%';

-- STEP 7: Test the updated function
SELECT 'TESTING UPDATED FUNCTION:' as info;
SELECT frontend_log_game_completion(
    'USERNAME_FINAL_TEST',
    'practice',
    999,
    95.0,
    200.0,
    60,
    '{"test": "username_final"}'::jsonb
) as test_result;

-- STEP 8: Show updated logs
SELECT 'UPDATED AUDIT LOGS:' as info;
SELECT 
    username,
    email,
    game_type,
    score,
    cheat_score,
    created_at
FROM game_audit_log
ORDER BY created_at DESC
LIMIT 10;

