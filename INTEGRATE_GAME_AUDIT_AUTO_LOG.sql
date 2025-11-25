-- ============================================================================
-- AUTOMATIC GAME AUDIT LOGGING & USER NOTIFICATIONS
-- ============================================================================
-- This script:
-- 1. Automatically logs ALL game plays to audit system
-- 2. Backs up all data to Supabase
-- 3. Sends user messages to rf32191@gmail.com when score > 6/10
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔗 INTEGRATING AUTOMATIC GAME LOGGING';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 1: CREATE TRIGGER TO AUTO-LOG 1V1 GAMES
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_1v1_game ON public.one_v_one_participants;

-- Create function to log 1v1 games
CREATE OR REPLACE FUNCTION auto_log_1v1_game()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_audit_id UUID;
BEGIN
    -- Only log when score is submitted (UPDATE with score)
    IF TG_OP = 'UPDATE' AND NEW.score IS NOT NULL AND OLD.score IS NULL THEN
        -- Get session info
        SELECT * INTO v_session
        FROM public.one_v_one_sessions
        WHERE id = NEW.session_id;
        
        -- Log the game play
        SELECT log_game_play(
            NEW.user_id,
            'one_v_one',
            '1v1',
            NEW.session_id,
            NEW.score,
            NULL, -- accuracy
            NULL, -- reaction_time
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.joined_at))::INTEGER, -- duration
            jsonb_build_object(
                'config_id', v_session.config_id,
                'entry_fee', NEW.entry_fee,
                'rng_seed', NEW.rng_seed
            )
        ) INTO v_audit_id;
        
        RAISE NOTICE '✅ Auto-logged 1v1 game: user=%, score=%, audit_id=%', NEW.user_id, NEW.score, v_audit_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_log_1v1_game
    AFTER UPDATE ON public.one_v_one_participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_log_1v1_game();

DO $$
BEGIN
    RAISE NOTICE '✅ 1v1 auto-logging trigger created';
END $$;

-- ============================================================================
-- PART 2: CREATE TRIGGER TO AUTO-LOG WTA GAMES
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_wta_game ON public.winner_takes_all_participants;

-- Create function to log WTA games
CREATE OR REPLACE FUNCTION auto_log_wta_game()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_audit_id UUID;
BEGIN
    -- Only log when score is submitted (UPDATE with score)
    IF TG_OP = 'UPDATE' AND NEW.score IS NOT NULL AND OLD.score IS NULL THEN
        -- Get session info
        SELECT * INTO v_session
        FROM public.winner_takes_all_sessions
        WHERE id = NEW.session_id;
        
        -- Log the game play
        SELECT log_game_play(
            NEW.user_id,
            'winner_takes_all',
            'wta',
            NEW.session_id,
            NEW.score,
            NULL, -- accuracy
            NULL, -- reaction_time
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.joined_at))::INTEGER, -- duration
            jsonb_build_object(
                'config_id', v_session.config_id,
                'entry_fee', NEW.entry_fee
            )
        ) INTO v_audit_id;
        
        RAISE NOTICE '✅ Auto-logged WTA game: user=%, score=%, audit_id=%', NEW.user_id, NEW.score, v_audit_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_log_wta_game
    AFTER UPDATE ON public.winner_takes_all_participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_log_wta_game();

DO $$
BEGIN
    RAISE NOTICE '✅ WTA auto-logging trigger created';
END $$;

-- ============================================================================
-- PART 3: MODIFY SUSPICIOUS DETECTION TO USE USER NOTIFICATIONS
-- ============================================================================

