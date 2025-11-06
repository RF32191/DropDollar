-- ============================================================================
-- VERIFY AND CREATE ALL SKILL-BASED GAMING FEATURES
-- This ensures EVERYTHING exists and nothing is missing
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 VERIFYING SKILL-BASED GAMING FEATURES';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 1: VERIFY/CREATE TABLES
-- ============================================================================

-- 1. Game Sessions Table (Anti-Cheat Core)
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  listing_id TEXT,
  entry_number INTEGER,
  competition_type TEXT,
  rng_seed INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'invalid', 'under_review')),
  server_score DECIMAL(10,2),
  client_score DECIMAL(10,2),
  accuracy DECIMAL(5,2),
  avg_reaction_time INTEGER,
  input_count INTEGER,
  duration_ms INTEGER,
  suspicion_score INTEGER DEFAULT 0,
  invalid_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT
);

DO $$ BEGIN RAISE NOTICE '✅ game_sessions table verified'; END $$;

-- 2. Anti-Cheat Logs Table
CREATE TABLE IF NOT EXISTS public.anti_cheat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES public.game_sessions(session_id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  suspicion_score INTEGER NOT NULL,
  reasons TEXT[] NOT NULL,
  client_score DECIMAL(10,2),
  server_score DECIMAL(10,2),
  input_rate DECIMAL(10,2),
  avg_reaction_time INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action_taken TEXT CHECK (action_taken IN ('none', 'warning', 'banned', 'cleared', 'prize_withheld')),
  admin_notes TEXT
);

DO $$ BEGIN RAISE NOTICE '✅ anti_cheat_logs table verified'; END $$;

-- 3. User Rate Limits Table
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  games_last_hour INTEGER DEFAULT 0,
  games_last_day INTEGER DEFAULT 0,
  last_game_at TIMESTAMPTZ DEFAULT NOW(),
  hourly_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  daily_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ user_rate_limits table verified'; END $$;

-- 4. Payout Audit Trail Table
CREATE TABLE IF NOT EXISTS public.payout_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_session_id TEXT REFERENCES public.game_sessions(session_id) ON DELETE SET NULL,
  game_type TEXT NOT NULL,
  prize_amount DECIMAL(10,2) NOT NULL,
  tokens_awarded DECIMAL(10,2) NOT NULL,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('pending', 'approved', 'rejected', 'under_review')),
  suspicion_score INTEGER DEFAULT 0,
  admin_reviewer UUID REFERENCES public.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

DO $$ BEGIN RAISE NOTICE '✅ payout_audit_trail table verified'; END $$;

-- 5. Token Transactions Table
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  transaction_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  description TEXT,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ token_transactions table verified'; END $$;

-- ============================================================================
-- PART 2: ADD MISSING COLUMNS
-- ============================================================================

-- Add RNG seeds to config tables
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_sell_configs' AND column_name = 'rng_seed') THEN
    ALTER TABLE public.hot_sell_configs ADD COLUMN rng_seed INTEGER NOT NULL DEFAULT floor(random() * 2147483647)::INTEGER;
    RAISE NOTICE '✅ Added rng_seed to hot_sell_configs';
  ELSE
    RAISE NOTICE '✓ rng_seed already exists in hot_sell_configs';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_configs' AND column_name = 'rng_seed') THEN
    ALTER TABLE public.winner_takes_all_configs ADD COLUMN rng_seed INTEGER NOT NULL DEFAULT floor(random() * 2147483647)::INTEGER;
    RAISE NOTICE '✅ Added rng_seed to winner_takes_all_configs';
  ELSE
    RAISE NOTICE '✓ rng_seed already exists in winner_takes_all_configs';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'one_v_one_configs' AND column_name = 'rng_seed') THEN
    ALTER TABLE public.one_v_one_configs ADD COLUMN rng_seed INTEGER NOT NULL DEFAULT floor(random() * 2147483647)::INTEGER;
    RAISE NOTICE '✅ Added rng_seed to one_v_one_configs';
  ELSE
    RAISE NOTICE '✓ rng_seed already exists in one_v_one_configs';
  END IF;

  -- Add RNG seeds to session tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_sell_sessions' AND column_name = 'rng_seed') THEN
    ALTER TABLE public.hot_sell_sessions ADD COLUMN rng_seed INTEGER DEFAULT floor(random() * 2147483647)::INTEGER;
    RAISE NOTICE '✅ Added rng_seed to hot_sell_sessions';
  ELSE
    RAISE NOTICE '✓ rng_seed already exists in hot_sell_sessions';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winner_takes_all_sessions' AND column_name = 'rng_seed') THEN
    ALTER TABLE public.winner_takes_all_sessions ADD COLUMN rng_seed INTEGER DEFAULT floor(random() * 2147483647)::INTEGER;
    RAISE NOTICE '✅ Added rng_seed to winner_takes_all_sessions';
  ELSE
    RAISE NOTICE '✓ rng_seed already exists in winner_takes_all_sessions';
  END IF;

  -- Add dual wallet columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'purchased_tokens') THEN
    ALTER TABLE public.users ADD COLUMN purchased_tokens DECIMAL(10,2) DEFAULT 0;
    RAISE NOTICE '✅ Added purchased_tokens to users';
  ELSE
    RAISE NOTICE '✓ purchased_tokens already exists in users';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'won_tokens') THEN
    ALTER TABLE public.users ADD COLUMN won_tokens DECIMAL(10,2) DEFAULT 0;
    RAISE NOTICE '✅ Added won_tokens to users';
  ELSE
    RAISE NOTICE '✓ won_tokens already exists in users';
  END IF;
