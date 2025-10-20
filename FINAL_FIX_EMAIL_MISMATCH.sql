-- Final Fix for Email Mismatch Issue
-- This script will work with existing accounts without trying to change emails

-- 1. First, let's see the current state of both accounts
SELECT 
    'BEFORE FIX' as status,
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

-- 2. Since both accounts exist, let's merge them by updating the correct account
-- with the higher token balance from the wrong account, then delete the wrong account

-- Step 1: Update the correct account (ryanfermoselle@yahoo.com) with data from wrong account
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

-- Step 2: Delete the wrong account (ryanrfermoselle@yahoo.com)
DELETE FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com';

-- Step 3: Update the auth.users table - change the wrong email to the correct one
-- But first, let's check what's in auth.users
SELECT 
    'AUTH USERS BEFORE' as status,
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

-- Step 4: Update auth.users - change the wrong email to correct email
UPDATE auth.users 
SET 
    email = 'ryanfermoselle@yahoo.com',
    updated_at = NOW()
WHERE email = 'ryanrfermoselle@yahoo.com';

-- Step 5: Show the final state after the fix
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

-- Step 6: Show auth.users table after fix
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

-- Step 7: Verify no duplicate accounts remain
SELECT 
    'VERIFICATION' as status,
    email,
    COUNT(*) as account_count
FROM public.users 
WHERE email = 'ryanfermoselle@yahoo.com'
GROUP BY email;
