-- SYNC DATABASE WITH FRONTEND CONFIGURATIONS
-- This ensures database matches the hard-coded frontend values

-- Update existing configs to match frontend hard-coded values
UPDATE public.fixed_games_config 
SET 
  entry_fee = 1,
  max_participants = CASE 
    WHEN title LIKE '%$2 Hot Sell%' THEN 2
    WHEN title LIKE '%$3 Hot Sell%' THEN 2
    WHEN title LIKE '%$10%' THEN 10
    WHEN title LIKE '%$100%' THEN 100
    WHEN title LIKE '%$250%' THEN 250
    WHEN title LIKE '%$1000%' THEN 1000
    WHEN title LIKE '%$2500%' THEN 2500
    ELSE max_participants
  END,
  prize_pool = CASE 
    WHEN title LIKE '%$2 Hot Sell%' THEN 2
    WHEN title LIKE '%$3 Hot Sell%' THEN 3
    WHEN title LIKE '%$10%' THEN 10
    WHEN title LIKE '%$100%' THEN 100
    WHEN title LIKE '%$250%' THEN 250
    WHEN title LIKE '%$1000%' THEN 1000
    WHEN title LIKE '%$2500%' THEN 2500
    ELSE prize_pool
  END
WHERE tournament_type = 'hot_sell';

-- Ensure all configs have sessions
DO $$
DECLARE
  config_rec RECORD;
  session_exists BOOLEAN;
BEGIN
  FOR config_rec IN SELECT * FROM public.fixed_games_config LOOP
    -- Check if session already exists
    SELECT EXISTS(
      SELECT 1 FROM public.hot_sell_sessions 
      WHERE config_id = config_rec.id
    ) INTO session_exists;
    
    -- Create session if it doesn't exist
    IF NOT session_exists THEN
      PERFORM create_hot_sell_session(config_rec.id::TEXT);
      RAISE NOTICE 'Created session for config: %', config_rec.title;
    END IF;
  END LOOP;
END $$;

SELECT 'Database synced with frontend configurations!' as status;
