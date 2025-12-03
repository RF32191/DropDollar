-- ============================================================================
-- FIX USER ID SYNC - Resolve marketplace_listings foreign key errors
-- ============================================================================
-- This fixes the mismatch between auth.users and public.users IDs
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Show current state
SELECT '=== CURRENT STATE ===' as step;

SELECT 'auth.users' as source, id, email, created_at 
FROM auth.users 
WHERE email = 'rf32191@gmail.com';

SELECT 'public.users' as source, id, email, created_at 
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Step 2: Fix the ID mismatch
DO $$
DECLARE
    v_auth_id UUID;
    v_public_id UUID;
    v_ids_match BOOLEAN;
BEGIN
    -- Get IDs
    SELECT id INTO v_auth_id FROM auth.users WHERE email = 'rf32191@gmail.com';
    SELECT id INTO v_public_id FROM public.users WHERE email = 'rf32191@gmail.com';
    
    -- Check if they match
    v_ids_match := (v_auth_id = v_public_id);
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Auth ID:   %', v_auth_id;
    RAISE NOTICE 'Public ID: %', v_public_id;
    RAISE NOTICE 'Match:     %', v_ids_match;
    RAISE NOTICE '====================================';
    
    IF v_ids_match THEN
        RAISE NOTICE '✅ IDs already match - no fix needed!';
    ELSE
        RAISE NOTICE '🔧 Fixing ID mismatch...';
        
        -- Temporarily disable triggers
        SET session_replication_role = replica;
        
        -- Update all child tables to use auth_id (correct one)
        RAISE NOTICE 'Updating admin_profiles...';
        UPDATE public.admin_profiles SET user_id = v_auth_id WHERE user_id = v_public_id;
        
        RAISE NOTICE 'Updating user_balances...';
        UPDATE public.user_balances SET user_id = v_auth_id WHERE user_id = v_public_id;
        
        RAISE NOTICE 'Updating marketplace_listings...';
        UPDATE public.marketplace_listings SET seller_id = v_auth_id WHERE seller_id = v_public_id;
        
        RAISE NOTICE 'Updating marketplace_sessions...';
        UPDATE public.marketplace_sessions SET winner_user_id = v_auth_id WHERE winner_user_id = v_public_id;
        
        RAISE NOTICE 'Updating game_history...';
        UPDATE public.game_history SET user_id = v_auth_id WHERE user_id = v_public_id;
        
        RAISE NOTICE 'Updating tax_profiles...';
        UPDATE public.tax_profiles SET user_id = v_auth_id WHERE user_id = v_public_id;
        
        RAISE NOTICE 'Updating one_v_one_participants...';
        UPDATE public.one_v_one_participants SET user_id = v_auth_id WHERE user_id = v_public_id;
        
        RAISE NOTICE 'Updating withdrawal_requests...';
        UPDATE public.withdrawal_requests SET user_id = v_auth_id WHERE user_id = v_public_id;
        
        RAISE NOTICE 'Updating user_messages...';
        UPDATE public.user_messages SET user_id = v_auth_id WHERE user_id = v_public_id;
        
        -- Delete old user record
        RAISE NOTICE 'Removing old user record...';
        DELETE FROM public.users WHERE id = v_public_id;
        
        -- Insert correct user record
        RAISE NOTICE 'Inserting correct user record...';
        INSERT INTO public.users (id, email, username, created_at)
        SELECT id, email, COALESCE(raw_user_meta_data->>'username', 'ryan'), created_at
        FROM auth.users 
        WHERE email = 'rf32191@gmail.com'
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            username = EXCLUDED.username;
        
        -- Re-enable triggers
        SET session_replication_role = DEFAULT;
        
        RAISE NOTICE '✅ ID sync complete!';
    END IF;
END $$;

-- Step 3: Verify the fix
SELECT '=== VERIFICATION ===' as step;

SELECT 'auth.users' as source, id, email 
FROM auth.users 
WHERE email = 'rf32191@gmail.com'
UNION ALL
SELECT 'public.users' as source, id, email 
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Check if IDs now match
SELECT 
    CASE 
        WHEN (SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com') = 
             (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com')
        THEN '✅ SUCCESS: IDs are synced!'
        ELSE '❌ ERROR: IDs still do not match'
    END as result;

-- Show user's data
SELECT 
    'user_balances' as table_name,
    user_id,
    tokens,
    cash_balance
FROM public.user_balances
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com');

SELECT '✅ You can now create marketplace listings!' as status;

