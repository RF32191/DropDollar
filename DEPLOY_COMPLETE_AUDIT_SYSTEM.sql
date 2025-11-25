-- ============================================================================
-- COMPLETE AUDIT SYSTEM DEPLOYMENT
-- ============================================================================
-- Deploy this SINGLE file to enable complete game audit tracking
-- Run this in Supabase SQL Editor
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚀 DEPLOYING COMPLETE AUDIT SYSTEM';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 1: CREATE AUDIT TABLES
-- ============================================================================

-- Drop existing tables to ensure clean deployment
DROP TABLE IF EXISTS public.game_security_alerts CASCADE;
DROP TABLE IF EXISTS public.game_audit_log CASCADE;
DROP TABLE IF EXISTS public.admin_notifications CASCADE;

-- Game audit log table
CREATE TABLE IF NOT EXISTS public.game_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    email TEXT,
    game_type TEXT NOT NULL,
    game_mode TEXT NOT NULL,
    session_id UUID,
    score INTEGER NOT NULL,
    score_rating NUMERIC(3,1) DEFAULT 0,
    max_score INTEGER DEFAULT 1000,
    accuracy NUMERIC(5,2),
    reaction_time NUMERIC(10,2),
    duration_seconds INTEGER,
    ip_address INET,
    suspicious BOOLEAN DEFAULT FALSE,
    suspicious_reasons TEXT[],
    cheat_score NUMERIC(5,2) DEFAULT 0,
    additional_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security alerts table
CREATE TABLE IF NOT EXISTS public.game_security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    evidence JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_user_id UUID,
    related_game_type TEXT,
    related_audit_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON public.game_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_game_type ON public.game_audit_log(game_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.game_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_score_rating ON public.game_audit_log(score_rating);
CREATE INDEX IF NOT EXISTS idx_audit_suspicious ON public.game_audit_log(suspicious) WHERE suspicious = TRUE;
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.game_security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.game_security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_notif_admin_email ON public.admin_notifications(admin_email);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON public.admin_notifications(is_read) WHERE is_read = FALSE;

DO $$
BEGIN
    RAISE NOTICE '✅ Audit tables created';
END $$;

-- ============================================================================
-- PART 2: RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.game_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.game_audit_log;
DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.game_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.game_audit_log;

DROP POLICY IF EXISTS "Admin can view all alerts" ON public.game_security_alerts;
DROP POLICY IF EXISTS "Service role can insert alerts" ON public.game_security_alerts;

DROP POLICY IF EXISTS "Admin can view own notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.admin_notifications;

-- Audit log policies
CREATE POLICY "Users can view own audit logs"
    ON public.game_audit_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all audit logs"
    ON public.game_audit_log FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email = 'rf32191@gmail.com'
        )
    );

CREATE POLICY "Service role can insert audit logs"
    ON public.game_audit_log FOR INSERT
    WITH CHECK (true);

-- Alert policies
CREATE POLICY "Admin can view all alerts"
    ON public.game_security_alerts FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email = 'rf32191@gmail.com'
        )
    );

CREATE POLICY "Service role can insert alerts"
    ON public.game_security_alerts FOR INSERT
    WITH CHECK (true);

-- Notification policies
CREATE POLICY "Admin can view own notifications"
    ON public.admin_notifications FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email = admin_email
        )
    );

CREATE POLICY "Service role can insert notifications"
    ON public.admin_notifications FOR INSERT
    WITH CHECK (true);

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies created';
END $$;

-- ============================================================================
-- PART 3: GAME-SPECIFIC CHEAT DETECTION
-- ============================================================================

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
    v_max_possible_score INTEGER := 1000;
