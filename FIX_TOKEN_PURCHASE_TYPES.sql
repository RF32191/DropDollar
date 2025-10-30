-- Fix type mismatches in token purchase function

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
    
    -- Get user's current balance
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
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    v_balance_after := v_balance_before + token_amount_param;
    
    -- Update user's token balance
    UPDATE public.users
    SET tokens = v_balance_after, updated_at = NOW()
    WHERE id::text = user_id_param;
    
    -- Record in token_transactions (with UUID casting)
    BEGIN
        INSERT INTO public.token_transactions (
            user_id, amount, type, balance_before, balance_after,
            transaction_type, description, stripe_payment_intent_id, created_at
        ) VALUES (
            user_id_param::uuid, token_amount_param, 'purchase',
            v_balance_before, v_balance_after, 'token_purchase',
            'Purchased ' || token_amount_param || ' tokens for $' || payment_amount_param,
            stripe_payment_intent_id_param, NOW()
        );
        RAISE NOTICE '✅ Saved to token_transactions';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not save to token_transactions: %', SQLERRM;
    END;
    
    -- Record in purchase_history (with UUID casting)
    BEGIN
        INSERT INTO public.purchase_history (
            user_id, transaction_type, amount, tokens_received,
            description, stripe_payment_intent_id, created_at
        ) VALUES (
            user_id_param::uuid, 'purchase', payment_amount_param, token_amount_param,
            'Purchased ' || token_amount_param || ' tokens',
            stripe_payment_intent_id_param, NOW()
        );
        RAISE NOTICE '✅ Saved to purchase_history';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not save to purchase_history: %', SQLERRM;
    END;
    
    RAISE NOTICE '🎉 Complete! User % now has % tokens', v_username, v_balance_after;
    
    RETURN json_build_object(
        'success', true, 'user_id', user_id_param, 'username', v_username,
        'tokens_added', token_amount_param, 'balance_after', v_balance_after
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_tokens_from_purchase(TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated, anon, service_role;

-- Alter purchase_history.user_id to UUID if it's TEXT
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'purchase_history' AND column_name = 'user_id') = 'text' THEN
        -- Drop policies first
        DROP POLICY IF EXISTS "Users can view their own purchases" ON purchase_history;
        
        -- Convert column
        ALTER TABLE purchase_history ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
        
        -- Recreate policy
        CREATE POLICY "Users can view their own purchases" ON purchase_history
            FOR SELECT USING (auth.uid() = user_id);
            
        RAISE NOTICE '✅ Converted purchase_history.user_id to UUID';
    END IF;
END $$;

RAISE NOTICE '✅ Token purchase function fixed!';

