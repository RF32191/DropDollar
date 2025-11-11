-- ============================================
-- VERIFY 1: Check all configs have active sessions
-- ============================================

-- Show session counts
SELECT 
  '📊 Session Overview' as check_name,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE status = 'waiting') as waiting_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions
FROM hot_sell_sessions;

-- Show which configs have active sessions
SELECT 
  '📋 Configs with Active Sessions' as check_name,
  c.id as config_id,
  c.title,
  c.base_price,
  CASE 
    WHEN s.id IS NOT NULL THEN '✅ HAS ACTIVE SESSION'
    ELSE '❌ MISSING SESSION'
  END as status,
  s.id as session_id,
  s.participants_count,
  s.max_participants
FROM hot_sell_configs c
LEFT JOIN hot_sell_sessions s ON c.id = s.config_id AND s.status = 'active'
ORDER BY c.base_price;

-- Final verification
SELECT 
  '🎯 Final Status' as check_name,
  (SELECT COUNT(*) FROM hot_sell_configs) as total_configs,
  (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') as active_sessions,
  CASE 
    WHEN (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') >= (SELECT COUNT(*) FROM hot_sell_configs)
    THEN '✅ ALL CONFIGS HAVE ACTIVE SESSIONS'
    ELSE '❌ STILL MISSING SOME'
  END as result;

