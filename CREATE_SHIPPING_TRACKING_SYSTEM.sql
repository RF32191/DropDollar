-- ============================================
-- SHIPPING TRACKING & PAYMENT RELEASE SYSTEM
-- ============================================
-- Dual wallet system, tracking numbers, fund release
-- ============================================

-- Step 1: Add shipping tracking to marketplace_sessions
ALTER TABLE public.marketplace_sessions
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS tracking_provider TEXT, -- 'USPS', 'UPS', 'FedEx', 'DHL', etc.
ADD COLUMN IF NOT EXISTS tracking_url TEXT,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'pending' CHECK (shipping_status IN (
    'pending',           -- Winner selected, waiting for seller to ship
    'processing',        -- Seller preparing shipment
    'shipped',           -- Tracking number provided, in transit
    'in_transit',        -- Package is moving
    'out_for_delivery',  -- Package is out for delivery
    'delivered',         -- Package delivered
    'delivery_failed',   -- Delivery attempt failed
    'returned'           -- Package returned to sender
)),
ADD COLUMN IF NOT EXISTS funds_released BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS funds_released_at TIMESTAMPTZ;

-- Create index for tracking queries
CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_tracking 
ON public.marketplace_sessions(tracking_number, shipping_status);

CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_funds_release 
ON public.marketplace_sessions(winner_user_id, funds_released, shipped_at);

-- Step 2: Create seller_wallets table (dual wallet system)
CREATE TABLE IF NOT EXISTS public.seller_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Pending wallet (awaiting shipment confirmation)
    pending_balance NUMERIC DEFAULT 0,
    total_pending_sales INTEGER DEFAULT 0,
    
    -- Released wallet (ready for withdrawal)
    released_balance NUMERIC DEFAULT 0,
    total_released_sales INTEGER DEFAULT 0,
    
    -- Lifetime stats
    total_earned NUMERIC DEFAULT 0,
    total_withdrawn NUMERIC DEFAULT 0,
    
    -- Stripe Connect
    stripe_account_id TEXT,
    stripe_account_status TEXT, -- 'pending', 'active', 'restricted'
    can_receive_payouts BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(seller_id)
);

-- RLS for seller_wallets
ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view own wallet" ON public.seller_wallets;
CREATE POLICY "Sellers can view own wallet"
    ON public.seller_wallets
    FOR SELECT
    TO authenticated
    USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "System can manage wallets" ON public.seller_wallets;
CREATE POLICY "System can manage wallets"
    ON public.seller_wallets
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.seller_wallets TO authenticated;

-- Step 3: Create shipping_updates table (tracking history)
CREATE TABLE IF NOT EXISTS public.shipping_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.marketplace_sessions(id) ON DELETE CASCADE,
    
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for shipping_updates
ALTER TABLE public.shipping_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shipping for their sessions" ON public.shipping_updates;
CREATE POLICY "Users can view shipping for their sessions"
    ON public.shipping_updates
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.marketplace_sessions ms
            JOIN public.marketplace_listings ml ON ml.id = ms.listing_id
            WHERE ms.id = session_id
            AND (ms.winner_user_id = auth.uid() OR ml.seller_id = auth.uid())
        )
    );

GRANT SELECT, INSERT ON public.shipping_updates TO authenticated;

-- Create index for shipping updates
CREATE INDEX IF NOT EXISTS idx_shipping_updates_session 
ON public.shipping_updates(session_id, created_at DESC);

