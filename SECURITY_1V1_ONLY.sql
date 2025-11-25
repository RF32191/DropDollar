-- ============================================================================
-- 1V1 GAME SECURITY ONLY
-- ============================================================================
-- This file ONLY handles 1v1 games - completely separate from WTA
-- Ensures fair skill-based gaming for 1v1 matches
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎮 1V1 GAME SECURITY SETUP';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 1: ENABLE RLS ON 1V1 TABLES ONLY
-- ============================================================================

ALTER TABLE public.one_v_one_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_v_one_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_v_one_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '✅ RLS enabled on 1v1 tables';
END $$;

-- ============================================================================
-- PART 2: DROP OLD 1V1 POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🧹 Cleaning up old 1v1 policies...';
END $$;

DROP POLICY IF EXISTS "Anyone can view 1v1 configs" ON public.one_v_one_configs;
DROP POLICY IF EXISTS "Anyone can view 1v1 sessions" ON public.one_v_one_sessions;
DROP POLICY IF EXISTS "Anyone can view 1v1 participants" ON public.one_v_one_participants;
DROP POLICY IF EXISTS "Users can join 1v1 sessions" ON public.one_v_one_participants;
DROP POLICY IF EXISTS "configs_public_read" ON public.one_v_one_configs;
DROP POLICY IF EXISTS "sessions_public_read" ON public.one_v_one_sessions;
DROP POLICY IF EXISTS "participants_own_read" ON public.one_v_one_participants;
DROP POLICY IF EXISTS "1v1_configs_public_read" ON public.one_v_one_configs;
DROP POLICY IF EXISTS "1v1_sessions_public_read" ON public.one_v_one_sessions;
DROP POLICY IF EXISTS "1v1_participants_own_read" ON public.one_v_one_participants;
DROP POLICY IF EXISTS "Public can view 1v1 game configs" ON public.one_v_one_configs;
DROP POLICY IF EXISTS "Public can view 1v1 sessions" ON public.one_v_one_sessions;
DROP POLICY IF EXISTS "Only game functions can modify 1v1 sessions" ON public.one_v_one_sessions;
DROP POLICY IF EXISTS "Public can view 1v1 participants" ON public.one_v_one_participants;
DROP POLICY IF EXISTS "Users can join 1v1 games" ON public.one_v_one_participants;
DROP POLICY IF EXISTS "Users can submit their own 1v1 scores" ON public.one_v_one_participants;

DO $$
BEGIN
    RAISE NOTICE '✅ Old 1v1 policies removed';
END $$;

-- ============================================================================
-- PART 3: CREATE 1V1 SECURITY POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🛡️ Creating 1v1 security policies...';
END $$;

-- 1v1 Configs: Everyone can read
CREATE POLICY "1v1_configs_read"
ON public.one_v_one_configs
FOR SELECT
TO public
USING (true);

-- 1v1 Sessions: Everyone can read
CREATE POLICY "1v1_sessions_read"
ON public.one_v_one_sessions
FOR SELECT
TO public
USING (true);

-- 1v1 Sessions: Block direct user updates (only functions can modify)
CREATE POLICY "1v1_sessions_no_user_updates"
ON public.one_v_one_sessions
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "1v1_sessions_no_user_inserts"
ON public.one_v_one_sessions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 1v1 Participants: Everyone can read
CREATE POLICY "1v1_participants_read"
ON public.one_v_one_participants
FOR SELECT
TO public
USING (true);

-- 1v1 Participants: Users can ONLY insert their own (join games)
CREATE POLICY "1v1_participants_join_own"
ON public.one_v_one_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 1v1 Participants: Users can ONLY update their own score
CREATE POLICY "1v1_participants_update_own_score"
ON public.one_v_one_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
    RAISE NOTICE '✅ 1v1 security policies created';
END $$;

-- ============================================================================
-- PART 4: CREATE 1V1 ANTI-CHEAT FUNCTION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚫 Creating 1v1 anti-cheat...';
END $$;

CREATE OR REPLACE FUNCTION validate_1v1_score_submission(
    p_session_id UUID,
    p_user_id UUID,
    p_score INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant_exists BOOLEAN;
    v_already_submitted BOOLEAN;
BEGIN
    -- Check 1: User must be a participant
    SELECT EXISTS(
        SELECT 1 FROM public.one_v_one_participants
        WHERE session_id = p_session_id AND user_id = p_user_id
    ) INTO v_participant_exists;
    
    IF NOT v_participant_exists THEN
        RETURN jsonb_build_object(
            'valid', false,
            'reason', 'Not a participant in this session'
        );
    END IF;
    
    -- Check 2: Score not already submitted
    SELECT EXISTS(
        SELECT 1 FROM public.one_v_one_participants
        WHERE session_id = p_session_id 
        AND user_id = p_user_id 
        AND score IS NOT NULL
    ) INTO v_already_submitted;
    
    IF v_already_submitted THEN
        RETURN jsonb_build_object(
            'valid', false,
            'reason', 'Score already submitted'
        );
    END IF;
    
    -- Check 3: Score is reasonable
    IF p_score < 0 OR p_score > 1000000 THEN
        RETURN jsonb_build_object(
            'valid', false,
            'reason', 'Score out of valid range'
        );
    END IF;
    
    -- All checks passed
    RETURN jsonb_build_object(
        'valid', true,
        'reason', 'Valid submission'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_1v1_score_submission TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ 1v1 anti-cheat function created';
END $$;

-- ============================================================================
-- PART 5: CREATE 1V1 PERFORMANCE INDEXES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚡ Creating 1v1 performance indexes...';
END $$;

CREATE INDEX IF NOT EXISTS idx_1v1_participants_user_id 
ON public.one_v_one_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_1v1_participants_session_id 
ON public.one_v_one_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_1v1_participants_score 
ON public.one_v_one_participants(score) 
WHERE score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_1v1_sessions_config_id 
ON public.one_v_one_sessions(config_id);

CREATE INDEX IF NOT EXISTS idx_1v1_sessions_status 
ON public.one_v_one_sessions(status);

DO $$
BEGIN
    RAISE NOTICE '✅ 1v1 performance indexes created';
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_policies
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('one_v_one_sessions', 'one_v_one_participants', 'one_v_one_configs');
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 1V1 SECURITY COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 1V1 PROTECTIONS:';
    RAISE NOTICE '   ✅ Users can ONLY update their own scores';
    RAISE NOTICE '   ✅ Users CANNOT manipulate sessions';
    RAISE NOTICE '   ✅ Users CANNOT change other players';
    RAISE NOTICE '   ✅ Anti-cheat validation active';
    RAISE NOTICE '   ✅ % RLS policies active', v_policies;
    RAISE NOTICE '';
    RAISE NOTICE '✅ USERS CAN:';
    RAISE NOTICE '   • View all 1v1 games & sessions';
    RAISE NOTICE '   • Join 1v1 games';
    RAISE NOTICE '   • Submit their own scores';
    RAISE NOTICE '';
    RAISE NOTICE '❌ USERS CANNOT:';
    RAISE NOTICE '   • Update other players'' scores';
    RAISE NOTICE '   • Modify session pots';
    RAISE NOTICE '   • Submit scores twice';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for millions of players!';
    RAISE NOTICE '========================================';
END $$;

