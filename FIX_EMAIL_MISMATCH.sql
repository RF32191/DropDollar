-- Fix Email Mismatch Issue
-- This script will correct the email addresses and merge accounts if needed

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

-- 2. Update the wrong account to have the correct email
-- This will fix the email mismatch
UPDATE public.users 
SET 
    email = 'ryanfermoselle@yahoo.com',
    updated_at = NOW()
WHERE email = 'ryanrfermoselle@yahoo.com';

-- 3. Also update the auth.users table (Supabase auth table)
UPDATE auth.users 
SET 
    email = 'ryanfermoselle@yahoo.com',
    updated_at = NOW()
WHERE email = 'ryanrfermoselle@yahoo.com';

-- 4. If there are now duplicate accounts, we need to merge them
-- First, let's check if we have duplicates after the update
SELECT 
    email,
    COUNT(*) as account_count,
    STRING_AGG(id::text, ', ') as user_ids,
    STRING_AGG(tokens::text, ', ') as token_balances
FROM public.users 
WHERE email = 'ryanfermoselle@yahoo.com'
GROUP BY email
HAVING COUNT(*) > 1;

-- 5. If there are duplicates, we need to merge them
-- Keep the account with more tokens (138) and delete the other
DO $$ 
DECLARE
    account_1_id TEXT;
    account_1_tokens INTEGER;
    account_2_id TEXT;
    account_2_tokens INTEGER;
BEGIN
    -- Get both account details
    SELECT id, tokens INTO account_1_id, account_1_tokens
    FROM public.users 
    WHERE email = 'ryanfermoselle@yahoo.com' 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    SELECT id, tokens INTO account_2_id, account_2_tokens
    FROM public.users 
    WHERE email = 'ryanfermoselle@yahoo.com' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- If we have two different accounts, merge them
    IF account_1_id != account_2_id THEN
        -- Keep the account with more tokens
        IF account_2_tokens > account_1_tokens THEN
            -- Delete the account with fewer tokens
            DELETE FROM public.users WHERE id = account_1_id;
            RAISE NOTICE 'Merged accounts: Kept account % with % tokens, deleted account % with % tokens', 
                account_2_id, account_2_tokens, account_1_id, account_1_tokens;
        ELSE
            -- Delete the account with fewer tokens
            DELETE FROM public.users WHERE id = account_2_id;
            RAISE NOTICE 'Merged accounts: Kept account % with % tokens, deleted account % with % tokens', 
                account_1_id, account_1_tokens, account_2_id, account_2_tokens;
        END IF;
    END IF;
END $$;

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
