-- Update prize pools to correct values
-- Fix $100 Daily Hot Sell to $150 based on price and max users

-- Update the $100 Daily Hot Sell to $150
UPDATE public.fixed_games_config 
SET prize_pool = 150 
WHERE title = '$100 Daily Hot Sell' AND tournament_type = 'hot_sell';

-- Verify the update
SELECT id, title, prize_pool, max_participants, entry_fee 
FROM public.fixed_games_config 
WHERE tournament_type = 'hot_sell' 
ORDER BY prize_pool ASC;
