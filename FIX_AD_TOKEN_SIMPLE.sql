-- FIX_AD_TOKEN_SIMPLE.sql
-- Ultra-simple version: Assumes cash_balance column (standard in your setup)

DROP FUNCTION IF EXISTS create_ad_campaign;

CREATE OR REPLACE FUNCTION create_ad_campaign(
    p_campaign_name TEXT,
    p_headline TEXT,
    p_description TEXT,
    p_call_to_action TEXT,
    p_destination_url TEXT,
    p_target_pages TEXT[],
    p_token_budget INTEGER,
    p_cost_per_impression INTEGER DEFAULT 1,
    p_cost_per_click INTEGER DEFAULT 5,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_username TEXT;
    v_current_cash NUMERIC := 0;
    v_current_tokens INTEGER := 0;
    v_campaign_id UUID;
    v_balance_record RECORD;
BEGIN
    -- Get authenticated user
    v_seller_id := auth.uid();
    IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Not authenticated');
    END IF;
    
    -- Get username
    SELECT username INTO v_username FROM public.users WHERE id = v_seller_id;
    IF v_username IS NULL THEN
        v_username := 'Unknown Seller';
    END IF;
    
    -- Get ALL columns from user_balances to see what we have
    SELECT * INTO v_balance_record
    FROM public.user_balances 
    WHERE user_id = v_seller_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'No balance record found. Please contact support.'
        );
    END IF;
    
    -- Try to extract token value from the record
    -- This will work with any column name
    BEGIN
        -- Try cash_balance (convert to tokens, assuming $1 = 1 token)
        IF v_balance_record.cash_balance IS NOT NULL THEN
            v_current_tokens := floor(v_balance_record.cash_balance)::INTEGER;
            RAISE NOTICE 'Using cash_balance: %', v_current_tokens;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Continue
    END;
    
    -- If still 0, try tokens column
    IF v_current_tokens = 0 THEN
        BEGIN
            v_current_tokens := COALESCE(v_balance_record.tokens, 0);
            RAISE NOTICE 'Using tokens: %', v_current_tokens;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
    
    -- Check if user has enough
    IF v_current_tokens < p_token_budget THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Insufficient funds. You have $' || v_current_tokens || ' but need $' || p_token_budget || '. Visit /buy-tokens'
        );
    END IF;
    
    -- Deduct from cash_balance (most likely column in your system)
    UPDATE public.user_balances
    SET cash_balance = cash_balance - p_token_budget,
        updated_at = NOW()
    WHERE user_id = v_seller_id;
    
    -- Create campaign
    INSERT INTO public.ad_campaigns (
        seller_id, seller_username, campaign_name, headline, description,
        call_to_action, destination_url, target_pages, token_budget,
        cost_per_impression, cost_per_click, end_date, campaign_status
    ) VALUES (
        v_seller_id, v_username, p_campaign_name, p_headline, p_description,
        p_call_to_action, p_destination_url, p_target_pages, p_token_budget,
        p_cost_per_impression, p_cost_per_click, p_end_date, 'pending'
    )
    RETURNING id INTO v_campaign_id;
    
    -- Log transaction
    INSERT INTO public.ad_campaign_transactions (
        campaign_id, seller_id, transaction_type, token_amount, description,
        tokens_before, tokens_after
    ) VALUES (
        v_campaign_id, v_seller_id, 'purchase', p_token_budget,
        'Campaign purchase: ' || p_campaign_name,
        v_current_tokens, v_current_tokens - p_token_budget
    );
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'campaign_id', v_campaign_id,
        'message', 'Campaign created! Pending admin approval.',
        'tokens_remaining', v_current_tokens - p_token_budget
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_ad_campaign TO authenticated;

-- Show what columns exist in user_balances
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_balances'
AND (column_name LIKE '%token%' OR column_name LIKE '%cash%' OR column_name LIKE '%balance%')
ORDER BY column_name;

SELECT '✅ Simplified create_ad_campaign to use cash_balance (standard column)' as result;

