-- ============================================================================
-- FIX LOGIN AND PERFORMANCE ISSUES
-- ============================================================================

-- Check if users table has necessary columns
SELECT 'Checking users table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check auth.users vs public.users sync
SELECT 'Checking auth vs public users sync:' as info;
SELECT 
  COUNT(DISTINCT au.id) as auth_users,
  COUNT(DISTINCT pu.id) as public_users,
  COUNT(DISTINCT CASE WHEN pu.id IS NULL THEN au.id END) as missing_in_public
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id;

-- Fix: Ensure all auth.users have public.users entries
DO $$
DECLARE
  v_auth_user RECORD;
  v_count INT := 0;
BEGIN
  RAISE NOTICE '🔧 Syncing auth.users to public.users...';
  
  FOR v_auth_user IN
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.users (
        id,
        email,
        username,
        purchased_tokens,
        won_tokens,
        created_at,
        updated_at
      ) VALUES (
        v_auth_user.id,
        v_auth_user.email,
        split_part(v_auth_user.email, '@', 1),
        0,
        0,
        NOW(),
        NOW()
      );
      
      v_count := v_count + 1;
      RAISE NOTICE '  ✅ Created public user for %', v_auth_user.email;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '  ⚠️  Could not create user %: %', v_auth_user.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Synced % users', v_count;
END $$;

-- Add indexes for performance
DO $$
BEGIN
  RAISE NOTICE '🚀 Creating performance indexes...';
  
  -- Users table indexes
  CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
  CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
  
  -- Session indexes
  CREATE INDEX IF NOT EXISTS idx_hot_sell_sessions_status ON public.hot_sell_sessions(status);
  CREATE INDEX IF NOT EXISTS idx_hot_sell_sessions_config ON public.hot_sell_sessions(config_id);
  CREATE INDEX IF NOT EXISTS idx_wta_sessions_status ON public.winner_takes_all_sessions(status);
  CREATE INDEX IF NOT EXISTS idx_wta_sessions_config ON public.winner_takes_all_sessions(config_id);
  
  -- Participant indexes
  CREATE INDEX IF NOT EXISTS idx_hot_sell_participants_session ON public.hot_sell_participants(session_id);
  CREATE INDEX IF NOT EXISTS idx_hot_sell_participants_user ON public.hot_sell_participants(user_id);
  CREATE INDEX IF NOT EXISTS idx_wta_participants_session ON public.winner_takes_all_participants(session_id);
  CREATE INDEX IF NOT EXISTS idx_wta_participants_user ON public.winner_takes_all_participants(user_id);
  
  -- Token transactions index
  CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON public.token_transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_token_transactions_created ON public.token_transactions(created_at DESC);
  
  -- Rate limits index
  CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user ON public.user_rate_limits(user_id);
  
  RAISE NOTICE '✅ Performance indexes created';
END $$;

-- Optimize get_all functions to be faster
DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;
CREATE FUNCTION public.get_all_hot_sell_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        s.id,
        s.config_id,
        s.prize_pool,
        s.base_price,
        s.participants_count,
        s.max_participants,
        s.status,
        s.rng_seed,
        s.created_at,
        '[]'::json as participants
      FROM public.hot_sell_sessions s
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 50
    ) t
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;
CREATE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        s.id,
        s.config_id,
        s.current_pool,
        s.base_price,
        s.participants_count,
        s.max_participants,
        s.status,
        s.rng_seed,
        s.created_at,
        '[]'::json as participants
      FROM public.winner_takes_all_sessions s
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 50
    ) t
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;

-- Summary
DO $$
DECLARE
  v_auth_count INT;
  v_public_count INT;
BEGIN
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  SELECT COUNT(*) INTO v_public_count FROM public.users;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ LOGIN & PERFORMANCE FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Auth users: %', v_auth_count;
  RAISE NOTICE 'Public users: %', v_public_count;
  RAISE NOTICE '';
  
  IF v_auth_count = v_public_count THEN
    RAISE NOTICE '✅ All users synced!';
  ELSE
    RAISE NOTICE '⚠️  User count mismatch - some users may have issues';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Performance indexes added';
  RAISE NOTICE '✅ Functions optimized';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Try logging in now - should be faster!';
  RAISE NOTICE '';
END $$;

