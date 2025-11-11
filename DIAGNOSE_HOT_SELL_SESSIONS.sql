-- ============================================
-- Hot Sell Session Diagnostics
-- Run these to find why "Session is not active"
-- ============================================

-- 1. Check all Hot Sell sessions and their statuses
SELECT 
  id,
  config_id,
  status,
  prize_pool,
  participants_count,
  max_participants,
  created_at,
  updated_at,
  CASE 
    WHEN status = 'active' THEN '✅ JOINABLE'
    WHEN status = 'waiting' THEN '⏳ WAITING'
    WHEN status = 'completed' THEN '✔️ FINISHED'
    ELSE '❌ ' || status
  END as status_check
FROM hot_sell_sessions
ORDER BY created_at DESC
LIMIT 10;

-- 2. Count sessions by status
SELECT 
  status,
  COUNT(*) as count,
  CASE 
    WHEN status = 'active' THEN '✅ Users can join these'
    WHEN status = 'waiting' THEN '⏳ Not ready yet'
    WHEN status = 'completed' THEN '✔️ Already finished'
    ELSE '❓ Unknown status'
  END as explanation
FROM hot_sell_sessions
GROUP BY status
ORDER BY count DESC;

-- 3. Check if there are ANY active sessions at all
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM hot_sell_sessions WHERE status = 'active') 
    THEN '✅ YES - Active sessions exist'
    ELSE '❌ NO - No active sessions found!'
  END as active_sessions_exist;

-- 4. Check what configs have sessions
SELECT 
  hs.config_id,
  hsc.game_type,
  hsc.title,
  hs.status,
  hs.participants_count,
  hs.max_participants,
  hs.id as session_id
FROM hot_sell_sessions hs
LEFT JOIN hot_sell_configs hsc ON hs.config_id = hsc.id
ORDER BY hs.created_at DESC
LIMIT 10;

-- 5. Check recent join attempts (if you have a log table)
-- If hot_sell_participants exists:
SELECT 
  hp.session_id,
  hp.user_id,
  hp.joined_at,
  hs.status as session_status_now,
  CASE 
    WHEN hs.status = 'active' THEN '✅ Session was/is active'
    ELSE '❌ Session is ' || hs.status
  END as join_validity
FROM hot_sell_participants hp
JOIN hot_sell_sessions hs ON hp.session_id = hs.id
ORDER BY hp.joined_at DESC
LIMIT 10;

-- 6. Check if sessions are being created properly
SELECT 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN status NOT IN ('active','waiting','completed') THEN 1 END) as other_count
FROM hot_sell_sessions;

-- ============================================
-- EXPECTED RESULT FOR WORKING SYSTEM:
-- - At least 1 session with status = 'active'
-- - active_count > 0 in the summary
-- ============================================

-- 7. Check if sessions are auto-created for each config
SELECT 
  c.id as config_id,
  c.title,
  c.entry_fee,
  c.max_participants,
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM hot_sell_sessions s 
      WHERE s.config_id = c.id AND s.status = 'active'
    ) THEN '✅ Has active session'
    ELSE '❌ NO active session for this config'
  END as session_status
FROM hot_sell_configs c
ORDER BY c.base_price;

