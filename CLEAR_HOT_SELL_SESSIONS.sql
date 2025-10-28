-- ============================================================================
-- CLEAR ALL HOT SELL SESSIONS FOR TESTING
-- ============================================================================
-- This script clears all Hot Sell session data for fresh testing
-- Does NOT affect configs or user tokens

-- Clear participants first (foreign key constraint)
DELETE FROM hot_sell_participants;

-- Clear sessions
DELETE FROM hot_sell_sessions;

-- Reset sessions for all configs (create fresh waiting sessions)
INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
SELECT 
  id,
  0,
  base_price,
  max_participants,
  'waiting'
FROM hot_sell_configs;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Hot Sell sessions cleared!';
  RAISE NOTICE '🔄 Fresh sessions created for all configurations';
  RAISE NOTICE '💰 User tokens unchanged';
END $$;

