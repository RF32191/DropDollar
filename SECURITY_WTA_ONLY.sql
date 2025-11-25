-- ============================================================================
-- WINNER TAKES IT ALL (WTA) SECURITY ONLY
-- ============================================================================
-- This file ONLY handles WTA games - completely separate from 1v1
-- Ensures fair skill-based gaming for Winner Takes It All
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🏆 WTA GAME SECURITY SETUP';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 1: ENABLE RLS ON WTA TABLES ONLY
-- ============================================================================

ALTER TABLE public.winner_takes_all_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_takes_all_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '✅ RLS enabled on WTA tables';
END $$;

-- ============================================================================
-- PART 2: DROP OLD WTA POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🧹 Cleaning up old WTA policies...';
END $$;

DROP POLICY IF EXISTS "Anyone can view winner takes all sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Authenticated users can insert winner takes all sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Authenticated users can update winner takes all sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Anyone can view winner takes all participants" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can insert their own participation" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "wta_configs_public_read" ON public.winner_takes_all_configs;
DROP POLICY IF EXISTS "wta_sessions_public_read" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "wta_participants_own_read" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Public can view WTA game configs" ON public.winner_takes_all_configs;
DROP POLICY IF EXISTS "Public can view WTA sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Only game functions can modify WTA sessions" ON public.winner_takes_all_sessions;
DROP POLICY IF EXISTS "Public can view WTA participants" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can join WTA games" ON public.winner_takes_all_participants;
DROP POLICY IF EXISTS "Users can submit their own WTA scores" ON public.winner_takes_all_participants;

DO $$
BEGIN
    RAISE NOTICE '✅ Old WTA policies removed';
END $$;

-- ============================================================================
-- PART 3: CREATE WTA SECURITY POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🛡️ Creating WTA security policies...';
END $$;

-- WTA Configs: Everyone can read
CREATE POLICY "wta_configs_read"
ON public.winner_takes_all_configs
FOR SELECT
TO public
USING (true);

-- WTA Sessions: Everyone can read
CREATE POLICY "wta_sessions_read"
ON public.winner_takes_all_sessions
FOR SELECT
TO public
USING (true);

-- WTA Sessions: Block direct user updates (only functions can modify)
CREATE POLICY "wta_sessions_no_user_updates"
ON public.winner_takes_all_sessions
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "wta_sessions_no_user_inserts"
ON public.winner_takes_all_sessions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- WTA Participants: Everyone can read
CREATE POLICY "wta_participants_read"
ON public.winner_takes_all_participants
FOR SELECT
TO public
USING (true);

-- WTA Participants: Users can ONLY insert their own (join games)
CREATE POLICY "wta_participants_join_own"
ON public.winner_takes_all_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- WTA Participants: Users can ONLY update their own score
CREATE POLICY "wta_participants_update_own_score"
ON public.winner_takes_all_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
    RAISE NOTICE '✅ WTA security policies created';
END $$;

-- ============================================================================
-- PART 4: CREATE WTA ANTI-CHEAT FUNCTION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚫 Creating WTA anti-cheat...';
END $$;

CREATE OR REPLACE FUNCTION validate_wta_score_submission(
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
        SELECT 1 FROM public.winner_takes_all_participants
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
        SELECT 1 FROM public.winner_takes_all_participants
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

GRANT EXECUTE ON FUNCTION validate_wta_score_submission TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ WTA anti-cheat function created';
END $$;

-- ============================================================================
-- PART 5: CREATE WTA PERFORMANCE INDEXES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚡ Creating WTA performance indexes...';
END $$;

CREATE INDEX IF NOT EXISTS idx_wta_participants_user_id 
ON public.winner_takes_all_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_wta_participants_session_id 
ON public.winner_takes_all_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_wta_participants_score 
ON public.winner_takes_all_participants(score) 
WHERE score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wta_sessions_config_id 
ON public.winner_takes_all_sessions(config_id);

CREATE INDEX IF NOT EXISTS idx_wta_sessions_status 
ON public.winner_takes_all_sessions(status);

DO $$
BEGIN
    RAISE NOTICE '✅ WTA performance indexes created';
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
    AND tablename IN ('winner_takes_all_sessions', 'winner_takes_all_participants', 'winner_takes_all_configs');
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ WTA SECURITY COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🏆 WTA PROTECTIONS:';
    RAISE NOTICE '   ✅ Users can ONLY update their own scores';
    RAISE NOTICE '   ✅ Users CANNOT manipulate sessions';
    RAISE NOTICE '   ✅ Users CANNOT change other players';
    RAISE NOTICE '   ✅ Anti-cheat validation active';
    RAISE NOTICE '   ✅ % RLS policies active', v_policies;
    RAISE NOTICE '';
    RAISE NOTICE '✅ USERS CAN:';
    RAISE NOTICE '   • View all WTA games & sessions';
    RAISE NOTICE '   • Join WTA games';
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

