-- Blind Scoreboard + 1v1 + Token Payouts System
-- PostgreSQL Schema for DropDollar Platform

-- Users and Wallet (extending existing system)
CREATE TABLE IF NOT EXISTS app_user (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wallet for token balance
CREATE TABLE IF NOT EXISTS wallet (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES app_user(id) UNIQUE,
  balance       BIGINT NOT NULL DEFAULT 0, -- in "tokens" smallest unit
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Double-entry ledger for payouts and entries
CREATE TABLE IF NOT EXISTS ledger_entry (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES app_user(id),
  match_id      UUID, -- nullable for generic adjustments
  amount        BIGINT NOT NULL, -- positive credit, negative debit
  reason        TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,   -- to prevent duplicates on retry
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Game Listing (banner) - extends existing hot-sell system
CREATE TABLE IF NOT EXISTS listing (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  game_key           TEXT NOT NULL,   -- identifier e.g. "laser_dodge", "multi_target_reaction"
  required_players   INT  NOT NULL CHECK (required_players >= 2),
  entry_cost_tokens  BIGINT NOT NULL DEFAULT 0,
  visibility         TEXT NOT NULL DEFAULT 'PUBLIC', -- PUBLIC/PRIVATE
  state              TEXT NOT NULL DEFAULT 'OPEN',    -- OPEN, FILLED, CANCELLED
  creator_user_id    UUID REFERENCES app_user(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Who joined which listing (queue to form a match)
CREATE TABLE IF NOT EXISTS listing_join (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES listing(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES app_user(id),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

-- Match (instantiated when listing fills)
CREATE TABLE IF NOT EXISTS match (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID NOT NULL REFERENCES listing(id),
  state           TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  scores_visible  BOOLEAN NOT NULL DEFAULT FALSE,
  required_players INT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at    TIMESTAMPTZ
);

-- Participants inside a match
CREATE TABLE IF NOT EXISTS match_participant (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES app_user(id),
  score          BIGINT,               -- null until submitted
  submitted_at   TIMESTAMPTZ,
  is_winner      BOOLEAN,
  UNIQUE(match_id, user_id)
);

-- Guard rail: one score per participant
CREATE UNIQUE INDEX IF NOT EXISTS ux_score_once ON match_participant(match_id, user_id)
WHERE score IS NOT NULL;

-- Fast checks
CREATE INDEX IF NOT EXISTS idx_mp_match ON match_participant(match_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entry(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_state ON listing(state);
CREATE INDEX IF NOT EXISTS idx_match_state ON match(state);

-- Balance maintenance trigger
CREATE OR REPLACE FUNCTION apply_ledger_to_wallet()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wallet
    SET balance = balance + NEW.amount,
        updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_ledger ON ledger_entry;
CREATE TRIGGER trg_apply_ledger
AFTER INSERT ON ledger_entry
FOR EACH ROW EXECUTE FUNCTION apply_ledger_to_wallet();

-- Function to create a listing
CREATE OR REPLACE FUNCTION create_listing(
  p_title TEXT,
  p_game_key TEXT,
  p_required_players INT,
  p_entry_cost_tokens BIGINT DEFAULT 0,
  p_creator_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  listing_id UUID;
BEGIN
  INSERT INTO listing (title, game_key, required_players, entry_cost_tokens, creator_user_id)
  VALUES (p_title, p_game_key, p_required_players, p_entry_cost_tokens, p_creator_user_id)
  RETURNING id INTO listing_id;
  
  RETURN listing_id;
END;
$$ LANGUAGE plpgsql;

-- Function to join a listing
CREATE OR REPLACE FUNCTION join_listing(
  p_listing_id UUID,
  p_user_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  listing_record RECORD;
  joined_count INT;
  match_id UUID;
  idem_key TEXT;
BEGIN
  -- Generate idempotency key if not provided
  idem_key := COALESCE(p_idempotency_key, 'join:' || p_user_id::TEXT || ':' || p_listing_id::TEXT);
  
  -- Get listing info
  SELECT * INTO listing_record FROM listing WHERE id = p_listing_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Listing not found');
  END IF;
  
  IF listing_record.state != 'OPEN' THEN
    RETURN json_build_object('error', 'Listing not open');
  END IF;
  
  -- Deduct entry cost if applicable
  IF listing_record.entry_cost_tokens > 0 THEN
    INSERT INTO ledger_entry (user_id, match_id, amount, reason, idempotency_key)
    VALUES (p_user_id, NULL, -listing_record.entry_cost_tokens, 'entry:' || p_listing_id::TEXT, idem_key)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  
  -- Join the listing
  INSERT INTO listing_join (listing_id, user_id)
  VALUES (p_listing_id, p_user_id)
  ON CONFLICT (listing_id, user_id) DO NOTHING;
  
  -- Check if listing is full
  SELECT COUNT(*)::INT INTO joined_count FROM listing_join WHERE listing_id = p_listing_id;
  
  IF joined_count >= listing_record.required_players THEN
    -- Create match
    UPDATE listing SET state = 'FILLED' WHERE id = p_listing_id;
    
    INSERT INTO match (listing_id, state, required_players)
    VALUES (p_listing_id, 'IN_PROGRESS', listing_record.required_players)
    RETURNING id INTO match_id;
    
    -- Add participants
    INSERT INTO match_participant (match_id, user_id)
    SELECT match_id, lj.user_id FROM listing_join lj WHERE lj.listing_id = p_listing_id;
    
    -- Clear joins
    DELETE FROM listing_join WHERE listing_id = p_listing_id;
    
    RETURN json_build_object('status', 'FILLED', 'matchId', match_id, 'joinedCount', joined_count);
  END IF;
  
  RETURN json_build_object('status', 'JOINED', 'joinedCount', joined_count);
END;
$$ LANGUAGE plpgsql;

-- Function to submit a score
CREATE OR REPLACE FUNCTION submit_score(
  p_match_id UUID,
  p_user_id UUID,
  p_score BIGINT
)
RETURNS JSON AS $$
DECLARE
  participant_record RECORD;
  remaining_count INT;
BEGIN
  -- Verify participant and match state
  SELECT mp.*, m.state, m.required_players
  INTO participant_record
  FROM match_participant mp
  JOIN match m ON m.id = mp.match_id
  WHERE mp.match_id = p_match_id AND mp.user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Not in this match');
  END IF;
  
  IF participant_record.state != 'IN_PROGRESS' THEN
    RETURN json_build_object('error', 'Match not accepting scores');
  END IF;
  
  IF participant_record.score IS NOT NULL THEN
    RETURN json_build_object('error', 'Score already submitted');
  END IF;
  
  -- Submit score
  UPDATE match_participant
  SET score = p_score, submitted_at = now()
  WHERE id = participant_record.id;
  
  -- Check if all scores submitted
  SELECT COUNT(*)::INT INTO remaining_count
  FROM match_participant
  WHERE match_id = p_match_id AND score IS NULL;
  
  IF remaining_count = 0 THEN
    RETURN json_build_object('status', 'SUBMITTED_AND_READY_TO_FINALIZE');
  END IF;
  
  RETURN json_build_object('status', 'SUBMITTED');
END;
$$ LANGUAGE plpgsql;

-- Function to finalize a match
CREATE OR REPLACE FUNCTION finalize_match(
  p_match_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  match_record RECORD;
  participants RECORD[];
  top_score BIGINT;
  winners UUID[];
  pot BIGINT;
  each_amount BIGINT;
  remainder BIGINT;
  i INT;
  idem_key TEXT;
BEGIN
  -- Generate idempotency key if not provided
  idem_key := COALESCE(p_idempotency_key, 'finalize:' || p_match_id::TEXT || ':' || now()::TEXT);
  
  -- Advisory lock to serialize finalize
  PERFORM pg_advisory_xact_lock(hashtext(p_match_id::TEXT));
  
  -- Get match info
  SELECT * INTO match_record FROM match WHERE id = p_match_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Match not found');
  END IF;
  
  IF match_record.state = 'COMPLETED' THEN
    RETURN json_build_object('status', 'ALREADY_COMPLETED');
  END IF;
  
  -- Get participants ordered by score
  SELECT ARRAY_AGG(ROW(mp.*)) INTO participants
  FROM match_participant mp
  WHERE mp.match_id = p_match_id
  ORDER BY mp.score DESC;
  
  -- Check all scores submitted
  IF EXISTS (SELECT 1 FROM unnest(participants) p WHERE p.score IS NULL) THEN
    RETURN json_build_object('error', 'Not all scores submitted');
  END IF;
  
  -- Determine winners (highest score)
  top_score := participants[1].score;
  winners := ARRAY(SELECT p.user_id FROM unnest(participants) p WHERE p.score = top_score);
  
  -- Calculate pot from entry costs
  SELECT COALESCE(SUM(-amount), 0) INTO pot
  FROM ledger_entry
  WHERE match_id IS NULL AND reason = 'entry:' || match_record.listing_id::TEXT;
  
  -- Split pot among winners
  each_amount := pot / GREATEST(1, array_length(winners, 1));
  remainder := pot - each_amount * array_length(winners, 1);
  
  -- Create payouts
  FOR i IN 1..array_length(winners, 1) LOOP
    IF i = 1 THEN
      -- First winner gets remainder
      INSERT INTO ledger_entry (user_id, match_id, amount, reason, idempotency_key)
      VALUES (winners[i], p_match_id, each_amount + remainder, 'payout:' || p_match_id::TEXT, idem_key || ':' || winners[i]::TEXT)
      ON CONFLICT (idempotency_key) DO NOTHING;
    ELSE
      INSERT INTO ledger_entry (user_id, match_id, amount, reason, idempotency_key)
      VALUES (winners[i], p_match_id, each_amount, 'payout:' || p_match_id::TEXT, idem_key || ':' || winners[i]::TEXT)
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END LOOP;
  
  -- Mark winners
  UPDATE match_participant
  SET is_winner = TRUE
  WHERE match_id = p_match_id AND user_id = ANY(winners);
  
  -- Complete match
  UPDATE match
  SET state = 'COMPLETED', scores_visible = TRUE, finalized_at = now()
  WHERE id = p_match_id;
  
  RETURN json_build_object(
    'status', 'COMPLETED',
    'winners', winners,
    'pot', pot,
    'each', each_amount
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get scoreboard (only when scores visible)
CREATE OR REPLACE FUNCTION get_scoreboard(p_match_id UUID)
RETURNS JSON AS $$
DECLARE
  match_record RECORD;
  scoreboard_data JSON;
BEGIN
  -- Check if scores are visible
  SELECT * INTO match_record FROM match WHERE id = p_match_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Match not found');
  END IF;
  
  IF NOT match_record.scores_visible THEN
    RETURN json_build_object('error', 'Scores are hidden until match completes');
  END IF;
  
  -- Get scoreboard data
  SELECT json_agg(
    json_build_object(
      'user_id', mp.user_id,
      'score', mp.score,
      'is_winner', mp.is_winner,
      'submitted_at', mp.submitted_at
    ) ORDER BY mp.score DESC
  ) INTO scoreboard_data
  FROM match_participant mp
  WHERE mp.match_id = p_match_id;
  
  RETURN json_build_object('scoreboard', scoreboard_data);
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO app_user (id, username, email) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'player1', 'player1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'player2', 'player2@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'player3', 'player3@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'player4', 'player4@test.com')
ON CONFLICT (id) DO NOTHING;

-- Initialize wallets
INSERT INTO wallet (user_id, balance) VALUES 
  ('11111111-1111-1111-1111-111111111111', 1000),
  ('22222222-2222-2222-2222-222222222222', 1000),
  ('33333333-3333-3333-3333-333333333333', 1000),
  ('44444444-4444-4444-4444-444444444444', 1000)
ON CONFLICT (user_id) DO NOTHING;

-- Create sample listings
INSERT INTO listing (title, game_key, required_players, entry_cost_tokens) VALUES 
  ('1v1 Laser Dodge', 'laser_dodge', 2, 10),
  ('4-Player Multi Target', 'multi_target_reaction', 4, 5),
  ('1v1 Sword Parry', 'sword_parry', 2, 15)
ON CONFLICT DO NOTHING;
