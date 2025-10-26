-- ============================================================================
-- PAY WINNER TOKENS
-- ============================================================================
-- This script creates a function to add tokens to a winner
-- ============================================================================

-- Create function to add tokens to a user by their user_id
CREATE OR REPLACE FUNCTION public.add_tokens_to_user(
    user_id_param UUID,
    token_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    old_tokens NUMERIC;
    new_tokens NUMERIC;
    result JSONB;
BEGIN
    -- Get current user data
    SELECT tokens INTO old_tokens
    FROM public.users
    WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;
    
    -- Calculate new token balance
    new_tokens := COALESCE(old_tokens, 0) + token_amount;
    
    -- Update user's tokens
    UPDATE public.users
    SET 
        tokens = new_tokens,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'message', 'Tokens added successfully',
        'user_id', user_id_param,
        'token_amount', token_amount,
        'tokens_before', old_tokens,
        'tokens_after', new_tokens
    );
    
    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.add_tokens_to_user(UUID, NUMERIC) TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION public.add_tokens_to_user(UUID, NUMERIC) IS 'Adds tokens to a user by their user_id';

