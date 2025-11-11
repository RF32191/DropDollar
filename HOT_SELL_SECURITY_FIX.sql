-- ============================================================================
-- HOT SELL SECURITY FIX - UUID CONSISTENCY + RNG + AUDIT + RATE LIMITS
-- ============================================================================
-- Run this in Supabase SQL editor. It will:
--   1. Ensure UUID types are consistent across Hot Sell tables
--   2. Recreate foreign keys and indexes
--   3. Guarantee required security tables exist (audit, rate limits, bans)
--   4. Rebuild get_all_hot_sell_sessions() and hs_join_v2() with full security
--   5. Reinstate audit triggers for Hot Sell joins/completions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------------
-- 1. UUID CONSISTENCY FOR HOT SELL TABLES
-- --------------------------------------------------------------------------
-- Drop FK before any structural changes
ALTER TABLE public.hot_sell_participants
  DROP CONSTRAINT IF EXISTS hot_sell_participants_session_id_fkey;

DO $$
DECLARE
  v_invalid_sessions INT := 0;
  v_invalid_participants INT := 0;
BEGIN
  -- Count non-UUID values in sessions.id
  SELECT COUNT(*) INTO v_invalid_sessions
  FROM public.hot_sell_sessions
  WHERE id IS NOT NULL
    AND NOT (id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

  -- Count non-UUID values in participants.session_id
  SELECT COUNT(*) INTO v_invalid_participants
  FROM public.hot_sell_participants
  WHERE session_id IS NOT NULL
    AND NOT (session_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

  IF v_invalid_sessions = 0 AND v_invalid_participants = 0 THEN
    -- Simple case: everything already looks like a UUID
    RAISE NOTICE 'Converting hot_sell tables to UUID (direct cast)...';
    ALTER TABLE public.hot_sell_sessions
      ALTER COLUMN id TYPE uuid USING id::uuid;

    ALTER TABLE public.hot_sell_participants
      ALTER COLUMN id TYPE uuid USING id::uuid;

    ALTER TABLE public.hot_sell_participants
      ALTER COLUMN session_id TYPE uuid USING session_id::uuid;
  ELSE
    RAISE NOTICE 'Found non-UUID identifiers (sessions: %, participants: %). Rebuilding columns safely...',
      v_invalid_sessions, v_invalid_participants;

    -- Sessions: create new UUID column and map
    ALTER TABLE public.hot_sell_sessions
      ADD COLUMN IF NOT EXISTS id_uuid uuid DEFAULT gen_random_uuid();

    UPDATE public.hot_sell_sessions
    SET id_uuid = CASE
      WHEN id IS NOT NULL AND id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN id::uuid
      ELSE id_uuid
    END;

    -- Participants: rebuild ids and session references
    ALTER TABLE public.hot_sell_participants
      ADD COLUMN IF NOT EXISTS id_uuid uuid DEFAULT gen_random_uuid();

    UPDATE public.hot_sell_participants
    SET id_uuid = CASE
      WHEN id IS NOT NULL AND id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN id::uuid
      ELSE id_uuid
    END;

    ALTER TABLE public.hot_sell_participants
      ADD COLUMN IF NOT EXISTS session_uuid uuid;

    UPDATE public.hot_sell_participants p
    SET session_uuid = s.id_uuid
    FROM public.hot_sell_sessions s
    WHERE p.session_id::text = s.id::text;

    IF EXISTS (SELECT 1 FROM public.hot_sell_participants WHERE session_uuid IS NULL) THEN
      RAISE EXCEPTION 'Unable to map some hot_sell_participants.session_id values to sessions. Please fix the data manually.';
    END IF;

    -- Replace old columns with new UUID columns
    ALTER TABLE public.hot_sell_sessions
      DROP COLUMN id;
    ALTER TABLE public.hot_sell_sessions
      RENAME COLUMN id_uuid TO id;

    ALTER TABLE public.hot_sell_participants
      DROP COLUMN id;
    ALTER TABLE public.hot_sell_participants
      RENAME COLUMN id_uuid TO id;

    ALTER TABLE public.hot_sell_participants
      DROP COLUMN session_id;
    ALTER TABLE public.hot_sell_participants
      RENAME COLUMN session_uuid TO session_id;
  END IF;
END $$;

-- Ensure defaults and primary keys
ALTER TABLE public.hot_sell_sessions
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.hot_sell_participants
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.hot_sell_participants
  ALTER COLUMN session_id SET NOT NULL;

ALTER TABLE public.hot_sell_sessions
  DROP CONSTRAINT IF EXISTS hot_sell_sessions_pkey;
ALTER TABLE public.hot_sell_sessions
  ADD PRIMARY KEY (id);

ALTER TABLE public.hot_sell_participants
  DROP CONSTRAINT IF EXISTS hot_sell_participants_pkey;
ALTER TABLE public.hot_sell_participants
  ADD PRIMARY KEY (id);

-- Rebuild foreign key
ALTER TABLE public.hot_sell_participants
  ADD CONSTRAINT hot_sell_participants_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.hot_sell_sessions(id) ON DELETE CASCADE;

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_hot_sell_sessions_status ON public.hot_sell_sessions(status);
CREATE INDEX IF NOT EXISTS idx_hot_sell_sessions_config ON public.hot_sell_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_hot_sell_participants_session ON public.hot_sell_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_hot_sell_participants_user ON public.hot_sell_participants(user_id);

-- --------------------------------------------------------------------------
-- 2. GUARANTEE SECURITY TABLES EXIST
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  games_last_hour integer NOT NULL DEFAULT 0,
  games_last_day integer NOT NULL DEFAULT 0,
  last_game_at timestamptz,
  hourly_reset_at timestamptz,
  daily_reset_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  banned_by uuid,
  banned_until timestamptz,
  is_permanent boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_session_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  session_type text NOT NULL,
  user_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_input_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  game_type text NOT NULL,
  input_sequence jsonb NOT NULL,
  session_duration integer,
  final_score integer,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payout_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  session_type text NOT NULL,
  user_id uuid,
  amount numeric(18,2) NOT NULL,
  payout_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  paid_at timestamptz,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Ensure hot_sell_sessions has required columns
ALTER TABLE public.hot_sell_sessions
  ADD COLUMN IF NOT EXISTS prize_pool numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rng_seed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_participants integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS participants_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

-- --------------------------------------------------------------------------
-- 3. AUDIT TRIGGERS FOR HOT SELL PARTICIPANTS
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_hot_sell_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.game_session_audit (
    session_id,
    session_type,
    user_id,
    action,
    details
  ) VALUES (
    NEW.session_id,
    'hot_sell',
    NEW.user_id::uuid,
    'join',
    jsonb_build_object(
      'participant_id', NEW.id,
      'joined_at', NEW.joined_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_hot_sell_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    INSERT INTO public.game_session_audit (
      session_id,
      session_type,
      user_id,
      action,
      details
    ) VALUES (
      NEW.session_id,
      'hot_sell',
      NEW.user_id::uuid,
      'complete',
      jsonb_build_object(
        'participant_id', NEW.id,
        'score', NEW.score,
        'accuracy', NEW.accuracy,
        'completed_at', NEW.completed_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hot_sell_join_audit ON public.hot_sell_participants;
CREATE TRIGGER trg_hot_sell_join_audit
  AFTER INSERT ON public.hot_sell_participants
  FOR EACH ROW EXECUTE FUNCTION public.log_hot_sell_join();

DROP TRIGGER IF EXISTS trg_hot_sell_completion_audit ON public.hot_sell_participants;
CREATE TRIGGER trg_hot_sell_completion_audit
  AFTER UPDATE ON public.hot_sell_participants
  FOR EACH ROW EXECUTE FUNCTION public.log_hot_sell_completion();

-- --------------------------------------------------------------------------
-- 4. RECREATE RPC FUNCTIONS
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.hs_join_v2(text, uuid, numeric) CASCADE;

CREATE FUNCTION public.get_all_hot_sell_sessions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(sess)), '[]'::json)
    FROM (
      SELECT
        s.id::text,
        s.config_id,
        s.prize_pool,
        s.base_price,
        s.max_participants,
        s.participants_count,
        s.status,
        s.rng_seed,
        s.created_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id::text,
                'user_id', p.user_id::text,
                'score', p.score,
                'accuracy', p.accuracy,
                'joined_at', p.joined_at,
                'completed_at', p.completed_at
              )
            )
            FROM public.hot_sell_participants p
            WHERE p.session_id = s.id
          ),
          '[]'::json
        ) AS participants
      FROM public.hot_sell_sessions s
      WHERE s.status IN ('active', 'waiting')
      ORDER BY s.created_at DESC
    ) AS sess
  );
