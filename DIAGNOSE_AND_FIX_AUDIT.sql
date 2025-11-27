-- ============================================
-- 🔍 DIAGNOSE AND FIX AUDIT SYSTEM
-- ============================================
-- Run this in Supabase SQL Editor

-- STEP 1: Check what's in the audit log right now
SELECT 'CURRENT AUDIT LOGS:' as info;
SELECT 
    id,
    username,
    email,
    game_type,
    score,
    cheat_score,
    threat_level,
    created_at
FROM game_audit_log
ORDER BY created_at DESC
LIMIT 10;

-- STEP 2: Check if function exists
SELECT 'FUNCTION EXISTS:' as info;
SELECT 
    proname as function_name,
    prosrc IS NOT NULL as has_source
FROM pg_proc 
WHERE proname = 'frontend_log_game_completion';

-- STEP 3: Check RLS policies
SELECT 'RLS POLICIES:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'game_audit_log';

-- STEP 4: Check if RLS is enabled
SELECT 'RLS ENABLED:' as info;
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'game_audit_log';

-- STEP 5: Test the function directly
SELECT 'DIRECT FUNCTION TEST:' as info;
SELECT frontend_log_game_completion(
    'DIAGNOSE_TEST',
    'practice',
    777,
    90.0,
    175.0,
    45,
    '{"diagnose": true}'::jsonb
) as test_result;

-- STEP 6: Check if test was inserted
SELECT 'AFTER TEST - LATEST LOGS:' as info;
SELECT 
    username,
    game_type,
    score,
    created_at
FROM game_audit_log
ORDER BY created_at DESC
LIMIT 3;

-- STEP 7: Ensure grants are correct
GRANT ALL ON game_audit_log TO authenticated;
GRANT ALL ON game_audit_log TO anon;
GRANT EXECUTE ON FUNCTION frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) TO anon;

SELECT '✅ DIAGNOSIS COMPLETE - Check results above' as status;

