-- ============================================================================
-- 🔧 FIX WTA: Parameter names to match frontend
-- ============================================================================

-- The frontend uses: session_id_param, user_id_param, score_param, accuracy_param
-- Need to match these EXACTLY

-- Drop old function
DROP FUNCTION IF EXISTS public.update_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) CASCADE;

-- Create with correct parameter names
CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
    session_id_param TEXT,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE winner_takes_all_participants 
    SET score = score_param, accuracy = accuracy_param, completed_at = NOW()
    WHERE session_id::TEXT = session_id_param AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Participant not found'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, 'Score updated'::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon, service_role;

-- Verify
SELECT '✅ Function created with correct parameter names' as status;
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'update_winner_takes_all_score' 
AND pronamespace = 'public'::regnamespace;

SELECT '
============================================
✅ WTA SCORE FUNCTION FIXED!
============================================
Parameters now match frontend:
- session_id_param
- user_id_param  
- score_param
- accuracy_param
============================================
' as done;

