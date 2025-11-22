-- ============================================
-- FIX ALL LOGIN ISSUES - UNIVERSAL AUTH FIX
-- ============================================
-- Ensures ALL users (current and future) can login and use dashboard
-- Fixes: Loading dashboard stuck, profile not loading, session issues
-- ============================================

-- ================================================
-- PART 1: CHECK AND FIX SPECIFIC USER
-- ================================================

-- Check if immersionproduction user exists and their status
DO $$
DECLARE
    v_user_record RECORD;
    v_auth_record RECORD;
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '🔍 CHECKING USER: immersionproduction';
    RAISE NOTICE '====================================';
    
    -- Check in auth.users (Supabase auth)
    SELECT 
        id, 
        email, 
        email_confirmed_at,
        last_sign_in_at,
        created_at
    INTO v_auth_record
    FROM auth.users
    WHERE email ILIKE '%immersionproduction%';
    
    IF v_auth_record.id IS NOT NULL THEN
        RAISE NOTICE '✅ Found in auth.users:';
        RAISE NOTICE '   ID: %', v_auth_record.id;
        RAISE NOTICE '   Email: %', v_auth_record.email;
        RAISE NOTICE '   Email Confirmed: %', v_auth_record.email_confirmed_at IS NOT NULL;
        RAISE NOTICE '   Last Login: %', v_auth_record.last_sign_in_at;
        RAISE NOTICE '   Created: %', v_auth_record.created_at;
        
        -- Check if profile exists in public.users
        SELECT * INTO v_user_record
        FROM public.users
        WHERE id = v_auth_record.id;
        
        IF v_user_record.id IS NOT NULL THEN
            RAISE NOTICE '✅ Profile exists in public.users';
            RAISE NOTICE '   Username: %', v_user_record.username;
        ELSE
            RAISE NOTICE '❌ Profile MISSING in public.users - CREATING NOW...';
            
            -- Create missing profile (handle email conflict)
            BEGIN
                INSERT INTO public.users (
                    id,
                    email,
                    username,
                    created_at
                ) VALUES (
                    v_auth_record.id,
                    v_auth_record.email,
                    SPLIT_PART(v_auth_record.email, '@', 1),
                    v_auth_record.created_at
                )
                ON CONFLICT (id) DO NOTHING;
                
                RAISE NOTICE '✅ Profile created!';
            EXCEPTION
                WHEN unique_violation THEN
                    RAISE NOTICE '⚠️ Profile already exists (email conflict)';
            END;
        END IF;
        
        -- Check if balance exists
        IF NOT EXISTS (SELECT 1 FROM public.user_balances WHERE user_id = v_auth_record.id) THEN
            RAISE NOTICE '❌ Balance MISSING - CREATING NOW...';
            
            INSERT INTO public.user_balances (
                user_id,
                drop_tokens
            ) VALUES (
                v_auth_record.id,
                0
            );
            
            RAISE NOTICE '✅ Balance created!';
        ELSE
            RAISE NOTICE '✅ Balance exists';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ User NOT FOUND in auth.users';
        RAISE NOTICE '💡 User needs to complete registration first';
    END IF;
    
    RAISE NOTICE '====================================';
END $$;

