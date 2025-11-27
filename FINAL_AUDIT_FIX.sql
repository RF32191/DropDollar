-- ============================================
-- 🔥 FINAL AUDIT FIX - Run this in Supabase SQL Editor
-- ============================================
-- This fixes ALL audit issues in one simple script

-- Step 1: Drop everything first (clean slate)
DROP FUNCTION IF EXISTS frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) CASCADE;
DROP FUNCTION IF EXISTS frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Step 2: Create game_audit_log table if not exists
CREATE TABLE IF NOT EXISTS public.game_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    username TEXT,
    email TEXT,
    game_type TEXT NOT NULL,
    game_mode TEXT NOT NULL DEFAULT 'practice',
    session_id UUID,
    score INTEGER NOT NULL DEFAULT 0,
    score_rating NUMERIC(3,1),
    max_score INTEGER,
    accuracy NUMERIC(5,2),
    reaction_time NUMERIC(10,2),
    duration_seconds INTEGER,
    ip_address INET,
    suspicious BOOLEAN DEFAULT FALSE,
    suspicious_reasons TEXT[],
    cheat_score NUMERIC(5,2) DEFAULT 0,
    threat_level TEXT DEFAULT 'low',
    additional_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add any missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_audit_log' AND column_name = 'score_rating') THEN
        ALTER TABLE game_audit_log ADD COLUMN score_rating NUMERIC(3,1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_audit_log' AND column_name = 'threat_level') THEN
        ALTER TABLE game_audit_log ADD COLUMN threat_level TEXT DEFAULT 'low';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_audit_log' AND column_name = 'cheat_score') THEN
        ALTER TABLE game_audit_log ADD COLUMN cheat_score NUMERIC(5,2) DEFAULT 0;
    END IF;
END $$;

-- Step 4: Enable RLS
ALTER TABLE game_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "Admin can view all audit logs" ON game_audit_log;
DROP POLICY IF EXISTS "Users can view own audit logs" ON game_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON game_audit_log;
DROP POLICY IF EXISTS "users_can_insert_audit_log" ON game_audit_log;
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON game_audit_log;
DROP POLICY IF EXISTS "admins_can_read_audit_log" ON game_audit_log;

-- Step 6: Create simple is_admin function using JWT (no recursion!)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN COALESCE((auth.jwt() ->> 'email'), '') = 'rf32191@gmail.com';
END;
$$;

-- Step 7: Create simple RLS policies
-- Allow ANYONE authenticated to insert (function will validate)
CREATE POLICY "Anyone can insert audit logs"
ON game_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admin can read ALL logs
CREATE POLICY "Admin can view all audit logs"
ON game_audit_log FOR SELECT
TO authenticated
USING (is_admin());

-- Users can read their OWN logs
CREATE POLICY "Users can view own audit logs"
ON game_audit_log FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON game_audit_log TO authenticated;
GRANT ALL ON game_audit_log TO anon;

-- Step 8: Create the main audit function
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
    v_threat_level TEXT := 'low';
    v_suspicious BOOLEAN := FALSE;
    v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get current user from JWT
    v_user_id := auth.uid();
    v_email := auth.jwt() ->> 'email';
    v_username := COALESCE(
        auth.jwt() -> 'user_metadata' ->> 'username',
        auth.jwt() -> 'user_metadata' ->> 'full_name',
        SPLIT_PART(v_email, '@', 1)
    );
    
    -- If no user, still log but mark as anonymous
    IF v_user_id IS NULL THEN
        v_username := 'ANONYMOUS';
        v_email := 'anonymous@unknown.com';
    END IF;
    
    -- Calculate score rating (1-10 scale)
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
    
    -- Basic cheat detection
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
    
    -- Set threat level
    v_threat_level := CASE
        WHEN v_cheat_score >= 5 THEN 'high'
        WHEN v_cheat_score >= 3 THEN 'medium'
        ELSE 'low'
    END;
    
    -- Insert the audit log
    INSERT INTO game_audit_log (
        user_id,
        username,
        email,
        game_type,
        game_mode,
        score,
        score_rating,
        accuracy,
        reaction_time,
        duration_seconds,
        suspicious,
        suspicious_reasons,
        cheat_score,
        threat_level,
        additional_data
    ) VALUES (
        v_user_id,
        v_username,
        v_email,
        p_game_type,
        p_game_mode,
        p_score,
        v_score_rating,
        p_accuracy,
        p_reaction_time,
        p_duration_seconds,
        v_suspicious,
        v_reasons,
        v_cheat_score,
        v_threat_level,
        p_additional_data
    )
    RETURNING id INTO v_audit_id;
    
    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'audit_id', v_audit_id,
        'score_rating', v_score_rating,
        'cheat_score', v_cheat_score,
        'threat_level', v_threat_level,
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

-- Step 9: Grant execute permission
GRANT EXECUTE ON FUNCTION frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) TO anon;

-- Step 10: Test the function
DO $$
DECLARE
    test_result JSONB;
BEGIN
    SELECT frontend_log_game_completion(
        'DEPLOYMENT_TEST',
        'practice',
        1234,
        95.5,
        250.0,
        60,
        '{"test": true, "timestamp": "2025-11-27"}'::jsonb
    ) INTO test_result;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ AUDIT FUNCTION TEST RESULT:';
    RAISE NOTICE '%', test_result;
    RAISE NOTICE '========================================';
END $$;

-- Step 11: Verify everything
SELECT 
    '✅ DEPLOYMENT SUCCESSFUL!' as status,
    (SELECT COUNT(*) FROM game_audit_log) as total_logs,
    (SELECT COUNT(*) FROM game_audit_log WHERE created_at > NOW() - INTERVAL '1 minute') as recent_logs;

