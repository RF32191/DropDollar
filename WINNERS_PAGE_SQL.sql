-- ============================================================================
-- CREATE WINNERS PAGE - SQL FUNCTIONS
-- ============================================================================
-- Functions to fetch winners from all game categories
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: Get Winner Takes All Winners
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_wta_winners(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  session_id UUID,
  config_id TEXT,
  game_title TEXT,
  game_type TEXT,
  winner_user_id UUID,
  winner_username TEXT,
  winner_score NUMERIC,
  winner_prize NUMERIC,
  platform_fee_amount NUMERIC,
  total_pot NUMERIC,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as session_id,
    s.config_id,
    c.title as game_title,
    c.game_type,
    s.winner_user_id,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as winner_username,
    p.score as winner_score,
    s.winner_prize,
    s.platform_fee_amount,
    s.prize_pool as total_pot,
    s.completed_at
  FROM public.winner_takes_all_sessions s
  INNER JOIN public.winner_takes_all_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.winner_user_id = u.id
  LEFT JOIN public.winner_takes_all_participants p ON p.session_id = s.id AND p.user_id = s.winner_user_id
  WHERE s.status = 'completed'
    AND s.winner_user_id IS NOT NULL
    AND s.winner_prize IS NOT NULL
  ORDER BY s.completed_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_wta_winners(INTEGER) TO authenticated, anon;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created get_wta_winners function';
END $$;

-- ============================================================================
-- FUNCTION 2: Get Hot Sell Winners
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_hot_sell_winners(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  session_id UUID,
  config_id TEXT,
  game_title TEXT,
  game_type TEXT,
  winner_user_id UUID,
  winner_username TEXT,
  winner_placement TEXT,
  winner_score NUMERIC,
  winner_prize NUMERIC,
  platform_fee NUMERIC,
  total_pot NUMERIC,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- First place winners
  SELECT 
    s.id as session_id,
    s.config_id,
    c.title as game_title,
    c.game_type,
    s.first_place_user_id as winner_user_id,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as winner_username,
    '1st Place' as winner_placement,
    p.score as winner_score,
    s.first_place_prize as winner_prize,
    s.platform_fee,
    s.prize_pool as total_pot,
    s.completed_at
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.first_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON p.session_id = s.id AND p.user_id = s.first_place_user_id
  WHERE s.status = 'completed'
    AND s.first_place_user_id IS NOT NULL
    AND s.first_place_prize IS NOT NULL
    AND s.first_place_prize > 0
  
  UNION ALL
  
  -- Second place winners
  SELECT 
    s.id as session_id,
    s.config_id,
    c.title as game_title,
    c.game_type,
    s.second_place_user_id as winner_user_id,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as winner_username,
    '2nd Place' as winner_placement,
    p.score as winner_score,
    s.second_place_prize as winner_prize,
    s.platform_fee,
    s.prize_pool as total_pot,
    s.completed_at
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.second_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON p.session_id = s.id AND p.user_id = s.second_place_user_id
  WHERE s.status = 'completed'
    AND s.second_place_user_id IS NOT NULL
    AND s.second_place_prize IS NOT NULL
    AND s.second_place_prize > 0
  
  UNION ALL
  
  -- Third place winners
  SELECT 
    s.id as session_id,
    s.config_id,
    c.title as game_title,
    c.game_type,
    s.third_place_user_id as winner_user_id,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player') as winner_username,
    '3rd Place' as winner_placement,
    p.score as winner_score,
    s.third_place_prize as winner_prize,
    s.platform_fee,
    s.prize_pool as total_pot,
    s.completed_at
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.third_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON p.session_id = s.id AND p.user_id = s.third_place_user_id
  WHERE s.status = 'completed'
    AND s.third_place_user_id IS NOT NULL
    AND s.third_place_prize IS NOT NULL
    AND s.third_place_prize > 0
  
  ORDER BY completed_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hot_sell_winners(INTEGER) TO authenticated, anon;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created get_hot_sell_winners function';
END $$;

-- ============================================================================
-- FUNCTION 3: Get Coin Play Winners (Placeholder for future)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_coin_play_winners(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  session_id UUID,
  game_title TEXT,
  winner_user_id UUID,
  winner_username TEXT,
  winner_prize NUMERIC,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Placeholder - return empty for now
  RETURN QUERY
  SELECT 
    NULL::UUID as session_id,
    ''::TEXT as game_title,
    NULL::UUID as winner_user_id,
    ''::TEXT as winner_username,
    0::NUMERIC as winner_prize,
    NULL::TIMESTAMPTZ as completed_at
  WHERE FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coin_play_winners(INTEGER) TO authenticated, anon;

-- ============================================================================
-- FUNCTION 4: Get 1v1 Winners (Placeholder for future)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_1v1_winners(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  match_id UUID,
  game_title TEXT,
  winner_user_id UUID,
  winner_username TEXT,
  loser_username TEXT,
  winner_prize NUMERIC,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Placeholder - return empty for now
  RETURN QUERY
  SELECT 
    NULL::UUID as match_id,
    ''::TEXT as game_title,
    NULL::UUID as winner_user_id,
    ''::TEXT as winner_username,
    ''::TEXT as loser_username,
    0::NUMERIC as winner_prize,
    NULL::TIMESTAMPTZ as completed_at
  WHERE FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_1v1_winners(INTEGER) TO authenticated, anon;

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ WINNERS PAGE SQL FUNCTIONS CREATED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Available Functions:';
  RAISE NOTICE '- get_wta_winners(limit) → Winner Takes All winners';
  RAISE NOTICE '- get_hot_sell_winners(limit) → Hot Sell winners (all placements)';
  RAISE NOTICE '- get_coin_play_winners(limit) → Coin Play winners (placeholder)';
  RAISE NOTICE '- get_1v1_winners(limit) → 1v1 winners (placeholder)';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Testing Winner Takes All winners:';
END $$;

-- Test the function
SELECT 
  game_title,
  winner_username,
  winner_score,
  '$' || winner_prize::TEXT as prize,
  completed_at
FROM get_wta_winners(5);

DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE 'Testing Hot Sell winners:';
END $$;

-- Test the function
SELECT 
  game_title,
  winner_username,
  winner_placement,
  winner_score,
  '$' || winner_prize::TEXT as prize,
  completed_at
FROM get_hot_sell_winners(5);

DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '🎮 Winners Page SQL is ready!';
  RAISE NOTICE ' ';
END $$;

