-- ============================================================================
-- SCORE UPDATE SYSTEM FOR WINNER TAKES ALL
-- ============================================================================
-- Feature 4: Score Update
-- - Saves user scores after game completion
-- - Tracks accuracy
-- - Timestamps completion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
    session_id_param UUID,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.winner_takes_all_participants
    SET 
        score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    RETURN jsonb_build_object('success', true, 'message', 'Score updated successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

SELECT 'Score Update: Function ready!' as status;

