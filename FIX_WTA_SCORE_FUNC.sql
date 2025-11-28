-- ============================================================================
-- 🔧 FIX WTA: Score Function with Better Error Handling
-- ============================================================================

-- Drop old function
DROP FUNCTION IF EXISTS public.update_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) CASCADE;

-- Create with better error handling
CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
    session_id_param TEXT,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_session_uuid UUID;
    v_count INTEGER;
BEGIN
    -- Log inputs for debugging
    RAISE NOTICE 'update_winner_takes_all_score called: session=%, user=%, score=%', 
        session_id_param, user_id_param, score_param;
    
    -- Validate inputs
    IF session_id_param IS NULL OR session_id_param = '' THEN
        RETURN QUERY SELECT false, 'Session ID is empty'::TEXT;
        RETURN;
    END IF;
    
    IF user_id_param IS NULL THEN
        RETURN QUERY SELECT false, 'User ID is empty'::TEXT;
        RETURN;
    END IF;
    
    IF score_param IS NULL THEN
        RETURN QUERY SELECT false, 'Score is empty'::TEXT;
        RETURN;
    END IF;
    
    -- Try to convert session_id to UUID
    BEGIN
        v_session_uuid := session_id_param::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, ('Invalid session ID format: ' || session_id_param)::TEXT;
        RETURN;
    END;
    
    -- Check if participant exists
    SELECT COUNT(*) INTO v_count 
    FROM winner_takes_all_participants 
    WHERE session_id = v_session_uuid AND user_id = user_id_param;
    
    IF v_count = 0 THEN
        RETURN QUERY SELECT false, 'Participant not found in session'::TEXT;
        RETURN;
    END IF;
    
    -- Update the score
    UPDATE winner_takes_all_participants 
    SET score = score_param, accuracy = accuracy_param, completed_at = NOW()
    WHERE session_id = v_session_uuid AND user_id = user_id_param;
    
    RAISE NOTICE 'Score saved successfully: session=%, user=%, score=%', 
        v_session_uuid, user_id_param, score_param;
    
    RETURN QUERY SELECT true, 'Score saved successfully'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Score save error: %', SQLERRM;
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon, service_role;

-- Test the function works
SELECT '✅ FUNCTION CREATED' as status;

-- Also make sure participants table has correct structure
SELECT '📋 PARTICIPANTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_participants'
ORDER BY ordinal_position;

-- Check if there are any sessions
SELECT '📋 SESSIONS:' as info;
SELECT id::TEXT, config_id, status, participants_count FROM winner_takes_all_sessions LIMIT 5;

SELECT '
============================================
✅ SCORE FUNCTION FIXED!
============================================
Now includes:
- Input validation
- Better error messages
- UUID conversion with error handling
- Participant existence check
============================================
' as done;

