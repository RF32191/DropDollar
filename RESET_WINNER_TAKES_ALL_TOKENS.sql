-- RESET WINNER TAKES IT ALL SESSIONS TO 0 TOKENS
-- This resets all Winner Takes It All tournament sessions to start fresh

-- Reset current_pot to 0 for all Winner Takes It All sessions
UPDATE public.hot_sell_sessions 
SET current_pot = 0
WHERE config_id IN (
  SELECT id FROM public.fixed_games_config 
  WHERE title LIKE '%Winner Takes It All%'
);

-- Reset participants_count to 0 for all Winner Takes It All sessions
UPDATE public.hot_sell_sessions 
SET participants_count = 0
WHERE config_id IN (
  SELECT id FROM public.fixed_games_config 
  WHERE title LIKE '%Winner Takes It All%'
);

-- Reset status to 'waiting' for all Winner Takes It All sessions
UPDATE public.hot_sell_sessions 
SET status = 'waiting'
WHERE config_id IN (
  SELECT id FROM public.fixed_games_config 
  WHERE title LIKE '%Winner Takes It All%'
);

-- Clear any existing participants for Winner Takes It All tournaments
DELETE FROM public.fixed_game_participants 
WHERE game_id IN (
  SELECT afg.id FROM public.active_fixed_games afg
  JOIN public.hot_sell_sessions hss ON afg.config_id = hss.config_id
  WHERE hss.config_id IN (
    SELECT id FROM public.fixed_games_config 
    WHERE title LIKE '%Winner Takes It All%'
  )
);

-- Clear the game_id reference in hot_sell_sessions to break foreign key constraints
UPDATE public.hot_sell_sessions 
SET game_id = NULL
WHERE config_id IN (
  SELECT id FROM public.fixed_games_config 
  WHERE title LIKE '%Winner Takes It All%'
);

-- Delete active_fixed_games for Winner Takes It All tournaments
DELETE FROM public.active_fixed_games 
WHERE config_id IN (
  SELECT id FROM public.fixed_games_config 
  WHERE title LIKE '%Winner Takes It All%'
);

SELECT 'Winner Takes It All sessions reset to 0 tokens!' as status;
