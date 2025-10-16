-- Test Game Saving System
-- Run this after running FIX_GAME_SAVING_ISSUES.sql to verify everything works

-- 1. Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('game_history', 'game_scores', 'high_scores') THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('game_history', 'game_scores', 'high_scores');

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('game_history', 'game_scores', 'high_scores');

-- 3. Check if functions exist
SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name IN ('get_user_game_history', 'get_user_high_scores') THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_game_history', 'get_user_high_scores');

-- 4. Test inserting a sample game score (replace with actual user ID)
-- Uncomment and replace 'YOUR_USER_ID_HERE' with actual user ID to test
/*
INSERT INTO public.game_history (
    user_id, 
    game_type, 
    score, 
    accuracy, 
    is_practice
) VALUES (
    'YOUR_USER_ID_HERE',
    'sword-parry',
    1000.00,
    85.5,
    true
);

-- Check if the trigger worked
SELECT * FROM public.high_scores WHERE user_id = 'YOUR_USER_ID_HERE';
*/

-- 5. Check current row counts
SELECT 
    'game_history' as table_name, 
    count(*) as row_count 
FROM public.game_history
UNION ALL
SELECT 
    'game_scores' as table_name, 
    count(*) as row_count 
FROM public.game_scores
UNION ALL
SELECT 
    'high_scores' as table_name, 
    count(*) as row_count 
FROM public.high_scores;
