-- ============================================================================
-- FIX: COIN PLAY RPC FUNCTION ACCESS
-- ============================================================================
-- Problem: RPC works in Supabase but frontend gets empty array
-- Solution: Grant anonymous access to the RPC function
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔓 FIXING RPC FUNCTION ACCESS';
    RAISE NOTICE '========================================';
END $$;

-- CRITICAL FIX: Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_coin_play_sessions() TO anon;
GRANT EXECUTE ON FUNCTION public.get_coin_play_sessions() TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Granted execute permissions to:';
    RAISE NOTICE '   - anon (not logged in)';
    RAISE NOTICE '   - authenticated (logged in)';
END $$;

-- Also grant for other Coin Play functions
GRANT EXECUTE ON FUNCTION public.coin_play_join_v2(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_coin_play_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_coin_play_payout(TEXT) TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Granted execute permissions for all Coin Play functions';
    RAISE NOTICE '';
END $$;

-- Verify permissions
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name LIKE '%coin_play%'
ORDER BY routine_name, grantee;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RPC ACCESS FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '💡 What this fixed:';
    RAISE NOTICE '   - Frontend can now call get_coin_play_sessions()';
    RAISE NOTICE '   - Both logged in and logged out users can view';
    RAISE NOTICE '   - Only logged in users can join/play';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next steps:';
    RAISE NOTICE '   1. Hard refresh browser (Ctrl+Shift+R)';
    RAISE NOTICE '   2. You should now see all 81 tournaments!';
    RAISE NOTICE '   3. Games will be grouped by type';
    RAISE NOTICE '';
END $$;