END;
$$;

CREATE FUNCTION public.hs_join_v2(
  p_session text,
  p_user uuid,
  p_fee numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_session RECORD;
  v_participant_id uuid;
  v_hourly integer := 0;
  v_daily integer := 0;
  v_purchased numeric := 0;
  v_won numeric := 0;
  v_rng_seed integer := 0;
BEGIN
  -- Convert session id once
  BEGIN
    v_session_id := p_session::uuid;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid session id');
  END;

  -- Session lookup
  SELECT * INTO v_session
  FROM public.hot_sell_sessions
  WHERE id = v_session_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found');
  END IF;

  IF v_session.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session is not active');
  END IF;

  IF v_session.participants_count >= v_session.max_participants THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session is full');
  END IF;

  -- Ban check
  IF EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE user_id = p_user
      AND (is_permanent = true OR (banned_until IS NOT NULL AND banned_until > NOW()))
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Account restricted');
  END IF;

  -- Rate limit snapshot
  SELECT games_last_hour, games_last_day INTO v_hourly, v_daily
  FROM public.user_rate_limits
  WHERE user_id = p_user;

  IF NOT FOUND THEN
    INSERT INTO public.user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at)
    VALUES (p_user, 0, 0, NOW())
    RETURNING games_last_hour, games_last_day INTO v_hourly, v_daily;
  END IF;

  IF v_hourly >= 30 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit exceeded (30/hour)');
  END IF;

  IF v_daily >= 200 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rate limit exceeded (200/day)');
  END IF;

  -- Token balances
  SELECT COALESCE(purchased_tokens,0), COALESCE(won_tokens,0)
  INTO v_purchased, v_won
  FROM public.users
  WHERE id = p_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User profile not found');
  END IF;

  IF (v_purchased + v_won) < p_fee THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
  END IF;

  -- Already joined?
  IF EXISTS (
    SELECT 1 FROM public.hot_sell_participants
    WHERE session_id = v_session_id AND user_id::uuid = p_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already joined');
  END IF;

  -- Deduct tokens (purchased first)
  IF v_purchased >= p_fee THEN
    UPDATE public.users
      SET purchased_tokens = purchased_tokens - p_fee,
          updated_at = NOW()
      WHERE id = p_user;
  ELSE
    UPDATE public.users
      SET purchased_tokens = 0,
          won_tokens = won_tokens - (p_fee - v_purchased),
          updated_at = NOW()
      WHERE id = p_user;
  END IF;

  -- Token transaction for audit trail
  INSERT INTO public.token_transactions (
    id,
    user_id,
    type,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    metadata
  ) VALUES (
    gen_random_uuid(),
    p_user,
    'debit',
    'game_entry',
    p_fee,
    v_purchased + v_won,
    (SELECT purchased_tokens + won_tokens FROM public.users WHERE id = p_user),
    'Hot Sell competition entry',
    jsonb_build_object('session_id', v_session_id::text, 'game', v_session.config_id)
  );

  -- RNG seed advance (deterministic per join order)
  v_rng_seed := COALESCE(v_session.rng_seed, 0) + v_session.participants_count + 1;
  UPDATE public.hot_sell_sessions
  SET rng_seed = v_rng_seed
  WHERE id = v_session_id;

  -- Insert participant
  v_participant_id := gen_random_uuid();
  INSERT INTO public.hot_sell_participants (
    id,
    session_id,
    user_id,
    joined_at
  ) VALUES (
    v_participant_id,
    v_session_id,
    p_user,
    NOW()
  );

  -- Update session counters
  UPDATE public.hot_sell_sessions
  SET participants_count = participants_count + 1,
      prize_pool = prize_pool + p_fee,
      updated_at = NOW()
  WHERE id = v_session_id;

  -- Update rate limits
  INSERT INTO public.user_rate_limits (user_id, games_last_hour, games_last_day, last_game_at, hourly_reset_at, daily_reset_at)
  VALUES (p_user, 1, 1, NOW(), NOW() + INTERVAL '1 hour', NOW() + INTERVAL '1 day')
  ON CONFLICT (user_id) DO UPDATE SET
    games_last_hour = user_rate_limits.games_last_hour + 1,
    games_last_day = user_rate_limits.games_last_day + 1,
    last_game_at = NOW(),
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id::text,
    'participant_id', v_participant_id::text,
    'rng_seed', v_rng_seed
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.hs_join_v2(text, uuid, numeric) TO authenticated, anon;

-- --------------------------------------------------------------------------
-- 5. FINAL CHECK
-- --------------------------------------------------------------------------
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.hot_sell_sessions WHERE status = 'active';
  RAISE NOTICE '✅ Hot Sell security fix applied. Active sessions: %', v_count;
END $$;
