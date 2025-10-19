-- COMPREHENSIVE WINNER TAKES IT ALL SYSTEM
-- This creates Winner Takes It All tournaments with proper timer and base price system

-- 1. Add Winner Takes It All tournaments
INSERT INTO public.fixed_games_config (
  id,
  game_type,
  tournament_type,
  title,
  description,
  entry_fee,
  prize_pool,
  max_participants,
  game_duration,
  rng_seed,
  created_at
) VALUES 
-- $100 Winner Takes It All
(
  gen_random_uuid(),
  'laser_dodge',
  'hot_sell',
  '$100 Winner Takes It All - Laser Dodge',
  'Winner takes 85% of the pot! Unlimited players, base price $10',
  1,
  100,
  999999, -- Simulates unlimited
  120,
  17,
  NOW()
),
-- $250 Winner Takes It All
(
  gen_random_uuid(),
  'multi_target',
  'hot_sell',
  '$250 Winner Takes It All - Multi Target',
  'Winner takes 85% of the pot! Unlimited players, base price $25',
  1,
  250,
  999999, -- Simulates unlimited
  90,
  18,
  NOW()
),
-- $1000 Winner Takes It All
(
  gen_random_uuid(),
  'sword_parry',
  'hot_sell',
  '$1000 Winner Takes It All - Sword Parry',
  'Winner takes 85% of the pot! Unlimited players, base price $100',
  1,
  1000,
  999999, -- Simulates unlimited
  180,
  19,
  NOW()
);

-- 2. Create sessions for all Winner Takes It All configs
DO $$
DECLARE
  config_rec RECORD;
  session_exists BOOLEAN;
  base_price INTEGER;
BEGIN
  FOR config_rec IN SELECT * FROM public.fixed_games_config WHERE title LIKE '%Winner Takes It All%' LOOP
    -- Calculate base price (10% of total prize)
    base_price := CEIL(config_rec.prize_pool * 0.1);
    
    -- Check if session already exists
    SELECT EXISTS(
      SELECT 1 FROM public.hot_sell_sessions 
      WHERE config_id = config_rec.id
    ) INTO session_exists;
    
    -- Create session if it doesn't exist
    IF NOT session_exists THEN
      INSERT INTO public.hot_sell_sessions (
        id,
        config_id,
        current_pot,
        target_pot,
        base_price,
        participants_count,
        status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        config_rec.id,
        0, -- Start with empty pot
        config_rec.prize_pool, -- Target is full prize pool
        base_price, -- Base price is 10% of prize pool
        0, -- Start with 0 participants
        'waiting', -- Waiting for base price
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Created Winner Takes It All session for config: % (Base Price: $%)', config_rec.title, base_price;
    END IF;
  END LOOP;
END $$;

-- 3. Create function to update Winner Takes It All timer status
CREATE OR REPLACE FUNCTION update_winner_takes_all_status()
RETURNS TRIGGER AS $$
DECLARE
  session_record RECORD;
BEGIN
  -- Get session details
  SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = NEW.session_id;
  
  IF session_record IS NOT NULL THEN
    -- Check if base price is met
    IF session_record.current_pot >= session_record.base_price THEN
      -- Update session status to active (timer starts)
      UPDATE public.hot_sell_sessions 
      SET 
        status = 'active',
        timer_started_at = NOW(),
        updated_at = NOW()
      WHERE id = NEW.session_id;
      
      RAISE NOTICE 'Winner Takes It All timer started for session: %', NEW.session_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to automatically start timer when base price is met
DROP TRIGGER IF EXISTS trigger_update_winner_takes_all_status ON public.fixed_game_participants;
CREATE TRIGGER trigger_update_winner_takes_all_status
  AFTER INSERT ON public.fixed_game_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_winner_takes_all_status();

-- 5. Create function to get Winner Takes It All timer status
CREATE OR REPLACE FUNCTION get_winner_takes_all_timer_status(p_session_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  config_record RECORD;
  result JSONB;
  time_remaining INTEGER;
  is_timer_active BOOLEAN;
BEGIN
  -- Get session details
  SELECT * INTO session_record FROM public.hot_sell_sessions WHERE id = p_session_id::UUID;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Session not found');
  END IF;
  
  -- Get config details
  SELECT * INTO config_record FROM public.fixed_games_config WHERE id = session_record.config_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Config not found');
  END IF;
  
  -- Check if timer is active
  is_timer_active := session_record.status = 'active' AND session_record.timer_started_at IS NOT NULL;
  
  -- Calculate time remaining if timer is active
  IF is_timer_active THEN
    time_remaining := GREATEST(0, config_record.game_duration - EXTRACT(EPOCH FROM (NOW() - session_record.timer_started_at))::INTEGER);
  ELSE
    time_remaining := 0;
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'sessionId', session_record.id,
    'currentPot', session_record.current_pot,
    'basePrice', session_record.base_price,
    'targetPot', session_record.target_pot,
    'participantsCount', session_record.participants_count,
    'status', session_record.status,
    'isTimerActive', is_timer_active,
    'timeRemaining', time_remaining,
    'gameDuration', config_record.game_duration,
    'isBasePriceMet', session_record.current_pot >= session_record.base_price,
    'canJoin', session_record.current_pot >= session_record.base_price,
    'isHotSell', false -- Winner Takes It All doesn't have hot sell mode
  );
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_winner_takes_all_timer_status(TEXT) TO authenticated, anon;

SELECT 'Winner Takes It All system created successfully with timer support!' as status;
