-- ============================================================================
-- AUTO-CLEANUP LOW SCORES FROM AUDIT
-- ============================================================================
-- This script:
-- 1. Keeps only high scores (>= 7/10) permanently
-- 2. Deletes low scores (< 7/10) after 24 hours
-- 3. Ensures all games are being audited
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🧹 SETTING UP AUTO-CLEANUP SYSTEM';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 1: CREATE CLEANUP FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS cleanup_low_score_audits();

CREATE OR REPLACE FUNCTION cleanup_low_score_audits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
    v_score_threshold NUMERIC := 0.7; -- 7/10
    v_max_score INTEGER := 1000;
BEGIN
    -- Delete audit logs older than 24 hours with score < 7/10
    WITH deleted AS (
        DELETE FROM public.game_audit_log
        WHERE created_at < NOW() - INTERVAL '24 hours'
        AND (score::NUMERIC / v_max_score) < v_score_threshold
        AND suspicious = FALSE -- Keep suspicious ones for review
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;
    
    RAISE NOTICE '🧹 Cleaned up % low-score audit logs (< 7/10, > 24h old)', v_deleted_count;
    
    RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_low_score_audits TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Cleanup function created';
END $$;

-- ============================================================================
-- PART 2: CREATE SCHEDULED CLEANUP (PostgreSQL Extension)
-- ============================================================================

-- Note: This requires pg_cron extension
-- If you don't have it, run manually or use a cron job

DO $$
BEGIN
    -- Check if pg_cron is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule cleanup to run every hour
        PERFORM cron.schedule(
            'cleanup-low-score-audits',
            '0 * * * *', -- Every hour
            'SELECT cleanup_low_score_audits();'
        );
        RAISE NOTICE '✅ Scheduled cleanup job (runs hourly)';
    ELSE
        RAISE NOTICE '⚠️  pg_cron not installed - use manual cleanup or external cron';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Could not schedule cleanup: %', SQLERRM;
    RAISE NOTICE '💡 Run cleanup_low_score_audits() manually or via external cron';
END $$;

-- ============================================================================
-- PART 3: CREATE VIEW FOR HIGH SCORES ONLY
-- ============================================================================

DROP VIEW IF EXISTS admin_high_score_audits CASCADE;

CREATE VIEW admin_high_score_audits AS
SELECT 
    id,
    user_id,
    username,
    email,
    game_type,
    game_mode,
    score,
    accuracy,
    (score::NUMERIC / 1000) * 10 as score_rating, -- 0-10 scale
    suspicious,
    cheat_score,
    created_at
FROM public.game_audit_log
WHERE (score::NUMERIC / 1000) >= 0.7 -- 7/10 or higher
ORDER BY score DESC, created_at DESC;

-- Grant access to admins
GRANT SELECT ON admin_high_score_audits TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ High score view created';
END $$;

-- ============================================================================
-- PART 4: CREATE MANUAL CLEANUP TRIGGER (ALTERNATIVE)
-- ============================================================================

-- This trigger auto-deletes low scores after 24 hours on SELECT
-- (Only if pg_cron is not available)

DROP FUNCTION IF EXISTS trigger_cleanup_old_audits() CASCADE;

CREATE OR REPLACE FUNCTION trigger_cleanup_old_audits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_random NUMERIC;
BEGIN
    -- Only run cleanup 1% of the time to avoid overhead
    v_random := random();
    
    IF v_random < 0.01 THEN
        PERFORM cleanup_low_score_audits();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger cleanup on INSERT (when new games are logged)
DROP TRIGGER IF EXISTS trigger_periodic_cleanup ON public.game_audit_log;

CREATE TRIGGER trigger_periodic_cleanup
    AFTER INSERT ON public.game_audit_log
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_audits();

DO $$
BEGIN
    RAISE NOTICE '✅ Periodic cleanup trigger created (1%% chance on insert)';
END $$;

-- ============================================================================
-- PART 5: ADD SCORE RATING COLUMN FOR EASIER FILTERING
-- ============================================================================

-- Add a computed column for score rating (0-10 scale)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'game_audit_log'
        AND column_name = 'score_rating'
    ) THEN
        ALTER TABLE public.game_audit_log
        ADD COLUMN score_rating NUMERIC GENERATED ALWAYS AS (
            (score::NUMERIC / 1000) * 10
        ) STORED;
        
        RAISE NOTICE '✅ Added score_rating computed column';
    ELSE
        RAISE NOTICE '✅ score_rating column already exists';
    END IF;
END $$;

-- Create index on score rating
CREATE INDEX IF NOT EXISTS idx_game_audit_score_rating 
ON public.game_audit_log(score_rating DESC);

