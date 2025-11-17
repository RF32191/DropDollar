-- ============================================================================
-- FIX ANONYMOUS USERNAMES IN SCOREBOARD
-- ============================================================================
-- Ensures real usernames show instead of "Anonymous"
-- ============================================================================

-- Update all existing participants to have real usernames
UPDATE public.marketplace_participants p
SET username = COALESCE(
    (SELECT u.username FROM public.users u WHERE u.id = p.user_id),
    (SELECT split_part(u.email, '@', 1) FROM public.users u WHERE u.id = p.user_id),
    'Player'
)
WHERE p.username IS NULL OR p.username = '' OR p.username = 'Anonymous';

SELECT '✅ Updated all participant usernames' as status;

-- Show stats
SELECT 
    COUNT(*) as total_participants,
    COUNT(*) FILTER (WHERE username IS NOT NULL AND username != 'Anonymous' AND username != '') as with_real_username,
    COUNT(*) FILTER (WHERE username = 'Anonymous') as still_anonymous
FROM marketplace_participants;

SELECT '
╔════════════════════════════════════════════════════════════════╗
║   ✅ ANONYMOUS USERNAMES FIXED                                 ║
╚════════════════════════════════════════════════════════════════╝

All participants now have real usernames from their accounts.

REFRESH YOUR PAGE to see the changes!
' as success;

