-- ============================================================================
-- STEP 2: ADD SCOREBOARDS (Run this after Step 1 works)
-- ============================================================================
-- Only run this AFTER you can see the listings on the page
-- Close all browser tabs first to release locks
-- ============================================================================

-- Create scoreboard function
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

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_coin_play_participants(UUID) TO anon, authenticated;

SELECT '✅ Step 2 Complete! Scoreboards now available on all listings' as status;

