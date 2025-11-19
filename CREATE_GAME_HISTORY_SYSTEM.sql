-- ============================================
-- CREATE GAME HISTORY & TRANSACTION SYSTEM
-- ============================================
-- Store all game results and track token transactions
-- ============================================

-- Step 1: Create game_history table (if not exists)
CREATE TABLE IF NOT EXISTS public.game_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('practice', 'competition', 'marketplace', 'wta', '1v1', 'hot_sell')),
    session_id UUID,
    score NUMERIC NOT NULL,
    accuracy NUMERIC,
    avg_reaction_time NUMERIC,
    tokens_won NUMERIC DEFAULT 0,
    tokens_spent NUMERIC DEFAULT 0,
    result TEXT CHECK (result IN ('won', 'lost', 'participated')),
    listing_title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create token_transactions table
CREATE TABLE IF NOT EXISTS public.token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'win', 'entry_fee', 'refund', 'seller_payout')),
    amount NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    description TEXT,
    related_game_id UUID,
    related_listing_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_history_user ON public.game_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_type ON public.game_history(user_id, session_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON public.token_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON public.token_transactions(user_id, transaction_type, created_at DESC);

-- Step 4: Create RLS policies
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own game history
CREATE POLICY "Users can view own game history" ON public.game_history
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON public.token_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert game history
CREATE POLICY "System can insert game history" ON public.game_history
    FOR INSERT WITH CHECK (true);

-- System can insert transactions
CREATE POLICY "System can insert transactions" ON public.token_transactions
    FOR INSERT WITH CHECK (true);

-- Step 5: Function to record game history
CREATE OR REPLACE FUNCTION public.record_game_history(
    p_user_id UUID,
    p_game_type TEXT,
    p_session_type TEXT,
    p_session_id UUID,
    p_score NUMERIC,
    p_accuracy NUMERIC DEFAULT NULL,
    p_avg_reaction_time NUMERIC DEFAULT NULL,
    p_tokens_won NUMERIC DEFAULT 0,
    p_tokens_spent NUMERIC DEFAULT 0,
    p_result TEXT DEFAULT 'participated',
    p_listing_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_history_id UUID;
BEGIN
    INSERT INTO public.game_history (
        user_id,
        game_type,
        session_type,
        session_id,
        score,
        accuracy,
        avg_reaction_time,
        tokens_won,
        tokens_spent,
        result,
        listing_title
    ) VALUES (
        p_user_id,
        p_game_type,
        p_session_type,
        p_session_id,
        p_score,
        p_accuracy,
        p_avg_reaction_time,
        p_tokens_won,
        p_tokens_spent,
        p_result,
        p_listing_title
    )
    RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$;

-- Step 6: Function to record token transaction
CREATE OR REPLACE FUNCTION public.record_token_transaction(
    p_user_id UUID,
    p_transaction_type TEXT,
    p_amount NUMERIC,
    p_description TEXT DEFAULT NULL,
    p_related_game_id UUID DEFAULT NULL,
    p_related_listing_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
    v_current_balance NUMERIC;
BEGIN
    -- Get current balance
    SELECT (COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0))
    INTO v_current_balance
    FROM public.users
    WHERE id = p_user_id;
    
    INSERT INTO public.token_transactions (
        user_id,
        transaction_type,
        amount,
        balance_after,
        description,
        related_game_id,
        related_listing_id
    ) VALUES (
        p_user_id,
        p_transaction_type,
        p_amount,
        v_current_balance,
        p_description,
        p_related_game_id,
        p_related_listing_id
    )
    RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$;

-- Step 7: Grant permissions
GRANT SELECT ON public.game_history TO authenticated;
GRANT SELECT ON public.token_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_game_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_token_transaction TO authenticated;

-- Step 8: Backfill game history from marketplace participants
INSERT INTO public.game_history (
    user_id,
    game_type,
    session_type,
    session_id,
    score,
    tokens_won,
    tokens_spent,
    result,
    listing_title,
    created_at
)
SELECT 
    mp.user_id,
    ml.game_type,
    'marketplace',
    mp.session_id,
    mp.score,
    CASE 
        WHEN ms.winner_user_id = mp.user_id THEN ms.prize_pool * 0.85
        ELSE 0
    END as tokens_won,
    mp.entry_amount,
    CASE 
        WHEN ms.winner_user_id = mp.user_id THEN 'won'
        ELSE 'lost'
    END as result,
    ml.title,
    mp.completed_at
FROM marketplace_participants mp
JOIN marketplace_sessions ms ON ms.id = mp.session_id
JOIN marketplace_listings ml ON ml.id = ms.listing_id
WHERE mp.score IS NOT NULL
ON CONFLICT DO NOTHING;

-- Success message
SELECT '✅ Game history & transaction system created!' as status;

