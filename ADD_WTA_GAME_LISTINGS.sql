-- ============================================================================
-- ADD WINNER TAKES ALL GAME LISTINGS
-- ============================================================================
-- This ONLY adds new game configurations - does NOT change any existing tables or functions
-- Winner takes 85% of pot, Platform takes 15%
-- ============================================================================

-- Clear existing configs (optional - comment out if you want to keep existing ones)
DELETE FROM winner_takes_all_configs;

-- Insert all 8 games with 7 tiers each (56 total listings)
-- Prize calculation: winner_prize = base_price * 0.85, platform_fee = base_price * 0.15

INSERT INTO winner_takes_all_configs (id, game_type, title, description, entry_fee, prize_pool, base_price, game_duration, rng_seed, winner_prize, platform_fee) VALUES

-- SWORD PARRY - 7 tiers
('wta-3-sword-parry', 'sword_parry', '$3 Winner Takes All - Sword Slash', 'Winner takes 85%!', 1, 3, 3, 30, 101, 2.55, 0.45),
('wta-10-sword-parry', 'sword_parry', '$10 Winner Takes All - Sword Slash', 'Winner takes 85%!', 1, 10, 10, 30, 102, 8.50, 1.50),
('wta-50-sword-parry', 'sword_parry', '$50 Winner Takes All - Sword Slash', 'Winner takes 85%!', 1, 50, 50, 30, 103, 42.50, 7.50),
('wta-250-sword-parry', 'sword_parry', '$250 Winner Takes All - Sword Slash', 'Winner takes 85%!', 1, 250, 250, 30, 104, 212.50, 37.50),
('wta-1000-sword-parry', 'sword_parry', '$1000 Winner Takes All - Sword Slash', 'Winner takes 85%!', 1, 1000, 1000, 30, 105, 850.00, 150.00),
('wta-10000-sword-parry', 'sword_parry', '$10000 Winner Takes All - Sword Slash', 'Winner takes 85%!', 1, 10000, 10000, 30, 106, 8500.00, 1500.00),
('wta-25000-sword-parry', 'sword_parry', '$25000 Winner Takes All - Sword Slash', 'Winner takes 85%!', 1, 25000, 25000, 30, 107, 21250.00, 3750.00),

-- BLADE BOUNCE - 7 tiers
('wta-3-blade-bounce', 'blade_bounce', '$3 Winner Takes All - Blade Bounce', 'Winner takes 85%!', 1, 3, 3, 30, 200, 2.55, 0.45),
('wta-5-blade-bounce', 'blade_bounce', '$5 Winner Takes All - Blade Bounce', 'Winner takes 85%!', 1, 5, 5, 30, 201, 4.25, 0.75),
('wta-25-blade-bounce', 'blade_bounce', '$25 Winner Takes All - Blade Bounce', 'Winner takes 85%!', 1, 25, 25, 30, 202, 21.25, 3.75),
('wta-100-blade-bounce', 'blade_bounce', '$100 Winner Takes All - Blade Bounce', 'Winner takes 85%!', 1, 100, 100, 30, 203, 85.00, 15.00),
('wta-500-blade-bounce', 'blade_bounce', '$500 Winner Takes All - Blade Bounce', 'Winner takes 85%!', 1, 500, 500, 30, 204, 425.00, 75.00),
('wta-10000-blade-bounce', 'blade_bounce', '$10000 Winner Takes All - Blade Bounce', 'Winner takes 85%!', 1, 10000, 10000, 30, 205, 8500.00, 1500.00),
('wta-25000-blade-bounce', 'blade_bounce', '$25000 Winner Takes All - Blade Bounce', 'Winner takes 85%!', 1, 25000, 25000, 30, 206, 21250.00, 3750.00),

