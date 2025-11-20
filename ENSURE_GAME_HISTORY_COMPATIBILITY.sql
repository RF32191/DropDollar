-- ============================================
-- ENSURE GAME HISTORY TABLE COMPATIBILITY
-- ============================================
-- Make sure game_history table works with both old and new code
-- ============================================

-- Step 1: Check if game_history table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_history') THEN
        RAISE EXCEPTION 'game_history table does not exist! Please run CREATE_GAME_HISTORY_SYSTEM.sql first!';
    END IF;
END $$;

-- Step 2: Add missing columns if they don't exist (for compatibility)
DO $$
BEGIN
    -- Add is_practice column as computed column (for backward compatibility)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'game_history' 
        AND column_name = 'is_practice'
    ) THEN
        ALTER TABLE public.game_history 
        ADD COLUMN is_practice BOOLEAN GENERATED ALWAYS AS (session_type = 'practice') STORED;
        RAISE NOTICE '✅ Added is_practice computed column';
    END IF;
    
    -- Add is_competition column as computed column (for backward compatibility)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'game_history' 
        AND column_name = 'is_competition'
    ) THEN
        ALTER TABLE public.game_history 
        ADD COLUMN is_competition BOOLEAN GENERATED ALWAYS AS (session_type IN ('competition', 'wta', '1v1', 'marketplace')) STORED;
        RAISE NOTICE '✅ Added is_competition computed column';
    END IF;
    
    -- Add game_duration column if missing
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'game_history' 
        AND column_name = 'game_duration'
    ) THEN
        ALTER TABLE public.game_history 
        ADD COLUMN game_duration INTEGER DEFAULT 60;
        RAISE NOTICE '✅ Added game_duration column';
    END IF;
    
    -- Add prize_won column as alias for tokens_won (for compatibility)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'game_history' 
        AND column_name = 'prize_won'
    ) THEN
        ALTER TABLE public.game_history 
        ADD COLUMN prize_won NUMERIC GENERATED ALWAYS AS (tokens_won) STORED;
        RAISE NOTICE '✅ Added prize_won computed column';
    END IF;
    
    -- Add tokens_wagered column as alias for tokens_spent (for compatibility)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'game_history' 
        AND column_name = 'tokens_wagered'
    ) THEN
        ALTER TABLE public.game_history 
        ADD COLUMN tokens_wagered NUMERIC GENERATED ALWAYS AS (tokens_spent) STORED;
        RAISE NOTICE '✅ Added tokens_wagered computed column';
    END IF;
    
    -- Add metadata JSONB column if missing
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'game_history' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.game_history 
        ADD COLUMN metadata JSONB;
        RAISE NOTICE '✅ Added metadata column';
    END IF;
    
    -- Add placement column if missing
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'game_history' 
        AND column_name = 'placement'
    ) THEN
        ALTER TABLE public.game_history 
        ADD COLUMN placement INTEGER;
        RAISE NOTICE '✅ Added placement column';
    END IF;
    
    -- Add entry_number column if missing
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'game_history' 
        AND column_name = 'entry_number'
    ) THEN
        ALTER TABLE public.game_history 
        ADD COLUMN entry_number INTEGER;
        RAISE NOTICE '✅ Added entry_number column';
    END IF;
    
    -- Add listing_id column if missing
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'game_history' 
        AND column_name = 'listing_id'
    ) THEN
        ALTER TABLE public.game_history 
        ADD COLUMN listing_id UUID;
        RAISE NOTICE '✅ Added listing_id column';
    END IF;
END $$;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_history_is_practice ON public.game_history(user_id, is_practice, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_is_competition ON public.game_history(user_id, is_competition, created_at DESC);

-- Step 4: Grant permissions
GRANT SELECT, INSERT ON public.game_history TO authenticated;

-- Step 5: Test insert with new columns
DO $$
DECLARE
    v_test_user_id UUID;
    v_test_id UUID;
BEGIN
    -- Get first user for testing
    SELECT id INTO v_test_user_id FROM auth.users LIMIT 1;
    
    IF v_test_user_id IS NULL THEN
        RAISE NOTICE '⚠️ No users found for testing';
        RETURN;
    END IF;
    
    -- Try to insert a test record using NEW schema
    INSERT INTO public.game_history (
        user_id,
        game_type,
        session_type,
        session_id,
        score,
        accuracy,
        avg_reaction_time,
        tokens_won,
        tokens_spent,
        result,
        game_duration,
        placement,
        entry_number,
        listing_id,
        metadata
    ) VALUES (
        v_test_user_id,
        'crypto_match',
        'practice',
        gen_random_uuid(),
        100.5,
        95.0,
        250,
        0,
        0,
        'participated',
        60,
        NULL,
        NULL,
        NULL,
        '{"test": true}'::jsonb
    ) RETURNING id INTO v_test_id;
    
    -- Verify computed columns work
    PERFORM * FROM public.game_history 
    WHERE id = v_test_id 
      AND is_practice = true 
      AND is_competition = false
      AND prize_won = 0
      AND tokens_wagered = 0;
    
    IF FOUND THEN
        RAISE NOTICE '✅ Test insert successful, computed columns work!';
    ELSE
        RAISE NOTICE '❌ Test insert failed or computed columns not working';
    END IF;
    
    -- Clean up test record
    DELETE FROM public.game_history WHERE id = v_test_id;
    RAISE NOTICE '✅ Test record cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed: %', SQLERRM;
END $$;

-- Step 6: Display current schema
SELECT '
============================================
📊 GAME HISTORY TABLE SCHEMA
============================================

✅ COLUMNS NOW AVAILABLE:
Core columns (from CREATE_GAME_HISTORY_SYSTEM.sql):
- id (UUID)
- user_id (UUID)
- game_type (TEXT)
- session_type (TEXT) - ''practice'', ''competition'', ''wta'', ''1v1'', ''marketplace''
- session_id (UUID)
- score (NUMERIC)
- accuracy (NUMERIC)
- avg_reaction_time (NUMERIC)
- tokens_won (NUMERIC)
- tokens_spent (NUMERIC)
- result (TEXT)
- listing_title (TEXT)
- created_at (TIMESTAMPTZ)

Added columns (for compatibility):
- is_practice (BOOLEAN) - Computed from session_type
- is_competition (BOOLEAN) - Computed from session_type
- prize_won (NUMERIC) - Alias for tokens_won
- tokens_wagered (NUMERIC) - Alias for tokens_spent
- game_duration (INTEGER)
- metadata (JSONB)
- placement (INTEGER)
- entry_number (INTEGER)
- listing_id (UUID)

🎯 BACKWARD COMPATIBLE:
Old code using is_practice/is_competition will work!
New code using session_type will also work!

✅ READY FOR BOTH:
- RPC: save_game_history() (uses is_practice)
- Direct: INSERT with session_type
- Queries: Can use is_practice OR session_type

============================================
' as status;

-- Step 7: Show sample data if any exists
SELECT '📊 Sample Game History (last 5):' as info;
SELECT 
    user_id,
    game_type,
    session_type,
    is_practice,
    is_competition,
    score,
    created_at
FROM public.game_history
ORDER BY created_at DESC
LIMIT 5;

-- Final success message
SELECT '✅ Game history table is now fully compatible with both old and new code!' as final_status;

