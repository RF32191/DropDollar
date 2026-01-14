-- ============================================================================
-- ADD ALL GAMES TO WINNER TAKES ALL FOR BOTH MOBILE AND DESKTOP
-- ============================================================================
-- This script adds all game types with multiple prize tiers
-- All games are available for both mobile and desktop users
-- Winner takes 85% of pot, Platform takes 15%
-- ============================================================================

-- Use ON CONFLICT to update existing configs or insert new ones
INSERT INTO public.winner_takes_all_configs (
  id, 
  game_type, 
  title, 
  description, 
  entry_fee, 
  prize_pool, 
  base_price, 
  game_duration, 
  rng_seed, 
  winner_prize, 
  platform_fee,
  is_active,
  created_at, 
  updated_at
) VALUES

-- ============================================================================
-- SWORD PARRY (Mobile & Desktop Compatible) - 7 tiers
-- ============================================================================
('wta-2-sword-parry', 'sword_parry', '$2 Winner Takes All - Sword Parry', 'Winner takes 85% of the prize pool!', 1, 2, 2, 30, 5, 1.70, 0.30, true, NOW(), NOW()),
('wta-5-sword-parry', 'sword_parry', '$5 Winner Takes All - Sword Parry', 'Winner takes 85% of the prize pool!', 1, 5, 5, 30, 6, 4.25, 0.75, true, NOW(), NOW()),
('wta-10-sword-parry', 'sword_parry', '$10 Winner Takes All - Sword Parry', 'Winner takes 85% of the prize pool!', 1, 10, 10, 30, 7, 8.50, 1.50, true, NOW(), NOW()),
('wta-50-sword-parry', 'sword_parry', '$50 Winner Takes All - Sword Parry', 'Winner takes 85% of the prize pool!', 1, 50, 50, 120, 8, 42.50, 7.50, true, NOW(), NOW()),
('wta-250-sword-parry', 'sword_parry', '$250 Winner Takes All - Sword Parry', 'Winner takes 85% of the prize pool!', 1, 250, 250, 180, 9, 212.50, 37.50, true, NOW(), NOW()),
('wta-1000-sword-parry', 'sword_parry', '$1000 Winner Takes All - Sword Parry', 'Winner takes 85% of the prize pool!', 1, 1000, 1000, 240, 10, 850.00, 150.00, true, NOW(), NOW()),
('wta-10000-sword-parry', 'sword_parry', '$10000 Winner Takes All - Sword Parry', 'Winner takes 85% of the prize pool!', 1, 10000, 10000, 420, 11, 8500.00, 1500.00, true, NOW(), NOW()),

-- ============================================================================
-- BLADE BOUNCE (Desktop Only) - 7 tiers
-- ============================================================================
('wta-3-blade-bounce', 'blade_bounce', '$3 Winner Takes All - Blade Bounce', 'Winner takes 85% of the prize pool!', 1, 3, 3, 45, 20, 2.55, 0.45, true, NOW(), NOW()),
('wta-5-blade-bounce', 'blade_bounce', '$5 Winner Takes All - Blade Bounce', 'Winner takes 85% of the prize pool!', 1, 5, 5, 45, 21, 4.25, 0.75, true, NOW(), NOW()),
('wta-25-blade-bounce', 'blade_bounce', '$25 Winner Takes All - Blade Bounce', 'Winner takes 85% of the prize pool!', 1, 25, 25, 90, 22, 21.25, 3.75, true, NOW(), NOW()),
('wta-100-blade-bounce', 'blade_bounce', '$100 Winner Takes All - Blade Bounce', 'Winner takes 85% of the prize pool!', 1, 100, 100, 150, 23, 85.00, 15.00, true, NOW(), NOW()),
('wta-500-blade-bounce', 'blade_bounce', '$500 Winner Takes All - Blade Bounce', 'Winner takes 85% of the prize pool!', 1, 500, 500, 240, 24, 425.00, 75.00, true, NOW(), NOW()),
('wta-10000-blade-bounce', 'blade_bounce', '$10000 Winner Takes All - Blade Bounce', 'Winner takes 85% of the prize pool!', 1, 10000, 10000, 420, 25, 8500.00, 1500.00, true, NOW(), NOW()),
('wta-25000-blade-bounce', 'blade_bounce', '$25000 Winner Takes All - Blade Bounce', 'Winner takes 85% of the prize pool!', 1, 25000, 25000, 480, 26, 21250.00, 3750.00, true, NOW(), NOW()),

