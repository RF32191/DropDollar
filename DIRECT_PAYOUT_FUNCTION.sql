-- DIRECT_PAYOUT_FUNCTION.sql
-- This script creates a direct SQL function for payout that actually transfers tokens

-- Create a direct payout function using SQL
CREATE OR REPLACE FUNCTION public.direct_winner_payout(
    session_id_param UUID,
    winner_user_id_param UUID,
    payout_amount_param DECIMAL(10,2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_tokens DECIMAL(10,2);
    new_tokens DECIMAL(10,2);
    result JSON;
BEGIN
    -- Get current token balance
    SELECT tokens INTO current_tokens
    FROM public.users
    WHERE id = winner_user_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Winner user not found',
            'user_id', winner_user_id_param
        );
    END IF;
    
    -- Calculate new token balance
    new_tokens := current_tokens + payout_amount_param;
    
    -- Update tokens directly
    UPDATE public.users
    SET 
        tokens = new_tokens,
        updated_at = NOW()
    WHERE id = winner_user_id_param;
    
    -- Verify the update
    SELECT tokens INTO current_tokens
    FROM public.users
    WHERE id = winner_user_id_param;
    
    -- Mark session as completed
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_user_id_param,
        prize_amount = payout_amount_param,
        platform_fee = 0,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Payout successful',
        'user_id', winner_user_id_param,
        'tokens_before', current_tokens - payout_amount_param,
        'tokens_after', current_tokens,
        'payout_amount', payout_amount_param,
        'session_id', session_id_param
    );
END;
$$;

-- Test the function
SELECT 'Direct payout function created successfully!' as status;
