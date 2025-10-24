-- RESET WINNER TAKES ALL BANNERS AND COMPLETION DATA
-- This SQL script resets all Winner Takes It All tournaments and clears completion data
-- Run this to fix banners that aren't resetting after payout

-- 1. Clear all Winner Takes It All shared sessions
DELETE FROM winner_takes_all_shared_sessions;

-- 2. Clear all competitions data for Winner Takes It All tournaments
-- This completely resets all completion status for all users
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
WHERE id::text IN (
  SELECT DISTINCT user_id::text 
  FROM competitions 
  WHERE tournament_type = 'winner_takes_all'
);

-- 5. Create fresh default sessions for each Winner Takes It All tournament
-- This ensures banners show as available to join
-- Prize calculation: Winner gets 85%, Platform gets 15%
-- 
-- NOTE: This SQL script clears server-side data only.
-- Client-side localStorage data (winnerTakesAllCompletions_${userId}) 
-- will be cleared by the JavaScript completeBannerReset() function.

INSERT INTO winner_takes_all_shared_sessions (
  id,
  config_id,
  current_pot,
  base_price,
  participants_count,
  status,
  timer_started_at,
  participants,
  created_at,
  updated_at
) VALUES 
-- $2 Winner Takes It All - Sword Parry (Winner: $1.70, Platform: $0.30)
(gen_random_uuid(), 'wta-2-sword-parry', 0, 2, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $5 Winner Takes It All - Blade Bounce (Winner: $4.25, Platform: $0.75)
(gen_random_uuid(), 'wta-5-blade-bounce', 0, 5, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $10 Winner Takes It All - Laser Dodge (Winner: $8.50, Platform: $1.50)
(gen_random_uuid(), 'wta-10-laser-dodge', 0, 10, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $25 Winner Takes It All - Multi Target (Winner: $21.25, Platform: $3.75)
(gen_random_uuid(), 'wta-25-multi-target', 0, 25, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $50 Winner Takes It All - Sword Parry (Winner: $42.50, Platform: $7.50)
(gen_random_uuid(), 'wta-50-sword-parry', 0, 50, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $100 Winner Takes It All - Laser Dodge (Winner: $85.00, Platform: $15.00)
(gen_random_uuid(), 'wta-100-laser-dodge', 0, 100, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $250 Winner Takes It All - Quick Click (Winner: $212.50, Platform: $37.50)
(gen_random_uuid(), 'wta-250-quick-click', 0, 250, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $1000 Winner Takes It All - Cash Stack (Winner: $850.00, Platform: $150.00)
(gen_random_uuid(), 'wta-1000-cash-stack', 0, 1000, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $2500 Winner Takes It All - Falling Objects (Winner: $2125.00, Platform: $375.00)
(gen_random_uuid(), 'wta-2500-falling-objects', 0, 2500, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $5000 Winner Takes It All - Color Sequence (Winner: $4250.00, Platform: $750.00)
(gen_random_uuid(), 'wta-5000-color-sequence', 0, 5000, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $10000 Winner Takes It All - Laser Dodge (Winner: $8500.00, Platform: $1500.00)
(gen_random_uuid(), 'wta-10000-laser-dodge', 0, 10000, 0, 'waiting', NULL, '[]', NOW(), NOW()),

-- $25000 Winner Takes It All - Multi Target (Winner: $21250.00, Platform: $3750.00)
(gen_random_uuid(), 'wta-25000-multi-target', 0, 25000, 0, 'waiting', NULL, '[]', NOW(), NOW());

-- 6. Verify the reset was successful
SELECT 
  'Reset Complete' as status,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_sessions,
  COUNT(CASE WHEN participants_count = 0 THEN 1 END) as empty_sessions
FROM winner_takes_all_shared_sessions;

-- 7. Verify competitions data was cleared
SELECT 
  'Competitions Cleared' as status,
  COUNT(*) as remaining_competitions
FROM competitions 
WHERE tournament_type = 'winner_takes_all';

-- 8. Show all reset sessions with prize calculations
SELECT 
  config_id,
  current_pot,
  base_price,
  participants_count,
  status,
  ROUND(base_price * 0.85, 2) as winner_prize,
  ROUND(base_price * 0.15, 2) as platform_fee,
  created_at
FROM winner_takes_all_shared_sessions
ORDER BY base_price ASC;
