-- ============================================================================
-- DIAGNOSE WHERE TEXT = UUID ERROR IS COMING FROM
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 DIAGNOSING TEXT = UUID ERROR SOURCE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- 1. Check ALL functions that might be called
SELECT 
    '🔧 EXISTING FUNCTIONS:' as info,
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
    p.proname LIKE '%hot_sell%' 
    OR p.proname LIKE '%winner_takes_all%'
    OR p.proname LIKE '%spend_tokens%'
    OR p.proname LIKE '%deduct_tokens%'
)
ORDER BY p.proname;

-- 2. Check for triggers
SELECT 
    '🎯 TRIGGERS:' as info,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN (
    'hot_sell_sessions',
    'hot_sell_participants',
    'winner_takes_all_sessions',
    'winner_takes_all_participants',
    'users'
)
ORDER BY event_object_table, trigger_name;

-- 3. Check for RLS policies
SELECT 
    '🔒 RLS POLICIES:' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'hot_sell_sessions',
    'hot_sell_participants',
    'winner_takes_all_sessions',
    'winner_takes_all_participants'
)
ORDER BY tablename, policyname;

-- 4. Check RLS status
SELECT 
    '🔐 RLS STATUS:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'hot_sell_sessions',
    'hot_sell_participants',
    'winner_takes_all_sessions',
    'winner_takes_all_participants'
)
ORDER BY tablename;

-- 5. Check for views
SELECT 
    '👁️ VIEWS:' as info,
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND (
    table_name LIKE '%hot_sell%'
    OR table_name LIKE '%winner_takes_all%'
)
ORDER BY table_name;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📋 DIAGNOSIS COMPLETE';
    RAISE NOTICE 'Review the results above to find the source';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

