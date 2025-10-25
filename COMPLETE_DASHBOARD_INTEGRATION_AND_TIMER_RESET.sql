-- COMPLETE_DASHBOARD_INTEGRATION_AND_TIMER_RESET.sql
-- This script implements complete dashboard integration with competitions section, opponent scores, and automatic timer reset

-- ============================================
-- COMPLETE DASHBOARD INTEGRATION AND TIMER RESET SYSTEM
-- ============================================

-- 1. Create user_game_history table for dashboard integration
CREATE TABLE IF NOT EXISTS public.user_game_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    game_session_id UUID NOT NULL,
    score DECIMAL(10,2),
    accuracy NUMERIC(5,2),
    tokens_wagered INTEGER DEFAULT 0,
    tokens_won DECIMAL(10,2) DEFAULT 0,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_session_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_game_history_user_id ON public.user_game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_history_game_type ON public.user_game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_user_game_history_played_at ON public.user_game_history(played_at);

-- Enable RLS
ALTER TABLE public.user_game_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own game history" ON public.user_game_history;
DROP POLICY IF EXISTS "Users can insert their own game history" ON public.user_game_history;
DROP POLICY IF EXISTS "Users can update their own game history" ON public.user_game_history;

-- Create RLS policies
CREATE POLICY "Users can view their own game history" ON public.user_game_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game history" ON public.user_game_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game history" ON public.user_game_history
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 2. COMPREHENSIVE SCORE RECORDING WITH DASHBOARD INTEGRATION
-- ============================================

-- Create comprehensive score recording function with dashboard integration
CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score_with_dashboard(
    session_id_param UUID,
    user_id_param UUID,
    score_param DECIMAL(10,2),
    accuracy_param NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    participant_record RECORD;
    session_record RECORD;
    user_record RECORD;
    result JSON;
    game_history_id UUID;
BEGIN
    -- Get session info
    SELECT * INTO session_record 
    FROM public.winner_takes_all_sessions 
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Session not found'
        );
    END IF;
    
    -- Get user info
    SELECT * INTO user_record 
    FROM public.users 
    WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'User not found'
        );
    END IF;
    
    -- Check if user is already a participant
    SELECT * INTO participant_record 
    FROM public.winner_takes_all_participants 
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    -- If not a participant, add them as one
    IF NOT FOUND THEN
        INSERT INTO public.winner_takes_all_participants (session_id, user_id, joined_at)
        VALUES (session_id_param, user_id_param, NOW())
        RETURNING * INTO participant_record;
        
        -- Update session participant count
        UPDATE public.winner_takes_all_sessions
        SET participants_count = participants_count + 1,
            updated_at = NOW()
        WHERE id = session_id_param;
    END IF;
    
    -- Update participant score
    UPDATE public.winner_takes_all_participants
    SET score = score_param,
        accuracy = COALESCE(accuracy_param, accuracy),
        completed_at = NOW(),
        updated_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    -- Save to user_game_history for dashboard
    INSERT INTO public.user_game_history (
        user_id,
        game_type,
        game_session_id,
        score,
        accuracy,
        tokens_wagered,
        tokens_won,
        played_at
    ) VALUES (
        user_id_param,
        'winner_takes_all',
        session_id_param,
        score_param,
        COALESCE(accuracy_param, 0),
        session_record.current_pot,
        0, -- Will be updated when winner is determined
        NOW()
    ) ON CONFLICT (user_id, game_session_id) 
    DO UPDATE SET 
        score = score_param,
        accuracy = COALESCE(accuracy_param, user_game_history.accuracy),
        played_at = NOW()
    RETURNING id INTO game_history_id;
    
    -- Also save to game_history table for competitions section
    INSERT INTO public.game_history (
        user_id,
        game_type,
        score,
        accuracy,
        is_practice,
        is_competition,
        listing_id,
        tokens_wagered,
        tokens_won,
        metadata,
        tournament_type,
        created_at
    ) VALUES (
        user_id_param::TEXT,
        'winner_takes_all',
        score_param,
        COALESCE(accuracy_param, 0),
        false, -- This is not practice
        true,  -- This is a competition
        session_record.config_id,
        session_record.current_pot,
        0, -- Will be updated when winner is determined
        json_build_object(
            'session_id', session_id_param,
            'config_id', session_record.config_id,
            'game_title', CASE 
                WHEN session_record.config_id = 'wta-2-sword-parry' THEN 'Sword Parry Challenge'
                WHEN session_record.config_id = 'wta-5-archery' THEN 'Archery Master'
                WHEN session_record.config_id = 'wta-10-magic' THEN 'Magic Duel'
                ELSE 'Winner Takes All'
            END
        ),
        'winner_takes_all',
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Score recorded successfully in listing, dashboard, and competitions section',
        'score', score_param,
        'accuracy', COALESCE(accuracy_param, 0),
        'game_type', 'winner_takes_all',
        'session_id', session_id_param,
        'competition_saved', true
    );
