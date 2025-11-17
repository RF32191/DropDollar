-- ============================================================================
-- COMPLETE MESSAGING SYSTEM FOR ALL USERS
-- ============================================================================
-- Creates a universal chat/messaging system that works for:
-- - User to User messages
-- - Seller to Winner messages
-- - Admin to User messages
-- - Group conversations
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop old tables and start fresh
-- ============================================================================

DROP TABLE IF EXISTS public.message_participants CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

SELECT '✅ Step 1: Cleaned up old messaging tables' as status;

-- ============================================================================
-- STEP 2: Create conversations table
-- ============================================================================

CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    conversation_type TEXT NOT NULL CHECK (conversation_type IN ('direct', 'marketplace', 'admin', 'group')),
    listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_listing ON conversations(listing_id);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

SELECT '✅ Step 2: Created conversations table' as status;

-- ============================================================================
-- STEP 3: Create conversation_participants table
-- ============================================================================

CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

SELECT '✅ Step 3: Created conversation_participants table' as status;

-- ============================================================================
-- STEP 4: Create messages table
-- ============================================================================

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'notification', 'address')),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

SELECT '✅ Step 4: Created messages table' as status;

-- ============================================================================
-- STEP 5: Row Level Security Policies
-- ============================================================================

-- Conversations RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.conversation_participants
            WHERE conversation_id = id AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations" ON public.conversations
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.conversation_participants
            WHERE conversation_id = id AND role IN ('owner', 'admin')
        )
    );

-- Conversation participants RLS
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
CREATE POLICY "Users can view conversation participants" ON public.conversation_participants
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.conversation_participants cp2
            WHERE cp2.conversation_id = conversation_id AND cp2.is_active = true
        )
    );

DROP POLICY IF EXISTS "Conversation owners can add participants" ON public.conversation_participants;
CREATE POLICY "Conversation owners can add participants" ON public.conversation_participants
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.conversation_participants
            WHERE conversation_id = conversation_participants.conversation_id 
            AND role IN ('owner', 'admin')
        )
    );

-- Messages RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
CREATE POLICY "Users can send messages to their conversations" ON public.messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND auth.uid() IN (
            SELECT user_id FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE
    USING (auth.uid() = sender_id);

SELECT '✅ Step 5: RLS policies created' as status;

-- ============================================================================
-- STEP 6: Create or get conversation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
    participant_ids UUID[],
    conversation_type_param TEXT DEFAULT 'direct',
    listing_id_param UUID DEFAULT NULL,
    title_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_conversation_id UUID;
    v_participant_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- For marketplace conversations, check if one already exists for this listing
    IF listing_id_param IS NOT NULL THEN
        SELECT id INTO v_conversation_id
        FROM public.conversations
        WHERE listing_id = listing_id_param
        AND conversation_type = 'marketplace'
        LIMIT 1;
        
        IF FOUND THEN
            -- Add participant if not already in conversation
            IF v_user_id NOT IN (
                SELECT user_id FROM public.conversation_participants
                WHERE conversation_id = v_conversation_id
            ) THEN
                INSERT INTO public.conversation_participants (conversation_id, user_id, role)
                VALUES (v_conversation_id, v_user_id, 'member');
            END IF;
            
            RETURN v_conversation_id;
        END IF;
    END IF;
    
    -- For direct conversations, check if one exists between these users
    IF conversation_type_param = 'direct' AND array_length(participant_ids, 1) = 2 THEN
        SELECT c.id INTO v_conversation_id
        FROM public.conversations c
        WHERE c.conversation_type = 'direct'
        AND NOT EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = c.id
            AND cp.user_id != ALL(participant_ids)
        )
        AND (
            SELECT COUNT(*) FROM public.conversation_participants cp2
            WHERE cp2.conversation_id = c.id
        ) = 2
        LIMIT 1;
        
        IF FOUND THEN
            RETURN v_conversation_id;
        END IF;
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
        title_param,
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
            joined_at
        ) VALUES (
            v_conversation_id,
            v_participant_id,
            CASE WHEN v_participant_id = v_user_id THEN 'owner' ELSE 'member' END,
            NOW()
        );
    END LOOP;
    
    RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID[], TEXT, UUID, TEXT) TO authenticated;

SELECT '✅ Step 6: get_or_create_conversation function created' as status;

-- ============================================================================
-- STEP 7: Send message function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_message(
    conversation_id_param UUID,
    message_text_param TEXT,
    message_type_param TEXT DEFAULT 'text',
    metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_message_id UUID;
    v_username TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Verify user is in conversation
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = conversation_id_param
        AND user_id = v_user_id
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User not in conversation';
    END IF;
    
    -- Get username
    SELECT COALESCE(
        (SELECT username FROM public.users WHERE id = v_user_id),
        (SELECT split_part(email, '@', 1) FROM public.users WHERE id = v_user_id),
        'User'
    ) INTO v_username;
    
    -- Insert message
    INSERT INTO public.messages (
        conversation_id,
        sender_id,
        message_text,
        message_type,
        metadata,
        created_at
    ) VALUES (
        conversation_id_param,
        v_user_id,
        message_text_param,
        message_type_param,
        metadata_param || jsonb_build_object('sender_username', v_username),
        NOW()
    ) RETURNING id INTO v_message_id;
    
    -- Update conversation last_message_at
    UPDATE public.conversations
    SET 
        last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = conversation_id_param;
    
    RETURN v_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT, TEXT, JSONB) TO authenticated;

