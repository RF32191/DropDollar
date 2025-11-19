-- ============================================
-- DIAGNOSE WINNER BUTTON ISSUE
-- ============================================
-- Check why claim prize button isn't showing
-- ============================================

-- Step 1: Check the PS5 listing specifically
SELECT 
    '📦 PS5 Listing Details' as info,
    ml.id,
    ml.title,
    ml.seller_id,
    ml.status as listing_status,
    ms.id as session_id,
    ms.status as session_status,
    ms.winner_user_id,
    ms.winner_username,
    ms.winner_score,
    ms.completed_at
FROM marketplace_listings ml
LEFT JOIN marketplace_sessions ms ON ms.listing_id = ml.id
WHERE ml.title ILIKE '%PS5%'
ORDER BY ml.created_at DESC
LIMIT 5;

-- Step 2: Check who played the PS5 game
SELECT 
    '🎮 PS5 Participants' as info,
    mp.user_id,
    u.username,
    mp.score,
    mp.completed_at,
    mp.joined_at
FROM marketplace_participants mp
JOIN users u ON u.id = mp.user_id
JOIN marketplace_sessions ms ON ms.id = mp.session_id
JOIN marketplace_listings ml ON ml.id = ms.listing_id
WHERE ml.title ILIKE '%PS5%'
ORDER BY mp.score DESC NULLS LAST;

-- Step 3: Check if winner_user_id matches any user
SELECT 
    '🏆 Winner Match Check' as info,
    ms.winner_user_id,
    ms.winner_username,
    u.id as actual_user_id,
    u.username as actual_username,
    CASE 
        WHEN ms.winner_user_id = u.id THEN '✅ IDs MATCH'
        ELSE '❌ IDS DO NOT MATCH'
    END as match_status
FROM marketplace_sessions ms
JOIN marketplace_listings ml ON ml.id = ms.listing_id
LEFT JOIN users u ON u.username = ms.winner_username
WHERE ml.title ILIKE '%PS5%'
  AND ms.winner_user_id IS NOT NULL;

-- Step 4: Your user ID check
SELECT 
    '👤 Your User Info' as info,
    id,
    username,
    email
FROM users
WHERE id = 'f55afbe7-b696-45f5-b032-c4f2e96775a3';

-- Step 5: Check if YOU are the winner
SELECT 
    '🎯 Are You The Winner?' as question,
    ml.title,
    ms.winner_user_id,
    ms.winner_username,
    CASE 
        WHEN ms.winner_user_id = 'f55afbe7-b696-45f5-b032-c4f2e96775a3' THEN '✅ YES - YOU ARE THE WINNER!'
        ELSE '❌ NO - You are not the winner'
    END as result,
    ml.status as listing_status
FROM marketplace_sessions ms
JOIN marketplace_listings ml ON ml.id = ms.listing_id
WHERE ml.title ILIKE '%PS5%'
  AND ms.status = 'completed'
ORDER BY ms.completed_at DESC
LIMIT 1;

-- Step 6: Fix winner_user_id if it's wrong type (text vs uuid)
DO $$
BEGIN
    -- Update any winner_user_id that might be stored as text
    UPDATE marketplace_sessions ms
    SET winner_user_id = mp.user_id
    FROM marketplace_participants mp
    WHERE mp.session_id = ms.id
      AND mp.score = ms.winner_score
      AND ms.winner_user_id IS NULL;
END $$;

-- Step 7: Verify fix worked
SELECT 
    '✅ Verification' as info,
    ml.title,
    ms.winner_user_id::text as winner_id,
    ms.winner_username,
    ms.status
FROM marketplace_sessions ms
JOIN marketplace_listings ml ON ml.id = ms.listing_id
WHERE ml.title ILIKE '%PS5%'
ORDER BY ms.completed_at DESC
LIMIT 1;

