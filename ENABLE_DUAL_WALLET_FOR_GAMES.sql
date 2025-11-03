-- ============================================================================
-- ENABLE DUAL WALLET FOR GAMES
-- ============================================================================
-- This ensures all necessary functions exist for games to work with dual wallet
-- Run this SQL to fix "games locked" issue
-- ============================================================================

-- ============================================================================
-- 1. Create/Update get_total_tokens function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_total_tokens(user_id_param UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0)
  INTO total
  FROM public.users
  WHERE id = user_id_param;
  
  RETURN COALESCE(total, 0);
END;
$$;

-- ============================================================================
-- 2. Create/Update spend_tokens function (purchased first, then won)
-- ============================================================================

CREATE OR REPLACE FUNCTION spend_tokens(
  user_id_param UUID,
  amount DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  purchased_spent DECIMAL(10,2),
  won_spent DECIMAL(10,2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_purchased DECIMAL(10,2);
  current_won DECIMAL(10,2);
  total_available DECIMAL(10,2);
  purchased_to_spend DECIMAL(10,2);
  won_to_spend DECIMAL(10,2);
BEGIN
  -- Get current balances
  SELECT 
    COALESCE(purchased_tokens, 0),
    COALESCE(won_tokens, 0)
  INTO current_purchased, current_won
  FROM public.users
  WHERE id = user_id_param;
  
  total_available := current_purchased + current_won;
  
  -- Check if user has enough tokens
  IF total_available < amount THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::DECIMAL(10,2), 
      0::DECIMAL(10,2),
      'Insufficient tokens. Need ' || amount::TEXT || ', have ' || total_available::TEXT;
    RETURN;
  END IF;
  
  -- Calculate how much to spend from each wallet
  IF current_purchased >= amount THEN
    -- Can pay entirely from purchased
    purchased_to_spend := amount;
    won_to_spend := 0;
  ELSE
    -- Need to use both wallets
    purchased_to_spend := current_purchased;
    won_to_spend := amount - current_purchased;
  END IF;
  
  -- Update balances
  UPDATE public.users
  SET 
    purchased_tokens = purchased_tokens - purchased_to_spend,
    won_tokens = won_tokens - won_to_spend,
    updated_at = NOW()
  WHERE id = user_id_param;
  
  RETURN QUERY SELECT 
    TRUE, 
    purchased_to_spend, 
    won_to_spend,
    'Successfully spent ' || amount::TEXT || ' tokens';
END;
$$;

-- ============================================================================
-- 3. Test the functions
-- ============================================================================

-- Check your token balance
SELECT 
  id,
  email,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  get_total_tokens(id) as total_available
FROM public.users
WHERE 
  email ILIKE '%ryanrfermoselle%' OR
  email ILIKE '%ryanfermoselle%' OR
  email ILIKE '%rf32191%'
ORDER BY email;

-- ============================================================================
-- DONE!
-- ============================================================================
-- ✅ get_total_tokens() - returns combined balance
-- ✅ spend_tokens() - spends purchased first, then won
-- ✅ Games should now be unlocked!
-- 
-- If games are still locked, log out and log back in
-- ============================================================================

