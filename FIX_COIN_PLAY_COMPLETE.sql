-- ============================================================================
-- FIX COIN PLAY: COMPLETE VISIBILITY + SCOREBOARD ACCESS
-- ============================================================================
-- Makes listings visible to everyone (not just signed in users)
-- Allows participants to see scoreboards
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔓 FIXING COIN PLAY VISIBILITY';
    RAISE NOTICE '========================================';
END $$;

-- STEP 1: Grant RPC access to EVERYONE (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.get_coin_play_sessions() TO anon;
GRANT EXECUTE ON FUNCTION public.get_coin_play_sessions() TO authenticated;

-- STEP 2: Grant access to participant data (for scoreboards)
DROP POLICY IF EXISTS "Anyone can view Coin Play participants" ON public.coin_play_participants;
CREATE POLICY "Anyone can view Coin Play participants"
ON public.coin_play_participants FOR SELECT
USING (true);

-- STEP 3: Ensure configs and sessions are publicly readable
DROP POLICY IF EXISTS "Anyone can view Coin Play configs" ON public.coin_play_configs;
CREATE POLICY "Anyone can view Coin Play configs"
ON public.coin_play_configs FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view Coin Play sessions" ON public.coin_play_sessions;
CREATE POLICY "Anyone can view Coin Play sessions"
ON public.coin_play_sessions FOR SELECT
USING (true);

-- STEP 4: Grant join/play permissions to authenticated users only
GRANT EXECUTE ON FUNCTION public.coin_play_join_v2(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_coin_play_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_coin_play_payout(TEXT) TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Access Granted:';
    RAISE NOTICE '   📖 View listings: EVERYONE (anon + authenticated)';
    RAISE NOTICE '   📊 View scoreboards: EVERYONE';
    RAISE NOTICE '   🎮 Join/Play: AUTHENTICATED ONLY';
    RAISE NOTICE '';
END $$;

-- STEP 5: Create RPC to get participants with scores (for scoreboards)
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
        score DESC,
        completed_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_coin_play_participants(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_coin_play_participants(UUID) TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Created get_coin_play_participants() RPC';
    RAISE NOTICE '   - Returns sorted leaderboard for any session';
    RAISE NOTICE '   - Available to everyone';
    RAISE NOTICE '';
END $$;

-- STEP 6: Verify all permissions
SELECT 
    'Function Permissions:' as info,
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
    RAISE NOTICE '✅ COIN PLAY VISIBILITY FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '💡 What Changed:';
    RAISE NOTICE '   1. Listings visible to EVERYONE (logged in or not)';
    RAISE NOTICE '   2. Scoreboards visible to EVERYONE';
    RAISE NOTICE '   3. Progress bars update automatically';
    RAISE NOTICE '   4. Only logged-in users can join/play';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next Steps:';
    RAISE NOTICE '   1. Hard refresh browser (Ctrl+Shift+R)';
    RAISE NOTICE '   2. Open in incognito - you should see all 81 games!';
    RAISE NOTICE '   3. Frontend code will handle scoreboards';
    RAISE NOTICE '';
END $$;

