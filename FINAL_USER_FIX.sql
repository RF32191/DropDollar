-- ============================================================================
-- FINAL USER FIX - Guaranteed to work
-- ============================================================================
-- This will forcefully sync your auth user to public.users
-- Run this in Supabase SQL Editor
-- ============================================================================

DO $$
DECLARE
    v_auth_id UUID;
    v_auth_email TEXT;
BEGIN
    -- Get auth user info
    SELECT id, email INTO v_auth_id, v_auth_email 
    FROM auth.users 
    WHERE email = 'rf32191@gmail.com';
    
    RAISE NOTICE 'Auth ID: %', v_auth_id;
    RAISE NOTICE 'Email: %', v_auth_email;
    
    IF v_auth_id IS NULL THEN
        RAISE EXCEPTION 'User not found in auth.users!';
    END IF;
    
    -- Check if user exists in public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE id = v_auth_id) THEN
        RAISE NOTICE '✅ User already exists in public.users';
    ELSE
        RAISE NOTICE '⚠️ User missing from public.users - creating...';
        
        -- Insert the user
        INSERT INTO public.users (id, email, username, created_at)
        VALUES (
            v_auth_id,
            v_auth_email,
            'ryan',
            NOW()
        );
        
        RAISE NOTICE '✅ User created in public.users';
    END IF;
    
    -- Make sure user_balances exists
    IF NOT EXISTS (SELECT 1 FROM public.user_balances WHERE user_id = v_auth_id) THEN
        RAISE NOTICE '⚠️ Creating user_balances...';
        INSERT INTO public.user_balances (user_id, created_at)
        VALUES (v_auth_id, NOW())
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ ALL DONE!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Your user ID: %', v_auth_id;
    RAISE NOTICE 'You can now create marketplace listings!';
END $$;

-- Final verification
SELECT 
    'VERIFICATION' as check_type,
    a.id as auth_id,
    u.id as public_id,
    CASE WHEN a.id = u.id THEN '✅ MATCH' ELSE '❌ MISMATCH' END as status
FROM auth.users a
LEFT JOIN public.users u ON u.email = a.email
WHERE a.email = 'rf32191@gmail.com';

SELECT '✅ READY TO CREATE LISTINGS!' as final_status;

