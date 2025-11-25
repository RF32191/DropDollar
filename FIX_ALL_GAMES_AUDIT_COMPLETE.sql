-- ============================================================================
-- FIX ALL GAMES AUDIT - COMPLETE SOLUTION
-- ============================================================================
-- This fixes:
-- • Missing score_rating column
-- • Ensures all practice games can be audited
-- • 24-hour cleanup for scores below 7/10
-- • Works for both auto-logged (1v1/WTA) and manual (practice) games
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXING ALL GAMES AUDIT SYSTEM';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 1: ADD MISSING COLUMNS TO game_audit_log
-- ============================================================================

-- Add score_rating column if missing (1-10 scale)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'game_audit_log'
        AND column_name = 'score_rating'
    ) THEN
        ALTER TABLE public.game_audit_log
        ADD COLUMN score_rating NUMERIC(3,1) DEFAULT 0;
        
        RAISE NOTICE '✅ Added score_rating column';
    ELSE
        RAISE NOTICE '✓ score_rating column already exists';
    END IF;
END $$;

-- Add max_score column if missing (for proper rating calculation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'game_audit_log'
        AND column_name = 'max_score'
    ) THEN
        ALTER TABLE public.game_audit_log
        ADD COLUMN max_score INTEGER DEFAULT 1000;
        
        RAISE NOTICE '✅ Added max_score column';
    ELSE
        RAISE NOTICE '✓ max_score column already exists';
    END IF;
END $$;

-- Update existing records to calculate score_rating
UPDATE public.game_audit_log
SET score_rating = ROUND((score::NUMERIC / COALESCE(NULLIF(max_score, 0), 1000)) * 10, 1)
WHERE score_rating IS NULL OR score_rating = 0;

DO $$
BEGIN
    RAISE NOTICE '✅ Updated existing records with score_rating';
END $$;

-- ============================================================================
-- PART 2: RECREATE log_game_play WITH SCORE_RATING CALCULATION
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
    v_max_score INTEGER := 1000;
    v_score_rating NUMERIC;
BEGIN
    -- Get user info
    SELECT username, email INTO v_username, v_email
    FROM auth.users
    WHERE id = p_user_id;
    
    -- Calculate score rating (1-10 scale)
    v_score_rating := ROUND((p_score::NUMERIC / v_max_score) * 10, 1);
    v_score_rating := LEAST(v_score_rating, 10.0); -- Cap at 10
    
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
    
    -- Insert audit log with score_rating
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
        v_score_rating,
        v_max_score,
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
    
    -- Notify admin if score is 7/10 or higher
    IF v_score_rating >= 7.0 THEN
        PERFORM notify_admin_high_score(p_user_id, COALESCE(v_username, 'Player'), p_game_type, p_score, v_max_score);
    END IF;
    
    RAISE NOTICE '✅ Game logged: type=%, user=%, score=%, rating=%/10, cheat_score=%', 
        p_game_type, v_username, p_score, v_score_rating, v_cheat_score;
    
    RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_game_play TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Updated log_game_play with score_rating calculation';
END $$;

-- ============================================================================
-- PART 3: RECREATE frontend_log_game_completion
-- ============================================================================

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
    v_score_rating NUMERIC;
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
    
    -- Get cheat score and rating
    SELECT cheat_score, score_rating 
    INTO v_cheat_score, v_score_rating
    FROM public.game_audit_log
    WHERE id = v_audit_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'audit_id', v_audit_id,
        'cheat_score', v_cheat_score,
        'score_rating', v_score_rating,
        'message', 'Game logged successfully'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION frontend_log_game_completion TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Updated frontend_log_game_completion';
END $$;

-- ============================================================================
-- PART 4: RECREATE ADMIN VIEWS WITH score_rating
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
    RAISE NOTICE '✅ Recreated admin views with score_rating';
END $$;

-- ============================================================================
-- PART 5: UPDATE 24-HOUR CLEANUP TO USE score_rating
-- ============================================================================

DROP FUNCTION IF EXISTS cleanup_low_score_audit_logs() CASCADE;

