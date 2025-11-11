-- ============================================
-- Fix: Create Active Sessions for Hot Sell
-- ============================================
-- This ensures every config has at least one 'active' session

-- Step 1: Create sessions for configs that don't have active ones
INSERT INTO hot_sell_sessions (
  id,
  config_id,
  prize_pool,
  base_price,
  max_participants,
  participants_count,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  c.base_price, -- prize_pool starts at base_price
  c.base_price,
  c.max_participants,
  0, -- no participants yet
  'active', -- ✅ SET TO ACTIVE
  NOW(),
  NOW()
FROM hot_sell_configs c
WHERE NOT EXISTS (
  -- Only create if no active session exists for this config
  SELECT 1 FROM hot_sell_sessions s 
  WHERE s.config_id = c.id AND s.status = 'active'
)
ON CONFLICT DO NOTHING;

-- Step 2: Update any 'waiting' sessions to 'active' (if needed)
-- Uncomment if you want to activate waiting sessions:
-- UPDATE hot_sell_sessions
-- SET status = 'active', updated_at = NOW()
-- WHERE status = 'waiting';

-- Step 3: Verify fix worked
SELECT 
  'After Fix:' as check_name,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
  CASE 
    WHEN COUNT(CASE WHEN status = 'active' THEN 1 END) > 0 
    THEN '✅ SUCCESS - Active sessions exist'
    ELSE '❌ FAILED - Still no active sessions'
  END as result
FROM hot_sell_sessions;

-- Step 4: Show which configs now have active sessions
SELECT 
  c.id as config_id,
  c.title,
  s.id as session_id,
  s.status,
  s.participants_count || '/' || s.max_participants as capacity
FROM hot_sell_configs c
LEFT JOIN hot_sell_sessions s ON c.id = s.config_id AND s.status = 'active'
ORDER BY c.base_price;

