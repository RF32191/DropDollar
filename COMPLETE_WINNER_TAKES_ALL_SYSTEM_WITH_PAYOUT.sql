-- COMPLETE_WINNER_TAKES_ALL_SYSTEM_WITH_PAYOUT.sql
-- This script creates a complete Winner Takes All system with proper join, pot addition, and payout

-- ============================================
-- RESTORE PROPER JOIN FUNCTION
-- ============================================

-- Drop existing join function
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID);

-- Create the proper join function that deducts tokens and adds to pot
CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(
    session_id_param UUID,
    user_id_param UUID,
    entry_fee_param INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    user_record RECORD;
    new_pot INTEGER;
    new_participants_count INTEGER;
    result JSON;
BEGIN
    -- Get session info
    SELECT * INTO session_record FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Check if user already joined
    IF EXISTS (SELECT 1 FROM public.winner_takes_all_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
        RETURN json_build_object('success', false, 'message', 'User already joined this session');
    END IF;
    
    -- Get user info and check token balance
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF user_record.tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Deduct tokens from user
    UPDATE public.users 
    SET tokens = tokens - entry_fee_param,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    -- Add participant
    INSERT INTO public.winner_takes_all_participants (session_id, user_id)
    VALUES (session_id_param, user_id_param);
    
    -- Update session pot and participant count
    new_pot := session_record.current_pot + entry_fee_param;
    new_participants_count := session_record.participants_count + 1;
    
    UPDATE public.winner_takes_all_sessions 
    SET current_pot = new_pot,
        participants_count = new_participants_count,
        status = CASE 
            WHEN new_pot >= session_record.base_price THEN 'active'
            ELSE 'waiting'
        END,
        timer_started_at = CASE 
            WHEN new_pot >= session_record.base_price AND timer_started_at IS NULL THEN NOW()
            ELSE timer_started_at
        END,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully joined Winner Takes All session',
        'session_id', session_id_param,
        'new_pot', new_pot,
        'participants_count', new_participants_count,
        'status', CASE 
            WHEN new_pot >= session_record.base_price THEN 'active'
            ELSE 'waiting'
        END
    );
END;
$$;

-- ============================================
-- CREATE PAYOUT SYSTEM
-- ============================================

-- Create a payout function that pays the winner when timer expires
CREATE OR REPLACE FUNCTION public.process_winner_takes_all_payout(session_id_param UUID)
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

-- Create a function to process payout by config_id
CREATE OR REPLACE FUNCTION public.process_payout_by_config(config_id_param TEXT)
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
    SELECT public.process_winner_takes_all_payout(session_record.id) INTO result;
    
    RETURN result;
END;
$$;

-- ============================================
-- RESET SESSIONS TO WAITING STATE
-- ============================================

-- Reset any sessions that were marked as completed
UPDATE public.winner_takes_all_sessions
SET 
    status = 'waiting',
    winner_user_id = NULL,
    prize_amount = NULL,
    platform_fee = NULL,
    updated_at = NOW()
WHERE status = 'completed';

-- ============================================
-- TEST THE SYSTEM
-- ============================================

-- Show current state
SELECT 
    'Current WTA Sessions' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    base_price,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;

SELECT 'Complete Winner Takes All system with payout implemented!' as final_status;
