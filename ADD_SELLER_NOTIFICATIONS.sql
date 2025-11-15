-- ============================================================================
-- SELLER NOTIFICATION SYSTEM
-- ============================================================================
-- Notifies sellers when their application status changes
-- ============================================================================

-- ============================================================================
-- 1. CREATE seller_notifications TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seller_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Notification Details
    type TEXT NOT NULL CHECK (type IN ('application_approved', 'application_rejected', 'listing_sold', 'payout_completed', 'payout_failed', 'identity_required', 'warning', 'info')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Action Required
    action_required BOOLEAN DEFAULT false,
    action_url TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller ON public.seller_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_user ON public.seller_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_read ON public.seller_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_created ON public.seller_notifications(created_at DESC);

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own notifications
DROP POLICY IF EXISTS "Sellers can view their own notifications" ON public.seller_notifications;
CREATE POLICY "Sellers can view their own notifications"
    ON public.seller_notifications FOR SELECT
    USING (user_id = auth.uid());

-- Sellers can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Sellers can update their own notifications" ON public.seller_notifications;
CREATE POLICY "Sellers can update their own notifications"
    ON public.seller_notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 3. FUNCTION: Create Notification
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
        seller_id,
        user_id,
        type,
        title,
        message,
        action_required,
        action_url,
        created_at
    ) VALUES (
        p_seller_id,
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_action_required,
        p_action_url,
        NOW()
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- 4. FUNCTION: Get Seller Notifications
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_seller_notifications(BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_seller_notifications(
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    action_required BOOLEAN,
    action_url TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sn.id,
        sn.type,
        sn.title,
        sn.message,
        sn.action_required,
        sn.action_url,
        sn.is_read,
        sn.created_at
    FROM public.seller_notifications sn
    WHERE sn.user_id = auth.uid()
    AND (p_unread_only = false OR sn.is_read = false)
    ORDER BY sn.created_at DESC;
END;
$$;

-- ============================================================================
-- 5. FUNCTION: Mark Notification as Read
-- ============================================================================

DROP FUNCTION IF EXISTS public.mark_notification_read(UUID);

CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.seller_notifications
    SET 
        is_read = true,
        read_at = NOW()
    WHERE id = p_notification_id
    AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- ============================================================================
-- 6. FUNCTION: Mark All Notifications as Read
-- ============================================================================

DROP FUNCTION IF EXISTS public.mark_all_notifications_read();

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.seller_notifications
    SET 
        is_read = true,
        read_at = NOW()
    WHERE user_id = auth.uid()
    AND is_read = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN v_count;
END;
$$;

-- ============================================================================
-- 7. TRIGGER: Notify Seller on Status Change
-- ============================================================================

DROP FUNCTION IF EXISTS notify_seller_status_change() CASCADE;

CREATE OR REPLACE FUNCTION notify_seller_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    -- Only trigger on status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Application Approved
        IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
            v_notification_id := public.create_seller_notification(
                NEW.id,
                NEW.user_id,
                'application_approved',
                '🎉 Seller Application Approved!',
                'Congratulations! Your seller application has been approved. You can now create listings and start selling on our marketplace. Connect your bank account to receive payouts.',
                true,
                '/dashboard'
            );
        END IF;
        
        -- Application Rejected
        IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
            v_notification_id := public.create_seller_notification(
                NEW.id,
                NEW.user_id,
                'application_rejected',
                '❌ Seller Application Rejected',
                CASE 
                    WHEN NEW.rejection_reason IS NOT NULL 
                    THEN 'Your seller application was rejected. Reason: ' || NEW.rejection_reason || '. You can reapply after addressing the concerns.'
                    ELSE 'Your seller application was rejected. Please contact support for more information.'
                END,
                false,
                '/dashboard'
            );
        END IF;
        
        -- Account Suspended
        IF NEW.status = 'suspended' THEN
            v_notification_id := public.create_seller_notification(
                NEW.id,
                NEW.user_id,
                'warning',
                '⚠️ Seller Account Suspended',
                'Your seller account has been suspended. Please contact support for more information.',
                true,
                NULL
            );
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_seller_status_change ON public.seller_profiles;

CREATE TRIGGER on_seller_status_change
    AFTER UPDATE ON public.seller_profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_seller_status_change();

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_seller_notification(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_notifications(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SELLER NOTIFICATIONS SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '✅ seller_notifications table';
    RAISE NOTICE '✅ RLS policies for sellers';
    RAISE NOTICE '✅ create_seller_notification() function';
    RAISE NOTICE '✅ get_seller_notifications() function';
    RAISE NOTICE '✅ mark_notification_read() function';
    RAISE NOTICE '✅ mark_all_notifications_read() function';
    RAISE NOTICE '✅ notify_seller_status_change() trigger';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '- Sellers notified on approval/rejection';
    RAISE NOTICE '- Action-required flags';
    RAISE NOTICE '- Read/unread tracking';
    RAISE NOTICE '- Secure RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE 'When admin approves seller:';
    RAISE NOTICE '→ Notification automatically created';
    RAISE NOTICE '→ Seller sees it in dashboard';
    RAISE NOTICE '→ "Connect bank account" action button';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Sellers will be notified instantly!';
END $$;

