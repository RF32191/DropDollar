-- ============================================
-- FIX SELLER NOTIFICATIONS & ADD SHIPPO INTEGRATION
-- ============================================
-- Fixes seller not receiving address/tracking button
-- Adds Shippo API for automated label generation
-- ============================================

-- Step 1: Ensure send_seller_address_notification creates proper admin messages
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
    v_message_id UUID;
    v_admin_email TEXT := 'rf32191@yahoo.com';
BEGIN
    -- Calculate seller earnings
    v_seller_earnings := p_prize_amount - COALESCE(p_platform_fee, 0);
    
    -- Ensure seller wallet exists
    INSERT INTO public.seller_wallets (seller_id, pending_balance, released_balance, created_at, updated_at)
    VALUES (p_seller_id, 0, 0, NOW(), NOW())
    ON CONFLICT (seller_id) DO NOTHING;
    
    -- Add to pending wallet
    UPDATE public.seller_wallets
    SET 
        pending_balance = pending_balance + v_seller_earnings,
        total_pending_sales = COALESCE(total_pending_sales, 0) + 1,
        updated_at = NOW()
    WHERE seller_id = p_seller_id;
    
    -- Send admin message to seller with address AND tracking button
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
    ) RETURNING id INTO v_message_id;
    
    -- Send notification to winner confirming address was sent
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
    );
    
    -- Send notification to platform admin for monitoring
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

The seller has been notified and funds are in their pending wallet.',
            p_listing_title,
            p_prize_amount,
            v_seller_earnings,
            p_winner_username,
            p_seller_id,
            COALESCE(p_winner_address->>'name', 'N/A'),
            COALESCE(p_winner_address->>'address_line1', 'N/A'),
            COALESCE(p_winner_address->>'city', 'N/A'),
            COALESCE(p_winner_address->>'state', 'N/A'),
            COALESCE(p_winner_address->>'postal_code', 'N/A')
        ),
        jsonb_build_object(
            'session_id', p_session_id,
            'seller_id', p_seller_id,
            'winner_id', p_winner_id,
            'amount', v_seller_earnings
        ),
        NOW()
    FROM public.users u
    WHERE u.email = v_admin_email;
    
    RAISE NOTICE '✅ Notifications sent: Seller (%), Winner (%), Admin', p_seller_id, p_winner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_seller_address_notification(UUID, UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC) TO authenticated;

-- Step 2: Create Shippo API integration function
CREATE OR REPLACE FUNCTION public.generate_shipping_label_shippo(
    p_session_id UUID,
    p_package_weight NUMERIC, -- in ounces
    p_package_length NUMERIC, -- in inches
    p_package_width NUMERIC,
    p_package_height NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_winner_address JSONB;
    v_seller_address JSONB;
    v_listing_title TEXT;
    v_shippo_api_key TEXT := 'shippo_live_681a4c1a82c58013760d8065fc1b61a6ac680014';
    v_result JSON;
BEGIN
    -- Get session details
    SELECT 
        ml.seller_id,
        ms.winner_shipping_address,
        ml.title
    INTO v_seller_id, v_winner_address, v_listing_title
    FROM public.marketplace_sessions ms
    JOIN public.marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ms.id = p_session_id;
    
    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    -- Verify caller is the seller
    IF v_seller_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the seller can generate shipping labels';
    END IF;
    
    -- Get seller's address from profile
    SELECT jsonb_build_object(
        'name', COALESCE(username, split_part(email, '@', 1)),
        'street1', shipping_address_line1,
        'street2', shipping_address_line2,
        'city', shipping_city,
        'state', shipping_state,
        'zip', shipping_postal_code,
        'country', COALESCE(shipping_country, 'US'),
        'phone', shipping_phone,
        'email', email
    ) INTO v_seller_address
    FROM public.users
    WHERE id = v_seller_id;
    
    -- Return shippo configuration for frontend to make API call
    -- (Supabase functions can't make external HTTP calls by default)
    v_result := jsonb_build_object(
        'shippo_api_key', v_shippo_api_key,
        'from_address', jsonb_build_object(
            'name', v_seller_address->>'name',
            'street1', v_seller_address->>'street1',
            'street2', COALESCE(v_seller_address->>'street2', ''),
            'city', v_seller_address->>'city',
            'state', v_seller_address->>'state',
            'zip', v_seller_address->>'zip',
            'country', v_seller_address->>'country',
            'phone', COALESCE(v_seller_address->>'phone', ''),
            'email', v_seller_address->>'email'
        ),
        'to_address', jsonb_build_object(
            'name', v_winner_address->>'name',
            'street1', v_winner_address->>'address_line1',
            'street2', COALESCE(v_winner_address->>'address_line2', ''),
            'city', v_winner_address->>'city',
            'state', v_winner_address->>'state',
            'zip', v_winner_address->>'postal_code',
            'country', COALESCE(v_winner_address->>'country', 'US'),
            'phone', COALESCE(v_winner_address->>'phone', ''),
            'email', ''
        ),
        'parcel', jsonb_build_object(
            'length', p_package_length,
            'width', p_package_width,
            'height', p_package_height,
            'distance_unit', 'in',
            'weight', p_package_weight,
            'mass_unit', 'oz'
        ),
        'session_id', p_session_id,
        'listing_title', v_listing_title
    );
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_shipping_label_shippo(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- Step 3: Function to save generated label and submit tracking
CREATE OR REPLACE FUNCTION public.save_shippo_label_and_submit_tracking(
    p_session_id UUID,
    p_tracking_number TEXT,
    p_tracking_provider TEXT,
    p_tracking_url TEXT,
    p_label_url TEXT,
    p_rate_amount NUMERIC,
    p_estimated_delivery TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Store label info in session
    UPDATE public.marketplace_sessions
    SET 
        tracking_number = p_tracking_number,
        tracking_provider = p_tracking_provider,
        tracking_url = p_tracking_url,
        estimated_delivery = p_estimated_delivery,
        tracking_submitted_at = NOW(),
        funds_released = true,
        funds_released_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;
    
    -- Call the existing notification function to release funds and notify everyone
    SELECT * INTO v_result
    FROM public.submit_tracking_number_with_notifications(
        p_session_id,
        p_tracking_number,
        p_tracking_provider,
        p_estimated_delivery
    );
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_shippo_label_and_submit_tracking(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ NOTIFICATIONS & SHIPPO INTEGRATION COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📧 NOTIFICATIONS FIXED:';
    RAISE NOTICE '   ✅ Seller gets address + tracking button';
    RAISE NOTICE '   ✅ Winner gets confirmation message';
    RAISE NOTICE '   ✅ Admin gets monitoring notification';
    RAISE NOTICE '';
    RAISE NOTICE '📦 SHIPPO INTEGRATION ADDED:';
    RAISE NOTICE '   ✅ API Key: shippo_live_681a...';
    RAISE NOTICE '   ✅ Automated label generation';
    RAISE NOTICE '   ✅ Functions: generate_shipping_label_shippo()';
    RAISE NOTICE '   ✅ Functions: save_shippo_label_and_submit_tracking()';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 NEXT: Create frontend UI for Shippo integration';
    RAISE NOTICE '============================================';
END $$;

