-- ============================================
-- FIX AUTOMATED MARKETPLACE MESSAGES
-- ============================================
-- Ensure messages are sent to winners & sellers
-- ============================================

-- Step 1: Update process_marketplace_winner to ALWAYS send messages
CREATE OR REPLACE FUNCTION public.process_marketplace_winner(
    session_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_record RECORD;
    v_winner_record RECORD;
    v_platform_fee NUMERIC;
    v_seller_share NUMERIC;
    v_listing_id UUID;
    v_seller_id UUID;
    v_winner_msg_id UUID;
    v_seller_msg_id UUID;
BEGIN
    RAISE NOTICE '🎯 [PROCESS WINNER] Starting for session: %', session_id_param;
    
    -- Get session info
    SELECT * INTO v_session_record
    FROM public.marketplace_sessions
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ [PROCESS WINNER] Session not found';
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    IF v_session_record.status = 'completed' THEN
        RAISE NOTICE '⚠️ [PROCESS WINNER] Session already completed';
        RETURN jsonb_build_object('success', false, 'message', 'Session already completed');
    END IF;
    
    v_listing_id := v_session_record.listing_id;
    SELECT seller_id INTO v_seller_id FROM public.marketplace_listings WHERE id = v_listing_id;
    
    RAISE NOTICE '📝 [PROCESS WINNER] Listing ID: %, Seller ID: %', v_listing_id, v_seller_id;
    
    -- Find winner
    SELECT p.user_id, p.score, u.username
    INTO v_winner_record
    FROM public.marketplace_participants p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.session_id = session_id_param
        AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ [PROCESS WINNER] No participants with scores, resetting session';
        PERFORM reset_marketplace_session(v_listing_id::TEXT);
        RETURN jsonb_build_object('success', false, 'message', 'No participants with scores, session reset');
    END IF;
    
    RAISE NOTICE '🏆 [PROCESS WINNER] Winner: % (score: %)', v_winner_record.username, v_winner_record.score;
    
    -- Calculate payouts
    v_platform_fee := v_session_record.prize_pool * 0.15;
    v_seller_share := v_session_record.prize_pool * 0.85;
    
    RAISE NOTICE '💰 [PROCESS WINNER] Prize pool: %, Platform fee: %, Seller share: %', 
        v_session_record.prize_pool, v_platform_fee, v_seller_share;
    
    -- Update session
    UPDATE public.marketplace_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner_record.user_id,
        winner_username = v_winner_record.username,
        winner_score = v_winner_record.score,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Update listing
    UPDATE public.marketplace_listings
    SET 
        status = 'winner_selected',
        updated_at = NOW()
    WHERE id = v_listing_id;
    
    RAISE NOTICE '✅ [PROCESS WINNER] Database updated';
    
    -- Send winner notification
    RAISE NOTICE '💬 [PROCESS WINNER] Sending winner notification to user: %', v_winner_record.user_id;
    BEGIN
        v_winner_msg_id := notify_marketplace_winner(
            v_listing_id,
            v_winner_record.user_id
        );
        RAISE NOTICE '✅ [PROCESS WINNER] Winner notification sent: %', v_winner_msg_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ [PROCESS WINNER] Failed to send winner notification: %', SQLERRM;
        -- Continue anyway
    END;
    
    -- Send seller notification
    RAISE NOTICE '💬 [PROCESS WINNER] Sending seller notification to user: %', v_seller_id;
    BEGIN
        v_seller_msg_id := notify_marketplace_seller(
            v_listing_id,
            v_winner_record.user_id,
            v_seller_share
        );
        RAISE NOTICE '✅ [PROCESS WINNER] Seller notification sent: %', v_seller_msg_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ [PROCESS WINNER] Failed to send seller notification: %', SQLERRM;
        -- Continue anyway
    END;
    
    RAISE NOTICE '🎉 [PROCESS WINNER] Complete! Winner: %, Messages: winner=%, seller=%', 
        v_winner_record.username, v_winner_msg_id, v_seller_msg_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Winner determined and notifications sent',
        'winner_id', v_winner_record.user_id,
        'winner_username', v_winner_record.username,
        'winner_score', v_winner_record.score,
        'seller_share', v_seller_share,
        'platform_fee', v_platform_fee,
        'winner_message_id', v_winner_msg_id,
        'seller_message_id', v_seller_msg_id
    );
END;
$$;

-- Step 2: Create a manual trigger function to send messages for existing winners
CREATE OR REPLACE FUNCTION public.send_missing_winner_messages()
RETURNS TABLE (
    listing_id UUID,
    winner_username TEXT,
    winner_msg_sent BOOLEAN,
    seller_msg_sent BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing RECORD;
    v_winner_msg_id UUID;
    v_seller_msg_id UUID;
    v_error TEXT;
    v_seller_share NUMERIC;
BEGIN
    -- Find all completed sessions with winners but no messages sent
    FOR v_listing IN 
        SELECT 
            ml.id as listing_id,
            ml.seller_id,
            ms.winner_user_id,
            ms.winner_username,
            ms.prize_pool,
            ms.id as session_id
        FROM public.marketplace_listings ml
        JOIN public.marketplace_sessions ms ON ms.listing_id = ml.id
        WHERE ms.status = 'completed'
            AND ms.winner_user_id IS NOT NULL
            AND ml.status = 'winner_selected'
    LOOP
        v_error := NULL;
        v_winner_msg_id := NULL;
        v_seller_msg_id := NULL;
        v_seller_share := v_listing.prize_pool * 0.85;
        
        RAISE NOTICE '📧 Sending messages for listing: %, winner: %', v_listing.listing_id, v_listing.winner_username;
        
        -- Send winner notification
        BEGIN
            v_winner_msg_id := notify_marketplace_winner(
                v_listing.listing_id,
                v_listing.winner_user_id
            );
        EXCEPTION WHEN OTHERS THEN
            v_error := SQLERRM;
            RAISE NOTICE '❌ Failed to send winner notification: %', v_error;
        END;
        
        -- Send seller notification
        BEGIN
            v_seller_msg_id := notify_marketplace_seller(
                v_listing.listing_id,
                v_listing.winner_user_id,
                v_seller_share
            );
        EXCEPTION WHEN OTHERS THEN
            v_error := COALESCE(v_error || ' | ', '') || SQLERRM;
            RAISE NOTICE '❌ Failed to send seller notification: %', SQLERRM;
        END;
        
        -- Return result
        listing_id := v_listing.listing_id;
        winner_username := v_listing.winner_username;
        winner_msg_sent := v_winner_msg_id IS NOT NULL;
        seller_msg_sent := v_seller_msg_id IS NOT NULL;
        error_message := v_error;
        
        RETURN NEXT;
    END LOOP;
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.process_marketplace_winner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_missing_winner_messages() TO authenticated;

-- ============================================
-- USAGE INSTRUCTIONS:
-- ============================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Run the diagnostic: SELECT * FROM send_missing_winner_messages();
-- 3. Check your messages in the dashboard!
-- ============================================

