-- RESET WINNER TAKES ALL BANNERS AND COMPLETION DATA
-- This SQL script resets all Winner Takes It All tournaments and clears completion data
-- Run this to fix banners that aren't resetting after payout
--
-- LOGIC:
-- - Non-winners: Can play again immediately (completion data cleared)
-- - Winners: Blocked based on prize amount
--   * Prizes under $5000: 1 week (7 days) cooldown
--   * Prizes $5000+: 3 months (90 days) cooldown
-- - After cooldown period: Winners can play again (old completion data cleared)

-- 1. Clear all Winner Takes It All shared sessions
DELETE FROM winner_takes_all_shared_sessions;

-- 2. Clear competitions data for Winner Takes It All tournaments
-- Only clear non-winners and expired winner cooldowns
-- Winners are blocked based on prize amount:
--   * Prizes under $5000: 1 week (7 days) cooldown
--   * Prizes $5000+: 3 months (90 days) cooldown
DELETE FROM competitions 
WHERE tournament_type = 'winner_takes_all'
AND (
  status != 'completed' -- Keep completed wins
  OR (
    status = 'completed' 
    AND (
      -- Clear wins under $5000 after 1 week
      (created_at < NOW() - INTERVAL '1 week' AND game_type IN (
        'sword_parry', 'laser_dodge', 'multi_target_reaction', 'number_tap', 'blade_bounce', 'cash_stack', 'falling_object'
      ))
      OR
      -- Clear wins $5000+ after 3 months
      (created_at < NOW() - INTERVAL '3 months' AND game_type IN (
        'color_sequence'
      ))
    )
  )
);

-- 3. Clear any game history for Winner Takes It All tournaments
DELETE FROM game_history 
WHERE tournament_type = 'winner_takes_all';

-- 4. Reset user completion flags for non-winners only
-- Note: This doesn't affect token balances, only completion flags
-- Winners keep their stats, non-winners get reset
UPDATE users 
SET 
  games_played = COALESCE(games_played, 0),
  games_won = COALESCE(games_won, 0),
  updated_at = NOW()
WHERE id::text IN (
  SELECT DISTINCT user_id::text 
  FROM competitions 
  WHERE tournament_type = 'winner_takes_all'
  AND status != 'completed' -- Only reset non-winners
);

-- 5. Create fresh default sessions for each Winner Takes It All tournament
-- This ensures banners show as available to join
-- Prize calculation: Winner gets 85%, Platform gets 15%
-- 
-- COOLDOWN PERIODS BY GAME TYPE:
-- 1 week (7 days) cooldown for prizes under $5000:
--   - sword_parry ($2, $50)
--   - laser_dodge ($10, $100, $10000)
--   - multi_target_reaction ($25, $25000)
--   - number_tap ($250)
--   - blade_bounce ($5)
--   - cash_stack ($1000)
--   - falling_object ($2500)
--
-- 3 months (90 days) cooldown for prizes $5000+:
--   - color_sequence ($5000)
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

-- 7. Verify competitions data was cleared (show winners vs non-winners)
SELECT 
  'Competitions Status' as status,
  COUNT(*) as total_remaining,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as winners_blocked,
  COUNT(CASE WHEN status != 'completed' THEN 1 END) as non_winners_cleared
FROM competitions 
WHERE tournament_type = 'winner_takes_all';

-- 8. Show winner cooldown status by game type
SELECT 
  game_type,
  COUNT(*) as winners_blocked,
  MIN(created_at) as earliest_win,
  MAX(created_at) as latest_win,
  CASE 
    WHEN game_type = 'color_sequence' THEN '3 months (90 days)'
    ELSE '1 week (7 days)'
  END as cooldown_period
FROM competitions 
WHERE tournament_type = 'winner_takes_all' 
AND status = 'completed'
GROUP BY game_type
ORDER BY game_type;

-- 9. Show all reset sessions with prize calculations
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
