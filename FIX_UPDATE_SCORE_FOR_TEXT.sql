-- ============================================================================
-- FIX UPDATE SCORE FUNCTION FOR TEXT user_id
-- Update update_hot_sell_score to work with TEXT user_id column
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_hot_sell_score(uuid, uuid, numeric, numeric);

CREATE OR REPLACE FUNCTION public.update_hot_sell_score(
    session_id_param UUID,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    participant_record RECORD;
    user_id_as_text TEXT;
BEGIN
    -- Convert UUID to TEXT
    user_id_as_text := user_id_param::text;
    
    RAISE NOTICE '🎮 UPDATE SCORE: Session=%, User=%, Score=%, Accuracy=%', 
        session_id_param, user_id_as_text, score_param, accuracy_param;
    
    -- Verify participant exists (user_id is TEXT in table)
    SELECT * INTO participant_record 
    FROM public.hot_sell_participants 
    WHERE session_id = session_id_param 
    AND user_id = user_id_as_text;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Not a participant in this session';
        RETURN json_build_object(
            'success', false, 
            'message', 'Not a participant in this session'
        );
    END IF;
    
    RAISE NOTICE '✅ Participant found';
    
    -- Update score
    UPDATE public.hot_sell_participants
    SET 
        score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id = session_id_param 
    AND user_id = user_id_as_text;
    
    RAISE NOTICE '✅ Score updated: % (accuracy: %)', score_param, accuracy_param;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Score updated successfully',
        'score', score_param,
        'accuracy', accuracy_param
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_hot_sell_score(uuid, uuid, numeric, numeric) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ UPDATE SCORE FUNCTION FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Accepts UUID parameters';
    RAISE NOTICE '✅ Converts to TEXT internally';
    RAISE NOTICE '✅ Uses TEXT for lookups';
    RAISE NOTICE '========================================';
END $$;

