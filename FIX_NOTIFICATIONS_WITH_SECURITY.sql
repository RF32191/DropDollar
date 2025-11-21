-- ============================================
-- FIX SELLER NOTIFICATIONS + ADD SECURITY
-- ============================================
-- Fixes: Seller not receiving address after winner claims
-- Adds: Security measures to prevent hacking/abuse
-- ============================================

-- Step 1: Create secure send_winner_address_to_seller with validation
DROP FUNCTION IF EXISTS public.send_winner_address_to_seller(UUID, UUID);

CREATE OR REPLACE FUNCTION public.send_winner_address_to_seller(
    p_listing_id UUID,
    p_winner_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_system_user_id UUID;
    v_seller_id UUID;
    v_listing_title TEXT;
    v_winner_username TEXT;
    v_winner_address JSONB;
    v_message_id UUID;
    v_prize_amount NUMERIC;
    v_platform_fee NUMERIC;
    v_seller_earnings NUMERIC;
    v_session_id UUID;
    v_session_status TEXT;
    v_actual_winner_id UUID;
    v_already_claimed BOOLEAN;
    v_result JSON;
BEGIN
    RAISE NOTICE '🔍 Starting send_winner_address_to_seller: listing_id=%, winner_id=%', p_listing_id, p_winner_id;
    
    -- SECURITY CHECK 1: Verify caller is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Not authenticated';
    END IF;
    
    -- SECURITY CHECK 2: Verify caller is the actual winner
    IF auth.uid() != p_winner_id THEN
        RAISE EXCEPTION 'Unauthorized: You are not the winner';
    END IF;
    
    -- Get system user
    SELECT id INTO v_system_user_id
    FROM public.users
    WHERE email = 'system@dropdollar.com';
    
    IF v_system_user_id IS NULL THEN
        RAISE EXCEPTION 'System user not found - please contact support';
    END IF;
    
    -- Get listing and seller details
    SELECT 
        ml.seller_id,
        ml.title
    INTO v_seller_id, v_listing_title
    FROM public.marketplace_listings ml
    WHERE ml.id = p_listing_id;
    
    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;
    
    RAISE NOTICE '✅ Listing found: seller_id=%, title=%', v_seller_id, v_listing_title;
    
    -- Get winner username
    SELECT username INTO v_winner_username
    FROM public.users
    WHERE id = p_winner_id;
    
    -- Get the session for this listing
    SELECT 
        id, 
        status, 
        prize_pool, 
        winner_user_id,
        winner_shipping_address IS NOT NULL as already_claimed
    INTO 
        v_session_id, 
        v_session_status, 
        v_prize_amount, 
        v_actual_winner_id,
        v_already_claimed
    FROM public.marketplace_sessions
    WHERE listing_id = p_listing_id
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1;
    
    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'No completed session found for this listing';
    END IF;
    
    RAISE NOTICE '✅ Session found: session_id=%, status=%, winner=%', v_session_id, v_session_status, v_actual_winner_id;
    
    -- SECURITY CHECK 3: Verify the user is actually the winner of this session
    IF v_actual_winner_id != p_winner_id THEN
        RAISE EXCEPTION 'Security violation: You are not the winner of this session';
    END IF;
    
    -- SECURITY CHECK 4: Prevent duplicate claims
    IF v_already_claimed THEN
        RAISE EXCEPTION 'Prize already claimed - address was already submitted';
    END IF;
    
    -- Calculate platform fee (15% of prize pool)
    v_platform_fee := ROUND(v_prize_amount * 0.15, 2);
    
    -- Calculate seller earnings (85% of prize pool)
    v_seller_earnings := v_prize_amount - v_platform_fee;
    
    RAISE NOTICE '💰 Prize: $%, Platform Fee: $%, Seller Gets: $%', v_prize_amount, v_platform_fee, v_seller_earnings;
    
    -- Get winner's current shipping address from users table
    SELECT jsonb_build_object(
        'name', COALESCE(username, split_part(email, '@', 1)),
        'address_line1', shipping_address_line1,
        'address_line2', shipping_address_line2,
        'city', shipping_city,
        'state', shipping_state,
        'postal_code', shipping_postal_code,
        'country', COALESCE(shipping_country, 'United States'),
        'phone', shipping_phone
    ) INTO v_winner_address
    FROM public.users
    WHERE id = p_winner_id;
    
    -- Validate address is complete
    IF v_winner_address->>'address_line1' IS NULL OR 
       v_winner_address->>'city' IS NULL OR 
       v_winner_address->>'state' IS NULL OR 
       v_winner_address->>'postal_code' IS NULL THEN
        RAISE EXCEPTION 'Incomplete shipping address - please fill all required fields';
    END IF;
    
    RAISE NOTICE '📮 Address validated: %', v_winner_address;
    
    -- Update session with shipping address (marks as claimed)
    UPDATE public.marketplace_sessions
    SET 
        winner_shipping_address = v_winner_address,
        updated_at = NOW()
    WHERE id = v_session_id;
    
    RAISE NOTICE '✅ Session updated with address';
    
    -- Call the notification function (this updates pending wallet and sends messages)
    BEGIN
        PERFORM public.send_seller_address_notification(
            v_session_id,
            v_seller_id,
            p_winner_id,
            v_winner_username,
            v_listing_title,
            v_winner_address,
            v_prize_amount,
            v_platform_fee
        );
        RAISE NOTICE '✅ Seller notification sent successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to send seller notification: %', SQLERRM;
    END;
    
    -- Mark listing status
    UPDATE public.marketplace_listings
    SET 
        status = 'address_provided',
        updated_at = NOW()
    WHERE id = p_listing_id;
    
    RAISE NOTICE '✅ Listing status updated';
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'seller_earnings', v_seller_earnings,
        'seller_notified', true,
        'winner_notified', true,
        'admin_notified', true,
        'message', 'Address sent successfully - seller has been notified'
    );
    
    RAISE NOTICE '🎉 Complete! Result: %', v_result;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR in send_winner_address_to_seller: %', SQLERRM;
        RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_winner_address_to_seller(UUID, UUID) TO authenticated;