BEGIN
    -- Game-specific validation
    CASE p_game_type
        WHEN 'laser_dodge' THEN
            IF p_score > 800 AND p_duration_seconds < 60 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 40;
                v_reasons := array_append(v_reasons, 'Laser Dodge: High score too fast');
            END IF;
        
        WHEN 'multi_target_reaction', 'multi_target' THEN
            IF p_accuracy > 98 AND p_score > 900 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 35;
                v_reasons := array_append(v_reasons, 'Multi Target: Near-perfect accuracy');
            END IF;
        
        WHEN 'sword_parry' THEN
            IF p_score > 800 AND p_duration_seconds < 40 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 40;
                v_reasons := array_append(v_reasons, 'Sword Parry: Completed too quickly');
            END IF;
        
        WHEN 'quick_click', 'number_tap' THEN
            IF p_reaction_time IS NOT NULL AND p_reaction_time < 0.05 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 60;
                v_reasons := array_append(v_reasons, 'Quick Click: Bot-like speed');
            END IF;
        
        WHEN 'color_sequence', 'memory_color' THEN
            IF p_score > 900 AND p_duration_seconds < 30 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 50;
                v_reasons := array_append(v_reasons, 'Color Sequence: Impossible memory recall');
            END IF;
        
        WHEN 'blade_bounce' THEN
            IF p_score > 850 AND p_duration_seconds < 50 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 40;
                v_reasons := array_append(v_reasons, 'Blade Bounce: Survived too long too fast');
            END IF;
        
        WHEN 'cash_stack', 'falling_object' THEN
            IF p_accuracy IS NOT NULL AND p_accuracy > 95 AND p_score > 850 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 35;
                v_reasons := array_append(v_reasons, 'Catching: Near-perfect accuracy');
            END IF;
    END CASE;
    
    -- Universal checks
    IF p_score > v_max_possible_score THEN
        v_is_suspicious := TRUE;
        v_cheat_score := v_cheat_score + 100;
        v_reasons := array_append(v_reasons, 'Score exceeds maximum possible');
    END IF;
    
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
-- PART 4: PATTERN DETECTION
-- ============================================================================

