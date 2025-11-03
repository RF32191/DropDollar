-- ============================================================================
-- COMPLETE SQL TO GRANT 300 TOKENS (FINAL FIX)
-- ============================================================================
-- Copy and paste this ENTIRE file into Supabase SQL Editor and run it
-- ============================================================================

-- ============================================================================
-- STEP 1: Create the admin function (FIXED - added type column)
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_add_purchased_tokens(
  p_user_email TEXT,
  p_amount DECIMAL(10,2),
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  user_email TEXT,
  old_balance DECIMAL(10,2),
  new_balance DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_old_purchased DECIMAL(10,2);
  v_new_purchased DECIMAL(10,2);
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Amount must be positive', p_user_email, 0::DECIMAL, 0::DECIMAL;
    RETURN;
  END IF;

  -- Get user
  SELECT id, COALESCE(purchased_tokens, 0)
  INTO v_user_id, v_old_purchased
  FROM public.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found', p_user_email, 0::DECIMAL, 0::DECIMAL;
    RETURN;
  END IF;

  -- Add tokens
  UPDATE public.users
  SET purchased_tokens = COALESCE(purchased_tokens, 0) + p_amount,
      updated_at = NOW()
  WHERE id = v_user_id
  RETURNING COALESCE(purchased_tokens, 0) INTO v_new_purchased;

  -- Log the transaction (added type column)
  INSERT INTO public.token_transactions (
    user_id,
    type,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description
  ) VALUES (
    v_user_id,
    'credit',
    'admin_grant',
    p_amount,
    v_old_purchased,
    v_new_purchased,
    COALESCE(p_admin_note, 'Admin granted tokens to purchased wallet')
  );

  RETURN QUERY SELECT 
    TRUE, 
    'Tokens added successfully',
    p_user_email,
    v_old_purchased,
    v_new_purchased;
END;
$$;

-- ============================================================================
-- STEP 2: Grant 300 tokens to each account
-- ============================================================================

-- Account 1: ryanrfermoselle@yahoo.com (with RF)
SELECT * FROM admin_add_purchased_tokens(
  'ryanrfermoselle@yahoo.com',
  300.00,
  'Admin promotional grant - 300 tokens'
);

-- Account 2: ryanfermoselle@yahoo.com (without R)
SELECT * FROM admin_add_purchased_tokens(
  'ryanfermoselle@yahoo.com',
  300.00,
  'Admin promotional grant - 300 tokens'
);

-- Account 3: rf32191@gmail.com
SELECT * FROM admin_add_purchased_tokens(
  'rf32191@gmail.com',
  300.00,
  'Admin promotional grant - 300 tokens'
);

-- ============================================================================
-- STEP 3: Verify the balances
-- ============================================================================

SELECT 
  email,
  username,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total
FROM public.users
WHERE email IN (
  'ryanrfermoselle@yahoo.com',
  'ryanfermoselle@yahoo.com',
  'rf32191@gmail.com'
)
ORDER BY email;

-- ============================================================================
-- DONE! You should see:
-- ✅ 3 success messages
-- ✅ Each account with 300 purchased tokens
-- ✅ Total balance = 300 for each (or more if they had tokens already)
-- ============================================================================

