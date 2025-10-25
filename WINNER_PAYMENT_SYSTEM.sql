-- WINNER_PAYMENT_SYSTEM.sql
-- This script contains the complete payment system for Winner Takes All

-- ============================================
-- ADD MISSING COLUMNS TO USERS TABLE
-- ============================================

-- Add missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS total_winnings DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0;

-- ============================================
-- PAYMENT SYSTEM FUNCTIONS
-- ============================================

-- Create a payment system that pays the winner based on highest score
CREATE OR REPLACE FUNCTION public.pay_winner_based_on_score(session_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    winner_record RECORD;
    session_record RECORD;
    payout_amount DECIMAL(10,2);
    result JSON;
BEGIN
    -- Get session info
    SELECT * INTO session_record
    FROM public.winner_takes_all_sessions
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Session not found',
            'session_id', session_id_param
        );
    END IF;
    
    -- Check if already paid (prevent loops)
    IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Winner already paid for this session',
            'session_id', session_id_param,
            'winner_id', session_record.winner_user_id,
            'prize_amount', session_record.prize_amount
        );
    END IF;
    
    -- Find winner with highest score
    SELECT p.user_id, p.score, u.username, u.email, u.tokens as current_tokens
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_id_param
    AND p.score IS NOT NULL
    ORDER BY p.score DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No participants with scores found',
            'session_id', session_id_param
        );
    END IF;
    
    -- Set payout amount to current pot
    payout_amount := session_record.current_pot;
    
    -- Pay the winner
    UPDATE public.users
    SET 
        tokens = tokens + payout_amount,
        total_winnings = COALESCE(total_winnings, 0) + payout_amount,
        games_won = COALESCE(games_won, 0) + 1,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    -- Mark session as completed
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'completed',
        winner_user_id = winner_record.user_id,
        prize_amount = payout_amount,
        platform_fee = 0,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Update game history with tokens won
    UPDATE public.game_history
    SET tokens_won = payout_amount
    WHERE user_id = winner_record.user_id::TEXT 
    AND metadata->>'session_id' = session_id_param::TEXT;
    
    -- Update user_game_history with tokens won
    UPDATE public.user_game_history
    SET tokens_won = payout_amount
    WHERE user_id = winner_record.user_id 
    AND game_session_id = session_id_param;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Winner paid successfully',
        'session_id', session_id_param,
        'winner_id', winner_record.user_id,
        'winner_username', winner_record.username,
        'winner_email', winner_record.email,
        'winner_score', winner_record.score,
        'payout_amount', payout_amount,
        'tokens_before', winner_record.current_tokens,
        'tokens_after', winner_record.current_tokens + payout_amount,
        'timestamp', NOW()
    );
END;
$$;

-- Create a function to pay winner for a specific config_id
CREATE OR REPLACE FUNCTION public.pay_winner_by_config(config_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    result JSON;
BEGIN
    -- Get session by config_id
    SELECT * INTO session_record
    FROM public.winner_takes_all_sessions
    WHERE config_id = config_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Session not found for config_id: ' || config_id_param
        );
    END IF;
    
    -- Call the payment function
    SELECT public.pay_winner_based_on_score(session_record.id) INTO result;
    
    RETURN result;
END;
$$;

-- ============================================
-- TEST THE PAYMENT SYSTEM
-- ============================================

-- Test the payment system on a session with participants
SELECT public.pay_winner_by_config('wta-2-sword-parry') as payment_test_result;

-- Show current state of all sessions
SELECT 
    'All WTA Sessions Status' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;

-- ============================================
-- SYSTEM SUMMARY
-- ============================================

-- Summary of the payment system:
-- 1. pay_winner_based_on_score(session_id) - Pays winner for specific session
-- 2. pay_winner_by_config(config_id) - Pays winner for specific config
-- 3. Loop Prevention - Checks if already paid before processing
-- 4. Scoreboard Integration - Uses highest score to determine winner
-- 5. Complete Payment Flow - Updates tokens, game history, and session status
-- 6. Client Integration - Called automatically after score saving

SELECT 'Winner Payment System Implemented Successfully!' as final_status;
