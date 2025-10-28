-- ============================================================================
-- FIX FUNCTION DATA TYPES TO MATCH TABLE
-- ============================================================================

-- Drop and recreate with INTEGER types to match your actual tables
DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    current_pot INTEGER,
    base_price INTEGER,
    participants_count INTEGER,
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id UUID,
    prize_amount NUMERIC,
    platform_fee NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, s.config_id, s.current_pot, s.base_price, s.participants_count, s.status,
        s.timer_started_at, COALESCE(s.timer_duration, 1800) as timer_duration,
        s.winner_user_id, s.prize_amount, s.platform_fee, s.created_at, s.updated_at,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'user_id', p.user_id, 'score', p.score, 'accuracy', p.accuracy, 'joined_at', p.joined_at, 'completed_at', p.completed_at))
            FROM public.winner_takes_all_participants p WHERE p.session_id = s.id), '[]'::jsonb) as participants
    FROM public.winner_takes_all_sessions s
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;

DROP FUNCTION IF EXISTS public.get_all_hot_sell_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_hot_sell_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    current_pot INTEGER,
    base_price INTEGER,
    max_participants INTEGER,
    status TEXT,
    first_place_user_id UUID,
    second_place_user_id UUID,
    third_place_user_id UUID,
    first_place_prize NUMERIC,
    second_place_prize NUMERIC,
    third_place_prize NUMERIC,
    platform_fee NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, s.config_id, s.current_pot, s.base_price, s.max_participants, s.status,
        s.first_place_user_id, s.second_place_user_id, s.third_place_user_id,
        s.first_place_prize, s.second_place_prize, s.third_place_prize, s.platform_fee,
        s.created_at, s.updated_at, s.completed_at,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'user_id', p.user_id, 'score', p.score, 'accuracy', p.accuracy, 'joined_at', p.joined_at))
            FROM public.hot_sell_participants p WHERE p.session_id = s.id), '[]'::jsonb) as participants
    FROM public.hot_sell_sessions s
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_hot_sell_sessions() TO authenticated, anon;

