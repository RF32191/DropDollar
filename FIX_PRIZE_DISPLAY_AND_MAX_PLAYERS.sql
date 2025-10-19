-- FIX PRIZE DISPLAY AND MAX PLAYERS - TARGETED FIXES
-- This fixes the $2 Hot Sell prize display and Winner Takes It All max players

-- 1. Fix $2 Hot Sell prize display (should show $1.50 and $0.35, not $200 and $35)
-- The issue is in the frontend calculation, but let's ensure the database is correct
UPDATE public.fixed_games_config 
SET 
  max_participants = 2,
  prize_pool = 200, -- $2 total (200 cents)
  description = '2-player tournament! 1st gets $1.50, 2nd gets $0.35. Platform fee: $0.15'
WHERE title LIKE '%$2 Hot Sell%';

-- 2. Fix Winner Takes It All max players to 2
UPDATE public.fixed_games_config 
SET 
  max_participants = 2,
  description = '2-player tournament! Winner takes everything! Base pot: $3, grows with each player.'
WHERE title LIKE '%Winner Takes It All%';

-- 3. Ensure all configs have sessions
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

SELECT 'Prize display and max players fixed!' as status;
