-- ============================================================================
-- ADD $2 WINNER TAKES ALL - BLADE BOUNCE (DESKTOP)
-- ============================================================================
-- Creates a $2 Winner Takes All game with Blade Bounce for desktop users
-- Winner gets 85% ($1.70), Platform gets 15% ($0.30)
-- ============================================================================

-- ============================================================================
-- STEP 1: Add the config (if it doesn't exist)
-- ============================================================================
INSERT INTO winner_takes_all_configs (
  id, 
  game_type, 
  title, 
  description, 
  entry_fee,
  prize_pool,
  base_price,
  winner_prize,
  platform_fee,
  game_duration, 
  rng_seed, 
  platform_fee_percent,
  timer_duration,
  created_at, 
  updated_at
)
VALUES (
  'wta-2-blade-bounce-desktop',
  'blade_bounce',
  '$2 Blade Bounce',
  'Winner takes 85% of the prize pool!',
  1,                    -- Entry fee: $1
  2,                    -- Prize pool: $2
  2,                    -- Base price: $2
  1.70,                 -- Winner prize: $1.70 (85% of $2)
  0.30,                 -- Platform fee: $0.30 (15% of $2)
  45,                   -- Game duration: 45 seconds
  100,                  -- RNG seed
  15.0,                 -- Platform fee percent: 15%
  7200,                 -- Timer: 2 hours (7200 seconds)
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  game_type = EXCLUDED.game_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  entry_fee = EXCLUDED.entry_fee,
  prize_pool = EXCLUDED.prize_pool,
  base_price = EXCLUDED.base_price,
  winner_prize = EXCLUDED.winner_prize,
  platform_fee = EXCLUDED.platform_fee,
  game_duration = EXCLUDED.game_duration,
  rng_seed = EXCLUDED.rng_seed,
  platform_fee_percent = EXCLUDED.platform_fee_percent,
  timer_duration = EXCLUDED.timer_duration,
  updated_at = NOW();

DO $$ 
BEGIN
  RAISE NOTICE 'Added $2 Blade Bounce config';
END $$;

-- ============================================================================
-- STEP 2: Create initial session
-- ============================================================================
INSERT INTO winner_takes_all_sessions (
  id,
  config_id,
  prize_pool,
  base_price,
  participants_count,
  status,
  timer_started_at,
  timer_duration,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'wta-2-blade-bounce-desktop',
  0,                    -- Starts at $0
  2,                    -- Base price: $2
  0,                    -- 0 participants
  'waiting',
  NULL,                 -- Timer not started yet
  7200,                 -- 2 hours
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

DO $$ 
BEGIN
  RAISE NOTICE 'Created session for $2 Blade Bounce';
END $$;

-- ============================================================================
-- STEP 3: Verify the setup
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '=== $2 BLADE BOUNCE WINNER TAKES ALL ADDED ===';
  RAISE NOTICE 'Game: Blade Bounce (Desktop)';
  RAISE NOTICE 'Prize: $2.00';
  RAISE NOTICE 'Entry Fee: $1.00';
  RAISE NOTICE 'Winner Payout: $1.70 (85%%)';
  RAISE NOTICE 'Platform Fee: $0.30 (15%%)';
  RAISE NOTICE 'Timer: 2 hours';
  RAISE NOTICE ' ';
END $$;

-- Show the new config
SELECT 
  id,
  game_type,
  title,
  '$' || entry_fee::TEXT as entry_fee,
  '$' || base_price::TEXT as prize,
  game_duration || 's' as duration,
  timer_duration || 's' as timer
FROM winner_takes_all_configs
WHERE id = 'wta-2-blade-bounce-desktop';

-- Show the new session
SELECT 
  config_id,
  '$' || prize_pool::TEXT as current_pool,
  participants_count || ' players' as players,
  status
FROM winner_takes_all_sessions
WHERE config_id = 'wta-2-blade-bounce-desktop'
ORDER BY created_at DESC
LIMIT 1;

DO $$ 
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE 'Ready! Check your Winner Takes All page on desktop.';
  RAISE NOTICE ' ';
END $$;

