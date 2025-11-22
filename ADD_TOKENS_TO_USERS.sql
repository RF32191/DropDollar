-- ============================================
-- ADD TOKENS TO SPECIFIC USERS
-- ============================================
-- Add 400 tokens to immersionproduction and johnson johnson accounts
-- ============================================

DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_current_tokens NUMERIC;
    v_new_tokens NUMERIC;
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '💰 ADDING TOKENS TO USERS';
    RAISE NOTICE '====================================';
    
    -- ================================================
    -- USER 1: immersionproduction account
    -- ================================================
    
    -- Find immersionproduction user
    SELECT id, email INTO v_user_id, v_email
    FROM auth.users
    WHERE email ILIKE '%immersionproduction%'
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE '👤 Found user: %', v_email;
        
        -- Get current tokens
        SELECT COALESCE(drop_tokens, 0) INTO v_current_tokens
        FROM user_balances
        WHERE user_id = v_user_id;
        
        IF v_current_tokens IS NULL THEN
            -- Create balance if doesn't exist
            INSERT INTO user_balances (user_id, drop_tokens)
            VALUES (v_user_id, 400);
            
            v_new_tokens := 400;
            RAISE NOTICE '✅ Created balance with 400 tokens';
        ELSE
            -- Update existing balance
            UPDATE user_balances
            SET drop_tokens = drop_tokens + 400
            WHERE user_id = v_user_id;
            
            v_new_tokens := v_current_tokens + 400;
            RAISE NOTICE '✅ Added 400 tokens: % → %', v_current_tokens, v_new_tokens;
        END IF;
        
        -- Check if users table has purchased_tokens column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'purchased_tokens'
        ) THEN
            -- Update purchased_tokens in users table
            UPDATE users
            SET purchased_tokens = COALESCE(purchased_tokens, 0) + 400
            WHERE id = v_user_id;
            RAISE NOTICE '✅ Updated purchased_tokens column';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ immersionproduction user not found';
        RAISE NOTICE '💡 User must register first';
    END IF;
    
    RAISE NOTICE '------------------------------------';
    
    -- ================================================
    -- USER 2: johnson johnson (ryanjfermoselle@icloud.com)
    -- ================================================
    
    -- Find johnson johnson user
    SELECT id, email INTO v_user_id, v_email
    FROM auth.users
    WHERE email = 'ryanjfermoselle@icloud.com'
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE '👤 Found user: %', v_email;
        
        -- Get current tokens
        SELECT COALESCE(drop_tokens, 0) INTO v_current_tokens
        FROM user_balances
        WHERE user_id = v_user_id;
        
        IF v_current_tokens IS NULL THEN
            -- Create balance if doesn't exist
            INSERT INTO user_balances (user_id, drop_tokens)
            VALUES (v_user_id, 400);
            
            v_new_tokens := 400;
            RAISE NOTICE '✅ Created balance with 400 tokens';
        ELSE
            -- Update existing balance
            UPDATE user_balances
            SET drop_tokens = drop_tokens + 400
            WHERE user_id = v_user_id;
            
            v_new_tokens := v_current_tokens + 400;
            RAISE NOTICE '✅ Added 400 tokens: % → %', v_current_tokens, v_new_tokens;
        END IF;
        
        -- Check if users table has purchased_tokens column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'purchased_tokens'
        ) THEN
            -- Update purchased_tokens in users table
            UPDATE users
            SET purchased_tokens = COALESCE(purchased_tokens, 0) + 400
            WHERE id = v_user_id;
            RAISE NOTICE '✅ Updated purchased_tokens column';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ ryanjfermoselle@icloud.com user not found';
        RAISE NOTICE '💡 User must register first';
    END IF;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE '🎉 TOKEN DISTRIBUTION COMPLETE!';
    RAISE NOTICE '====================================';
END $$;

-- Verify the tokens were added
SELECT 
    u.email,
    u.username,
    ub.drop_tokens as token_balance,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'purchased_tokens'
        ) THEN u.purchased_tokens
        ELSE NULL
    END as purchased_tokens_field
FROM auth.users au
JOIN users u ON u.id = au.id
LEFT JOIN user_balances ub ON ub.user_id = au.id
WHERE au.email IN (
    (SELECT email FROM auth.users WHERE email ILIKE '%immersionproduction%' LIMIT 1),
    'ryanjfermoselle@icloud.com'
);

