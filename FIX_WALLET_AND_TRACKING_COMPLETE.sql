-- ============================================
-- FIX PENDING WALLET & TRACKING BUTTON ISSUES
-- ============================================
-- Problem: 85% of sales not updating pending wallet
-- Problem: Tracking button not working
-- Solution: Update claim prize flow to use proper functions
-- ============================================

-- Step 1: Drop old functions that have changed signatures
DROP FUNCTION IF EXISTS public.send_winner_address_to_seller(UUID, UUID);
DROP FUNCTION IF EXISTS public.submit_tracking_number_with_notifications(UUID, TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_seller_notifications(BOOLEAN);
DROP FUNCTION IF EXISTS public.get_seller_wallet_info(UUID);

-- Step 2: Fix the claim prize function to properly update wallet
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
    v_result JSON;
BEGIN
    -- Get system user
    SELECT id INTO v_system_user_id
    FROM public.users
    WHERE email = 'system@dropdollar.com';
    
    IF v_system_user_id IS NULL THEN
        RAISE EXCEPTION 'System user not found';
    END IF;
    
    -- Get listing and winner details
    SELECT 
        ml.seller_id,
        ml.title
    INTO v_seller_id, v_listing_title
    FROM public.marketplace_listings ml
    WHERE ml.id = p_listing_id;
    
    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;
    
    -- Get winner username
    SELECT username INTO v_winner_username
    FROM public.users
    WHERE id = p_winner_id;
    
    -- Get the session for this listing
    SELECT id, status, prize_pool
    INTO v_session_id, v_session_status, v_prize_amount
    FROM public.marketplace_sessions
    WHERE listing_id = p_listing_id
    AND winner_user_id = p_winner_id
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1;
    
    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'No completed session found for this listing and winner';
    END IF;
    
    -- Calculate platform fee (15% of prize pool)
    v_platform_fee := ROUND(v_prize_amount * 0.15, 2);
    
    -- Calculate seller earnings (85% of prize pool)
    v_seller_earnings := v_prize_amount - v_platform_fee;
    
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
    
    -- Update session with shipping address
    UPDATE public.marketplace_sessions
    SET 
        winner_shipping_address = v_winner_address,
        updated_at = NOW()
    WHERE id = v_session_id;
    
    -- Call the proper function that updates pending wallet and creates tracking button
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
    
    -- Mark listing status
    UPDATE public.marketplace_listings
    SET 
        status = 'address_provided',
        updated_at = NOW()
    WHERE id = p_listing_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'seller_earnings', v_seller_earnings,
        'message', 'Address sent to seller successfully'
    );
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_winner_address_to_seller(UUID, UUID) TO authenticated;