DROP FUNCTION IF EXISTS detect_suspicious_patterns(UUID, UUID, TEXT, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION detect_suspicious_patterns(
    p_audit_id UUID,
    p_user_id UUID,
    p_game_type TEXT,
    p_score INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recent_games INTEGER;
    v_avg_score NUMERIC;
    v_sudden_improvement BOOLEAN := FALSE;
BEGIN
    -- Check recent game history
    SELECT COUNT(*), AVG(score)
    INTO v_recent_games, v_avg_score
    FROM public.game_audit_log
    WHERE user_id = p_user_id
    AND game_type = p_game_type
    AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Detect sudden skill jump
    IF v_recent_games > 3 AND p_score > (v_avg_score * 1.5) THEN
        v_sudden_improvement := TRUE;
        
        UPDATE public.game_audit_log
        SET suspicious = TRUE,
            suspicious_reasons = array_append(suspicious_reasons, 'Sudden skill improvement detected'),
            cheat_score = cheat_score + 25
        WHERE id = p_audit_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION detect_suspicious_patterns TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Pattern detection created';
END $$;

-- ============================================================================
-- PART 5: ADMIN NOTIFICATION FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS notify_admin_high_score(UUID, TEXT, TEXT, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION notify_admin_high_score(
    p_user_id UUID,
    p_username TEXT,
    p_game_type TEXT,
    p_score INTEGER,
    p_max_score INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_score_rating NUMERIC;
BEGIN
    v_score_rating := ROUND((p_score::NUMERIC / p_max_score) * 10, 1);
    
    IF v_score_rating >= 7.0 THEN
        INSERT INTO public.admin_notifications (
            admin_email,
            notification_type,
            title,
            message,
            related_user_id,
            related_game_type
        ) VALUES (
            'rf32191@gmail.com',
            'high_score',
            format('🎮 High Score: %s', p_game_type),
            format('%s scored %s (%s/10) in %s', p_username, p_score, v_score_rating, p_game_type),
            p_user_id,
            p_game_type
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_admin_high_score TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Admin notification function created';
END $$;

-- ============================================================================
-- PART 6: CORE LOG_GAME_PLAY FUNCTION
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
    v_score_rating := LEAST(v_score_rating, 10.0);
    
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
    
    -- Run pattern detection
    PERFORM detect_suspicious_patterns(v_audit_id, p_user_id, p_game_type, p_score);
    
    -- Notify admin if score is 7/10 or higher
    IF v_score_rating >= 7.0 THEN
        PERFORM notify_admin_high_score(p_user_id, COALESCE(v_username, 'Player'), p_game_type, p_score, v_max_score);
    END IF;
    
    RAISE NOTICE '✅ Game logged: type=%, user=%, score=%, rating=%/10', 
        p_game_type, v_username, p_score, v_score_rating;
    
    RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_game_play TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ log_game_play function created';
END $$;

-- ============================================================================
-- PART 7: FRONTEND INTEGRATION FUNCTION
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
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not authenticated'
        );
    END IF;
    
    SELECT username INTO v_username
    FROM auth.users
    WHERE id = v_user_id;
    
    SELECT log_game_play(
        v_user_id,
        p_game_type,
        p_game_mode,
        gen_random_uuid(),
        p_score,
        p_accuracy,
        p_reaction_time,
        p_duration_seconds,
        p_additional_data
    ) INTO v_audit_id;
    
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
    RAISE NOTICE '✅ frontend_log_game_completion function created';
END $$;

-- ============================================================================
-- PART 8: ADMIN VIEWS
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
    RAISE NOTICE '✅ Admin views created';
END $$;

-- ============================================================================
-- PART 9: CLEANUP FUNCTION
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
    DELETE FROM public.game_audit_log
    WHERE score_rating < 7.0
    AND created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    SELECT COUNT(*) INTO v_kept_count
    FROM public.game_audit_log
    WHERE score_rating >= 7.0;
    
    RAISE NOTICE '🗑️ Cleanup: deleted % low scores, kept % high scores', 
        v_deleted_count, v_kept_count;
    
    RETURN QUERY SELECT v_deleted_count, v_kept_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_low_score_audit_logs TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Cleanup function created';
END $$;

-- ============================================================================
-- PART 10: ADMIN HELPER FUNCTIONS
-- ============================================================================

-- Drop all possible versions of get_admin_notifications
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc 
        WHERE proname = 'get_admin_notifications'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.get_admin_notifications(%s) CASCADE', r.argtypes);
        RAISE NOTICE 'Dropped function: get_admin_notifications(%)', r.argtypes;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION get_admin_notifications(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
    id UUID,
    notification_type TEXT,
    title TEXT,
    message TEXT,
    related_user_id UUID,
    related_game_type TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.notification_type,
        n.title,
        n.message,
        n.related_user_id,
        n.related_game_type,
        n.is_read,
        n.created_at
    FROM public.admin_notifications n
    WHERE n.admin_email = 'rf32191@gmail.com'
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_notifications TO authenticated;

-- Drop all possible versions of mark_notification_read
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc 
        WHERE proname = 'mark_notification_read'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.mark_notification_read(%s) CASCADE', r.argtypes);
        RAISE NOTICE 'Dropped function: mark_notification_read(%)', r.argtypes;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.admin_notifications
    SET is_read = TRUE
    WHERE id = p_notification_id
    AND admin_email = 'rf32191@gmail.com';
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Admin helper functions created';
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_tables INTEGER;
    v_functions INTEGER;
    v_views INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('game_audit_log', 'game_security_alerts', 'admin_notifications');
    
    SELECT COUNT(*) INTO v_functions
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
        'detect_game_specific_cheating',
        'detect_suspicious_patterns',
        'notify_admin_high_score',
        'log_game_play',
        'frontend_log_game_completion',
        'cleanup_low_score_audit_logs',
        'get_admin_notifications',
        'mark_notification_read'
    );
    
    SELECT COUNT(*) INTO v_views
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name IN ('admin_all_games_stats', 'admin_detailed_audit_view');
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DEPLOYMENT COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 SYSTEM STATUS:';
    RAISE NOTICE '   • Tables: % / 3', v_tables;
    RAISE NOTICE '   • Functions: % / 8', v_functions;
    RAISE NOTICE '   • Views: % / 2', v_views;
    RAISE NOTICE '';
    RAISE NOTICE '🎮 READY FOR GAME AUDIT!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All games will now log to admin@rf32191@gmail.com';
    RAISE NOTICE '✅ High scores (≥7/10) trigger admin notifications';
    RAISE NOTICE '✅ Low scores (<7/10) auto-delete after 24 hours';
    RAISE NOTICE '';
    RAISE NOTICE '📋 TEST IT:';
    RAISE NOTICE '   1. Play any game';
    RAISE NOTICE '   2. Check: SELECT * FROM admin_detailed_audit_view LIMIT 10;';
    RAISE NOTICE '   3. Check: SELECT * FROM get_admin_notifications(10);';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