-- Update the notification function to send user messages
DROP FUNCTION IF EXISTS notify_admin_suspicious_activity(UUID, TEXT, UUID, TEXT, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION notify_admin_suspicious_activity(
    p_alert_id UUID,
    p_severity TEXT,
    p_user_id UUID,
    p_username TEXT,
    p_game_type TEXT,
    p_cheat_score NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_user_id UUID;
    v_title TEXT;
    v_message TEXT;
BEGIN
    -- Get admin user ID
    SELECT id INTO v_admin_user_id
    FROM auth.users
    WHERE email = 'rf32191@gmail.com';
    
    IF v_admin_user_id IS NULL THEN
        RAISE NOTICE '⚠️ Admin user not found: rf32191@gmail.com';
        RETURN;
    END IF;
    
    -- Build notification title
    v_title := '🚨 Suspicious Activity: ' || UPPER(p_severity);
    
    -- Build notification message
    v_message := format(
        'User: %s
Game: %s
Cheat Score: %s/100
Severity: %s

Review in Admin Dashboard → Game Audit',
        p_username,
        p_game_type,
        ROUND(p_cheat_score),
        UPPER(p_severity)
    );
    
    -- Send user notification
    INSERT INTO public.user_notifications (
        user_id,
        type,
        title,
        message,
        priority,
        metadata
    ) VALUES (
        v_admin_user_id,
        'admin_alert',
        v_title,
        v_message,
        CASE 
            WHEN p_severity = 'critical' THEN 'urgent'
            WHEN p_severity = 'high' THEN 'high'
            ELSE 'normal'
        END,
        jsonb_build_object(
            'alert_id', p_alert_id,
            'suspicious_user_id', p_user_id,
            'username', p_username,
            'game_type', p_game_type,
            'cheat_score', p_cheat_score
        )
    );
    
    -- Also keep in admin_notifications for backward compatibility
    INSERT INTO public.admin_notifications (
        admin_email,
        notification_type,
        severity,
        title,
        message,
        related_user_id,
        related_alert_id,
        data
    ) VALUES (
        'rf32191@gmail.com',
        'SUSPICIOUS_GAMEPLAY',
        p_severity,
        v_title,
        v_message,
        p_user_id,
        p_alert_id,
        jsonb_build_object(
            'username', p_username,
            'game_type', p_game_type,
            'cheat_score', p_cheat_score
        )
    );
    
    -- Mark alert as notified
    UPDATE public.game_security_alerts
    SET admin_notified = TRUE,
        admin_notified_at = NOW()
    WHERE id = p_alert_id;
    
    RAISE NOTICE '📧 Admin notified via user message: %', v_title;
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ Updated notification to use user messages';
END $$;

-- ============================================================================
-- PART 4: CREATE HIGH SCORE NOTIFICATION FUNCTION
-- ============================================================================

-- Function to notify admin when score > 6/10
CREATE OR REPLACE FUNCTION notify_admin_high_score(
    p_user_id UUID,
    p_username TEXT,
    p_game_type TEXT,
    p_score INTEGER,
    p_max_score INTEGER DEFAULT 1000
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_user_id UUID;
    v_score_ratio NUMERIC;
    v_title TEXT;
    v_message TEXT;
BEGIN
    -- Calculate score as a ratio (0-10 scale)
    v_score_ratio := (p_score::NUMERIC / p_max_score::NUMERIC) * 10;
    
    -- Only notify if score > 6/10
    IF v_score_ratio <= 6 THEN
        RETURN;
    END IF;
    
    -- Get admin user ID
    SELECT id INTO v_admin_user_id
    FROM auth.users
    WHERE email = 'rf32191@gmail.com';
    
    IF v_admin_user_id IS NULL THEN
        RAISE NOTICE '⚠️ Admin user not found: rf32191@gmail.com';
        RETURN;
    END IF;
    
    -- Build notification
    v_title := '🏆 High Score Alert: ' || ROUND(v_score_ratio, 1) || '/10';
    v_message := format(
        'Player: %s
Game: %s
Score: %s (%.1f/10)

Great performance! Review in Admin Dashboard.',
        p_username,
        p_game_type,
        p_score,
        v_score_ratio
    );
    
    -- Send user notification to admin
    INSERT INTO public.user_notifications (
        user_id,
        type,
        title,
        message,
        priority,
        metadata
    ) VALUES (
        v_admin_user_id,
        'high_score',
        v_title,
        v_message,
        'normal',
        jsonb_build_object(
            'player_user_id', p_user_id,
            'username', p_username,
            'game_type', p_game_type,
            'score', p_score,
            'score_ratio', v_score_ratio
        )
    );
    
    RAISE NOTICE '🏆 Admin notified of high score: % (%.1f/10)', p_username, v_score_ratio;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_admin_high_score TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ High score notification function created';
END $$;

-- ============================================================================
-- PART 5: UPDATE AUTO-LOG FUNCTIONS TO NOTIFY ON HIGH SCORES
-- ============================================================================

-- Update 1v1 auto-log to check for high scores
DROP FUNCTION IF EXISTS auto_log_1v1_game();

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
    -- Only log when score is submitted (UPDATE with score)
    IF TG_OP = 'UPDATE' AND NEW.score IS NOT NULL AND OLD.score IS NULL THEN
        -- Get username
        SELECT username INTO v_username
        FROM auth.users
        WHERE id = NEW.user_id;
        
        -- Get session info
        SELECT * INTO v_session
        FROM public.one_v_one_sessions
        WHERE id = NEW.session_id;
        
        -- Log the game play
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
        
        -- Notify admin if high score (> 6/10)
        PERFORM notify_admin_high_score(
            NEW.user_id,
            COALESCE(v_username, 'Player'),
            'one_v_one',
            NEW.score,
            1000 -- max score assumption
        );
        
        RAISE NOTICE '✅ Auto-logged 1v1: user=%, score=%', NEW.user_id, NEW.score;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_log_1v1_game ON public.one_v_one_participants;
CREATE TRIGGER trigger_log_1v1_game
    AFTER UPDATE ON public.one_v_one_participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_log_1v1_game();

-- Update WTA auto-log to check for high scores
DROP FUNCTION IF EXISTS auto_log_wta_game();

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
    -- Only log when score is submitted (UPDATE with score)
    IF TG_OP = 'UPDATE' AND NEW.score IS NOT NULL AND OLD.score IS NULL THEN
        -- Get username
        SELECT username INTO v_username
        FROM auth.users
        WHERE id = NEW.user_id;
        
        -- Get session info
        SELECT * INTO v_session
        FROM public.winner_takes_all_sessions
        WHERE id = NEW.session_id;
        
        -- Log the game play
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
        
        -- Notify admin if high score (> 6/10)
        PERFORM notify_admin_high_score(
            NEW.user_id,
            COALESCE(v_username, 'Player'),
            'winner_takes_all',
            NEW.score,
            1000 -- max score assumption
        );
        
        RAISE NOTICE '✅ Auto-logged WTA: user=%, score=%', NEW.user_id, NEW.score;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_log_wta_game ON public.winner_takes_all_participants;
CREATE TRIGGER trigger_log_wta_game
    AFTER UPDATE ON public.winner_takes_all_participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_log_wta_game();

DO $$
BEGIN
    RAISE NOTICE '✅ Updated auto-log functions with high score notifications';
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_1v1_trigger BOOLEAN;
    v_wta_trigger BOOLEAN;
    v_functions INTEGER;
BEGIN
    -- Check triggers exist
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_log_1v1_game'
    ) INTO v_1v1_trigger;
    
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_log_wta_game'
    ) INTO v_wta_trigger;
    
    -- Count functions
    SELECT COUNT(*) INTO v_functions
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
        'auto_log_1v1_game',
        'auto_log_wta_game',
        'notify_admin_high_score'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ AUTOMATIC GAME LOGGING COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔗 INTEGRATION STATUS:';
    RAISE NOTICE '   ✅ 1v1 auto-logging: %', v_1v1_trigger;
    RAISE NOTICE '   ✅ WTA auto-logging: %', v_wta_trigger;
    RAISE NOTICE '   ✅ Helper functions: %', v_functions;
    RAISE NOTICE '';
    RAISE NOTICE '📊 WHAT HAPPENS NOW:';
    RAISE NOTICE '   • Every 1v1 game auto-logs to audit';
    RAISE NOTICE '   • Every WTA game auto-logs to audit';
    RAISE NOTICE '   • All data backed up to Supabase';
    RAISE NOTICE '   • Suspicious patterns auto-detected';
    RAISE NOTICE '';
    RAISE NOTICE '📧 ADMIN NOTIFICATIONS:';
    RAISE NOTICE '   • User message when score > 6/10';
    RAISE NOTICE '   • User message on suspicious activity';
    RAISE NOTICE '   • Sent to: rf32191@gmail.com';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 GAMES COVERED:';
    RAISE NOTICE '   ✅ 1v1 Games (auto)';
    RAISE NOTICE '   ✅ Winner Takes It All (auto)';
    RAISE NOTICE '   📝 Practice games (manual integration)';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚀 PLAY A GAME TO TEST!';
    RAISE NOTICE '========================================';
END $$;