-- Step 3: Ensure send_seller_address_notification is properly set up
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
    
    -- Add to pending wallet (THIS IS THE KEY FIX!)
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
1. Package the item securely
2. Ship to the address above
3. Click the button below to submit tracking
4. Funds will be RELEASED to your wallet immediately after tracking is submitted
5. You can then withdraw via Stripe

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
        '📝 Submit Tracking Number',
        NULL, -- No URL needed, button opens modal
        true, -- Action required
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
        format('Seller needs to ship %s to %s. Earnings: $%s pending.',
            p_listing_title,
            p_winner_username,
            v_seller_earnings
        ),
        'info',
        jsonb_build_object(
            'session_id', p_session_id,
            'seller_id', p_seller_id,
            'winner_id', p_winner_id,
            'amount', v_seller_earnings,
            'listing_title', p_listing_title
        ),
        NOW()
    );
    
    -- Also send email to admin (if admin_notifications table doesn't trigger emails)
    -- This ensures the admin gets notified
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
        'admin_notification',
        '📊 New Sale Pending Shipment',
        format('A sale is awaiting shipment:

📦 Item: %s
💰 Amount: $%s
🏆 Winner: %s
👤 Seller ID: %s

The seller has been notified and funds are in their pending wallet.',
            p_listing_title,
            v_seller_earnings,
            p_winner_username,
            p_seller_id
        ),
        jsonb_build_object(
            'session_id', p_session_id,
            'seller_id', p_seller_id,
            'winner_id', p_winner_id
        ),
        NOW()
    FROM public.users u
    WHERE u.email = v_admin_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_seller_address_notification(UUID, UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC) TO authenticated;

-- Step 4: Ensure tracking submission properly releases funds
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
    v_pending_amount NUMERIC;
    v_admin_email TEXT := 'rf32191@yahoo.com';
    v_result JSON;
BEGIN
    -- Get session details
    SELECT 
        ml.seller_id, 
        ms.winner_user_id, 
        u.username,
        ms.prize_pool, 
        ml.title,
        ms.winner_shipping_address
    INTO v_seller_id, v_winner_id, v_winner_username, v_prize_amount, v_listing_title, v_winner_address
    FROM public.marketplace_sessions ms
    JOIN public.marketplace_listings ml ON ml.id = ms.listing_id
    LEFT JOIN public.users u ON u.id = ms.winner_user_id
    WHERE ms.id = p_session_id;
    
    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    -- Verify caller is the seller
    IF v_seller_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the seller can submit tracking numbers';
    END IF;
    
    -- Calculate platform fee (15% of prize pool)
    v_platform_fee := ROUND(v_prize_amount * 0.15, 2);
    
    -- Calculate seller earnings
    v_seller_earnings := v_prize_amount - v_platform_fee;
    
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
    
    -- Update session with tracking info
    UPDATE public.marketplace_sessions
    SET 
        tracking_number = p_tracking_number,
        tracking_provider = p_tracking_provider,
        tracking_url = v_tracking_url,
        estimated_delivery = p_estimated_delivery,
        tracking_submitted_at = NOW(),
        funds_released = true,
        funds_released_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;
    
    -- Get current pending balance for this seller
    SELECT pending_balance INTO v_pending_amount
    FROM public.seller_wallets
    WHERE seller_id = v_seller_id;
    
    IF v_pending_amount IS NULL THEN
        RAISE EXCEPTION 'Seller wallet not found';
    END IF;
    
    -- Transfer from pending to released (THIS IS THE KEY FIX!)
    UPDATE public.seller_wallets
    SET 
        pending_balance = GREATEST(pending_balance - v_seller_earnings, 0),
        released_balance = released_balance + v_seller_earnings,
        total_pending_sales = GREATEST(COALESCE(total_pending_sales, 1) - 1, 0),
        total_released_sales = COALESCE(total_released_sales, 0) + 1,
        total_earned = COALESCE(total_earned, 0) + v_seller_earnings,
        updated_at = NOW()
    WHERE seller_id = v_seller_id;
    
    -- Message 1: Notify winner that item has shipped
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
        'prize_shipped',
        '📦 Your Prize Has Shipped!',
        format(
            'Great news! Your prize has been shipped!

📦 Item: %s
🚚 Carrier: %s
📋 Tracking #: %s
📅 Estimated Delivery: %s

🔗 Track your package:
%s

📮 Shipping to:
%s
%s
%s, %s %s

Thank you for playing on DropDollar!',
            v_listing_title,
            p_tracking_provider,
            p_tracking_number,
            COALESCE(to_char(p_estimated_delivery, 'Mon DD, YYYY'), 'Check tracking'),
            COALESCE(v_tracking_url, 'Check with carrier'),
            COALESCE(v_winner_address->>'name', ''),
            COALESCE(v_winner_address->>'address_line1', ''),
            COALESCE(v_winner_address->>'city', ''),
            COALESCE(v_winner_address->>'state', ''),
            COALESCE(v_winner_address->>'postal_code', '')
        ),
        'track_package',
        '📦 Track Package',
        v_tracking_url,
        jsonb_build_object(
            'session_id', p_session_id,
            'tracking_number', p_tracking_number,
            'tracking_provider', p_tracking_provider,
            'tracking_url', v_tracking_url
        ),
        NOW()
    );
    
    -- Message 2: Notify seller that funds are released
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
            'Your funds have been released!

✅ Tracking number submitted: %s
📦 Item: %s
💰 Amount Released: $%s

Your funds have been moved from PENDING to RELEASED wallet.
You can now withdraw this amount to your bank account via Stripe.

