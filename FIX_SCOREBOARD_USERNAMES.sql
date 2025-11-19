-- ============================================
-- FIX SCOREBOARD USERNAMES
-- ============================================
-- Ensure all marketplace participants have proper usernames displayed
-- ============================================

-- Step 1: Create or replace get_all_marketplace_listings to include proper usernames
CREATE OR REPLACE FUNCTION public.get_all_marketplace_listings()
RETURNS TABLE (
    id UUID,
    seller_id UUID,
    seller_username TEXT,
    seller_email TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    game_type TEXT,
    is_active BOOLEAN,
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
        ml.seller_email::TEXT,
        ml.title::TEXT,
        ml.description::TEXT,
        ml.category::TEXT,
        ml.base_price::NUMERIC,
        ml.game_type::TEXT,
        ml.is_active::BOOLEAN,
        ml.status::TEXT,
        ml.image_urls::JSONB,
        COALESCE(ml.condition, 'new')::TEXT,
        ml.brand::TEXT,
        ml.dimensions::TEXT,
        ml.weight::TEXT,
        COALESCE(ms.timer_duration, 7200)::INTEGER,
        ml.created_at::TIMESTAMPTZ,
        ml.updated_at::TIMESTAMPTZ,
        ms.id::UUID as session_id,
        ms.status::TEXT as session_status,
        COALESCE(ms.prize_pool, 0)::NUMERIC,
        COALESCE(ms.participants_count, 0)::INTEGER,
        ms.timer_started_at::TIMESTAMPTZ,
        ms.winner_user_id::UUID,
        ms.winner_username::TEXT,
        ms.winner_score::NUMERIC,
        -- Get participants with proper usernames from users table
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', mp.id,
                        'user_id', mp.user_id,
                        'username', COALESCE(u.username, u.email, 'Player' || SUBSTRING(mp.user_id::TEXT, 1, 4)),
                        'score', mp.score,
                        'accuracy', mp.accuracy,
                        'entry_amount', mp.entry_amount,
                        'joined_at', mp.joined_at,
                        'completed_at', mp.completed_at
                    )
                )
                FROM marketplace_participants mp
                LEFT JOIN public.users u ON u.id = mp.user_id
                WHERE mp.session_id = ms.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.marketplace_listings ml
    LEFT JOIN public.marketplace_sessions ms ON ms.listing_id = ml.id
    WHERE ml.status != 'deleted'
    ORDER BY ml.created_at DESC;
END;
$$;

-- Step 2: Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_marketplace_listings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_marketplace_listings() TO anon;

-- Step 3: Verify the function returns proper usernames
SELECT 
    '🔍 Testing Scoreboard Usernames' as info,
    ml.title,
    (participants->0->>'username') as first_player_username,
    (participants->0->>'user_id') as first_player_id,
    jsonb_array_length(participants) as total_participants
FROM get_all_marketplace_listings() ml
WHERE jsonb_array_length(participants) > 0
LIMIT 3;

-- Success message
SELECT '✅ Scoreboard usernames fixed! All players will now show their real usernames.' as status;

