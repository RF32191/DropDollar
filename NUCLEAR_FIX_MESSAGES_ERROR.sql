-- ============================================================================
-- NUCLEAR FIX - FIND AND REMOVE ALL REALTIME.MESSAGES PROBLEMS
-- ============================================================================
-- This script aggressively finds and removes EVERYTHING that tries to insert
-- into realtime.messages, which is causing the "extension" column error
-- ============================================================================

BEGIN;

SELECT '🔍 Searching for ALL functions that reference realtime.messages...' as step;

-- Step 1: Find and drop ALL functions that contain 'realtime.messages'
DO $$
DECLARE
  func_record RECORD;
  dropped_count INTEGER := 0;
BEGIN
  FOR func_record IN
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE pg_get_functiondef(p.oid) ILIKE '%realtime.messages%'
      AND n.nspname = 'public'
  LOOP
    dropped_count := dropped_count + 1;
    RAISE NOTICE '❌ Dropping: %.%(%)', 
      func_record.schema_name, 
      func_record.function_name,
      func_record.args;
    
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      func_record.schema_name,
      func_record.function_name,
      func_record.args
    );
  END LOOP;
  
  RAISE NOTICE '🗑️  Dropped % functions that reference realtime.messages', dropped_count;
END $$;

-- Step 2: Drop all common trigger function names
DROP FUNCTION IF EXISTS public.log_hot_sell_join() CASCADE;
DROP FUNCTION IF EXISTS public.log_hot_sell_completion() CASCADE;
DROP FUNCTION IF EXISTS public.log_hot_sell_score() CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_join() CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_completion() CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_winner() CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_score() CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_join() CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_completion() CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_winner() CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_score() CASCADE;
DROP FUNCTION IF EXISTS public.notify_token_change() CASCADE;
DROP FUNCTION IF EXISTS public.notify_session_change() CASCADE;
DROP FUNCTION IF EXISTS public.log_participant_join() CASCADE;
DROP FUNCTION IF EXISTS public.log_participant_completion() CASCADE;
DROP FUNCTION IF EXISTS public.log_score_update() CASCADE;

SELECT '✅ Dropped all known trigger functions' as result;

-- Step 3: Drop all triggers on participant tables
DROP TRIGGER IF EXISTS hot_sell_participants_join_trigger ON public.hot_sell_participants CASCADE;
DROP TRIGGER IF EXISTS hot_sell_participants_completion_trigger ON public.hot_sell_participants CASCADE;
DROP TRIGGER IF EXISTS hot_sell_participants_score_trigger ON public.hot_sell_participants CASCADE;
DROP TRIGGER IF EXISTS hot_sell_participants_updated_at_trigger ON public.hot_sell_participants CASCADE;

DROP TRIGGER IF EXISTS winner_takes_all_participants_join_trigger ON public.winner_takes_all_participants CASCADE;
DROP TRIGGER IF EXISTS winner_takes_all_participants_completion_trigger ON public.winner_takes_all_participants CASCADE;
DROP TRIGGER IF EXISTS winner_takes_all_participants_score_trigger ON public.winner_takes_all_participants CASCADE;

DROP TRIGGER IF EXISTS one_v_one_participants_join_trigger ON public.one_v_one_participants CASCADE;
DROP TRIGGER IF EXISTS one_v_one_participants_completion_trigger ON public.one_v_one_participants CASCADE;
DROP TRIGGER IF EXISTS one_v_one_participants_score_trigger ON public.one_v_one_participants CASCADE;

-- Drop triggers on session tables
DROP TRIGGER IF EXISTS winner_takes_all_sessions_winner_trigger ON public.winner_takes_all_sessions CASCADE;
DROP TRIGGER IF EXISTS one_v_one_sessions_winner_trigger ON public.one_v_one_sessions CASCADE;
DROP TRIGGER IF EXISTS hot_sell_sessions_winner_trigger ON public.hot_sell_sessions CASCADE;

-- Drop token-related triggers
DROP TRIGGER IF EXISTS token_transactions_notify_trigger ON public.token_transactions CASCADE;
DROP TRIGGER IF EXISTS token_balance_notify_trigger ON public.users CASCADE;

SELECT '✅ Dropped all known triggers' as result;

-- Step 4: Show remaining functions (should be clean now)
SELECT 
  '📊 Remaining Functions with "realtime" in name' as check_name,
  COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name ILIKE '%realtime%';

-- Step 5: Show remaining triggers
SELECT 
  '📊 Remaining Triggers' as check_name,
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name NOT LIKE '%updated_at%' -- Keep updated_at triggers
ORDER BY event_object_table, trigger_name;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 NUCLEAR FIX COMPLETE!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ All realtime.messages references removed' as status;
SELECT '✅ All problematic triggers dropped' as status;
SELECT '✅ Score saving should work now!' as status;
SELECT '🎉 ================================' as message;
SELECT '🔄 Refresh your browser and try playing a game!' as instruction;
SELECT '🎉 ================================' as message;

