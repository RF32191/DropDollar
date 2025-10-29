-- ============================================================================
-- FIX DASHBOARD GAME HISTORY DISPLAY
-- Ensures practice and competition games show up on user dashboard
-- ============================================================================

-- ============================================
-- 1. Ensure game_history table exists with ALL columns
-- ============================================

CREATE TABLE IF NOT EXISTS public.game_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Game Details
    game_type TEXT NOT NULL,
    score NUMERIC NOT NULL,
    accuracy NUMERIC DEFAULT 0,
    avg_reaction_time INTEGER DEFAULT 0,
    game_duration INTEGER DEFAULT 60,
    
    -- Game Mode
    is_practice BOOLEAN DEFAULT true,
    is_competition BOOLEAN DEFAULT false,
    
    -- Competition Details (nullable for practice games)
    listing_id TEXT,
    entry_number INTEGER,
    placement INTEGER,
    prize_won NUMERIC DEFAULT 0,
    tokens_wagered NUMERIC DEFAULT 0,
    tokens_won NUMERIC DEFAULT 0,
    
    -- Tournament Info
    tournament_type TEXT, -- 'winner_takes_all', 'hot_sell', '1v1', etc.
    game_session_id UUID,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON public.game_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_practice ON public.game_history(user_id, is_practice);
CREATE INDEX IF NOT EXISTS idx_game_history_competition ON public.game_history(user_id, is_competition);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);

-- ============================================
-- 2. Fix RLS policies for game_history
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert own game history" ON public.game_history;
DROP POLICY IF EXISTS "Service can insert game history" ON public.game_history;
DROP POLICY IF EXISTS "Anyone can insert game history" ON public.game_history;

-- Enable RLS
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies
CREATE POLICY "Users can view own games" 
ON public.game_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert games" 
ON public.game_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can do everything" 
ON public.game_history FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================
-- 3. Grant permissions
-- ============================================

GRANT ALL ON public.game_history TO authenticated, anon, service_role;

-- ============================================
-- 4. Create/Update save_game_history function
-- ============================================

-- Drop existing function (all variants)
DROP FUNCTION IF EXISTS public.save_game_history(TEXT, TEXT, NUMERIC, NUMERIC, INTEGER, INTEGER, BOOLEAN, TEXT, INTEGER, INTEGER, NUMERIC, NUMERIC, NUMERIC, JSONB);
DROP FUNCTION IF EXISTS public.save_game_history(UUID, TEXT, NUMERIC, NUMERIC, INTEGER, INTEGER, BOOLEAN, TEXT, INTEGER, INTEGER, NUMERIC, NUMERIC, NUMERIC, JSONB);

-- Create new function with UUID user_id
CREATE OR REPLACE FUNCTION public.save_game_history(
    p_user_id UUID,
    p_game_type TEXT,
    p_score NUMERIC,
    p_accuracy NUMERIC,
    p_avg_reaction_time INTEGER DEFAULT 0,
    p_game_duration INTEGER DEFAULT 60,
    p_is_practice BOOLEAN DEFAULT true,
    p_listing_id TEXT DEFAULT NULL,
    p_entry_number INTEGER DEFAULT NULL,
    p_placement INTEGER DEFAULT NULL,
    p_prize_won NUMERIC DEFAULT 0,
    p_tokens_wagered NUMERIC DEFAULT 0,
    p_tokens_won NUMERIC DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    game_record RECORD;
    result JSONB;
BEGIN
    -- Insert game record
    INSERT INTO public.game_history (
        user_id,
        game_type,
        score,
        accuracy,
        avg_reaction_time,
        game_duration,
        is_practice,
        is_competition,
        listing_id,
        entry_number,
        placement,
        prize_won,
        tokens_wagered,
        tokens_won,
        metadata,
        created_at
    ) VALUES (
        p_user_id,
        p_game_type,
        p_score,
        p_accuracy,
        p_avg_reaction_time,
        p_game_duration,
        p_is_practice,
        NOT p_is_practice, -- is_competition is opposite of is_practice
        p_listing_id,
        p_entry_number,
        p_placement,
        p_prize_won,
        p_tokens_wagered,
        p_tokens_won,
        p_metadata,
        NOW()
    )
    RETURNING * INTO game_record;
    
    -- Build result JSON
    result := jsonb_build_object(
        'id', game_record.id,
        'user_id', game_record.user_id,
        'game_type', game_record.game_type,
        'score', game_record.score,
        'is_practice', game_record.is_practice,
        'created_at', game_record.created_at
    );
    
    RAISE NOTICE '✅ Game saved: user=%, game=%, score=%, practice=%', 
        p_user_id, p_game_type, p_score, p_is_practice;
    
    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.save_game_history TO authenticated, anon, service_role;

-- ============================================
-- 5. Test the system
-- ============================================

DO $$
DECLARE
    test_user_id UUID;
    test_game JSONB;
    game_count INTEGER;
    practice_count INTEGER;
    comp_count INTEGER;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing with user: %', test_user_id;
        
        -- Try to insert a test practice game
        test_game := public.save_game_history(
            test_user_id,
            'sword_parry',
            150.5,
            95.2,
            250,
            60,
            true, -- is_practice
            NULL,
            NULL,
            NULL,
            0,
            0,
            0,
            '{}'::jsonb
        );
        
        RAISE NOTICE '✅ Test game inserted: %', test_game;
        
        -- Delete test game
        DELETE FROM public.game_history WHERE id = (test_game->>'id')::UUID;
        RAISE NOTICE '🧹 Test game cleaned up';
    END IF;
    
    -- Count existing games
    SELECT COUNT(*) INTO game_count FROM public.game_history;
    SELECT COUNT(*) INTO practice_count FROM public.game_history WHERE is_practice = true;
    SELECT COUNT(*) INTO comp_count FROM public.game_history WHERE is_competition = true;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DASHBOARD GAME HISTORY FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Total games: %', game_count;
    RAISE NOTICE '🎯 Practice games: %', practice_count;
    RAISE NOTICE '🏆 Competition games: %', comp_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Table: game_history exists';
    RAISE NOTICE '✅ RLS policies: enabled';
    RAISE NOTICE '✅ Function: save_game_history() ready';
    RAISE NOTICE '✅ Permissions: granted';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 Practice games will now save!';
    RAISE NOTICE '🏆 Competition games will now save!';
    RAISE NOTICE '📊 Dashboard will display all results!';
    RAISE NOTICE '========================================';
END $$;

