-- ADD_TOKENS_FOR_USERS.sql
-- This script adds 300 tokens for specific email addresses

-- Add 300 tokens for ryanfermoselle@yahoo.com and rf32191@gmail.com
INSERT INTO public.users (
    id, username, email, tokens, role, account_type, verification_status, is_active
)
VALUES 
    (gen_random_uuid(), 'ryanfermoselle', 'ryanfermoselle@yahoo.com', 300, 'buyer', 'buyer', 'verified', true),
    (gen_random_uuid(), 'rf32191', 'rf32191@gmail.com', 300, 'buyer', 'buyer', 'verified', true)
ON CONFLICT (email) DO UPDATE SET
    tokens = users.tokens + 300,
    updated_at = NOW();

-- Verify the token additions
SELECT 
    'Token addition completed!' as status,
    username,
    email,
    tokens,
    account_type,
    created_at,
    updated_at
FROM public.users 
WHERE email IN ('ryanfermoselle@yahoo.com', 'rf32191@gmail.com')
ORDER BY email;