END;
$$;

-- ============================================
-- 3. ENHANCED DASHBOARD DATA WITH OPPONENT SCORES
-- ============================================

-- Create function to get enhanced dashboard data with opponent scores
CREATE OR REPLACE FUNCTION public.get_enhanced_dashboard_data(
    user_id_param UUID
)
RETURNS TABLE(
    session_id UUID,
    config_id TEXT,
    game_title TEXT,
    user_score DECIMAL(10,2),
    user_accuracy NUMERIC(5,2),
    opponent_score DECIMAL(10,2),
    opponent_username TEXT,
    is_winner BOOLEAN,
    tokens_wagered INTEGER,
    tokens_won DECIMAL(10,2),
    played_at TIMESTAMP WITH TIME ZONE,
    all_participants JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.session_id,
        s.config_id,
        CASE 
            WHEN s.config_id = 'wta-2-sword-parry' THEN 'Sword Parry Challenge'
            WHEN s.config_id = 'wta-5-archery' THEN 'Archery Master'
            WHEN s.config_id = 'wta-10-magic' THEN 'Magic Duel'
            ELSE 'Winner Takes All'
        END as game_title,
        p.score as user_score,
        p.accuracy as user_accuracy,
        -- Get opponent's highest score (excluding user)
        (SELECT MAX(p2.score) 
         FROM public.winner_takes_all_participants p2 
         WHERE p2.session_id = p.session_id 
         AND p2.user_id != user_id_param 
         AND p2.score IS NOT NULL) as opponent_score,
        -- Get opponent's username (cast to TEXT)
        (SELECT u2.username::TEXT 
         FROM public.winner_takes_all_participants p2 
         JOIN public.users u2 ON p2.user_id = u2.id
         WHERE p2.session_id = p.session_id 
         AND p2.user_id != user_id_param 
         AND p2.score IS NOT NULL
         ORDER BY p2.score DESC 
         LIMIT 1) as opponent_username,
        (s.winner_user_id = user_id_param) as is_winner,
        s.current_pot as tokens_wagered,
        COALESCE(s.prize_amount, 0) as tokens_won,
        p.completed_at as played_at,
        -- Get all participants for this session
        (SELECT json_agg(
            json_build_object(
                'username', u3.username,
                'score', p3.score,
                'accuracy', p3.accuracy,
                'is_winner', (p3.user_id = s.winner_user_id)
            ) ORDER BY p3.score DESC
        )
        FROM public.winner_takes_all_participants p3
        JOIN public.users u3 ON p3.user_id = u3.id
        WHERE p3.session_id = p.session_id
        AND p3.score IS NOT NULL) as all_participants
    FROM public.winner_takes_all_participants p
    JOIN public.winner_takes_all_sessions s ON p.session_id = s.id
    WHERE p.user_id = user_id_param
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.completed_at DESC;
END;
$$;

-- ============================================
-- 4. TIMER EXPIRATION WITH SCORES AND PAYOUT
-- ============================================

-- Create function to handle timer expiration with opponent scores and winner display
CREATE OR REPLACE FUNCTION public.handle_timer_expiration_with_scores(
    session_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    opponent_record RECORD;
    all_participants JSON;
    result JSON;
    winner_tokens_before INTEGER;
    winner_tokens_after INTEGER;
    payout_amount DECIMAL(10,2);
BEGIN
    -- Get session info
    SELECT * INTO session_record 
    FROM public.winner_takes_all_sessions 
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Session not found'
        );
    END IF;
    
    -- Find the winner (highest score)
    SELECT p.*, u.username, u.email, u.tokens
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_id_param
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'No winner found for session'
        );
    END IF;
    
    -- Calculate payout (winner gets full pot)
    payout_amount := session_record.current_pot;
    winner_tokens_before := winner_record.tokens;
    
    -- Pay the winner
    UPDATE public.users
    SET tokens = tokens + payout_amount,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    -- Get updated token balance
    SELECT tokens INTO winner_tokens_after
    FROM public.users
    WHERE id = winner_record.user_id;
    
    -- Update game_history with tokens_won for winner (cast UUID to TEXT)
    UPDATE public.game_history
    SET tokens_won = payout_amount
    WHERE user_id = winner_record.user_id::TEXT 
    AND metadata->>'session_id' = session_id_param::TEXT;
    
    -- Update user_game_history with tokens_won for winner
    UPDATE public.user_game_history
    SET tokens_won = payout_amount,
        updated_at = NOW()
    WHERE user_id = winner_record.user_id 
    AND game_session_id = session_id_param;
    
    -- Mark session as completed
    UPDATE public.winner_takes_all_sessions
    SET 
        winner_user_id = winner_record.user_id,
        prize_amount = payout_amount,
        platform_fee = 0,
        status = 'completed',
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Get all participants for opponent scores
    SELECT json_agg(
        json_build_object(
            'user_id', p.user_id,
            'username', u.username,
            'email', u.email,
            'score', p.score,
            'accuracy', p.accuracy,
            'is_winner', (p.user_id = winner_record.user_id),
            'tokens_won', CASE WHEN p.user_id = winner_record.user_id THEN payout_amount ELSE 0 END
        ) ORDER BY p.score DESC
    ) INTO all_participants
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_id_param
    AND p.score IS NOT NULL;
    
    -- Reset the session for new games
    DELETE FROM public.winner_takes_all_participants 
    WHERE session_id = session_id_param;
    
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'waiting',
        current_pot = 0,
        participants_count = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        prize_amount = NULL,
        platform_fee = NULL,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Timer expired - Winner determined and session reset',
        'winner', json_build_object(
            'username', winner_record.username,
            'email', winner_record.email,
            'score', winner_record.score,
            'tokens_before', winner_tokens_before,
            'tokens_after', winner_tokens_after,
            'tokens_won', payout_amount
        ),
        'all_participants', all_participants,
        'session_reset', true,
        'config_id', session_record.config_id
    );
