-- ============================================================================
-- MINIMAL SESSION CREATION ONLY - DOES NOT TOUCH ANY FUNCTIONS OR LOGIC
-- ============================================================================
-- This ONLY creates missing sessions - NOTHING ELSE
-- Does NOT modify: timers, functions, scores, payouts, or any existing code
-- ============================================================================

-- Create Winner Takes All sessions (if missing)
INSERT INTO winner_takes_all_sessions (config_id, current_pot, base_price, participants_count, status, created_at, updated_at)
SELECT 
    c.id,
    0,
    c.base_price,
    0,
    'waiting',
    NOW(),
    NOW()
FROM winner_takes_all_configs c
WHERE NOT EXISTS (
    SELECT 1 FROM winner_takes_all_sessions s WHERE s.config_id = c.id AND s.status IN ('waiting', 'active')
);

-- Create Hot Sell sessions (if missing)
INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status, created_at, updated_at)
SELECT 
    c.id,
    0,
    c.base_price,
    c.max_participants,
    'waiting',
    NOW(),
    NOW()
FROM hot_sell_configs c
WHERE NOT EXISTS (
    SELECT 1 FROM hot_sell_sessions s WHERE s.config_id = c.id AND s.status IN ('waiting', 'active')
);

-- Verify what was created
DO $$
BEGIN
    RAISE NOTICE '✅ Sessions created successfully';
    RAISE NOTICE 'Winner Takes All sessions: %', (SELECT COUNT(*) FROM winner_takes_all_sessions WHERE status IN ('waiting', 'active'));
    RAISE NOTICE 'Hot Sell sessions: %', (SELECT COUNT(*) FROM hot_sell_sessions WHERE status IN ('waiting', 'active'));
END $$;

