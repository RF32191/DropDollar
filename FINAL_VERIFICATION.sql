-- ============================================================================
-- FINAL VERIFICATION - Run this in Supabase SQL Editor
-- This will tell you if the audit system is ready
-- ============================================================================

DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_function_exists BOOLEAN;
    v_admin_exists BOOLEAN;
    v_admin_id UUID;
BEGIN
    -- Check 1: Table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'game_audit_log'
    ) INTO v_table_exists;
    
    -- Check 2: Function exists
    SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_name = 'frontend_log_game_completion'
    ) INTO v_function_exists;
    
    -- Check 3: Admin user exists
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'rf32191@gmail.com';
    v_admin_exists := (v_admin_id IS NOT NULL);
    
    -- Print results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'AUDIT SYSTEM STATUS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    IF v_table_exists THEN
        RAISE NOTICE '✅ game_audit_log table: EXISTS';
    ELSE
        RAISE NOTICE '❌ game_audit_log table: MISSING';
        RAISE NOTICE '   → Run DEPLOY_AUDIT_FINAL_FIX.sql';
    END IF;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ frontend_log_game_completion: EXISTS';
    ELSE
        RAISE NOTICE '❌ frontend_log_game_completion: MISSING';
        RAISE NOTICE '   → Run DEPLOY_AUDIT_FINAL_FIX.sql';
    END IF;
    
    IF v_admin_exists THEN
        RAISE NOTICE '✅ Admin user (rf32191@gmail.com): EXISTS';
    ELSE
        RAISE NOTICE '❌ Admin user: NOT FOUND';
        RAISE NOTICE '   → Create account with rf32191@gmail.com';
    END IF;
    
    RAISE NOTICE '';
    
    -- If everything exists, insert a test record
    IF v_table_exists AND v_function_exists AND v_admin_exists THEN
        RAISE NOTICE '🎯 ALL SYSTEMS READY!';
        RAISE NOTICE '';
        RAISE NOTICE 'Inserting test record...';
        
        -- Delete old test
        DELETE FROM game_audit_log WHERE game_type = 'final_verification_test';
        
        -- Insert new test
        INSERT INTO game_audit_log (
            user_id,
            username,
            email,
            game_type,
            game_mode,
            score,
            score_rating,
            accuracy,
            cheat_score,
            threat_level,
            created_at
        ) VALUES (
            v_admin_id,
            'FINAL_TEST',
            'rf32191@gmail.com',
            'final_verification_test',
            'practice',
            888,
            8.8,
            88.8,
            0,
            'NONE',
            NOW()
        );
        
        RAISE NOTICE '✅ Test record inserted!';
        RAISE NOTICE '';
        RAISE NOTICE '🎯 NEXT STEPS:';
        RAISE NOTICE '   1. Go to Admin Dashboard → Audit Logs';
        RAISE NOTICE '   2. You should see: "final_verification_test" (score 888)';
        RAISE NOTICE '   3. If you see it → Database works!';
        RAISE NOTICE '   4. If you don''t → RLS or frontend issue';
        RAISE NOTICE '';
        RAISE NOTICE '   5. Now test frontend:';
        RAISE NOTICE '      - Go to https://www.drop-dollar.com/games/practice';
        RAISE NOTICE '      - Press F12 (open console)';
        RAISE NOTICE '      - Play Quick Click';
        RAISE NOTICE '      - Watch for "✅ Game audited successfully"';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ SYSTEM NOT READY!';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 TO FIX:';
        RAISE NOTICE '   1. Run DEPLOY_AUDIT_FINAL_FIX.sql in Supabase';
        RAISE NOTICE '   2. Make sure you''re logged in as rf32191@gmail.com';
        RAISE NOTICE '   3. Run this script again';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- Show recent audit logs
SELECT 
    username,
    game_type,
    score,
    score_rating,
    threat_level,
    created_at
FROM game_audit_log
ORDER BY created_at DESC
LIMIT 10;

