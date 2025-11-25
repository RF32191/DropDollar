-- ============================================================================
-- FIX 1V1 TABLE STRUCTURE
-- ============================================================================
-- Run this FIRST to fix any table issues
-- ============================================================================

-- Check and add missing columns
DO $$
BEGIN
    -- Add prize_pool if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'one_v_one_sessions' 
        AND column_name = 'prize_pool'
    ) THEN
        ALTER TABLE public.one_v_one_sessions 
        ADD COLUMN prize_pool NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added prize_pool column';
    ELSE
        RAISE NOTICE '✅ prize_pool column already exists';
    END IF;

    -- Add winner_user_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'one_v_one_sessions' 
        AND column_name = 'winner_user_id'
    ) THEN
        ALTER TABLE public.one_v_one_sessions 
        ADD COLUMN winner_user_id UUID;
        RAISE NOTICE '✅ Added winner_user_id column';
    ELSE
        RAISE NOTICE '✅ winner_user_id column already exists';
    END IF;

    -- Add loser_user_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'one_v_one_sessions' 
        AND column_name = 'loser_user_id'
    ) THEN
        ALTER TABLE public.one_v_one_sessions 
        ADD COLUMN loser_user_id UUID;
        RAISE NOTICE '✅ Added loser_user_id column';
    ELSE
        RAISE NOTICE '✅ loser_user_id column already exists';
    END IF;

    -- Add winner_prize if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'one_v_one_sessions' 
        AND column_name = 'winner_prize'
    ) THEN
        ALTER TABLE public.one_v_one_sessions 
        ADD COLUMN winner_prize NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added winner_prize column';
    ELSE
        RAISE NOTICE '✅ winner_prize column already exists';
    END IF;

    -- Add loser_prize if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'one_v_one_sessions' 
        AND column_name = 'loser_prize'
    ) THEN
        ALTER TABLE public.one_v_one_sessions 
        ADD COLUMN loser_prize NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added loser_prize column';
    ELSE
        RAISE NOTICE '✅ loser_prize column already exists';
    END IF;

    -- Add platform_fee if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'one_v_one_sessions' 
        AND column_name = 'platform_fee'
    ) THEN
        ALTER TABLE public.one_v_one_sessions 
        ADD COLUMN platform_fee NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added platform_fee column';
    ELSE
        RAISE NOTICE '✅ platform_fee column already exists';
    END IF;

    -- Add completed_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'one_v_one_sessions' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.one_v_one_sessions 
        ADD COLUMN completed_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Added completed_at column';
    ELSE
        RAISE NOTICE '✅ completed_at column already exists';
    END IF;

    -- Add is_active to configs if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'one_v_one_configs' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.one_v_one_configs 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE '✅ Added is_active column to configs';
    ELSE
        RAISE NOTICE '✅ is_active column already exists in configs';
    END IF;
END $$;

-- Update prize_pool to match current_pot where it's NULL
UPDATE public.one_v_one_sessions
SET prize_pool = COALESCE(current_pot, 0)
WHERE prize_pool IS NULL;

-- Ensure user tokens are NULL-safe
UPDATE public.users 
SET won_tokens = COALESCE(won_tokens, 0) 
WHERE won_tokens IS NULL;

UPDATE public.users 
SET purchased_tokens = COALESCE(purchased_tokens, 0) 
WHERE purchased_tokens IS NULL;

-- Set defaults for user tokens
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.users
        ALTER COLUMN won_tokens SET DEFAULT 0;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'won_tokens default already set or error: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE public.users
        ALTER COLUMN purchased_tokens SET DEFAULT 0;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'purchased_tokens default already set or error: %', SQLERRM;
    END;
END $$;

-- Success message
DO $$
DECLARE
    session_columns INT;
    user_token_nulls INT;
BEGIN
    SELECT COUNT(*) INTO session_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'one_v_one_sessions'
    AND column_name IN ('prize_pool', 'winner_user_id', 'loser_user_id', 'winner_prize', 'loser_prize', 'platform_fee', 'completed_at');
    
    SELECT COUNT(*) INTO user_token_nulls
    FROM public.users
    WHERE won_tokens IS NULL OR purchased_tokens IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ 1V1 TABLE STRUCTURE FIXED!';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ Session columns present: %/7', session_columns;
    RAISE NOTICE '✅ Users with NULL tokens: %', user_token_nulls;
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEP:';
    RAISE NOTICE '   Run 1V1_FUNCTIONS_ONLY.sql';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
END $$;

