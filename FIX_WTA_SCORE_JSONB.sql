-- ============================================================================
-- 🔧 FIX WTA: Score function returns JSONB (not TABLE)
-- ============================================================================
-- Frontend expects: data.success, data.message
-- TABLE returns: [{success, message}] (array)
-- JSONB returns: {success, message} (object) ✓
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
    session_id_param TEXT,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS JSONB  -- Changed from TABLE to JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    v_sid UUID;
BEGIN
    -- Validate inputs
    IF session_id_param IS NULL OR session_id_param = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'No session ID');
    END IF;
    
    IF user_id_param IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No user ID');
    END IF;
    
    -- Convert to UUID
    BEGIN
        v_sid := session_id_param::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID');
    END;
    
    -- Update score
    UPDATE winner_takes_all_participants 
    SET score = score_param, accuracy = accuracy_param, completed_at = NOW()
    WHERE session_id = v_sid AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Score saved successfully');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon, service_role;

-- Test
SELECT '✅ FUNCTION NOW RETURNS JSONB:' as info;
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'update_winner_takes_all_score' 
LIMIT 1;

SELECT '
============================================
✅ SCORE FUNCTION FIXED!
============================================
Now returns JSONB object directly:
{ "success": true, "message": "Score saved" }

Frontend can access:
- data.success ✓
- data.message ✓
============================================
' as done;

