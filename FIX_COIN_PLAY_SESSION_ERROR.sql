-- ============================================================================
-- FIX COIN PLAY SESSION ERROR
-- ============================================================================
-- This script ensures all RPC functions exist and have proper permissions
-- Run this to fix session-related errors on the /coin-play page
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXING COIN PLAY SESSION ERRORS';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Ensure get_coin_play_participants function exists
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Creating get_coin_play_participants function...';
END $$;

CREATE OR REPLACE FUNCTION public.get_coin_play_participants(p_session_id UUID)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    score INTEGER,
    completed_at TIMESTAMPTZ,
    prize_amount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        user_id,
        username,
        score,
        completed_at,
        prize_amount
    FROM public.coin_play_participants
    WHERE session_id = p_session_id
    ORDER BY 
        CASE WHEN score IS NULL THEN 1 ELSE 0 END,
        score DESC NULLS LAST,
        completed_at ASC NULLS LAST;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ get_coin_play_participants function created';
END $$;

-- ============================================================================
-- STEP 2: Grant permissions to ALL necessary functions
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Granting permissions...';
END $$;

-- View functions (available to everyone)
GRANT EXECUTE ON FUNCTION public.get_coin_play_sessions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coin_play_participants(UUID) TO anon, authenticated;

-- Play functions (authenticated only)
GRANT EXECUTE ON FUNCTION public.coin_play_join_v2(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_coin_play_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_coin_play_payout(TEXT) TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Permissions granted';
    RAISE NOTICE '   📖 View listings & scoreboards: EVERYONE';
    RAISE NOTICE '   🎮 Join & play: AUTHENTICATED ONLY';
END $$;

-- ============================================================================
-- STEP 3: Ensure RLS policies allow viewing (not blocking)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Checking RLS policies...';
END $$;

-- Drop and recreate SELECT policies to ensure they're permissive
DROP POLICY IF EXISTS "Anyone can view Coin Play configs" ON public.coin_play_configs;
CREATE POLICY "Anyone can view Coin Play configs"
ON public.coin_play_configs FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view Coin Play sessions" ON public.coin_play_sessions;
CREATE POLICY "Anyone can view Coin Play sessions"
ON public.coin_play_sessions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view Coin Play participants" ON public.coin_play_participants;
CREATE POLICY "Anyone can view Coin Play participants"
ON public.coin_play_participants FOR SELECT
USING (true);

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies updated (SELECT allowed for all)';
END $$;

-- ============================================================================
-- STEP 4: Verify setup
-- ============================================================================

DO $$
DECLARE
    v_session_count INTEGER;
    v_config_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Verifying setup...';
    
    -- Count sessions
    SELECT COUNT(*) INTO v_session_count FROM public.coin_play_sessions;
    RAISE NOTICE '   📊 Sessions: %', v_session_count;
    
    -- Count configs
    SELECT COUNT(*) INTO v_config_count FROM public.coin_play_configs;
    RAISE NOTICE '   📋 Configs: %', v_config_count;
    
    IF v_session_count > 0 THEN
        RAISE NOTICE '   ✅ Sessions exist';
    ELSE
        RAISE NOTICE '   ⚠️  No sessions - run CREATE_COIN_PLAY_SYSTEM.sql first';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Test RPC functions
-- ============================================================================

DO $$
DECLARE
    v_result INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing RPC functions...';
    
    -- Test get_coin_play_sessions
    BEGIN
        SELECT COUNT(*) INTO v_result FROM get_coin_play_sessions();
        RAISE NOTICE '   ✅ get_coin_play_sessions() works - returned % sessions', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ get_coin_play_sessions() failed: %', SQLERRM;
    END;
    
END $$;

-- ============================================================================
-- STEP 6: Show function permissions
-- ============================================================================

SELECT 
    '=== Coin Play Function Permissions ===' as info;

SELECT 
    routine_name as function_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name LIKE '%coin_play%'
ORDER BY routine_name, grantee;

-- ============================================================================
-- COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COIN PLAY SESSION FIX COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 What was fixed:';
    RAISE NOTICE '   1. get_coin_play_participants() function created';
    RAISE NOTICE '   2. All RPC functions have proper permissions';
    RAISE NOTICE '   3. RLS policies allow viewing for everyone';
    RAISE NOTICE '   4. Session validation improved in frontend';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next steps:';
    RAISE NOTICE '   1. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)';
    RAISE NOTICE '   2. Clear browser cache if issues persist';
    RAISE NOTICE '   3. Check browser console for any remaining errors';
    RAISE NOTICE '';
END $$;

SELECT '✅ FIX COMPLETE - Please refresh your browser!' as status;

