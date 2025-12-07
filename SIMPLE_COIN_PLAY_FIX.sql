-- ============================================================================
-- SIMPLE COIN PLAY FIX (No Deadlocks)
-- ============================================================================
-- Runs operations one at a time to avoid deadlocks
-- ============================================================================

-- STEP 1: Grant function access
GRANT EXECUTE ON FUNCTION public.get_coin_play_sessions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.coin_play_join_v2(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_coin_play_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_coin_play_payout(TEXT) TO authenticated;

-- STEP 2: Create scoreboard function
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

-- STEP 3: Grant scoreboard access
GRANT EXECUTE ON FUNCTION public.get_coin_play_participants(UUID) TO anon, authenticated;

-- STEP 4: Test RPC
SELECT COUNT(*) as total_sessions FROM get_coin_play_sessions();

-- Done!
SELECT '✅ Coin Play Fix Complete! Hard refresh your browser.' as status;

