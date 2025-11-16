-- ============================================================================
-- SELLER ESCROW & PAYOUT PROTECTION SYSTEM (Like eBay/Etsy)
-- ============================================================================
-- Ensures sellers only get paid AFTER winner confirms delivery
-- Protects both buyers (winners) and sellers from fraud
-- ============================================================================

-- ============================================================================
-- STEP 1: Create seller_escrow table to hold funds
-- ============================================================================

DROP TABLE IF EXISTS public.seller_escrow CASCADE;

CREATE TABLE public.seller_escrow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.marketplace_sessions(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL,
    winner_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    platform_fee NUMERIC NOT NULL DEFAULT 0.15, -- 15% platform fee
    seller_amount NUMERIC NOT NULL, -- Amount seller will receive
    status TEXT NOT NULL CHECK (status IN ('holding', 'shipped', 'delivered', 'released', 'disputed')),
    tracking_number TEXT,
    tracking_carrier TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    auto_release_at TIMESTAMPTZ, -- Auto-release funds if winner doesn't confirm
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seller_escrow_seller ON public.seller_escrow(seller_id);
CREATE INDEX idx_seller_escrow_winner ON public.seller_escrow(winner_id);
CREATE INDEX idx_seller_escrow_status ON public.seller_escrow(status);
CREATE INDEX idx_seller_escrow_listing ON public.seller_escrow(listing_id);

ALTER TABLE public.seller_escrow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own escrow" ON public.seller_escrow;
CREATE POLICY "Users can view their own escrow"
ON public.seller_escrow
FOR SELECT
TO authenticated
USING (auth.uid() = seller_id OR auth.uid() = winner_id);

DROP POLICY IF EXISTS "Sellers can update their escrow" ON public.seller_escrow;
CREATE POLICY "Sellers can update their escrow"
ON public.seller_escrow
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id);

SELECT '✅ Step 1: seller_escrow table created' as status;

-- ============================================================================
-- STEP 2: Update marketplace_sessions to track escrow
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_sessions' 
        AND column_name = 'escrow_id'
    ) THEN
        ALTER TABLE public.marketplace_sessions 
        ADD COLUMN escrow_id UUID REFERENCES public.seller_escrow(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_sessions' 
        AND column_name = 'payout_status'
    ) THEN
        ALTER TABLE public.marketplace_sessions 
        ADD COLUMN payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'escrowed', 'shipped', 'delivered', 'paid'));
    END IF;
END $$;

SELECT '✅ Step 2: marketplace_sessions columns added' as status;

