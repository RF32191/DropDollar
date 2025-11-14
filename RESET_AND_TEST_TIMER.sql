-- ============================================================================
-- RESET ALL WTA SESSIONS FOR TIMER TESTING
-- ============================================================================

-- Clear all participants
DELETE FROM winner_takes_all_participants;

-- Reset ALL sessions
UPDATE winner_takes_all_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee_amount = 0,
    completed_at = NULL,
    updated_at = NOW();

-- Verify reset
SELECT 
    '✅ RESET COMPLETE' as status,
    config_id,
    status,
    participants_count,
    prize_pool,
    timer_started_at
FROM winner_takes_all_sessions
ORDER BY config_id;

SELECT '
✅ ALL WTA SESSIONS RESET!

Ready to test timer:
1. Join any listing 5 times (e.g., $2 listing)
2. Timer starts on 5th join
3. 60-second countdown begins
4. Try to join after timer expires → Should be BLOCKED
5. Payout happens automatically at 0:00

Test Commands:
- Check if timer expired and trigger payout:
  SELECT check_and_payout_expired_wta();

- Manual payout for specific listing:
  SELECT process_wta_payout(''wta-2-sword-parry'');

- Reset a specific session:
  SELECT reset_wta_session(''wta-2-sword-parry'');

All listings ready! 🚀
' as instructions;

