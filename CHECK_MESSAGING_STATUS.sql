-- ============================================================================
-- CHECK MESSAGING STATUS - Run this to see if everything is set up
-- ============================================================================

-- 1. Check if RLS is disabled (should show 'false')
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename;

-- 2. Check if tables exist
SELECT 
    'conversations' as table_name,
    COUNT(*) as row_count
FROM public.conversations
UNION ALL
SELECT 
    'conversation_participants',
    COUNT(*)
FROM public.conversation_participants
UNION ALL
SELECT 
    'messages',
    COUNT(*)
FROM public.messages;

-- 3. Check permissions
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('conversations', 'conversation_participants', 'messages')
AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 1. rls_enabled should be FALSE for all 3 tables
-- 2. Tables should exist (row counts can be 0 if no messages yet)
-- 3. authenticated should have ALL permissions on all 3 tables
-- ============================================================================

SELECT '✅ If you see results above, tables exist!' as status;
SELECT '⚠️ If rls_enabled = true, you MUST run DISABLE_RLS_COMPLETELY.sql' as important;
SELECT '⚠️ If no permissions shown, you MUST run DISABLE_RLS_COMPLETELY.sql' as permissions;

