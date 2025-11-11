-- ============================================
-- PHASE 1: READ-ONLY DIAGNOSTICS
-- Safe to run now - No writes, no changes
-- ============================================

-- 1. Check current state of hot_sell_sessions
SELECT 
  'Current Sessions State' as diagnosis,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE status = 'waiting') as waiting_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'active') = 0 THEN '❌ NO ACTIVE SESSIONS - Need to create'
    WHEN COUNT(*) FILTER (WHERE status = 'active') < (SELECT COUNT(*) FROM hot_sell_configs) THEN '⚠️ SOME CONFIGS MISSING SESSIONS'
    ELSE '✅ ACTIVE SESSIONS EXIST'
  END as recommendation
FROM hot_sell_sessions;

-- 2. Show which configs lack active sessions
SELECT 
  'Configs Missing Active Sessions' as diagnosis,
  c.id as config_id,
  c.title,
  c.base_price,
  c.max_participants,
  CASE 
    WHEN s.id IS NULL THEN '❌ NO ACTIVE SESSION'
    ELSE '✅ HAS ACTIVE SESSION'
  END as session_status
FROM hot_sell_configs c
LEFT JOIN hot_sell_sessions s ON c.id = s.config_id AND s.status = 'active'
ORDER BY c.base_price;

-- 3. Show all sessions with their status
SELECT 
  'All Sessions Detail' as diagnosis,
  id,
  config_id,
  status,
  participants_count,
  max_participants,
  rng_seed,
  created_at,
  updated_at
FROM hot_sell_sessions
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check if audit table exists and is working
SELECT 
  'Audit Trail Check' as diagnosis,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_session_audit') 
    THEN '✅ Audit table exists'
    ELSE '⚠️ Audit table not found'
  END as audit_status;

-- 5. Summary recommendation
SELECT 
  'RECOMMENDED ACTION' as recommendation,
  CASE 
    WHEN (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') = 0 
    THEN 'CREATE new active sessions for all configs'
    WHEN (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') < (SELECT COUNT(*) FROM hot_sell_configs)
    THEN 'CREATE active sessions for missing configs only'
    WHEN (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'waiting') > 0
    THEN 'UPDATE waiting sessions to active'
    ELSE 'System looks good - investigate specific session UUID'
  END as action_needed;

