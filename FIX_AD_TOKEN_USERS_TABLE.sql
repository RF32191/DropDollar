-- FIX_AD_TOKEN_USERS_TABLE.sql
-- Use the USERS table (not user_balances) - this is where your wallet data comes from!

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
    v_purchased_tokens INTEGER := 0;
    v_won_tokens INTEGER := 0;
    v_total_tokens INTEGER := 0;
    v_campaign_id UUID;
BEGIN
    -- Get authenticated user
    v_seller_id := auth.uid();
    IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Not authenticated');
    END IF;
    
    -- Get user data from USERS table (where your wallet reads from!)
    SELECT 
        username,
        COALESCE(purchased_tokens, 0),
        COALESCE(won_tokens, 0)
    INTO v_username, v_purchased_tokens, v_won_tokens
    FROM public.users 
    WHERE id = v_seller_id;
    
    IF v_username IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'User not found. Please log in again.'
        );
    END IF;
    
    v_total_tokens := v_purchased_tokens + v_won_tokens;
    
    RAISE NOTICE 'User: % | Purchased: % | Won: % | Total: %', 
        v_username, v_purchased_tokens, v_won_tokens, v_total_tokens;
    
    -- Check if user has enough tokens
    IF v_total_tokens < p_token_budget THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Insufficient tokens. You have ' || v_total_tokens || ' tokens but need ' || p_token_budget || '. Visit /buy-tokens to purchase more.'
        );
    END IF;
    
    -- Deduct tokens (deduct from purchased first, then won)
    IF v_purchased_tokens >= p_token_budget THEN
        -- Deduct entirely from purchased tokens
        UPDATE public.users
        SET purchased_tokens = purchased_tokens - p_token_budget,
            updated_at = NOW()
        WHERE id = v_seller_id;
        
        RAISE NOTICE 'Deducted % tokens from purchased_tokens', p_token_budget;
    ELSE
        -- Deduct all purchased, then remainder from won
        UPDATE public.users
        SET purchased_tokens = 0,
            won_tokens = won_tokens - (p_token_budget - v_purchased_tokens),
            updated_at = NOW()
        WHERE id = v_seller_id;
        
        RAISE NOTICE 'Deducted % from purchased and % from won', v_purchased_tokens, (p_token_budget - v_purchased_tokens);
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
        v_total_tokens, v_total_tokens - p_token_budget
    );
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'campaign_id', v_campaign_id,
        'message', 'Campaign created! Pending admin approval.',
        'tokens_remaining', v_total_tokens - p_token_budget
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_ad_campaign TO authenticated;

-- Verify the users table has the right columns
SELECT 
    'users table columns:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('tokens', 'purchased_tokens', 'won_tokens', 'balance');

SELECT '✅ Fixed create_ad_campaign to use USERS table (where your wallet reads from!)' as result;

