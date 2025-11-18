-- ============================================
-- ADD CLAIM PRIZE SYSTEM
-- ============================================
-- Winner claims prize and sends address to seller
-- ============================================

-- Function to send winner's address to seller
CREATE OR REPLACE FUNCTION public.send_winner_address_to_seller(
    p_listing_id UUID,
    p_winner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_system_user_id UUID;
    v_seller_id UUID;
    v_listing_title TEXT;
    v_winner_username TEXT;
    v_winner_address TEXT;
    v_message_id UUID;
    v_prize_amount NUMERIC;
BEGIN
    -- Get system user
    SELECT id INTO v_system_user_id
    FROM public.users
    WHERE email = 'system@dropdollar.com';
    
    IF v_system_user_id IS NULL THEN
        RAISE EXCEPTION 'System user not found';
    END IF;
    
    -- Get listing and winner details
    SELECT 
        ml.seller_id,
        ml.title,
        u.username,
        u.shipping_address_line1 || 
        COALESCE(E'\n' || u.shipping_address_line2, '') ||
        E'\n' || u.shipping_city || ', ' || u.shipping_state || ' ' || u.shipping_postal_code ||
        COALESCE(E'\nPhone: ' || u.shipping_phone, '')
    INTO v_seller_id, v_listing_title, v_winner_username, v_winner_address
    FROM public.marketplace_listings ml
    JOIN public.users u ON u.id = p_winner_id
    WHERE ml.id = p_listing_id;
    
    -- Get prize amount
    SELECT prize_pool * 0.85 INTO v_prize_amount
    FROM public.marketplace_sessions
    WHERE listing_id = p_listing_id
    ORDER BY completed_at DESC
    LIMIT 1;
    
    -- Send message to seller with winner's address
    v_message_id := send_automated_marketplace_message(
        v_seller_id,
        'seller_ship_notification',
        p_listing_id,
        p_winner_id,
        v_prize_amount
    );
    
    -- Mark listing as address_provided
    UPDATE public.marketplace_listings
    SET 
        status = 'address_provided',
        updated_at = NOW()
    WHERE id = p_listing_id;
    
    RETURN v_message_id;
END;
$$;

-- Update send_automated_marketplace_message to handle new message type
CREATE OR REPLACE FUNCTION send_automated_marketplace_message(
  p_recipient_id UUID,
  p_message_type TEXT,
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
  v_winner_username TEXT;
  v_winner_address TEXT;
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
  
  -- Get winner details if needed
  IF p_winner_id IS NOT NULL THEN
    SELECT 
        username,
        shipping_address_line1 || 
        COALESCE(E'\n' || shipping_address_line2, '') ||
        E'\n' || shipping_city || ', ' || shipping_state || ' ' || shipping_postal_code ||
        COALESCE(E'\nPhone: ' || shipping_phone, '')
    INTO v_winner_username, v_winner_address
    FROM public.users
    WHERE id = p_winner_id;
  END IF;
  
  -- Create message based on type
  IF p_message_type = 'winner_prompt' THEN
    v_message_text := format(
      '🎉 Congratulations! You won: %s

🏆 You are the winner of this marketplace competition!

📦 NEXT STEP: Click "Claim Prize" on the listing to provide your shipping address

✅ Once you claim your prize, the seller will receive your address and can ship your item!',
      v_listing_title
    );
    
  ELSIF p_message_type = 'seller_notification' THEN
    v_message_text := format(
      '💰 Winner Determined: %s

✅ A winner has been selected for your listing!

🏆 Winner: %s
💵 Prize Pool: %s tokens (you receive 85%% = %s tokens)

⏳ WAITING: The winner needs to claim their prize and provide their shipping address.

You''ll receive another message with their shipping details once they claim.',
      v_listing_title,
      v_winner_username,
      p_prize_amount / 0.85,
      p_prize_amount
    );
    
  ELSIF p_message_type = 'seller_ship_notification' THEN
    v_message_text := format(
      '📦 SHIP NOW: %s

✅ The winner has claimed their prize!

🏆 Winner: %s

📍 SHIPPING ADDRESS:
%s

💰 RELEASE FUNDS: %s tokens
Once you ship the item, click the button below to release your funds!

[This message would include a "Release Funds" button in the UI]',
      v_listing_title,
      v_winner_username,
      v_winner_address,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.send_winner_address_to_seller(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_automated_marketplace_message(UUID, TEXT, UUID, UUID, NUMERIC) TO authenticated;

-- Success message
SELECT '✅ Claim Prize system ready! Winners can now claim prizes and sellers receive addresses!' as status;

