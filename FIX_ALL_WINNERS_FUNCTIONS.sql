-- ============================================================================
-- FIX ALL WINNERS PAGE FUNCTIONS
-- Ensures all game types show winners properly
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '🏆 Fixing all Winners Page functions...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 1. WINNER TAKES ALL
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
    s.id::UUID,
    s.config_id::TEXT,
    c.title::TEXT,
    c.game_type::TEXT,
    s.winner_user_id::UUID,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT,
    COALESCE(p.score, 0)::NUMERIC,
    s.winner_prize::NUMERIC,
    s.platform_fee_amount::NUMERIC,
    s.prize_pool::NUMERIC,
    s.completed_at::TIMESTAMPTZ
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
DO $$ BEGIN RAISE NOTICE '✅ Winner Takes All function fixed'; END $$;

-- ============================================================================
-- 2. HOT SELL
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
  -- 1st place
  SELECT 
    s.id::UUID,
    s.config_id::TEXT,
    c.title::TEXT,
    c.game_type::TEXT,
    s.first_place_user_id::UUID,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT,
    '1st Place'::TEXT,
    COALESCE(p.score, 0)::NUMERIC,
    s.first_place_prize::NUMERIC,
    s.platform_fee::NUMERIC,
    s.prize_pool::NUMERIC,
    s.completed_at::TIMESTAMPTZ
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.first_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON (p.session_id = s.id AND p.user_id::UUID = s.first_place_user_id)
  WHERE s.status = 'completed'
    AND s.first_place_user_id IS NOT NULL
    AND s.first_place_prize IS NOT NULL
  
  UNION ALL
  
  -- 2nd place
  SELECT 
    s.id::UUID,
    s.config_id::TEXT,
    c.title::TEXT,
    c.game_type::TEXT,
    s.second_place_user_id::UUID,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT,
    '2nd Place'::TEXT,
    COALESCE(p.score, 0)::NUMERIC,
    s.second_place_prize::NUMERIC,
    s.platform_fee::NUMERIC,
    s.prize_pool::NUMERIC,
    s.completed_at::TIMESTAMPTZ
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.second_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON (p.session_id = s.id AND p.user_id::UUID = s.second_place_user_id)
  WHERE s.status = 'completed'
    AND s.second_place_user_id IS NOT NULL
    AND s.second_place_prize IS NOT NULL
  
  UNION ALL
  
  -- 3rd place
  SELECT 
    s.id::UUID,
    s.config_id::TEXT,
    c.title::TEXT,
    c.game_type::TEXT,
    s.third_place_user_id::UUID,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT,
    '3rd Place'::TEXT,
    COALESCE(p.score, 0)::NUMERIC,
    s.third_place_prize::NUMERIC,
    s.platform_fee::NUMERIC,
    s.prize_pool::NUMERIC,
    s.completed_at::TIMESTAMPTZ
  FROM public.hot_sell_sessions s
  INNER JOIN public.hot_sell_configs c ON s.config_id = c.id
  LEFT JOIN public.users u ON s.third_place_user_id = u.id
  LEFT JOIN public.hot_sell_participants p ON (p.session_id = s.id AND p.user_id::UUID = s.third_place_user_id)
  WHERE s.status = 'completed'
    AND s.third_place_user_id IS NOT NULL
    AND s.third_place_prize IS NOT NULL
  
  ORDER BY completed_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hot_sell_winners(INTEGER) TO authenticated, anon;
DO $$ BEGIN RAISE NOTICE '✅ Hot Sell function fixed'; END $$;

-- ============================================================================
-- 3. COIN PLAY
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
    s.id::UUID,
    s.config_id::TEXT,
    (c.game_type || ' - $' || c.prize_pool::TEXT)::TEXT,
    c.game_type::TEXT,
    s.winner_user_id::UUID,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'Player')::TEXT,
    COALESCE(p.score, 0)::NUMERIC,
    s.winner_prize::NUMERIC,
    s.platform_fee::NUMERIC,
    s.prize_pool::NUMERIC,
    s.completed_at::TIMESTAMPTZ
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
DO $$ BEGIN RAISE NOTICE '✅ Coin Play function fixed'; END $$;

-- ============================================================================
-- 4. 1V1 BATTLES
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
    s.id::UUID,
    s.config_id::TEXT,
    c.title::TEXT,
    c.game_type::TEXT,
    s.winner_user_id::UUID,
    COALESCE(winner_u.username, SPLIT_PART(winner_u.email, '@', 1), 'Winner')::TEXT,
    COALESCE(loser_u.username, SPLIT_PART(loser_u.email, '@', 1), 'Opponent')::TEXT,
    COALESCE(winner_p.score, 0)::NUMERIC,
    COALESCE(loser_p.score, 0)::NUMERIC,
    s.prize_amount::NUMERIC,
    s.platform_fee::NUMERIC,
    s.prize_pool::NUMERIC,
    s.completed_at::TIMESTAMPTZ
  FROM public.one_v_one_sessions s
  INNER JOIN public.one_v_one_configs c ON s.config_id = c.id
  LEFT JOIN public.users winner_u ON s.winner_user_id = winner_u.id
  LEFT JOIN public.one_v_one_participants winner_p ON (winner_p.session_id = s.id AND winner_p.user_id = s.winner_user_id)
  LEFT JOIN public.one_v_one_participants loser_p ON (loser_p.session_id = s.id AND loser_p.user_id != s.winner_user_id)
  LEFT JOIN public.users loser_u ON loser_p.user_id = loser_u.id
  WHERE s.status = 'completed'
    AND s.winner_user_id IS NOT NULL
    AND s.prize_amount IS NOT NULL
  ORDER BY s.completed_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_1v1_winners(INTEGER) TO authenticated, anon;
DO $$ BEGIN RAISE NOTICE '✅ 1v1 function fixed'; END $$;

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
  -- Count completed games
  SELECT COUNT(*) INTO wta_count FROM winner_takes_all_sessions WHERE status = 'completed' AND winner_user_id IS NOT NULL;
  SELECT COUNT(*) INTO hs_count FROM hot_sell_sessions WHERE status = 'completed' AND first_place_user_id IS NOT NULL;
  SELECT COUNT(*) INTO cp_count FROM coin_play_sessions WHERE status = 'completed' AND winner_user_id IS NOT NULL;
  SELECT COUNT(*) INTO v1_count FROM one_v_one_sessions WHERE status = 'completed' AND winner_user_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 WINNERS PAGE FUNCTIONS - VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Completed Games with Winners:';
  RAISE NOTICE '  - Winner Takes All: %', wta_count;
  RAISE NOTICE '  - Hot Sell: %', hs_count;
  RAISE NOTICE '  - Coin Play: %', cp_count;
  RAISE NOTICE '  - 1v1 Battles: %', v1_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ All Winners Page functions updated!';
  RAISE NOTICE '🏆 Winners Hall will now display all game types!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

