-- ============================================================================
-- FIX JOIN FUNCTION FOR TEXT user_id
-- Update join_hot_sell_session to work with TEXT user_id column
-- ============================================================================

DROP FUNCTION IF EXISTS public.join_hot_sell_session(uuid, uuid, numeric);

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
    user_id_as_text TEXT;
BEGIN
    -- Convert UUID to TEXT for consistency
    user_id_as_text := user_id_param::text;
    
    RAISE NOTICE '🔍 JOIN: Session=%, User=%, Fee=%', session_id_param, user_id_as_text, entry_fee_param;
    
    -- Get user record
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ User not found';
        RETURN json_build_object('success', false, 'message', 'User not found. Please refresh.');
    END IF;
    
    RAISE NOTICE '✅ User found: % (Tokens: %)', user_record.username, user_record.tokens;
    
    -- Get session
    SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Session not found';
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    RAISE NOTICE '✅ Session found: % (Pot: %)', session_record.config_id, session_record.current_pot;
    
    -- Count participants
    SELECT COUNT(*) INTO current_participants_count 
    FROM public.hot_sell_participants 
    WHERE session_id = session_id_param;
    
    RAISE NOTICE '📊 Current participants: % / %', current_participants_count, session_record.max_participants;
    
    -- Check if full
    IF current_participants_count >= session_record.max_participants THEN
        RAISE NOTICE '❌ Session is full';
        RETURN json_build_object('success', false, 'message', 'Session is full');
    END IF;
    
    -- Check if already joined (user_id in participants table is TEXT now)
    IF EXISTS (
        SELECT 1 FROM public.hot_sell_participants 
        WHERE session_id = session_id_param 
        AND user_id = user_id_as_text
    ) THEN
        RAISE NOTICE '❌ Already joined';
        RETURN json_build_object('success', false, 'message', 'Already joined');
    END IF;
    
    -- Check tokens
    IF user_record.tokens < entry_fee_param THEN
        RAISE NOTICE '❌ Insufficient tokens: % < %', user_record.tokens, entry_fee_param;
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Deduct tokens
    UPDATE public.users 
    SET tokens = tokens - entry_fee_param 
    WHERE id = user_id_param;
    
    RAISE NOTICE '💰 Deducted % tokens from user', entry_fee_param;
    
    -- Add to pot
    new_pot := session_record.current_pot + entry_fee_param;
    
    UPDATE public.hot_sell_sessions 
    SET current_pot = new_pot,
        participants_count = current_participants_count + 1,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RAISE NOTICE '💵 Added % to pot (new total: %)', entry_fee_param, new_pot;
    
    -- Insert participant (user_id is TEXT in this table now)
    INSERT INTO public.hot_sell_participants (
        session_id, 
        user_id,  -- This is TEXT now
        entry_fee, 
        joined_at
    ) VALUES (
        session_id_param, 
        user_id_as_text,  -- Store as TEXT
        entry_fee_param, 
        NOW()
    );
    
    RAISE NOTICE '✅ Participant added successfully';
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Joined successfully',
        'new_pot', new_pot,
        'participants_count', current_participants_count + 1
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_hot_sell_session(uuid, uuid, numeric) TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ JOIN FUNCTION FIXED FOR TEXT!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Accepts UUID parameters';
    RAISE NOTICE '✅ Converts to TEXT internally';
    RAISE NOTICE '✅ Stores as TEXT in participants table';
    RAISE NOTICE '✅ All comparisons use TEXT';
    RAISE NOTICE '========================================';
END $$;

