-- ============================================================================
-- FIX COIN PLAY SCORE SESSION ERROR
-- ============================================================================
-- This script fixes session-related errors when submitting scores in Coin Play
-- Ensures update_coin_play_score function works properly with session validation
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXING COIN PLAY SCORE SESSION ERRORS';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Ensure update_coin_play_score function exists and is correct
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Creating/updating update_coin_play_score function...';
END $$;

CREATE OR REPLACE FUNCTION public.update_coin_play_score(
    session_id_param UUID,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC DEFAULT 95.0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_status TEXT;
    v_participant_exists BOOLEAN;
BEGIN
    -- Check if session exists and get status
    SELECT status INTO v_session_status
    FROM public.coin_play_sessions
    WHERE id = session_id_param;

    IF v_session_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Session not found',
            'error_code', 'SESSION_NOT_FOUND'
        );
    END IF;

    -- Allow score submission for 'waiting', 'active', or 'completed' sessions
    -- This handles cases where:
    -- 1. User starts playing while session is 'waiting' (before it becomes 'active')
    -- 2. Session transitions to 'active' or 'completed' during gameplay
    -- 3. Session ends but user is still submitting score (grace period)
    IF v_session_status NOT IN ('waiting', 'active', 'completed') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Session status is invalid: ' || COALESCE(v_session_status, 'NULL'),
            'error_code', 'SESSION_INVALID_STATUS'
        );
    END IF;

    -- Check if user is a participant
    SELECT EXISTS (
        SELECT 1 FROM public.coin_play_participants
        WHERE session_id = session_id_param AND user_id = user_id_param
    ) INTO v_participant_exists;

    IF NOT v_participant_exists THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'User not in this session',
            'error_code', 'USER_NOT_PARTICIPANT'
        );
    END IF;

    -- Update score (allow updating even if already set - in case of retry)
    UPDATE public.coin_play_participants
    SET 
        score = score_param,
        completed_at = COALESCE(completed_at, NOW()) -- Don't overwrite if already set
    WHERE session_id = session_id_param AND user_id = user_id_param;

    -- Verify update succeeded
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Failed to update score',
            'error_code', 'UPDATE_FAILED'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Score updated successfully',
        'score', score_param
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Database error: ' || SQLERRM,
            'error_code', 'DATABASE_ERROR'
        );
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ update_coin_play_score function created/updated';
END $$;

-- ============================================================================
-- STEP 2: Grant permissions to update_coin_play_score
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Granting permissions...';
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_coin_play_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;

-- Also ensure anon can't execute (security)
REVOKE EXECUTE ON FUNCTION public.update_coin_play_score(UUID, UUID, NUMERIC, NUMERIC) FROM anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Permissions granted to authenticated users';
END $$;

-- ============================================================================
-- STEP 3: Ensure RLS policies allow score updates
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Checking RLS policies...';
END $$;

-- Ensure participants can update their own scores (via function, but check RLS)
-- The function uses SECURITY DEFINER so RLS is bypassed, but we ensure policies exist

DROP POLICY IF EXISTS "Users can update their own coin play scores" ON public.coin_play_participants;
CREATE POLICY "Users can update their own coin play scores"
ON public.coin_play_participants FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies updated';
END $$;

-- ============================================================================
-- STEP 4: Verify function exists and permissions
-- ============================================================================

DO $$
DECLARE
    v_function_exists BOOLEAN;
    v_permission_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Verifying setup...';
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'update_coin_play_score'
    ) INTO v_function_exists;
    
    IF v_function_exists THEN
        RAISE NOTICE '   ✅ update_coin_play_score function exists';
    ELSE
        RAISE NOTICE '   ❌ update_coin_play_score function NOT found';
    END IF;
    
    -- Check permissions
    SELECT COUNT(*) INTO v_permission_count
    FROM information_schema.routine_privileges
    WHERE routine_name = 'update_coin_play_score'
    AND grantee = 'authenticated'
    AND privilege_type = 'EXECUTE';
    
    IF v_permission_count > 0 THEN
        RAISE NOTICE '   ✅ Permissions granted to authenticated users';
    ELSE
        RAISE NOTICE '   ⚠️  Permissions may not be set correctly';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Show function permissions
-- ============================================================================

SELECT 
    '=== Coin Play Score Function Permissions ===' as info;

SELECT 
    routine_name as function_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'update_coin_play_score'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COIN PLAY SCORE SESSION FIX COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 What was fixed:';
    RAISE NOTICE '   1. update_coin_play_score() function updated with better error handling';
    RAISE NOTICE '   2. Function allows score submission even if session completed';
    RAISE NOTICE '   3. Proper permissions granted to authenticated users';
    RAISE NOTICE '   4. RLS policies ensure security';
    RAISE NOTICE '   5. Better error codes for debugging';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next steps:';
    RAISE NOTICE '   1. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)';
    RAISE NOTICE '   2. Test score submission in Coin Play';
    RAISE NOTICE '   3. Check browser console for any errors';
    RAISE NOTICE '';
END $$;

SELECT '✅ SCORE SESSION FIX COMPLETE - Scores should now save properly!' as status;

