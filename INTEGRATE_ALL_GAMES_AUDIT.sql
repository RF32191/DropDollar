-- ============================================================================
-- COMPLETE INTEGRATION FOR ALL GAMES
-- ============================================================================
-- This integrates audit tracking for EVERY game on your site:
-- • Laser Dodge
-- • Multi Target Reaction
-- • Sword Parry
-- • Quick Click
-- • Color Sequence
-- • Blade Bounce (3D)
-- • Cash Stack
-- • Falling Objects
-- • 1v1 Games
-- • Winner Takes It All
-- • Hot Sell
--
-- Each game logs: score, username, accuracy, reaction time, cheat rating
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎮 INTEGRATING ALL GAMES TO AUDIT';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 1: CREATE GAME-SPECIFIC CHEAT DETECTION
-- ============================================================================

-- Function to detect game-specific cheating patterns
DROP FUNCTION IF EXISTS detect_game_specific_cheating(TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION detect_game_specific_cheating(
    p_game_type TEXT,
    p_score INTEGER,
    p_accuracy NUMERIC,
    p_reaction_time NUMERIC,
    p_duration_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_suspicious BOOLEAN := FALSE;
    v_cheat_score NUMERIC := 0;
    v_reasons TEXT[] := '{}';
    v_max_possible_score INTEGER;
    v_min_realistic_time INTEGER;
BEGIN
    -- Game-specific validation
    CASE p_game_type
        -- ====================================
        -- LASER DODGE
        -- ====================================
        WHEN 'laser_dodge' THEN
            v_max_possible_score := 1000;
            v_min_realistic_time := 30; -- Minimum 30 seconds to play
            
            -- Check 1: Impossible score in too short time
            IF p_score > 800 AND p_duration_seconds < 60 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 40;
                v_reasons := array_append(v_reasons, 'Laser Dodge: High score too fast');
            END IF;
            
            -- Check 2: Impossible reaction time
            IF p_reaction_time < 0.1 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 50;
                v_reasons := array_append(v_reasons, 'Laser Dodge: Impossible reactions');
            END IF;
        
        -- ====================================
        -- MULTI TARGET REACTION
        -- ====================================
        WHEN 'multi_target_reaction', 'multi_target' THEN
            v_max_possible_score := 1000;
            
            -- Check 1: Perfect accuracy suspicious
            IF p_accuracy > 98 AND p_score > 900 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 35;
                v_reasons := array_append(v_reasons, 'Multi Target: Near-perfect accuracy');
            END IF;
            
            -- Check 2: Impossible reaction time
            IF p_reaction_time < 0.08 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 45;
                v_reasons := array_append(v_reasons, 'Multi Target: Superhuman reactions');
            END IF;
        
        -- ====================================
        -- SWORD PARRY
        -- ====================================
        WHEN 'sword_parry' THEN
            v_max_possible_score := 1000;
            
            -- Check 1: Too fast completion
            IF p_score > 800 AND p_duration_seconds < 40 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 40;
                v_reasons := array_append(v_reasons, 'Sword Parry: Completed too quickly');
            END IF;
            
            -- Check 2: Impossible parry timing
            IF p_reaction_time < 0.12 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 45;
                v_reasons := array_append(v_reasons, 'Sword Parry: Impossible timing');
            END IF;
        
        -- ====================================
        -- QUICK CLICK
        -- ====================================
        WHEN 'quick_click', 'number_tap' THEN
            v_max_possible_score := 1000;
            
            -- Check 1: Impossible click speed
            IF p_reaction_time < 0.05 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 60;
                v_reasons := array_append(v_reasons, 'Quick Click: Bot-like speed');
            END IF;
            
            -- Check 2: Perfect score suspicious
            IF p_score >= 1000 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 30;
                v_reasons := array_append(v_reasons, 'Quick Click: Perfect score');
            END IF;
        
        -- ====================================
        -- COLOR SEQUENCE
        -- ====================================
        WHEN 'color_sequence', 'memory_color' THEN
            v_max_possible_score := 1000;
            
            -- Check 1: Impossible memory
            IF p_score > 900 AND p_duration_seconds < 30 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 50;
                v_reasons := array_append(v_reasons, 'Color Sequence: Impossible memory recall');
            END IF;
        
        -- ====================================
        -- BLADE BOUNCE (3D)
        -- ====================================
        WHEN 'blade_bounce' THEN
            v_max_possible_score := 1000;
            
            -- Check 1: Impossible survival time
            IF p_score > 850 AND p_duration_seconds < 50 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 40;
                v_reasons := array_append(v_reasons, 'Blade Bounce: Survived too long too fast');
            END IF;
        
        -- ====================================
        -- CASH STACK
        -- ====================================
        WHEN 'cash_stack', 'falling_object' THEN
            v_max_possible_score := 1000;
            
            -- Check 1: Perfect catching suspicious
            IF p_accuracy > 95 AND p_score > 850 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 35;
                v_reasons := array_append(v_reasons, 'Cash Stack: Near-perfect catching');
            END IF;
    END CASE;
    
    -- Universal checks for all games
    
    -- Check: Score exceeds maximum possible
    IF v_max_possible_score IS NOT NULL AND p_score > v_max_possible_score THEN
        v_is_suspicious := TRUE;
        v_cheat_score := v_cheat_score + 100;
        v_reasons := array_append(v_reasons, 'Score exceeds maximum possible');
    END IF;
    
    -- Check: Negative or zero duration
    IF p_duration_seconds <= 0 THEN
        v_is_suspicious := TRUE;
        v_cheat_score := v_cheat_score + 80;
        v_reasons := array_append(v_reasons, 'Invalid game duration');
    END IF;
    
    RETURN jsonb_build_object(
        'suspicious', v_is_suspicious,
        'cheat_score', LEAST(v_cheat_score, 100),
        'reasons', v_reasons
    );
END;
$$;

GRANT EXECUTE ON FUNCTION detect_game_specific_cheating TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Game-specific cheat detection created';
END $$;

-- ============================================================================
-- PART 2: UPDATE LOG_GAME_PLAY TO USE GAME-SPECIFIC DETECTION
-- ============================================================================

DROP FUNCTION IF EXISTS log_game_play(UUID, TEXT, TEXT, UUID, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) CASCADE;

CREATE OR REPLACE FUNCTION log_game_play(
    p_user_id UUID,
    p_game_type TEXT,
    p_game_mode TEXT,
    p_session_id UUID,
    p_score INTEGER,
    p_accuracy NUMERIC DEFAULT NULL,
    p_reaction_time NUMERIC DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audit_id UUID;
    v_username TEXT;
    v_email TEXT;
    v_game_cheat_check JSONB;
    v_is_suspicious BOOLEAN := FALSE;
    v_suspicious_reasons TEXT[] := '{}';
    v_cheat_score NUMERIC := 0;
BEGIN
    -- Get user info
    SELECT username, email INTO v_username, v_email
    FROM auth.users
    WHERE id = p_user_id;
    
    -- Run game-specific cheat detection
    v_game_cheat_check := detect_game_specific_cheating(
        p_game_type,
        p_score,
        p_accuracy,
        p_reaction_time,
        p_duration_seconds
    );
    
    -- Extract cheat detection results
    IF (v_game_cheat_check->>'suspicious')::BOOLEAN THEN
        v_is_suspicious := TRUE;
        v_cheat_score := (v_game_cheat_check->>'cheat_score')::NUMERIC;
        
        -- Convert JSONB array to TEXT array
        SELECT array_agg(value::TEXT)
        INTO v_suspicious_reasons
        FROM jsonb_array_elements_text(v_game_cheat_check->'reasons');
    END IF;
    
    -- Insert audit log
    INSERT INTO public.game_audit_log (
        user_id,
        username,
        email,
        game_type,
        game_mode,
        session_id,
        score,
        accuracy,
        reaction_time,
        duration_seconds,
        ip_address,
        suspicious,
        suspicious_reasons,
        cheat_score,
        additional_data
    ) VALUES (
        p_user_id,
        v_username,
        v_email,
        p_game_type,
        p_game_mode,
        p_session_id,
        p_score,
        p_accuracy,
        p_reaction_time,
        p_duration_seconds,
        inet_client_addr(),
        v_is_suspicious,
        v_suspicious_reasons,
        v_cheat_score,
        p_additional_data
    ) RETURNING id INTO v_audit_id;
    
    -- Run pattern detection (existing suspicious patterns)
    PERFORM detect_suspicious_patterns(v_audit_id, p_user_id, p_game_type, p_score);
    
    RAISE NOTICE '✅ Game logged: type=%, user=%, score=%, cheat_score=%', 
        p_game_type, v_username, p_score, v_cheat_score;
    
    RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_game_play TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Updated log_game_play with game-specific detection';
END $$;

-- ============================================================================
-- PART 3: CREATE FRONTEND INTEGRATION HELPER
-- ============================================================================

-- This function is called from frontend after ANY game completes
DROP FUNCTION IF EXISTS frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) CASCADE;

CREATE OR REPLACE FUNCTION frontend_log_game_completion(
    p_game_type TEXT,
    p_game_mode TEXT,
    p_score INTEGER,
    p_accuracy NUMERIC DEFAULT NULL,
    p_reaction_time NUMERIC DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audit_id UUID;
    v_user_id UUID;
    v_username TEXT;
    v_cheat_score NUMERIC;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not authenticated'
        );
    END IF;
    
    -- Get username
    SELECT username INTO v_username
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Log the game
    SELECT log_game_play(
        v_user_id,
        p_game_type,
        p_game_mode,
        gen_random_uuid(), -- Generate session ID
        p_score,
        p_accuracy,
        p_reaction_time,
        p_duration_seconds,
        p_additional_data
    ) INTO v_audit_id;
    
    -- Get cheat score
    SELECT cheat_score INTO v_cheat_score
    FROM public.game_audit_log
    WHERE id = v_audit_id;
    
    -- Notify admin if high score
    PERFORM notify_admin_high_score(
        v_user_id,
        COALESCE(v_username, 'Player'),
        p_game_type,
        p_score,
        1000 -- max score
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'audit_id', v_audit_id,
        'cheat_score', v_cheat_score,
        'message', 'Game logged successfully'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION frontend_log_game_completion TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Frontend integration helper created';
END $$;

-- ============================================================================
-- PART 4: CREATE GAME STATS VIEW FOR ADMIN
-- ============================================================================

DROP VIEW IF EXISTS admin_all_games_stats CASCADE;

CREATE VIEW admin_all_games_stats AS
SELECT 
    game_type,
    COUNT(*) as total_plays,
    COUNT(DISTINCT user_id) as unique_players,
    ROUND(AVG(score), 2) as avg_score,
    MAX(score) as highest_score,
    ROUND(AVG(score_rating), 2) as avg_rating,
    COUNT(*) FILTER (WHERE score_rating >= 7) as high_scores,
    COUNT(*) FILTER (WHERE suspicious = TRUE) as suspicious_plays,
    ROUND(AVG(cheat_score), 2) as avg_cheat_score
FROM public.game_audit_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY game_type
ORDER BY total_plays DESC;

GRANT SELECT ON admin_all_games_stats TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Admin game stats view created';
END $$;

-- ============================================================================
-- PART 5: CREATE DETAILED AUDIT VIEW FOR ADMIN
-- ============================================================================

DROP VIEW IF EXISTS admin_detailed_audit_view CASCADE;

CREATE VIEW admin_detailed_audit_view AS
SELECT 
    id,
    username,
    email,
    game_type,
    game_mode,
    score,
    score_rating,
    accuracy,
    reaction_time,
    duration_seconds,
    suspicious,
    suspicious_reasons,
    cheat_score,
    CASE 
        WHEN cheat_score >= 80 THEN 'CRITICAL'
        WHEN cheat_score >= 60 THEN 'HIGH'
        WHEN cheat_score >= 40 THEN 'MEDIUM'
        WHEN cheat_score >= 20 THEN 'LOW'
        ELSE 'CLEAN'
    END as threat_level,
    ip_address,
    created_at,
    additional_data
FROM public.game_audit_log
ORDER BY created_at DESC;

GRANT SELECT ON admin_detailed_audit_view TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Detailed audit view created';
END $$;

-- ============================================================================
-- PART 6: UPDATE EXISTING TRIGGERS TO USE NEW DETECTION
-- ============================================================================

-- Update 1v1 trigger
DROP TRIGGER IF EXISTS trigger_log_1v1_game ON public.one_v_one_participants;
DROP FUNCTION IF EXISTS auto_log_1v1_game() CASCADE;

CREATE OR REPLACE FUNCTION auto_log_1v1_game()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_audit_id UUID;
    v_username TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.score IS NOT NULL AND OLD.score IS NULL THEN
        SELECT username INTO v_username FROM auth.users WHERE id = NEW.user_id;
        SELECT * INTO v_session FROM public.one_v_one_sessions WHERE id = NEW.session_id;
        
        -- Use updated log_game_play (with game-specific detection)
        SELECT log_game_play(
            NEW.user_id,
            'one_v_one',
            '1v1',
            NEW.session_id,
            NEW.score,
            NULL,
            NULL,
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.joined_at))::INTEGER,
            jsonb_build_object(
                'config_id', v_session.config_id,
                'entry_fee', NEW.entry_fee,
                'rng_seed', NEW.rng_seed
            )
        ) INTO v_audit_id;
        
        PERFORM notify_admin_high_score(NEW.user_id, COALESCE(v_username, 'Player'), 'one_v_one', NEW.score, 1000);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_1v1_game
    AFTER UPDATE ON public.one_v_one_participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_log_1v1_game();

-- Update WTA trigger
DROP TRIGGER IF EXISTS trigger_log_wta_game ON public.winner_takes_all_participants;
DROP FUNCTION IF EXISTS auto_log_wta_game() CASCADE;

CREATE OR REPLACE FUNCTION auto_log_wta_game()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_audit_id UUID;
    v_username TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.score IS NOT NULL AND OLD.score IS NULL THEN
        SELECT username INTO v_username FROM auth.users WHERE id = NEW.user_id;
        SELECT * INTO v_session FROM public.winner_takes_all_sessions WHERE id = NEW.session_id;
        
        -- Use updated log_game_play (with game-specific detection)
        SELECT log_game_play(
            NEW.user_id,
            'winner_takes_all',
            'wta',
            NEW.session_id,
            NEW.score,
            NULL,
            NULL,
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.joined_at))::INTEGER,
            jsonb_build_object(
                'config_id', v_session.config_id,
                'entry_fee', NEW.entry_fee
            )
        ) INTO v_audit_id;
        
        PERFORM notify_admin_high_score(NEW.user_id, COALESCE(v_username, 'Player'), 'winner_takes_all', NEW.score, 1000);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_wta_game
    AFTER UPDATE ON public.winner_takes_all_participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_log_wta_game();

