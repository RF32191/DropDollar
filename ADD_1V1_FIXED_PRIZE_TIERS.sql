-- ============================================================================
-- ADD FIXED 1V1 PRIZE TIERS FOR ALL GAMES
-- ============================================================================
-- Creates 3 prize tiers for all 8 games:
-- 1. $2 Prize  - 2 tokens entry
-- 2. $10 Prize - 5 tokens entry
-- 3. $25 Prize - 12.50 tokens entry
--
-- Winner gets 85%, Platform gets 15%
-- ============================================================================

-- ============================================================================
-- 1. Clear existing 1v1 configs (fresh start)
-- ============================================================================

-- First, delete all sessions and participants
DELETE FROM public.one_v_one_participants;
DELETE FROM public.one_v_one_sessions;
DELETE FROM public.one_v_one_configs;

-- ============================================================================
-- 2. Create prize tier configs for all games
-- ============================================================================

-- Helper function to calculate prizes
-- Entry fee * 2 players = total pool
-- Winner = 85% of pool
-- Platform = 15% of pool

DO $$
DECLARE
  v_config_id UUID;
  v_game_type TEXT;
  v_game_name TEXT;
  v_entry_fee DECIMAL(10,2);
  v_prize_name TEXT;
  v_total_pool DECIMAL(10,2);
  v_winner_prize DECIMAL(10,2);
  v_platform_fee DECIMAL(10,2);
  v_rng_seed INTEGER;
BEGIN
  
  -- Loop through all game types
  FOR v_game_type, v_game_name IN 
    SELECT * FROM (VALUES 
      ('sword_parry', 'Sword Slash'),
      ('blade_bounce', 'Blade Bounce'),
      ('laser_dodge', 'Laser Dodge'),
      ('multi_target_reaction', 'Multi-Target'),
      ('falling_object', 'Coin Catch'),
      ('color_sequence', 'Color Memory'),
      ('cash_stack', 'Cash Stack'),
      ('quick_click', 'Quick Click')
    ) AS games(game_type, game_name)
  LOOP
    
    -- Loop through 3 prize tiers
    FOR v_entry_fee, v_prize_name IN 
      SELECT * FROM (VALUES 
        (2.00, '$2 Prize'),
        (5.00, '$10 Prize'),
        (12.50, '$25 Prize')
      ) AS tiers(entry, prize_name)
    LOOP
      
      -- Calculate prizes
      v_total_pool := v_entry_fee * 2; -- 2 players
      v_winner_prize := v_total_pool * 0.85; -- Winner gets 85%
      v_platform_fee := v_total_pool * 0.15; -- Platform gets 15%
      
      -- Generate random seed for fair RNG
      v_rng_seed := floor(random() * 1000000)::INTEGER;
      
      -- Create unique config ID
      v_config_id := gen_random_uuid();
      
      -- Insert config
      INSERT INTO public.one_v_one_configs (
        id,
        game_type,
        title,
        description,
        entry_fee,
        prize_pool,
        game_duration,
        rng_seed,
        winner_prize,
        platform_fee
      ) VALUES (
        v_config_id,
        v_game_type,
        v_game_name || ' 1v1 - ' || v_prize_name,
        'Head-to-head battle! Winner takes 85% (' || v_winner_prize::TEXT || ' tokens)',
        v_entry_fee,
        v_total_pool,
        60, -- 60 seconds game duration
        v_rng_seed,
        v_winner_prize,
        v_platform_fee
      );
      
      -- Create initial session for this config
      INSERT INTO public.one_v_one_sessions (
        id,
        config_id,
        current_pool,
        prize_pool,
        participants_count,
        max_participants,
        status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_config_id,
        0, -- Starts at 0, increases as players join
        v_total_pool,
        0, -- No participants yet
        2, -- Max 2 players
        'active',
        NOW(),
        NOW()
      );
      
      RAISE NOTICE '✅ Created: % - % (Entry: %, Winner: %)', 
        v_game_name, v_prize_name, v_entry_fee, v_winner_prize;
      
    END LOOP;
    
  END LOOP;
  
END $$;

-- ============================================================================
-- 3. Verify creation
-- ============================================================================

-- Count configs
DO $$
DECLARE
  v_config_count INTEGER;
  v_session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_config_count FROM public.one_v_one_configs;
  SELECT COUNT(*) INTO v_session_count FROM public.one_v_one_sessions;
  
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Configs created: % (expected: 24 = 8 games × 3 tiers)', v_config_count;
  RAISE NOTICE 'Sessions created: % (expected: 24)', v_session_count;
  RAISE NOTICE '';
  RAISE NOTICE '📊 PRIZE TIERS:';
  RAISE NOTICE '  💰 Tier 1: $2 Prize   → 2 tokens entry   → Winner gets 3.40 tokens';
  RAISE NOTICE '  💰 Tier 2: $10 Prize  → 5 tokens entry   → Winner gets 8.50 tokens';
  RAISE NOTICE '  💰 Tier 3: $25 Prize  → 12.50 tokens entry → Winner gets 21.25 tokens';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 GAMES:';
  RAISE NOTICE '  ⚔️  Sword Slash';
  RAISE NOTICE '  🛡️  Blade Bounce';
  RAISE NOTICE '  🚀 Laser Dodge';
  RAISE NOTICE '  🎯 Multi-Target';
  RAISE NOTICE '  💰 Coin Catch';
  RAISE NOTICE '  🎨 Color Memory';
  RAISE NOTICE '  💵 Cash Stack';
  RAISE NOTICE '  ⚡ Quick Click';
END $$;

-- Display all configs
SELECT 
  game_type,
  title,
  entry_fee,
  winner_prize,
  platform_fee,
  prize_pool as total_pool
FROM public.one_v_one_configs
ORDER BY game_type, entry_fee;

