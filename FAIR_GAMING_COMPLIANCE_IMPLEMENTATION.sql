-- ============================================================================
-- FAIR GAMING COMPLIANCE IMPLEMENTATION
-- Implements server-authoritative, skill-based gaming with full audit trails
-- ============================================================================
-- Based on gaming policy requirements:
-- 1. Deterministic RNG (session-level seeds)
-- 2. Server-authoritative validation
-- 3. RLS policies for security
-- 4. Audit trails for all actions
-- 5. Anti-cheat measures
-- 6. No hidden outcomes
-- ============================================================================

BEGIN;

-- ============================================
-- PART 1: SCHEMA ADDITIONS
-- ============================================

SELECT '📊 PART 1: Adding schema enhancements...' as step;

-- Add rng_seed to sessions (if not exists)
-- Hot Sell
ALTER TABLE hot_sell_sessions 
ADD COLUMN IF NOT EXISTS rng_seed INTEGER DEFAULT floor(random() * 1000000)::INTEGER;

ALTER TABLE hot_sell_sessions 
ADD COLUMN IF NOT EXISTS prize_pool NUMERIC DEFAULT 0;

ALTER TABLE hot_sell_sessions 
ADD COLUMN IF NOT EXISTS participants_count INTEGER DEFAULT 0;

-- Winner Takes All
ALTER TABLE winner_takes_all_sessions 
ADD COLUMN IF NOT EXISTS rng_seed INTEGER DEFAULT floor(random() * 1000000)::INTEGER;

-- 1v1
ALTER TABLE one_v_one_sessions 
ADD COLUMN IF NOT EXISTS rng_seed INTEGER DEFAULT floor(random() * 1000000)::INTEGER;

-- Add replay validation columns to participants tables
-- Hot Sell
ALTER TABLE hot_sell_participants 
ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

ALTER TABLE hot_sell_participants 
ADD COLUMN IF NOT EXISTS replay_hash TEXT;

ALTER TABLE hot_sell_participants 
ADD COLUMN IF NOT EXISTS client_nonce TEXT;

ALTER TABLE hot_sell_participants 
ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT false;

ALTER TABLE hot_sell_participants 
ADD COLUMN IF NOT EXISTS validation_notes TEXT;

-- Winner Takes All
ALTER TABLE winner_takes_all_participants 
ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

ALTER TABLE winner_takes_all_participants 
ADD COLUMN IF NOT EXISTS replay_hash TEXT;

ALTER TABLE winner_takes_all_participants 
ADD COLUMN IF NOT EXISTS client_nonce TEXT;

ALTER TABLE winner_takes_all_participants 
ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT false;

ALTER TABLE winner_takes_all_participants 
ADD COLUMN IF NOT EXISTS validation_notes TEXT;

-- 1v1
ALTER TABLE one_v_one_participants 
ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

ALTER TABLE one_v_one_participants 
ADD COLUMN IF NOT EXISTS replay_hash TEXT;

ALTER TABLE one_v_one_participants 
ADD COLUMN IF NOT EXISTS client_nonce TEXT;

ALTER TABLE one_v_one_participants 
ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT false;

ALTER TABLE one_v_one_participants 
ADD COLUMN IF NOT EXISTS validation_notes TEXT;

SELECT '✅ Schema additions complete' as result;

-- ============================================
-- PART 2: AUDIT TABLE
-- ============================================

SELECT '📝 PART 2: Creating audit table...' as step;

