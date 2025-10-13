-- ========================================
-- DROPDOLLAR QUICK SETUP
-- Run this in Supabase SQL Editor
-- This creates everything you need!
-- ========================================

-- 0. CREATE TOURNAMENTS TABLE (if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    game_type TEXT NOT NULL,
    entry_fee INTEGER NOT NULL CHECK (entry_fee > 0),
    prize_pool DECIMAL(10, 2) NOT NULL CHECK (prize_pool > 0),
    max_players INTEGER NOT NULL CHECK (max_players > 0),
    current_players INTEGER DEFAULT 0 CHECK (current_players >= 0),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    prize_distribution JSONB,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tournament_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    entry_fee INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    attempts_used INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    rng_seed INTEGER,
    final_rank INTEGER,
    prize_won DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_game_type ON tournaments(game_type);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament ON tournament_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_user ON tournament_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_score ON tournament_entries(score DESC);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON tournaments;
DROP POLICY IF EXISTS "Tournament entries are viewable by everyone" ON tournament_entries;

-- Create RLS Policies
CREATE POLICY "Tournaments are viewable by everyone" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Tournament entries are viewable by everyone" ON tournament_entries FOR SELECT USING (true);


-- 1. ADD 100 TOKENS TO YOUR ACCOUNT
-- ========================================
UPDATE users 
SET tokens = tokens + 100,
    updated_at = NOW()
WHERE email = 'ryanfermoselle@yahoo.com';

-- Record the transaction
INSERT INTO token_transactions (user_id, amount, type, description, balance_before, balance_after, metadata)
SELECT 
  id,
  100,
  'purchase',
  'Admin credited 100 tokens for testing',
  tokens - 100,
  tokens,
  '{"admin_action": true, "reason": "Test credits"}'::jsonb
FROM users
WHERE email = 'ryanfermoselle@yahoo.com';

-- Verify the update
SELECT 
  id, 
  email, 
  username, 
  tokens, 
  balance,
  created_at,
  updated_at
FROM users 
WHERE email = 'ryanfermoselle@yahoo.com';


-- 2. CREATE TEST TOURNAMENTS
-- ========================================

-- $100 Quick Strike Tournament (Multi-Target Reaction)
INSERT INTO tournaments (
  id,
  name,
  game_type,
  entry_fee,
  prize_pool,
  max_players,
  current_players,
  status,
  prize_distribution,
  starts_at,
  ends_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '$100 Quick Strike Tournament',
  'multi-target',
  5,
  100,
  20,
  0,
  'open',
  '[{"rank": 1, "amount": 85, "percentage": 85}]'::jsonb,
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
);

-- $500 Elite Championship (Laser Dodge EXTREME)
INSERT INTO tournaments (
  id,
  name,
  game_type,
  entry_fee,
  prize_pool,
  max_players,
  current_players,
  status,
  prize_distribution,
  starts_at,
  ends_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '$500 Elite Championship',
  'laser-dodge',
  10,
  500,
  50,
  0,
  'open',
  '[{"rank": 1, "amount": 425, "percentage": 85}]'::jsonb,
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
);

-- $50 Speed Challenge (QuickClick)
INSERT INTO tournaments (
  id,
  name,
  game_type,
  entry_fee,
  prize_pool,
  max_players,
  current_players,
  status,
  prize_distribution,
  starts_at,
  ends_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '$50 Speed Challenge',
  'quick-click',
  2,
  50,
  25,
  0,
  'open',
  '[{"rank": 1, "amount": 42.50, "percentage": 85}]'::jsonb,
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
);

-- $250 Pro Tournament (Color Sequence Memory)
INSERT INTO tournaments (
  id,
  name,
  game_type,
  entry_fee,
  prize_pool,
  max_players,
  current_players,
  status,
  prize_distribution,
  starts_at,
  ends_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '$250 Pro Tournament',
  'color-sequence',
  5,
  250,
  50,
  0,
  'open',
  '[{"rank": 1, "amount": 212.50, "percentage": 85}]'::jsonb,
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
);

-- $1000 Master Challenge (Falling Objects)
INSERT INTO tournaments (
  id,
  name,
  game_type,
  entry_fee,
  prize_pool,
  max_players,
  current_players,
  status,
  prize_distribution,
  starts_at,
  ends_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '$1000 Master Challenge',
  'falling-objects',
  20,
  1000,
  50,
  0,
  'open',
  '[{"rank": 1, "amount": 850, "percentage": 85}]'::jsonb,
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
);


-- 3. VERIFY TOURNAMENTS CREATED
-- ========================================
SELECT 
  id,
  name,
  game_type,
  entry_fee,
  prize_pool,
  current_players || '/' || max_players as players,
  status,
  created_at
FROM tournaments
WHERE status = 'open'
ORDER BY prize_pool DESC;


-- 4. CHECK YOUR TOKEN BALANCE
-- ========================================
SELECT 
  email,
  username,
  tokens as available_tokens,
  tokens || ' tokens ($' || tokens || ')' as dollar_value,
  balance as winnings_balance
FROM users
WHERE email = 'ryanfermoselle@yahoo.com';


-- ========================================
-- DONE! 🎉
-- ========================================
-- You now have:
-- ✅ 100 tokens ($100) in your account
-- ✅ 5 live tournaments ready to enter
-- 
-- Go to: https://www.drop-dollar.com/tournaments
-- Click "PAY $X & PLAY NOW" on any tournament
-- Game will launch automatically!
-- ========================================

