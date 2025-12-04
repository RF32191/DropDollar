-- FIX_TIMER_READ_FROM_LISTING.sql
-- The get_all_marketplace_listings function was reading timer_duration from marketplace_sessions
-- with a hardcoded 7200 fallback. This fixes it to read from marketplace_listings instead.

CREATE OR REPLACE FUNCTION public.get_all_marketplace_listings(category_filter TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    seller_id UUID,
    seller_username TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    game_type TEXT,
    status TEXT,
    image_urls JSONB,
    condition TEXT,
    brand TEXT,
    dimensions TEXT,
    weight TEXT,
    timer_duration INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    session_id UUID,
    session_status TEXT,
    prize_pool NUMERIC,
    participants_count INTEGER,
    timer_started_at TIMESTAMPTZ,
    winner_user_id UUID,
    winner_username TEXT,
    winner_score NUMERIC,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ml.id::UUID,
        ml.seller_id::UUID,
        ml.seller_username::TEXT,
        ml.title::TEXT,
        ml.description::TEXT,
        ml.category::TEXT,
        ml.base_price::NUMERIC,
        ml.game_type::TEXT,
        ml.status::TEXT,
        ml.image_urls::JSONB,
        COALESCE(ml.condition, 'new')::TEXT,
        ml.brand::TEXT,
        ml.dimensions::TEXT,
        ml.weight::TEXT,
        COALESCE(ml.timer_duration, 180)::INTEGER, -- 🎯 READ FROM LISTING, NOT SESSION!
        ml.created_at::TIMESTAMPTZ,
        ml.updated_at::TIMESTAMPTZ,
        ms.id::UUID AS session_id,
        ms.status::TEXT AS session_status,
        ms.prize_pool::NUMERIC,
        COALESCE(ms.participants_count, 0)::INTEGER,
        ms.timer_started_at::TIMESTAMPTZ,
        ms.winner_user_id::UUID,
        ms.winner_username::TEXT,
        ms.winner_score::NUMERIC,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'user_id', p.user_id,
                'username', u.username,
                'score', p.score,
                'joined_at', p.joined_at
            ))
            FROM marketplace_participants p
            LEFT JOIN users u ON u.id = p.user_id
            WHERE p.session_id = ms.id),
            '[]'::jsonb
        ) AS participants
    FROM public.marketplace_listings ml
    LEFT JOIN public.marketplace_sessions ms ON ms.listing_id = ml.id
    WHERE (category_filter IS NULL OR ml.category = category_filter)
      AND ml.status = 'active'
    ORDER BY ml.created_at DESC;
END;
$$;

-- Verify the fix
SELECT '✅ Updated get_all_marketplace_listings to read timer_duration from listing table (default 180s = 3 min)' as result;

