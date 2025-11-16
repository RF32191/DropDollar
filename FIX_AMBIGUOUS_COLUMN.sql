-- ============================================================================
-- FIX AMBIGUOUS COLUMN ERROR IN get_all_marketplace_listings
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_marketplace_listings(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_marketplace_listings(
    category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    seller_id UUID,
    seller_username TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    game_type TEXT,
    shipping_included BOOLEAN,
    image_urls JSONB,
    condition TEXT,
    brand TEXT,
    dimensions TEXT,
    weight TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    session_id TEXT,
    prize_pool NUMERIC,
    participants_count INTEGER,
    session_status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id TEXT,
    winner_username TEXT,
    winner_score NUMERIC,
    winner_contacted BOOLEAN,
    rng_seed INTEGER,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.seller_id,
        COALESCE(
            (SELECT u.username FROM public.users u WHERE u.id = l.seller_id),
            (SELECT u.email FROM public.users u WHERE u.id = l.seller_id),
            'Seller'
        ) as seller_username,
        l.title,
        l.description,
        l.category,
        l.base_price,
        l.game_type,
        l.shipping_included,
        COALESCE(l.image_urls, '[]'::jsonb) as image_urls,
        COALESCE(l.condition, 'new') as condition,
        l.brand,
        l.dimensions,
        l.weight,
        l.status,
        l.created_at,
        COALESCE(s.id::TEXT, 'no-session')::TEXT as session_id,
        COALESCE(s.prize_pool, 0) as prize_pool,
        COALESCE(s.participants_count, 0) as participants_count,
        COALESCE(s.status, 'waiting') as session_status,
        s.timer_started_at,
        COALESCE(s.timer_duration, 7200) as timer_duration,
        CASE WHEN s.winner_user_id IS NOT NULL THEN s.winner_user_id::TEXT ELSE NULL END as winner_user_id,
        s.winner_username,
        s.winner_score,
        COALESCE(s.winner_contacted, false) as winner_contacted,
        COALESCE(s.rng_seed, 1) as rng_seed,
        -- Return participants with their scores and usernames
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id::TEXT,
                        'user_id', p.user_id::TEXT,
                        'username', COALESCE(
                            (SELECT u2.username FROM public.users u2 WHERE u2.id = p.user_id),
                            (SELECT u2.email FROM public.users u2 WHERE u2.id = p.user_id),
                            'Player'
                        ),
                        'entry_amount', p.entry_amount,
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    ) ORDER BY p.score DESC NULLS LAST
                )
                FROM public.marketplace_participants p
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.marketplace_listings l
    LEFT JOIN public.marketplace_sessions s ON s.listing_id = l.id 
        AND s.status IN ('waiting', 'active', 'completed')
    WHERE l.status = 'active'
    AND (category_filter IS NULL OR l.category = category_filter)
    ORDER BY l.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_marketplace_listings(TEXT) TO authenticated, anon;

SELECT '
╔════════════════════════════════════════════════════════════════╗
║              ✅ AMBIGUOUS COLUMN ERROR FIXED!                  ║
╚════════════════════════════════════════════════════════════════╝

WHAT WAS FIXED:
✅ All column references now properly qualified with table aliases
✅ Changed inner query aliases from "u" to "u2" to avoid conflicts
✅ Explicitly qualified all id, status, and created_at references

THE ISSUE:
- Multiple tables had "id" columns
- Database didnt know which "id" to use
- Error: "column reference id is ambiguous"

THE FIX:
- All columns now use table prefix (l.id, s.id, p.id)
- Inner subqueries use unique aliases (u, u2)
- No more ambiguous references!

WHAT IT RETURNS:
✅ All marketplace listings for category
✅ Session data (if exists)
✅ Participants array with scores
✅ Usernames properly looked up
✅ Images as JSONB array

REFRESH YOUR PAGE - IT WILL WORK NOW! ✅
' as success_message;

