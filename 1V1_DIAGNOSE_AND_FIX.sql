-- ============================================================================
-- 1V1 DIAGNOSTIC AND FIX
-- ============================================================================
-- Check database state and fix any issues
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK IF CONFIGS EXIST
-- ============================================================================

SELECT '📊 CHECKING 1V1 CONFIGS:' as info;
SELECT id, game_type, title, entry_fee, prize_pool 
FROM one_v_one_configs 
ORDER BY entry_fee
LIMIT 10;

SELECT '📊 CONFIG COUNT:' as info;
SELECT COUNT(*) as config_count FROM one_v_one_configs;

-- ============================================================================
-- STEP 2: CHECK IF SESSIONS EXIST
-- ============================================================================

SELECT '📊 CHECKING 1V1 SESSIONS:' as info;
SELECT id, config_id, status, participants_count, current_pot, prize_pool
FROM one_v_one_sessions
ORDER BY created_at DESC
LIMIT 10;

SELECT '📊 SESSION COUNT:' as info;
SELECT COUNT(*) as session_count FROM one_v_one_sessions;

-- ============================================================================
-- STEP 3: IF NO CONFIGS, CREATE SAMPLE CONFIGS
-- ============================================================================

-- Create sample configs if none exist
DO $$
BEGIN
    -- Check if any configs exist
    IF NOT EXISTS (SELECT 1 FROM one_v_one_configs LIMIT 1) THEN
        RAISE NOTICE '⚠️ No configs found! Creating sample configs...';
        
        -- Insert sample 1v1 configs
        INSERT INTO one_v_one_configs (id, game_type, title, description, entry_fee, prize_pool, game_duration, rng_seed, winner_prize, platform_fee)
        VALUES 
            ('1v1-sword-$1', 'sword_parry', 'Sword Slash 1v1 - $1', 'Face off in sword combat', 1, 2, 30, 12345, 1.70, 0.30),
            ('1v1-sword-$5', 'sword_parry', 'Sword Slash 1v1 - $5', 'Face off in sword combat', 5, 10, 30, 12345, 8.50, 1.50),
            ('1v1-blade-$1', 'blade_bounce', 'Blade Bounce 1v1 - $1', 'Head-to-head blade action', 1, 2, 30, 54321, 1.70, 0.30),
            ('1v1-blade-$5', 'blade_bounce', 'Blade Bounce 1v1 - $5', 'Head-to-head blade action', 5, 10, 30, 54321, 8.50, 1.50)
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '✅ Sample configs created!';
    ELSE
        RAISE NOTICE '✅ Configs already exist!';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: CREATE/RESET SESSIONS FOR ALL CONFIGS
-- ============================================================================

DO $$
DECLARE
    config_rec RECORD;
    new_session_id UUID;
    session_exists BOOLEAN;
BEGIN
    FOR config_rec IN 
        SELECT * FROM one_v_one_configs
    LOOP
        -- Check if session already exists for this config
        SELECT EXISTS(
            SELECT 1 FROM one_v_one_sessions 
            WHERE config_id::TEXT = config_rec.id::TEXT
        ) INTO session_exists;
        
        IF session_exists THEN
            -- Update existing session
            UPDATE one_v_one_sessions
            SET 
                status = 'waiting',
                participants_count = 0,
                current_pot = 0,
                timer_started_at = NULL,
                winner_user_id = NULL,
                loser_user_id = NULL,
                winner_prize = 0,
                loser_prize = 0,
                platform_fee = 0,
                completed_at = NULL,
                prize_pool = config_rec.entry_fee * 2,  -- For 1v1, 2 players
                timer_duration = 7200,
                updated_at = NOW()
            WHERE config_id::TEXT = config_rec.id::TEXT;
            
            RAISE NOTICE '✅ Session reset for config: %', config_rec.id;
        ELSE
            -- Create new session
            new_session_id := gen_random_uuid();
            
            INSERT INTO one_v_one_sessions (
                id,
                config_id,
                prize_pool,
                participants_count,
                status,
                rng_seed,
                current_pot,
                timer_duration,
                created_at,
                updated_at
            )
            VALUES (
                new_session_id,
                config_rec.id::TEXT,
                config_rec.entry_fee * 2,  -- For 1v1, 2 players total
                0,
                'waiting',
                floor(random() * 99999 + 1)::integer,
                0,
                7200,  -- 2 hours
                NOW(),
                NOW()
            );
            
            RAISE NOTICE '✅ Session created for config: %', config_rec.id;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- STEP 5: DELETE OLD PARTICIPANTS
-- ============================================================================

DELETE FROM one_v_one_participants;

SELECT '✅ Step 5: Old participants cleared' as status;

-- ============================================================================
-- STEP 6: VERIFY SESSIONS ARE NOW VISIBLE
-- ============================================================================

SELECT '📊 FINAL SESSION CHECK:' as info;
SELECT id, config_id, status, participants_count, current_pot, prize_pool, timer_started_at
FROM one_v_one_sessions
WHERE status IN ('waiting', 'active')
ORDER BY config_id;

-- ============================================================================
-- STEP 7: TEST get_all_1v1_sessions FUNCTION
-- ============================================================================

SELECT '📊 TESTING get_all_1v1_sessions():' as info;
SELECT * FROM get_all_1v1_sessions();

SELECT '
✅ 1V1 DIAGNOSTIC COMPLETE!

Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If you see sessions above, the frontend should now work!

If still "No Active Session":
1. Check browser console for errors
2. Verify user is authenticated
3. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+F5)
4. Check that RPC functions have proper permissions

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Refresh your 1v1 page
2. You should now see game listings
3. Click "Join Battle" to test
4. Check Supabase logs for any errors

Ready to test! 🚀
' as summary;

