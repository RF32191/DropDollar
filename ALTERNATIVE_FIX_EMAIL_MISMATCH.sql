-- Alternative Fix for Email Mismatch Issue
-- This script will handle the unique constraint properly

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

-- 2. Step 1: Update the wrong account to a temporary email first
UPDATE public.users 
SET 
    email = 'temp_ryanrfermoselle@yahoo.com',
    updated_at = NOW()
WHERE email = 'ryanrfermoselle@yahoo.com';

-- 3. Step 2: Now update the correct account with the higher token balance
UPDATE public.users 
SET 
    tokens = (SELECT tokens FROM public.users WHERE email = 'temp_ryanrfermoselle@yahoo.com'),
    balance = (SELECT balance FROM public.users WHERE email = 'temp_ryanrfermoselle@yahoo.com'),
    total_spent = (SELECT total_spent FROM public.users WHERE email = 'temp_ryanrfermoselle@yahoo.com'),
    total_earned = (SELECT total_earned FROM public.users WHERE email = 'temp_ryanrfermoselle@yahoo.com'),
    games_played = (SELECT games_played FROM public.users WHERE email = 'temp_ryanrfermoselle@yahoo.com'),
    games_won = (SELECT games_won FROM public.users WHERE email = 'temp_ryanrfermoselle@yahoo.com'),
    updated_at = NOW()
WHERE email = 'ryanfermoselle@yahoo.com';

-- 4. Step 3: Delete the temporary account
DELETE FROM public.users WHERE email = 'temp_ryanrfermoselle@yahoo.com';

-- 5. Step 4: Update the auth.users table to use the correct email
UPDATE auth.users 
SET 
    email = 'ryanfermoselle@yahoo.com',
    updated_at = NOW()
WHERE email = 'ryanrfermoselle@yahoo.com';

-- 6. Show the final state after the fix
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

-- 7. Verify no duplicate accounts remain
SELECT 
    'VERIFICATION' as status,
    email,
    COUNT(*) as account_count
FROM public.users 
WHERE email = 'ryanfermoselle@yahoo.com'
GROUP BY email;
