-- ============================================================================
-- RESET ALL HOT SELL SESSIONS NOW
-- ============================================================================

-- Clear all participants
DELETE FROM hot_sell_participants;

-- Clear all non-waiting sessions
DELETE FROM hot_sell_sessions WHERE status != 'waiting';

-- Ensure all configs have a waiting session
INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
SELECT 
  id,
  0,
  base_price,
  max_participants,
  'waiting'
FROM hot_sell_configs
WHERE NOT EXISTS (
  SELECT 1 FROM hot_sell_sessions s 
  WHERE s.config_id = hot_sell_configs.id 
  AND s.status = 'waiting'
);

-- Show result
SELECT 
  'All Hot Sell sessions reset!' as message,
  COUNT(*) as waiting_sessions
FROM hot_sell_sessions
WHERE status = 'waiting';

-- Show what we have
SELECT 
  config_id,
  base_price,
  status,
  current_pot,
  participants_count
FROM hot_sell_sessions
ORDER BY base_price;

