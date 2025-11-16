-- ============================================================================
-- FIX FUNCTION TYPE MISMATCH - Explicit casting for all columns
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
        l.id::UUID,
        l.seller_id::UUID,
        COALESCE(
            (SELECT u.username FROM public.users u WHERE u.id = l.seller_id),
            (SELECT u.email FROM public.users u WHERE u.id = l.seller_id),
            'Seller'
        )::TEXT as seller_username,
        l.title::TEXT,
        l.description::TEXT,
        l.category::TEXT,
        l.base_price::NUMERIC,
        l.game_type::TEXT,
        l.shipping_included::BOOLEAN,
        COALESCE(l.image_urls, '[]'::jsonb)::JSONB as image_urls,
        COALESCE(l.condition, 'new')::TEXT as condition,
        l.brand::TEXT,
        l.dimensions::TEXT,
        l.weight::TEXT,
        l.status::TEXT,
        l.created_at::TIMESTAMPTZ,
        COALESCE(s.id::TEXT, 'no-session')::TEXT as session_id,
        COALESCE(s.prize_pool, 0)::NUMERIC as prize_pool,
        COALESCE(s.participants_count, 0)::INTEGER as participants_count,
        COALESCE(s.status, 'waiting')::TEXT as session_status,
        s.timer_started_at::TIMESTAMPTZ,
        COALESCE(s.timer_duration, 7200)::INTEGER as timer_duration,
        s.winner_user_id::TEXT,
        s.winner_username::TEXT,
        s.winner_score::NUMERIC,
        COALESCE(s.winner_contacted, false)::BOOLEAN as winner_contacted,
        COALESCE(s.rng_seed, 1)::INTEGER as rng_seed,
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
        )::JSONB as participants
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
║            ✅ FUNCTION TYPE MISMATCH FIXED!                    ║
╚════════════════════════════════════════════════════════════════╝

WHAT WAS FIXED:
✅ All column types explicitly cast to match RETURNS TABLE
✅ Every column now has ::TYPE casting
✅ NULL values properly handled with COALESCE
✅ JSONB arrays properly cast
✅ TEXT, UUID, NUMERIC, INTEGER, BOOLEAN all explicit

THE ISSUE:
- PostgreSQL couldnt match query columns to function return type
- Some columns had ambiguous or NULL types
- Error: "structure of query does not match function result type"

THE FIX:
- Every single column now explicitly cast
- Examples:
  → l.id::UUID
  → l.title::TEXT
  → COALESCE(s.prize_pool, 0)::NUMERIC
  → COALESCE(participants, [])::JSONB

NO MORE TYPE MISMATCHES! ✅

REFRESH YOUR PAGE - LISTINGS WILL LOAD! 🎯
' as success_message;

