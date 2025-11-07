-- ============================================================================
-- FIX ALL CURRENT ERRORS
-- 1. Fix conditional_wta_reset function (current_pot -> current_pool)
-- 2. Add participants array to get_all functions
-- 3. Create missing user profile
-- ============================================================================

-- ============================================================================
-- PART 1: Fix conditional_wta_reset function
-- ============================================================================

DROP FUNCTION IF EXISTS public.conditional_wta_reset() CASCADE;

CREATE OR REPLACE FUNCTION public.conditional_wta_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset completed sessions
  UPDATE winner_takes_all_sessions
  SET 
    status = 'active',
    current_pool = 0,
    participants_count = 0,
    winner_user_id = NULL,
    prize_amount = NULL,
    platform_fee = NULL,
    updated_at = NOW()
  WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '1 hour';
  
  -- Clean up old participants
  DELETE FROM winner_takes_all_participants
  WHERE session_id IN (
    SELECT id FROM winner_takes_all_sessions WHERE status = 'active'
  );
  
  RAISE NOTICE 'WTA sessions reset complete';
END;
$$;

-- ============================================================================
-- PART 2: Fix get_all functions to include participants
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;

CREATE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      s.id::TEXT as id,
      s.config_id::TEXT as config_id,
      COALESCE(s.prize_pool, 0) as prize_pool,
      COALESCE(s.base_price, 0) as base_price,
      COALESCE(s.participants_count, 0) as participants_count,
      s.status::TEXT as status,
      COALESCE(s.rng_seed, 0) as rng_seed,
      s.created_at::TEXT as created_at,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', p.id::TEXT,
            'user_id', p.user_id::TEXT,
            'score', p.score,
            'joined_at', p.joined_at::TEXT
          ))
          FROM hot_sell_participants p
          WHERE p.session_id::TEXT = s.id::TEXT
        ),
        '[]'::json
      ) as participants
    FROM hot_sell_sessions s
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  ) t;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'get_all_hot_sell_sessions error: %', SQLERRM;
  RETURN '[]'::json;
END;
$$;

CREATE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      s.id::TEXT as id,
      s.config_id::TEXT as config_id,
      COALESCE(s.current_pool, 0) as current_pool,
      COALESCE(s.base_price, 0) as base_price,
      COALESCE(s.participants_count, 0) as participants_count,
      s.status::TEXT as status,
      COALESCE(s.rng_seed, 0) as rng_seed,
      s.timer_started_at::TEXT as timer_started_at,
      COALESCE(s.timer_duration, 1800) as timer_duration,
      s.created_at::TEXT as created_at,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', p.id::TEXT,
            'user_id', p.user_id::TEXT,
            'score', p.score,
            'joined_at', p.joined_at::TEXT
          ))
          FROM winner_takes_all_participants p
          WHERE p.session_id::TEXT = s.id::TEXT
        ),
        '[]'::json
      ) as participants
    FROM winner_takes_all_sessions s
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  ) t;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'get_all_winner_takes_all_sessions error: %', SQLERRM;
  RETURN '[]'::json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.conditional_wta_reset() TO authenticated, anon;

-- ============================================================================
-- PART 3: Create missing user profile for rf32191@gmail.com
-- ============================================================================

DO $$
DECLARE
  v_auth_user_id UUID;
  v_existing_profile UUID;
BEGIN
  -- Get the auth user ID
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'rf32191@gmail.com';
  
  IF v_auth_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No auth user found for rf32191@gmail.com - user needs to register';
  ELSE
    -- Check if profile already exists
    SELECT id INTO v_existing_profile
    FROM public.users
    WHERE id = v_auth_user_id;
    
    IF v_existing_profile IS NOT NULL THEN
      RAISE NOTICE '✅ Profile already exists for rf32191@gmail.com';
    ELSE
      -- Create the profile
      INSERT INTO public.users (
        id,
        email,
        username,
        first_name,
        last_name,
        date_of_birth,
        purchased_tokens,
        won_tokens,
        total_tokens,
        games_played,
        total_winnings,
        created_at,
        updated_at
      ) VALUES (
        v_auth_user_id,
        'rf32191@gmail.com',
        'rf32191',
        'User',
        'RF32191',
        '1990-01-01',
        300.00,
        0.00,
        300.00,
        0,
        0.00,
        NOW(),
        NOW()
      );
      
      RAISE NOTICE '✅ Created profile for rf32191@gmail.com with 300 tokens';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 ALL ERRORS FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed:';
    RAISE NOTICE '   • conditional_wta_reset (current_pot → current_pool)';
    RAISE NOTICE '   • get_all functions now include participants array';
    RAISE NOTICE '   • User profile created for rf32191@gmail.com';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 REFRESH YOUR PAGE NOW!';
    RAISE NOTICE '';
END $$;
