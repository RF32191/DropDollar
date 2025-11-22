-- ============================================
-- ADD TEST TOKENS FOR TESTING
-- ============================================
-- Add 300 tokens to ryanrfermoselle@yahoo.com for testing
-- This prevents deficit when testing shipping label generation
-- ============================================

DO $$
DECLARE
    v_user_id UUID;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id
    FROM public.users
    WHERE email = 'ryanrfermoselle@yahoo.com';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email ryanrfermoselle@yahoo.com not found';
    END IF;
    
    RAISE NOTICE '✅ Found user: %', v_user_id;
    
    -- Get current balance
    SELECT balance INTO v_current_balance
    FROM public.user_balances
    WHERE user_id = v_user_id;
    
    IF v_current_balance IS NULL THEN
        -- Create balance record if doesn't exist
        INSERT INTO public.user_balances (user_id, balance, updated_at)
        VALUES (v_user_id, 300.00, NOW());
        
        v_new_balance := 300.00;
        
        RAISE NOTICE '✅ Created balance record with 300 tokens';
    ELSE
        -- Update existing balance
        UPDATE public.user_balances
        SET 
            balance = balance + 300.00,
            updated_at = NOW()
        WHERE user_id = v_user_id;
        
        v_new_balance := v_current_balance + 300.00;
        
        RAISE NOTICE '✅ Updated balance: % → %', v_current_balance, v_new_balance;
    END IF;
    
    -- Log the transaction
    INSERT INTO public.wallet_transactions (
        user_id,
        amount,
        transaction_type,
        before_balance,
        after_balance,
        reason,
        metadata,
        created_at
    ) VALUES (
        v_user_id,
        300.00,
        'admin_credit',
        COALESCE(v_current_balance, 0),
        v_new_balance,
        'Test tokens for shipping label testing',
        jsonb_build_object(
            'admin_action', true,
            'purpose', 'testing',
            'date', NOW()
        ),
        NOW()
    );
    
    RAISE NOTICE '✅ Transaction logged';
    RAISE NOTICE '🎉 SUCCESS! Added 300 tokens to ryanrfermoselle@yahoo.com';
    RAISE NOTICE '💰 New balance: % tokens', v_new_balance;
END $$;

-- Verify the balance
SELECT 
    u.email,
    u.username,
    ub.balance,
    ub.updated_at
FROM public.users u
JOIN public.user_balances ub ON ub.user_id = u.id
WHERE u.email = 'ryanrfermoselle@yahoo.com';