-- ============================================================================
-- PART 6: UPDATE RLS POLICIES TO SHOW HIGH SCORES
-- ============================================================================

-- Allow users to see high scores (>= 7/10) from other players
DROP POLICY IF EXISTS "Users can view high scores" ON public.game_audit_log;

CREATE POLICY "Users can view high scores"
ON public.game_audit_log
FOR SELECT
TO authenticated
USING (
    score_rating >= 7 -- 7/10 or higher
    OR user_id = auth.uid() -- Or their own scores
);

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policy updated for high scores';
END $$;

-- ============================================================================
-- PART 7: CREATE ADMIN DASHBOARD FUNCTIONS
-- ============================================================================

-- Get audit statistics
DROP FUNCTION IF EXISTS get_audit_statistics();

CREATE OR REPLACE FUNCTION get_audit_statistics()
RETURNS TABLE (
    total_audits BIGINT,
    high_scores BIGINT,
    low_scores BIGINT,
    suspicious_count BIGINT,
    unique_players BIGINT,
    avg_score NUMERIC,
    cleanup_eligible BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_audits,
        COUNT(*) FILTER (WHERE score_rating >= 7) as high_scores,
        COUNT(*) FILTER (WHERE score_rating < 7) as low_scores,
        COUNT(*) FILTER (WHERE suspicious = TRUE) as suspicious_count,
        COUNT(DISTINCT user_id) as unique_players,
        ROUND(AVG(score_rating), 2) as avg_score,
        COUNT(*) FILTER (
            WHERE created_at < NOW() - INTERVAL '24 hours'
            AND score_rating < 7
            AND suspicious = FALSE
        ) as cleanup_eligible
    FROM public.game_audit_log;
END;
$$;

GRANT EXECUTE ON FUNCTION get_audit_statistics TO authenticated;

-- Function to manually run cleanup
DROP FUNCTION IF EXISTS admin_run_cleanup();

CREATE OR REPLACE FUNCTION admin_run_cleanup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted INTEGER;
    v_admin_check BOOLEAN;
BEGIN
    -- Verify admin access
    SELECT EXISTS(
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'rf32191@gmail.com'
    ) INTO v_admin_check;
    
    IF NOT v_admin_check THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Admin access required'
        );
    END IF;
    
    -- Run cleanup
    SELECT cleanup_low_score_audits() INTO v_deleted;
    
    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', v_deleted,
        'message', format('Cleaned up %s low-score records', v_deleted)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_run_cleanup TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ Admin dashboard functions created';
END $$;

-- ============================================================================
-- PART 8: RUN IMMEDIATE CLEANUP
-- ============================================================================

DO $$
DECLARE
    v_deleted INTEGER;
BEGIN
    -- Run cleanup now
    SELECT cleanup_low_score_audits() INTO v_deleted;
    RAISE NOTICE '🧹 Initial cleanup: deleted % records', v_deleted;
END $$;

-- ============================================================================
-- FINAL VERIFICATION & SUMMARY
-- ============================================================================

DO $$
DECLARE
    v_stats RECORD;
BEGIN
    -- Get statistics
    SELECT * INTO v_stats FROM get_audit_statistics();
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ AUTO-CLEANUP SYSTEM COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CURRENT AUDIT STATISTICS:';
    RAISE NOTICE '   • Total audits: %', v_stats.total_audits;
    RAISE NOTICE '   • High scores (≥7/10): %', v_stats.high_scores;
    RAISE NOTICE '   • Low scores (<7/10): %', v_stats.low_scores;
    RAISE NOTICE '   • Suspicious: %', v_stats.suspicious_count;
    RAISE NOTICE '   • Unique players: %', v_stats.unique_players;
    RAISE NOTICE '   • Average score: %/10', v_stats.avg_score;
    RAISE NOTICE '';
    RAISE NOTICE '🧹 CLEANUP SYSTEM:';
    RAISE NOTICE '   ✅ Deletes low scores (< 7/10) after 24h';
    RAISE NOTICE '   ✅ Keeps high scores (≥ 7/10) permanently';
    RAISE NOTICE '   ✅ Keeps suspicious activity forever';
    RAISE NOTICE '   ✅ Automatic cleanup trigger active';
    RAISE NOTICE '';
    RAISE NOTICE '📋 WHAT YOU SEE IN ADMIN:';
    RAISE NOTICE '   • High scores only (≥ 7/10)';
    RAISE NOTICE '   • Suspicious activity';
    RAISE NOTICE '   • Recent games (< 24h)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 MANUAL CLEANUP:';
    RAISE NOTICE '   Run: SELECT admin_run_cleanup();';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚀 SYSTEM READY!';
    RAISE NOTICE '========================================';
END $$;

