-- ============================================================================
-- DEBUG WINNER TAKES ALL - CHECK WHAT'S ACTUALLY IN THE DATABASE
-- ============================================================================

-- Check if configs exist
SELECT '📋 Winner Takes All Configs:' as info, COUNT(*) as count FROM public.winner_takes_all_configs;
SELECT * FROM public.winner_takes_all_configs ORDER BY base_price LIMIT 5;

-- Check if sessions exist
SELECT '📋 Winner Takes All Sessions:' as info, COUNT(*) as count FROM public.winner_takes_all_sessions;
SELECT * FROM public.winner_takes_all_sessions LIMIT 5;

-- Check if participants exist
SELECT '📋 Winner Takes All Participants:' as info, COUNT(*) as count FROM public.winner_takes_all_participants;

-- Test the RPC function
SELECT '🔧 Testing get_all_winner_takes_all_sessions():' as info;
SELECT * FROM public.get_all_winner_takes_all_sessions();

-- Check RLS policies
SELECT 
    '🛡️ RLS Policies on winner_takes_all_sessions:' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'winner_takes_all_sessions';

-- Check function permissions
SELECT 
    '🔑 Function Permissions:' as info,
    p.proname as function_name,
    array_to_string(p.proacl, ', ') as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_all_winner_takes_all_sessions';

SELECT '
🔍 DIAGNOSTIC RESULTS:

Check the output above to see:
1. How many configs exist?
2. How many sessions exist?
3. Does the RPC function return data?
4. Are RLS policies in place?
5. Does anon have execute permission?

If sessions = 0, we need to create them!
If RPC returns empty, we need to fix the function!
If no RLS policies, we need to add them!
' as summary;

