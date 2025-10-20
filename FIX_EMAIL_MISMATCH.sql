-- Fix Email Mismatch Issue
-- This script will merge accounts and fix the email mismatch

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

-- 2. Merge accounts by keeping the one with more tokens and updating its email
DO $$ 
DECLARE
    correct_account_id UUID;
    correct_account_tokens INTEGER;
    wrong_account_id UUID;
    wrong_account_tokens INTEGER;
BEGIN
    -- Get the account with the correct email (130 tokens)
    SELECT id, tokens INTO correct_account_id, correct_account_tokens
    FROM public.users 
    WHERE email = 'ryanfermoselle@yahoo.com';
    
    -- Get the account with the wrong email (138 tokens)
    SELECT id, tokens INTO wrong_account_id, wrong_account_tokens
    FROM public.users 
    WHERE email = 'ryanrfermoselle@yahoo.com';
    
    -- If both accounts exist, merge them
    IF correct_account_id IS NOT NULL AND wrong_account_id IS NOT NULL THEN
        -- Update the correct account with the higher token balance
        UPDATE public.users 
        SET 
            tokens = wrong_account_tokens,
            balance = (SELECT balance FROM public.users WHERE id = wrong_account_id),
            total_spent = (SELECT total_spent FROM public.users WHERE id = wrong_account_id),
            total_earned = (SELECT total_earned FROM public.users WHERE id = wrong_account_id),
            games_played = (SELECT games_played FROM public.users WHERE id = wrong_account_id),
            games_won = (SELECT games_won FROM public.users WHERE id = wrong_account_id),
            updated_at = NOW()
        WHERE id = correct_account_id;
        
        -- Delete the wrong account
        DELETE FROM public.users WHERE id = wrong_account_id;
        
        RAISE NOTICE 'Merged accounts: Updated account % to have % tokens, deleted account %', 
            correct_account_id, wrong_account_tokens, wrong_account_id;
    END IF;
END $$;

-- 3. Update the auth.users table to use the correct email
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
