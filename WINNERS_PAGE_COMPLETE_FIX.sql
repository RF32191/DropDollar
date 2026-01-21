-- ============================================================================
-- 🏆 WINNERS PAGE - COMPLETE FIX FOR ALL GAME MODES
-- ============================================================================
-- This creates SQL functions to fetch winners for:
-- ✅ Winner Takes All
-- ✅ Hot Sell (1st, 2nd, 3rd place)
-- ✅ Coin Play
-- ✅ 1v1
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🏆 Setting up Winners Page SQL functions...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FUNCTION 1: WINNER TAKES ALL WINNERS
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_wta_winners(INTEGER) CASCADE;

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
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT as winner_username,
    p.score::NUMERIC as winner_score,
    s.winner_prize,
    s.platform_fee_amount,
    s.prize_pool::NUMERIC as total_pot,
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

DO $$ BEGIN RAISE NOTICE '✅ Winner Takes All winners function created'; END $$;

-- ============================================================================
-- FUNCTION 2: HOT SELL WINNERS (1st, 2nd, 3rd)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_hot_sell_winners(INTEGER) CASCADE;

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
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT as winner_username,
    '1st Place'::TEXT as winner_placement,
    p.score::NUMERIC as winner_score,
    s.first_place_prize as winner_prize,
    s.platform_fee,
    s.prize_pool as total_pot,
    s.completed_at
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.first_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON p.session_id = s.id AND p.user_id = u.id::TEXT
  WHERE s.status = 'completed'
    AND s.first_place_user_id IS NOT NULL
    AND s.first_place_prize IS NOT NULL
  
  UNION ALL
  
  -- Second place winners
  SELECT 
    s.id as session_id,
    s.config_id,
    c.title as game_title,
    c.game_type,
    s.second_place_user_id as winner_user_id,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT as winner_username,
    '2nd Place'::TEXT as winner_placement,
    p.score::NUMERIC as winner_score,
    s.second_place_prize as winner_prize,
    s.platform_fee,
    s.prize_pool as total_pot,
    s.completed_at
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.second_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON p.session_id = s.id AND p.user_id = u.id::TEXT
  WHERE s.status = 'completed'
    AND s.second_place_user_id IS NOT NULL
    AND s.second_place_prize IS NOT NULL
  
  UNION ALL
  
  -- Third place winners
  SELECT 
    s.id as session_id,
    s.config_id,
    c.title as game_title,
    c.game_type,
    s.third_place_user_id as winner_user_id,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT as winner_username,
    '3rd Place'::TEXT as winner_placement,
    p.score::NUMERIC as winner_score,
    s.third_place_prize as winner_prize,
    s.platform_fee,
    s.prize_pool as total_pot,
    s.completed_at
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.third_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON p.session_id = s.id AND p.user_id = u.id::TEXT
  WHERE s.status = 'completed'
    AND s.third_place_user_id IS NOT NULL
    AND s.third_place_prize IS NOT NULL
  
  ORDER BY completed_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hot_sell_winners(INTEGER) TO authenticated, anon;

DO $$ BEGIN RAISE NOTICE '✅ Hot Sell winners function created'; END $$;

-- ============================================================================
-- FUNCTION 3: COIN PLAY WINNERS
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_coin_play_winners(INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.get_coin_play_winners(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  session_id UUID,
  config_id TEXT,
  game_title TEXT,
  game_type TEXT,
  winner_user_id UUID,
  winner_username TEXT,
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
  SELECT 
    s.id as session_id,
    s.config_id,
    c.game_type || ' - $' || c.prize_pool::TEXT as game_title,
    c.game_type,
    s.winner_user_id,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT as winner_username,
    p.score::NUMERIC as winner_score,
    s.winner_prize,
    s.platform_fee,
    s.prize_pool as total_pot,
    s.completed_at
  FROM public.coin_play_sessions s
  INNER JOIN public.coin_play_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.winner_user_id = u.id
  LEFT JOIN public.coin_play_participants p ON p.session_id = s.id AND p.user_id = s.winner_user_id
  WHERE s.status = 'completed'
    AND s.winner_user_id IS NOT NULL
    AND s.winner_prize IS NOT NULL
  ORDER BY s.completed_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coin_play_winners(INTEGER) TO authenticated, anon;

DO $$ BEGIN RAISE NOTICE '✅ Coin Play winners function created'; END $$;

-- ============================================================================
-- FUNCTION 4: 1V1 WINNERS
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_1v1_winners(INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.get_1v1_winners(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  match_id UUID,
  config_id TEXT,
  game_title TEXT,
  game_type TEXT,
  winner_user_id UUID,
  winner_username TEXT,
  loser_username TEXT,
  winner_score NUMERIC,
  loser_score NUMERIC,
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
  SELECT 
    s.id as match_id,
    s.config_id,
    c.title as game_title,
    c.game_type,
    s.winner_user_id,
    COALESCE(winner_u.username, SPLIT_PART(winner_u.email, '@', 1), 'Player')::TEXT as winner_username,
    COALESCE(loser_u.username, SPLIT_PART(loser_u.email, '@', 1), 'Player')::TEXT as loser_username,
    winner_p.score::NUMERIC as winner_score,
    loser_p.score::NUMERIC as loser_score,
    s.prize_amount as winner_prize,
    s.platform_fee,
    s.prize_pool as total_pot,
    s.completed_at
  FROM public.one_v_one_sessions s
  INNER JOIN public.one_v_one_configs c ON s.config_id = c.id
  LEFT JOIN public.users winner_u ON s.winner_user_id = winner_u.id
  LEFT JOIN public.one_v_one_participants winner_p ON winner_p.session_id = s.id AND winner_p.user_id = s.winner_user_id
  LEFT JOIN public.one_v_one_participants loser_p ON loser_p.session_id = s.id AND loser_p.user_id != s.winner_user_id
  LEFT JOIN public.users loser_u ON loser_p.user_id = loser_u.id
  WHERE s.status = 'completed'
    AND s.winner_user_id IS NOT NULL
    AND s.prize_amount IS NOT NULL
  ORDER BY s.completed_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_1v1_winners(INTEGER) TO authenticated, anon;

DO $$ BEGIN RAISE NOTICE '✅ 1v1 winners function created'; END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$ 
DECLARE
  wta_count INTEGER;
  hs_count INTEGER;
  cp_count INTEGER;
  v1_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '📊 VERIFICATION REPORT';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  
  -- Count completed games for each mode
  SELECT COUNT(*) INTO wta_count FROM public.winner_takes_all_sessions WHERE status = 'completed' AND winner_user_id IS NOT NULL;
  SELECT COUNT(*) INTO hs_count FROM public.hot_sell_sessions WHERE status = 'completed' AND first_place_user_id IS NOT NULL;
  SELECT COUNT(*) INTO cp_count FROM public.coin_play_sessions WHERE status = 'completed' AND winner_user_id IS NOT NULL;
  SELECT COUNT(*) INTO v1_count FROM public.one_v_one_sessions WHERE status = 'completed' AND winner_user_id IS NOT NULL;
  
  RAISE NOTICE '🎮 Completed Games:';
  RAISE NOTICE '  - Winner Takes All: %', wta_count;
  RAISE NOTICE '  - Hot Sell: %', hs_count;
  RAISE NOTICE '  - Coin Play: %', cp_count;
  RAISE NOTICE '  - 1v1: %', v1_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ All Winners Page functions created successfully!';
  RAISE NOTICE '🏆 Winners Hall is ready!';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;