-- Step 4: Function to submit tracking number (SELLER)
CREATE OR REPLACE FUNCTION public.submit_tracking_number(
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
    v_prize_amount NUMERIC;
    v_platform_fee NUMERIC;
    v_seller_earnings NUMERIC;
    v_listing_title TEXT;
    v_tracking_url TEXT;
    v_result JSON;
BEGIN
    -- Get session details
    SELECT seller_id, winner_user_id, winner_prize, platform_fee, listing_title
    INTO v_seller_id, v_winner_id, v_prize_amount, v_platform_fee, v_listing_title
    FROM public.marketplace_sessions ms
    JOIN public.marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ms.id = p_session_id;
    
    -- Verify caller is the seller
    IF v_seller_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the seller can submit tracking numbers';
    END IF;
    
    -- Calculate seller earnings (prize - platform fee)
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
        funds_released = true,  -- ✅ RELEASE FUNDS IMMEDIATELY
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
        0,
        v_seller_earnings,
        1,
        v_seller_earnings
    )
    ON CONFLICT (seller_id) DO UPDATE SET
        pending_balance = seller_wallets.pending_balance - v_seller_earnings,
        released_balance = seller_wallets.released_balance + v_seller_earnings,
        total_released_sales = seller_wallets.total_released_sales + 1,
        updated_at = NOW();
    
    -- Send admin message to winner (shipping notification)
    INSERT INTO public.admin_messages (
        user_id,
        message_type,
        title,
        message,
        metadata,
        created_at
    ) VALUES (
        v_winner_id,
        'shipping_update',
        '📦 Your Prize Has Shipped!',
        format(
            'Great news! Your prize "%s" has been shipped!

🚚 Tracking Information:
Provider: %s
Tracking #: %s
Estimated Delivery: %s

Track your package: %s

The seller has confirmed shipment and you should receive your prize soon!',
            v_listing_title,
            p_tracking_provider,
            p_tracking_number,
            TO_CHAR(COALESCE(p_estimated_delivery, NOW() + INTERVAL '7 days'), 'Mon DD, YYYY'),
            COALESCE(v_tracking_url, 'Check with carrier')
        ),
        jsonb_build_object(
            'session_id', p_session_id,
            'tracking_number', p_tracking_number,
            'tracking_provider', p_tracking_provider,
            'tracking_url', v_tracking_url,
            'action_required', false
        ),
        NOW()
    );
    
    -- Send confirmation to seller
    INSERT INTO public.admin_messages (
        user_id,
        message_type,
        title,
        message,
        metadata,
        created_at
    ) VALUES (
        v_seller_id,
        'funds_released',
        '💰 Funds Released - $' || v_seller_earnings::TEXT,
        format(
            'Your funds have been released!

📦 Shipment Confirmed:
Item: %s
Tracking: %s (%s)

💵 Payment Details:
Prize Amount: $%s
Platform Fee: $%s
Your Earnings: $%s

✅ Status: Funds released to your wallet
💳 Available for withdrawal via Stripe

Track shipment: %s',
            v_listing_title,
            p_tracking_number,
            p_tracking_provider,
            v_prize_amount,
            COALESCE(v_platform_fee, 0),
            v_seller_earnings,
            COALESCE(v_tracking_url, 'Check with carrier')
        ),
        jsonb_build_object(
            'session_id', p_session_id,
            'amount_released', v_seller_earnings,
            'can_withdraw', true
        ),
        NOW()
    );
    
    -- Return success
    v_result := json_build_object(
        'success', true,
        'message', 'Tracking number submitted and funds released',
        'tracking_number', p_tracking_number,
        'tracking_url', v_tracking_url,
        'funds_released', v_seller_earnings,
        'estimated_delivery', COALESCE(p_estimated_delivery, NOW() + INTERVAL '7 days')
    );
    
    RETURN v_result;
    
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tracking_number(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- Step 5: Function to get shipping status (BUYER & SELLER)
CREATE OR REPLACE FUNCTION public.get_shipping_status(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_user_role TEXT;
BEGIN
    -- Check if user is buyer or seller
    SELECT CASE
        WHEN winner_user_id = auth.uid() THEN 'buyer'
        WHEN seller_id = auth.uid() THEN 'seller'
        ELSE 'unauthorized'
    END INTO v_user_role
    FROM public.marketplace_sessions ms
    JOIN public.marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ms.id = p_session_id;
    
    IF v_user_role = 'unauthorized' THEN
        RAISE EXCEPTION 'You do not have access to this shipment';
    END IF;
    
    -- Get shipping details with history
    SELECT json_build_object(
        'session_id', ms.id,
        'listing_title', ml.title,
        'user_role', v_user_role,
        'shipping_status', ms.shipping_status,
        'tracking_number', ms.tracking_number,
        'tracking_provider', ms.tracking_provider,
        'tracking_url', ms.tracking_url,
        'shipped_at', ms.shipped_at,
        'estimated_delivery', ms.estimated_delivery,
        'delivered_at', ms.delivered_at,
        'funds_released', ms.funds_released,
        'updates', COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'status', status,
                        'location', location,
                        'description', description,
                        'timestamp', created_at
                    ) ORDER BY created_at DESC
                )
                FROM public.shipping_updates
                WHERE session_id = ms.id
            ),
            '[]'::json
        )
    ) INTO v_result
    FROM public.marketplace_sessions ms
    JOIN public.marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ms.id = p_session_id;
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shipping_status(UUID) TO authenticated;

