-- ============================================
-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- (Read-only queries - won't modify anything)
-- ============================================

-- Query 1: Check all Hot Sell sessions
SELECT 
  '=== ALL HOT SELL SESSIONS ===' as check_name;

SELECT 
  id,
  config_id,
  status,
  participants_count || '/' || max_participants as capacity,
  created_at::date as created_date
FROM hot_sell_sessions
ORDER BY created_at DESC
LIMIT 20;

-- Query 2: Check all Hot Sell configs
SELECT 
  '=== ALL HOT SELL CONFIGS ===' as check_name;

SELECT 
  id,
  title,
  entry_fee,
  max_participants,
  base_price
FROM hot_sell_configs
ORDER BY base_price;

-- Query 3: Count sessions by status
SELECT 
  '=== SESSION STATUS COUNTS ===' as check_name;

SELECT 
  status,
  COUNT(*) as count,
  CASE 
    WHEN status = 'active' THEN '✅ Can join'
    WHEN status = 'waiting' THEN '⏳ Not ready'
    WHEN status = 'completed' THEN '✔️ Finished'
    ELSE '❓ Unknown'
  END as meaning
FROM hot_sell_sessions
GROUP BY status
ORDER BY count DESC;

-- Query 4: Which configs have active sessions?
SELECT 
  '=== CONFIGS WITH ACTIVE SESSIONS ===' as check_name;

SELECT 
  c.id as config_id,
  c.title,
  CASE 
    WHEN s.id IS NOT NULL THEN '✅ HAS ACTIVE SESSION'
    ELSE '❌ NO ACTIVE SESSION'
  END as status,
  s.id as session_id,
  s.participants_count as current_players,
  c.max_participants as max_players
FROM hot_sell_configs c
LEFT JOIN hot_sell_sessions s 
  ON c.id = s.config_id AND s.status = 'active'
ORDER BY c.base_price;

-- ============================================
-- SHARE THE RESULTS WITH ME
-- I'll give you the exact fix based on what we see
-- ============================================