-- ============================================================================
-- LASER DODGE (Mobile & Desktop Compatible) - 7 tiers
-- ============================================================================
('wta-3-laser-dodge', 'laser_dodge', '$3 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 3, 3, 60, 30, 2.55, 0.45, true, NOW(), NOW()),
('wta-10-laser-dodge', 'laser_dodge', '$10 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 10, 10, 60, 31, 8.50, 1.50, true, NOW(), NOW()),
('wta-100-laser-dodge', 'laser_dodge', '$100 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 100, 100, 150, 32, 85.00, 15.00, true, NOW(), NOW()),
('wta-1000-laser-dodge', 'laser_dodge', '$1000 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 1000, 1000, 240, 33, 850.00, 150.00, true, NOW(), NOW()),
('wta-10000-laser-dodge', 'laser_dodge', '$10000 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 10000, 10000, 420, 34, 8500.00, 1500.00, true, NOW(), NOW()),
('wta-25000-laser-dodge', 'laser_dodge', '$25000 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 25000, 25000, 480, 35, 21250.00, 3750.00, true, NOW(), NOW()),

-- ============================================================================
-- MULTI TARGET REACTION (Mobile & Desktop Compatible) - 7 tiers
-- ============================================================================
('wta-3-multi-target', 'multi_target_reaction', '$3 Winner Takes All - Multi Target', 'Winner takes 85% of the prize pool!', 1, 3, 3, 90, 40, 2.55, 0.45, true, NOW(), NOW()),
('wta-5-multi-target', 'multi_target_reaction', '$5 Winner Takes All - Multi Target', 'Winner takes 85% of the prize pool!', 1, 5, 5, 90, 41, 4.25, 0.75, true, NOW(), NOW()),
('wta-25-multi-target', 'multi_target_reaction', '$25 Winner Takes All - Multi Target', 'Winner takes 85% of the prize pool!', 1, 25, 25, 90, 42, 21.25, 3.75, true, NOW(), NOW()),
('wta-250-multi-target', 'multi_target_reaction', '$250 Winner Takes All - Multi Target', 'Winner takes 85% of the prize pool!', 1, 250, 250, 180, 43, 212.50, 37.50, true, NOW(), NOW()),
('wta-2500-multi-target', 'multi_target_reaction', '$2500 Winner Takes All - Multi Target', 'Winner takes 85% of the prize pool!', 1, 2500, 2500, 300, 44, 2125.00, 375.00, true, NOW(), NOW()),
('wta-10000-multi-target', 'multi_target_reaction', '$10000 Winner Takes All - Multi Target', 'Winner takes 85% of the prize pool!', 1, 10000, 10000, 420, 45, 8500.00, 1500.00, true, NOW(), NOW()),
('wta-25000-multi-target', 'multi_target_reaction', '$25000 Winner Takes All - Multi Target', 'Winner takes 85% of the prize pool!', 1, 25000, 25000, 480, 46, 21250.00, 3750.00, true, NOW(), NOW()),

-- ============================================================================
-- CASH STACK (Desktop Only) - 7 tiers
-- ============================================================================
('wta-3-cash-stack', 'cash_stack', '$3 Winner Takes All - Cash Stack', 'Winner takes 85% of the prize pool!', 1, 3, 3, 240, 50, 2.55, 0.45, true, NOW(), NOW()),
('wta-10-cash-stack', 'cash_stack', '$10 Winner Takes All - Cash Stack', 'Winner takes 85% of the prize pool!', 1, 10, 10, 240, 51, 8.50, 1.50, true, NOW(), NOW()),
('wta-100-cash-stack', 'cash_stack', '$100 Winner Takes All - Cash Stack', 'Winner takes 85% of the prize pool!', 1, 100, 100, 240, 52, 85.00, 15.00, true, NOW(), NOW()),
('wta-1000-cash-stack', 'cash_stack', '$1000 Winner Takes All - Cash Stack', 'Winner takes 85% of the prize pool!', 1, 1000, 1000, 240, 53, 850.00, 150.00, true, NOW(), NOW()),
('wta-10000-cash-stack', 'cash_stack', '$10000 Winner Takes All - Cash Stack', 'Winner takes 85% of the prize pool!', 1, 10000, 10000, 420, 54, 8500.00, 1500.00, true, NOW(), NOW()),
('wta-25000-cash-stack', 'cash_stack', '$25000 Winner Takes All - Cash Stack', 'Winner takes 85% of the prize pool!', 1, 25000, 25000, 480, 55, 21250.00, 3750.00, true, NOW(), NOW()),

-- ============================================================================
-- FALLING OBJECT (Mobile & Desktop Compatible) - 7 tiers
-- ============================================================================
('wta-3-falling-object', 'falling_object', '$3 Winner Takes All - Falling Objects', 'Winner takes 85% of the prize pool!', 1, 3, 3, 60, 60, 2.55, 0.45, true, NOW(), NOW()),
('wta-10-falling-object', 'falling_object', '$10 Winner Takes All - Falling Objects', 'Winner takes 85% of the prize pool!', 1, 10, 10, 60, 61, 8.50, 1.50, true, NOW(), NOW()),
('wta-100-falling-object', 'falling_object', '$100 Winner Takes All - Falling Objects', 'Winner takes 85% of the prize pool!', 1, 100, 100, 150, 62, 85.00, 15.00, true, NOW(), NOW()),
('wta-2500-falling-object', 'falling_object', '$2500 Winner Takes All - Falling Objects', 'Winner takes 85% of the prize pool!', 1, 2500, 2500, 300, 63, 2125.00, 375.00, true, NOW(), NOW()),
('wta-10000-falling-object', 'falling_object', '$10000 Winner Takes All - Falling Objects', 'Winner takes 85% of the prize pool!', 1, 10000, 10000, 420, 64, 8500.00, 1500.00, true, NOW(), NOW()),
('wta-25000-falling-object', 'falling_object', '$25000 Winner Takes All - Falling Objects', 'Winner takes 85% of the prize pool!', 1, 25000, 25000, 480, 65, 21250.00, 3750.00, true, NOW(), NOW()),

-- ============================================================================
-- COLOR SEQUENCE (Mobile & Desktop Compatible) - 7 tiers
-- ============================================================================
('wta-3-color-sequence', 'color_sequence', '$3 Winner Takes All - Color Sequence', 'Winner takes 85% of the prize pool!', 1, 3, 3, 90, 70, 2.55, 0.45, true, NOW(), NOW()),
('wta-5-color-sequence', 'color_sequence', '$5 Winner Takes All - Color Sequence', 'Winner takes 85% of the prize pool!', 1, 5, 5, 90, 71, 4.25, 0.75, true, NOW(), NOW()),
('wta-50-color-sequence', 'color_sequence', '$50 Winner Takes All - Color Sequence', 'Winner takes 85% of the prize pool!', 1, 50, 50, 120, 72, 42.50, 7.50, true, NOW(), NOW()),
('wta-500-color-sequence', 'color_sequence', '$500 Winner Takes All - Color Sequence', 'Winner takes 85% of the prize pool!', 1, 500, 500, 240, 73, 425.00, 75.00, true, NOW(), NOW()),
('wta-5000-color-sequence', 'color_sequence', '$5000 Winner Takes All - Color Sequence', 'Winner takes 85% of the prize pool!', 1, 5000, 5000, 360, 74, 4250.00, 750.00, true, NOW(), NOW()),
('wta-10000-color-sequence', 'color_sequence', '$10000 Winner Takes All - Color Sequence', 'Winner takes 85% of the prize pool!', 1, 10000, 10000, 420, 75, 8500.00, 1500.00, true, NOW(), NOW()),
('wta-25000-color-sequence', 'color_sequence', '$25000 Winner Takes All - Color Sequence', 'Winner takes 85% of the prize pool!', 1, 25000, 25000, 480, 76, 21250.00, 3750.00, true, NOW(), NOW()),

-- ============================================================================
-- QUICK CLICK (Mobile & Desktop Compatible) - 7 tiers
-- ============================================================================
('wta-3-quick-click', 'quick_click', '$3 Winner Takes All - Quick Click', 'Winner takes 85% of the prize pool!', 1, 3, 3, 30, 80, 2.55, 0.45, true, NOW(), NOW()),
('wta-25-quick-click', 'quick_click', '$25 Winner Takes All - Quick Click', 'Winner takes 85% of the prize pool!', 1, 25, 25, 30, 81, 21.25, 3.75, true, NOW(), NOW()),
('wta-250-quick-click', 'quick_click', '$250 Winner Takes All - Quick Click', 'Winner takes 85% of the prize pool!', 1, 250, 250, 180, 82, 212.50, 37.50, true, NOW(), NOW()),
('wta-5000-quick-click', 'quick_click', '$5000 Winner Takes All - Quick Click', 'Winner takes 85% of the prize pool!', 1, 5000, 5000, 360, 83, 4250.00, 750.00, true, NOW(), NOW()),
('wta-10000-quick-click', 'quick_click', '$10000 Winner Takes All - Quick Click', 'Winner takes 85% of the prize pool!', 1, 10000, 10000, 420, 84, 8500.00, 1500.00, true, NOW(), NOW()),
('wta-25000-quick-click', 'quick_click', '$25000 Winner Takes All - Quick Click', 'Winner takes 85% of the prize pool!', 1, 25000, 25000, 480, 85, 21250.00, 3750.00, true, NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
  game_type = EXCLUDED.game_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  entry_fee = EXCLUDED.entry_fee,
  prize_pool = EXCLUDED.prize_pool,
  base_price = EXCLUDED.base_price,
  game_duration = EXCLUDED.game_duration,
  rng_seed = EXCLUDED.rng_seed,
  winner_prize = EXCLUDED.winner_prize,
  platform_fee = EXCLUDED.platform_fee,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================================
-- CREATE SESSIONS FOR ALL CONFIGS (if they don't exist)
-- ============================================================================
DO $$
DECLARE
    config_rec RECORD;
    session_exists BOOLEAN;
BEGIN
    FOR config_rec IN SELECT id FROM public.winner_takes_all_configs WHERE is_active = true LOOP
        -- Check if session already exists
        SELECT EXISTS(
            SELECT 1 FROM public.winner_takes_all_sessions 
            WHERE config_id = config_rec.id
        ) INTO session_exists;
        
        -- Create session if it doesn't exist
        IF NOT session_exists THEN
            INSERT INTO public.winner_takes_all_sessions (
                config_id,
                current_pot,
                base_price,
                participants_count,
                status,
                created_at,
                updated_at
            )
            SELECT 
                c.id,
                0,
                c.base_price,
                0,
                'waiting',
                NOW(),
                NOW()
            FROM public.winner_takes_all_configs c
            WHERE c.id = config_rec.id;
            
            RAISE NOTICE '✅ Created session for config: %', config_rec.id;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show all configs by game type
SELECT 
    game_type,
    COUNT(*) as config_count,
    MIN(base_price) as min_prize,
    MAX(base_price) as max_prize
FROM public.winner_takes_all_configs
WHERE is_active = true
GROUP BY game_type
ORDER BY game_type;

-- Show all sessions status
SELECT 
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_sessions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions
FROM public.winner_takes_all_sessions;

-- Show summary
SELECT 
    '✅ All games added successfully!' as status,
    COUNT(DISTINCT game_type) as total_game_types,
    COUNT(*) as total_configs,
    COUNT(DISTINCT (SELECT COUNT(*) FROM public.winner_takes_all_sessions WHERE config_id = c.id)) as sessions_created
FROM public.winner_takes_all_configs c
WHERE is_active = true;

