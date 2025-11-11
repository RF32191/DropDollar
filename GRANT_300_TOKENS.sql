-- ============================================================================
-- GRANT 300 TOKENS TO rfermoselle@avidbio.com
-- ============================================================================
-- Add 300 tokens to purchased_tokens (gameplay wallet, non-cashable)
-- ============================================================================

BEGIN;

SELECT '💰 Granting 300 tokens to rfermoselle@avidbio.com...' as step;

-- Find the user
DO $$
DECLARE
  v_user_id UUID;
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Get user ID and current balance
  SELECT id, purchased_tokens 
  INTO v_user_id, v_old_balance
  FROM public.users 
  WHERE email = 'rfermoselle@avidbio.com'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: rfermoselle@avidbio.com';
  END IF;
  
  -- Add 300 tokens to purchased_tokens (gameplay wallet)
  UPDATE public.users
  SET 
    purchased_tokens = purchased_tokens + 300,
    updated_at = NOW()
  WHERE id = v_user_id
  RETURNING purchased_tokens INTO v_new_balance;
  
  RAISE NOTICE '✅ User found: %', v_user_id;
  RAISE NOTICE '💵 Old balance: % tokens', v_old_balance;
  RAISE NOTICE '💵 New balance: % tokens', v_new_balance;
  RAISE NOTICE '💰 Added: 300 tokens';
  
  -- Create a transaction record
  INSERT INTO public.token_transactions (
    user_id,
    type,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    created_at
  ) VALUES (
    v_user_id,
    'credit',
    'admin_grant',
    300,
    v_old_balance,
    v_new_balance,
    'Admin grant: 300 gameplay tokens',
    NOW()
  );
  
  RAISE NOTICE '✅ Transaction record created';
  
END $$;

COMMIT;

SELECT '🎉 ================================' as message;
SELECT '🎉 TOKENS GRANTED!' as message;
SELECT '🎉 ================================' as message;
SELECT '✅ User: rfermoselle@avidbio.com' as status;
SELECT '✅ Amount: 300 tokens' as status;
SELECT '✅ Type: Gameplay wallet (non-cashable)' as status;
SELECT '✅ Transaction recorded' as status;
SELECT '🎉 ================================' as message;

-- Verification
SELECT 
  '📊 User Balance Verification' as info,
  email,
  purchased_tokens as gameplay_tokens,
  won_tokens as cashable_tokens,
  (purchased_tokens + won_tokens) as total_tokens
FROM public.users
WHERE email = 'rfermoselle@avidbio.com';

-- Show recent transaction
SELECT 
  '📊 Recent Transaction' as info,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  description,
  created_at
FROM public.token_transactions
WHERE user_id = (SELECT id FROM public.users WHERE email = 'rfermoselle@avidbio.com' LIMIT 1)
ORDER BY created_at DESC
LIMIT 1;
