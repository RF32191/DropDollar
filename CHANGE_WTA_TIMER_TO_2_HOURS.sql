-- ============================================================================
-- CHANGE WINNER TAKES ALL TIMER FROM 1 MINUTE TO 2 HOURS
-- Run this script once testing with 1 minute timer is confirmed working
-- ============================================================================

-- Update all configs to use 2 hour (7200 seconds) timer
UPDATE public.winner_takes_all_configs
SET 
    timer_duration = 7200, -- 2 hours in seconds
    updated_at = NOW();

SELECT '✅ All winner_takes_all_configs updated to 2 hour timer' as result;

-- Update all active sessions to use 2 hour timer
UPDATE public.winner_takes_all_sessions
SET 
    timer_duration = 7200, -- 2 hours in seconds
    updated_at = NOW()
WHERE status IN ('waiting', 'active');

SELECT '✅ All active winner_takes_all_sessions updated to 2 hour timer' as result;

-- Update the payout function to use 2 hour default
CREATE OR REPLACE FUNCTION public.process_winner_takes_all_payout_complete(
    config_id_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_config RECORD;
    v_winner RECORD;
    v_winner_prize NUMERIC(10,2);
    v_platform_fee NUMERIC(10,2);
    v_old_balance NUMERIC(10,2);
    v_new_balance NUMERIC(10,2);
    v_participants_with_scores INTEGER;
BEGIN
    -- Get config
    SELECT * INTO v_config FROM public.winner_takes_all_configs WHERE id = config_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Configuration not found');
    END IF;

    -- Get active session
    SELECT * INTO v_session FROM public.winner_takes_all_sessions 
    WHERE config_id = config_id_param AND status = 'active';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'No active session found');
    END IF;

    -- Check if already paid out
    IF v_session.winner_user_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session already paid out');
    END IF;

    -- Check if timer expired
    IF v_session.timer_started_at IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Timer not started yet');
    END IF;

    IF EXTRACT(EPOCH FROM (NOW() - v_session.timer_started_at)) < v_session.timer_duration THEN
        RETURN json_build_object('success', false, 'message', 'Timer not expired yet');
    END IF;

    -- Count participants with scores
    SELECT COUNT(*) INTO v_participants_with_scores
    FROM public.winner_takes_all_participants
    WHERE session_id = v_session.id AND score IS NOT NULL;

    IF v_participants_with_scores = 0 THEN
        RETURN json_build_object('success', false, 'message', 'No scores submitted yet');
    END IF;

    -- Get winner (highest score)
    SELECT p.*, u.gameplay_tokens
    INTO v_winner
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session.id AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'No winner found');
    END IF;

    -- Calculate prizes (85% to winner, 15% platform fee)
    v_winner_prize := v_session.prize_pool * 0.85;
    v_platform_fee := v_session.prize_pool * 0.15;

    -- Pay winner
    v_old_balance := v_winner.gameplay_tokens;
    v_new_balance := v_old_balance + v_winner_prize;

    UPDATE public.users
    SET gameplay_tokens = v_new_balance,
        updated_at = NOW()
    WHERE id = v_winner.user_id;

    -- Record transaction
    INSERT INTO public.token_transactions (
        user_id, type, transaction_type, amount, balance_before, balance_after, description
    ) VALUES (
        v_winner.user_id, 'credit', 'wta_win', v_winner_prize, v_old_balance, v_new_balance,
        'Winner Takes All prize: ' || v_config.title
    );

    -- Mark session as completed
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner.user_id,
        winner_prize = v_winner_prize,
        platform_fee_amount = v_platform_fee,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_session.id;

    -- Create new waiting session for next game (with 2 hour timer)
    INSERT INTO public.winner_takes_all_sessions (
        config_id, prize_pool, participants_count, status, rng_seed, base_price, timer_duration
    ) VALUES (
        config_id_param, 0, 0, 'waiting',
        floor(random() * 1000000) + 1,
        v_config.base_price,
        7200 -- 2 hours for production
    );

    RETURN json_build_object(
        'success', true,
        'winner_user_id', v_winner.user_id,
        'winner_username', v_winner.username,
        'winner_score', v_winner.score,
        'winner_prize', v_winner_prize,
        'platform_fee', v_platform_fee,
        'message', 'Payout processed and new session created'
    );
