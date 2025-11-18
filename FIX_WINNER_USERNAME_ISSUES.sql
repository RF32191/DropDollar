-- ============================================
-- FIX WINNER & USERNAME ISSUES
-- ============================================
-- Fix usernames in scoreboard + ensure winner detection works
-- ============================================

-- Step 1: Verify marketplace_participants has usernames
SELECT 
    'Checking Participants Usernames' as check_type,
    COUNT(*) as total_participants,
    COUNT(mp.username) as with_username,
    COUNT(*) - COUNT(mp.username) as missing_username
FROM marketplace_participants mp;

-- Step 2: Update any missing usernames in marketplace_participants
UPDATE marketplace_participants mp
SET username = u.username
FROM users u
WHERE mp.user_id = u.id
  AND (mp.username IS NULL OR mp.username = '');

-- Step 3: Verify winner_user_id is properly set in marketplace_sessions
SELECT 
    'Checking Winner IDs' as check_type,
    COUNT(*) as total_completed_sessions,
    COUNT(winner_user_id) as sessions_with_winner_id,
    COUNT(winner_username) as sessions_with_winner_username
FROM marketplace_sessions
WHERE status = 'completed';

-- Step 4: Fix any missing winner_user_id/winner_username
UPDATE marketplace_sessions ms
SET 
    winner_user_id = (
        SELECT mp.user_id
        FROM marketplace_participants mp
        WHERE mp.session_id = ms.id
          AND mp.score IS NOT NULL
        ORDER BY mp.score DESC, mp.completed_at ASC
        LIMIT 1
    ),
    winner_username = (
        SELECT u.username
        FROM marketplace_participants mp
        JOIN users u ON u.id = mp.user_id
        WHERE mp.session_id = ms.id
          AND mp.score IS NOT NULL
        ORDER BY mp.score DESC, mp.completed_at ASC
        LIMIT 1
    ),
    winner_score = (
        SELECT mp.score
        FROM marketplace_participants mp
        WHERE mp.session_id = ms.id
          AND mp.score IS NOT NULL
        ORDER BY mp.score DESC, mp.completed_at ASC
        LIMIT 1
    )
WHERE ms.status = 'completed'
  AND (ms.winner_user_id IS NULL OR ms.winner_username IS NULL);

-- Step 5: Check current state
SELECT 
    'Final Verification' as check_type,
    ml.title as listing_title,
    ms.winner_username,
    ms.winner_user_id,
    ms.winner_score,
    ms.status as session_status,
    ml.status as listing_status
FROM marketplace_sessions ms
JOIN marketplace_listings ml ON ml.id = ms.listing_id
WHERE ms.status = 'completed'
ORDER BY ms.completed_at DESC
LIMIT 10;

-- Step 6: Show scoreboard data
SELECT 
    'Scoreboard Data' as info,
    ml.title,
    mp.username,
    mp.user_id,
    mp.score,
    mp.completed_at
FROM marketplace_participants mp
JOIN marketplace_sessions ms ON ms.id = mp.session_id
JOIN marketplace_listings ml ON ml.id = ms.listing_id
WHERE mp.score IS NOT NULL
ORDER BY ms.completed_at DESC, mp.score DESC
LIMIT 20;

-- Success message
SELECT '✅ Winner and username issues fixed!' as status;

