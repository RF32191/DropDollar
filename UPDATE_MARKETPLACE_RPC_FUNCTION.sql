-- =====================================================
-- UPDATE MARKETPLACE RPC FUNCTION
-- Adds new columns to get_all_marketplace_listings
-- =====================================================

-- Drop and recreate the function with new columns
DROP FUNCTION IF EXISTS public.get_all_marketplace_listings(TEXT);

CREATE OR REPLACE FUNCTION public.get_all_marketplace_listings(category_filter TEXT DEFAULT 'all')
RETURNS TABLE (
    id TEXT,
    seller_id TEXT,
    seller_username TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    game_type TEXT,
    shipping_included BOOLEAN,
    seller_contact TEXT,
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
        l.id::TEXT,
        l.seller_id::TEXT,
        l.seller_username,
        l.title,
        l.description,
        l.category,
        l.base_price,
        l.game_type,
        l.shipping_included,
        l.seller_contact,
        l.image_urls,
        COALESCE(l.condition, 'new')::TEXT,
        l.brand,
        l.dimensions,
        l.weight,
        l.status,
        l.created_at,
        COALESCE(s.id::TEXT, 'no-session')::TEXT as session_id,
        COALESCE(s.prize_pool, 0)::NUMERIC,
        COALESCE(s.participants_count, 0)::INTEGER,
        COALESCE(s.status, 'waiting')::TEXT as session_status,
        s.timer_started_at,
        COALESCE(s.timer_duration, 7200)::INTEGER,
        s.winner_user_id::TEXT,
        s.winner_username,
        s.winner_score,
        COALESCE(s.winner_contacted, false)::BOOLEAN,
        COALESCE(s.rng_seed, 1)::INTEGER,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id::TEXT,
                        'user_id', p.user_id::TEXT,
                        'username', u.username,
                        'entry_amount', p.entry_amount,
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    )
                )
                FROM public.marketplace_participants p
                LEFT JOIN public.users u ON u.id = p.user_id
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.marketplace_listings l
    LEFT JOIN public.marketplace_sessions s ON s.listing_id = l.id
    WHERE l.status = 'active'
      AND (category_filter = 'all' OR l.category = category_filter)
    ORDER BY l.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_marketplace_listings(TEXT) TO authenticated, anon;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test the function
SELECT 
    id, 
    title, 
    condition, 
    brand, 
    dimensions, 
    weight,
    image_urls,
    session_id,
    participants
FROM public.get_all_marketplace_listings('all')
LIMIT 5;

SELECT '✅ Marketplace RPC function updated with new columns!' as status;

