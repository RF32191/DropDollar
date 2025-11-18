-- ============================================
-- FIX LISTINGS LOADING ERROR
-- ============================================
-- Fix the get_all_marketplace_listings function
-- to properly handle category filtering
-- ============================================

-- Drop and recreate the function with proper error handling
DROP FUNCTION IF EXISTS public.get_all_marketplace_listings(TEXT);

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
    session_id UUID,
    prize_pool NUMERIC,
    participants_count INTEGER,
    session_status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id UUID,
    winner_username TEXT,
    winner_score NUMERIC,
    winner_contacted BOOLEAN,
    rng_seed INTEGER,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ml.id::UUID,
        ml.seller_id::UUID,
        u.username::TEXT as seller_username,
        ml.title::TEXT,
        ml.description::TEXT,
        ml.category::TEXT,
        ml.base_price::NUMERIC,
        ml.game_type::TEXT,
        ml.shipping_included::BOOLEAN,
        ml.image_urls::JSONB,
        ml.condition::TEXT,
        ml.brand::TEXT,
        ml.dimensions::TEXT,
        ml.weight::TEXT,
        ml.status::TEXT,
        ml.created_at::TIMESTAMPTZ,
        
        -- Session info
        COALESCE(ms.id, gen_random_uuid())::UUID as session_id,
        COALESCE(ms.prize_pool, 0)::NUMERIC as prize_pool,
        COALESCE(ms.participants_count, 0)::INTEGER as participants_count,
        COALESCE(ms.status, 'waiting')::TEXT as session_status,
        ms.timer_started_at::TIMESTAMPTZ,
        COALESCE(ms.timer_duration, 7200)::INTEGER as timer_duration,
        ms.winner_user_id::UUID,
        ms.winner_username::TEXT,
        ms.winner_score::NUMERIC,
        COALESCE(ms.winner_contacted, false)::BOOLEAN as winner_contacted,
        COALESCE(ms.rng_seed, floor(random() * 99999 + 1)::integer)::INTEGER as rng_seed,
        
        -- Participants as JSONB array
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', mp.id::TEXT,
                        'user_id', mp.user_id::TEXT,
                        'username', pu.username,
                        'entry_amount', mp.entry_amount,
                        'score', mp.score,
                        'accuracy', mp.accuracy,
                        'joined_at', mp.joined_at,
                        'completed_at', mp.completed_at
                    )
                    ORDER BY mp.joined_at ASC
                )
                FROM public.marketplace_participants mp
                LEFT JOIN public.users pu ON pu.id = mp.user_id
                WHERE mp.session_id = ms.id
            ),
            '[]'::jsonb
        )::JSONB as participants
        
    FROM public.marketplace_listings ml
    LEFT JOIN public.users u ON u.id = ml.seller_id
    LEFT JOIN public.marketplace_sessions ms ON ms.listing_id = ml.id
    WHERE 
        ml.status != 'deleted'
        AND (category_filter IS NULL OR ml.category = category_filter)
    ORDER BY 
        CASE 
            WHEN ms.status = 'active' THEN 1
            WHEN ms.status = 'waiting' THEN 2
            WHEN ms.status = 'completed' THEN 3
            ELSE 4
        END,
        ml.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_marketplace_listings(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_marketplace_listings(TEXT) TO anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category 
ON public.marketplace_listings(category) 
WHERE status != 'deleted';

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status_created 
ON public.marketplace_listings(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_listing 
ON public.marketplace_sessions(listing_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_participants_session 
ON public.marketplace_participants(session_id);

-- Test the function
SELECT 
    COUNT(*) as total_listings,
    category,
    session_status
FROM get_all_marketplace_listings(NULL)
GROUP BY category, session_status
ORDER BY category, session_status;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all listings are loadable
SELECT 
    'Total Listings' as info,
    COUNT(*) as count
FROM get_all_marketplace_listings(NULL);

-- Check by category
SELECT 
    'By Category' as info,
    category,
    COUNT(*) as count
FROM get_all_marketplace_listings(NULL)
GROUP BY category;

-- Check session status distribution
SELECT 
    'By Status' as info,
    session_status,
    COUNT(*) as count
FROM get_all_marketplace_listings(NULL)
GROUP BY session_status;

RAISE NOTICE '✅ Listings loading function updated successfully!';

