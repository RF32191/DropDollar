-- ============================================
-- COMPLETE MARKETPLACE AUTOMATION SYSTEM
-- ============================================
-- Automated admin messages to winners & sellers
-- Address management for shipping
-- One-click seller payout system
-- ============================================

-- Step 1: Add shipping address fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS shipping_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS shipping_city TEXT,
ADD COLUMN IF NOT EXISTS shipping_state TEXT,
ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT,
ADD COLUMN IF NOT EXISTS shipping_country TEXT DEFAULT 'United States',
ADD COLUMN IF NOT EXISTS shipping_phone TEXT;

-- Step 2: Create system user for automated messages
DO $$
DECLARE
  v_system_user_id UUID;
BEGIN
  -- Check if system user exists
  SELECT id INTO v_system_user_id
  FROM auth.users
  WHERE email = 'system@dropdollar.com';
  
  IF v_system_user_id IS NULL THEN
    -- Create system user in auth
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role
    ) VALUES (
      gen_random_uuid(),
      'system@dropdollar.com',
      crypt('SystemUser2024!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"DropDollar System"}',
      false,
      'authenticated'
    )
    RETURNING id INTO v_system_user_id;
    
    -- Create corresponding public user
    INSERT INTO public.users (
      id,
      email,
      username,
      full_name,
      purchased_tokens,
      won_tokens,
      created_at,
      updated_at
    ) VALUES (
      v_system_user_id,
      'system@dropdollar.com',
      'DropDollar_System',
      'DropDollar System',
      0,
      0,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Created system user: %', v_system_user_id;
  ELSE
    RAISE NOTICE '✅ System user already exists: %', v_system_user_id;
  END IF;
END $$;

-- Step 3: Create automated message sending function
CREATE OR REPLACE FUNCTION send_automated_marketplace_message(
  p_recipient_id UUID,
  p_message_type TEXT, -- 'winner_prompt', 'seller_notification'
  p_listing_id UUID,
  p_winner_id UUID DEFAULT NULL,
  p_prize_amount NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_system_user_id UUID;
  v_conversation_id UUID;
  v_message_id UUID;
  v_listing_title TEXT;
  v_message_text TEXT;
  v_listing_image TEXT;
BEGIN
  -- Get system user ID
  SELECT id INTO v_system_user_id
  FROM public.users
  WHERE email = 'system@dropdollar.com';
  
  IF v_system_user_id IS NULL THEN
    RAISE EXCEPTION 'System user not found. Please run setup SQL first.';
  END IF;
  
  -- Get listing details
  SELECT title, image_urls->0 INTO v_listing_title, v_listing_image
  FROM public.marketplace_listings
  WHERE id = p_listing_id;
  
  -- Create message based on type
  IF p_message_type = 'winner_prompt' THEN
    v_message_text := format(
      '🎉 Congratulations! You won: %s

🏆 You are the winner of this marketplace competition!

📦 NEXT STEP: Please provide your shipping address so the seller can send you your prize.

📍 To provide your address:
1. Go to your Profile page
2. Update your shipping address
3. We''ll notify the seller automatically

Your address will be securely saved for future prizes.',
      v_listing_title
    );
  ELSIF p_message_type = 'seller_notification' THEN
    v_message_text := format(
      '💰 Sale Complete: %s

✅ A winner has been determined for your listing!

💵 Prize Pool Collected: %s tokens
📦 Listing: %s

🎯 NEXT STEP: Once the winner provides their shipping address, you''ll receive another message with:
- Winner''s shipping details
- Button to release funds to your wallet

The %s tokens are currently held in escrow and will be transferred to your wallet after you confirm shipment.',
      v_listing_title,
      p_prize_amount,
      v_listing_title,
      p_prize_amount
    );
  ELSE
    RAISE EXCEPTION 'Unknown message type: %', p_message_type;
  END IF;
  
  -- Find or create conversation between system and recipient
  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  INNER JOIN public.conversation_participants cp1 ON cp1.conversation_id = c.id
  INNER JOIN public.conversation_participants cp2 ON cp2.conversation_id = c.id
  WHERE cp1.user_id = v_system_user_id
    AND cp2.user_id = p_recipient_id
    AND c.conversation_type = 'direct'
  LIMIT 1;
  
  -- Create conversation if it doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (
      id,
      title,
      conversation_type,
      created_by,
      created_at,
      updated_at,
      last_message_at
    ) VALUES (
      gen_random_uuid(),
      'DropDollar System',
      'direct',
      v_system_user_id,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_conversation_id;
    
    -- Add participants
    INSERT INTO public.conversation_participants (conversation_id, user_id, role, joined_at, is_active)
    VALUES 
      (v_conversation_id, v_system_user_id, 'owner', NOW(), true),
      (v_conversation_id, p_recipient_id, 'member', NOW(), true);
  END IF;
  
  -- Send the message
  INSERT INTO public.messages (
    id,
    conversation_id,
    sender_id,
    message_text,
    message_type,
    metadata,
    is_read,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_conversation_id,
    v_system_user_id,
    v_message_text,
    'system',
    jsonb_build_object(
      'listing_id', p_listing_id,
      'message_type', p_message_type,
      'winner_id', p_winner_id,
      'prize_amount', p_prize_amount
    ),
    false,
    NOW()
  )
  RETURNING id INTO v_message_id;
  
  -- Update conversation last message time
  UPDATE public.conversations
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = v_conversation_id;
  
  RETURN v_message_id;
END;
$$;

-- Step 4: Function to notify winner (asks for address)
CREATE OR REPLACE FUNCTION notify_marketplace_winner(
  p_listing_id UUID,
  p_winner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Send automated message to winner
  SELECT send_automated_marketplace_message(
    p_winner_id,
    'winner_prompt',
    p_listing_id,
    p_winner_id,
    NULL
  ) INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;

-- Step 5: Function to notify seller (with payout info)
CREATE OR REPLACE FUNCTION notify_marketplace_seller(
  p_listing_id UUID,
  p_winner_id UUID,
  p_prize_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
  v_seller_id UUID;
BEGIN
  -- Get seller ID
  SELECT seller_id INTO v_seller_id
  FROM public.marketplace_listings
  WHERE id = p_listing_id;
  
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found or has no seller';
  END IF;
  
  -- Send automated message to seller
  SELECT send_automated_marketplace_message(
    v_seller_id,
    'seller_notification',
    p_listing_id,
    p_winner_id,
    p_prize_amount
  ) INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;

-- Step 6: Update user shipping address function
CREATE OR REPLACE FUNCTION update_user_shipping_address(
  p_user_id UUID,
  p_address_line1 TEXT,
  p_address_line2 TEXT,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_country TEXT,
  p_phone TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET 
    shipping_address_line1 = p_address_line1,
    shipping_address_line2 = p_address_line2,
    shipping_city = p_city,
    shipping_state = p_state,
    shipping_postal_code = p_postal_code,
    shipping_country = p_country,
    shipping_phone = p_phone,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Step 7: Get user shipping address function
CREATE OR REPLACE FUNCTION get_user_shipping_address(p_user_id UUID)
RETURNS TABLE (
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
    shipping_phone
  FROM public.users
  WHERE id = p_user_id;
END;
$$;

-- Step 8: Seller payout function (releases escrow to seller wallet)
CREATE OR REPLACE FUNCTION release_marketplace_funds_to_seller(
  p_listing_id UUID,
  p_seller_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prize_amount NUMERIC;
  v_actual_seller_id UUID;
BEGIN
  -- Verify seller owns the listing
  SELECT seller_id, prize_pool INTO v_actual_seller_id, v_prize_amount
  FROM public.marketplace_listings
  WHERE id = p_listing_id;
  
  IF v_actual_seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  
  IF v_actual_seller_id != p_seller_id THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this listing';
  END IF;
  
  -- Transfer tokens from escrow to seller's won_tokens
  UPDATE public.users
  SET 
    won_tokens = won_tokens + v_prize_amount,
    updated_at = NOW()
  WHERE id = p_seller_id;
  
  -- Mark listing as paid out
  UPDATE public.marketplace_listings
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_listing_id;
  
  RETURN true;
END;
$$;

-- Step 9: Grant permissions
GRANT EXECUTE ON FUNCTION send_automated_marketplace_message(UUID, TEXT, UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_marketplace_winner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_marketplace_seller(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_shipping_address(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_shipping_address(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION release_marketplace_funds_to_seller(UUID, UUID) TO authenticated;

-- Step 10: Create index for faster message loading
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender 
ON public.messages (conversation_id, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_metadata_listing
ON public.messages USING gin (metadata);

-- ============================================
-- SUCCESS!
-- ============================================
-- ✅ System user created for automated messages
-- ✅ Shipping address fields added to users
-- ✅ Automated winner notification (asks for address)
-- ✅ Automated seller notification (with payout info)
-- ✅ Address management functions
-- ✅ Seller payout function (one-click release)
-- ✅ Performance indexes added
-- ============================================

-- Test queries (uncomment to test):
-- SELECT * FROM public.users WHERE email = 'system@dropdollar.com';
-- SELECT * FROM get_user_shipping_address('your-user-id-here');

