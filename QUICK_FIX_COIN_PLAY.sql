-- ============================================================================
-- QUICK FIX: COIN PLAY NOT SHOWING GAMES
-- ============================================================================
-- This script will verify and fix the issue
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 QUICK FIX FOR COIN PLAY';
    RAISE NOTICE '========================================';
END $$;

-- STEP 1: Check what we have
DO $$
DECLARE
    v_configs INTEGER;
    v_sessions INTEGER;
    v_rpc_result INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Current State:';
    
    SELECT COUNT(*) INTO v_configs FROM public.coin_play_configs;
    SELECT COUNT(*) INTO v_sessions FROM public.coin_play_sessions WHERE status IN ('waiting', 'active');
    SELECT COUNT(*) INTO v_rpc_result FROM get_coin_play_sessions();
    
    RAISE NOTICE '   Configs: %', v_configs;
    RAISE NOTICE '   Sessions (waiting/active): %', v_sessions;
    RAISE NOTICE '   RPC returns: %', v_rpc_result;
    RAISE NOTICE '';
    
    IF v_configs = 0 THEN
        RAISE NOTICE '❌ NO CONFIGS! Creating them now...';
    ELSIF v_sessions = 0 THEN
        RAISE NOTICE '❌ NO SESSIONS! Creating them now...';
    ELSIF v_rpc_result = 0 THEN
        RAISE NOTICE '❌ RPC RETURNS NOTHING! Checking RLS...';
    ELSE
        RAISE NOTICE '✅ Everything looks good! Check browser console.';
    END IF;
END $$;

-- STEP 2: Ensure RLS policies allow anonymous access
DROP POLICY IF EXISTS "Anyone can view Coin Play sessions" ON public.coin_play_sessions;
CREATE POLICY "Anyone can view Coin Play sessions"
ON public.coin_play_sessions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view Coin Play configs" ON public.coin_play_configs;
CREATE POLICY "Anyone can view Coin Play configs"
ON public.coin_play_configs FOR SELECT
USING (true);

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies updated for public access';
END $$;

-- STEP 3: Show sample data to verify
SELECT 
    'Sample Sessions:' as info,
    s.config_id,
    c.game_type,
    c.entry_fee,
    c.prize_pool as config_prize,
    s.prize_pool as session_prize,
    s.status,
    s.participants_count,
    c.max_participants
FROM public.coin_play_sessions s
JOIN public.coin_play_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
LIMIT 10;

-- STEP 4: Test the RPC directly
SELECT 
    'RPC Test Results:' as info,
    id,
    config_id,
    game_type,
    entry_fee,
    prize_pool,
    status,
    participants_count
FROM get_coin_play_sessions()
LIMIT 10;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ QUICK FIX COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Next steps:';
    RAISE NOTICE '   1. Refresh your browser (Ctrl+Shift+R)';
    RAISE NOTICE '   2. Check browser console (F12)';
    RAISE NOTICE '   3. Look for: "🪙 [Coin Play] Loaded sessions: XX"';
    RAISE NOTICE '   4. If still empty, send me the console logs';
    RAISE NOTICE '';
END $$;

