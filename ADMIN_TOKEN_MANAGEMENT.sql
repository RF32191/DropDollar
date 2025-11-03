-- ============================================================================
-- ADMIN TOKEN MANAGEMENT TOOLS
-- ============================================================================
-- Functions to manage user token balances as admin
-- ============================================================================

-- ============================================================================
-- 1. VIEW: Quick user token lookup
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_get_user_tokens(p_email TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  username TEXT,
  old_tokens DECIMAL(10,2),
  purchased_tokens DECIMAL(10,2),
  won_tokens DECIMAL(10,2),
  total_tokens DECIMAL(10,2),
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.username,
    COALESCE(u.tokens, 0),
    COALESCE(u.purchased_tokens, 0),
    COALESCE(u.won_tokens, 0),
    COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0) as total,
    u.created_at,
    u.last_login
  FROM public.users u
  WHERE u.email ILIKE p_email;
END;
$$;

-- ============================================================================
-- 2. ADD PURCHASED TOKENS (for admin-granted tokens)
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

  -- Log the transaction
  INSERT INTO public.token_transactions (
    user_id,
    transaction_type,
    amount,
    wallet_type,
    balance_before,
    balance_after,
    description
  ) VALUES (
    v_user_id,
    'admin_grant',
    p_amount,
    'purchased',
    v_old_purchased,
    v_new_purchased,
    COALESCE(p_admin_note, 'Admin granted tokens')
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
-- 3. MOVE TOKENS BETWEEN WALLETS (emergency use only)
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_move_to_purchased(
  p_user_email TEXT,
  p_amount DECIMAL(10,2),
  p_reason TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_won_balance DECIMAL(10,2);
BEGIN
  -- Get user
  SELECT id, COALESCE(won_tokens, 0)
  INTO v_user_id, v_won_balance
  FROM public.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found';
    RETURN;
  END IF;

  IF v_won_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, 'Insufficient won tokens';
    RETURN;
  END IF;

  -- Move tokens
  UPDATE public.users
  SET 
    won_tokens = won_tokens - p_amount,
    purchased_tokens = purchased_tokens + p_amount,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Log
  INSERT INTO public.token_transactions (
    user_id,
    transaction_type,
    amount,
    wallet_type,
    description
  ) VALUES (
    v_user_id,
    'admin_wallet_transfer',
    p_amount,
    'purchased',
    'Admin moved from won to purchased: ' || p_reason
  );

  RETURN QUERY SELECT TRUE, 'Tokens moved to purchased wallet';
END;
$$;

-- ============================================================================
-- 4. VIEW ALL USERS WITH TOKEN BALANCES
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_list_all_balances()
RETURNS TABLE (
  email TEXT,
  username TEXT,
  purchased DECIMAL(10,2),
  won DECIMAL(10,2),
  total DECIMAL(10,2),
  last_transaction TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.email,
    u.username,
    COALESCE(u.purchased_tokens, 0),
    COALESCE(u.won_tokens, 0),
    COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0) as total,
    (
      SELECT MAX(tt.created_at) 
      FROM public.token_transactions tt 
      WHERE tt.user_id = u.id
    ) as last_transaction
  FROM public.users u
  WHERE (COALESCE(u.purchased_tokens, 0) + COALESCE(u.won_tokens, 0)) > 0
  ORDER BY total DESC;
END;
$$;

-- ============================================================================
-- USAGE EXAMPLES:
-- ============================================================================

-- View a user's tokens
-- SELECT * FROM admin_get_user_tokens('user@example.com');

-- Add purchased tokens (admin grant)
-- SELECT * FROM admin_add_purchased_tokens('user@example.com', 50.00, 'Promotional bonus');

-- Move won tokens to purchased (emergency)
-- SELECT * FROM admin_move_to_purchased('user@example.com', 10.00, 'User requested non-cashout');

-- List all balances
-- SELECT * FROM admin_list_all_balances();

-- ============================================================================

