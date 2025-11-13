-- ============================================================================
-- FIX WINNER TAKES ALL COLUMN NAME MISMATCH
-- Frontend expects "current_pool" but RPC returns "prize_pool"
-- ============================================================================

-- Drop and recreate the function with correct column name
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions();

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    current_pool NUMERIC,  -- Changed from prize_pool to match frontend
    base_price NUMERIC,
    participants_count INTEGER,
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id UUID,
    winner_prize NUMERIC,
    platform_fee_amount NUMERIC,
    completed_at TIMESTAMPTZ,
    rng_seed INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.config_id,
        s.prize_pool as current_pool,  -- Alias prize_pool as current_pool
        s.base_price,
        s.participants_count,
        s.status,
        s.timer_started_at,
        s.timer_duration,
        s.winner_user_id,
        s.winner_prize,
        s.platform_fee_amount,
        s.completed_at,
        s.rng_seed,
        s.created_at,
        s.updated_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'user_id', p.user_id,
                    'username', p.username,
                    'score', p.score,
                    'accuracy', p.accuracy,
                    'joined_at', p.joined_at,
                    'completed_at', p.completed_at
                )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'::jsonb
        ) as participants
    FROM public.winner_takes_all_sessions s
    LEFT JOIN public.winner_takes_all_participants p ON s.id = p.session_id
    WHERE s.status IN ('waiting', 'active')
    GROUP BY s.id
    ORDER BY s.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;

SELECT '✅ Fixed get_all_winner_takes_all_sessions to return current_pool instead of prize_pool' as result;

-- Verify the function
SELECT 
    '📊 Function columns:' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'winner_takes_all_sessions'
ORDER BY ordinal_position;

SELECT '
✅ COLUMN NAME MISMATCH FIXED!

What changed:
- RPC function now returns "current_pool" (aliased from prize_pool)
- Frontend interface expects "current_pool" ✓
- Database column is still "prize_pool" ✓
- Alias bridges the gap

Result:
- Frontend can now read session data correctly
- "Session not found" error should be gone
- Sessions will now appear on WTA page

Run this and refresh the Winner Takes All page!
' as summary;

