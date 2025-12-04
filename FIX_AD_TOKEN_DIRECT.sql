-- FIX_AD_TOKEN_DIRECT.sql
-- Simplest approach: Just try to read tokens directly, handle errors gracefully

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
    v_purchased INTEGER := 0;
    v_won INTEGER := 0;
    v_campaign_id UUID;
    v_balance_found BOOLEAN := FALSE;
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
    
    -- Try to get token balance - Method 1: tokens column
    BEGIN
        EXECUTE format('SELECT COALESCE(tokens, 0) FROM public.user_balances WHERE user_id = %L', v_seller_id)
        INTO v_current_tokens;
        v_balance_found := TRUE;
        RAISE NOTICE 'Found tokens column: %', v_current_tokens;
    EXCEPTION 
        WHEN undefined_column THEN
            -- Method 2: purchased_tokens + won_tokens
            BEGIN
                EXECUTE format('SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0) FROM public.user_balances WHERE user_id = %L', v_seller_id)
                INTO v_purchased, v_won;
                v_current_tokens := v_purchased + v_won;
                v_balance_found := TRUE;
                RAISE NOTICE 'Found purchased_tokens + won_tokens: % + % = %', v_purchased, v_won, v_current_tokens;
            EXCEPTION 
                WHEN undefined_column THEN
                    -- Method 3: game_tokens
                    BEGIN
                        EXECUTE format('SELECT COALESCE(game_tokens, 0) FROM public.user_balances WHERE user_id = %L', v_seller_id)
                        INTO v_current_tokens;
                        v_balance_found := TRUE;
                        RAISE NOTICE 'Found game_tokens: %', v_current_tokens;
                    EXCEPTION 
                        WHEN undefined_column THEN
                            v_balance_found := FALSE;
                    END;
            END;
    END;
    
    -- If no balance found, return error
    IF NOT v_balance_found THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Unable to read token balance. Please refresh the page and try again.'
        );
    END IF;
    
    -- Check if user has enough tokens
    IF v_current_tokens < p_token_budget THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Insufficient tokens. You have ' || v_current_tokens || ' tokens but need ' || p_token_budget || '. Buy more at /buy-tokens'
        );
    END IF;
    
    -- Deduct tokens - Try each method
    BEGIN
        EXECUTE format('UPDATE public.user_balances SET tokens = tokens - %s, updated_at = NOW() WHERE user_id = %L', p_token_budget, v_seller_id);
        RAISE NOTICE 'Deducted from tokens column';
    EXCEPTION 
        WHEN undefined_column THEN
            BEGIN
                -- Deduct from purchased first, then won
                EXECUTE format('
                    UPDATE public.user_balances 
                    SET purchased_tokens = GREATEST(0, purchased_tokens - %s),
                        won_tokens = CASE 
                            WHEN purchased_tokens >= %s THEN won_tokens
                            ELSE GREATEST(0, won_tokens - (%s - purchased_tokens))
                        END,
                        updated_at = NOW()
                    WHERE user_id = %L
                ', p_token_budget, p_token_budget, p_token_budget, v_seller_id);
                RAISE NOTICE 'Deducted from purchased_tokens/won_tokens';
            EXCEPTION 
                WHEN undefined_column THEN
                    EXECUTE format('UPDATE public.user_balances SET game_tokens = game_tokens - %s, updated_at = NOW() WHERE user_id = %L', p_token_budget, v_seller_id);
                    RAISE NOTICE 'Deducted from game_tokens';
            END;
    END;
    
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

SELECT '✅ Fixed create_ad_campaign with direct token column access' as result;

