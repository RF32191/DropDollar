-- ============================================================================
-- DIAGNOSE WHY SOME GAMES AREN'T STARTING
-- ============================================================================
-- This query helps identify which games/sessions have issues
-- ============================================================================

SELECT '🔍 DIAGNOSING GAME START ISSUES' as step;

-- Check 1: Do all configs have active sessions?
SELECT 
  '1️⃣ Configs Missing Active Sessions' as check_name,
  c.id as config_id,
  c.title,
  c.game_type,
  CASE 
    WHEN s.id IS NULL THEN '❌ NO SESSION'
    WHEN s.status <> 'active' THEN '⚠️ Session exists but status = ' || s.status
    ELSE '✅ HAS ACTIVE SESSION'
  END as status
FROM hot_sell_configs c
LEFT JOIN hot_sell_sessions s ON c.id = s.config_id AND s.status = 'active'
ORDER BY c.base_price;

-- Check 2: Are there sessions with NULL rng_seed?
SELECT 
  '2️⃣ Sessions Missing RNG Seeds' as check_name,
  COUNT(*) FILTER (WHERE rng_seed IS NULL OR rng_seed = 0) as sessions_without_seeds,
  COUNT(*) as total_sessions
FROM hot_sell_sessions;

-- Check 3: List all sessions with their status
SELECT 
  '3️⃣ All Session Details' as check_name,
  s.id as session_id,
  s.config_id,
  c.title,
  s.status,
  s.rng_seed,
  s.participants_count,
  s.max_participants,
  s.created_at
FROM hot_sell_sessions s
JOIN hot_sell_configs c ON s.config_id = c.id
ORDER BY c.base_price, s.created_at DESC;

-- Check 4: Check for duplicate active sessions per config
SELECT 
  '4️⃣ Duplicate Active Sessions' as check_name,
  config_id,
  COUNT(*) as active_session_count,
  'Should be 1' as expected
FROM hot_sell_sessions
WHERE status = 'active'
GROUP BY config_id
HAVING COUNT(*) > 1;

-- Check 5: Check RPC functions exist
SELECT 
  '5️⃣ Required RPC Functions' as check_name,
  routine_name,
  CASE 
    WHEN routine_name IN ('get_all_hot_sell_sessions', 'hs_join_v2', 'update_hot_sell_score') THEN '✅ Critical function'
    ELSE '⚠️ Optional function'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%hot_sell%' 
    OR routine_name LIKE 'hs_%'
  )
ORDER BY routine_name;

-- Recommendations
SELECT 
  '💡 RECOMMENDATIONS' as step,
  CASE 
    WHEN (SELECT COUNT(*) FROM hot_sell_configs) > (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active')
    THEN 'Run RUN_COMPLETE_FAIR_GAMING_SETUP.sql to create missing sessions'
    WHEN (SELECT COUNT(*) FILTER (WHERE rng_seed IS NULL) FROM hot_sell_sessions) > 0
    THEN 'Some sessions missing RNG seeds - run setup script'
    ELSE '✅ All sessions look good - check browser console for client-side errors'
  END as recommendation;

