-- ============================================
-- SIMPLE FIX - JUST ADD QUERY FUNCTIONS
-- ============================================
-- This adds functions to VIEW transaction history
-- Does NOT modify any game join functions
-- ============================================

-- Function to get ALL user transactions (purchases, entries, victories)
CREATE OR REPLACE FUNCTION get_user_all_transactions(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    type TEXT,
    amount DECIMAL(10,2),
    description TEXT,
    status TEXT,
    competition_type TEXT,
    competition_id TEXT,
    game_type TEXT,
    tokens_purchased INTEGER,
    tokens_won INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ut.id,
        ut.type,
        ut.amount,
        ut.description,
        ut.status,
        ut.competition_type,
        ut.competition_id,
        ut.game_type,
        ut.tokens_purchased,
        ut.tokens_won,
        ut.metadata,
        ut.created_at
    FROM public.user_transactions ut
    WHERE ut.user_id = user_id_param
    ORDER BY ut.created_at DESC
    LIMIT 200;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_all_transactions(UUID) TO authenticated;

-- Test it
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Query function created!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend can now call:';
    RAISE NOTICE '  get_user_all_transactions(user_id)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NOTE: This only adds the QUERY function.';
    RAISE NOTICE '   Games must SAVE to user_transactions for data to appear.';
    RAISE NOTICE '   Check if your join functions call save_entry_fee_to_user_transactions()';
    RAISE NOTICE '========================================';
END;
$$;