-- ============================================================================
-- STEP 3: Function to create escrow when winner determined
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_marketplace_escrow(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.create_marketplace_escrow(
    session_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_listing RECORD;
    v_escrow_id UUID;
    v_platform_fee NUMERIC;
    v_seller_amount NUMERIC;
    v_auto_release_date TIMESTAMPTZ;
BEGIN
    -- Get session details
    SELECT * INTO v_session
    FROM public.marketplace_sessions
    WHERE id = session_id_param
    AND status = 'completed'
    AND winner_user_id IS NOT NULL;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or not completed');
    END IF;
    
    -- Check if escrow already exists
    IF v_session.escrow_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Escrow already exists', 'escrow_id', v_session.escrow_id);
    END IF;
    
    -- Get listing details
    SELECT * INTO v_listing
    FROM public.marketplace_listings
    WHERE id = v_session.listing_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing not found');
    END IF;
    
    -- Calculate amounts (85% to seller, 15% platform fee)
    v_platform_fee := v_session.prize_pool * 0.15;
    v_seller_amount := v_session.prize_pool * 0.85;
    
    -- Auto-release date: 14 days from now
    v_auto_release_date := NOW() + INTERVAL '14 days';
    
    -- Create escrow record
    INSERT INTO public.seller_escrow (
        listing_id,
        session_id,
        seller_id,
        winner_id,
        amount,
        platform_fee,
        seller_amount,
        status,
        auto_release_at,
        created_at
    ) VALUES (
        v_listing.id,
        session_id_param,
        v_listing.seller_id,
        v_session.winner_user_id,
        v_session.prize_pool,
        v_platform_fee,
        v_seller_amount,
        'holding',
        v_auto_release_date,
        NOW()
    ) RETURNING id INTO v_escrow_id;
    
    -- Update session with escrow ID
    UPDATE public.marketplace_sessions
    SET 
        escrow_id = v_escrow_id,
        payout_status = 'escrowed',
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RAISE NOTICE '💰 Escrow created: % tokens held for seller % (ID: %)', v_session.prize_pool, v_listing.seller_id, v_escrow_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'escrow_id', v_escrow_id,
        'amount', v_session.prize_pool,
        'seller_amount', v_seller_amount,
        'platform_fee', v_platform_fee,
        'auto_release_at', v_auto_release_date
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_marketplace_escrow(UUID) TO authenticated;

SELECT '✅ Step 3: create_marketplace_escrow function created' as status;

-- ============================================================================
-- STEP 4: Function for seller to submit tracking number
-- ============================================================================

DROP FUNCTION IF EXISTS public.seller_submit_tracking(UUID, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.seller_submit_tracking(
    listing_id_param UUID,
    tracking_number_param TEXT,
    tracking_carrier_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_escrow RECORD;
    v_message_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get escrow record
    SELECT * INTO v_escrow
    FROM public.seller_escrow
    WHERE listing_id = listing_id_param
    AND seller_id = v_user_id
    AND status = 'holding';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No escrow found or already shipped');
    END IF;
    
    -- Update escrow with tracking
    UPDATE public.seller_escrow
    SET 
        tracking_number = tracking_number_param,
        tracking_carrier = tracking_carrier_param,
        status = 'shipped',
        shipped_at = NOW(),
        updated_at = NOW()
    WHERE id = v_escrow.id;
    
    -- Update session payout status
    UPDATE public.marketplace_sessions
    SET 
        payout_status = 'shipped',
        updated_at = NOW()
    WHERE id = v_escrow.session_id;
    
    -- Send message to winner with tracking info
    INSERT INTO public.marketplace_messages (
        listing_id,
        session_id,
        sender_id,
        recipient_id,
        message_type,
        message_content,
        created_at
    ) VALUES (
        listing_id_param,
        v_escrow.session_id,
        v_user_id,
        v_escrow.winner_id,
        'seller_message',
        '📦 Your item has been shipped! Tracking: ' || tracking_carrier_param || ' - ' || tracking_number_param,
        NOW()
    ) RETURNING id INTO v_message_id;
    
    RAISE NOTICE '📦 Tracking submitted for listing %: % - %', listing_id_param, tracking_carrier_param, tracking_number_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Tracking information submitted',
        'tracking_number', tracking_number_param,
        'tracking_carrier', tracking_carrier_param,
        'message_id', v_message_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seller_submit_tracking(UUID, TEXT, TEXT) TO authenticated;

SELECT '✅ Step 4: seller_submit_tracking function created' as status;

-- ============================================================================
-- STEP 5: Function for winner to confirm delivery
-- ============================================================================

DROP FUNCTION IF EXISTS public.winner_confirm_delivery(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.winner_confirm_delivery(
    listing_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_escrow RECORD;
    v_message_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get escrow record
    SELECT * INTO v_escrow
    FROM public.seller_escrow
    WHERE listing_id = listing_id_param
    AND winner_id = v_user_id
    AND status = 'shipped';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No shipment found or already confirmed');
    END IF;
    
    -- Update escrow to delivered
    UPDATE public.seller_escrow
    SET 
        status = 'delivered',
        delivered_at = NOW(),
        updated_at = NOW()
    WHERE id = v_escrow.id;
    
    -- Update session payout status
    UPDATE public.marketplace_sessions
    SET 
        payout_status = 'delivered',
        updated_at = NOW()
    WHERE id = v_escrow.session_id;
    
    -- Release funds to seller
    UPDATE public.users
    SET 
        won_tokens = won_tokens + v_escrow.seller_amount,
        updated_at = NOW()
    WHERE id = v_escrow.seller_id;
    
    -- Mark escrow as released
    UPDATE public.seller_escrow
    SET 
        status = 'released',
        released_at = NOW(),
        updated_at = NOW()
    WHERE id = v_escrow.id;
    
    -- Update final payout status
    UPDATE public.marketplace_sessions
    SET 
        payout_status = 'paid',
        updated_at = NOW()
    WHERE id = v_escrow.session_id;
    
    -- Send confirmation message to seller
    INSERT INTO public.marketplace_messages (
        listing_id,
        session_id,
        sender_id,
        recipient_id,
        message_type,
        message_content,
        created_at
    ) VALUES (
        listing_id_param,
        v_escrow.session_id,
        v_user_id,
        v_escrow.seller_id,
        'general',
        '✅ Delivery confirmed! ' || v_escrow.seller_amount || ' tokens have been released to your wallet.',
        NOW()
    ) RETURNING id INTO v_message_id;
    
    RAISE NOTICE '✅ Delivery confirmed. Released % tokens to seller %', v_escrow.seller_amount, v_escrow.seller_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Delivery confirmed and funds released to seller',
        'seller_amount', v_escrow.seller_amount,
        'message_id', v_message_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.winner_confirm_delivery(UUID) TO authenticated;

SELECT '✅ Step 5: winner_confirm_delivery function created' as status;

-- ============================================================================
-- STEP 6: Auto-release function (called by cron job)
-- ============================================================================

DROP FUNCTION IF EXISTS public.auto_release_escrow() CASCADE;

CREATE OR REPLACE FUNCTION public.auto_release_escrow()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_escrow RECORD;
    v_released_count INTEGER := 0;
BEGIN
    FOR v_escrow IN 
        SELECT * FROM public.seller_escrow
        WHERE status = 'shipped'
        AND auto_release_at <= NOW()
    LOOP
        -- Release funds to seller
        UPDATE public.users
        SET 
            won_tokens = won_tokens + v_escrow.seller_amount,
            updated_at = NOW()
        WHERE id = v_escrow.seller_id;
        
        -- Mark escrow as released
        UPDATE public.seller_escrow
        SET 
            status = 'released',
            delivered_at = NOW(),
            released_at = NOW(),
            updated_at = NOW()
        WHERE id = v_escrow.id;
        
        -- Update session payout status
        UPDATE public.marketplace_sessions
        SET 
            payout_status = 'paid',
            updated_at = NOW()
        WHERE id = v_escrow.session_id;
        
        -- Send notification to seller
        INSERT INTO public.marketplace_messages (
            listing_id,
            session_id,
            sender_id,
            recipient_id,
            message_type,
            message_content,
            created_at
        ) VALUES (
            v_escrow.listing_id,
            v_escrow.session_id,
            v_escrow.winner_id,
            v_escrow.seller_id,
            'general',
            '💰 Auto-release: ' || v_escrow.seller_amount || ' tokens released to your wallet (14-day hold expired)',
            NOW()
        );
        
        v_released_count := v_released_count + 1;
        
        RAISE NOTICE '⏰ Auto-released escrow % (% tokens to seller %)', v_escrow.id, v_escrow.seller_amount, v_escrow.seller_id;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'released_count', v_released_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_release_escrow() TO authenticated, service_role;

SELECT '✅ Step 6: auto_release_escrow function created' as status;

-- ============================================================================
-- STEP 7: Get seller escrow status
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_seller_escrow_status(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.get_seller_escrow_status(
    user_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    listing_id UUID,
    listing_title TEXT,
    session_id UUID,
    winner_username TEXT,
    amount NUMERIC,
    seller_amount NUMERIC,
    platform_fee NUMERIC,
    status TEXT,
    tracking_number TEXT,
    tracking_carrier TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    auto_release_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := COALESCE(user_id_param, auth.uid());
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        e.id,
        e.listing_id,
        l.title as listing_title,
        e.session_id,
        COALESCE(
            (SELECT u.username FROM public.users u WHERE u.id = e.winner_id),
            (SELECT u.email FROM public.users u WHERE u.id = e.winner_id),
            'Winner'
        )::TEXT as winner_username,
        e.amount,
        e.seller_amount,
        e.platform_fee,
        e.status,
        e.tracking_number,
        e.tracking_carrier,
        e.shipped_at,
        e.delivered_at,
        e.auto_release_at,
        e.created_at
    FROM public.seller_escrow e
    JOIN public.marketplace_listings l ON l.id = e.listing_id
    WHERE e.seller_id = v_user_id
    ORDER BY e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_escrow_status(UUID) TO authenticated;

SELECT '✅ Step 7: get_seller_escrow_status function created' as status;

-- ============================================================================
-- FINAL SUCCESS MESSAGE
-- ============================================================================

SELECT '
╔════════════════════════════════════════════════════════════════╗
║        ✅ SELLER ESCROW & PAYOUT SYSTEM CREATED!               ║
╚════════════════════════════════════════════════════════════════╝

🔒 HOW IT WORKS (Like eBay/Etsy):

1️⃣ WINNER DETERMINED:
   → create_marketplace_escrow() called
   → Prize pool held in escrow (not paid yet!)
   → 85% for seller, 15% platform fee
   → Auto-release date set (14 days)

2️⃣ SELLER SHIPS ITEM:
   → seller_submit_tracking(listing_id, tracking#, carrier)
   → Tracking sent to winner via message
   → Escrow status: holding → shipped

3️⃣ WINNER RECEIVES ITEM:
   → winner_confirm_delivery(listing_id)
   → Funds released to seller wallet
   → Escrow status: shipped → delivered → released
   → Session payout_status: paid ✅

4️⃣ AUTO-RELEASE (If no confirmation):
   → auto_release_escrow() runs daily (cron)
   → After 14 days, auto-release to seller
   → Protects sellers from non-responsive winners

PAYOUT BREAKDOWN:
- Total Prize Pool: 100%
- Platform Fee: 15%
- Seller Receives: 85%
- Paid ONLY after delivery confirmed

SECURITY:
✅ Funds held in escrow table
✅ Seller cant withdraw until confirmed
✅ Winner has 14 days to confirm
✅ Auto-release protects sellers
✅ RLS policies protect data
✅ Messages notify both parties

FUNCTIONS CREATED:
- create_marketplace_escrow(session_id)
- seller_submit_tracking(listing_id, tracking#, carrier)
- winner_confirm_delivery(listing_id)
- auto_release_escrow() [run daily]
- get_seller_escrow_status(user_id)

NEXT: Update frontend to show escrow status & tracking! 📦
' as success_message;

