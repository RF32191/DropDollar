-- ============================================================================
-- RESET HOT SELL LISTINGS FOR TESTING (FIXED)
-- Clears all current sessions and creates fresh ones
-- ============================================================================

-- Step 1: Clear all existing Hot Sell sessions
DELETE FROM public.hot_sell_participants;
DELETE FROM public.hot_sell_sessions;

-- Step 2: Create fresh sessions for each config
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

-- Step 3: Verification
DO $$
DECLARE
    session_count INTEGER;
    config_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO session_count FROM public.hot_sell_sessions;
    SELECT COUNT(*) INTO config_count FROM public.hot_sell_configs;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ HOT SELL LISTINGS RESET!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎮 Configs: %', config_count;
    RAISE NOTICE '🎯 Sessions created: %', session_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ All participants cleared';
    RAISE NOTICE '✅ All sessions cleared';
    RAISE NOTICE '✅ Fresh sessions created';
    RAISE NOTICE '✅ All listings are now empty and ready';
    RAISE NOTICE '✅ Users can join fresh games';
    RAISE NOTICE '========================================';
END $$;

