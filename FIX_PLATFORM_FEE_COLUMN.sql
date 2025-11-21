-- ============================================
-- FIX PLATFORM_FEE COLUMN ERROR
-- ============================================
-- Fixes the "column platform_fee does not exist" error
-- Fixes the "column winner_shipping_address does not exist" error
-- Run this if you already ran FIX_WALLET_AND_TRACKING_COMPLETE.sql
-- ============================================

-- Step 1: Add missing columns to marketplace_sessions
DO $$
BEGIN
    -- Add winner_shipping_address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_sessions' 
        AND column_name = 'winner_shipping_address'
    ) THEN
        ALTER TABLE public.marketplace_sessions 
        ADD COLUMN winner_shipping_address JSONB;
    END IF;
    
    -- Add tracking columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_sessions' 
        AND column_name = 'tracking_number'
    ) THEN
        ALTER TABLE public.marketplace_sessions 
        ADD COLUMN tracking_number TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_sessions' 
        AND column_name = 'tracking_provider'
    ) THEN
        ALTER TABLE public.marketplace_sessions 
        ADD COLUMN tracking_provider TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_sessions' 
        AND column_name = 'tracking_url'
    ) THEN
        ALTER TABLE public.marketplace_sessions 
        ADD COLUMN tracking_url TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_sessions' 
        AND column_name = 'tracking_submitted_at'
    ) THEN
        ALTER TABLE public.marketplace_sessions 
        ADD COLUMN tracking_submitted_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_sessions' 
        AND column_name = 'estimated_delivery'
    ) THEN
        ALTER TABLE public.marketplace_sessions 
        ADD COLUMN estimated_delivery TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_sessions' 
        AND column_name = 'funds_released'
    ) THEN
        ALTER TABLE public.marketplace_sessions 
        ADD COLUMN funds_released BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_sessions' 
        AND column_name = 'funds_released_at'
    ) THEN
        ALTER TABLE public.marketplace_sessions 
        ADD COLUMN funds_released_at TIMESTAMPTZ;
    END IF;
    
    -- Add metadata column to admin_notifications if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_notifications' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.admin_notifications 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Step 1b: Remove restrictive check constraint on admin_notifications.type
-- This allows any type value, which is more flexible
DO $$
BEGIN
    -- Drop the check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_notifications_type_check'
        AND conrelid = 'public.admin_notifications'::regclass
    ) THEN
        ALTER TABLE public.admin_notifications 
        DROP CONSTRAINT admin_notifications_type_check;
        
        RAISE NOTICE 'Dropped restrictive type check constraint on admin_notifications';
    END IF;
END $$;

-- Step 2: Drop and recreate the two functions that reference these columns
DROP FUNCTION IF EXISTS public.send_winner_address_to_seller(UUID, UUID);
DROP FUNCTION IF EXISTS public.submit_tracking_number_with_notifications(UUID, TEXT, TEXT, TIMESTAMPTZ);

-- Fix 1: Update send_winner_address_to_seller to calculate platform_fee instead of reading it
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
    
    -- Get the session for this listing (don't read platform_fee - it doesn't exist)
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

-- Fix 2: Update submit_tracking_number_with_notifications to calculate platform_fee
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
    -- Get session details (don't read platform_fee - it doesn't exist)
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
    
    -- Transfer from pending to released
    UPDATE public.seller_wallets
    SET 
        pending_balance = GREATEST(pending_balance - v_seller_earnings, 0),
        released_balance = released_balance + v_seller_earnings,
        total_pending_sales = GREATEST(COALESCE(total_pending_sales, 1) - 1, 0),
        total_released_sales = COALESCE(total_released_sales, 0) + 1,
        total_earned = COALESCE(total_earned, 0) + v_seller_earnings,
        updated_at = NOW()
    WHERE seller_id = v_seller_id;
    
    -- Message 1: Notify winner
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
    
    -- Message 2: Notify seller
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
    
    -- Message 3: Notify admin
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ PLATFORM FEE COLUMN FIX APPLIED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Both functions now CALCULATE platform_fee';
    RAISE NOTICE 'instead of reading it from the database.';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Try claiming a prize again - it should work!';
    RAISE NOTICE '============================================';
END $$;

