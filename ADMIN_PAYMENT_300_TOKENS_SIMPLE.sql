-- Admin Token Payment Script (Simplified)
-- This script pays 300 tokens to ryanrfermoselle@yahoo.com as an admin action

-- 1. First, let's see the current state of the account
SELECT 
    'BEFORE PAYMENT' as status,
    id,
    email,
    username,
    tokens,
    balance,
    total_earned,
    is_active,
    last_login
FROM public.users 
WHERE email = 'ryanrfermoselle@yahoo.com';

-- 2. Add 300 tokens to the account
UPDATE public.users 
SET 
    tokens = tokens + 300,
    total_earned = total_earned + 300,
    updated_at = NOW()
WHERE email = 'ryanrfermoselle@yahoo.com';

-- 3. Record the admin payment transaction (with all required fields)
INSERT INTO public.token_transactions (
    user_id,
    amount,
    type,
    balance_before,
    balance_after,
    description,
    created_at
) VALUES (
    (SELECT id FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com'),
    300,
    'admin_payment',
    (SELECT tokens FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com'),
    (SELECT tokens + 300 FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com'),
    'Admin payment of 300 tokens',
    NOW()
);

-- 4. Show the final state after payment
SELECT 
    'AFTER PAYMENT' as status,
    id,
    email,
    username,
    tokens,
    balance,
    total_earned,
    is_active,
    last_login,
    updated_at
FROM public.users 
WHERE email = 'ryanrfermoselle@yahoo.com';

-- 5. Show the transaction record
SELECT 
    'TRANSACTION RECORD' as status,
    id,
    user_id,
    amount,
    type,
    balance_before,
    balance_after,
    description,
    created_at
FROM public.token_transactions 
WHERE user_id = (SELECT id FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com')
ORDER BY created_at DESC
LIMIT 1;

-- 6. Verification - show total tokens earned
SELECT 
    'VERIFICATION' as status,
    email,
    tokens as current_tokens,
    total_earned as total_tokens_earned,
    (tokens - total_earned) as tokens_from_other_sources
FROM public.users 
WHERE email = 'ryanrfermoselle@yahoo.com';
