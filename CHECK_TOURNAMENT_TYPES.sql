-- CHECK VALID TOURNAMENT TYPES
-- This shows what tournament types are allowed in the check constraint

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.fixed_games_config'::regclass 
AND contype = 'c';

-- Also show existing tournament types in the table
SELECT DISTINCT tournament_type, COUNT(*) as count
FROM public.fixed_games_config 
GROUP BY tournament_type
ORDER BY tournament_type;
