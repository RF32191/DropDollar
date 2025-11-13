-- ============================================================================
-- FIX COIN CATCH / CASH STACK GAME TYPE
-- Update all cash_stack, coin_catch, and similar game types to falling_object
-- This ensures consistent game type naming for the CashStackGame3D component
-- ============================================================================

-- Update hot_sell_configs
UPDATE public.hot_sell_configs
SET game_type = 'falling_object'
WHERE game_type IN ('cash_stack', 'coin_catch', 'coin_catcher', 'cash_catch');

SELECT '✅ Updated hot_sell_configs: ' || COUNT(*) || ' configs now use falling_object' as result
FROM public.hot_sell_configs
WHERE game_type = 'falling_object';

-- Update winner_takes_all_configs if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'winner_takes_all_configs') THEN
    UPDATE public.winner_takes_all_configs
    SET game_type = 'falling_object'
    WHERE game_type IN ('cash_stack', 'coin_catch', 'coin_catcher', 'cash_catch');
    
    RAISE NOTICE '✅ Updated winner_takes_all_configs';
  END IF;
END $$;

-- Verification: Show all game types
SELECT '📊 Game Type Distribution in hot_sell_configs:' as info;
SELECT game_type, COUNT(*) as count, 
       STRING_AGG(title, ', ' ORDER BY title) as listings
FROM public.hot_sell_configs 
GROUP BY game_type 
ORDER BY count DESC;

SELECT '✅ All Coin Catch / Cash Stack listings now use falling_object game type!' as final_message;

