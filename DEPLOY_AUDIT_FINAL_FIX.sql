-- ============================================================================
-- AUDIT SYSTEM - ABSOLUTELY NO DEADLOCKS VERSION
-- ============================================================================
-- Run each section ONE AT A TIME if you keep getting deadlocks
-- Or run the whole thing - it's designed to avoid deadlocks completely
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EVERYTHING (Reverse dependency order)
-- ============================================================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS public.admin_detailed_audit_view CASCADE;
DROP VIEW IF EXISTS public.admin_all_games_stats CASCADE;

-- Drop all functions (they might depend on tables)
DROP FUNCTION IF EXISTS public.frontend_log_game_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.log_game_play(UUID, TEXT, TEXT, UUID, INTEGER, NUMERIC, NUMERIC, INTEGER, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.notify_admin_high_score(UUID, TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.detect_suspicious_patterns(UUID, UUID, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.detect_game_specific_cheating(TEXT, INTEGER, NUMERIC, NUMERIC, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_low_score_audit_logs() CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_notifications(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.mark_notification_read(UUID) CASCADE;

-- Drop tables last (nothing depends on them now)
DROP TABLE IF EXISTS public.admin_notifications CASCADE;
DROP TABLE IF EXISTS public.game_security_alerts CASCADE;
DROP TABLE IF EXISTS public.game_audit_log CASCADE;

-- Give Postgres a moment to clean up
DO $$ BEGIN PERFORM pg_sleep(0.5); END $$;

-- ============================================================================
-- STEP 2: CREATE TABLES (Nothing depends on these yet)
-- ============================================================================

CREATE TABLE public.game_audit_log (
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
    threat_level TEXT DEFAULT 'NONE' CHECK (threat_level IN ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    additional_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.game_security_alerts (
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

CREATE TABLE public.admin_notifications (
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

-- ============================================================================
-- STEP 3: CREATE INDEXES (Improves performance)
-- ============================================================================

CREATE INDEX idx_audit_user_id ON public.game_audit_log(user_id);
CREATE INDEX idx_audit_game_type ON public.game_audit_log(game_type);
CREATE INDEX idx_audit_created_at ON public.game_audit_log(created_at);
CREATE INDEX idx_audit_score_rating ON public.game_audit_log(score_rating);
CREATE INDEX idx_audit_suspicious ON public.game_audit_log(suspicious) WHERE suspicious = TRUE;
CREATE INDEX idx_audit_cheat_score ON public.game_audit_log(cheat_score);
CREATE INDEX idx_audit_threat_level ON public.game_audit_log(threat_level);

CREATE INDEX idx_security_user_id ON public.game_security_alerts(user_id);
CREATE INDEX idx_security_severity ON public.game_security_alerts(severity);
CREATE INDEX idx_security_created_at ON public.game_security_alerts(created_at);

CREATE INDEX idx_notif_admin_email ON public.admin_notifications(admin_email);
CREATE INDEX idx_notif_read ON public.admin_notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notif_created_at ON public.admin_notifications(created_at);

-- ============================================================================
-- STEP 4: CREATE FUNCTIONS (Now that tables exist)
-- ============================================================================

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
                v_reasons := array_append(v_reasons, 'Color Sequence: Impossible memory');
            END IF;
        WHEN 'blade_bounce' THEN
            IF p_score > 850 AND p_duration_seconds < 50 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 40;
                v_reasons := array_append(v_reasons, 'Blade Bounce: Too fast');
            END IF;
        WHEN 'cash_stack', 'falling_object' THEN
            IF p_accuracy IS NOT NULL AND p_accuracy > 95 AND p_score > 850 THEN
                v_is_suspicious := TRUE;
                v_cheat_score := v_cheat_score + 35;
                v_reasons := array_append(v_reasons, 'Perfect accuracy');
            END IF;
    END CASE;
    
    IF p_score > v_max_possible_score THEN
        v_is_suspicious := TRUE;
        v_cheat_score := v_cheat_score + 100;
        v_reasons := array_append(v_reasons, 'Score exceeds maximum');
    END IF;
    
    IF p_duration_seconds <= 0 THEN
        v_is_suspicious := TRUE;
        v_cheat_score := v_cheat_score + 80;
        v_reasons := array_append(v_reasons, 'Invalid duration');
    END IF;
    
    RETURN jsonb_build_object(
        'suspicious', v_is_suspicious,
        'cheat_score', LEAST(v_cheat_score, 100),
        'reasons', v_reasons
    );
END;
$$;

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
BEGIN
    SELECT COUNT(*), AVG(score)
    INTO v_recent_games, v_avg_score
    FROM public.game_audit_log
    WHERE user_id = p_user_id
    AND game_type = p_game_type
    AND created_at > NOW() - INTERVAL '1 hour';
    
    IF v_recent_games > 3 AND p_score > (v_avg_score * 1.5) THEN
        UPDATE public.game_audit_log
        SET suspicious = TRUE,
            suspicious_reasons = array_append(suspicious_reasons, 'Sudden skill jump'),
            cheat_score = cheat_score + 25
        WHERE id = p_audit_id;
    END IF;
END;
$$;

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
    v_threat_level TEXT := 'NONE';
    v_max_score INTEGER := 1000;
    v_score_rating NUMERIC;
BEGIN
    SELECT username, email INTO v_username, v_email
    FROM auth.users WHERE id = p_user_id;
    
    v_score_rating := ROUND((p_score::NUMERIC / v_max_score) * 10, 1);
    v_score_rating := LEAST(v_score_rating, 10.0);
    
    v_game_cheat_check := detect_game_specific_cheating(
        p_game_type, p_score, p_accuracy, p_reaction_time, p_duration_seconds
    );
    
    IF (v_game_cheat_check->>'suspicious')::BOOLEAN THEN
        v_is_suspicious := TRUE;
        v_cheat_score := (v_game_cheat_check->>'cheat_score')::NUMERIC;
        SELECT array_agg(value::TEXT) INTO v_suspicious_reasons
        FROM jsonb_array_elements_text(v_game_cheat_check->'reasons');
    END IF;
    
    -- Calculate threat level
    IF v_cheat_score >= 80 THEN
        v_threat_level := 'CRITICAL';
    ELSIF v_cheat_score >= 60 THEN
        v_threat_level := 'HIGH';
    ELSIF v_cheat_score >= 40 THEN
        v_threat_level := 'MEDIUM';
    ELSIF v_cheat_score >= 20 THEN
        v_threat_level := 'LOW';
    ELSE
        v_threat_level := 'NONE';
    END IF;
    
    INSERT INTO public.game_audit_log (
        user_id, username, email, game_type, game_mode, session_id,
        score, score_rating, max_score, accuracy, reaction_time,
        duration_seconds, ip_address, suspicious, suspicious_reasons,
        cheat_score, threat_level, additional_data
    ) VALUES (
        p_user_id, v_username, v_email, p_game_type, p_game_mode, p_session_id,
        p_score, v_score_rating, v_max_score, p_accuracy, p_reaction_time,
        p_duration_seconds, inet_client_addr(), v_is_suspicious, v_suspicious_reasons,
        v_cheat_score, v_threat_level, p_additional_data
    ) RETURNING id INTO v_audit_id;
    
    PERFORM detect_suspicious_patterns(v_audit_id, p_user_id, p_game_type, p_score);
    
    IF v_score_rating >= 7.0 THEN
        PERFORM notify_admin_high_score(p_user_id, COALESCE(v_username, 'Player'), p_game_type, p_score, v_max_score);
    END IF;
    
    RETURN v_audit_id;
END;
$$;

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
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    SELECT username INTO v_username FROM auth.users WHERE id = v_user_id;
    
    SELECT log_game_play(
        v_user_id, p_game_type, p_game_mode, gen_random_uuid(),
        p_score, p_accuracy, p_reaction_time, p_duration_seconds, p_additional_data
    ) INTO v_audit_id;
    
    SELECT cheat_score, score_rating INTO v_cheat_score, v_score_rating
    FROM public.game_audit_log WHERE id = v_audit_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'audit_id', v_audit_id,
        'cheat_score', v_cheat_score,
        'score_rating', v_score_rating,
        'message', 'Game logged'
    );
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_low_score_audit_logs()
RETURNS TABLE(deleted_count INTEGER, kept_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted INTEGER;
    v_kept INTEGER;
BEGIN
    DELETE FROM public.game_audit_log
    WHERE score_rating < 7.0
    AND created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    SELECT COUNT(*) INTO v_kept FROM public.game_audit_log;
    
    RETURN QUERY SELECT v_deleted, v_kept;
END;
$$;

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
    SELECT n.id, n.notification_type, n.title, n.message,
           n.related_user_id, n.related_game_type, n.is_read, n.created_at
    FROM public.admin_notifications n
    WHERE n.admin_email = 'rf32191@gmail.com'
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.admin_notifications
    SET is_read = TRUE
    WHERE id = p_notification_id
    AND admin_email = 'rf32191@gmail.com';
END;
$$;

-- ============================================================================
-- STEP 5: CREATE VIEWS (Now that tables and functions exist)
-- ============================================================================

CREATE OR REPLACE VIEW admin_all_games_stats AS
SELECT 
    game_type,
    game_mode,
    COUNT(*) as total_plays,
    AVG(score)::INTEGER as avg_score,
    MAX(score) as high_score,
    AVG(score_rating)::NUMERIC(3,1) as avg_rating,
    COUNT(*) FILTER (WHERE suspicious = TRUE) as suspicious_count,
    AVG(cheat_score)::NUMERIC(5,2) as avg_cheat_score
FROM public.game_audit_log
GROUP BY game_type, game_mode
ORDER BY total_plays DESC;

CREATE OR REPLACE VIEW admin_detailed_audit_view AS
SELECT 
    g.id,
    g.user_id,
    g.username,
    g.email,
    g.game_type,
    g.game_mode,
    g.score,
    g.score_rating,
    g.accuracy,
    g.cheat_score,
    g.threat_level,
    g.suspicious,
    g.suspicious_reasons,
    g.created_at,
    u.email as user_email
FROM public.game_audit_log g
LEFT JOIN auth.users u ON g.user_id = u.id
ORDER BY g.created_at DESC;

-- ============================================================================
-- STEP 6: ENABLE RLS AND CREATE POLICIES (Last step)
-- ============================================================================

ALTER TABLE public.game_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Game audit log policies
CREATE POLICY "Users can view own audit logs"
    ON public.game_audit_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all audit logs"
    ON public.game_audit_log FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com'
        )
    );

CREATE POLICY "Service role can insert audit logs"
    ON public.game_audit_log FOR INSERT
    WITH CHECK (true);

-- Security alerts policies
CREATE POLICY "Admin can view all security alerts"
    ON public.game_security_alerts FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com'
        )
    );

-- Admin notifications policies
CREATE POLICY "Admin can view own notifications"
    ON public.admin_notifications FOR SELECT
    USING (admin_email = 'rf32191@gmail.com');

-- ============================================================================
-- VERIFICATION & SUCCESS MESSAGE
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
        'detect_game_specific_cheating', 'detect_suspicious_patterns',
        'notify_admin_high_score', 'log_game_play',
        'frontend_log_game_completion', 'cleanup_low_score_audit_logs',
        'get_admin_notifications', 'mark_notification_read'
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
    RAISE NOTICE '🎮 NEXT STEPS:';
    RAISE NOTICE '   1. Go to: https://www.drop-dollar.com/games/practice';
    RAISE NOTICE '   2. Open browser console (F12)';
    RAISE NOTICE '   3. Play any game';
    RAISE NOTICE '   4. Look for: "✅ Game audited successfully"';
    RAISE NOTICE '   5. Check Admin Dashboard → Audit Logs tab';
    RAISE NOTICE '';
    RAISE NOTICE 'If ALL numbers match (3/3, 8/8, 2/2) - YOU''RE DONE! 🎉';
    RAISE NOTICE '';
END $$;

