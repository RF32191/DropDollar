-- ============================================================================
-- RESET HOT SELL SESSIONS
-- Clear all full/completed sessions and create fresh ones
-- ============================================================================

-- STEP 1: Delete all participants from Hot Sell sessions
DELETE FROM public.hot_sell_participants;

-- STEP 2: Delete all Hot Sell sessions
DELETE FROM public.hot_sell_sessions;

-- STEP 3: Recreate fresh sessions for each config
INSERT INTO public.hot_sell_sessions (
    config_id,
    current_pot,
    base_price,
    max_participants,
    status,
    created_at,
    updated_at
)
SELECT 
    id,
    0,
    base_price,
    max_participants,
    'waiting',
    NOW(),
    NOW()
FROM public.hot_sell_configs
ORDER BY base_price;

-- STEP 4: Verify the reset
DO $$
DECLARE
    session_count INTEGER;
    config_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO session_count FROM public.hot_sell_sessions;
    SELECT COUNT(*) INTO config_count FROM public.hot_sell_configs;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Hot Sell sessions reset!';
    RAISE NOTICE '📊 Configs: %', config_count;
    RAISE NOTICE '📊 New sessions: %', session_count;
    RAISE NOTICE '🎮 All listings are now available for play!';
    RAISE NOTICE '========================================';
END $$;

-- STEP 5: Show the new sessions
SELECT 
    config_id,
    current_pot,
    base_price,
    max_participants,
    status,
    created_at
FROM public.hot_sell_sessions
ORDER BY base_price;

