-- ============================================================================
-- ACTIVATE rf32191@gmail.com AS MASTER ADMIN
-- Run this AFTER creating account with rf32191@gmail.com
-- ============================================================================

-- Step 1: Check if user exists
DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'rf32191@gmail.com';
BEGIN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ USER NOT FOUND!';
        RAISE NOTICE 'Please create an account with rf32191@gmail.com first, then run this script again.';
    ELSE
        RAISE NOTICE '✅ User found: %', v_user_id;
        
        -- Check if admin profile exists
        IF EXISTS(SELECT 1 FROM public.admin_profiles WHERE user_id = v_user_id) THEN
            RAISE NOTICE '✅ Admin profile already exists';
        ELSE
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
                v_email,
                'master_admin',
                true,  -- Can approve sellers
                true,  -- Can review game audits
                true,  -- Can ban users
                true,  -- Can manage other admins
                true   -- Active
            );
            
            RAISE NOTICE '✅ MASTER ADMIN CREATED!';
            RAISE NOTICE 'Email: %', v_email;
            RAISE NOTICE 'Access Dashboard: /admin/dashboard';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- Verify Admin Setup
-- ============================================================================
SELECT 
    ap.email,
    ap.role,
    ap.can_approve_sellers,
    ap.can_review_audits,
    ap.can_ban_users,
    ap.can_manage_admins,
    ap.is_active,
    ap.created_at
FROM public.admin_profiles ap
WHERE ap.email = 'rf32191@gmail.com';

-- ============================================================================
-- Check Pending Sellers (if any)
-- ============================================================================
SELECT 
    sp.id,
    sp.shop_name,
    u.username,
    u.email,
    sp.created_at,
    sp.status
FROM public.seller_profiles sp
JOIN public.users u ON u.id = sp.user_id
WHERE sp.status = 'pending'
ORDER BY sp.created_at DESC;

-- ============================================================================
-- Check Game Audit Logs (if any)
-- ============================================================================
SELECT 
    gal.id,
    gal.game_type,
    u.username,
    gal.score,
    gal.accuracy,
    gal.suspicion_level,
    gal.flags,
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
    gal.created_at DESC
LIMIT 10;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '
✅ ADMIN ACTIVATION COMPLETE!

Master Admin: rf32191@gmail.com
Role: master_admin

Permissions:
✅ Approve/reject sellers
✅ Review game audit logs
✅ Ban users
✅ Manage other admins

Dashboard Access:
URL: /admin/dashboard
Password Protected: YES (requires login with rf32191@gmail.com)

Features on Dashboard:
1. Pending Sellers Tab
   - View all seller applications
   - See business details
   - Approve or reject with one click
   
2. Audit Logs Tab
   - View suspicious game activity
   - See flagged players
   - Review and take action

Next Steps:
1. Login with rf32191@gmail.com
2. Go to /admin/dashboard
3. Start reviewing sellers and audits!

Security:
- Dashboard requires authentication
- Only admins can access /admin/dashboard
- Non-admins see "Access Denied"
- All actions are logged

Ready! 🛡️
' as status;

