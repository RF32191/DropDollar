-- ============================================================================
-- VERIFY HOT SELL RESET SUCCESS
-- Quick diagnostic to confirm everything is working
-- ============================================================================

-- Check 1: Count active sessions (should match number of configs)
SELECT 
    '1. Active Sessions Check' as check_name,
    COUNT(*) as active_sessions,
    (SELECT COUNT(*) FROM hot_sell_configs) as total_configs
FROM hot_sell_sessions 
WHERE status IN ('waiting', 'active');

-- Check 2: Show all active sessions with details
SELECT 
    '2. Session Details' as check_name,
    config_id,
    id as session_id,
    current_pot,
    base_price,
    max_participants,
    status,
    (SELECT COUNT(*) FROM hot_sell_participants WHERE session_id = hot_sell_sessions.id) as participant_count,
    created_at
FROM hot_sell_sessions
WHERE status IN ('waiting', 'active')
ORDER BY base_price
LIMIT 20;

-- Check 3: Verify payout function exists
SELECT 
    '3. Payout Function Check' as check_name,
    proname as function_name,
    pg_get_functiondef(oid) LIKE '%v_new_session_id%' as has_auto_reset_logic
FROM pg_proc 
WHERE proname = 'process_hot_sell_payout';

-- Check 4: Verify get_all function exists
SELECT 
    '4. Get All Function Check' as check_name,
    proname as function_name,
    pg_get_functiondef(oid) LIKE '%DISTINCT ON%' as has_distinct_on_logic
FROM pg_proc 
WHERE proname = 'get_all_hot_sell_sessions';

-- Check 5: Count total participants (should be 0 after reset)
SELECT 
    '5. Participants Check' as check_name,
    COUNT(*) as total_participants,
    COUNT(CASE WHEN score IS NOT NULL THEN 1 END) as participants_with_scores
FROM hot_sell_participants;

-- Check 6: Sample a few configs to show they're ready
SELECT 
    '6. Sample Configs' as check_name,
    id as config_id,
    title,
    base_price,
    max_participants,
    first_place_percent,
    second_place_percent,
    third_place_percent,
    platform_fee_percent
FROM hot_sell_configs
ORDER BY base_price
LIMIT 5;

-- Final Status Message
DO $$
DECLARE
    v_active_sessions INTEGER;
    v_configs INTEGER;
    v_participants INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_sessions FROM hot_sell_sessions WHERE status IN ('waiting', 'active');
    SELECT COUNT(*) INTO v_configs FROM hot_sell_configs;
    SELECT COUNT(*) INTO v_participants FROM hot_sell_participants;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ HOT SELL SYSTEM STATUS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Configs: %', v_configs;
    RAISE NOTICE '📊 Active Sessions: %', v_active_sessions;
    RAISE NOTICE '📊 Participants: %', v_participants;
    RAISE NOTICE '========================================';
    
    IF v_active_sessions = v_configs THEN
        RAISE NOTICE '✅ PERFECT! All configs have active sessions!';
    ELSE
        RAISE NOTICE '⚠️ WARNING: Session count mismatch!';
    END IF;
    
    IF v_participants = 0 THEN
        RAISE NOTICE '✅ Clean slate - ready for testing!';
    ELSE
        RAISE NOTICE 'ℹ️ % participants currently in games', v_participants;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎮 SYSTEM READY! Go test on the website!';
    RAISE NOTICE '========================================';
END $$;

