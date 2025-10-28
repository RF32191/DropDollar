-- ============================================================================
-- FIX MISSING HOT SELL SESSIONS
-- ============================================================================
-- This ensures ALL configs have sessions

-- First, check what configs we have
SELECT 'Hot Sell Configs' as info, id, title, base_price, max_participants
FROM hot_sell_configs
ORDER BY base_price;

-- Check what sessions exist
SELECT 'Existing Sessions' as info, config_id, id, status, current_pot, participants_count
FROM hot_sell_sessions
ORDER BY config_id;

-- Now create sessions for ANY configs that don't have one
INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
SELECT 
  c.id,
  0,
  c.base_price,
  c.max_participants,
  'waiting'
FROM hot_sell_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM hot_sell_sessions s 
  WHERE s.config_id = c.id 
  AND s.status IN ('waiting', 'active')
);

-- Verify all sessions now exist
SELECT 
  'All Sessions After Fix' as info,
  c.id as config_id,
  c.title,
  c.base_price,
  c.max_participants,
  s.id as session_id,
  s.status,
  s.current_pot,
  s.participants_count
FROM hot_sell_configs c
LEFT JOIN hot_sell_sessions s ON c.id = s.config_id AND s.status IN ('waiting', 'active')
ORDER BY c.base_price;

-- Success
SELECT '✅ All configs now have sessions!' as result;

