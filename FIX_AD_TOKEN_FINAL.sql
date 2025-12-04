-- FIX_AD_TOKEN_FINAL.sql
-- Final fix: Use cash_balance which is the standard column in your system

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
    v_current_balance NUMERIC := 0;
    v_campaign_id UUID;
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
    
    -- Get cash balance (standard column in your system)
    SELECT COALESCE(cash_balance, 0) INTO v_current_balance
    FROM public.user_balances 
    WHERE user_id = v_seller_id;
    
    IF v_current_balance IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'No balance record found. User ID: ' || v_seller_id
        );
    END IF;
    
    RAISE NOTICE 'User balance: $%', v_current_balance;
    
    -- Check if user has enough (convert dollars to tokens, $1 = 1 token)
    IF v_current_balance < p_token_budget THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Insufficient funds. You have $' || v_current_balance::TEXT || ' but need $' || p_token_budget || '. Visit /cashout to add funds.'
        );
    END IF;
    
    -- Deduct from cash_balance
    UPDATE public.user_balances
    SET cash_balance = cash_balance - p_token_budget,
        updated_at = NOW()
    WHERE user_id = v_seller_id
    AND cash_balance >= p_token_budget; -- Safety check
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Failed to deduct balance. Please try again.'
        );
    END IF;
    
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
        v_current_balance::INTEGER, (v_current_balance - p_token_budget)::INTEGER
    );
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'campaign_id', v_campaign_id,
        'message', 'Campaign created! Pending admin approval.',
        'tokens_remaining', (v_current_balance - p_token_budget)::INTEGER
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_ad_campaign TO authenticated;

-- Show user_balances structure
SELECT 
    'user_balances columns:' as info,
    string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_balances';

SELECT '✅ Fixed create_ad_campaign to use cash_balance (your standard column)' as result;

