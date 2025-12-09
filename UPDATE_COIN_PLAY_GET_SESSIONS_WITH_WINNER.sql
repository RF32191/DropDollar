-- ============================================================================
-- UPDATE GET_COIN_PLAY_SESSIONS TO INCLUDE WINNER USERNAME
-- ============================================================================
-- Updates get_coin_play_sessions to include winner_username for display
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 UPDATING GET_COIN_PLAY_SESSIONS';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- UPDATE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_coin_play_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    game_type TEXT,
    entry_fee NUMERIC,
    prize_pool NUMERIC,
    max_participants INTEGER,
    participants_count INTEGER,
    status TEXT,
    timer_duration INTEGER,
    timer_started_at TIMESTAMPTZ,
    winner_user_id UUID,
    winner_prize NUMERIC,
    winner_username TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.config_id,
        c.game_type,
        c.entry_fee,
        s.prize_pool,
        c.max_participants,
        s.participants_count,
        s.status,
        s.timer_duration,
        s.timer_started_at,
        s.winner_user_id,
        s.winner_prize,
        COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as winner_username,
        s.completed_at,
        s.created_at
    FROM public.coin_play_sessions s
    JOIN public.coin_play_configs c ON s.config_id = c.id
    LEFT JOIN public.users u ON s.winner_user_id = u.id
    WHERE s.status IN ('waiting', 'active', 'completed')
    ORDER BY c.game_type, c.prize_pool;
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ Function updated to include winner_username';
END $$;

-- ============================================================================
-- VERIFY
-- ============================================================================

SELECT 
    '=== Coin Play Sessions Function Updated ===' as info;

SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_coin_play_sessions'
AND routine_schema = 'public'
LIMIT 1;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FUNCTION UPDATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 What changed:';
    RAISE NOTICE '   - Added winner_username to return table';
    RAISE NOTICE '   - Includes completed sessions in results';
    RAISE NOTICE '   - Winner username will be displayed on listings';
    RAISE NOTICE '';
END $$;

SELECT '✅ FUNCTION UPDATED - Winner username now included!' as status;