CREATE OR REPLACE FUNCTION cleanup_low_score_audit_logs()
RETURNS TABLE(deleted_count INTEGER, kept_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_kept_count INTEGER := 0;
BEGIN
    -- Delete logs where score_rating < 7 AND older than 24 hours
    DELETE FROM public.game_audit_log
    WHERE score_rating < 7.0
    AND created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Count remaining high-score logs
    SELECT COUNT(*) INTO v_kept_count
    FROM public.game_audit_log
    WHERE score_rating >= 7.0;
    
    RAISE NOTICE '🗑️ Cleanup complete: deleted % low scores, kept % high scores', 
        v_deleted_count, v_kept_count;
    
    RETURN QUERY SELECT v_deleted_count, v_kept_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_low_score_audit_logs TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Updated cleanup function to use score_rating < 7';
END $$;

-- ============================================================================
-- PART 6: ENSURE CRON JOB EXISTS FOR CLEANUP
-- ============================================================================

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove old job if exists
        PERFORM cron.unschedule('cleanup-low-score-audit-logs');
        
        -- Schedule daily cleanup at 3 AM UTC
        PERFORM cron.schedule(
            'cleanup-low-score-audit-logs',
            '0 3 * * *', -- Daily at 3 AM UTC
            $$SELECT cleanup_low_score_audit_logs();$$
        );
        
        RAISE NOTICE '✅ Scheduled daily cleanup job (3 AM UTC)';
    ELSE
        RAISE NOTICE '⚠️ pg_cron not available - manual cleanup required';
        RAISE NOTICE '   Run: SELECT cleanup_low_score_audit_logs(); daily';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not schedule cron job: %', SQLERRM;
        RAISE NOTICE '   Run cleanup manually: SELECT cleanup_low_score_audit_logs();';
END $$;

-- ============================================================================
-- PART 7: UPDATE TRIGGERS FOR 1v1 AND WTA
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
    -- Only log when a game completes (score changes from NULL to a value)
    IF TG_OP = 'UPDATE' AND NEW.score IS NOT NULL AND OLD.score IS NULL THEN
        -- Get username
        SELECT username INTO v_username FROM auth.users WHERE id = NEW.user_id;
        
        -- Get session details
        SELECT * INTO v_session FROM public.one_v_one_sessions WHERE id = NEW.session_id;
        
        -- Use updated log_game_play (with score_rating calculation)
        SELECT log_game_play(
            NEW.user_id,
            'one_v_one',
            '1v1',
            NEW.session_id,
            NEW.score,
            NULL, -- accuracy
            NULL, -- reaction_time
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.joined_at))::INTEGER,
            jsonb_build_object(
                'config_id', v_session.config_id,
                'entry_fee', NEW.entry_fee,
                'rng_seed', NEW.rng_seed
            )
        ) INTO v_audit_id;
        
        RAISE NOTICE '✅ 1v1 game logged: user=%, score=%, audit_id=%', 
            v_username, NEW.score, v_audit_id;
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
    -- Only log when a game completes (score changes from NULL to a value)
    IF TG_OP = 'UPDATE' AND NEW.score IS NOT NULL AND OLD.score IS NULL THEN
        -- Get username
        SELECT username INTO v_username FROM auth.users WHERE id = NEW.user_id;
        
        -- Get session details
        SELECT * INTO v_session FROM public.winner_takes_all_sessions WHERE id = NEW.session_id;
        
        -- Use updated log_game_play (with score_rating calculation)
        SELECT log_game_play(
            NEW.user_id,
            'winner_takes_all',
            'wta',
            NEW.session_id,
            NEW.score,
            NULL, -- accuracy
            NULL, -- reaction_time
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.joined_at))::INTEGER,
            jsonb_build_object(
                'config_id', v_session.config_id,
                'entry_fee', NEW.entry_fee
            )
        ) INTO v_audit_id;
        
        RAISE NOTICE '✅ WTA game logged: user=%, score=%, audit_id=%', 
            v_username, NEW.score, v_audit_id;
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
    RAISE NOTICE '✅ Updated 1v1 and WTA triggers with score_rating';
END $$;

-- ============================================================================
-- PART 8: CREATE MANUAL CLEANUP FUNCTION FOR TESTING
-- ============================================================================

