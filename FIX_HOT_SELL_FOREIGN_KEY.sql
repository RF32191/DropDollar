-- ============================================================================
-- FIX HOT SELL FOREIGN KEY CONSTRAINT
-- Ensures users exist before joining sessions
-- ============================================================================

-- STEP 1: Fix the join_hot_sell_session function to verify user exists
DROP FUNCTION IF EXISTS public.join_hot_sell_session(UUID, UUID, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.join_hot_sell_session(
    session_id_param UUID,
    user_id_param UUID,
    entry_fee_param NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    user_record RECORD;
    new_pot NUMERIC;
    current_participants_count INTEGER;
BEGIN
    -- CRITICAL: Verify user exists first
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'User not found. Please refresh the page and try again.'
        );
    END IF;

    -- Get session
    SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;

    -- Calculate current participants from participants table
    SELECT COUNT(*) INTO current_participants_count 
    FROM public.hot_sell_participants 
    WHERE session_id = session_id_param;

    -- Check if session is full
    IF current_participants_count >= session_record.max_participants THEN
        RETURN json_build_object('success', false, 'message', 'Session is full');
    END IF;

    -- Check if user already joined
    IF EXISTS (
        SELECT 1 FROM public.hot_sell_participants 
        WHERE session_id = session_id_param AND user_id = user_id_param
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Already joined this session');
    END IF;

    -- Check tokens
    IF user_record.tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;

    -- Deduct tokens from user
    UPDATE public.users 
    SET tokens = tokens - entry_fee_param, 
        updated_at = NOW() 
    WHERE id = user_id_param;
    
    -- Add participant (user is guaranteed to exist now)
    INSERT INTO public.hot_sell_participants (session_id, user_id, joined_at) 
    VALUES (session_id_param, user_id_param, NOW());

    -- Update pot
    new_pot := session_record.current_pot + entry_fee_param;
    UPDATE public.hot_sell_sessions 
    SET current_pot = new_pot,
        status = CASE 
            WHEN (current_participants_count + 1) >= session_record.max_participants 
            THEN 'active' 
            ELSE 'waiting' 
        END,
        updated_at = NOW()
    WHERE id = session_id_param;

    RETURN json_build_object(
        'success', true,
        'message', 'Successfully joined session',
        'newPot', new_pot,
        'participantsCount', current_participants_count + 1,
        'status', CASE 
            WHEN (current_participants_count + 1) >= session_record.max_participants 
            THEN 'active' 
            ELSE 'waiting' 
        END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(UUID, UUID, NUMERIC) TO authenticated, anon;

-- STEP 2: Also fix update_hot_sell_score to verify user exists
DROP FUNCTION IF EXISTS public.update_hot_sell_score(UUID, UUID, NUMERIC, NUMERIC) CASCADE;

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
BEGIN
    -- Verify the participant exists (which also verifies user exists via foreign key)
    SELECT * INTO participant_record 
    FROM public.hot_sell_participants 
    WHERE session_id = session_id_param 
    AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Not a participant in this session'
        );
    END IF;

    -- Update the score
    UPDATE public.hot_sell_participants
    SET score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id = session_id_param 
    AND user_id = user_id_param;

    -- Save to game history (user_game_history)
    INSERT INTO public.user_game_history (
        user_id,
        game_type,
        score,
        accuracy,
        created_at
    )
    VALUES (
        user_id_param,
        (SELECT game_type FROM hot_sell_configs c 
         JOIN hot_sell_sessions s ON s.config_id = c.id 
         WHERE s.id = session_id_param LIMIT 1),
        score_param,
        accuracy_param,
        NOW()
    )
    ON CONFLICT DO NOTHING;

    RETURN json_build_object(
        'success', true,
        'message', 'Score updated successfully'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_hot_sell_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

-- STEP 3: Verify foreign key constraints are in place
DO $$
BEGIN
    -- Check if foreign key exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'hot_sell_participants_user_id_fkey'
        AND table_name = 'hot_sell_participants'
    ) THEN
        -- Add foreign key if missing
        ALTER TABLE public.hot_sell_participants
        ADD CONSTRAINT hot_sell_participants_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added foreign key constraint';
    ELSE
        RAISE NOTICE '✅ Foreign key constraint already exists';
    END IF;
END $$;

-- STEP 4: Clean up any orphaned participants (where user doesn't exist)
DELETE FROM public.hot_sell_participants
WHERE user_id NOT IN (SELECT id FROM public.users);

-- STEP 5: Verify the fix
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM public.hot_sell_participants p
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.user_id);
    
    IF orphaned_count = 0 THEN
        RAISE NOTICE '✅ No orphaned participants found';
        RAISE NOTICE '✅ Hot Sell foreign key constraint fixed!';
        RAISE NOTICE '🎉 Users will now be verified before joining sessions';
    ELSE
        RAISE NOTICE '⚠️ Found % orphaned participants - cleaning...', orphaned_count;
    END IF;
END $$;

