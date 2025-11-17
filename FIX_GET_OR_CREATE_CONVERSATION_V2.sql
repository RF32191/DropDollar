-- ============================================================================
-- FIX V2: get_or_create_conversation function
-- Returns a table with single UUID column for Supabase compatibility
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID[], TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
    participant_ids UUID[],
    conversation_type_param TEXT DEFAULT 'direct',
    listing_id_param UUID DEFAULT NULL,
    title_param TEXT DEFAULT NULL
)
RETURNS TABLE (conversation_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_conversation_id UUID;
    v_participant_id UUID;
    v_other_user_id UUID;
    v_generated_title TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- For marketplace conversations, check if one already exists for this listing
    IF listing_id_param IS NOT NULL THEN
        SELECT c.id INTO v_conversation_id
        FROM public.conversations c
        WHERE c.listing_id = listing_id_param
        AND c.conversation_type = 'marketplace'
        LIMIT 1;
        
        IF FOUND THEN
            -- Add participant if not already in conversation
            IF v_user_id NOT IN (
                SELECT user_id FROM public.conversation_participants
                WHERE conversation_participants.conversation_id = v_conversation_id
            ) THEN
                INSERT INTO public.conversation_participants (conversation_id, user_id, role)
                VALUES (v_conversation_id, v_user_id, 'member');
            END IF;
            
            RETURN QUERY SELECT v_conversation_id;
            RETURN;
        END IF;
    END IF;
    
    -- For direct conversations, check if one exists between these users
    IF conversation_type_param = 'direct' AND array_length(participant_ids, 1) = 2 THEN
        SELECT c.id INTO v_conversation_id
        FROM public.conversations c
        WHERE c.conversation_type = 'direct'
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp1
            WHERE cp1.conversation_id = c.id
            AND cp1.user_id = participant_ids[1]
        )
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp2
            WHERE cp2.conversation_id = c.id
            AND cp2.user_id = participant_ids[2]
        )
        AND (
            SELECT COUNT(*) FROM public.conversation_participants cp3
            WHERE cp3.conversation_id = c.id
        ) = 2
        LIMIT 1;
        
        IF FOUND THEN
            RETURN QUERY SELECT v_conversation_id;
            RETURN;
        END IF;
    END IF;
    
    -- Generate title if not provided
    IF title_param IS NULL AND conversation_type_param = 'direct' THEN
        -- Get the other user's username
        SELECT participant_ids[CASE WHEN participant_ids[1] = v_user_id THEN 2 ELSE 1 END]
        INTO v_other_user_id;
        
        SELECT COALESCE('Chat with ' || u.username, 'Direct Message')
        INTO v_generated_title
        FROM public.users u
        WHERE u.id = v_other_user_id;
    ELSE
        v_generated_title := title_param;
    END IF;
    
    -- Create new conversation
    INSERT INTO public.conversations (
        title,
        conversation_type,
        listing_id,
        created_by,
        created_at,
        updated_at,
        last_message_at
    ) VALUES (
        v_generated_title,
        conversation_type_param,
        listing_id_param,
        v_user_id,
        NOW(),
        NOW(),
        NOW()
    ) RETURNING id INTO v_conversation_id;
    
    -- Add all participants
    FOREACH v_participant_id IN ARRAY participant_ids LOOP
        INSERT INTO public.conversation_participants (
            conversation_id,
            user_id,
            role,
            joined_at,
            is_active
        ) VALUES (
            v_conversation_id,
            v_participant_id,
            CASE WHEN v_participant_id = v_user_id THEN 'owner' ELSE 'member' END,
            NOW(),
            true
        );
    END LOOP;
    
    RETURN QUERY SELECT v_conversation_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID[], TEXT, UUID, TEXT) TO authenticated;

SELECT '✅ get_or_create_conversation V2 - returns TABLE for Supabase RPC compatibility' as status;

