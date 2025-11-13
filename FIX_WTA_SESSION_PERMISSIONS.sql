-- ============================================================================
-- FIX WINNER TAKES ALL SESSION PERMISSIONS
-- Allow signed-out users to view WTA sessions (just like Hot Sell)
-- ============================================================================

-- Grant execute permissions to both authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;

SELECT '✅ Granted execute permission on get_all_winner_takes_all_sessions to authenticated and anon users' as result;

-- Verify the function exists and has correct permissions
SELECT 
    '📊 Function Info:' as info,
    p.proname as function_name,
    pg_get_userbyid(p.proowner) as owner,
    p.prosecdef as security_definer,
    array_to_string(p.proacl, ', ') as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_all_winner_takes_all_sessions';

SELECT '
✅ WINNER TAKES ALL SESSION PERMISSIONS FIXED!

What changed:
- get_all_winner_takes_all_sessions() now callable by signed-out users
- Both authenticated AND anon users can view sessions
- Same permissions as Hot Sell (get_all_hot_sell_sessions)

Result:
- Signed-out users can now see WTA game listings
- No more "Session not found!" errors
- Users can browse all games before logging in
' as summary;

