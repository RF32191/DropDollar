-- ============================================================================
-- ENSURE CURRENT USER EXISTS - RUN THIS WITH YOUR USER ID
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID from auth.users
-- ============================================================================

-- First, let's see ALL auth users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Check which users are missing from public.users
SELECT 
    au.id,
    au.email,
    'MISSING' as status
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
ORDER BY au.created_at DESC;

-- Force create ALL missing users (final attempt)
DO $$
DECLARE
    v_auth_user RECORD;
    v_created_count INTEGER := 0;
    v_error_count INTEGER := 0;
BEGIN
    FOR v_auth_user IN (
        SELECT au.id, au.email 
        FROM auth.users au
        WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
    ) LOOP
        BEGIN
            INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
            VALUES (
                v_auth_user.id,
                COALESCE(SPLIT_PART(v_auth_user.email, '@', 1), 'user'),
                v_auth_user.email,
                100,
                NOW(),
                NOW()
            );
            v_created_count := v_created_count + 1;
            RAISE NOTICE 'Created user: % (%)', v_auth_user.email, v_auth_user.id;
        EXCEPTION 
            WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                RAISE NOTICE 'Error creating %: %', v_auth_user.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Created % users', v_created_count;
    RAISE NOTICE '❌ Errors: %', v_error_count;
    RAISE NOTICE '========================================';
END $$;

-- Verify all users now exist
SELECT 
    COUNT(*) FILTER (WHERE pu.id IS NOT NULL) as synced_users,
    COUNT(*) FILTER (WHERE pu.id IS NULL) as missing_users,
    COUNT(*) as total_auth_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id;

-- Show sample of public.users
SELECT id, username, email, tokens FROM public.users ORDER BY created_at DESC LIMIT 10;

RAISE NOTICE '🎉 All users should now be synced!';
RAISE NOTICE '🔄 REFRESH YOUR BROWSER and try again!';

