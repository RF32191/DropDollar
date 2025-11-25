-- ============================================================================
-- MANUAL TEST - Insert a Game Record Directly
-- ============================================================================
-- Run this in Supabase SQL Editor to manually add a test game
-- If this shows up in admin dashboard, everything is working
-- ============================================================================

-- First, check if the table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'game_audit_log'
    ) THEN
        RAISE EXCEPTION '❌ TABLE DOES NOT EXIST! Run DEPLOY_AUDIT_NO_DEADLOCK.sql first!';
    ELSE
        RAISE NOTICE '✅ Table exists, proceeding with test insert...';
    END IF;
END $$;

-- Insert a test game record
INSERT INTO public.game_audit_log (
    user_id,
    username,
    email,
    game_type,
    game_mode,
    session_id,
    score,
    score_rating,
    max_score,
    accuracy,
    reaction_time,
    duration_seconds,
    suspicious,
    suspicious_reasons,
    cheat_score,
    additional_data,
    created_at
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com' LIMIT 1),
    'TEST_USER',
    'rf32191@gmail.com',
    'laser_dodge',
    'practice',
    gen_random_uuid(),
    850,
    8.5,
    1000,
    95.5,
    250.0,
    60,
    false,
    ARRAY[]::text[],
    0,
    '{"test": true}'::jsonb,
    NOW()
);

-- Verify it was inserted
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.game_audit_log;
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TEST GAME INSERTED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Total games in database: %', v_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔍 NOW CHECK:';
    RAISE NOTICE '   1. Go to: https://www.drop-dollar.com/admin/dashboard';
    RAISE NOTICE '   2. Enter password: 321SnoopDog1994321!';
    RAISE NOTICE '   3. Click "Audit Logs" tab';
    RAISE NOTICE '   4. You should see TEST_USER with 850 score!';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- Show the inserted record
SELECT 
    username,
    game_type,
    game_mode,
    score,
    score_rating,
    cheat_score,
    threat_level,
    created_at
FROM admin_detailed_audit_view 
WHERE username = 'TEST_USER'
ORDER BY created_at DESC 
LIMIT 1;

