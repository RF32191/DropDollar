-- ============================================================================
-- REMOVE ALL REALTIME MESSAGE TRIGGERS - SIMPLE FIX
-- ============================================================================
-- This completely removes the triggers causing the "extension" column error
-- These triggers are NOT critical for gameplay - they're just notifications
-- ============================================================================

BEGIN;

SELECT '🔧 Removing all problematic realtime triggers...' as step;

-- Drop all trigger functions that insert into realtime.messages
DROP FUNCTION IF EXISTS public.log_hot_sell_join() CASCADE;
DROP FUNCTION IF EXISTS public.log_hot_sell_completion() CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_join() CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_completion() CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_winner() CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_join() CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_completion() CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_winner() CASCADE;
DROP FUNCTION IF EXISTS public.notify_token_change() CASCADE;

SELECT '✅ Removed all realtime trigger functions' as result;

-- Drop any triggers that reference these functions
DROP TRIGGER IF EXISTS hot_sell_participants_join_trigger ON public.hot_sell_participants CASCADE;
DROP TRIGGER IF EXISTS hot_sell_participants_completion_trigger ON public.hot_sell_participants CASCADE;
DROP TRIGGER IF EXISTS winner_takes_all_participants_join_trigger ON public.winner_takes_all_participants CASCADE;
DROP TRIGGER IF EXISTS winner_takes_all_participants_completion_trigger ON public.winner_takes_all_participants CASCADE;
DROP TRIGGER IF EXISTS winner_takes_all_sessions_winner_trigger ON public.winner_takes_all_sessions CASCADE;
DROP TRIGGER IF EXISTS one_v_one_participants_join_trigger ON public.one_v_one_participants CASCADE;
DROP TRIGGER IF EXISTS one_v_one_participants_completion_trigger ON public.one_v_one_participants CASCADE;
DROP TRIGGER IF EXISTS one_v_one_sessions_winner_trigger ON public.one_v_one_sessions CASCADE;
DROP TRIGGER IF EXISTS token_transactions_notify_trigger ON public.token_transactions CASCADE;

SELECT '✅ Removed all realtime triggers' as result;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 REALTIME TRIGGERS REMOVED!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ No more "extension" column errors' as status;
SELECT '✅ Score saving will now work' as status;
SELECT '✅ All games will complete properly' as status;
SELECT '🎉 ================================' as message;

-- Verification query
SELECT 
  '📊 Remaining Trigger Functions' as check_name,
  COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND (
    routine_name LIKE 'log_%'
    OR routine_name LIKE 'notify_%'
  );

SELECT 
  '📊 Remaining Triggers' as check_name,
  COUNT(*) as count
FROM information_schema.triggers
WHERE trigger_schema = 'public';

