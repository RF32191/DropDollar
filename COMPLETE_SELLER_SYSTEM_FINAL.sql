-- ============================================================================
-- COMPLETE SELLER SYSTEM - FINAL WORKING VERSION
-- ============================================================================
-- This combines working admin functions + notification system + everything
-- ============================================================================

-- ============================================================================
-- PART 1: SELLER NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seller_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    type TEXT NOT NULL CHECK (type IN ('application_approved', 'application_rejected', 'listing_sold', 'payout_completed', 'payout_failed', 'identity_required', 'warning', 'info')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    action_required BOOLEAN DEFAULT false,
    action_url TEXT,
    
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller ON public.seller_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_user ON public.seller_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_read ON public.seller_notifications(is_read);

ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view their own notifications" ON public.seller_notifications;
CREATE POLICY "Sellers can view their own notifications"
    ON public.seller_notifications FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can update their own notifications" ON public.seller_notifications;
CREATE POLICY "Sellers can update their own notifications"
    ON public.seller_notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PART 2: NOTIFICATION FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_seller_notification(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT);
CREATE OR REPLACE FUNCTION public.create_seller_notification(
    p_seller_id UUID,
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_action_required BOOLEAN DEFAULT false,
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.seller_notifications (
        seller_id, user_id, type, title, message, action_required, action_url, created_at
    ) VALUES (
        p_seller_id, p_user_id, p_type, p_title, p_message, p_action_required, p_action_url, NOW()
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

DROP FUNCTION IF EXISTS public.get_seller_notifications(BOOLEAN);
CREATE OR REPLACE FUNCTION public.get_seller_notifications(
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID, type TEXT, title TEXT, message TEXT,
    action_required BOOLEAN, action_url TEXT, is_read BOOLEAN, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT sn.id, sn.type, sn.title, sn.message, sn.action_required,
           sn.action_url, sn.is_read, sn.created_at
    FROM public.seller_notifications sn
    WHERE sn.user_id = auth.uid()
    AND (p_unread_only = false OR sn.is_read = false)
    ORDER BY sn.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.mark_notification_read(UUID);
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.seller_notifications
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id AND user_id = auth.uid();
    RETURN FOUND;
END;
$$;

DROP FUNCTION IF EXISTS public.mark_all_notifications_read();
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_count INTEGER;
BEGIN
    UPDATE public.seller_notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = auth.uid() AND is_read = false;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ============================================================================
-- PART 3: ADMIN FUNCTIONS (WORKING VERSION FROM BEFORE)
-- ============================================================================

DROP FUNCTION IF EXISTS public.check_admin_status();
CREATE OR REPLACE FUNCTION public.check_admin_status()
RETURNS TABLE (
    is_admin BOOLEAN, role TEXT, can_approve_sellers BOOLEAN,
    can_review_audits BOOLEAN, can_ban_users BOOLEAN, can_manage_admins BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, ''::TEXT, false, false, false, false;
        RETURN;
    END IF;
    
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    
    -- Master admin check
    IF v_email = 'rf32191@gmail.com' THEN
        RETURN QUERY SELECT true, 'master_admin'::TEXT, true, true, true, true;
        RETURN;
    END IF;
    
    -- Check admin_profiles
    RETURN QUERY
    SELECT true, COALESCE(ap.role, 'admin')::TEXT,
           COALESCE(ap.can_approve_sellers, false),
           COALESCE(ap.can_review_audits, false),
           COALESCE(ap.can_ban_users, false),
           COALESCE(ap.can_manage_admins, false)
    FROM public.admin_profiles ap
    WHERE ap.user_id = v_user_id AND ap.is_active = true
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, ''::TEXT, false, false, false, false;
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.get_pending_sellers();
CREATE OR REPLACE FUNCTION public.get_pending_sellers()
RETURNS TABLE (
    id UUID, user_id UUID, username TEXT, email TEXT,
    business_name TEXT, contact_email TEXT, contact_phone TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_is_admin BOOLEAN := false;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    SELECT au.email INTO v_email FROM auth.users au WHERE au.id = v_user_id;
    
    -- Master admin check
    IF v_email = 'rf32191@gmail.com' THEN
        v_is_admin := true;
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM public.admin_profiles 
            WHERE user_id = v_user_id AND is_active = true AND can_approve_sellers = true
        ) INTO v_is_admin;
    END IF;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    
    RETURN QUERY
    SELECT 
        sp.id, sp.user_id,
        COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1), 'Unknown')::TEXT,
        COALESCE(au.email, 'no-email')::TEXT,
        sp.business_name, sp.contact_email, sp.contact_phone, sp.created_at
    FROM public.seller_profiles sp
    LEFT JOIN auth.users au ON au.id = sp.user_id
    WHERE sp.status = 'pending'
    ORDER BY sp.created_at ASC;
END;
$$;

DROP FUNCTION IF EXISTS public.approve_seller(UUID);
CREATE OR REPLACE FUNCTION public.approve_seller(seller_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_is_admin BOOLEAN := false;
    v_updated_rows INTEGER;
    v_seller_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    SELECT au.email INTO v_email FROM auth.users au WHERE au.id = v_user_id;
    
    IF v_email = 'rf32191@gmail.com' THEN
        v_is_admin := true;
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM public.admin_profiles 
            WHERE user_id = v_user_id AND is_active = true AND can_approve_sellers = true
        ) INTO v_is_admin;
    END IF;
    
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized');
    END IF;
    
    -- Get seller user_id
    SELECT user_id INTO v_seller_user_id FROM public.seller_profiles WHERE id = seller_id_param;
    
    -- Update status
    UPDATE public.seller_profiles
    SET status = 'approved', approved_at = NOW(), approved_by = v_user_id, updated_at = NOW()
    WHERE id = seller_id_param AND status = 'pending';
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    
    IF v_updated_rows = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found or already processed');
    END IF;
    
    -- Create notification
    PERFORM public.create_seller_notification(
        seller_id_param,
        v_seller_user_id,
        'application_approved',
        '🎉 Seller Application Approved!',
        'Congratulations! Your seller application has been approved. You can now create listings and start selling. Go to your dashboard to get started!',
        true,
        '/dashboard'
    );
    
    -- Clear admin notifications
    UPDATE public.admin_notifications
    SET is_read = true
    WHERE related_seller_id = seller_id_param AND type = 'seller_pending';
    
    RETURN jsonb_build_object('success', true, 'message', 'Seller approved successfully');
END;
$$;

DROP FUNCTION IF EXISTS public.reject_seller(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.reject_seller(
    seller_id_param UUID,
    reason_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_is_admin BOOLEAN := false;
    v_updated_rows INTEGER;
    v_seller_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    SELECT au.email INTO v_email FROM auth.users au WHERE au.id = v_user_id;
    
    IF v_email = 'rf32191@gmail.com' THEN
        v_is_admin := true;
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM public.admin_profiles 
            WHERE user_id = v_user_id AND is_active = true AND can_approve_sellers = true
        ) INTO v_is_admin;
    END IF;
    
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized');
    END IF;
    
    -- Get seller user_id
    SELECT user_id INTO v_seller_user_id FROM public.seller_profiles WHERE id = seller_id_param;
    
    -- Update status
    UPDATE public.seller_profiles
    SET status = 'rejected', rejection_reason = reason_param,
        rejected_at = NOW(), rejected_by = v_user_id, updated_at = NOW()
    WHERE id = seller_id_param AND status = 'pending';
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    
    IF v_updated_rows = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found or already processed');
    END IF;
    
    -- Create notification
    PERFORM public.create_seller_notification(
        seller_id_param,
        v_seller_user_id,
        'application_rejected',
        '❌ Seller Application Rejected',
        CASE 
            WHEN reason_param IS NOT NULL 
            THEN 'Your seller application was rejected. Reason: ' || reason_param
            ELSE 'Your seller application was rejected. Please contact support for more information.'
        END,
        false,
        NULL
    );
    
    -- Clear admin notifications
    UPDATE public.admin_notifications
    SET is_read = true
    WHERE related_seller_id = seller_id_param AND type = 'seller_pending';
    
    RETURN jsonb_build_object('success', true, 'message', 'Seller rejected');
END;
$$;

-- ============================================================================
-- PART 4: CHECK SELLER STATUS FOR DASHBOARD
-- ============================================================================

DROP FUNCTION IF EXISTS public.check_seller_status();
CREATE OR REPLACE FUNCTION public.check_seller_status()
RETURNS TABLE (
    is_seller BOOLEAN,
    status TEXT,
    seller_id UUID,
    shop_name TEXT,
    business_name TEXT,
    contact_email TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (sp.status = 'approved')::BOOLEAN as is_seller,
        sp.status,
        sp.id as seller_id,
        sp.shop_name,
        sp.business_name,
        sp.contact_email
    FROM public.seller_profiles sp
    WHERE sp.user_id = auth.uid()
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    END IF;
END;
$$;

-- ============================================================================
-- PART 5: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_seller_notification(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_notifications(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_sellers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_seller(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_seller(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_seller_status() TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COMPLETE SELLER SYSTEM READY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Installed:';
    RAISE NOTICE '✅ Seller notifications table';
    RAISE NOTICE '✅ Notification functions';
    RAISE NOTICE '✅ Admin functions (working version)';
    RAISE NOTICE '✅ Seller status check';
    RAISE NOTICE '✅ All permissions granted';
    RAISE NOTICE '';
    RAISE NOTICE 'Admin Panel:';
    RAISE NOTICE '1. Login as rf32191@gmail.com';
    RAISE NOTICE '2. Go to /admin/dashboard';
    RAISE NOTICE '3. Password: 321SnoopDog1994321!';
    RAISE NOTICE '4. Click "Pending Sellers" tab';
    RAISE NOTICE '5. Approve sellers';
    RAISE NOTICE '';
    RAISE NOTICE 'Seller Experience:';
    RAISE NOTICE '1. Admin approves seller';
    RAISE NOTICE '2. Seller gets notification';
    RAISE NOTICE '3. Seller sees dashboard with seller section';
    RAISE NOTICE '4. Seller can create listings';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 System is complete!';
END $$;

