-- ============================================================================
-- PAYOUT SYSTEM FOR WINNER TAKES ALL
-- ============================================================================
-- Feature 2: Payout System
-- - Pays winner when button is clicked
-- - Uses add_tokens_to_user function
-- - Calculates pot minus 15% platform fee
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_tokens_to_user(
    user_id_param UUID,
    token_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_tokens NUMERIC;
    new_tokens NUMERIC;
BEGIN
    SELECT tokens INTO old_tokens FROM public.users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    new_tokens := COALESCE(old_tokens, 0) + token_amount;
    
    UPDATE public.users SET tokens = new_tokens, updated_at = NOW() WHERE id = user_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Tokens added successfully',
        'tokens_before', old_tokens,
        'tokens_after', new_tokens
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_tokens_to_user(UUID, NUMERIC) TO authenticated, anon;

SELECT 'Payout System: add_tokens_to_user function created!' as status;

