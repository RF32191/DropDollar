-- ============================================================================
-- STEP 1: GRANT ACCESS (Run this first - no deadlocks)
-- ============================================================================

-- Grant access to existing functions
GRANT EXECUTE ON FUNCTION public.get_coin_play_sessions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.coin_play_join_v2(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_coin_play_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_coin_play_payout(TEXT) TO authenticated;

-- Test if it works
SELECT COUNT(*) as total_sessions FROM get_coin_play_sessions();

SELECT '✅ Step 1 Complete! You should now see all 81 games on /coin-play page' as status;