🏦 Go to Dashboard > Seller > Withdraw Funds',
            p_tracking_number,
            v_listing_title,
            v_seller_earnings
        ),
        'withdraw_funds',
        '💵 Withdraw to Bank',
        '/dashboard?tab=seller&action=withdraw',
        jsonb_build_object(
            'session_id', p_session_id,
            'amount_released', v_seller_earnings,
            'tracking_number', p_tracking_number
        ),
        NOW()
    );
    
    -- Message 3: Notify platform admin
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
        'tracking_submitted',
        '📦 Tracking Number Submitted',
        format(
            'A seller has submitted tracking information:

📦 Item: %s
🚚 Carrier: %s
📋 Tracking: %s
💰 Amount Released: $%s
👤 Seller: %s
🏆 Winner: %s

Funds have been released to seller''s wallet.',
            v_listing_title,
            p_tracking_provider,
            p_tracking_number,
            v_seller_earnings,
            v_seller_id,
            v_winner_username
        ),
        jsonb_build_object(
            'session_id', p_session_id,
            'seller_id', v_seller_id,
            'winner_id', v_winner_id,
            'amount', v_seller_earnings,
            'tracking_number', p_tracking_number,
            'tracking_provider', p_tracking_provider,
            'tracking_url', v_tracking_url
        ),
        NOW()
    FROM public.users u
    WHERE u.email = v_admin_email;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Tracking submitted successfully',
        'amount_released', v_seller_earnings,
        'tracking_number', p_tracking_number,
        'tracking_url', v_tracking_url
    );
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tracking_number_with_notifications(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- Step 5: Ensure seller_wallets table exists with all necessary columns
CREATE TABLE IF NOT EXISTS public.seller_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    pending_balance NUMERIC(10,2) DEFAULT 0.00,
    released_balance NUMERIC(10,2) DEFAULT 0.00,
    total_pending_sales INTEGER DEFAULT 0,
    total_released_sales INTEGER DEFAULT 0,
    total_earned NUMERIC(10,2) DEFAULT 0.00,
    total_withdrawn NUMERIC(10,2) DEFAULT 0.00,
    lifetime_earnings NUMERIC(10,2) DEFAULT 0.00,
    total_platform_fees NUMERIC(10,2) DEFAULT 0.00,
    total_shipping_costs NUMERIC(10,2) DEFAULT 0.00,
    stripe_account_id TEXT,
    can_receive_payouts BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_seller_wallets_seller_id ON public.seller_wallets(seller_id);

-- Enable RLS
ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own seller wallet" ON public.seller_wallets;
DROP POLICY IF EXISTS "Users can update their own seller wallet" ON public.seller_wallets;

-- RLS Policy: Users can only see their own wallet
CREATE POLICY "Users can view their own seller wallet"
    ON public.seller_wallets
    FOR SELECT
    USING (auth.uid() = seller_id);

-- RLS Policy: Users can update their own wallet (via functions)
CREATE POLICY "Users can update their own seller wallet"
    ON public.seller_wallets
    FOR UPDATE
    USING (auth.uid() = seller_id);

-- Add missing columns if table already existed
DO $$
BEGIN
    -- Add total_earned if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'total_earned'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN total_earned NUMERIC(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add total_pending_sales if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'total_pending_sales'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN total_pending_sales INTEGER DEFAULT 0;
    END IF;
    
    -- Add total_released_sales if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'total_released_sales'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN total_released_sales INTEGER DEFAULT 0;
    END IF;
    
    -- Add pending_balance if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'pending_balance'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN pending_balance NUMERIC(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add released_balance if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'released_balance'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN released_balance NUMERIC(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add lifetime_earnings if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'lifetime_earnings'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN lifetime_earnings NUMERIC(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add total_withdrawn if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'total_withdrawn'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN total_withdrawn NUMERIC(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- Step 6: Create helper function to get seller wallet info
CREATE OR REPLACE FUNCTION public.get_seller_wallet_info(p_seller_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_info JSON;
BEGIN
    SELECT jsonb_build_object(
        'pending_balance', COALESCE(pending_balance, 0),
        'released_balance', COALESCE(released_balance, 0),
        'total_pending_sales', COALESCE(total_pending_sales, 0),
        'total_released_sales', COALESCE(total_released_sales, 0),
        'total_earned', COALESCE(total_earned, 0),
        'total_withdrawn', COALESCE(total_withdrawn, 0),
        'lifetime_earnings', COALESCE(lifetime_earnings, 0)
    ) INTO v_wallet_info
    FROM public.seller_wallets
    WHERE seller_id = p_seller_id;
    
    -- If no wallet exists, return zeros
    IF v_wallet_info IS NULL THEN
        v_wallet_info := jsonb_build_object(
            'pending_balance', 0,
            'released_balance', 0,
            'total_pending_sales', 0,
            'total_released_sales', 0,
            'total_earned', 0,
            'total_withdrawn', 0,
            'lifetime_earnings', 0
        );
    END IF;
    
    RETURN v_wallet_info;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_wallet_info(UUID) TO authenticated;

-- Step 7: Ensure get_seller_notifications function exists
CREATE OR REPLACE FUNCTION public.get_seller_notifications(
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    action_required BOOLEAN,
    action_type TEXT,
    action_label TEXT,
    action_url TEXT,
    metadata JSONB,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.id,
        am.message_type as type,
        am.title,
        am.message,
        COALESCE(am.action_required, false) as action_required,
        am.action_type,
        am.action_label,
        am.action_url,
        am.metadata,
        COALESCE(am.is_read, false) as is_read,
        am.created_at
    FROM public.admin_messages am
    WHERE am.user_id = auth.uid()
    AND (NOT p_unread_only OR NOT COALESCE(am.is_read, false))
    ORDER BY am.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_notifications(BOOLEAN) TO authenticated;

-- Step 8: Ensure required tables exist

-- Create admin_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);

-- Create admin_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_type TEXT,
    action_label TEXT,
    action_url TEXT,
    action_required BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_messages_user_id ON public.admin_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON public.admin_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own admin messages" ON public.admin_messages;

-- RLS Policy: Users can only see their own messages
CREATE POLICY "Users can view their own admin messages"
    ON public.admin_messages
    FOR SELECT
    USING (auth.uid() = user_id);

-- Add missing columns if table already existed
DO $$
BEGIN
    -- Ensure action_required column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_messages' 
        AND column_name = 'action_required'
    ) THEN
        ALTER TABLE public.admin_messages 
        ADD COLUMN action_required BOOLEAN DEFAULT false;
    END IF;
    
    -- Ensure action_type column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_messages' 
        AND column_name = 'action_type'
    ) THEN
        ALTER TABLE public.admin_messages 
        ADD COLUMN action_type TEXT;
    END IF;
    
    -- Ensure action_label column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_messages' 
        AND column_name = 'action_label'
    ) THEN
        ALTER TABLE public.admin_messages 
        ADD COLUMN action_label TEXT;
    END IF;
END $$;

-- Step 9: Success message
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ WALLET & TRACKING SYSTEM FIXED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 WHAT WAS FIXED:';
    RAISE NOTICE '';
    RAISE NOTICE '1. PENDING WALLET UPDATES:';
    RAISE NOTICE '   ✅ send_winner_address_to_seller now calls send_seller_address_notification';
    RAISE NOTICE '   ✅ Pending wallet is updated when winner provides address';
    RAISE NOTICE '   ✅ Seller sees correct pending balance';
    RAISE NOTICE '';
    RAISE NOTICE '2. TRACKING BUTTON:';
    RAISE NOTICE '   ✅ Admin message includes submit_tracking action_type';
    RAISE NOTICE '   ✅ Metadata includes session_id for tracking modal';
    RAISE NOTICE '   ✅ Button triggers TrackingSubmissionModal';
    RAISE NOTICE '';
    RAISE NOTICE '3. FUND RELEASE:';
    RAISE NOTICE '   ✅ Tracking submission moves funds: Pending → Released';
    RAISE NOTICE '   ✅ Three messages sent (winner, seller, admin)';
    RAISE NOTICE '   ✅ Tracking URLs generated automatically';
    RAISE NOTICE '';
    RAISE NOTICE '4. ADMIN NOTIFICATIONS:';
    RAISE NOTICE '   ✅ Platform admin gets notified of sales';
    RAISE NOTICE '   ✅ Admin gets notified when tracking submitted';
    RAISE NOTICE '   ✅ All notifications include session details';
    RAISE NOTICE '';
    RAISE NOTICE '📊 COMPLETE FLOW:';
    RAISE NOTICE '1. Winner claims prize → Provides address';
    RAISE NOTICE '2. Seller gets admin message → Funds in PENDING';
    RAISE NOTICE '3. Seller clicks "Submit Tracking" button';
    RAISE NOTICE '4. Tracking modal opens → Seller submits';
    RAISE NOTICE '5. Funds instantly move: PENDING → RELEASED';
    RAISE NOTICE '6. Winner gets tracking notification';
    RAISE NOTICE '7. Seller can withdraw to bank';
    RAISE NOTICE '8. Admin gets all notifications';
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
END $$;

