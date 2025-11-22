-- ============================================
-- ADD TEST TOKENS FOR TESTING
-- ============================================
-- Add 300 tokens to ryanrfermoselle@yahoo.com and rfermoselle@avidbio.com
-- This prevents deficit when testing shipping label generation
-- ============================================

DO $$
DECLARE
    v_user_id UUID;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_email TEXT;
BEGIN
    -- Loop through both email addresses
    FOR v_email IN 
        SELECT unnest(ARRAY['ryanrfermoselle@yahoo.com', 'rfermoselle@avidbio.com'])
    LOOP
        RAISE NOTICE '====================================';
        RAISE NOTICE '🔍 Processing: %', v_email;
        
        -- Get user ID
        SELECT id INTO v_user_id
        FROM public.users
        WHERE email = v_email;
        
        IF v_user_id IS NULL THEN
            RAISE NOTICE '❌ User with email % not found - skipping', v_email;
            CONTINUE;
        END IF;
        
        RAISE NOTICE '✅ Found user: %', v_user_id;
        
        -- Get current balance (column is drop_tokens, not balance)
        SELECT drop_tokens INTO v_current_balance
        FROM public.user_balances
        WHERE user_id = v_user_id;
        
        IF v_current_balance IS NULL THEN
            -- Create balance record if doesn't exist
            -- Only insert essential columns that exist in all schemas
            INSERT INTO public.user_balances (
                user_id, 
                drop_tokens
            ) VALUES (
                v_user_id, 
                300.00
            );
            
            v_new_balance := 300.00;
            
            RAISE NOTICE '✅ Created balance record with 300 tokens';
        ELSE
            -- Update existing balance
            UPDATE public.user_balances
            SET 
                drop_tokens = drop_tokens + 300.00,
                updated_at = NOW()
            WHERE user_id = v_user_id;
            
            v_new_balance := v_current_balance + 300.00;
            
            RAISE NOTICE '✅ Updated balance: % → %', v_current_balance, v_new_balance;
        END IF;
        
        -- Try to log the transaction (if table exists)
        BEGIN
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
                    'email', v_email,
                    'date', NOW()
                ),
                NOW()
            );
            
            RAISE NOTICE '✅ Transaction logged';
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE '⚠️ wallet_transactions table does not exist - skipping transaction log';
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Could not log transaction: % - continuing anyway', SQLERRM;
        END;
        RAISE NOTICE '🎉 SUCCESS! Added 300 tokens to %', v_email;
        RAISE NOTICE '💰 New balance: % tokens', v_new_balance;
    END LOOP;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ ALL DONE!';
END $$;

-- Verify the balances (only query columns that definitely exist)
SELECT 
    u.email,
    u.username,
    ub.drop_tokens as token_balance,
    ub.updated_at
FROM public.users u
JOIN public.user_balances ub ON ub.user_id = u.id
WHERE u.email IN ('ryanrfermoselle@yahoo.com', 'rfermoselle@avidbio.com')
ORDER BY u.email;

