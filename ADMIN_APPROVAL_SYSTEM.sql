-- ============================================================================
-- ADMIN APPROVAL SYSTEM
-- Master admin (rf32191@gmail.com) approves sellers and reviews game audits
-- ============================================================================

-- ============================================================================
-- TABLE: admin_profiles
-- Stores admin accounts with different permission levels
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    
    -- Admin Level
    role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('master_admin', 'admin', 'moderator')),
    
    -- Permissions
    can_approve_sellers BOOLEAN DEFAULT false,
    can_review_audits BOOLEAN DEFAULT false,
    can_ban_users BOOLEAN DEFAULT false,
    can_manage_admins BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_admin_profiles_email ON public.admin_profiles(email);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON public.admin_profiles(role);

-- ============================================================================
-- TABLE: admin_notifications
-- Notifications for admin actions (seller approvals, audit alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
    
    -- Notification Details
    type TEXT NOT NULL CHECK (type IN ('seller_pending', 'audit_alert', 'suspicious_activity', 'system_alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    
    -- Related Entities
    related_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    related_seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    related_audit_id UUID REFERENCES public.game_audit_logs(id) ON DELETE CASCADE,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES public.admin_profiles(id),
    resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin ON public.admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON public.admin_notifications(is_read) WHERE is_read = false;

-- ============================================================================
-- RLS POLICIES FOR ADMIN TABLES
-- ============================================================================
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view their own profile
CREATE POLICY "Admins can view their own profile"
    ON public.admin_profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view their notifications
CREATE POLICY "Admins can view their own notifications"
    ON public.admin_notifications FOR SELECT
    USING (
        admin_id IN (SELECT id FROM public.admin_profiles WHERE user_id = auth.uid())
    );

-- Admins can update their notifications
CREATE POLICY "Admins can update their own notifications"
    ON public.admin_notifications FOR UPDATE
    USING (
        admin_id IN (SELECT id FROM public.admin_profiles WHERE user_id = auth.uid())
    );

-- ============================================================================
-- FUNCTION: create_master_admin
-- Creates the master admin account (rf32191@gmail.com)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_master_admin(
    email_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_admin_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO v_user_id
    FROM public.users
    WHERE email = email_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not found. Please create an account with ' || email_param || ' first.'
        );
    END IF;
    
    -- Check if already admin
    IF EXISTS(SELECT 1 FROM public.admin_profiles WHERE user_id = v_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User is already an admin'
        );
    END IF;
    
    -- Create master admin profile
    INSERT INTO public.admin_profiles (
        user_id,
        email,
        role,
        can_approve_sellers,
        can_review_audits,
        can_ban_users,
        can_manage_admins,
        is_active
    ) VALUES (
        v_user_id,
        email_param,
        'master_admin',
        true,  -- Can approve sellers
        true,  -- Can review audits
        true,  -- Can ban users
        true,  -- Can manage other admins
        true   -- Active
    ) RETURNING id INTO v_admin_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'admin_id', v_admin_id,
        'message', 'Master admin created successfully for ' || email_param
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: check_admin_status
-- Check if user is an admin and return permissions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_admin_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_admin RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('is_admin', false, 'message', 'Not authenticated');
    END IF;
    
    SELECT * INTO v_admin
    FROM public.admin_profiles
    WHERE user_id = v_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('is_admin', false, 'message', 'Not an admin');
    END IF;
    
    RETURN jsonb_build_object(
        'is_admin', true,
        'role', v_admin.role,
        'can_approve_sellers', v_admin.can_approve_sellers,
        'can_review_audits', v_admin.can_review_audits,
        'can_ban_users', v_admin.can_ban_users,
        'can_manage_admins', v_admin.can_manage_admins,
        'email', v_admin.email
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('is_admin', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: get_pending_sellers
-- Get all sellers awaiting approval
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_pending_sellers()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    email TEXT,
    business_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    SELECT can_approve_sellers INTO v_is_admin
    FROM public.admin_profiles
    WHERE user_id = v_user_id AND is_active = true;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Not authorized: admin approval permission required';
    END IF;
    
    -- Return pending sellers
    RETURN QUERY
    SELECT 
        sp.id,
        sp.user_id,
        u.username,
        u.email,
        sp.business_name,
        sp.contact_email,
        sp.contact_phone,
        sp.created_at
    FROM public.seller_profiles sp
    JOIN public.users u ON u.id = sp.user_id
    WHERE sp.status = 'pending'
    ORDER BY sp.created_at ASC;
END;
$$;

-- ============================================================================
-- FUNCTION: approve_seller
-- Admin approves a seller application
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_seller(
    seller_profile_id_param UUID,
    notes_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_admin_id UUID;
    v_is_admin BOOLEAN;
    v_seller_user_id UUID;
BEGIN
    -- Check if user is admin
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    SELECT id, can_approve_sellers INTO v_admin_id, v_is_admin
    FROM public.admin_profiles
    WHERE user_id = v_user_id AND is_active = true;
    
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized: admin approval permission required');
    END IF;
    
    -- Get seller user_id
    SELECT user_id INTO v_seller_user_id
    FROM public.seller_profiles
    WHERE id = seller_profile_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller profile not found');
    END IF;
    
    -- Update seller status
    UPDATE public.seller_profiles
    SET 
        status = 'approved',
        verified = true,
        verification_date = NOW(),
        updated_at = NOW()
    WHERE id = seller_profile_id_param;
    
    -- Remove notification (mark as resolved)
    UPDATE public.admin_notifications
    SET 
        is_resolved = true,
        resolved_by = v_admin_id,
        resolved_at = NOW()
    WHERE related_seller_id = seller_profile_id_param
        AND type = 'seller_pending';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Seller approved successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: reject_seller
-- Admin rejects a seller application
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reject_seller(
    seller_profile_id_param UUID,
    reason_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_admin_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    SELECT id, can_approve_sellers INTO v_admin_id, v_is_admin
    FROM public.admin_profiles
    WHERE user_id = v_user_id AND is_active = true;
    
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized: admin approval permission required');
    END IF;
    
    -- Update seller status
    UPDATE public.seller_profiles
    SET 
        status = 'suspended',
        verified = false,
        updated_at = NOW()
    WHERE id = seller_profile_id_param;
    
    -- Remove notification (mark as resolved)
    UPDATE public.admin_notifications
    SET 
        is_resolved = true,
        resolved_by = v_admin_id,
        resolved_at = NOW()
    WHERE related_seller_id = seller_profile_id_param
        AND type = 'seller_pending';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Seller application rejected'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: get_unreviewed_audit_logs
-- Get suspicious game audits for admin review
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_unreviewed_audit_logs()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    game_type TEXT,
    score NUMERIC,
    accuracy NUMERIC,
    flags TEXT[],
    suspicion_level TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    SELECT can_review_audits INTO v_is_admin
    FROM public.admin_profiles
    WHERE user_id = v_user_id AND is_active = true;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Not authorized: audit review permission required';
    END IF;
    
    -- Return unreviewed audit logs
    RETURN QUERY
    SELECT 
        gal.id,
        gal.user_id,
        u.username,
        gal.game_type,
        gal.score,
        gal.accuracy,
        gal.flags,
        gal.suspicion_level,
        gal.created_at
    FROM public.game_audit_logs gal
    JOIN public.users u ON u.id = gal.user_id
    WHERE gal.reviewed = false
        AND gal.suspicion_level IN ('medium', 'high', 'critical')
    ORDER BY 
        CASE gal.suspicion_level
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
        END,
        gal.created_at DESC;
END;
$$;

-- ============================================================================
-- TRIGGER: Notify admin on new seller registration
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_admin_new_seller()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_admin_record RECORD;
    v_username TEXT;
BEGIN
    -- Get username
    SELECT username INTO v_username
    FROM public.users
    WHERE id = NEW.user_id;
    
    -- Create notifications for all admins with approval permission
    FOR v_admin_record IN 
        SELECT id FROM public.admin_profiles 
        WHERE can_approve_sellers = true AND is_active = true
    LOOP
        INSERT INTO public.admin_notifications (
            admin_id,
            type,
            title,
            message,
            severity,
            related_user_id,
            related_seller_id
        ) VALUES (
            v_admin_record.id,
            'seller_pending',
            'New Seller Registration',
            'User "' || COALESCE(v_username, 'Unknown') || '" has registered as a seller and needs approval.',
            'info',
            NEW.user_id,
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_seller_registration ON public.seller_profiles;

-- Create trigger
CREATE TRIGGER on_seller_registration
    AFTER INSERT ON public.seller_profiles
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_admin_new_seller();

-- ============================================================================
-- UPDATE: register_as_seller function to set status as 'pending'
-- ============================================================================
CREATE OR REPLACE FUNCTION public.register_as_seller(
    contact_email_param TEXT,
    business_name_param TEXT DEFAULT NULL,
    contact_phone_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Check if already registered
    IF EXISTS(SELECT 1 FROM public.seller_profiles WHERE user_id = v_user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already registered as seller');
    END IF;
    
    -- Create seller profile (pending approval)
    INSERT INTO public.seller_profiles (
        user_id,
        business_name,
        contact_email,
        contact_phone,
        status,
        verified
    ) VALUES (
        v_user_id,
        business_name_param,
        contact_email_param,
        contact_phone_param,
        'pending', -- Requires admin approval
        false
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Registration submitted! Awaiting admin approval.'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- INITIALIZE MASTER ADMIN
-- Run this once to set up rf32191@gmail.com as master admin
-- ============================================================================
DO $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check if user exists first
    IF EXISTS(SELECT 1 FROM public.users WHERE email = 'rf32191@gmail.com') THEN
        SELECT create_master_admin('rf32191@gmail.com') INTO v_result;
        RAISE NOTICE '%', v_result->>'message';
    ELSE
        RAISE NOTICE '⚠️ User rf32191@gmail.com not found. Please create an account first, then run: SELECT create_master_admin(''rf32191@gmail.com'');';
    END IF;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.create_master_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_sellers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_seller(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_seller(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unreviewed_audit_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_as_seller(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '
✅ ADMIN APPROVAL SYSTEM SETUP COMPLETE!

Tables Created:
- admin_profiles (admin accounts with permissions)
- admin_notifications (seller approvals, audit alerts)

Functions Created:
- create_master_admin() - Create master admin
- check_admin_status() - Check admin permissions
- get_pending_sellers() - View pending sellers
- approve_seller() - Approve seller registration
- reject_seller() - Reject seller application
- get_unreviewed_audit_logs() - Review suspicious games

Master Admin:
📧 rf32191@gmail.com
- Can approve/reject sellers
- Can review game audit logs
- Can ban users
- Can manage other admins

Seller Registration:
✅ Now requires admin approval
✅ Status starts as "pending"
✅ Admin gets notified on new registration
✅ Seller can only create listings after approval

Next Steps:
1. Create account with rf32191@gmail.com (if not exists)
2. Run: SELECT create_master_admin(''rf32191@gmail.com'');
3. Build admin dashboard frontend
4. Test seller approval workflow

Ready! 🚀
' as status;

