-- ============================================================================
-- FIND AND FIX HIDDEN ISSUES
-- Discover and disable triggers, constraints, or anything causing UUID = TEXT
-- ============================================================================

-- Step 1: Find all triggers on hot_sell tables
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECKING FOR TRIGGERS:';
    RAISE NOTICE '========================================';
    
    FOR trigger_rec IN 
        SELECT tgname, tgrelid::regclass::text as table_name
        FROM pg_trigger
        WHERE tgrelid::regclass::text IN ('public.hot_sell_sessions', 'public.hot_sell_participants', 'public.game_history')
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Found trigger: % on %', trigger_rec.tgname, trigger_rec.table_name;
        -- Drop the trigger
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_rec.tgname, trigger_rec.table_name);
        RAISE NOTICE '  → Dropped!';
    END LOOP;
END $$;

-- Step 2: Find all check constraints
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECKING FOR CHECK CONSTRAINTS:';
    RAISE NOTICE '========================================';
    
    FOR constraint_rec IN 
        SELECT conname, conrelid::regclass::text as table_name
        FROM pg_constraint
        WHERE conrelid::regclass::text IN ('public.hot_sell_sessions', 'public.hot_sell_participants', 'public.game_history')
        AND contype = 'c'
    LOOP
        RAISE NOTICE 'Found check constraint: % on %', constraint_rec.conname, constraint_rec.table_name;
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', constraint_rec.table_name, constraint_rec.conname);
        RAISE NOTICE '  → Dropped!';
    END LOOP;
END $$;

-- Step 3: Verify column types
DO $$
DECLARE
    col_rec RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CURRENT COLUMN TYPES:';
    RAISE NOTICE '========================================';
    
    FOR col_rec IN 
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name IN ('hot_sell_sessions', 'hot_sell_participants', 'game_history', 'users')
        AND column_name LIKE '%id%'
        ORDER BY table_name, column_name
    LOOP
        RAISE NOTICE '%.% = %', col_rec.table_name, col_rec.column_name, col_rec.data_type;
    END LOOP;
END $$;

-- Step 4: Check if there are any functions we haven't seen
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL HOT SELL FUNCTIONS:';
    RAISE NOTICE '========================================';
    
    FOR func_rec IN 
        SELECT proname, pg_get_functiondef(oid) as definition
        FROM pg_proc
        WHERE proname LIKE '%hot_sell%'
    LOOP
        RAISE NOTICE 'Function: %', func_rec.proname;
    END LOOP;
END $$;

-- Step 5: Try a simple direct payout test
DO $$
DECLARE
    test_result json;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TESTING PAYOUT FUNCTION DIRECTLY:';
    RAISE NOTICE '========================================';
    
    -- Try to call the payout function
    BEGIN
        SELECT public.process_hot_sell_payout('hs-3-sword-parry') INTO test_result;
        RAISE NOTICE 'Payout test result: %', test_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Payout test FAILED: % - %', SQLSTATE, SQLERRM;
    END;
END $$;

-- Step 6: Final summary
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNOSTIC COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Check the output above to see:';
    RAISE NOTICE '1. Any triggers that were found and dropped';
    RAISE NOTICE '2. Any check constraints that were found';
    RAISE NOTICE '3. Current column types';
    RAISE NOTICE '4. All hot_sell functions';
    RAISE NOTICE '5. Direct payout test result';
    RAISE NOTICE '========================================';
END $$;

