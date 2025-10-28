-- ============================================================================
-- CREATE ALL CONFIGS WITH ALL REQUIRED COLUMNS
-- ============================================================================

-- Create Winner Takes All Configs (with prize_pool)
INSERT INTO winner_takes_all_configs (id, game_type, title, description, entry_fee, prize_pool, base_price, game_duration, rng_seed, created_at, updated_at)
VALUES
('wta-2-sword-parry', 'sword_parry', '$2 Winner Takes It All - Sword Parry', 'Winner takes the entire $2 prize pool!', 1, 2, 2, 30, 5, NOW(), NOW()),
('wta-5-blade-bounce', 'blade_bounce', '$5 Winner Takes It All - Blade Bounce', 'Winner takes the entire $5 prize pool!', 1, 5, 5, 45, 6, NOW(), NOW()),
('wta-10-laser-dodge', 'laser_dodge', '$10 Winner Takes It All - Laser Dodge', 'Winner takes the entire $10 prize pool!', 1, 10, 10, 60, 7, NOW(), NOW()),
('wta-25-multi-target', 'multi_target_reaction', '$25 Winner Takes It All - Multi Target', 'Winner takes the entire $25 prize pool!', 1, 25, 25, 90, 8, NOW(), NOW()),
('wta-50-sword-parry', 'sword_parry', '$50 Winner Takes It All - Sword Parry', 'Winner takes the entire $50 prize pool!', 1, 50, 50, 120, 9, NOW(), NOW()),
('wta-100-blade-bounce', 'blade_bounce', '$100 Winner Takes It All - Blade Bounce', 'Winner takes the entire $100 prize pool!', 1, 100, 100, 150, 10, NOW(), NOW()),
('wta-250-laser-dodge', 'laser_dodge', '$250 Winner Takes It All - Laser Dodge', 'Winner takes the entire $250 prize pool!', 1, 250, 250, 180, 11, NOW(), NOW()),
('wta-500-multi-target', 'multi_target_reaction', '$500 Winner Takes It All - Multi Target', 'Winner takes the entire $500 prize pool!', 1, 500, 500, 240, 12, NOW(), NOW()),
('wta-1000-falling-object', 'falling_object', '$1000 Winner Takes It All - Falling Object', 'Winner takes the entire $1000 prize pool!', 1, 1000, 1000, 300, 13, NOW(), NOW()),
('wta-2500-color-sequence', 'color_sequence', '$2500 Winner Takes It All - Color Sequence', 'Winner takes the entire $2500 prize pool!', 1, 2500, 2500, 360, 14, NOW(), NOW()),
('wta-10000-laser-dodge', 'laser_dodge', '$10000 Winner Takes It All - Laser Dodge', 'Winner takes the entire $10000 prize pool!', 1, 10000, 10000, 420, 15, NOW(), NOW()),
('wta-25000-multi-target', 'multi_target_reaction', '$25000 Winner Takes It All - Multi Target', 'Winner takes the entire $25000 prize pool!', 1, 25000, 25000, 480, 16, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create Hot Sell Configs
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

-- Create sessions for all configs
INSERT INTO winner_takes_all_sessions (config_id, current_pot, base_price, participants_count, status, created_at, updated_at)
SELECT id, 0, base_price, 0, 'waiting', NOW(), NOW()
FROM winner_takes_all_configs
WHERE NOT EXISTS (SELECT 1 FROM winner_takes_all_sessions WHERE config_id = winner_takes_all_configs.id AND status IN ('waiting', 'active'));

INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status, created_at, updated_at)
SELECT id, 0, base_price, max_participants, 'waiting', NOW(), NOW()
FROM hot_sell_configs
WHERE NOT EXISTS (SELECT 1 FROM hot_sell_sessions WHERE config_id = hot_sell_configs.id AND status IN ('waiting', 'active'));

-- Verify
DO $$
DECLARE
    wta_configs INTEGER;
    wta_sessions INTEGER;
    hs_configs INTEGER;
    hs_sessions INTEGER;
BEGIN
    SELECT COUNT(*) INTO wta_configs FROM winner_takes_all_configs;
    SELECT COUNT(*) INTO wta_sessions FROM winner_takes_all_sessions WHERE status IN ('waiting', 'active');
    SELECT COUNT(*) INTO hs_configs FROM hot_sell_configs;
    SELECT COUNT(*) INTO hs_sessions FROM hot_sell_sessions WHERE status IN ('waiting', 'active');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ALL CONFIGS AND SESSIONS CREATED';
    RAISE NOTICE '  Winner Takes All: % configs, % sessions', wta_configs, wta_sessions;
    RAISE NOTICE '  Hot Sell: % configs, % sessions', hs_configs, hs_sessions;
    RAISE NOTICE '';
    RAISE NOTICE '✅ PAGES WILL NOW LOAD - REFRESH YOUR BROWSER!';
END $$;

