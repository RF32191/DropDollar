-- ============================================================================
-- DIAGNOSE AND FIX USER ISSUE
-- Find out what's happening and fix it permanently
-- ============================================================================

-- STEP 1: Diagnostic - Check current state
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    SELECT COUNT(*) INTO missing_count FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);
    
    RAISE NOTICE '🔍 DIAGNOSTIC:';
    RAISE NOTICE 'Auth users: %', auth_count;
    RAISE NOTICE 'Public users: %', public_count;
    RAISE NOTICE 'Missing users: %', missing_count;
    
    IF missing_count > 0 THEN
        RAISE NOTICE '⚠️ There are % users in auth.users but not in public.users!', missing_count;
    END IF;
END $$;

-- STEP 2: Show missing users (first 5)
SELECT 
    au.id,
    au.email,
    'MISSING IN PUBLIC.USERS' as status
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
LIMIT 5;

-- STEP 3: Force create ALL missing users with exception handling
DO $$
DECLARE
    auth_user RECORD;
    insert_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    FOR auth_user IN 
        SELECT id, email 
        FROM auth.users au 
        WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
    LOOP
        BEGIN
            INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
            VALUES (
                auth_user.id, 
                COALESCE(SPLIT_PART(auth_user.email, '@', 1), 'user_' || SUBSTRING(auth_user.id::TEXT, 1, 8)),
                auth_user.email, 
                100, 
                NOW(), 
                NOW()
            );
            insert_count := insert_count + 1;
        EXCEPTION 
            WHEN unique_violation THEN
                RAISE NOTICE 'Skipped duplicate: %', auth_user.email;
                error_count := error_count + 1;
            WHEN OTHERS THEN
                RAISE NOTICE 'Error creating user %: %', auth_user.email, SQLERRM;
                error_count := error_count + 1;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Created % new users', insert_count;
    RAISE NOTICE '⚠️ Skipped % users due to errors', error_count;
END $$;

-- STEP 4: Fix null usernames
UPDATE public.users 
SET username = COALESCE(SPLIT_PART(email, '@', 1), 'user_' || SUBSTRING(id::TEXT, 1, 8)),
    updated_at = NOW()
WHERE username IS NULL;

-- STEP 5: Create/recreate trigger for future users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    BEGIN
        INSERT INTO public.users (id, username, email, tokens, created_at, updated_at)
        VALUES (
            NEW.id, 
            COALESCE(SPLIT_PART(NEW.email, '@', 1), 'user_' || SUBSTRING(NEW.id::TEXT, 1, 8)),
            NEW.email, 
            100, 
            NOW(), 
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE NOTICE 'Error in trigger for user %: %', NEW.email, SQLERRM;
    END;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created 
    AFTER INSERT ON auth.users 
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 6: Final verification
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    missing_count INTEGER;
    null_username_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    SELECT COUNT(*) INTO null_username_count FROM public.users WHERE username IS NULL;
    SELECT COUNT(*) INTO missing_count FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 FINAL STATUS:';
    RAISE NOTICE 'Auth users: %', auth_count;
    RAISE NOTICE 'Public users: %', public_count;
    RAISE NOTICE 'Missing users: %', missing_count;
    RAISE NOTICE 'Null usernames: %', null_username_count;
    RAISE NOTICE '========================================';
    
    IF missing_count = 0 AND null_username_count = 0 THEN
        RAISE NOTICE '🎉 SUCCESS! All users synced!';
        RAISE NOTICE '✅ Hot Sell and Winner Takes All ready for all users!';
    ELSE
        RAISE NOTICE '⚠️ ISSUE: Some users still missing or have null username';
        RAISE NOTICE '💡 Run this script again or check for constraint issues';
    END IF;
END $$;

-- STEP 7: Show first 5 public users to verify
SELECT id, username, email, tokens FROM public.users ORDER BY created_at DESC LIMIT 5;