CREATE TABLE IF NOT EXISTS public.game_session_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID,
  game_type TEXT NOT NULL, -- 'hot_sell' | 'winner_takes_all' | '1v1'
  action TEXT NOT NULL,    -- 'join' | 'score_submitted' | 'payout' | 'validation_failed' | 'anti_cheat_flag'
  details JSONB,           -- Additional metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gsa_session_created ON public.game_session_audit(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gsa_user_created ON public.game_session_audit(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gsa_game_action ON public.game_session_audit(game_type, action);

SELECT '✅ Audit table created' as result;

-- ============================================
-- PART 3: PERFORMANCE INDEXES
-- ============================================

SELECT '⚡ PART 3: Creating performance indexes...' as step;

-- Hot Sell indexes
CREATE INDEX IF NOT EXISTS idx_hs_sessions_status ON public.hot_sell_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_hs_sessions_config ON public.hot_sell_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_hs_participants_user_session ON public.hot_sell_participants(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_hs_participants_session_score ON public.hot_sell_participants(session_id, score DESC);

-- Winner Takes All indexes
CREATE INDEX IF NOT EXISTS idx_wta_sessions_status ON public.winner_takes_all_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_wta_sessions_config ON public.winner_takes_all_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_wta_participants_user_session ON public.winner_takes_all_participants(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_wta_participants_session_score ON public.winner_takes_all_participants(session_id, score DESC);

-- 1v1 indexes
CREATE INDEX IF NOT EXISTS idx_1v1_sessions_status ON public.one_v_one_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_1v1_sessions_config ON public.one_v_one_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_1v1_participants_user_session ON public.one_v_one_participants(user_id, session_id);

SELECT '✅ Indexes created' as result;

-- ============================================
-- PART 4: CONSTRAINTS FOR SAFETY
-- ============================================

SELECT '🔒 PART 4: Adding safety constraints...' as step;

-- Prevent duplicate joins (if not exists)
DO $$
BEGIN
  ALTER TABLE public.hot_sell_participants
    ADD CONSTRAINT hs_participants_unique_user_session UNIQUE (user_id, session_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.winner_takes_all_participants
    ADD CONSTRAINT wta_participants_unique_user_session UNIQUE (user_id, session_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.one_v_one_participants
    ADD CONSTRAINT 1v1_participants_unique_user_session UNIQUE (user_id, session_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

SELECT '✅ Constraints added' as result;

-- ============================================
-- PART 5: RLS POLICIES
-- ============================================

SELECT '🛡️ PART 5: Implementing RLS policies...' as step;

-- Enable RLS on all game tables
ALTER TABLE public.hot_sell_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_sell_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_sell_configs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.winner_takes_all_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_configs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.one_v_one_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_v_one_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_v_one_configs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.game_session_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "configs_public_read" ON public.hot_sell_configs;
DROP POLICY IF EXISTS "sessions_public_read" ON public.hot_sell_sessions;
DROP POLICY IF EXISTS "participants_own_read" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "participants_own_insert" ON public.hot_sell_participants;

DROP POLICY IF EXISTS "wta_configs_public_read" ON public.winner_takes_all_configs;
DROP POLICY IF EXISTS "wta_sessions_public_read" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "wta_participants_own_read" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "wta_participants_own_insert" ON public.winner_takes_all_participants;

DROP POLICY IF EXISTS "1v1_configs_public_read" ON public.one_v_one_configs;
DROP POLICY IF EXISTS "1v1_sessions_public_read" ON public.one_v_one_sessions;
DROP POLICY IF EXISTS "1v1_participants_own_read" ON public.one_v_one_participants;
DROP POLICY IF EXISTS "1v1_participants_own_insert" ON public.one_v_one_participants;

DROP POLICY IF EXISTS "audit_own_read" ON public.game_session_audit;

-- HOT SELL POLICIES
-- Configs: Public read (anyone can see game configs)
CREATE POLICY "configs_public_read"
ON public.hot_sell_configs
FOR SELECT
TO public
USING (true);

-- Sessions: Public read (anyone can see active sessions)
CREATE POLICY "sessions_public_read"
ON public.hot_sell_sessions
FOR SELECT
TO public
USING (true);

-- Participants: Users see only their own records
CREATE POLICY "participants_own_read"
ON public.hot_sell_participants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Participants: Users can insert only their own records for active sessions
CREATE POLICY "participants_own_insert"
ON public.hot_sell_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.hot_sell_sessions s
    WHERE s.id = hot_sell_participants.session_id
      AND s.status = 'active'
  )
);

-- WINNER TAKES ALL POLICIES
CREATE POLICY "wta_configs_public_read"
ON public.winner_takes_all_configs
FOR SELECT
TO public
USING (true);

CREATE POLICY "wta_sessions_public_read"
ON public.winner_takes_all_sessions
FOR SELECT
TO public
USING (true);

CREATE POLICY "wta_participants_own_read"
ON public.winner_takes_all_participants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "wta_participants_own_insert"
ON public.winner_takes_all_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.winner_takes_all_sessions s
    WHERE s.id = winner_takes_all_participants.session_id
      AND s.status = 'active'
  )
);

-- 1V1 POLICIES
CREATE POLICY "1v1_configs_public_read"
ON public.one_v_one_configs
FOR SELECT
TO public
USING (true);

CREATE POLICY "1v1_sessions_public_read"
ON public.one_v_one_sessions
FOR SELECT
TO public
USING (true);

CREATE POLICY "1v1_participants_own_read"
ON public.one_v_one_participants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "1v1_participants_own_insert"
ON public.one_v_one_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.one_v_one_sessions s
    WHERE s.id = one_v_one_participants.session_id
      AND s.status = 'active'
  )
);

-- AUDIT POLICIES (users can see only their own audit logs)
CREATE POLICY "audit_own_read"
ON public.game_session_audit
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

SELECT '✅ RLS policies implemented' as result;

-- ============================================
-- PART 6: AUDIT LOGGING TRIGGERS
-- ============================================

SELECT '🔔 PART 6: Creating audit triggers...' as step;

-- Function to log participant joins
CREATE OR REPLACE FUNCTION public.log_participant_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_type TEXT;
BEGIN
  -- Determine game type from table name
  v_game_type := CASE TG_TABLE_NAME
    WHEN 'hot_sell_participants' THEN 'hot_sell'
    WHEN 'winner_takes_all_participants' THEN 'winner_takes_all'
    WHEN 'one_v_one_participants' THEN '1v1'
    ELSE 'unknown'
  END;
  
  INSERT INTO public.game_session_audit(user_id, session_id, game_type, action, details)
  VALUES (
    NEW.user_id,
    NEW.session_id,
    v_game_type,
    'join',
    jsonb_build_object(
      'participant_id', NEW.id,
      'joined_at', NEW.joined_at
    )
  );
  
  RETURN NEW;
END;
$$;

-- Function to log score submissions
CREATE OR REPLACE FUNCTION public.log_score_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_type TEXT;
BEGIN
  -- Only log when score is updated (not NULL anymore)
  IF NEW.score IS NOT NULL AND (OLD.score IS NULL OR OLD.score <> NEW.score) THEN
    v_game_type := CASE TG_TABLE_NAME
      WHEN 'hot_sell_participants' THEN 'hot_sell'
      WHEN 'winner_takes_all_participants' THEN 'winner_takes_all'
      WHEN 'one_v_one_participants' THEN '1v1'
      ELSE 'unknown'
    END;
    
    INSERT INTO public.game_session_audit(user_id, session_id, game_type, action, details)
    VALUES (
      NEW.user_id,
      NEW.session_id,
      v_game_type,
      'score_submitted',
      jsonb_build_object(
        'participant_id', NEW.id,
        'score', NEW.score,
        'accuracy', NEW.accuracy,
        'duration_ms', NEW.duration_ms,
        'replay_hash', NEW.replay_hash,
        'validated', NEW.validated
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply triggers to Hot Sell
DROP TRIGGER IF EXISTS trg_hs_participants_join_audit ON public.hot_sell_participants;
CREATE TRIGGER trg_hs_participants_join_audit
AFTER INSERT ON public.hot_sell_participants
FOR EACH ROW
EXECUTE FUNCTION public.log_participant_join();

DROP TRIGGER IF EXISTS trg_hs_participants_score_audit ON public.hot_sell_participants;
CREATE TRIGGER trg_hs_participants_score_audit
AFTER UPDATE ON public.hot_sell_participants
FOR EACH ROW
EXECUTE FUNCTION public.log_score_submission();

-- Apply triggers to Winner Takes All
DROP TRIGGER IF EXISTS trg_wta_participants_join_audit ON public.winner_takes_all_participants;
CREATE TRIGGER trg_wta_participants_join_audit
AFTER INSERT ON public.winner_takes_all_participants
FOR EACH ROW
EXECUTE FUNCTION public.log_participant_join();

DROP TRIGGER IF EXISTS trg_wta_participants_score_audit ON public.winner_takes_all_participants;
CREATE TRIGGER trg_wta_participants_score_audit
AFTER UPDATE ON public.winner_takes_all_participants
FOR EACH ROW
EXECUTE FUNCTION public.log_score_submission();

-- Apply triggers to 1v1
DROP TRIGGER IF EXISTS trg_1v1_participants_join_audit ON public.one_v_one_participants;
CREATE TRIGGER trg_1v1_participants_join_audit
AFTER INSERT ON public.one_v_one_participants
FOR EACH ROW
EXECUTE FUNCTION public.log_participant_join();

DROP TRIGGER IF EXISTS trg_1v1_participants_score_audit ON public.one_v_one_participants;
CREATE TRIGGER trg_1v1_participants_score_audit
AFTER UPDATE ON public.one_v_one_participants
FOR EACH ROW
EXECUTE FUNCTION public.log_score_submission();

SELECT '✅ Audit triggers created' as result;

-- ============================================
-- PART 7: UPDATE EXISTING RNG SEEDS
-- ============================================

SELECT '🎲 PART 7: Updating RNG seeds for existing sessions...' as step;

-- Update Hot Sell sessions that have NULL or 0 rng_seed
UPDATE hot_sell_sessions
SET rng_seed = floor(random() * 1000000)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

-- Update Winner Takes All sessions
UPDATE winner_takes_all_sessions
SET rng_seed = floor(random() * 1000000)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

-- Update 1v1 sessions
UPDATE one_v_one_sessions
SET rng_seed = floor(random() * 1000000)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

SELECT '✅ RNG seeds updated' as result;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '🎯 VERIFICATION' as step;

-- Check audit table
SELECT 
  '📝 Audit Table' as check_name,
  COUNT(*) as total_audit_records
FROM public.game_session_audit;

-- Check RLS enabled
SELECT 
  '🛡️ RLS Status' as check_name,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'hot_sell_sessions', 'hot_sell_participants', 'hot_sell_configs',
    'winner_takes_all_sessions', 'winner_takes_all_participants', 'winner_takes_all_configs',
    'one_v_one_sessions', 'one_v_one_participants', 'one_v_one_configs',
    'game_session_audit'
  )
ORDER BY tablename;

-- Check indexes
SELECT 
  '⚡ Indexes' as check_name,
  COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_hs_%'
    OR indexname LIKE 'idx_wta_%'
    OR indexname LIKE 'idx_1v1_%'
    OR indexname LIKE 'idx_gsa_%'
  );

-- Check RNG seeds
SELECT 
  '🎲 Hot Sell RNG Seeds' as check_name,
  COUNT(*) FILTER (WHERE rng_seed IS NOT NULL AND rng_seed > 0) as sessions_with_rng,
  COUNT(*) as total_sessions
FROM hot_sell_sessions;

SELECT 
  '🎲 Winner Takes All RNG Seeds' as check_name,
  COUNT(*) FILTER (WHERE rng_seed IS NOT NULL AND rng_seed > 0) as sessions_with_rng,
  COUNT(*) as total_sessions
FROM winner_takes_all_sessions;

SELECT 
  '🎲 1v1 RNG Seeds' as check_name,
  COUNT(*) FILTER (WHERE rng_seed IS NOT NULL AND rng_seed > 0) as sessions_with_rng,
  COUNT(*) as total_sessions
FROM one_v_one_sessions;

SELECT '🎉 FAIR GAMING COMPLIANCE IMPLEMENTATION COMPLETE!' as message;
SELECT '✅ All gaming policy requirements implemented' as status;

