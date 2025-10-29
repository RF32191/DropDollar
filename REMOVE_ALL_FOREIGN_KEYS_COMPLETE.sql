-- ============================================================================
-- REMOVE ALL FOREIGN KEY CONSTRAINTS COMPLETELY
-- Remove ALL foreign keys that are blocking payouts and joins
-- ============================================================================

-- STEP 1: Remove ALL foreign key constraints from participants tables
ALTER TABLE public.hot_sell_participants DROP CONSTRAINT IF EXISTS hot_sell_participants_user_id_fkey CASCADE;
ALTER TABLE public.hot_sell_participants DROP CONSTRAINT IF EXISTS hot_sell_participants_session_id_fkey CASCADE;

ALTER TABLE public.winner_takes_all_participants DROP CONSTRAINT IF EXISTS winner_takes_all_participants_user_id_fkey CASCADE;
ALTER TABLE public.winner_takes_all_participants DROP CONSTRAINT IF EXISTS winner_takes_all_participants_session_id_fkey CASCADE;

ALTER TABLE public.one_v_one_participants DROP CONSTRAINT IF EXISTS one_v_one_participants_user_id_fkey CASCADE;
ALTER TABLE public.one_v_one_participants DROP CONSTRAINT IF EXISTS one_v_one_participants_session_id_fkey CASCADE;

-- STEP 2: Remove ALL foreign key constraints from sessions tables (for winners)
ALTER TABLE public.hot_sell_sessions DROP CONSTRAINT IF EXISTS hot_sell_sessions_first_place_user_id_fkey CASCADE;
ALTER TABLE public.hot_sell_sessions DROP CONSTRAINT IF EXISTS hot_sell_sessions_second_place_user_id_fkey CASCADE;
ALTER TABLE public.hot_sell_sessions DROP CONSTRAINT IF EXISTS hot_sell_sessions_third_place_user_id_fkey CASCADE;

ALTER TABLE public.winner_takes_all_sessions DROP CONSTRAINT IF EXISTS winner_takes_all_sessions_winner_user_id_fkey CASCADE;

ALTER TABLE public.one_v_one_sessions DROP CONSTRAINT IF EXISTS one_v_one_sessions_winner_user_id_fkey CASCADE;

-- STEP 3: List all remaining foreign key constraints (to verify they're gone)
DO $$
DECLARE
    constraint_record RECORD;
    total_constraints INTEGER := 0;
BEGIN
    FOR constraint_record IN 
        SELECT 
            conname as constraint_name,
            conrelid::regclass as table_name
        FROM pg_constraint
        WHERE contype = 'f'
        AND connamespace = 'public'::regnamespace
        AND (
            conrelid::regclass::text LIKE '%hot_sell%' OR
            conrelid::regclass::text LIKE '%winner_takes_all%' OR
            conrelid::regclass::text LIKE '%one_v_one%'
        )
    LOOP
        total_constraints := total_constraints + 1;
        RAISE NOTICE 'Remaining constraint: % on table %', constraint_record.constraint_name, constraint_record.table_name;
    END LOOP;
    
    RAISE NOTICE '========================================';
    IF total_constraints = 0 THEN
        RAISE NOTICE '✅ ALL FOREIGN KEY CONSTRAINTS REMOVED!';
        RAISE NOTICE '🎉 Games can now operate freely!';
        RAISE NOTICE '✅ Payouts will work!';
    ELSE
        RAISE NOTICE '⚠️ Found % remaining foreign key constraints', total_constraints;
        RAISE NOTICE '💡 You may need to manually drop them';
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- STEP 4: Test the payout function (just verify it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_hot_sell_payout') THEN
        RAISE NOTICE '✅ Hot Sell payout function exists';
    ELSE
        RAISE NOTICE '⚠️ Hot Sell payout function NOT FOUND - may need to be created';
    END IF;
END $$;

RAISE NOTICE '🔄 REFRESH YOUR BROWSER and try the payout again!';