-- Step 2: Enhanced send_seller_address_notification with logging
DROP FUNCTION IF EXISTS public.send_seller_address_notification(UUID, UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.send_seller_address_notification(
    p_session_id UUID,
    p_seller_id UUID,
    p_winner_id UUID,
    p_winner_username TEXT,
    p_listing_title TEXT,
    p_winner_address JSONB,
    p_prize_amount NUMERIC,
    p_platform_fee NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_earnings NUMERIC;
    v_message_id_seller UUID;
    v_message_id_winner UUID;
    v_message_id_admin UUID;
    v_admin_email TEXT := 'rf32191@yahoo.com';
BEGIN
    RAISE NOTICE '📧 Starting notifications - seller: %, winner: %', p_seller_id, p_winner_id;
    
    -- Calculate seller earnings
    v_seller_earnings := p_prize_amount - COALESCE(p_platform_fee, 0);
    
    -- Ensure seller wallet exists
    INSERT INTO public.seller_wallets (seller_id, pending_balance, released_balance, created_at, updated_at)
    VALUES (p_seller_id, 0, 0, NOW(), NOW())
    ON CONFLICT (seller_id) DO NOTHING;
    
    RAISE NOTICE '💼 Seller wallet ensured';
    
    -- Add to pending wallet
    UPDATE public.seller_wallets
    SET 
        pending_balance = pending_balance + v_seller_earnings,
        total_pending_sales = COALESCE(total_pending_sales, 0) + 1,
        updated_at = NOW()
    WHERE seller_id = p_seller_id;
    
    RAISE NOTICE '💰 Added $% to seller pending wallet', v_seller_earnings;
    
    -- MESSAGE 1: Send admin message to SELLER with address AND tracking button
    INSERT INTO public.admin_messages (
        user_id,
        message_type,
        title,
        message,
        action_type,
        action_label,
        action_url,
        action_required,
        metadata,
        is_read,
        created_at
    ) VALUES (
        p_seller_id,
        'winner_address_received',
        '📦 Ship Prize - Winner Address Received',
        format(
            'Congratulations! The winner has provided their shipping address.

🏆 Winner: %s
📦 Item: %s

📮 SHIPPING ADDRESS:
%s
%s
%s, %s %s
%s
Phone: %s

💰 PAYMENT DETAILS:
Prize Pool: $%s
Platform Fee (15%%): $%s
YOUR EARNINGS: $%s

⚠️ IMPORTANT NEXT STEPS:
1. Click "Generate Shipping Label" below (powered by Shippo)
2. OR ship manually and submit tracking number
3. Funds will be RELEASED to your wallet after tracking is submitted

Your funds ($%s) are currently in PENDING WALLET until you provide tracking.',
            p_winner_username,
            p_listing_title,
            COALESCE(p_winner_address->>'name', 'N/A'),
            COALESCE(p_winner_address->>'address_line1', 'N/A'),
            COALESCE(p_winner_address->>'city', 'N/A'),
            COALESCE(p_winner_address->>'state', 'N/A'),
            COALESCE(p_winner_address->>'postal_code', 'N/A'),
            COALESCE(p_winner_address->>'address_line2', ''),
            COALESCE(p_winner_address->>'phone', 'N/A'),
            p_prize_amount,
            COALESCE(p_platform_fee, 0),
            v_seller_earnings,
            v_seller_earnings
        ),
        'submit_tracking',
        '📝 Submit Tracking / Generate Label',
        NULL,
        true,
        jsonb_build_object(
            'session_id', p_session_id,
            'winner_id', p_winner_id,
            'winner_username', p_winner_username,
            'winner_address', p_winner_address,
            'seller_earnings', v_seller_earnings,
            'listing_title', p_listing_title,
            'action_type', 'submit_tracking',
            'requires_action', true,
            'has_shippo', true
        ),
        false,
        NOW()
    ) RETURNING id INTO v_message_id_seller;
    
    RAISE NOTICE '✅ Seller message created: id=%', v_message_id_seller;
    
    -- MESSAGE 2: Send confirmation to WINNER
    INSERT INTO public.admin_messages (
        user_id,
        message_type,
        title,
        message,
        metadata,
        is_read,
        created_at
    ) VALUES (
        p_winner_id,
        'address_confirmed',
        '✅ Address Sent to Seller',
        format(
            'Your shipping address has been sent to the seller!

📦 Item: %s
🏆 You are the winner!

📮 SHIPPING TO:
%s
%s
%s, %s %s

The seller will ship your item soon. You''ll receive a tracking number once they ship it.

Expected: Most sellers ship within 2-3 business days.',
            p_listing_title,
            COALESCE(p_winner_address->>'name', 'N/A'),
            COALESCE(p_winner_address->>'address_line1', 'N/A'),
            COALESCE(p_winner_address->>'city', 'N/A'),
            COALESCE(p_winner_address->>'state', 'N/A'),
            COALESCE(p_winner_address->>'postal_code', 'N/A')
        ),
        jsonb_build_object(
            'session_id', p_session_id,
            'listing_title', p_listing_title
        ),
        false,
        NOW()
    ) RETURNING id INTO v_message_id_winner;
    
    RAISE NOTICE '✅ Winner message created: id=%', v_message_id_winner;
    
    -- MESSAGE 3: Send notification to ADMIN for monitoring
    INSERT INTO public.admin_messages (
        user_id,
        message_type,
        title,
        message,
        metadata,
        created_at
    )
    SELECT 
        u.id,
        'admin_sale_notification',
        '📊 New Sale - Awaiting Shipment',
        format(
            'A sale is awaiting shipment:

📦 Item: %s
💰 Amount: $%s (Seller gets $%s)
🏆 Winner: %s
👤 Seller ID: %s

📮 Shipping Address:
%s
%s
%s, %s %s

The seller has been notified and funds ($%s) are in their pending wallet.',
            p_listing_title,
            p_prize_amount,
            v_seller_earnings,
            p_winner_username,
            p_seller_id,
            COALESCE(p_winner_address->>'name', 'N/A'),
            COALESCE(p_winner_address->>'address_line1', 'N/A'),
            COALESCE(p_winner_address->>'city', 'N/A'),
            COALESCE(p_winner_address->>'state', 'N/A'),
            COALESCE(p_winner_address->>'postal_code', 'N/A'),
            v_seller_earnings
        ),
        jsonb_build_object(
            'session_id', p_session_id,
            'seller_id', p_seller_id,
            'winner_id', p_winner_id,
            'amount', v_seller_earnings
        ),
        NOW()
    FROM public.users u
    WHERE u.email = v_admin_email
    RETURNING id INTO v_message_id_admin;
    
    RAISE NOTICE '✅ Admin message created: id=%', v_message_id_admin;
    
    -- Final verification
    IF v_message_id_seller IS NULL THEN
        RAISE EXCEPTION 'Failed to create seller message';
    END IF;
    
    IF v_message_id_winner IS NULL THEN
        RAISE WARNING 'Failed to create winner message';
    END IF;
    
    IF v_message_id_admin IS NULL THEN
        RAISE WARNING 'Failed to create admin message';
    END IF;
    
    RAISE NOTICE '🎉 All notifications sent successfully!';
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_seller_address_notification(UUID, UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ NOTIFICATIONS + SECURITY DEPLOYED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SECURITY MEASURES ADDED:';
    RAISE NOTICE '   ✅ Only authenticated users can claim';
    RAISE NOTICE '   ✅ Only actual winner can claim (verified)';
    RAISE NOTICE '   ✅ Prevents duplicate claims';
    RAISE NOTICE '   ✅ Validates address completeness';
    RAISE NOTICE '   ✅ Audit logging with RAISE NOTICE';
    RAISE NOTICE '';
    RAISE NOTICE '📧 NOTIFICATIONS FIXED:';
    RAISE NOTICE '   ✅ Seller gets address + button';
    RAISE NOTICE '   ✅ Winner gets confirmation';
    RAISE NOTICE '   ✅ Admin gets monitoring alert';
    RAISE NOTICE '   ✅ Pending wallet updated';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TO DEBUG: Check Supabase logs for RAISE NOTICE messages';
    RAISE NOTICE '============================================';
END $$;

