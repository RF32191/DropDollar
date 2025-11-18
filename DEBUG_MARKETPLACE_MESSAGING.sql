-- ============================================
-- DEBUG MARKETPLACE MESSAGING
-- ============================================
-- Check if everything is set up correctly
-- ============================================

-- 1. Check if system user exists
SELECT 
  'System User Check' as test,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ System user exists'
    ELSE '❌ System user NOT found - Run SQL #1 first!'
  END as status,
  email,
  username
FROM public.users 
WHERE email = 'system@dropdollar.com'
GROUP BY email, username;

-- 2. Check if functions exist
SELECT 
  'Functions Check' as test,
  routine_name as function_name,
  '✅ Exists' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'send_automated_marketplace_message',
    'notify_marketplace_winner',
    'notify_marketplace_seller',
    'process_marketplace_winner'
  )
ORDER BY routine_name;

-- 3. Check recent marketplace sessions
SELECT 
  'Recent Sessions' as test,
  ms.id,
  ms.status,
  ms.winner_user_id,
  ms.winner_username,
  ms.winner_score,
  ms.completed_at,
  ml.title as listing_title
FROM public.marketplace_sessions ms
LEFT JOIN public.marketplace_listings ml ON ml.id = ms.listing_id
ORDER BY ms.created_at DESC
LIMIT 5;

-- 4. Check if any system messages were sent
SELECT 
  'System Messages' as test,
  COUNT(*) as total_messages,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Messages being sent'
    ELSE '⚠️ No system messages yet'
  END as status
FROM public.messages 
WHERE message_type = 'system';

-- 5. Show recent system messages if any
SELECT 
  'Recent System Messages' as info,
  m.created_at,
  m.message_text,
  u.username as recipient
FROM public.messages m
JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
JOIN public.users u ON u.id = cp.user_id
WHERE m.message_type = 'system'
  AND cp.user_id != (SELECT id FROM public.users WHERE email = 'system@dropdollar.com')
ORDER BY m.created_at DESC
LIMIT 5;

-- ============================================
-- WHAT TO LOOK FOR:
-- ============================================
-- ✅ System user exists
-- ✅ All 4 functions exist
-- ✅ Recent sessions show winner info
-- ✅ System messages are being sent
-- ============================================

