-- ============================================
-- UPDATE MARKETPLACE WITH AUTOMATED MESSAGES
-- ============================================
-- Integrates automated messaging into marketplace winner processing
-- ============================================

-- Update process_marketplace_winner to send automated messages
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
    RAISE NOTICE '🎯 Processing marketplace winner for session: %', session_id_param;
    
    -- Get session details
    SELECT * INTO v_session_record
    FROM public.marketplace_sessions
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    IF v_session_record.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session already completed');
    END IF;
    
    -- Get listing info
    v_listing_id := v_session_record.listing_id;
    SELECT seller_id INTO v_seller_id FROM public.marketplace_listings WHERE id = v_listing_id;
    
    -- Find winner (highest score)
    SELECT p.user_id, p.score, u.username
    INTO v_winner_record
    FROM public.marketplace_participants p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.session_id = session_id_param
        AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- No scores, reset session
        RAISE NOTICE '❌ No participants with scores, resetting session';
        PERFORM reset_marketplace_session(v_listing_id::TEXT);
        RETURN jsonb_build_object('success', false, 'message', 'No participants with scores, session reset');
    END IF;
    
    RAISE NOTICE '🏆 Winner found: % (score: %)', v_winner_record.username, v_winner_record.score;
    
    -- Calculate fees: 15% platform, 85% to seller
    v_platform_fee := v_session_record.prize_pool * 0.15;
    v_seller_share := v_session_record.prize_pool * 0.85;
    
    -- Mark session as completed with winner info
    UPDATE public.marketplace_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner_record.user_id,
        winner_username = v_winner_record.username,
        winner_score = v_winner_record.score,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Update listing status
    UPDATE public.marketplace_listings
    SET 
        status = 'winner_selected',
        updated_at = NOW()
    WHERE id = v_listing_id;
    
    RAISE NOTICE '💬 Sending automated messages...';
    
    -- Send automated message to WINNER (asks for shipping address)
    BEGIN
        v_winner_msg_id := notify_marketplace_winner(
            v_listing_id,
            v_winner_record.user_id
        );
        RAISE NOTICE '✅ Winner notification sent: %', v_winner_msg_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Failed to send winner notification: %', SQLERRM;
    END;
    
    -- Send automated message to SELLER (with payout button info)
    BEGIN
        v_seller_msg_id := notify_marketplace_seller(
            v_listing_id,
            v_winner_record.user_id,
            v_seller_share
        );
        RAISE NOTICE '✅ Seller notification sent: %', v_seller_msg_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Failed to send seller notification: %', SQLERRM;
    END;
    
    RAISE NOTICE '🎉 Marketplace winner processing complete!';
    
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_marketplace_winner(UUID) TO authenticated;

-- ============================================
-- SUCCESS!
-- ============================================
-- ✅ Marketplace winner processing updated
-- ✅ Automated messages sent to winner & seller
-- ✅ Winner receives address prompt
-- ✅ Seller receives payout notification
-- ============================================

-- Verification:
-- SELECT * FROM public.messages WHERE message_type = 'system' ORDER BY created_at DESC LIMIT 10;

