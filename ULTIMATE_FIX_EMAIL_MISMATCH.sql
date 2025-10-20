-- Ultimate Fix for Email Mismatch Issue
-- This script will handle both users and auth.users tables properly

-- 1. First, let's see the current state of both accounts
SELECT 
    'BEFORE FIX - USERS TABLE' as status,
    id,
    email,
    username,
    tokens,
    balance,
    is_active,
    last_login
FROM public.users 
WHERE email IN (
    'ryanfermoselle@yahoo.com',
    'ryanrfermoselle@yahoo.com'
)
ORDER BY email;

-- 2. Check auth.users table
SELECT 
    'BEFORE FIX - AUTH USERS' as status,
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email IN (
    'ryanfermoselle@yahoo.com',
    'ryanrfermoselle@yahoo.com'
)
ORDER BY email;

-- 3. Step 1: Update the correct account (ryanfermoselle@yahoo.com) with data from wrong account
UPDATE public.users 
SET 
    tokens = (SELECT tokens FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com'),
    balance = (SELECT balance FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com'),
    total_spent = (SELECT total_spent FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com'),
    total_earned = (SELECT total_earned FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com'),
    games_played = (SELECT games_played FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com'),
    games_won = (SELECT games_won FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com'),
    updated_at = NOW()
WHERE email = 'ryanfermoselle@yahoo.com';

-- 4. Step 2: Delete the wrong account from users table
DELETE FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com';

-- 5. Step 3: Delete the wrong account from auth.users table
DELETE FROM auth.users WHERE email = 'ryanrfermoselle@yahoo.com';

-- 6. Step 4: Show the final state after the fix
SELECT 
    'AFTER FIX - USERS TABLE' as status,
    id,
    email,
    username,
    tokens,
    balance,
    is_active,
    last_login,
    updated_at
FROM public.users 
WHERE email = 'ryanfermoselle@yahoo.com'
ORDER BY email;

-- 7. Step 5: Show auth.users table after fix
SELECT 
    'AFTER FIX - AUTH USERS' as status,
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'ryanfermoselle@yahoo.com'
ORDER BY email;

-- 8. Step 6: Verify no duplicate accounts remain
SELECT 
    'VERIFICATION - USERS TABLE' as status,
    email,
    COUNT(*) as account_count
FROM public.users 
WHERE email = 'ryanfermoselle@yahoo.com'
GROUP BY email;

-- 9. Step 7: Verify auth.users table
SELECT 
    'VERIFICATION - AUTH USERS' as status,
    email,
    COUNT(*) as account_count
FROM auth.users 
WHERE email = 'ryanfermoselle@yahoo.com'
GROUP BY email;
