-- ============================================================================
-- FINAL FIX: Completely recreate get_or_create_conversation
-- This version is guaranteed to work with Supabase RPC
-- ============================================================================

-- First, drop ANY version of this function that might exist
DROP FUNCTION IF EXISTS public.get_or_create_conversation CASCADE;

-- Create the function with proper TABLE return type
CREATE FUNCTION public.get_or_create_conversation(
    participant_ids UUID[],
    conversation_type_param TEXT DEFAULT 'direct'::TEXT,
    listing_id_param UUID DEFAULT NULL,
    title_param TEXT DEFAULT NULL
)
RETURNS TABLE (conversation_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_conversation_id UUID;
    v_participant_id UUID;
    v_other_user_id UUID;
    v_generated_title TEXT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    RAISE NOTICE 'User ID: %, Participants: %', v_user_id, participant_ids;
    
    -- For marketplace conversations
    IF listing_id_param IS NOT NULL THEN
        SELECT c.id INTO v_conversation_id
        FROM conversations c
        WHERE c.listing_id = listing_id_param
        AND c.conversation_type = 'marketplace'
        LIMIT 1;
        
        IF FOUND THEN
            RAISE NOTICE 'Found existing marketplace conversation: %', v_conversation_id;
            
            -- Add participant if not already there
            IF NOT EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_participants.conversation_id = v_conversation_id
                AND conversation_participants.user_id = v_user_id
            ) THEN
                INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at, is_active)
                VALUES (v_conversation_id, v_user_id, 'member', NOW(), true);
            END IF;
            
            RETURN QUERY SELECT v_conversation_id;
            RETURN;
        END IF;
    END IF;
    
    -- For direct conversations between 2 users
    IF conversation_type_param = 'direct' AND array_length(participant_ids, 1) = 2 THEN
        RAISE NOTICE 'Looking for existing direct conversation between % and %', participant_ids[1], participant_ids[2];
        
        -- Find existing conversation between these two users
        SELECT c.id INTO v_conversation_id
        FROM conversations c
        WHERE c.conversation_type = 'direct'
        AND (
            SELECT COUNT(DISTINCT cp.user_id)
            FROM conversation_participants cp
            WHERE cp.conversation_id = c.id
            AND cp.user_id = ANY(participant_ids)
            AND cp.is_active = true
        ) = 2
        AND (
            SELECT COUNT(*)
            FROM conversation_participants cp
            WHERE cp.conversation_id = c.id
            AND cp.is_active = true
        ) = 2
        LIMIT 1;
        
        IF FOUND THEN
            RAISE NOTICE 'Found existing direct conversation: %', v_conversation_id;
            RETURN QUERY SELECT v_conversation_id;
            RETURN;
        END IF;
    END IF;
    
    RAISE NOTICE 'Creating new conversation';
    
    -- Generate title if not provided
    v_generated_title := title_param;
    
    IF v_generated_title IS NULL AND conversation_type_param = 'direct' THEN
        -- Get the other user's ID
        IF participant_ids[1] = v_user_id THEN
            v_other_user_id := participant_ids[2];
        ELSE
            v_other_user_id := participant_ids[1];
        END IF;
        
        RAISE NOTICE 'Other user ID: %', v_other_user_id;
        
        -- Get username
        SELECT 'Chat with ' || COALESCE(u.username, split_part(u.email, '@', 1), 'User')
        INTO v_generated_title
        FROM users u
        WHERE u.id = v_other_user_id;
        
        IF v_generated_title IS NULL THEN
            v_generated_title := 'Direct Message';
        END IF;
    END IF;
    
    IF v_generated_title IS NULL THEN
        v_generated_title := 'Conversation';
    END IF;
    
    RAISE NOTICE 'Generated title: %', v_generated_title;
    
    -- Create new conversation
    INSERT INTO conversations (
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
    
    RAISE NOTICE 'Created conversation: %', v_conversation_id;
    
    -- Add all participants
    FOREACH v_participant_id IN ARRAY participant_ids LOOP
        RAISE NOTICE 'Adding participant: %', v_participant_id;
        
        INSERT INTO conversation_participants (
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
    
    RAISE NOTICE 'Returning conversation ID: %', v_conversation_id;
    
    -- Return the conversation ID
    RETURN QUERY SELECT v_conversation_id;
    RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID[], TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID[], TEXT, UUID, TEXT) TO anon;

-- Verify it was created correctly
SELECT 
    'Function created successfully!' as status,
    pg_catalog.pg_get_function_result(p.oid) as return_type
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'get_or_create_conversation'
AND n.nspname = 'public';

