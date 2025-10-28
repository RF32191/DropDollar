-- ============================================================================
-- CREATE SESSIONS WITH CORRECT CONFIG IDS
-- ============================================================================
-- This ensures sessions match the exact config IDs the client is looking for
-- ============================================================================

-- Delete any orphaned sessions with wrong config IDs
DELETE FROM winner_takes_all_sessions 
WHERE config_id NOT IN (SELECT id FROM winner_takes_all_configs);

DELETE FROM hot_sell_sessions 
WHERE config_id NOT IN (SELECT id FROM hot_sell_configs);

-- Create Winner Takes All sessions for ALL configs
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
    SELECT 1 FROM winner_takes_all_sessions s 
    WHERE s.config_id = c.id 
    AND s.status IN ('waiting', 'active')
)
ON CONFLICT DO NOTHING;

-- Create Hot Sell sessions for ALL configs
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
    SELECT 1 FROM hot_sell_sessions s 
    WHERE s.config_id = c.id 
    AND s.status IN ('waiting', 'active')
)
ON CONFLICT DO NOTHING;

-- Show what was created
SELECT 'WINNER TAKES ALL SESSIONS CREATED' as info;
SELECT config_id, status, current_pot FROM winner_takes_all_sessions WHERE status = 'waiting' ORDER BY config_id;

SELECT 'HOT SELL SESSIONS CREATED' as info;
SELECT config_id, status, current_pot FROM hot_sell_sessions WHERE status = 'waiting' ORDER BY config_id;

-- Verify counts
DO $$
DECLARE
    wta_configs INTEGER;
    wta_sessions INTEGER;
    hs_configs INTEGER;
    hs_sessions INTEGER;
BEGIN
    SELECT COUNT(*) INTO wta_configs FROM winner_takes_all_configs;
    SELECT COUNT(*) INTO wta_sessions FROM winner_takes_all_sessions WHERE status IN ('waiting', 'active');
    SELECT COUNT(*) INTO hs_configs FROM hot_sell_configs;
    SELECT COUNT(*) INTO hs_sessions FROM hot_sell_sessions WHERE status IN ('waiting', 'active');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ SESSIONS CREATED';
    RAISE NOTICE '  WTA Configs: %, WTA Sessions: %', wta_configs, wta_sessions;
    RAISE NOTICE '  Hot Sell Configs: %, Hot Sell Sessions: %', hs_configs, hs_sessions;
    
    IF wta_configs != wta_sessions THEN
        RAISE WARNING 'WTA: Some configs are missing sessions!';
    END IF;
    
    IF hs_configs != hs_sessions THEN
        RAISE WARNING 'Hot Sell: Some configs are missing sessions!';
    END IF;
    RAISE NOTICE '';
END $$;

