-- Check User Accounts and Wallet Balances
-- This script will help identify the correct user accounts and their balances

-- 1. Check all users with email patterns containing "ryan" and "fermoselle"
SELECT 
    id,
    email,
    username,
    first_name,
    last_name,
    tokens,
    balance,
    total_spent,
    total_earned,
    games_played,
    games_won,
    is_active,
    last_login,
    created_at,
    updated_at
FROM public.users 
WHERE email ILIKE '%ryan%fermoselle%'
ORDER BY created_at DESC;

-- 2. Check for exact email matches
SELECT 
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

-- 3. Check for any similar email patterns
SELECT 
    id,
    email,
    username,
    tokens,
    balance,
    is_active,
    last_login
FROM public.users 
WHERE email ILIKE '%ryan%fermoselle%yahoo%'
ORDER BY email;

-- 4. Check auth.users table (Supabase auth table) for these emails
SELECT 
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

-- 5. Check if there are any duplicate or similar accounts
SELECT 
    email,
    COUNT(*) as account_count,
    STRING_AGG(id::text, ', ') as user_ids,
    STRING_AGG(username, ', ') as usernames
FROM public.users 
WHERE email ILIKE '%ryan%fermoselle%'
GROUP BY email
HAVING COUNT(*) > 1;

-- 6. Show wallet details for both accounts
SELECT 
    'User Account Details' as info,
    u.id,
    u.email,
    u.username,
    u.tokens,
    u.balance,
    u.is_active,
    u.last_login
FROM public.users u
WHERE u.email IN (
    'ryanfermoselle@yahoo.com',
    'ryanrfermoselle@yahoo.com'
)
ORDER BY u.email;
