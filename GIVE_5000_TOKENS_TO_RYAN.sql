-- GIVE_5000_TOKENS_TO_RYAN.sql
-- Add 5000 tokens to ryanrfermoselle@yahoo.com for testing

DO $$
DECLARE
    v_user_id UUID;
    v_username TEXT;
    v_current_purchased INTEGER := 0;
    v_current_won INTEGER := 0;
BEGIN
    -- Find the user
    SELECT id, username INTO v_user_id, v_username
    FROM public.users
    WHERE email = 'ryanrfermoselle@yahoo.com';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email ryanrfermoselle@yahoo.com not found';
    END IF;
    
    RAISE NOTICE 'Found user: % (ID: %)', v_username, v_user_id;
    
    -- Get current balances
    SELECT 
        COALESCE(purchased_tokens, 0),
        COALESCE(won_tokens, 0)
    INTO v_current_purchased, v_current_won
    FROM public.users
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Current balances: Purchased: %, Won: %, Total: %', 
        v_current_purchased, v_current_won, (v_current_purchased + v_current_won);
    
    -- Add 5000 to purchased_tokens
    UPDATE public.users
    SET purchased_tokens = purchased_tokens + 5000,
        updated_at = NOW()
    WHERE id = v_user_id;
    
    RAISE NOTICE '✅ Added 5000 tokens to purchased_tokens!';
    RAISE NOTICE 'New balance: Purchased: %, Won: %, Total: %', 
        (v_current_purchased + 5000), v_current_won, (v_current_purchased + v_current_won + 5000);
END $$;

-- Verify the update
SELECT 
    username,
    email,
    COALESCE(purchased_tokens, 0) as purchased_tokens,
    COALESCE(won_tokens, 0) as won_tokens,
    COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total_tokens
FROM public.users
WHERE email = 'ryanrfermoselle@yahoo.com';

SELECT '✅ Successfully added 5000 tokens to ryanrfermoselle@yahoo.com' as result;

