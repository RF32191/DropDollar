-- ============================================================================
-- RESET FUNCTION FOR WINNER TAKES ALL
-- ============================================================================
-- Feature 5: Session Reset
-- - Resets session after payout
-- - Clears participants
-- - Prepares for next game
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_winner_session(
    session_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.winner_takes_all_participants WHERE session_id = session_id_param;
    
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'waiting',
        current_pot = 0,
        participants_count = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        prize_amount = NULL,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN jsonb_build_object('success', true, 'message', 'Session reset successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_winner_session(UUID) TO authenticated, anon;

SELECT 'Reset Function: Ready!' as status;

