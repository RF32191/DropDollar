-- ============================================================================
-- MANUAL PAYOUT TEST - Run this to manually trigger payout for testing
-- ============================================================================

-- First, let's see which sessions are ready
SELECT 
  'Sessions Ready for Payout' as status,
  s.config_id,
  s.id as session_id,
  s.current_pot,
  s.participants_count,
  s.max_participants,
  (SELECT COUNT(*) FROM hot_sell_participants p WHERE p.session_id = s.id AND p.score IS NOT NULL) as scored_count,
  CASE 
    WHEN s.first_place_user_id IS NOT NULL THEN '❌ Already Paid'
    WHEN s.participants_count < s.max_participants THEN '⏳ Not Full'
    WHEN (SELECT COUNT(*) FROM hot_sell_participants p WHERE p.session_id = s.id AND p.score IS NOT NULL) < s.max_participants THEN '⏳ Missing Scores'
    ELSE '✅ READY!'
  END as payout_status
FROM hot_sell_sessions s
WHERE s.status IN ('waiting', 'active')
ORDER BY s.created_at DESC;

-- Now manually trigger payout for $2 game
SELECT '🎯 Attempting payout for $2 game (hs-2-sword-parry)' as action;
SELECT * FROM process_hot_sell_payout('hs-2-sword-parry');

-- Trigger payout for $3 game
SELECT '🎯 Attempting payout for $3 game (hs-3-blade-bounce)' as action;
SELECT * FROM process_hot_sell_payout('hs-3-blade-bounce');

-- Trigger payout for $5 game
SELECT '🎯 Attempting payout for $5 game (hs-5-laser-dodge)' as action;
SELECT * FROM process_hot_sell_payout('hs-5-laser-dodge');

-- Check results
SELECT 
  'After Payout Attempt' as status,
  s.config_id,
  s.status,
  s.first_place_user_id,
  s.second_place_user_id,
  s.third_place_user_id,
  s.first_place_prize,
  s.second_place_prize,
  s.third_place_prize
FROM hot_sell_sessions s
WHERE s.first_place_user_id IS NOT NULL
ORDER BY s.completed_at DESC
LIMIT 5;

-- Show new sessions created (auto-reset check)
SELECT 
  'New Sessions Created (Auto-Reset)' as status,
  config_id,
  id,
  status,
  current_pot,
  participants_count,
  created_at
FROM hot_sell_sessions
WHERE status = 'waiting'
ORDER BY created_at DESC
LIMIT 5;

