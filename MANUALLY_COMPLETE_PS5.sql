-- ============================================
-- MANUALLY COMPLETE PS5 GAME
-- ============================================
-- Process the winner for PS5 listing
-- ============================================

-- Step 1: Check if there are participants with scores
SELECT 
    '🎮 PS5 Game Participants' as info,
    u.username,
    mp.user_id,
    mp.score,
    mp.completed_at,
    CASE 
        WHEN mp.score IS NOT NULL THEN '✅ HAS SCORE'
        ELSE '❌ NO SCORE'
    END as score_status
FROM marketplace_participants mp
JOIN users u ON u.id = mp.user_id
JOIN marketplace_sessions ms ON ms.id = mp.session_id
JOIN marketplace_listings ml ON ml.id = ms.listing_id
WHERE ml.title ILIKE '%PS5%'
ORDER BY mp.score DESC NULLS LAST;

-- Step 2: Get the PS5 session ID
DO $$
DECLARE
    v_session_id UUID;
    v_listing_id UUID;
    v_result JSONB;
BEGIN
    -- Find the PS5 session
    SELECT ms.id, ms.listing_id INTO v_session_id, v_listing_id
    FROM marketplace_sessions ms
    JOIN marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ml.title ILIKE '%PS5%'
    ORDER BY ms.created_at DESC
    LIMIT 1;
    
    IF v_session_id IS NULL THEN
        RAISE NOTICE '❌ No PS5 session found';
        RETURN;
    END IF;
    
    RAISE NOTICE '📦 Found PS5 session: %', v_session_id;
    RAISE NOTICE '📦 Listing ID: %', v_listing_id;
    
    -- Check if there are participants with scores
    IF EXISTS (
        SELECT 1 FROM marketplace_participants 
        WHERE session_id = v_session_id 
        AND score IS NOT NULL
    ) THEN
        RAISE NOTICE '✅ Found participants with scores, processing winner...';
        
        -- Call the process_marketplace_winner function
        SELECT process_marketplace_winner(v_session_id) INTO v_result;
        
        RAISE NOTICE '🎉 Result: %', v_result;
    ELSE
        RAISE NOTICE '❌ No participants have completed the game yet';
        RAISE NOTICE 'ℹ️ Participants need to finish playing and submit their scores first';
    END IF;
END $$;

-- Step 3: Verify winner was set
SELECT 
    '🏆 After Processing' as info,
    ml.title,
    ms.winner_user_id,
    ms.winner_username,
    ms.winner_score,
    ms.status as session_status,
    ml.status as listing_status,
    CASE 
        WHEN ms.winner_user_id IS NOT NULL THEN '✅ WINNER SET'
        ELSE '❌ NO WINNER YET'
    END as winner_status
FROM marketplace_sessions ms
JOIN marketplace_listings ml ON ml.id = ms.listing_id
WHERE ml.title ILIKE '%PS5%'
ORDER BY ms.created_at DESC
LIMIT 1;

-- Step 4: Show who should see the claim button
SELECT 
    '🎯 Button Visibility' as info,
    ms.winner_user_id as should_see_button_user_id,
    ms.winner_username,
    u.email as winner_email,
    CASE 
        WHEN ms.winner_user_id = 'f55afbe7-b696-45f5-b032-c4f2e96775a3' THEN '✅ YOU SHOULD SEE THE BUTTON'
        ELSE '❌ Someone else won'
    END as your_status
FROM marketplace_sessions ms
JOIN marketplace_listings ml ON ml.id = ms.listing_id
LEFT JOIN users u ON u.id = ms.winner_user_id
WHERE ml.title ILIKE '%PS5%'
  AND ms.winner_user_id IS NOT NULL
ORDER BY ms.created_at DESC
LIMIT 1;