SELECT '✅ Step 7: send_message function created' as status;

-- ============================================================================
-- STEP 8: Get user conversations function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_conversations()
RETURNS TABLE (
    id UUID,
    title TEXT,
    conversation_type TEXT,
    listing_id UUID,
    listing_title TEXT,
    other_user_id UUID,
    other_username TEXT,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id,
        CASE 
            WHEN c.title IS NOT NULL THEN c.title
            WHEN c.conversation_type = 'marketplace' THEN 
                COALESCE((SELECT l.title FROM public.marketplace_listings l WHERE l.id = c.listing_id), 'Marketplace Conversation')
            WHEN c.conversation_type = 'direct' THEN
                COALESCE(
                    (
                        SELECT COALESCE(u.username, split_part(u.email, '@', 1), 'User')
                        FROM public.users u
                        WHERE u.id = (
                            SELECT cp.user_id 
                            FROM public.conversation_participants cp
                            WHERE cp.conversation_id = c.id 
                            AND cp.user_id != v_user_id
                            LIMIT 1
                        )
                    ),
                    'Direct Message'
                )
            ELSE 'Conversation'
        END as title,
        c.conversation_type,
        c.listing_id,
        (SELECT l.title FROM public.marketplace_listings l WHERE l.id = c.listing_id) as listing_title,
        (
            SELECT cp.user_id 
            FROM public.conversation_participants cp
            WHERE cp.conversation_id = c.id 
            AND cp.user_id != v_user_id
            LIMIT 1
        ) as other_user_id,
        (
            SELECT COALESCE(u.username, split_part(u.email, '@', 1), 'User')
            FROM public.users u
            WHERE u.id = (
                SELECT cp.user_id 
                FROM public.conversation_participants cp
                WHERE cp.conversation_id = c.id 
                AND cp.user_id != v_user_id
                LIMIT 1
            )
        ) as other_username,
        (
            SELECT m.message_text
            FROM public.messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) as last_message,
        c.last_message_at,
        (
            SELECT COUNT(*)
            FROM public.messages m
            WHERE m.conversation_id = c.id
            AND m.created_at > (
                SELECT COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
                FROM public.conversation_participants cp
                WHERE cp.conversation_id = c.id AND cp.user_id = v_user_id
            )
            AND m.sender_id != v_user_id
        ) as unread_count,
        c.created_at
    FROM public.conversations c
    WHERE c.id IN (
        SELECT cp.conversation_id
        FROM public.conversation_participants cp
        WHERE cp.user_id = v_user_id
        AND cp.is_active = true
    )
    ORDER BY c.last_message_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_conversations() TO authenticated;

SELECT '✅ Step 8: get_user_conversations function created' as status;

-- ============================================================================
-- STEP 9: Get conversation messages function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_conversation_messages(
    conversation_id_param UUID,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    sender_username TEXT,
    message_text TEXT,
    message_type TEXT,
    metadata JSONB,
    is_edited BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Verify user is in conversation
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = conversation_id_param
        AND user_id = v_user_id
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User not in conversation';
    END IF;
    
    -- Update last_read_at
    UPDATE public.conversation_participants
    SET last_read_at = NOW()
    WHERE conversation_id = conversation_id_param
    AND user_id = v_user_id;
    
    RETURN QUERY
    SELECT 
        m.id,
        m.sender_id,
        COALESCE(
            (SELECT u.username FROM public.users u WHERE u.id = m.sender_id),
            (SELECT split_part(u.email, '@', 1) FROM public.users u WHERE u.id = m.sender_id),
            'User'
        ) as sender_username,
        m.message_text,
        m.message_type,
        m.metadata,
        m.is_edited,
        m.created_at
    FROM public.messages m
    WHERE m.conversation_id = conversation_id_param
    ORDER BY m.created_at ASC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversation_messages(UUID, INTEGER, INTEGER) TO authenticated;

SELECT '✅ Step 9: get_conversation_messages function created' as status;

-- ============================================================================
-- STEP 10: Mark conversation as read function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_conversation_read(
    conversation_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    UPDATE public.conversation_participants
    SET last_read_at = NOW()
    WHERE conversation_id = conversation_id_param
    AND user_id = v_user_id;
    
    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;

SELECT '✅ Step 10: mark_conversation_read function created' as status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '
╔════════════════════════════════════════════════════════════════╗
║     ✅ COMPLETE MESSAGING SYSTEM CREATED!                      ║
╚════════════════════════════════════════════════════════════════╝

TABLES CREATED:
✅ conversations - Main conversation container
✅ conversation_participants - Who is in each conversation
✅ messages - Individual messages

FUNCTIONS CREATED:
✅ get_or_create_conversation() - Start or find conversation
✅ send_message() - Send a message
✅ get_user_conversations() - List all user conversations
✅ get_conversation_messages() - Get messages in conversation
✅ mark_conversation_read() - Mark as read

RLS POLICIES:
✅ Users can only see their conversations
✅ Users can only send messages to their conversations
✅ Proper permission checks

NEXT STEPS:
1. Create MessagingHub component (UI)
2. Integrate with marketplace winner/seller
3. Test with direct messages
4. Add real-time updates

READY FOR FRONTEND INTEGRATION!
' as success_message;