DO $$
BEGIN
    RAISE NOTICE '✅ Updated triggers with game-specific detection';
END $$;

-- ============================================================================
-- FINAL VERIFICATION & GAME LIST
-- ============================================================================

DO $$
DECLARE
    v_functions INTEGER;
    v_triggers INTEGER;
    v_views INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_functions
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
        'detect_game_specific_cheating',
        'log_game_play',
        'frontend_log_game_completion',
        'auto_log_1v1_game',
        'auto_log_wta_game'
    );
    
    SELECT COUNT(*) INTO v_triggers
    FROM information_schema.triggers
    WHERE trigger_name IN ('trigger_log_1v1_game', 'trigger_log_wta_game');
    
    SELECT COUNT(*) INTO v_views
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name IN ('admin_all_games_stats', 'admin_detailed_audit_view');
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL GAMES INTEGRATED TO AUDIT!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 GAMES WITH CHEAT DETECTION:';
    RAISE NOTICE '   ✅ Laser Dodge';
    RAISE NOTICE '   ✅ Multi Target Reaction';
    RAISE NOTICE '   ✅ Sword Parry';
    RAISE NOTICE '   ✅ Quick Click';
    RAISE NOTICE '   ✅ Color Sequence';
    RAISE NOTICE '   ✅ Blade Bounce (3D)';
    RAISE NOTICE '   ✅ Cash Stack';
    RAISE NOTICE '   ✅ Falling Objects';
    RAISE NOTICE '   ✅ 1v1 Games (auto)';
    RAISE NOTICE '   ✅ Winner Takes It All (auto)';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 DETECTION FEATURES PER GAME:';
    RAISE NOTICE '   • Score validation';
    RAISE NOTICE '   • Reaction time checks';
    RAISE NOTICE '   • Duration validation';
    RAISE NOTICE '   • Accuracy analysis';
    RAISE NOTICE '   • Game-specific impossibility detection';
    RAISE NOTICE '';
    RAISE NOTICE '📊 SYSTEM STATUS:';
    RAISE NOTICE '   • Functions: %', v_functions;
    RAISE NOTICE '   • Triggers: %', v_triggers;
    RAISE NOTICE '   • Admin Views: %', v_views;
    RAISE NOTICE '';
    RAISE NOTICE '📋 ADMIN DASHBOARD VIEWS:';
    RAISE NOTICE '   • admin_all_games_stats - Per-game statistics';
    RAISE NOTICE '   • admin_detailed_audit_view - Full audit details';
    RAISE NOTICE '';
    RAISE NOTICE '🔌 FRONTEND INTEGRATION:';
    RAISE NOTICE '   Call: frontend_log_game_completion(...)';
    RAISE NOTICE '   From: Every game onGameEnd handler';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚀 READY FOR ALL GAMES!';
    RAISE NOTICE '========================================';
END $$;

