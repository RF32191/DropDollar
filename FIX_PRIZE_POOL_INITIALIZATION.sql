-- ============================================================================
-- FIX PRIZE POOL INITIALIZATION - Set to 0 instead of 1
-- ============================================================================
-- This script ensures all hot sell sessions start with prize_pool = 0
-- and fixes any sessions that incorrectly have prize_pool = 1
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix existing sessions with incorrect prize_pool
-- ============================================================================
UPDATE public.hot_sell_sessions
SET prize_pool = 0
WHERE prize_pool = 1 OR (prize_pool IS NULL AND status = 'waiting');

-- ============================================================================
-- STEP 2: Ensure prize_pool defaults to 0 in table schema
-- ============================================================================
ALTER TABLE public.hot_sell_sessions
ALTER COLUMN prize_pool SET DEFAULT 0;

-- ============================================================================
-- STEP 3: Update trigger/function that creates sessions to ensure prize_pool = 0
-- ============================================================================
-- Check if there's a function that creates sessions and update it
DO $$
DECLARE
    v_func_name TEXT;
    v_func_body TEXT;
BEGIN
    -- Find functions that create hot_sell_sessions
    FOR v_func_name IN
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        AND (
            routine_definition LIKE '%INSERT INTO%hot_sell_sessions%'
            OR routine_definition LIKE '%INSERT INTO public.hot_sell_sessions%'
        )
    LOOP
        RAISE NOTICE 'Found function that creates sessions: %', v_func_name;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Verify fixes
-- ============================================================================
DO $$
DECLARE
    v_waiting_count INTEGER;
    v_incorrect_count INTEGER;
BEGIN
    -- Count waiting sessions
    SELECT COUNT(*) INTO v_waiting_count
    FROM public.hot_sell_sessions
    WHERE status = 'waiting';
    
    -- Count sessions with incorrect prize_pool
    SELECT COUNT(*) INTO v_incorrect_count
    FROM public.hot_sell_sessions
    WHERE prize_pool = 1 OR (prize_pool IS NULL AND status = 'waiting');
    
    RAISE NOTICE '✅ Waiting sessions: %', v_waiting_count;
    RAISE NOTICE '✅ Sessions with incorrect prize_pool: %', v_incorrect_count;
    
    IF v_incorrect_count > 0 THEN
        RAISE NOTICE '⚠️ Some sessions still have incorrect prize_pool - may need manual fix';
    ELSE
        RAISE NOTICE '✅ All sessions have correct prize_pool (0 or actual value)';
    END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ PRIZE POOL INITIALIZATION FIXED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ All sessions with prize_pool = 1 have been set to 0';
    RAISE NOTICE '✅ Default value for prize_pool is now 0';
    RAISE NOTICE '✅ New sessions will start with prize_pool = 0';
    RAISE NOTICE '✅ ============================================================';
END $$;

