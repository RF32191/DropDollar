-- ============================================================================
-- DIRECT TEST: Call frontend_log_game_completion AS YOUR USER
-- ============================================================================
-- This will test if the function works when called as rf32191@gmail.com
-- Run this while logged in to Supabase Dashboard as your authenticated user
-- ============================================================================

-- Test 1: Call the function directly
SELECT frontend_log_game_completion(
    'quick_click',           -- game type
    'practice',              -- game mode
    1500,                    -- score
    85.5,                    -- accuracy
    0.35,                    -- reaction time
    60,                      -- duration
    '{"test": "direct_sql_call"}'::jsonb  -- additional data
);

-- Test 2: Check if it was inserted
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
WHERE game_type = 'quick_click'
AND additional_data->>'test' = 'direct_sql_call'
ORDER BY created_at DESC
LIMIT 1;

-- Test 3: Check your user profile exists
SELECT 
    id,
    username,
    email
FROM user_profiles
WHERE email = 'rf32191@gmail.com';

-- Test 4: Check auth.users
SELECT 
    id,
    email
FROM auth.users
WHERE email = 'rf32191@gmail.com';

-- Results interpretation:
-- If Test 1 returns success=true: Function works! ✅
-- If Test 2 shows a record: Database insert works! ✅
-- If Test 3 shows your profile: Username retrieval will work! ✅
-- If Test 4 shows your auth: Authentication works! ✅

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🧪 AUDIT FUNCTION TEST RESULTS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Check the results above:';
    RAISE NOTICE '1. First result should show: {"success": true, "audit_id": "..."}';
    RAISE NOTICE '2. Second result should show a quick_click audit log';
    RAISE NOTICE '3. Third result should show your username';
    RAISE NOTICE '4. Fourth result should show your auth record';
    RAISE NOTICE '';
    RAISE NOTICE 'If all pass: Backend is working! Problem is frontend deployment.';
    RAISE NOTICE 'If any fail: Send me the specific error message.';
    RAISE NOTICE '';
END $$;

