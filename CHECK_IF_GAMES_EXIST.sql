-- ============================================
-- CHECK IF GAMES EXIST AND WHY DASHBOARD IS EMPTY
-- ============================================

-- Step 1: Do games exist in the database?
SELECT '
============================================
📊 STEP 1: Total games in database
============================================
' as step;

SELECT 
    COUNT(*) as total_games,
    COUNT(CASE WHEN session_type = 'practice' THEN 1 END) as practice_games,
    COUNT(CASE WHEN session_type IN ('competition', 'wta', '1v1', 'marketplace') THEN 1 END) as competition_games,
    MIN(created_at) as oldest_game,
    MAX(created_at) as newest_game
FROM public.game_history;

-- Step 2: Show actual games data
SELECT '
============================================
📋 STEP 2: Show actual games (all users)
============================================
' as step;

SELECT 
    gh.id,
    u.email as user_email,
    gh.game_type,
    gh.session_type,
    gh.is_practice,
    gh.is_competition,
    gh.score,
    gh.created_at
FROM public.game_history gh
LEFT JOIN auth.users u ON u.id = gh.user_id
ORDER BY gh.created_at DESC
LIMIT 20;

-- Step 3: Check RLS policies
SELECT '
============================================
🔒 STEP 3: RLS Policies
============================================
' as step;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'game_history'
ORDER BY policyname;

-- Step 4: Check if RLS is enabled
SELECT '
============================================
🔒 STEP 4: Is RLS Enabled?
============================================
' as step;

SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔒 RLS is ON - good for security, but must have policies'
        ELSE '⚠️ RLS is OFF - everyone can see everything'
    END as status
FROM pg_tables 
WHERE tablename = 'game_history';

-- Step 5: Test SELECT as different users
SELECT '
============================================
🧪 STEP 5: Can users see their own games?
============================================
' as step;

DO $$
DECLARE
    v_user RECORD;
    v_count INTEGER;
BEGIN
    FOR v_user IN 
        SELECT u.id, u.email, COUNT(gh.id) as total_games
        FROM auth.users u
        LEFT JOIN public.game_history gh ON gh.user_id = u.id
        WHERE u.created_at > NOW() - INTERVAL '30 days'
        GROUP BY u.id, u.email
        HAVING COUNT(gh.id) > 0
        LIMIT 5
    LOOP
        RAISE NOTICE 'User: % | Games in DB: %', v_user.email, v_user.total_games;
    END LOOP;
END $$;

-- Step 6: Show the EXACT issue
SELECT '
============================================
🔍 STEP 6: DIAGNOSIS
============================================
' as step;

DO $$
DECLARE
    v_total_games INTEGER;
    v_has_policies INTEGER;
    v_rls_enabled BOOLEAN;
BEGIN
    -- Check total games
    SELECT COUNT(*) INTO v_total_games FROM public.game_history;
    
    -- Check policies
    SELECT COUNT(*) INTO v_has_policies FROM pg_policies WHERE tablename = 'game_history';
    
    -- Check RLS
    SELECT rowsecurity INTO v_rls_enabled FROM pg_tables WHERE tablename = 'game_history';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '📊 DIAGNOSIS RESULTS:';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total games in database: %', v_total_games;
    RAISE NOTICE 'RLS policies count: %', v_has_policies;
    RAISE NOTICE 'RLS enabled: %', v_rls_enabled;
    RAISE NOTICE '';
    
    IF v_total_games = 0 THEN
        RAISE NOTICE '❌ PROBLEM: No games in database!';
        RAISE NOTICE '   SOLUTION: Run AUTO_ADD_TEST_GAMES_ALL_USERS.sql';
        RAISE NOTICE '   OR play a real practice game';
    ELSIF v_rls_enabled AND v_has_policies = 0 THEN
        RAISE NOTICE '❌ PROBLEM: RLS enabled but no policies!';
        RAISE NOTICE '   SOLUTION: Run COMPLETE_DASHBOARD_FIX.sql';
    ELSIF v_rls_enabled AND v_has_policies > 0 THEN
        RAISE NOTICE '✅ Database looks good!';
        RAISE NOTICE '   Games exist: %', v_total_games;
        RAISE NOTICE '   RLS configured: % policies', v_has_policies;
        RAISE NOTICE '';
        RAISE NOTICE '❓ If dashboard is still empty:';
        RAISE NOTICE '   1. Frontend not deployed yet → Deploy to Vercel';
        RAISE NOTICE '   2. Browser cache → Hard refresh (Cmd+Shift+R)';
        RAISE NOTICE '   3. Check browser console for errors';
        RAISE NOTICE '   4. Look for: "Game history loaded from new table: X games"';
    ELSE
        RAISE NOTICE '⚠️ RLS is disabled - check security!';
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
END $$;

-- Step 7: Final query - what dashboard should see
SELECT '
============================================
📱 STEP 7: What Dashboard Query Returns
============================================
This is what the frontend queries.
If this is empty, dashboard will be empty.
' as step;

SELECT 
    COUNT(*) as total_games,
    COUNT(CASE WHEN is_practice = true THEN 1 END) as practice_games,
    COUNT(CASE WHEN is_competition = true THEN 1 END) as competition_games
FROM public.game_history;

-- Show sample of what would be displayed
SELECT 
    id,
    game_type,
    session_type,
    is_practice,
    score,
    accuracy,
    created_at
FROM public.game_history
ORDER BY created_at DESC
LIMIT 5;

