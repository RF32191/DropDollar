-- Simple Fix for Email Mismatch Issue
-- This script will merge accounts using a simpler approach

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

-- 2. Simple approach: Update the correct account with the higher token balance
-- First, let's get the token balance from the wrong account
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

-- 3. Delete the wrong account
DELETE FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com';

-- 4. Update the auth.users table to use the correct email
UPDATE auth.users 
SET 
    email = 'ryanfermoselle@yahoo.com',
    updated_at = NOW()
WHERE email = 'ryanrfermoselle@yahoo.com';

-- 5. Show the final state after the fix
SELECT 
    'AFTER FIX' as status,
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

-- 6. Verify no duplicate accounts remain
SELECT 
    'VERIFICATION' as status,
    email,
    COUNT(*) as account_count
FROM public.users 
WHERE email = 'ryanfermoselle@yahoo.com'
GROUP BY email;
