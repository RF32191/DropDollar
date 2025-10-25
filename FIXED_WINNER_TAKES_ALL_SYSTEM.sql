-- FIXED COMPLETE WINNER TAKES ALL SYSTEM
-- This fixes the existing system and adds missing columns

-- 1. Add missing columns to existing table
ALTER TABLE public.winner_takes_all_sessions 
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 1800;

-- 2. Drop existing functions to recreate them
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions();
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.update_winner_takes_all_score(UUID, UUID, INTEGER, DECIMAL);
DROP FUNCTION IF EXISTS public.process_winner_takes_all_payout(UUID, UUID, DECIMAL);

-- 3. Function to join a Winner Takes All session (deducts token and adds to pot)
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
            WHEN new_pot >= base_price THEN 'active'
            ELSE 'waiting'
        END,
        timer_started_at = CASE 
            WHEN new_pot >= base_price AND timer_started_at IS NULL THEN NOW()
            ELSE timer_started_at
        END,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully joined session',
        'newPot', new_pot,
        'participantsCount', new_participants_count,
        'status', CASE WHEN new_pot >= base_price THEN 'active' ELSE 'waiting' END
    );
END;
$$;

-- 4. Function to update score after game completion
CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
    session_id_param UUID,
    user_id_param UUID,
    score_param INTEGER,
    accuracy_param DECIMAL(5,2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Update participant score
    UPDATE public.winner_takes_all_participants 
    SET score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Participant not found');
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Score updated successfully');
END;
$$;

-- 5. Function to get all sessions with participants
CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE(
    id UUID,
    config_id TEXT,
    current_pot INTEGER,
    base_price INTEGER,
    participants_count INTEGER,
    status TEXT,
    timer_started_at TIMESTAMP WITH TIME ZONE,
    timer_duration INTEGER,
    winner_user_id UUID,
    prize_amount DECIMAL(10,2),
    platform_fee DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    participants JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.config_id,
        s.current_pot,
        s.base_price,
        s.participants_count,
        s.status,
        s.timer_started_at,
        s.timer_duration,
        s.winner_user_id,
        s.prize_amount,
        s.platform_fee,
        s.created_at,
        s.updated_at,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', p.id,
                    'user_id', p.user_id,
                    'score', p.score,
                    'accuracy', p.accuracy,
                    'joined_at', p.joined_at,
                    'completed_at', p.completed_at
                )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'::json
        ) as participants
    FROM public.winner_takes_all_sessions s
    LEFT JOIN public.winner_takes_all_participants p ON s.id = p.session_id
    GROUP BY s.id, s.config_id, s.current_pot, s.base_price, s.participants_count, 
             s.status, s.timer_started_at, s.timer_duration, s.winner_user_id, 
             s.prize_amount, s.platform_fee, s.created_at, s.updated_at
    ORDER BY s.created_at DESC;
END;
$$;

-- 6. Function to process winner payout and reset session
CREATE OR REPLACE FUNCTION public.process_winner_takes_all_payout(
    session_id_param UUID,
    winner_user_id_param UUID,
    prize_amount_param DECIMAL(10,2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    platform_fee DECIMAL(10,2);
    result JSON;
BEGIN
    -- Get session info
    SELECT * INTO session_record FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Calculate platform fee (15% of total pot)
    platform_fee := session_record.current_pot * 0.15;
    
    -- Add prize to winner's tokens
    UPDATE public.users 
    SET tokens = tokens + prize_amount_param,
        updated_at = NOW()
    WHERE id = winner_user_id_param;
    
    -- Update session with winner info
    UPDATE public.winner_takes_all_sessions 
    SET winner_user_id = winner_user_id_param,
        prize_amount = prize_amount_param,
        platform_fee = platform_fee,
        status = 'completed',
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Payout processed successfully',
        'prizeAmount', prize_amount_param,
        'platformFee', platform_fee
    );
END;
$$;

-- 7. Create default Winner Takes All sessions
INSERT INTO public.winner_takes_all_sessions (
    id,
    config_id,
    current_pot,
    base_price,
    participants_count,
    status,
    timer_started_at,
    timer_duration
) VALUES 
-- $2 Winner Takes It All - Sword Parry
(gen_random_uuid(), 'wta-2-sword-parry', 0, 2, 0, 'waiting', NULL, 1800),

-- $5 Winner Takes It All - Blade Bounce  
(gen_random_uuid(), 'wta-5-blade-bounce', 0, 5, 0, 'waiting', NULL, 1800),

-- $10 Winner Takes It All - Laser Dodge
(gen_random_uuid(), 'wta-10-laser-dodge', 0, 10, 0, 'waiting', NULL, 1800),

-- $25 Winner Takes It All - Multi Target
(gen_random_uuid(), 'wta-25-multi-target', 0, 25, 0, 'waiting', NULL, 1800),

-- $50 Winner Takes It All - Sword Parry
(gen_random_uuid(), 'wta-50-sword-parry', 0, 50, 0, 'waiting', NULL, 1800),

-- $100 Winner Takes It All - Laser Dodge
(gen_random_uuid(), 'wta-100-laser-dodge', 0, 100, 0, 'waiting', NULL, 1800),

-- $250 Winner Takes It All - Multi Target
(gen_random_uuid(), 'wta-250-multi-target', 0, 250, 0, 'waiting', NULL, 1800),

-- $1000 Winner Takes It All - Cash Stack
(gen_random_uuid(), 'wta-1000-cash-stack', 0, 1000, 0, 'waiting', NULL, 1800),

-- $2500 Winner Takes It All - Falling Objects
(gen_random_uuid(), 'wta-2500-falling-objects', 0, 2500, 0, 'waiting', NULL, 1800),

-- $5000 Winner Takes It All - Color Sequence
(gen_random_uuid(), 'wta-5000-color-sequence', 0, 5000, 0, 'waiting', NULL, 1800),

-- $10000 Winner Takes It All - Laser Dodge
(gen_random_uuid(), 'wta-10000-laser-dodge', 0, 10000, 0, 'waiting', NULL, 1800),

-- $25000 Winner Takes It All - Multi Target
(gen_random_uuid(), 'wta-25000-multi-target', 0, 25000, 0, 'waiting', NULL, 1800)
ON CONFLICT (config_id) DO NOTHING;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_winner_takes_all_payout TO authenticated;

-- 9. Verification query
SELECT 
    'Winner Takes All system fixed and ready!' as status,
    COUNT(*) as total_sessions,
    SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting_sessions,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_sessions
FROM public.winner_takes_all_sessions;
