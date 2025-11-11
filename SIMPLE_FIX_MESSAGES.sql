-- ============================================================================
-- SIMPLE FIX - Remove Problematic Triggers (No Complex Queries)
-- ============================================================================
-- This is a simpler version that just drops the problematic functions directly
-- ============================================================================

BEGIN;

SELECT '🔧 Dropping all problematic trigger functions...' as step;

-- Drop all trigger functions by name (simpler approach)
DROP FUNCTION IF EXISTS public.log_hot_sell_join CASCADE;
DROP FUNCTION IF EXISTS public.log_hot_sell_completion CASCADE;
DROP FUNCTION IF EXISTS public.log_hot_sell_score CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_join CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_completion CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_winner CASCADE;
DROP FUNCTION IF EXISTS public.log_wta_score CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_join CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_completion CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_winner CASCADE;
DROP FUNCTION IF EXISTS public.log_1v1_score CASCADE;
DROP FUNCTION IF EXISTS public.notify_token_change CASCADE;
DROP FUNCTION IF EXISTS public.notify_session_change CASCADE;
DROP FUNCTION IF EXISTS public.log_participant_join CASCADE;
DROP FUNCTION IF EXISTS public.log_participant_completion CASCADE;
DROP FUNCTION IF EXISTS public.log_score_update CASCADE;

SELECT '✅ Step 1: Dropped trigger functions' as result;

-- Drop all participant triggers
DROP TRIGGER IF EXISTS hot_sell_participants_join_trigger ON public.hot_sell_participants CASCADE;
DROP TRIGGER IF EXISTS hot_sell_participants_completion_trigger ON public.hot_sell_participants CASCADE;
DROP TRIGGER IF EXISTS hot_sell_participants_score_trigger ON public.hot_sell_participants CASCADE;
DROP TRIGGER IF EXISTS winner_takes_all_participants_join_trigger ON public.winner_takes_all_participants CASCADE;
DROP TRIGGER IF EXISTS winner_takes_all_participants_completion_trigger ON public.winner_takes_all_participants CASCADE;
DROP TRIGGER IF EXISTS winner_takes_all_participants_score_trigger ON public.winner_takes_all_participants CASCADE;
DROP TRIGGER IF EXISTS one_v_one_participants_join_trigger ON public.one_v_one_participants CASCADE;
DROP TRIGGER IF EXISTS one_v_one_participants_completion_trigger ON public.one_v_one_participants CASCADE;
DROP TRIGGER IF EXISTS one_v_one_participants_score_trigger ON public.one_v_one_participants CASCADE;

SELECT '✅ Step 2: Dropped participant triggers' as result;

-- Drop session triggers
DROP TRIGGER IF EXISTS winner_takes_all_sessions_winner_trigger ON public.winner_takes_all_sessions CASCADE;
DROP TRIGGER IF EXISTS one_v_one_sessions_winner_trigger ON public.one_v_one_sessions CASCADE;
DROP TRIGGER IF EXISTS hot_sell_sessions_winner_trigger ON public.hot_sell_sessions CASCADE;

SELECT '✅ Step 3: Dropped session triggers' as result;

-- Drop token triggers
DROP TRIGGER IF EXISTS token_transactions_notify_trigger ON public.token_transactions CASCADE;
DROP TRIGGER IF EXISTS token_balance_notify_trigger ON public.users CASCADE;

SELECT '✅ Step 4: Dropped token triggers' as result;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 SIMPLE FIX COMPLETE!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ All problematic triggers removed' as status;
SELECT '✅ Score saving should work now!' as status;
SELECT '🎉 ================================' as message;
SELECT '🔄 Refresh browser and test!' as instruction;
SELECT '🎉 ================================' as message;

-- Verification: Show remaining triggers
SELECT 
  '📊 Remaining Triggers (should only be updated_at)' as info,
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