DROP FUNCTION IF EXISTS manual_cleanup_test() CASCADE;

CREATE OR REPLACE FUNCTION manual_cleanup_test()
RETURNS TABLE(
    action TEXT,
    count INTEGER,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_before_count INTEGER;
    v_after_count INTEGER;
    v_deleted INTEGER;
    v_low_score_24h INTEGER;
BEGIN
    -- Count before
    SELECT COUNT(*) INTO v_before_count FROM public.game_audit_log;
    
    -- Count low scores older than 24h
    SELECT COUNT(*) INTO v_low_score_24h
    FROM public.game_audit_log
    WHERE score_rating < 7.0
    AND created_at < NOW() - INTERVAL '24 hours';
    
    -- Run cleanup
    SELECT deleted_count INTO v_deleted
    FROM cleanup_low_score_audit_logs();
    
    -- Count after
    SELECT COUNT(*) INTO v_after_count FROM public.game_audit_log;
    
    -- Return results
    RETURN QUERY
    SELECT 'Before'::TEXT, v_before_count, 'Total audit logs before cleanup'::TEXT
    UNION ALL
    SELECT 'Low scores (<7) older than 24h'::TEXT, v_low_score_24h, 'Eligible for deletion'::TEXT
    UNION ALL
    SELECT 'Deleted'::TEXT, v_deleted, 'Low scores deleted'::TEXT
    UNION ALL
    SELECT 'After'::TEXT, v_after_count, 'Total audit logs after cleanup'::TEXT
    UNION ALL
    SELECT 'High scores (≥7) kept'::TEXT, 
           (SELECT COUNT(*)::INTEGER FROM public.game_audit_log WHERE score_rating >= 7.0),
           'These are never deleted'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION manual_cleanup_test TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Created manual cleanup test function';
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_total_logs INTEGER;
    v_high_scores INTEGER;
    v_low_scores INTEGER;
    v_with_rating INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_logs FROM public.game_audit_log;
    SELECT COUNT(*) INTO v_high_scores FROM public.game_audit_log WHERE score_rating >= 7.0;
    SELECT COUNT(*) INTO v_low_scores FROM public.game_audit_log WHERE score_rating < 7.0;
    SELECT COUNT(*) INTO v_with_rating FROM public.game_audit_log WHERE score_rating IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL GAMES AUDIT SYSTEM FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CURRENT DATABASE STATUS:';
    RAISE NOTICE '   • Total audit logs: %', v_total_logs;
    RAISE NOTICE '   • High scores (≥7/10): %', v_high_scores;
    RAISE NOTICE '   • Low scores (<7/10): %', v_low_scores;
    RAISE NOTICE '   • Logs with rating: %', v_with_rating;
    RAISE NOTICE '';
    RAISE NOTICE '🎮 GAME SUPPORT:';
    RAISE NOTICE '   ✅ 1v1 Games - Auto-logged with triggers';
    RAISE NOTICE '   ✅ Winner Takes It All - Auto-logged with triggers';
    RAISE NOTICE '   ✅ Practice Games - Call frontend_log_game_completion()';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 FEATURES:';
    RAISE NOTICE '   ✅ Score rating (1-10 scale) calculated automatically';
    RAISE NOTICE '   ✅ Cheat detection for each game type';
    RAISE NOTICE '   ✅ Admin notified for scores ≥7/10';
    RAISE NOTICE '   ✅ Auto-cleanup of scores <7/10 after 24 hours';
    RAISE NOTICE '';
    RAISE NOTICE '🗑️ CLEANUP:';
    RAISE NOTICE '   • Automatic: Runs daily at 3 AM UTC';
    RAISE NOTICE '   • Manual: SELECT cleanup_low_score_audit_logs();';
    RAISE NOTICE '   • Test: SELECT * FROM manual_cleanup_test();';
    RAISE NOTICE '';
    RAISE NOTICE '📋 ADMIN VIEWS:';
    RAISE NOTICE '   • SELECT * FROM admin_all_games_stats;';
    RAISE NOTICE '   • SELECT * FROM admin_detailed_audit_view;';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚀 READY FOR PRODUCTION!';
    RAISE NOTICE '========================================';
END $$;

