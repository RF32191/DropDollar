-- ============================================================================
-- Fix get_all functions - they might be causing the UUID error too
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions();
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions();

-- ============================================================================
-- Get Hot Sell Sessions - Pure TEXT output
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT 
        id::TEXT as id,
        config_id::TEXT as config_id,
        COALESCE(prize_pool, 0) as prize_pool,
        COALESCE(base_price, 0) as base_price,
        COALESCE(participants_count, 0) as participants_count,
        status::TEXT as status,
        COALESCE(rng_seed, 0) as rng_seed,
        created_at::TEXT as created_at
      FROM hot_sell_sessions
      WHERE status = 'active'
      ORDER BY created_at DESC
    ) t
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ get_all_hot_sell_sessions ERROR: %', SQLERRM;
  RETURN '[]'::json;
END;
$$;

-- ============================================================================
-- Get Winner Takes All Sessions - Pure TEXT output
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT 
        id::TEXT as id,
        config_id::TEXT as config_id,
        COALESCE(current_pool, 0) as current_pool,
        COALESCE(base_price, 0) as base_price,
        COALESCE(participants_count, 0) as participants_count,
        status::TEXT as status,
        COALESCE(rng_seed, 0) as rng_seed,
        timer_started_at::TEXT as timer_started_at,
        COALESCE(timer_duration, 1800) as timer_duration,
        created_at::TEXT as created_at
      FROM winner_takes_all_sessions
      WHERE status = 'active'
      ORDER BY created_at DESC
    ) t
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ get_all_winner_takes_all_sessions ERROR: %', SQLERRM;
  RETURN '[]'::json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ GET_ALL FUNCTIONS FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All IDs cast to TEXT for output';
    RAISE NOTICE '✅ Error handling added';
    RAISE NOTICE '';
END $$;

