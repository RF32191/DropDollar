-- ============================================================================
-- ADD TOKENS FROM PURCHASE - Complete Transaction History
-- ============================================================================
-- This function adds tokens to a user's wallet after a Stripe purchase
-- and maintains full transaction history in multiple backup tables
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS add_tokens_from_purchase(TEXT, NUMERIC, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION add_tokens_from_purchase(
    user_id_param TEXT,
    token_amount_param NUMERIC,
    payment_amount_param NUMERIC,
    stripe_payment_intent_id_param TEXT,
    payment_method_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_balance_before NUMERIC;
    v_balance_after NUMERIC;
    v_username TEXT;
    v_email TEXT;
BEGIN
    RAISE NOTICE '💰 [Add Tokens] Starting token purchase for user: %', user_id_param;
    RAISE NOTICE '💰 Tokens: %, Payment: $%', token_amount_param, payment_amount_param;
    
    -- Get user's current balance and info
    SELECT 
        COALESCE(tokens, 0),
        COALESCE(username, 'Unknown'),
        COALESCE(email, 'Unknown')
    INTO 
        v_balance_before,
        v_username,
        v_email
    FROM public.users
    WHERE id::text = user_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ [Add Tokens] User not found: %', user_id_param;
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Calculate new balance
    v_balance_after := v_balance_before + token_amount_param;
    
    RAISE NOTICE '💵 [Add Tokens] User: % (%), Balance: % → %', 
        v_username, v_email, v_balance_before, v_balance_after;
    
    -- Update user's token balance
    UPDATE public.users
    SET 
        tokens = v_balance_after,
        updated_at = NOW()
    WHERE id::text = user_id_param;
    
    RAISE NOTICE '✅ [Add Tokens] Updated user balance';
    
    -- Record in token_transactions (PRIMARY BACKUP)
    BEGIN
        INSERT INTO public.token_transactions (
            user_id,
            amount,
            type,
            balance_before,
            balance_after,
            transaction_type,
            description,
            stripe_payment_intent_id,
            created_at
        ) VALUES (
            user_id_param::uuid,
            token_amount_param,
            'purchase',
            v_balance_before,
            v_balance_after,
            'token_purchase',
            'Purchased ' || token_amount_param || ' tokens for $' || payment_amount_param,
            stripe_payment_intent_id_param,
            NOW()
        );
        RAISE NOTICE '✅ [Add Tokens] Saved to token_transactions';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ [Add Tokens] Could not save to token_transactions: %', SQLERRM;
    END;
    
    -- Record in purchase_history (SECONDARY BACKUP)
    BEGIN
        INSERT INTO public.purchase_history (
            user_id,
            transaction_type,
            amount,
            tokens_received,
            description,
            stripe_payment_intent_id,
            created_at
        ) VALUES (
            user_id_param,
            'purchase',
            payment_amount_param,
            token_amount_param,
            'Purchased ' || token_amount_param || ' tokens',
            stripe_payment_intent_id_param,
            NOW()
        );
        RAISE NOTICE '✅ [Add Tokens] Saved to purchase_history';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ [Add Tokens] Could not save to purchase_history: %', SQLERRM;
    END;
    
    -- Record in user_activity_log (ACTIVITY TRACKING)
    BEGIN
        INSERT INTO public.user_activity_log (
            user_id,
            activity_type,
            details,
            created_at
        ) VALUES (
            user_id_param,
            'token_purchase',
            jsonb_build_object(
                'tokens', token_amount_param,
                'amount_paid', payment_amount_param,
                'payment_intent_id', stripe_payment_intent_id_param,
                'balance_before', v_balance_before,
                'balance_after', v_balance_after
            ),
            NOW()
        );
        RAISE NOTICE '✅ [Add Tokens] Saved to user_activity_log';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ [Add Tokens] Could not save to user_activity_log: %', SQLERRM;
    END;
    
    RAISE NOTICE '🎉 [Add Tokens] Complete! User % now has % tokens', v_username, v_balance_after;
    
    RETURN json_build_object(
        'success', true,
        'user_id', user_id_param,
        'username', v_username,
        'email', v_email,
        'tokens_added', token_amount_param,
        'payment_amount', payment_amount_param,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'stripe_payment_intent_id', stripe_payment_intent_id_param
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [Add Tokens] ERROR: %', SQLERRM;
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION add_tokens_from_purchase(TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- Ensure required columns exist in tables
-- ============================================================================

-- Add tokens_received to purchase_history if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_history' AND column_name = 'tokens_received'
    ) THEN
        ALTER TABLE public.purchase_history ADD COLUMN tokens_received NUMERIC;
        RAISE NOTICE '✅ Added tokens_received column to purchase_history';
    ELSE
        RAISE NOTICE 'ℹ️  tokens_received already exists in purchase_history';
    END IF;
END $$;

-- Add stripe_payment_intent_id to purchase_history if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_history' AND column_name = 'stripe_payment_intent_id'
    ) THEN
        ALTER TABLE public.purchase_history ADD COLUMN stripe_payment_intent_id TEXT;
        RAISE NOTICE '✅ Added stripe_payment_intent_id column to purchase_history';
    ELSE
        RAISE NOTICE 'ℹ️  stripe_payment_intent_id already exists in purchase_history';
    END IF;
END $$;

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ TOKEN PURCHASE SYSTEM CREATED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ Function: add_tokens_from_purchase(user_id, tokens, amount, payment_intent_id)';
    RAISE NOTICE '✅ ';
    RAISE NOTICE '✅ This function:';
    RAISE NOTICE '✅   - Adds tokens to user wallet';
    RAISE NOTICE '✅   - Records in token_transactions (with balance before/after)';
    RAISE NOTICE '✅   - Records in purchase_history (with payment details)';
    RAISE NOTICE '✅   - Records in user_activity_log (for tracking)';
    RAISE NOTICE '✅   - Works for ALL current and future users';
    RAISE NOTICE '✅ ';
    RAISE NOTICE '✅ Usage from Stripe webhook:';
    RAISE NOTICE '✅   supabase.rpc("add_tokens_from_purchase", {';
    RAISE NOTICE '✅     user_id_param: "user-uuid-here",';
    RAISE NOTICE '✅     token_amount_param: 100,';
    RAISE NOTICE '✅     payment_amount_param: 10.00,';
    RAISE NOTICE '✅     stripe_payment_intent_id_param: "pi_xxxxx"';
    RAISE NOTICE '✅   })';
    RAISE NOTICE '✅ ============================================================';
END $$;