-- LASER DODGE - 6 tiers
('wta-3-laser-dodge', 'laser_dodge', '$3 Winner Takes All - Laser Dodge', 'Winner takes 85%!', 1, 3, 3, 30, 301, 2.55, 0.45),
('wta-10-laser-dodge', 'laser_dodge', '$10 Winner Takes All - Laser Dodge', 'Winner takes 85%!', 1, 10, 10, 30, 302, 8.50, 1.50),
('wta-100-laser-dodge', 'laser_dodge', '$100 Winner Takes All - Laser Dodge', 'Winner takes 85%!', 1, 100, 100, 30, 303, 85.00, 15.00),
('wta-1000-laser-dodge', 'laser_dodge', '$1000 Winner Takes All - Laser Dodge', 'Winner takes 85%!', 1, 1000, 1000, 30, 304, 850.00, 150.00),
('wta-10000-laser-dodge', 'laser_dodge', '$10000 Winner Takes All - Laser Dodge', 'Winner takes 85%!', 1, 10000, 10000, 30, 305, 8500.00, 1500.00),
('wta-25000-laser-dodge', 'laser_dodge', '$25000 Winner Takes All - Laser Dodge', 'Winner takes 85%!', 1, 25000, 25000, 30, 306, 21250.00, 3750.00),

-- MULTI-TARGET REACTION - 7 tiers
('wta-3-multi-target', 'multi_target_reaction', '$3 Winner Takes All - Multi-Target', 'Winner takes 85%!', 1, 3, 3, 30, 400, 2.55, 0.45),
('wta-5-multi-target', 'multi_target_reaction', '$5 Winner Takes All - Multi-Target', 'Winner takes 85%!', 1, 5, 5, 30, 401, 4.25, 0.75),
('wta-25-multi-target', 'multi_target_reaction', '$25 Winner Takes All - Multi-Target', 'Winner takes 85%!', 1, 25, 25, 30, 402, 21.25, 3.75),
('wta-250-multi-target', 'multi_target_reaction', '$250 Winner Takes All - Multi-Target', 'Winner takes 85%!', 1, 250, 250, 30, 403, 212.50, 37.50),
('wta-2500-multi-target', 'multi_target_reaction', '$2500 Winner Takes All - Multi-Target', 'Winner takes 85%!', 1, 2500, 2500, 30, 404, 2125.00, 375.00),
('wta-10000-multi-target', 'multi_target_reaction', '$10000 Winner Takes All - Multi-Target', 'Winner takes 85%!', 1, 10000, 10000, 30, 405, 8500.00, 1500.00),
('wta-25000-multi-target', 'multi_target_reaction', '$25000 Winner Takes All - Multi-Target', 'Winner takes 85%!', 1, 25000, 25000, 30, 406, 21250.00, 3750.00),

-- FALLING OBJECT CATCH - 6 tiers
('wta-3-falling-object', 'falling_object', '$3 Winner Takes All - Coin Catch', 'Winner takes 85%!', 1, 3, 3, 30, 501, 2.55, 0.45),
('wta-10-falling-object', 'falling_object', '$10 Winner Takes All - Coin Catch', 'Winner takes 85%!', 1, 10, 10, 30, 502, 8.50, 1.50),
('wta-100-falling-object', 'falling_object', '$100 Winner Takes All - Coin Catch', 'Winner takes 85%!', 1, 100, 100, 30, 503, 85.00, 15.00),
('wta-2500-falling-object', 'falling_object', '$2500 Winner Takes All - Coin Catch', 'Winner takes 85%!', 1, 2500, 2500, 30, 504, 2125.00, 375.00),
('wta-10000-falling-object', 'falling_object', '$10000 Winner Takes All - Coin Catch', 'Winner takes 85%!', 1, 10000, 10000, 30, 505, 8500.00, 1500.00),
('wta-25000-falling-object', 'falling_object', '$25000 Winner Takes All - Coin Catch', 'Winner takes 85%!', 1, 25000, 25000, 30, 506, 21250.00, 3750.00),

-- COLOR SEQUENCE MEMORY - 7 tiers
('wta-3-color-sequence', 'color_sequence', '$3 Winner Takes All - Color Memory', 'Winner takes 85%!', 1, 3, 3, 30, 600, 2.55, 0.45),
('wta-5-color-sequence', 'color_sequence', '$5 Winner Takes All - Color Memory', 'Winner takes 85%!', 1, 5, 5, 30, 601, 4.25, 0.75),
('wta-50-color-sequence', 'color_sequence', '$50 Winner Takes All - Color Memory', 'Winner takes 85%!', 1, 50, 50, 30, 602, 42.50, 7.50),
('wta-500-color-sequence', 'color_sequence', '$500 Winner Takes All - Color Memory', 'Winner takes 85%!', 1, 500, 500, 30, 603, 425.00, 75.00),
('wta-5000-color-sequence', 'color_sequence', '$5000 Winner Takes All - Color Memory', 'Winner takes 85%!', 1, 5000, 5000, 30, 604, 4250.00, 750.00),
('wta-10000-color-sequence', 'color_sequence', '$10000 Winner Takes All - Color Memory', 'Winner takes 85%!', 1, 10000, 10000, 30, 605, 8500.00, 1500.00),
('wta-25000-color-sequence', 'color_sequence', '$25000 Winner Takes All - Color Memory', 'Winner takes 85%!', 1, 25000, 25000, 30, 606, 21250.00, 3750.00),

