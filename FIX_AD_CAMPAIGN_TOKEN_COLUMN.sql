-- FIX_AD_CAMPAIGN_TOKEN_COLUMN.sql
-- Fix the create_ad_campaign function to use correct token column names

-- First, let's check what columns exist in user_balances
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '=== Checking user_balances table columns ===';
    FOR r IN (
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_balances'
        ORDER BY ordinal_position
    ) LOOP
        RAISE NOTICE '  Column: % (type: %)', r.column_name, r.data_type;
    END LOOP;
END $$;

-- Drop and recreate the create_ad_campaign function with correct token handling
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
    v_current_tokens INTEGER;
    v_campaign_id UUID;
    v_purchased_tokens INTEGER;
    v_won_tokens INTEGER;
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
    
    -- Try to get token balance from user_balances
    -- Support multiple possible column names: tokens, purchased_tokens + won_tokens, or game_tokens
    BEGIN
        -- Try standard 'tokens' column first
        SELECT COALESCE(tokens, 0) INTO v_current_tokens 
        FROM public.user_balances 
        WHERE user_id = v_seller_id;
        
        RAISE NOTICE 'Using tokens column: %', v_current_tokens;
    EXCEPTION WHEN undefined_column THEN
        BEGIN
            -- Try purchased_tokens + won_tokens
            SELECT 
                COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) 
            INTO v_current_tokens 
            FROM public.user_balances 
            WHERE user_id = v_seller_id;
            
            RAISE NOTICE 'Using purchased_tokens + won_tokens: %', v_current_tokens;
        EXCEPTION WHEN undefined_column THEN
            BEGIN
                -- Try game_tokens
                SELECT COALESCE(game_tokens, 0) INTO v_current_tokens 
                FROM public.user_balances 
                WHERE user_id = v_seller_id;
                
                RAISE NOTICE 'Using game_tokens column: %', v_current_tokens;
            EXCEPTION WHEN OTHERS THEN
                RETURN jsonb_build_object(
                    'success', FALSE, 
                    'error', 'Could not determine token balance. Please contact support.'
                );
            END;
        END;
    END;
    
    -- Check if user has enough tokens
    IF v_current_tokens IS NULL OR v_current_tokens < p_token_budget THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Insufficient tokens. You have ' || COALESCE(v_current_tokens, 0) || ' tokens, but need ' || p_token_budget
        );
    END IF;
    
    -- Deduct tokens from user balance
    -- Try each column type
    BEGIN
        UPDATE public.user_balances
        SET tokens = tokens - p_token_budget,
            updated_at = NOW()
        WHERE user_id = v_seller_id;
    EXCEPTION WHEN undefined_column THEN
        BEGIN
            -- Try deducting from purchased_tokens first, then won_tokens
            SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0) 
            INTO v_purchased_tokens, v_won_tokens
            FROM public.user_balances 
            WHERE user_id = v_seller_id;
            
            IF v_purchased_tokens >= p_token_budget THEN
                -- Deduct from purchased tokens
                UPDATE public.user_balances
                SET purchased_tokens = purchased_tokens - p_token_budget,
                    updated_at = NOW()
                WHERE user_id = v_seller_id;
            ELSIF (v_purchased_tokens + v_won_tokens) >= p_token_budget THEN
                -- Deduct from both
                UPDATE public.user_balances
                SET purchased_tokens = 0,
                    won_tokens = won_tokens - (p_token_budget - v_purchased_tokens),
                    updated_at = NOW()
                WHERE user_id = v_seller_id;
            ELSE
                RETURN jsonb_build_object(
                    'success', FALSE, 
                    'error', 'Insufficient tokens'
                );
            END IF;
        EXCEPTION WHEN undefined_column THEN
            -- Try game_tokens
            UPDATE public.user_balances
            SET game_tokens = game_tokens - p_token_budget,
                updated_at = NOW()
            WHERE user_id = v_seller_id;
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

-- Test the function exists
SELECT '✅ Fixed create_ad_campaign function to handle multiple token column names' as result;

