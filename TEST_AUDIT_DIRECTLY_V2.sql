-- ============================================================================
-- DIRECT TEST: Call frontend_log_game_completion AS YOUR USER (V2)
-- ============================================================================
-- This version doesn't query user_profiles (which doesn't exist)
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
    '{"test": "direct_sql_v2"}'::jsonb  -- additional data
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
AND additional_data->>'test' = 'direct_sql_v2'
ORDER BY created_at DESC
LIMIT 1;

-- Test 3: Check your auth record
SELECT 
    id,
    email,
    raw_user_meta_data->>'username' as username_from_meta,
    raw_user_meta_data->>'user_name' as user_name_from_meta,
    split_part(email, '@', 1) as email_prefix
FROM auth.users
WHERE email = 'rf32191@gmail.com';

-- Test 4: Check if game_audit_log table exists and has data
SELECT 
    COUNT(*) as total_logs,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as most_recent
FROM game_audit_log;

-- Results interpretation:
-- Test 1: Should return {"success": true, "audit_id": "..."}
-- Test 2: Should show the new audit log with your game data
-- Test 3: Should show your auth record with username extraction
-- Test 4: Should show count of audit logs

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🧪 AUDIT FUNCTION TEST RESULTS (V2)';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Check the results above:';
    RAISE NOTICE '1. First result: {"success": true, "audit_id": "..."}';
    RAISE NOTICE '2. Second result: Your quick_click audit log';
    RAISE NOTICE '3. Third result: Your username (from metadata or email)';
    RAISE NOTICE '4. Fourth result: Total audit logs count';
    RAISE NOTICE '';
    RAISE NOTICE 'If Test 1 shows success=true: ✅ Function works!';
    RAISE NOTICE 'If Test 2 shows a record: ✅ Database insert works!';
    RAISE NOTICE '';
    RAISE NOTICE 'If any error: Send me the exact error message.';
    RAISE NOTICE '';
END $$;