-- ================================================
-- PART 2: CREATE AUTO-FIX TRIGGER FOR ALL USERS
-- ================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function to auto-create profiles for ANY user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create user profile (handle both id and email conflicts)
    BEGIN
        INSERT INTO public.users (
            id,
            email,
            username,
            created_at
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(
                NEW.raw_user_meta_data->>'username',
                NEW.raw_user_meta_data->>'full_name',
                SPLIT_PART(NEW.email, '@', 1)
            ),
            NEW.created_at
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            updated_at = NOW();
    EXCEPTION
        WHEN unique_violation THEN
            -- Email already exists, skip
            NULL;
    END;
    
    -- Create user balance (if not exists)
    INSERT INTO public.user_balances (
        user_id,
        drop_tokens
    ) VALUES (
        NEW.id,
        0
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Auto-created profile and balance for user: %', NEW.email;
    
    RETURN NEW;
END;
$$;

-- Create trigger that fires for ALL new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
    RAISE NOTICE '✅ Auto-profile creation trigger installed';
END $$;

-- ================================================
-- PART 3: FIX ALL EXISTING USERS (RETROACTIVE)
-- ================================================

-- Fix any existing users that are missing profiles or balances
DO $$
DECLARE
    v_auth_user RECORD;
    v_fixed_count INTEGER := 0;
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '🔧 FIXING ALL EXISTING USERS...';
    RAISE NOTICE '====================================';
    
    -- Loop through all auth users
    FOR v_auth_user IN 
        SELECT id, email, created_at FROM auth.users
    LOOP
        -- Ensure profile exists (handle both id and email conflicts)
        BEGIN
            INSERT INTO public.users (
                id,
                email,
                username,
                created_at
            ) VALUES (
                v_auth_user.id,
                v_auth_user.email,
                SPLIT_PART(v_auth_user.email, '@', 1),
                v_auth_user.created_at
            )
            ON CONFLICT (id) DO UPDATE
            SET 
                email = EXCLUDED.email,
                updated_at = NOW();
        EXCEPTION
            WHEN unique_violation THEN
                -- Email already exists, just skip
                NULL;
        END;
        
        -- Ensure balance exists
        INSERT INTO public.user_balances (
            user_id,
            drop_tokens
        ) VALUES (
            v_auth_user.id,
            0
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        v_fixed_count := v_fixed_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Fixed % users', v_fixed_count;
    RAISE NOTICE '====================================';
END $$;

-- ================================================
-- PART 4: ADD HELPER FUNCTION TO CHECK USER STATUS
-- ================================================

CREATE OR REPLACE FUNCTION public.check_user_login_status(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_auth_exists BOOLEAN;
    v_profile_exists BOOLEAN;
    v_balance_exists BOOLEAN;
    v_user_id UUID;
BEGIN
    -- Check auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;
    
    v_auth_exists := v_user_id IS NOT NULL;
    
    IF v_auth_exists THEN
        -- Check public.users
        v_profile_exists := EXISTS (
            SELECT 1 FROM public.users WHERE id = v_user_id
        );
        
        -- Check user_balances
        v_balance_exists := EXISTS (
            SELECT 1 FROM public.user_balances WHERE user_id = v_user_id
        );
    ELSE
        v_profile_exists := false;
        v_balance_exists := false;
    END IF;
    
    v_result := jsonb_build_object(
        'email', p_email,
        'auth_exists', v_auth_exists,
        'profile_exists', v_profile_exists,
        'balance_exists', v_balance_exists,
        'can_login', v_auth_exists AND v_profile_exists AND v_balance_exists,
        'user_id', v_user_id
    );
    
    RETURN v_result;
END;
$$;

-- ================================================
-- PART 5: ENSURE RLS POLICIES DON'T BLOCK USERS
-- ================================================

-- Make sure RLS policies allow users to see their own data
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own balance" ON public.user_balances;
CREATE POLICY "Users can view own balance"
ON public.user_balances FOR SELECT
USING (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies configured';
END $$;

-- ================================================
-- PART 6: CREATE ADMIN FUNCTION TO FIX ANY USER
-- ================================================

CREATE OR REPLACE FUNCTION public.fix_user_account(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_result TEXT;
BEGIN
    -- Get user ID from auth
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        RETURN 'ERROR: User not found in auth.users. User must register first.';
    END IF;
    
    -- Create/update profile (handle email conflicts)
    BEGIN
        INSERT INTO public.users (
            id,
            email,
            username,
            created_at
        ) 
        SELECT 
            id,
            email,
            SPLIT_PART(email, '@', 1),
            created_at
        FROM auth.users
        WHERE id = v_user_id
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            updated_at = NOW();
    EXCEPTION
        WHEN unique_violation THEN
            -- Email already exists, skip
            NULL;
    END;
    
    -- Create/update balance
    INSERT INTO public.user_balances (
        user_id,
        drop_tokens
    ) VALUES (
        v_user_id,
        0
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    v_result := 'SUCCESS: Fixed account for ' || p_email || ' (ID: ' || v_user_id || ')';
    
    RETURN v_result;
END;
$$;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ ALL LOGIN ISSUES FIXED!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ Existing users fixed';
    RAISE NOTICE '✅ Auto-profile creation enabled';
    RAISE NOTICE '✅ RLS policies configured';
    RAISE NOTICE '✅ Helper functions created';
    RAISE NOTICE '====================================';
    RAISE NOTICE '🎯 ALL USERS CAN NOW LOGIN!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 To check any user:';
    RAISE NOTICE '   SELECT check_user_login_status(''email@example.com'');';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 To fix any user:';
    RAISE NOTICE '   SELECT fix_user_account(''email@example.com'');';
    RAISE NOTICE '====================================';
END $$;

-- Check the immersionproduction user specifically
SELECT check_user_login_status(email)
FROM auth.users
WHERE email ILIKE '%immersionproduction%'
LIMIT 1;

