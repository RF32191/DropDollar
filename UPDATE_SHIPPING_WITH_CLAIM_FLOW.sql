-- ============================================
-- UPDATE SHIPPING TO WORK WITH CLAIM FLOW
-- ============================================
-- Integrates with existing claim prize button
-- Allows address saving in dashboard
-- Admin messages with tracking button
-- ============================================

-- Step 1: Add saved addresses to user profile
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS saved_addresses JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS default_shipping_address JSONB;

-- Step 2: Update the existing claim prize flow to save address
-- This modifies the admin message that's sent to the seller

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
BEGIN
    -- Calculate seller earnings
    v_seller_earnings := p_prize_amount - COALESCE(p_platform_fee, 0);
    
    -- Send admin message to seller with address AND tracking button
    INSERT INTO public.admin_messages (
        user_id,
        message_type,
        title,
        message,
        action_type,
        action_label,
        action_url,
        metadata,
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

💰 PAYMENT DETAILS:
Prize Pool: $%s
Platform Fee (15%%): $%s
YOUR EARNINGS: $%s

⚠️ IMPORTANT NEXT STEPS:
1. Package the item securely
2. Ship to the address above
3. Click the button below to submit tracking
4. Funds will be RELEASED to your wallet immediately after tracking is submitted
5. You can then withdraw via Stripe

Your funds are currently in PENDING status until you provide tracking.',
            p_winner_username,
            p_listing_title,
            COALESCE(p_winner_address->>'name', 'N/A'),
            COALESCE(p_winner_address->>'address_line1', 'N/A'),
            COALESCE(p_winner_address->>'city', 'N/A'),
            COALESCE(p_winner_address->>'state', 'N/A'),
            COALESCE(p_winner_address->>'postal_code', 'N/A'),
            COALESCE(p_winner_address->>'country', 'USA'),
            p_prize_amount,
            COALESCE(p_platform_fee, 0),
            v_seller_earnings
        ),
        'submit_tracking',
        '📝 Submit Tracking Number',
        '/dashboard?tab=seller&action=submit_tracking&session=' || p_session_id::TEXT,
        jsonb_build_object(
            'session_id', p_session_id,
            'winner_id', p_winner_id,
            'winner_username', p_winner_username,
            'winner_address', p_winner_address,
            'seller_earnings', v_seller_earnings,
            'listing_title', p_listing_title,
            'requires_action', true,
            'action_type', 'submit_tracking'
        ),
        NOW()
    ) RETURNING id INTO v_message_id;
    
    -- Also add to pending wallet
    INSERT INTO public.seller_wallets (
        seller_id,
        pending_balance,
        total_pending_sales
    ) VALUES (
        p_seller_id,
        v_seller_earnings,
        1
    )
    ON CONFLICT (seller_id) DO UPDATE SET
        pending_balance = seller_wallets.pending_balance + v_seller_earnings,
        total_pending_sales = seller_wallets.total_pending_sales + 1,
        updated_at = NOW();
    
    -- Send notification to platform admin for monitoring
    INSERT INTO public.admin_notifications (
        type,
        title,
        message,
        severity,
        metadata,
        created_at
    ) VALUES (
        'sale_pending_shipment',
        'Sale Awaiting Shipment',
        format('Seller %s needs to ship %s to %s. Earnings: $%s pending.',
            p_seller_id,
            p_listing_title,
            p_winner_username,
            v_seller_earnings
        ),
        'info',
        jsonb_build_object(
            'session_id', p_session_id,
            'seller_id', p_seller_id,
            'winner_id', p_winner_id,
            'amount', v_seller_earnings
        ),
        NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_seller_address_notification(UUID, UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC) TO authenticated;

-- Step 3: Enhanced tracking submission that notifies admin
CREATE OR REPLACE FUNCTION public.submit_tracking_number_with_notifications(
    p_session_id UUID,
    p_tracking_number TEXT,
    p_tracking_provider TEXT,
    p_estimated_delivery TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_winner_id UUID;
    v_winner_username TEXT;
    v_prize_amount NUMERIC;
    v_platform_fee NUMERIC;
    v_seller_earnings NUMERIC;
    v_listing_title TEXT;
    v_tracking_url TEXT;
    v_winner_address JSONB;
    v_result JSON;
BEGIN
    -- Get session details
    SELECT 
        ml.seller_id, 
        ms.winner_user_id, 
        u.username,
        ms.winner_prize, 
        ms.platform_fee, 
        ml.title,
        ms.winner_shipping_address
    INTO v_seller_id, v_winner_id, v_winner_username, v_prize_amount, v_platform_fee, v_listing_title, v_winner_address
    FROM public.marketplace_sessions ms
    JOIN public.marketplace_listings ml ON ml.id = ms.listing_id
    LEFT JOIN public.users u ON u.id = ms.winner_user_id
    WHERE ms.id = p_session_id;
    
    -- Verify caller is the seller
    IF v_seller_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the seller can submit tracking numbers';
    END IF;
    
    -- Calculate seller earnings
    v_seller_earnings := v_prize_amount - COALESCE(v_platform_fee, 0);
    
    -- Generate tracking URL based on provider
    CASE LOWER(p_tracking_provider)
        WHEN 'usps' THEN
            v_tracking_url := 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' || p_tracking_number;
        WHEN 'ups' THEN
            v_tracking_url := 'https://www.ups.com/track?tracknum=' || p_tracking_number;
        WHEN 'fedex' THEN
            v_tracking_url := 'https://www.fedex.com/fedextrack/?trknbr=' || p_tracking_number;
        WHEN 'dhl' THEN
            v_tracking_url := 'https://www.dhl.com/en/express/tracking.html?AWB=' || p_tracking_number;
        ELSE
            v_tracking_url := NULL;
    END CASE;
    
    -- Update marketplace_session with tracking info
    UPDATE public.marketplace_sessions
    SET 
        tracking_number = p_tracking_number,
        tracking_provider = p_tracking_provider,
        tracking_url = v_tracking_url,
        shipped_at = NOW(),
        estimated_delivery = COALESCE(p_estimated_delivery, NOW() + INTERVAL '7 days'),
        shipping_status = 'shipped',
        funds_released = true,
        funds_released_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;
    
    -- Add shipping update entry
    INSERT INTO public.shipping_updates (session_id, status, description)
    VALUES (
        p_session_id,
        'shipped',
        'Package shipped with tracking number: ' || p_tracking_number
    );
    
    -- Update seller wallet - move from pending to released
    INSERT INTO public.seller_wallets (
        seller_id,
        pending_balance,
        released_balance,
        total_released_sales,
        total_earned
    ) VALUES (
        v_seller_id,
        -v_seller_earnings,  -- Remove from pending
        v_seller_earnings,   -- Add to released
        1,
        v_seller_earnings
    )
    ON CONFLICT (seller_id) DO UPDATE SET
        pending_balance = GREATEST(0, seller_wallets.pending_balance - v_seller_earnings),
        released_balance = seller_wallets.released_balance + v_seller_earnings,
        total_released_sales = seller_wallets.total_released_sales + 1,
        total_earned = seller_wallets.total_earned + v_seller_earnings,
        updated_at = NOW();
    
    -- 1. Send admin message to WINNER (shipping notification)
    INSERT INTO public.admin_messages (
        user_id,
        message_type,
        title,
        message,
        action_type,
        action_label,
        action_url,
        metadata,
        created_at
    ) VALUES (
        v_winner_id,
        'shipping_update',
        '📦 Your Prize Has Shipped!',
        format(
            'Great news! Your prize "%s" has been shipped by the seller!

🚚 TRACKING INFORMATION:
Carrier: %s
Tracking Number: %s
Estimated Delivery: %s

📍 TRACK YOUR PACKAGE:
%s

📮 SHIPPING TO:
%s
%s
%s, %s %s

The seller has confirmed shipment and provided tracking. You should receive your prize soon!

If you have any issues with delivery, please contact support.',
            v_listing_title,
            p_tracking_provider,
            p_tracking_number,
            TO_CHAR(COALESCE(p_estimated_delivery, NOW() + INTERVAL '7 days'), 'Mon DD, YYYY'),
            COALESCE(v_tracking_url, 'Check with carrier: ' || p_tracking_number),
            COALESCE(v_winner_address->>'name', 'N/A'),
            COALESCE(v_winner_address->>'address_line1', 'N/A'),
            COALESCE(v_winner_address->>'city', 'N/A'),
            COALESCE(v_winner_address->>'state', 'N/A'),
            COALESCE(v_winner_address->>'postal_code', 'N/A')
        ),
        'track_shipment',
        '📦 Track Package',
        COALESCE(v_tracking_url, '/dashboard?tab=messages'),
        jsonb_build_object(
            'session_id', p_session_id,
            'tracking_number', p_tracking_number,
            'tracking_provider', p_tracking_provider,
            'tracking_url', v_tracking_url,
            'action_required', false
        ),
        NOW()
    );
    
    -- 2. Send admin message to SELLER (funds released confirmation)
    INSERT INTO public.admin_messages (
        user_id,
        message_type,
        title,
        message,
        action_type,
        action_label,
        action_url,
        metadata,
        created_at
    ) VALUES (
        v_seller_id,
        'funds_released',
        '💰 Funds Released - $' || v_seller_earnings::TEXT,
        format(
            'Your funds have been released and are now available for withdrawal!

📦 SHIPMENT CONFIRMED:
Item: %s
Winner: %s
Tracking: %s (%s)

💵 PAYMENT DETAILS:
Prize Pool: $%s
Platform Fee (15%%): $%s
YOUR EARNINGS: $%s

✅ STATUS: Funds released to your wallet
💳 AVAILABLE FOR WITHDRAWAL via Stripe

The buyer has been notified with tracking information.

Track shipment: %s',
            v_listing_title,
            v_winner_username,
            p_tracking_number,
            p_tracking_provider,
            v_prize_amount,
            COALESCE(v_platform_fee, 0),
            v_seller_earnings,
            COALESCE(v_tracking_url, 'Check with carrier')
        ),
        'withdraw_funds',
        '💰 Withdraw to Bank',
        '/dashboard?tab=seller&action=withdraw',
        jsonb_build_object(
            'session_id', p_session_id,
            'amount_released', v_seller_earnings,
            'can_withdraw', true
        ),
        NOW()
    );
    
    -- 3. Send notification to PLATFORM ADMIN (tracking submitted)
    INSERT INTO public.admin_notifications (
        type,
        title,
        message,
        severity,
        metadata,
        created_at
    ) VALUES (
        'tracking_submitted',
        'Tracking Number Submitted',
        format('Seller has shipped %s to %s. Tracking: %s (%s). Funds released: $%s',
            v_listing_title,
            v_winner_username,
            p_tracking_number,
            p_tracking_provider,
            v_seller_earnings
        ),
        'info',
        jsonb_build_object(
            'session_id', p_session_id,
            'seller_id', v_seller_id,
            'winner_id', v_winner_id,
            'tracking_number', p_tracking_number,
            'tracking_provider', p_tracking_provider,
            'tracking_url', v_tracking_url,
            'amount_released', v_seller_earnings,
            'estimated_delivery', COALESCE(p_estimated_delivery, NOW() + INTERVAL '7 days')
        ),
        NOW()
    );
    
    -- Return success
    v_result := json_build_object(
        'success', true,
        'message', 'Tracking number submitted and funds released',
        'tracking_number', p_tracking_number,
        'tracking_provider', p_tracking_provider,
        'tracking_url', v_tracking_url,
        'funds_released', v_seller_earnings,
        'estimated_delivery', COALESCE(p_estimated_delivery, NOW() + INTERVAL '7 days'),
        'notifications_sent', json_build_object(
            'winner', true,
            'seller', true,
            'admin', true
        )
    );
    
    RETURN v_result;
    
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tracking_number_with_notifications(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- Step 4: Function to save/update user shipping address
CREATE OR REPLACE FUNCTION public.save_shipping_address(
    p_address JSONB,
    p_set_as_default BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_saved_addresses JSONB;
    v_address_with_id JSONB;
    v_result JSON;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Add ID and timestamp to address
    v_address_with_id := p_address || jsonb_build_object(
        'id', gen_random_uuid()::TEXT,
        'created_at', NOW()
    );
    
    -- Get current saved addresses
    SELECT COALESCE(saved_addresses, '[]'::jsonb)
    INTO v_saved_addresses
    FROM public.users
    WHERE id = v_user_id;
    
    -- Add new address to array
    v_saved_addresses := v_saved_addresses || jsonb_build_array(v_address_with_id);
    
    -- Update user record
    IF p_set_as_default THEN
        UPDATE public.users
        SET 
            saved_addresses = v_saved_addresses,
            default_shipping_address = v_address_with_id,
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        UPDATE public.users
        SET 
            saved_addresses = v_saved_addresses,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;
    
    v_result := json_build_object(
        'success', true,
        'message', 'Address saved successfully',
        'address_id', v_address_with_id->>'id',
        'is_default', p_set_as_default
    );
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_shipping_address(JSONB, BOOLEAN) TO authenticated;

-- Step 5: Function to get user's saved addresses
CREATE OR REPLACE FUNCTION public.get_saved_addresses()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'saved_addresses', COALESCE(saved_addresses, '[]'::jsonb),
        'default_address', default_shipping_address
    ) INTO v_result
    FROM public.users
    WHERE id = auth.uid();
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_saved_addresses() TO authenticated;

-- Final summary
SELECT '
============================================
✅ UPDATED SHIPPING SYSTEM!
============================================

🎯 WHAT CHANGED:

1. ADDRESS SAVING:
   ✅ Users can save addresses in dashboard
   ✅ Set default shipping address
   ✅ Reuse saved addresses when claiming
   ✅ save_shipping_address() function
   ✅ get_saved_addresses() function

2. CLAIM FLOW INTEGRATION:
   ✅ Winner claims prize → provides address
   ✅ Address saved if they want
   ✅ Seller gets admin message with address
   ✅ Message includes [Submit Tracking] button

3. TRACKING SUBMISSION:
   ✅ Seller clicks button in admin message
   ✅ Opens tracking submission form
   ✅ Submits tracking number + carrier
   ✅ Three messages sent automatically:
      → Winner: "Your prize has shipped!" + tracking
      → Seller: "Funds released!" + can withdraw
      → Admin: Platform notification for monitoring

4. ADMIN MESSAGES:
   ✅ Winner: Shipping notification with tracking link
   ✅ Seller: Fund release notification with withdrawal option
   ✅ Platform Admin: Tracking submitted for monitoring
   ✅ All include action buttons and metadata

5. FUND FLOW:
   Prize won → Pending wallet (awaiting tracking)
   Tracking submitted → Released wallet (can withdraw)
   Seller withdraws → Stripe Connect payout

📋 FUNCTIONS AVAILABLE:

For claiming/address:
- save_shipping_address(address_json, set_default)
- get_saved_addresses()

For sellers:
- send_seller_address_notification() (called when winner claims)
- submit_tracking_number_with_notifications() (seller submits tracking)
- get_seller_wallet()
- get_pending_shipments()

For both:
- get_shipping_status(session_id)

🎯 COMPLETE FLOW:

1. Winner clicks [Claim Prize]
2. Enters/selects shipping address
3. Address saved + seller notified
4. Seller gets admin message: "Winner Address Received"
   - Shows full address
   - Shows earnings (pending)
   - [Submit Tracking Number] button
5. Seller ships item, clicks button
6. Enters tracking# + carrier
7. THREE messages sent:
   - Winner: tracking info
   - Seller: funds released
   - Admin: notification
8. Funds move pending → released
9. Seller can withdraw via Stripe

============================================
' as final_summary;

