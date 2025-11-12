-- ============================================================================
-- FIX CASH STACK GAME TYPE
-- Update all cash_stack game types to falling_object for consistency
-- ============================================================================

-- Update hot_sell_configs
UPDATE public.hot_sell_configs
SET game_type = 'falling_object'
WHERE game_type = 'cash_stack';

SELECT '✅ Updated hot_sell_configs: ' || COUNT(*) || ' configs changed to falling_object' as result
FROM public.hot_sell_configs
WHERE game_type = 'falling_object';

-- Verification
SELECT '📊 Game Type Distribution in hot_sell_configs:' as info;
SELECT game_type, COUNT(*) as count 
FROM public.hot_sell_configs 
GROUP BY game_type 
ORDER BY count DESC;