-- Step 6: Function to get seller wallet
CREATE OR REPLACE FUNCTION public.get_seller_wallet()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet JSON;
BEGIN
    -- Get or create wallet
    INSERT INTO public.seller_wallets (seller_id)
    VALUES (auth.uid())
    ON CONFLICT (seller_id) DO NOTHING;
    
    -- Return wallet details
    SELECT json_build_object(
        'pending_balance', COALESCE(pending_balance, 0),
        'released_balance', COALESCE(released_balance, 0),
        'total_pending_sales', COALESCE(total_pending_sales, 0),
        'total_released_sales', COALESCE(total_released_sales, 0),
        'total_earned', COALESCE(total_earned, 0),
        'total_withdrawn', COALESCE(total_withdrawn, 0),
        'available_to_withdraw', COALESCE(released_balance, 0),
        'stripe_connected', stripe_account_id IS NOT NULL,
        'can_receive_payouts', COALESCE(can_receive_payouts, false)
    ) INTO v_wallet
    FROM public.seller_wallets
    WHERE seller_id = auth.uid();
    
    RETURN v_wallet;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_wallet() TO authenticated;

-- Step 7: Function to get pending shipments (SELLER)
CREATE OR REPLACE FUNCTION public.get_pending_shipments()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'session_id', ms.id,
            'listing_id', ml.id,
            'title', ml.title,
            'winner_username', u.username,
            'winner_email', u.email,
            'winner_address', ms.winner_shipping_address,
            'prize_amount', ms.winner_prize,
            'platform_fee', ms.platform_fee,
            'seller_earnings', ms.winner_prize - COALESCE(ms.platform_fee, 0),
            'completed_at', ms.completed_at,
            'shipping_status', ms.shipping_status,
            'needs_tracking', ms.tracking_number IS NULL
        ) ORDER BY ms.completed_at DESC
    ) INTO v_result
    FROM public.marketplace_sessions ms
    JOIN public.marketplace_listings ml ON ml.id = ms.listing_id
    JOIN public.users u ON u.id = ms.winner_user_id
    WHERE ml.seller_id = auth.uid()
    AND ms.winner_user_id IS NOT NULL
    AND ms.shipping_status IN ('pending', 'processing');
    
    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_shipments() TO authenticated;

-- Final summary
SELECT '
============================================
✅ SHIPPING TRACKING SYSTEM COMPLETE!
============================================

📦 NEW FEATURES:

1. DUAL WALLET SYSTEM:
   ✅ Pending wallet - awaiting shipment
   ✅ Released wallet - ready to withdraw
   ✅ Stripe Connect integration ready

2. TRACKING SUBMISSION:
   ✅ submit_tracking_number(session_id, tracking#, provider)
   ✅ Auto-generates tracking URLs
   ✅ Releases funds immediately

3. SHIPMENT TRACKING:
   ✅ get_shipping_status(session_id)
   ✅ Both buyer and seller can view
   ✅ Shows tracking updates

4. SELLER DASHBOARD:
   ✅ get_seller_wallet() - dual wallet view
   ✅ get_pending_shipments() - items to ship
   ✅ Stripe payout integration ready

5. AUTOMATED MESSAGES:
   ✅ Winner gets shipping notification
   ✅ Seller gets fund release confirmation
   ✅ Includes tracking links

🎯 NEXT STEPS FOR FRONTEND:

1. Seller Dashboard:
   - Show dual wallet (pending vs released)
   - Button to submit tracking number
   - List of pending shipments
   - Stripe Connect payout button

2. Winner Dashboard:
   - View tracking info
   - See shipment status
   - Track package location

3. Both Can View:
   - Tracking number
   - Carrier
   - Estimated delivery
   - Shipment history

============================================
' as final_summary;