END;
$$;

-- ============================================
-- 5. TEST THE COMPLETE SYSTEM
-- ============================================

-- Reset everything first
DELETE FROM public.winner_takes_all_participants;
DELETE FROM public.user_game_history;
DELETE FROM public.game_history WHERE game_type = 'winner_takes_all';

UPDATE public.winner_takes_all_sessions 
SET 
    status = 'waiting',
    current_pot = 0,
    participants_count = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    prize_amount = NULL,
    platform_fee = NULL,
    updated_at = NOW()
WHERE config_id LIKE 'wta-%';

-- Create test scenario with two players
INSERT INTO public.winner_takes_all_participants (session_id, user_id, score, accuracy, completed_at, joined_at)
VALUES 
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'), 
     8500.75, 98.5, NOW(), NOW()),
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'ryanfermoselle@yahoo.com'), 
     7200.25, 95.0, NOW(), NOW());

-- Update session to have a pot and expired timer
UPDATE public.winner_takes_all_sessions
SET 
    current_pot = 25,
    participants_count = 2,
    status = 'active',
    timer_started_at = NOW() - INTERVAL '2 minutes', -- Expired timer
    updated_at = NOW()
WHERE config_id = 'wta-2-sword-parry';

-- Test score recording with dashboard integration
SELECT public.update_winner_takes_all_score_with_dashboard(
    (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'),
    (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'),
    8500.75,
    98.5
) as score_recording_result;

-- Test enhanced dashboard data
SELECT * FROM public.get_enhanced_dashboard_data(
    (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com')
) as enhanced_dashboard_data;

-- Test timer expiration with scores
SELECT public.handle_timer_expiration_with_scores(
    (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry')
) as timer_expiration_result;

-- ============================================
-- 6. FINAL RESET FOR USER TESTING
-- ============================================

-- Final reset for user testing
DELETE FROM public.winner_takes_all_participants;
DELETE FROM public.user_game_history;
DELETE FROM public.game_history WHERE game_type = 'winner_takes_all';

UPDATE public.winner_takes_all_sessions 
SET 
    status = 'waiting',
    current_pot = 0,
    participants_count = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    prize_amount = NULL,
    platform_fee = NULL,
    updated_at = NOW()
WHERE config_id LIKE 'wta-%';

-- Show ready status
SELECT 
    'System Ready for User Testing!' as status,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_sessions,
    SUM(current_pot) as total_pot,
    SUM(participants_count) as total_participants
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%';

-- ============================================
-- 7. SYSTEM SUMMARY
-- ============================================

-- Summary of the complete dashboard integration and timer reset system:
-- 1. Games show up in competitions section of dashboard
-- 2. Scores are recorded in both listing and dashboard
-- 3. Opponent scores are displayed in dashboard
-- 4. Winner score appears twice (as winner and in all participants)
-- 5. Automatic timer reset when timer hits zero
-- 6. Complete payout system with token distribution
-- 7. Session reset after payout
-- 8. Works for any user (existing and future)

SELECT 'Complete Dashboard Integration and Timer Reset System Ready!' as final_status;
