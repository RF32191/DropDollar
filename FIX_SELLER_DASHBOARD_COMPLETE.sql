-- ============================================================================
-- COMPLETE SELLER DASHBOARD FIX
-- ============================================================================
-- 1. Creates seller wallet functions
-- 2. Creates seller notification functions  
-- 3. Ensures verification tab loads data
-- 4. Fixes approval to enable seller dashboard
-- ============================================================================

-- Step 1: Add all missing columns to seller_profiles
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS pending_balance NUMERIC DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS released_balance NUMERIC DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS total_earned NUMERIC DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS stripe_connected BOOLEAN DEFAULT false;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS can_receive_payouts BOOLEAN DEFAULT false;

SELECT 'Step 1: Added wallet columns' as status;

-- Step 2: Create seller_notifications table if not exists
CREATE TABLE IF NOT EXISTS seller_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES seller_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_required BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_notifications_user ON seller_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_unread ON seller_notifications(user_id, is_read) WHERE is_read = false;

SELECT 'Step 2: seller_notifications table created' as status;

-- Step 3: Create get_seller_wallet function
DROP FUNCTION IF EXISTS public.get_seller_wallet();

CREATE OR REPLACE FUNCTION public.get_seller_wallet()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_seller RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;
    
    SELECT * INTO v_seller FROM seller_profiles WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'pending_balance', 0,
            'released_balance', 0,
            'total_earned', 0,
            'total_withdrawn', 0,
            'can_withdraw', false
        );
    END IF;
    
    RETURN jsonb_build_object(
        'pending_balance', COALESCE(v_seller.pending_balance, 0),
        'released_balance', COALESCE(v_seller.released_balance, 0),
        'total_earned', COALESCE(v_seller.total_earned, 0),
        'total_withdrawn', COALESCE(v_seller.total_withdrawn, 0),
        'can_withdraw', COALESCE(v_seller.released_balance, 0) > 0 AND v_seller.stripe_connected = true
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_wallet() TO authenticated;

SELECT 'Step 3: get_seller_wallet function created' as status;

-- Step 4: Create get_seller_notifications function
DROP FUNCTION IF EXISTS public.get_seller_notifications();

CREATE OR REPLACE FUNCTION public.get_seller_notifications()
RETURNS TABLE (
    id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    action_required BOOLEAN,
    action_url TEXT,
    metadata JSONB,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        sn.id,
        sn.type,
        sn.title,
        sn.message,
        sn.action_required,
        sn.action_url,
        sn.metadata,
        sn.is_read,
        sn.created_at
    FROM seller_notifications sn
    WHERE sn.user_id = v_user_id
    ORDER BY sn.created_at DESC
    LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_notifications() TO authenticated;

SELECT 'Step 4: get_seller_notifications function created' as status;

-- Step 5: Create check_seller_status function for dashboard access
DROP FUNCTION IF EXISTS public.check_seller_status();

CREATE OR REPLACE FUNCTION public.check_seller_status()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_seller RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'is_seller', false,
            'status', 'not_authenticated'
        );
    END IF;
    
    SELECT * INTO v_seller FROM seller_profiles WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'is_seller', false,
            'status', 'not_registered',
            'can_access_dashboard', false
        );
    END IF;
    
    -- Seller is active if status is active AND verified is true
    RETURN jsonb_build_object(
        'is_seller', v_seller.status = 'active' AND v_seller.verified = true,
        'status', v_seller.status,
        'can_access_dashboard', v_seller.status = 'active' AND v_seller.verified = true,
        'seller_id', v_seller.id,
        'shop_name', v_seller.shop_name,
        'pending_balance', COALESCE(v_seller.pending_balance, 0),
        'released_balance', COALESCE(v_seller.released_balance, 0),
        'stripe_connected', COALESCE(v_seller.stripe_connected, false)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_seller_status() TO authenticated;

SELECT 'Step 5: check_seller_status function created' as status;

-- Step 6: Fix approve_seller to send welcome notification
DROP FUNCTION IF EXISTS public.approve_seller(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.approve_seller(
    seller_profile_id_param UUID,
    notes_param TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_shop_name TEXT;
    v_admin_email TEXT;
BEGIN
    v_admin_email := auth.jwt() ->> 'email';
    
    SELECT user_id, shop_name INTO v_user_id, v_shop_name
    FROM seller_profiles WHERE id = seller_profile_id_param;
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found');
    END IF;
    
    -- Approve seller
    UPDATE seller_profiles
    SET 
        status = 'active',
        verified = true,
        identity_verified = true,
        verified_at = NOW(),
        verification_date = NOW(),
        approved_at = NOW(),
        approved_by = v_admin_email,
        registration_completed = true,
        registration_step = 7,
        notes = notes_param,
        pending_balance = 0,
        released_balance = 0,
        updated_at = NOW()
    WHERE id = seller_profile_id_param;
    
    -- Send welcome notification
    INSERT INTO seller_notifications (seller_id, user_id, type, title, message, action_required, action_url)
    VALUES (
        seller_profile_id_param,
        v_user_id,
        'approval',
        'Welcome to the Seller Program!',
        'Congratulations! Your seller application has been approved. You can now create listings and start selling.',
        false,
        '/seller/dashboard'
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Seller approved! Dashboard is now active.',
        'seller_id', seller_profile_id_param
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_seller(UUID, TEXT) TO authenticated, service_role;

SELECT 'Step 6: approve_seller with notification created' as status;

-- Step 7: Create function to release funds when tracking is provided
DROP FUNCTION IF EXISTS public.release_seller_funds(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.release_seller_funds(
    notification_id_param UUID,
    tracking_number_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_notification RECORD;
    v_amount NUMERIC;
    v_seller RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get notification
    SELECT * INTO v_notification
    FROM seller_notifications
    WHERE id = notification_id_param AND user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Notification not found');
    END IF;
    
    -- Get amount from metadata
    v_amount := COALESCE((v_notification.metadata->>'amount')::NUMERIC, 0);
    
    IF v_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No funds to release');
    END IF;
    
    -- Get seller profile
    SELECT * INTO v_seller FROM seller_profiles WHERE user_id = v_user_id;
    
    -- Move from pending to released
    UPDATE seller_profiles
    SET 
        pending_balance = pending_balance - v_amount,
        released_balance = released_balance + v_amount,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    -- Mark notification as completed
    UPDATE seller_notifications
    SET 
        is_read = true,
        metadata = metadata || jsonb_build_object('tracking_number', tracking_number_param, 'released_at', NOW())
    WHERE id = notification_id_param;
    
    -- Create new notification about released funds
    INSERT INTO seller_notifications (seller_id, user_id, type, title, message, action_required)
    VALUES (
        v_seller.id,
        v_user_id,
        'funds_released',
        'Funds Released!',
        'Tracking number received. $' || v_amount || ' has been moved to your available balance.',
        false
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Funds released to available balance',
        'amount', v_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_seller_funds(UUID, TEXT) TO authenticated;

SELECT 'Step 7: release_seller_funds function created' as status;

-- Step 8: Enable RLS on seller_notifications
ALTER TABLE seller_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON seller_notifications;
CREATE POLICY "Users can view own notifications" ON seller_notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON seller_notifications;
CREATE POLICY "Users can update own notifications" ON seller_notifications
    FOR UPDATE USING (user_id = auth.uid());

SELECT 'Step 8: RLS enabled on seller_notifications' as status;

-- Step 9: Show current sellers
SELECT 'Current seller_profiles:' as info;
SELECT id, shop_name, status, verified, registration_step FROM seller_profiles;

SELECT '
============================================
SELLER DASHBOARD COMPLETE!
============================================

Created:
1. Wallet columns (pending_balance, released_balance)
2. seller_notifications table
3. get_seller_wallet() function
4. get_seller_notifications() function  
5. check_seller_status() function
6. approve_seller() with welcome notification
7. release_seller_funds() for tracking
8. RLS on seller_notifications

Flow:
1. User registers as seller
2. Admin approves in Verification tab
3. User gets access to Seller Dashboard
4. Dashboard shows: Wallet, Notifications, Listings
5. When sale happens, funds go to pending_balance
6. When tracking provided, funds move to released_balance
7. Seller can withdraw from released_balance

============================================
' as done;