END;
$$;

SELECT '✅ Payout function updated to use 2 hour timer for new sessions' as result;

-- Update join function to use 2 hour timer
CREATE OR REPLACE FUNCTION public.wta_join_v2(
    config_id_param TEXT,
    user_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_session RECORD;
    v_user RECORD;
    v_username TEXT;
    v_entry_fee NUMERIC(10,2);
    v_old_balance NUMERIC(10,2);
    v_new_balance NUMERIC(10,2);
BEGIN
    -- Get config
    SELECT * INTO v_config FROM public.winner_takes_all_configs WHERE id = config_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Configuration not found');
    END IF;

    -- Get user
    SELECT * INTO v_user FROM public.users WHERE id = user_id_param;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    -- Get username
    v_username := COALESCE(v_user.username, v_user.email, 'Anonymous');
    v_entry_fee := v_config.entry_fee;

    -- Check token balance
    IF v_user.gameplay_tokens < v_entry_fee THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient gameplay tokens');
    END IF;

    -- Get or create active session
    SELECT * INTO v_session FROM public.winner_takes_all_sessions 
    WHERE config_id = config_id_param AND status = 'waiting'
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Create new session (with 2 hour timer)
        INSERT INTO public.winner_takes_all_sessions (
            config_id, prize_pool, participants_count, status, rng_seed, base_price, timer_duration
        ) VALUES (
            config_id_param, 0, 0, 'waiting', 
            floor(random() * 1000000) + 1, 
            v_config.base_price,
            7200 -- 2 hours for production
        ) RETURNING * INTO v_session;
    END IF;

    -- Check if user already joined
    IF EXISTS (SELECT 1 FROM public.winner_takes_all_participants WHERE session_id = v_session.id AND user_id = user_id_param) THEN
        RETURN json_build_object('success', false, 'message', 'Already joined this session');
    END IF;

    -- Deduct tokens
    v_old_balance := v_user.gameplay_tokens;
    v_new_balance := v_old_balance - v_entry_fee;

    UPDATE public.users
    SET gameplay_tokens = v_new_balance,
        updated_at = NOW()
    WHERE id = user_id_param;

    -- Record transaction
    INSERT INTO public.token_transactions (
        user_id, type, transaction_type, amount, balance_before, balance_after, description
    ) VALUES (
        user_id_param, 'debit', 'wta_entry', v_entry_fee, v_old_balance, v_new_balance,
        'Winner Takes All entry: ' || v_config.title
    );

    -- Add participant
    INSERT INTO public.winner_takes_all_participants (
        session_id, user_id, username, joined_at
    ) VALUES (
        v_session.id, user_id_param, v_username, NOW()
    );

    -- Update session
    UPDATE public.winner_takes_all_sessions
    SET 
        prize_pool = prize_pool + v_entry_fee,
        participants_count = participants_count + 1,
        status = CASE 
            WHEN participants_count + 1 = 1 THEN 'active' -- First player starts timer
            ELSE status 
        END,
        timer_started_at = CASE
            WHEN participants_count + 1 = 1 THEN NOW() -- Start timer on first join
            ELSE timer_started_at
        END,
        updated_at = NOW()
    WHERE id = v_session.id;

    RETURN json_build_object(
        'success', true,
        'session_id', v_session.id,
        'prize_pool', v_session.prize_pool + v_entry_fee,
        'message', 'Joined successfully'
    );
END;
$$;

SELECT '✅ Join function updated to use 2 hour timer for new sessions' as result;

-- Verification
SELECT '
✅ WINNER TAKES ALL TIMER CHANGED TO 2 HOURS!

What changed:
- ⏱️ All configs now use 7200 seconds (2 hours)
- 🎮 All active sessions updated to 2 hour timer
- 🔄 New sessions created via join will use 2 hour timer
- 💰 New sessions created via payout will use 2 hour timer

Current timer settings:
' as summary;

SELECT id, title, timer_duration FROM public.winner_takes_all_configs ORDER BY base_price ASC;

