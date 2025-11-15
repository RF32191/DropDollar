-- ============================================================================
-- FIX SELLER REGISTRATION & ADMIN APPROVAL SYSTEM
-- ============================================================================
-- Fixes the issue where seller registrations don't show in admin panel
-- Problem: Functions were referencing public.users instead of auth.users
-- ============================================================================

-- ============================================================================
-- 1. CREATE public.users VIEW (if it doesn't exist)
-- ============================================================================
-- This view makes it easier to query user data from auth.users

CREATE OR REPLACE VIEW public.users AS
SELECT 
    id,
    email,
    raw_user_meta_data->>'username' as username,
    created_at,
    updated_at,
    last_sign_in_at
FROM auth.users;

-- Grant access
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO service_role;

-- ============================================================================
-- 2. FIX: get_pending_sellers() FUNCTION
-- ============================================================================
-- Now uses the users view or auth.users properly

DROP FUNCTION IF EXISTS public.get_pending_sellers();

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
    v_is_master_admin BOOLEAN;
BEGIN
    -- Check if user is authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Check if user is master admin (rf32191@gmail.com)
    SELECT COUNT(*) > 0 INTO v_is_master_admin
    FROM auth.users
    WHERE id = v_user_id 
    AND email = 'rf32191@gmail.com';
    
    IF v_is_master_admin THEN
        v_is_admin := true;
    ELSE
        -- Check admin_profiles table
        SELECT COALESCE(can_approve_sellers, false) INTO v_is_admin
        FROM public.admin_profiles
        WHERE user_id = v_user_id AND is_active = true;
    END IF;
    
    IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'Not authorized: admin approval permission required';
    END IF;
    
    -- Return pending sellers
    RETURN QUERY
    SELECT 
        sp.id,
        sp.user_id,
        COALESCE(
            (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = sp.user_id),
            'Unknown'
        )::TEXT as username,
        (SELECT email FROM auth.users WHERE id = sp.user_id)::TEXT as email,
        sp.business_name,
        sp.contact_email,
        sp.contact_phone,
        sp.created_at
    FROM public.seller_profiles sp
    WHERE sp.status = 'pending'
    ORDER BY sp.created_at ASC;
END;
$$;

-- ============================================================================
-- 3. FIX: approve_seller() FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.approve_seller(UUID);

CREATE OR REPLACE FUNCTION public.approve_seller(
    seller_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
    v_is_master_admin BOOLEAN;
    v_seller_user_id UUID;
    v_shop_name TEXT;
BEGIN
    -- Check authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Check if user is master admin
    SELECT COUNT(*) > 0 INTO v_is_master_admin
    FROM auth.users
    WHERE id = v_user_id 
    AND email = 'rf32191@gmail.com';
    
    IF v_is_master_admin THEN
        v_is_admin := true;
    ELSE
        -- Check admin_profiles
        SELECT COALESCE(can_approve_sellers, false) INTO v_is_admin
        FROM public.admin_profiles
        WHERE user_id = v_user_id AND is_active = true;
    END IF;
    
    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized');
    END IF;
    
    -- Get seller info
    SELECT user_id, shop_name INTO v_seller_user_id, v_shop_name
    FROM public.seller_profiles
    WHERE id = seller_id_param;
    
    IF v_seller_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seller not found');
    END IF;
    
    -- Update seller status
    UPDATE public.seller_profiles
    SET 
        status = 'approved',
        approved_at = NOW(),
        approved_by = v_user_id,
        updated_at = NOW()
    WHERE id = seller_id_param;
    
    -- Clear pending notifications
    UPDATE public.admin_notifications
    SET is_read = true
    WHERE related_seller_id = seller_id_param
    AND type = 'seller_pending';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Seller approved successfully'
    );
END;
$$;

-- ============================================================================
-- 4. FIX: reject_seller() FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.reject_seller(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.reject_seller(
    seller_id_param UUID,
    reason_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
    v_is_master_admin BOOLEAN;
BEGIN
    -- Check authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Check if user is master admin
    SELECT COUNT(*) > 0 INTO v_is_master_admin
    FROM auth.users
    WHERE id = v_user_id 
    AND email = 'rf32191@gmail.com';
    
    IF v_is_master_admin THEN
        v_is_admin := true;
    ELSE
        -- Check admin_profiles
        SELECT COALESCE(can_approve_sellers, false) INTO v_is_admin
        FROM public.admin_profiles
        WHERE user_id = v_user_id AND is_active = true;
    END IF;
    
    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized');
    END IF;
    
    -- Update seller status
    UPDATE public.seller_profiles
    SET 
        status = 'rejected',
        rejection_reason = reason_param,
        rejected_at = NOW(),
        rejected_by = v_user_id,
        updated_at = NOW()
    WHERE id = seller_id_param;
    
    -- Clear pending notifications
    UPDATE public.admin_notifications
    SET is_read = true
    WHERE related_seller_id = seller_id_param
    AND type = 'seller_pending';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Seller rejected'
    );
END;
$$;

-- ============================================================================
-- 5. FIX: check_admin_status() FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.check_admin_status();

CREATE OR REPLACE FUNCTION public.check_admin_status()
RETURNS TABLE (
    is_admin BOOLEAN,
    role TEXT,
    can_approve_sellers BOOLEAN,
    can_review_audits BOOLEAN,
    can_ban_users BOOLEAN,
    can_manage_admins BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_is_master_admin BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, ''::TEXT, false, false, false, false;
        RETURN;
    END IF;
    
    -- Get user email
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Check if master admin
    v_is_master_admin := (v_email = 'rf32191@gmail.com');
    
    IF v_is_master_admin THEN
        -- Master admin has all permissions
        RETURN QUERY SELECT true, 'master_admin'::TEXT, true, true, true, true;
        RETURN;
    END IF;
    
    -- Check admin_profiles table
    RETURN QUERY
    SELECT 
        true as is_admin,
        ap.role,
        ap.can_approve_sellers,
        ap.can_review_audits,
        ap.can_ban_users,
        ap.can_manage_admins
    FROM public.admin_profiles ap
    WHERE ap.user_id = v_user_id 
    AND ap.is_active = true
    LIMIT 1;
    
    -- If no admin record found
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, ''::TEXT, false, false, false, false;
    END IF;
END;
$$;

-- ============================================================================
-- 6. ADD MISSING COLUMNS TO seller_profiles (if needed)
-- ============================================================================

ALTER TABLE public.seller_profiles 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_pending_sellers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_seller(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_seller(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_status() TO authenticated;

-- ============================================================================
-- 8. TEST QUERY - Check if it works now
-- ============================================================================

-- This should now return results if there are pending sellers
SELECT 
    sp.id,
    sp.user_id,
    au.email,
    sp.shop_name,
    sp.business_name,
    sp.contact_email,
    sp.status,
    sp.created_at
FROM public.seller_profiles sp
LEFT JOIN auth.users au ON au.id = sp.user_id
WHERE sp.status = 'pending'
ORDER BY sp.created_at DESC;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SELLER REGISTRATION FIXES APPLIED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed Issues:';
    RAISE NOTICE '1. ✅ Created public.users view from auth.users';
    RAISE NOTICE '2. ✅ Fixed get_pending_sellers() to use auth.users';
    RAISE NOTICE '3. ✅ Fixed approve_seller() function';
    RAISE NOTICE '4. ✅ Fixed reject_seller() function';
    RAISE NOTICE '5. ✅ Fixed check_admin_status() function';
    RAISE NOTICE '6. ✅ Added master admin check (rf32191@gmail.com)';
    RAISE NOTICE '7. ✅ Added missing columns to seller_profiles';
    RAISE NOTICE '';
    RAISE NOTICE 'What Changed:';
    RAISE NOTICE '- All functions now properly query auth.users';
    RAISE NOTICE '- Master admin bypasses admin_profiles check';
    RAISE NOTICE '- Better error handling and null checks';
    RAISE NOTICE '';
    RAISE NOTICE 'Test It:';
    RAISE NOTICE '1. Have a user complete seller registration';
    RAISE NOTICE '2. Login as rf32191@gmail.com';
    RAISE NOTICE '3. Go to /admin/dashboard';
    RAISE NOTICE '4. Check "Pending Sellers" tab';
    RAISE NOTICE '5. You should see the pending seller!';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Admin approval should now work!';
END $$;

