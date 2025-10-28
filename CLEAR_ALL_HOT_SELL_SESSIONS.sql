-- ============================================================================
-- CLEAR ALL HOT SELL SESSIONS
-- This removes all existing Hot Sell data and creates fresh sessions
-- ============================================================================

-- Delete all participants
DELETE FROM hot_sell_participants;

-- Delete all sessions
DELETE FROM hot_sell_sessions;

-- Recreate fresh sessions for all configs
DO $$
DECLARE
  config_record RECORD;
BEGIN
  FOR config_record IN SELECT * FROM hot_sell_configs LOOP
    -- Create initial session for each config
    INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
    VALUES (config_record.id, 0, config_record.base_price, config_record.max_participants, 'waiting');
    
    RAISE NOTICE 'Created fresh session for: %', config_record.title;
  END LOOP;
END $$;

-- Verify
SELECT 
  s.config_id,
  c.title,
  s.status,
  s.participants_count,
  s.current_pot
FROM hot_sell_sessions s
JOIN hot_sell_configs c ON c.id = s.config_id
ORDER BY c.base_price;

RAISE NOTICE '✅ All Hot Sell sessions cleared and reset!';