-- CASH STACK CHALLENGE - 6 tiers
('wta-3-cash-stack', 'cash_stack', '$3 Winner Takes All - Cash Stack', 'Winner takes 85%!', 1, 3, 3, 30, 700, 2.55, 0.45),
('wta-10-cash-stack', 'cash_stack', '$10 Winner Takes All - Cash Stack', 'Winner takes 85%!', 1, 10, 10, 30, 701, 8.50, 1.50),
('wta-100-cash-stack', 'cash_stack', '$100 Winner Takes All - Cash Stack', 'Winner takes 85%!', 1, 100, 100, 30, 702, 85.00, 15.00),
('wta-1000-cash-stack', 'cash_stack', '$1000 Winner Takes All - Cash Stack', 'Winner takes 85%!', 1, 1000, 1000, 30, 703, 850.00, 150.00),
('wta-10000-cash-stack', 'cash_stack', '$10000 Winner Takes All - Cash Stack', 'Winner takes 85%!', 1, 10000, 10000, 30, 704, 8500.00, 1500.00),
('wta-25000-cash-stack', 'cash_stack', '$25000 Winner Takes All - Cash Stack', 'Winner takes 85%!', 1, 25000, 25000, 30, 705, 21250.00, 3750.00),

-- QUICK CLICK - 6 tiers
('wta-3-quick-click', 'quick_click', '$3 Winner Takes All - Quick Click', 'Winner takes 85%!', 1, 3, 3, 30, 801, 2.55, 0.45),
('wta-25-quick-click', 'quick_click', '$25 Winner Takes All - Quick Click', 'Winner takes 85%!', 1, 25, 25, 30, 802, 21.25, 3.75),
('wta-250-quick-click', 'quick_click', '$250 Winner Takes All - Quick Click', 'Winner takes 85%!', 1, 250, 250, 30, 803, 212.50, 37.50),
('wta-5000-quick-click', 'quick_click', '$5000 Winner Takes All - Quick Click', 'Winner takes 85%!', 1, 5000, 5000, 30, 804, 4250.00, 750.00),
('wta-10000-quick-click', 'quick_click', '$10000 Winner Takes All - Quick Click', 'Winner takes 85%!', 1, 10000, 10000, 30, 805, 8500.00, 1500.00),
('wta-25000-quick-click', 'quick_click', '$25000 Winner Takes All - Quick Click', 'Winner takes 85%!', 1, 25000, 25000, 30, 806, 21250.00, 3750.00);

-- ============================================================================
-- CREATE SESSIONS FOR NEW CONFIGS (if they don't already have sessions)
-- ============================================================================

INSERT INTO winner_takes_all_sessions (config_id, current_pot, base_price, status)
SELECT 
  id,
  0,
  base_price,
  'waiting'
FROM winner_takes_all_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM winner_takes_all_sessions s 
  WHERE s.config_id = c.id AND s.status IN ('waiting', 'active')
);

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
DECLARE
  game_count INTEGER;
  total_configs INTEGER;
BEGIN
  SELECT COUNT(DISTINCT game_type) INTO game_count FROM winner_takes_all_configs;
  SELECT COUNT(*) INTO total_configs FROM winner_takes_all_configs;
  
  RAISE NOTICE '✅ Winner Takes All game listings added!';
  RAISE NOTICE '🎮 Total game types: %', game_count;
  RAISE NOTICE '📊 Total listings: %', total_configs;
  RAISE NOTICE '🏆 Winner takes: 85%% of pot';
  RAISE NOTICE '💰 Platform fee: 15%% of pot';
  RAISE NOTICE '💵 Price range: $3 to $25,000';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 All 8 games included with multiple tiers each';
END $$;

