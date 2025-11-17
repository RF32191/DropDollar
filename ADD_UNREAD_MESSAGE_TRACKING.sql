-- ============================================
-- ADD UNREAD MESSAGE TRACKING
-- ============================================
-- This adds efficient unread message tracking and read receipts
-- Similar to Gmail, WhatsApp, iMessage notification system
-- ============================================

-- Step 1: Add read tracking columns to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Step 2: Create optimized function to get unread count for a user
CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count messages where:
  -- 1. User is NOT the sender
  -- 2. User is a participant in the conversation
  -- 3. Message is unread
  SELECT COUNT(DISTINCT m.id)::INTEGER INTO v_count
  FROM public.messages m
  INNER JOIN public.conversation_participants cp 
    ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.is_read = false
    AND cp.is_active = true;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Step 3: Create function to get unread count per conversation
CREATE OR REPLACE FUNCTION get_unread_by_conversation(p_user_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  unread_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.conversation_id,
    COUNT(m.id)::INTEGER as unread_count
  FROM public.messages m
  INNER JOIN public.conversation_participants cp 
    ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.is_read = false
    AND cp.is_active = true
  GROUP BY m.conversation_id;
END;
$$;

-- Step 4: Create function to mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Mark all messages in this conversation as read for this user
  -- (messages that this user did NOT send)
  UPDATE public.messages
  SET 
    is_read = true,
    read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN v_updated;
END;
$$;

-- Step 5: Update existing messages to be marked as read (optional - keeps existing behavior)
-- Comment this out if you want all existing messages to show as unread
UPDATE public.messages
SET is_read = true, read_at = created_at
WHERE is_read = false;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION get_total_unread_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_by_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID, UUID) TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to test the new functions:

-- Test getting total unread count (replace with your user_id)
-- SELECT get_total_unread_count('your-user-id-here');

-- Test getting unread count per conversation
-- SELECT * FROM get_unread_by_conversation('your-user-id-here');

-- Test marking a conversation as read
-- SELECT mark_conversation_read('conversation-id-here', 'your-user-id-here');

-- ============================================
-- SUCCESS!
-- ============================================
-- ✅ Messages now have read tracking
-- ✅ Fast unread count queries (optimized with joins)
-- ✅ Mark as read functionality
-- ✅ Ready for red badge notifications!
-- ============================================

