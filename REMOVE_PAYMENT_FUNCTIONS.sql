-- REMOVE_PAYMENT_FUNCTIONS.sql
-- This script removes the payment functions that were interfering with normal game flow

-- Remove the payment functions that were causing issues
DROP FUNCTION IF EXISTS public.pay_winner_based_on_score(UUID);
DROP FUNCTION IF EXISTS public.pay_winner_by_config(TEXT);

-- Reset any sessions that were marked as completed by the payment system
UPDATE public.winner_takes_all_sessions
SET 
    status = 'waiting',
    winner_user_id = NULL,
    prize_amount = NULL,
    platform_fee = NULL,
    updated_at = NOW()
WHERE status = 'completed';

-- Show current state
SELECT 
    'Sessions Reset to Waiting' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;

SELECT 'Payment functions removed and sessions reset!' as final_status;