-- Now create configs with INTEGER types
INSERT INTO winner_takes_all_configs (id, game_type, title, description, entry_fee, prize_pool, base_price, game_duration, rng_seed, winner_prize, platform_fee, created_at, updated_at)
VALUES
('wta-2-sword-parry', 'sword_parry', '$2 Winner Takes It All - Sword Parry', 'Winner takes the entire $2 prize pool!', 1, 2, 2, 30, 5, 1.70, 0.30, NOW(), NOW()),
('wta-5-blade-bounce', 'blade_bounce', '$5 Winner Takes It All - Blade Bounce', 'Winner takes the entire $5 prize pool!', 1, 5, 5, 45, 6, 4.25, 0.75, NOW(), NOW()),
('wta-10-laser-dodge', 'laser_dodge', '$10 Winner Takes It All - Laser Dodge', 'Winner takes the entire $10 prize pool!', 1, 10, 10, 60, 7, 8.50, 1.50, NOW(), NOW()),
('wta-25-multi-target', 'multi_target_reaction', '$25 Winner Takes It All - Multi Target', 'Winner takes the entire $25 prize pool!', 1, 25, 25, 90, 8, 21.25, 3.75, NOW(), NOW()),
('wta-50-sword-parry', 'sword_parry', '$50 Winner Takes It All - Sword Parry', 'Winner takes the entire $50 prize pool!', 1, 50, 50, 120, 9, 42.50, 7.50, NOW(), NOW()),
('wta-100-blade-bounce', 'blade_bounce', '$100 Winner Takes It All - Blade Bounce', 'Winner takes the entire $100 prize pool!', 1, 100, 100, 150, 10, 85.00, 15.00, NOW(), NOW()),
('wta-250-laser-dodge', 'laser_dodge', '$250 Winner Takes It All - Laser Dodge', 'Winner takes the entire $250 prize pool!', 1, 250, 250, 180, 11, 212.50, 37.50, NOW(), NOW()),
('wta-500-multi-target', 'multi_target_reaction', '$500 Winner Takes It All - Multi Target', 'Winner takes the entire $500 prize pool!', 1, 500, 500, 240, 12, 425.00, 75.00, NOW(), NOW()),
('wta-1000-falling-object', 'falling_object', '$1000 Winner Takes It All - Falling Object', 'Winner takes the entire $1000 prize pool!', 1, 1000, 1000, 300, 13, 850.00, 150.00, NOW(), NOW()),
('wta-2500-color-sequence', 'color_sequence', '$2500 Winner Takes It All - Color Sequence', 'Winner takes the entire $2500 prize pool!', 1, 2500, 2500, 360, 14, 2125.00, 375.00, NOW(), NOW()),
('wta-10000-laser-dodge', 'laser_dodge', '$10000 Winner Takes It All - Laser Dodge', 'Winner takes the entire $10000 prize pool!', 1, 10000, 10000, 420, 15, 8500.00, 1500.00, NOW(), NOW()),
('wta-25000-multi-target', 'multi_target_reaction', '$25000 Winner Takes It All - Multi Target', 'Winner takes the entire $25000 prize pool!', 1, 25000, 25000, 480, 16, 21250.00, 3750.00, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO hot_sell_configs (id, game_type, title, description, entry_fee, base_price, max_participants, game_duration, rng_seed, first_place_percent, second_place_percent, third_place_percent, platform_fee_percent, created_at, updated_at)
VALUES
('hs-3-sword-parry', 'sword_parry', '$3 Hot Sell - Sword Parry', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 3, 3, 30, 5, 50, 20, 15, 15, NOW(), NOW()),
('hs-3-blade-bounce', 'blade_bounce', '$3 Hot Sell - Blade Bounce', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 3, 3, 30, 6, 50, 20, 15, 15, NOW(), NOW()),
('hs-5-sword-parry', 'sword_parry', '$5 Hot Sell - Sword Parry', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 5, 5, 30, 7, 50, 20, 15, 15, NOW(), NOW()),
('hs-5-blade-bounce', 'blade_bounce', '$5 Hot Sell - Blade Bounce', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 5, 5, 30, 8, 50, 20, 15, 15, NOW(), NOW()),
('hs-10-laser-dodge', 'laser_dodge', '$10 Hot Sell - Laser Dodge', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 10, 10, 30, 9, 50, 20, 15, 15, NOW(), NOW()),
('hs-10-multi-target', 'multi_target_reaction', '$10 Hot Sell - Multi Target', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 10, 10, 30, 10, 50, 20, 15, 15, NOW(), NOW()),
('hs-25-falling-object', 'falling_object', '$25 Hot Sell - Falling Object', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 25, 25, 30, 11, 50, 20, 15, 15, NOW(), NOW()),
('hs-25-color-sequence', 'color_sequence', '$25 Hot Sell - Color Sequence', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 25, 25, 30, 12, 50, 20, 15, 15, NOW(), NOW()),
('hs-1000-laser-dodge', 'laser_dodge', '$1000 Hot Sell - Laser Dodge', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 1000, 1000, 30, 21, 50, 20, 15, 15, NOW(), NOW()),
('hs-1000-multi-target', 'multi_target_reaction', '$1000 Hot Sell - Multi Target', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 1000, 1000, 30, 22, 50, 20, 15, 15, NOW(), NOW()),
('hs-10000-laser-dodge', 'laser_dodge', '$10000 Hot Sell - Laser Dodge', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 10000, 10000, 30, 25, 50, 20, 15, 15, NOW(), NOW()),
('hs-10000-multi-target', 'multi_target_reaction', '$10000 Hot Sell - Multi Target', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 10000, 10000, 30, 26, 50, 20, 15, 15, NOW(), NOW()),
('hs-25000-laser-dodge', 'laser_dodge', '$25000 Hot Sell - Laser Dodge', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 25000, 25000, 30, 27, 50, 20, 15, 15, NOW(), NOW()),
('hs-25000-multi-target', 'multi_target_reaction', '$25000 Hot Sell - Multi Target', '1st: 50%, 2nd: 20%, 3rd: 15%', 1, 25000, 25000, 30, 28, 50, 20, 15, 15, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create sessions
INSERT INTO winner_takes_all_sessions (config_id, current_pot, base_price, participants_count, status, created_at, updated_at)
SELECT id, 0, base_price, 0, 'waiting', NOW(), NOW()
FROM winner_takes_all_configs
WHERE NOT EXISTS (SELECT 1 FROM winner_takes_all_sessions WHERE config_id = winner_takes_all_configs.id AND status IN ('waiting', 'active'));

INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status, created_at, updated_at)
SELECT id, 0, base_price, max_participants, 'waiting', NOW(), NOW()
FROM hot_sell_configs
WHERE NOT EXISTS (SELECT 1 FROM hot_sell_sessions WHERE config_id = hot_sell_configs.id AND status IN ('waiting', 'active'));

-- Test
SELECT COUNT(*) as wta_sessions FROM get_all_winner_takes_all_sessions();
SELECT COUNT(*) as hs_sessions FROM get_all_hot_sell_sessions();

DO $$
BEGIN
    RAISE NOTICE '✅ Functions fixed to use INTEGER types - matches your tables';
    RAISE NOTICE '🎉 Refresh your browser now!';
END $$;