END $$;

-- ============================================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON public.game_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_session_id ON public.game_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_suspicion ON public.game_sessions(suspicion_score DESC) WHERE suspicion_score > 60;

CREATE INDEX IF NOT EXISTS idx_anti_cheat_user ON public.anti_cheat_logs(user_id, flagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_score ON public.anti_cheat_logs(suspicion_score DESC);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_pending ON public.anti_cheat_logs(flagged_at DESC) WHERE reviewed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON public.token_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_audit_user ON public.payout_audit_trail(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_audit_status ON public.payout_audit_trail(validation_status, created_at DESC);

DO $$ BEGIN RAISE NOTICE '✅ All indexes created'; END $$;

-- ============================================================================
-- PART 4: VERIFY CRITICAL FUNCTIONS EXIST
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Verifying critical functions...';
    
    -- Check join_hot_sell_session
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'join_hot_sell_session'
    AND n.nspname = 'public';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ join_hot_sell_session exists';
    ELSE
        RAISE NOTICE '❌ join_hot_sell_session MISSING - RUN SECURE_FIX_WITH_ANTI_CHEAT.sql!';
    END IF;
    
    -- Check join_winner_takes_all_session
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'join_winner_takes_all_session'
    AND n.nspname = 'public';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ join_winner_takes_all_session exists';
    ELSE
        RAISE NOTICE '❌ join_winner_takes_all_session MISSING - RUN SECURE_FIX_WITH_ANTI_CHEAT.sql!';
    END IF;
    
    -- Check get_all functions
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname IN ('get_all_hot_sell_sessions', 'get_all_winner_takes_all_sessions')
    AND n.nspname = 'public';
    
    IF v_count >= 2 THEN
        RAISE NOTICE '✅ get_all session functions exist';
    ELSE
        RAISE NOTICE '❌ get_all session functions MISSING - RUN SECURE_FIX_WITH_ANTI_CHEAT.sql!';
    END IF;
END $$;

-- ============================================================================
-- PART 5: GRANT NECESSARY PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.game_sessions TO authenticated, anon;
GRANT SELECT ON public.anti_cheat_logs TO authenticated, anon;
GRANT SELECT ON public.user_rate_limits TO authenticated, anon;
GRANT SELECT ON public.payout_audit_trail TO authenticated, anon;
GRANT SELECT ON public.token_transactions TO authenticated, anon;

DO $$ BEGIN RAISE NOTICE '✅ Permissions granted'; END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
DECLARE
    v_has_game_sessions BOOLEAN;
    v_has_anti_cheat BOOLEAN;
    v_has_rate_limits BOOLEAN;
    v_has_payout_audit BOOLEAN;
    v_has_token_transactions BOOLEAN;
    v_has_join_functions BOOLEAN;
    v_has_rng_seeds BOOLEAN;
    v_has_dual_wallet BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 SKILL-BASED GAMING FEATURE STATUS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Check tables
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_sessions') INTO v_has_game_sessions;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'anti_cheat_logs') INTO v_has_anti_cheat;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_rate_limits') INTO v_has_rate_limits;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payout_audit_trail') INTO v_has_payout_audit;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'token_transactions') INTO v_has_token_transactions;
    
    -- Check functions
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE p.proname IN ('join_hot_sell_session', 'join_winner_takes_all_session') 
        AND n.nspname = 'public'
    ) INTO v_has_join_functions;
    
    -- Check RNG seeds
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hot_sell_sessions' AND column_name = 'rng_seed'
    ) INTO v_has_rng_seeds;
    
    -- Check dual wallet
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name IN ('purchased_tokens', 'won_tokens')
    ) INTO v_has_dual_wallet;
    
    RAISE NOTICE '🛡️ ANTI-CHEAT SYSTEM:';
    RAISE NOTICE '  % game_sessions table', CASE WHEN v_has_game_sessions THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  % anti_cheat_logs table', CASE WHEN v_has_anti_cheat THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  % RNG seeding', CASE WHEN v_has_rng_seeds THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    
    RAISE NOTICE '📊 COMPLIANCE & AUDIT:';
    RAISE NOTICE '  % payout_audit_trail table', CASE WHEN v_has_payout_audit THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  % token_transactions table', CASE WHEN v_has_token_transactions THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    
    RAISE NOTICE '🎮 FAIR PLAY:';
    RAISE NOTICE '  % user_rate_limits table', CASE WHEN v_has_rate_limits THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  % dual wallet system', CASE WHEN v_has_dual_wallet THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    
    RAISE NOTICE '⚙️ GAME FUNCTIONS:';
    RAISE NOTICE '  % join_session functions', CASE WHEN v_has_join_functions THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    
    IF v_has_game_sessions AND v_has_anti_cheat AND v_has_rate_limits AND v_has_payout_audit 
       AND v_has_token_transactions AND v_has_join_functions AND v_has_rng_seeds AND v_has_dual_wallet THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '🎉 ALL FEATURES VERIFIED - SYSTEM READY!';
        RAISE NOTICE '========================================';
    ELSE
        RAISE NOTICE '========================================';
        RAISE NOTICE '⚠️ SOME FEATURES MISSING';
        RAISE NOTICE 'RUN: SECURE_FIX_WITH_ANTI_CHEAT.sql';
        RAISE NOTICE '========================================';
    END IF;
END $$;

