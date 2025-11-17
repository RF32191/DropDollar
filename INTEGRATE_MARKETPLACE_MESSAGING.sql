-- ============================================================================
-- INTEGRATE MARKETPLACE WITH NEW MESSAGING SYSTEM
-- ============================================================================
-- This connects marketplace winners/sellers to the new messaging system
-- ============================================================================

-- ============================================================================
-- STEP 1: Update process_marketplace_winner to create conversation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_marketplace_winner(
    session_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_listing RECORD;
    v_winner RECORD;
    v_winner_username TEXT;
    v_platform_cut NUMERIC := 0.15;
    v_winner_prize NUMERIC;
    v_conversation_id UUID;
    v_message_id UUID;
BEGIN
    RAISE NOTICE '🎯 process_marketplace_winner called for session: %', session_id_param;
    
    -- Get session
    SELECT * INTO v_session FROM public.marketplace_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Get listing
    SELECT * INTO v_listing FROM public.marketplace_listings WHERE id = v_session.listing_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing not found');
    END IF;
    
    -- Find winner (highest score)
    SELECT * INTO v_winner FROM public.marketplace_participants
    WHERE session_id = session_id_param AND score IS NOT NULL
    ORDER BY score DESC LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No participants with scores');
    END IF;
    
    -- Get winner username
    SELECT COALESCE(
        v_winner.username,
        (SELECT username FROM public.users WHERE id = v_winner.user_id),
        (SELECT split_part(email, '@', 1) FROM public.users WHERE id = v_winner.user_id),
        'Winner'
    ) INTO v_winner_username;
    
    RAISE NOTICE '🏆 Winner: user_id=%, username=%, score=%', v_winner.user_id, v_winner_username, v_winner.score;
    
    -- Calculate prizes
    v_winner_prize := v_session.prize_pool * (1 - v_platform_cut);
    
    -- Update session with winner
    UPDATE public.marketplace_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner.user_id,
        winner_username = v_winner_username,
        winner_score = v_winner.score,
        winner_prize = v_winner_prize,
        platform_fee = v_session.prize_pool * v_platform_cut,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Award prize to winner
    UPDATE public.users
    SET won_tokens = won_tokens + v_winner_prize, updated_at = NOW()
    WHERE id = v_winner.user_id;
    
    RAISE NOTICE '💰 Prize awarded: % tokens to user %', v_winner_prize, v_winner.user_id;
    
    -- ========================================
    -- CREATE CONVERSATION IN NEW SYSTEM
    -- ========================================
    
    -- Get or create conversation between winner and seller
    SELECT public.get_or_create_conversation(
        ARRAY[v_winner.user_id, v_listing.seller_id],
        'marketplace',
        v_listing.id,
        '📦 ' || v_listing.title
    ) INTO v_conversation_id;
    
    RAISE NOTICE '💬 Conversation created: %', v_conversation_id;
    
    -- Send system message to winner
    SELECT public.send_message(
        v_conversation_id,
        '🎉 Congratulations ' || v_winner_username || '! You won "' || v_listing.title || '" with a score of ' || ROUND(v_winner.score) || ' points!

Please provide your shipping address below so the seller can ship your item.',
        'system',
        jsonb_build_object(
            'winner_id', v_winner.user_id,
            'winner_username', v_winner_username,
            'winner_score', v_winner.score,
            'listing_id', v_listing.id
        )
    ) INTO v_message_id;
    
    RAISE NOTICE '📨 System message to winner: %', v_message_id;
    
    -- Send system message about seller
    SELECT public.send_message(
        v_conversation_id,
        '🏆 This item was won by ' || v_winner_username || '! 

Seller, please wait for the winner to provide their shipping address. You will be notified once they submit it.',
        'system',
        jsonb_build_object(
            'seller_id', v_listing.seller_id,
            'listing_id', v_listing.id
        )
    ) INTO v_message_id;
    
    RAISE NOTICE '📨 System message about seller: %', v_message_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner.user_id,
        'winner_username', v_winner_username,
        'winner_score', v_winner.score,
        'winner_prize', v_winner_prize,
        'platform_fee', v_session.prize_pool * v_platform_cut,
        'conversation_id', v_conversation_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_marketplace_winner(UUID) TO authenticated, anon;

SELECT '✅ Step 1: process_marketplace_winner updated with messaging' as status;

-- ============================================================================
-- STEP 2: Create function to submit shipping address
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_shipping_address(
    listing_id_param UUID,
    address_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_listing RECORD;
    v_conversation_id UUID;
    v_message_id UUID;
    v_seller_username TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get listing
    SELECT * INTO v_listing FROM public.marketplace_listings WHERE id = listing_id_param;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing not found');
    END IF;
    
    -- Get session and verify user is the winner
    SELECT * INTO v_session FROM public.marketplace_sessions
    WHERE listing_id = listing_id_param
    AND winner_user_id = v_user_id
    AND status = 'completed';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not the winner of this listing');
    END IF;
    
    -- Store address in session
    UPDATE public.marketplace_sessions
    SET winner_address = address_data, updated_at = NOW()
    WHERE id = v_session.id;
    
    -- Get conversation
    SELECT c.id INTO v_conversation_id
    FROM public.conversations c
    WHERE c.listing_id = listing_id_param
    AND c.conversation_type = 'marketplace'
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Create conversation if doesn't exist
        SELECT public.get_or_create_conversation(
            ARRAY[v_user_id, v_listing.seller_id],
            'marketplace',
            listing_id_param,
            '📦 ' || v_listing.title
        ) INTO v_conversation_id;
    END IF;
    
    -- Get seller username
    SELECT COALESCE(
        (SELECT username FROM public.users WHERE id = v_listing.seller_id),
        (SELECT split_part(email, '@', 1) FROM public.users WHERE id = v_listing.seller_id),
        'Seller'
    ) INTO v_seller_username;
    
    -- Send address to seller via message
    SELECT public.send_message(
        v_conversation_id,
        '📍 SHIPPING ADDRESS PROVIDED

The winner has provided their shipping address:

Name: ' || COALESCE(address_data->>'name', 'Not provided') || '
Address Line 1: ' || COALESCE(address_data->>'address_line1', 'Not provided') || '
Address Line 2: ' || COALESCE(address_data->>'address_line2', '') || '
City: ' || COALESCE(address_data->>'city', 'Not provided') || '
State: ' || COALESCE(address_data->>'state', 'Not provided') || '
Postal Code: ' || COALESCE(address_data->>'postal_code', 'Not provided') || '
Country: ' || COALESCE(address_data->>'country', 'Not provided') || '
Phone: ' || COALESCE(address_data->>'phone', 'Not provided') || '

Please ship the item to this address. Use this chat to communicate with the winner about tracking information.',
        'address',
        address_data
    ) INTO v_message_id;
    
    RAISE NOTICE '📨 Address sent to seller in conversation %', v_conversation_id;
    
    -- Confirmation to winner
    SELECT public.send_message(
        v_conversation_id,
        '✅ Your shipping address has been sent to ' || v_seller_username || '! 

They will ship your item soon and provide tracking information here. You can use this chat to communicate about delivery.',
        'system',
        jsonb_build_object('address_submitted', true)
    ) INTO v_message_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Shipping address submitted successfully',
        'conversation_id', v_conversation_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_shipping_address(UUID, JSONB) TO authenticated;

SELECT '✅ Step 2: submit_shipping_address function created' as status;

-- ============================================================================
-- STEP 3: Backfill conversations for existing winners
-- ============================================================================

DO $$
DECLARE
    v_session RECORD;
    v_listing RECORD;
    v_conversation_id UUID;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Backfilling conversations for existing winners...';
    
    FOR v_session IN 
        SELECT * FROM public.marketplace_sessions
        WHERE status = 'completed'
        AND winner_user_id IS NOT NULL
        ORDER BY completed_at DESC NULLS LAST
    LOOP
        -- Get listing
        SELECT * INTO v_listing FROM public.marketplace_listings WHERE id = v_session.listing_id;
        IF NOT FOUND THEN CONTINUE; END IF;
        
        -- Check if conversation already exists
        IF EXISTS (
            SELECT 1 FROM public.conversations
            WHERE listing_id = v_listing.id
            AND conversation_type = 'marketplace'
        ) THEN
            CONTINUE;
        END IF;
        
        -- Create conversation
        SELECT public.get_or_create_conversation(
            ARRAY[v_session.winner_user_id, v_listing.seller_id],
            'marketplace',
            v_listing.id,
            '📦 ' || v_listing.title
        ) INTO v_conversation_id;
        
        -- Send initial messages
        PERFORM public.send_message(
            v_conversation_id,
            '🎉 Congratulations! You won "' || v_listing.title || '" with a score of ' || ROUND(v_session.winner_score) || ' points!

Please provide your shipping address so the seller can ship your item.',
            'system',
            '{}'::jsonb
        );
        
        v_count := v_count + 1;
        RAISE NOTICE '✅ Created conversation for listing: %', v_listing.title;
    END LOOP;
    
    RAISE NOTICE '🎉 Created % conversations for existing winners', v_count;
END $$;

SELECT '✅ Step 3: Backfilled conversations for existing winners' as status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '
╔════════════════════════════════════════════════════════════════╗
║   ✅ MARKETPLACE MESSAGING INTEGRATED!                         ║
╚════════════════════════════════════════════════════════════════╝

WHAT WAS INTEGRATED:

1️⃣ WINNER PROCESSING:
   ✅ Automatically creates conversation
   ✅ Adds winner + seller as participants
   ✅ Sends system messages to both
   ✅ Links to listing

2️⃣ ADDRESS SUBMISSION:
   ✅ submit_shipping_address() function
   ✅ Stores address in session
   ✅ Sends formatted address to seller
   ✅ Confirms to winner

3️⃣ BACKFILLED DATA:
   ✅ Created conversations for existing winners
   ✅ Sent initial messages
   ✅ Ready for chat

HOW IT WORKS:
1. User wins marketplace item
2. Conversation auto-created
3. Both parties see it in Messages tab
4. Winner submits address
5. Seller receives address in chat
6. Both can communicate about shipping

REFRESH YOUR PAGE NOW!
Go to Messages tab to see conversations!
' as success_message;

-- Show stats
SELECT 
    'Marketplace Conversations:' as info,
    COUNT(*) as total
FROM conversations
WHERE conversation_type = 'marketplace';

SELECT 
    'Total Messages:' as info,
    COUNT(*) as total
FROM messages;

SELECT 
    'Conversations by Type:' as info,
    conversation_type,
    COUNT(*) as count
FROM conversations
GROUP BY conversation_type;

