-- ============================================================================
-- ADD LASER DODGE AND SWORD SLASH TO DESKTOP WTA
-- ============================================================================
-- This script adds more prize tiers for laser_dodge and sword_parry (sword slash)
-- These games are now available for desktop WTA competitions
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
-- LASER DODGE (Desktop) - Additional tiers
-- ============================================================================
('wta-5-laser-dodge', 'laser_dodge', '$5 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 5, 5, 60, 36, 4.25, 0.75, true, NOW(), NOW()),
('wta-25-laser-dodge', 'laser_dodge', '$25 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 25, 25, 90, 37, 21.25, 3.75, true, NOW(), NOW()),
('wta-50-laser-dodge', 'laser_dodge', '$50 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 50, 50, 120, 38, 42.50, 7.50, true, NOW(), NOW()),
('wta-250-laser-dodge', 'laser_dodge', '$250 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 250, 250, 180, 39, 212.50, 37.50, true, NOW(), NOW()),
('wta-500-laser-dodge', 'laser_dodge', '$500 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 500, 500, 240, 40, 425.00, 75.00, true, NOW(), NOW()),
('wta-2500-laser-dodge', 'laser_dodge', '$2500 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 2500, 2500, 300, 41, 2125.00, 375.00, true, NOW(), NOW()),
('wta-5000-laser-dodge', 'laser_dodge', '$5000 Winner Takes All - Laser Dodge', 'Winner takes 85% of the prize pool!', 1, 5000, 5000, 360, 42, 4250.00, 750.00, true, NOW(), NOW()),

-- ============================================================================
-- SWORD PARRY / SWORD SLASH (Desktop) - Additional tiers
-- ============================================================================
('wta-3-sword-parry', 'sword_parry', '$3 Winner Takes All - Sword Slash', 'Winner takes 85% of the prize pool!', 1, 3, 3, 30, 12, 2.55, 0.45, true, NOW(), NOW()),
('wta-25-sword-parry', 'sword_parry', '$25 Winner Takes All - Sword Slash', 'Winner takes 85% of the prize pool!', 1, 25, 25, 90, 13, 21.25, 3.75, true, NOW(), NOW()),
('wta-100-sword-parry', 'sword_parry', '$100 Winner Takes All - Sword Slash', 'Winner takes 85% of the prize pool!', 1, 100, 100, 150, 14, 85.00, 15.00, true, NOW(), NOW()),
('wta-500-sword-parry', 'sword_parry', '$500 Winner Takes All - Sword Slash', 'Winner takes 85% of the prize pool!', 1, 500, 500, 240, 15, 425.00, 75.00, true, NOW(), NOW()),
('wta-2500-sword-parry', 'sword_parry', '$2500 Winner Takes All - Sword Slash', 'Winner takes 85% of the prize pool!', 1, 2500, 2500, 300, 16, 2125.00, 375.00, true, NOW(), NOW()),
('wta-5000-sword-parry', 'sword_parry', '$5000 Winner Takes All - Sword Slash', 'Winner takes 85% of the prize pool!', 1, 5000, 5000, 360, 17, 4250.00, 750.00, true, NOW(), NOW())

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
-- CREATE SESSIONS FOR NEW CONFIGS (if they don't exist)
-- ============================================================================
DO $$
DECLARE
    config_rec RECORD;
    session_exists BOOLEAN;
BEGIN
    FOR config_rec IN 
        SELECT id FROM public.winner_takes_all_configs 
        WHERE is_active = true 
        AND (game_type = 'laser_dodge' OR game_type = 'sword_parry')
    LOOP
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

-- Show all laser_dodge and sword_parry configs
SELECT 
    game_type,
    COUNT(*) as config_count,
    MIN(base_price) as min_prize,
    MAX(base_price) as max_prize,
    STRING_AGG(base_price::TEXT, ', ' ORDER BY base_price) as prize_tiers
FROM public.winner_takes_all_configs
WHERE is_active = true
AND (game_type = 'laser_dodge' OR game_type = 'sword_parry')
GROUP BY game_type
ORDER BY game_type;

-- Show summary
SELECT 
    '✅ Laser Dodge and Sword Slash added to Desktop WTA!' as status,
    COUNT(*) FILTER (WHERE game_type = 'laser_dodge') as laser_dodge_configs,
    COUNT(*) FILTER (WHERE game_type = 'sword_parry') as sword_parry_configs,
    COUNT(*) as total_new_configs
FROM public.winner_takes_all_configs
WHERE is_active = true
AND (game_type = 'laser_dodge' OR game_type = 'sword_parry');



