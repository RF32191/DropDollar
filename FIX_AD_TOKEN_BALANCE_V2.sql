-- FIX_AD_TOKEN_BALANCE_V2.sql
-- Simpler version that checks columns first, then reads the correct one

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
    v_current_tokens INTEGER := 0;
    v_campaign_id UUID;
    v_has_tokens_col BOOLEAN;
    v_has_purchased_col BOOLEAN;
    v_has_game_tokens_col BOOLEAN;
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
    
    -- Check which columns exist in user_balances
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_balances' 
        AND column_name = 'tokens'
    ) INTO v_has_tokens_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_balances' 
        AND column_name = 'purchased_tokens'
    ) INTO v_has_purchased_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_balances' 
        AND column_name = 'game_tokens'
    ) INTO v_has_game_tokens_col;
    
    -- Get token balance based on available columns
    IF v_has_tokens_col THEN
        SELECT COALESCE(tokens, 0) INTO v_current_tokens 
        FROM public.user_balances 
        WHERE user_id = v_seller_id;
        
        RAISE NOTICE 'Using tokens column: %', v_current_tokens;
    ELSIF v_has_purchased_col THEN
        SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) 
        INTO v_current_tokens 
        FROM public.user_balances 
        WHERE user_id = v_seller_id;
        
        RAISE NOTICE 'Using purchased_tokens + won_tokens: %', v_current_tokens;
    ELSIF v_has_game_tokens_col THEN
        SELECT COALESCE(game_tokens, 0) INTO v_current_tokens 
        FROM public.user_balances 
        WHERE user_id = v_seller_id;
        
        RAISE NOTICE 'Using game_tokens: %', v_current_tokens;
    ELSE
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'No token columns found in user_balances table. Please contact support.'
        );
    END IF;
    
    -- Check if user has enough tokens
    IF v_current_tokens < p_token_budget THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Insufficient tokens. You have ' || v_current_tokens || ' tokens, but need ' || p_token_budget || '. Visit /buy-tokens to purchase more.'
        );
    END IF;
    
    -- Deduct tokens from user balance
    IF v_has_tokens_col THEN
        UPDATE public.user_balances
        SET tokens = tokens - p_token_budget,
            updated_at = NOW()
        WHERE user_id = v_seller_id;
    ELSIF v_has_purchased_col THEN
        -- Deduct from purchased first, then won
        UPDATE public.user_balances
        SET purchased_tokens = GREATEST(0, purchased_tokens - p_token_budget),
            won_tokens = CASE 
                WHEN purchased_tokens >= p_token_budget THEN won_tokens
                ELSE GREATEST(0, won_tokens - (p_token_budget - purchased_tokens))
            END,
            updated_at = NOW()
        WHERE user_id = v_seller_id;
    ELSIF v_has_game_tokens_col THEN
        UPDATE public.user_balances
        SET game_tokens = game_tokens - p_token_budget,
            updated_at = NOW()
        WHERE user_id = v_seller_id;
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

-- Test query to show what columns exist
SELECT 
    column_name, 
    data_type,
    CASE 
        WHEN column_name IN ('tokens', 'purchased_tokens', 'won_tokens', 'game_tokens') THEN '✅ Token column'
        ELSE ''
    END as note
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_balances'
ORDER BY ordinal_position;

SELECT '✅ Fixed create_ad_campaign with proper column detection' as result;

