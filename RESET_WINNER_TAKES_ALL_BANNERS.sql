-- RESET WINNER TAKES ALL BANNERS AND COMPLETION DATA
-- This SQL script resets all Winner Takes It All tournaments and clears completion data
-- Run this to fix banners that aren't resetting after payout

-- 1. Clear all Winner Takes It All shared sessions
DELETE FROM winner_takes_all_shared_sessions;

-- 2. Clear all competitions data for Winner Takes It All tournaments
DELETE FROM competitions 
WHERE tournament_type = 'winner_takes_all';

-- 3. Clear any game history for Winner Takes It All tournaments
DELETE FROM game_history 
WHERE tournament_type = 'winner_takes_all';

-- 4. Reset any user completion flags (if stored in users table)
-- Note: This doesn't affect token balances, only completion flags
UPDATE users 
SET 
  games_played = COALESCE(games_played, 0),
  games_won = COALESCE(games_won, 0),
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM competitions 
  WHERE tournament_type = 'winner_takes_all'
);

-- 5. Create fresh default sessions for each Winner Takes It All tournament
-- This ensures banners show as available to join

INSERT INTO winner_takes_all_shared_sessions (
  id,
  config_id,
  current_pot,
  base_price,
  participants_count,
  status,
  timer_started_at,
  participants,
  winner_paid,
  winner_user_id,
  prize_awarded,
  completed_at,
  created_at,
  updated_at
) VALUES 
-- $2 Winner Takes It All - Sword Parry
(gen_random_uuid(), 'wta-2-sword-parry', 0, 2, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $5 Winner Takes It All - Blade Bounce  
(gen_random_uuid(), 'wta-5-blade-bounce', 0, 5, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $10 Winner Takes It All - Laser Dodge
(gen_random_uuid(), 'wta-10-laser-dodge', 0, 10, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $25 Winner Takes It All - Multi Target
(gen_random_uuid(), 'wta-25-multi-target', 0, 25, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $50 Winner Takes It All - Sword Parry
(gen_random_uuid(), 'wta-50-sword-parry', 0, 50, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $100 Winner Takes It All - Laser Dodge
(gen_random_uuid(), 'wta-100-laser-dodge', 0, 100, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $250 Winner Takes It All - Quick Click
(gen_random_uuid(), 'wta-250-quick-click', 0, 250, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $1000 Winner Takes It All - Cash Stack
(gen_random_uuid(), 'wta-1000-cash-stack', 0, 1000, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $2500 Winner Takes It All - Falling Objects
(gen_random_uuid(), 'wta-2500-falling-objects', 0, 2500, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $5000 Winner Takes It All - Color Sequence
(gen_random_uuid(), 'wta-5000-color-sequence', 0, 5000, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $10000 Winner Takes It All - Laser Dodge
(gen_random_uuid(), 'wta-10000-laser-dodge', 0, 10000, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW()),

-- $25000 Winner Takes It All - Multi Target
(gen_random_uuid(), 'wta-25000-multi-target', 0, 25000, 0, 'waiting', NULL, '[]', false, NULL, 0, NULL, NOW(), NOW());

-- 6. Verify the reset was successful
SELECT 
  'Reset Complete' as status,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_sessions,
  COUNT(CASE WHEN winner_paid = false THEN 1 END) as unpaid_sessions
FROM winner_takes_all_shared_sessions;

-- 7. Show all reset sessions
SELECT 
  config_id,
  current_pot,
  base_price,
  participants_count,
  status,
  winner_paid,
  created_at
FROM winner_takes_all_shared_sessions
ORDER BY base_price ASC;
