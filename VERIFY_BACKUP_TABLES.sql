-- ============================================================================
-- VERIFY SUPABASE BACKUP TABLES FOR HOT SELL PAYOUT
-- ============================================================================
-- This script checks that all required backup tables exist and have the
-- correct columns to support the client-side payout system.
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 ============================================================';
    RAISE NOTICE '🔍 VERIFYING BACKUP TABLES FOR HOT SELL PAYOUT';
    RAISE NOTICE '🔍 ============================================================';
END $$;

-- ============================================================================
-- Check token_transactions table
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'token_transactions') THEN
        RAISE NOTICE '✅ token_transactions table exists';
        
        -- Check required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'token_transactions' AND column_name = 'user_id') THEN
            RAISE NOTICE '  ✓ user_id column exists';
        ELSE
            RAISE NOTICE '  ❌ user_id column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'token_transactions' AND column_name = 'amount') THEN
            RAISE NOTICE '  ✓ amount column exists';
        ELSE
            RAISE NOTICE '  ❌ amount column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'token_transactions' AND column_name = 'transaction_type') THEN
            RAISE NOTICE '  ✓ transaction_type column exists';
        ELSE
            RAISE NOTICE '  ❌ transaction_type column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'token_transactions' AND column_name = 'balance_after') THEN
            RAISE NOTICE '  ✓ balance_after column exists';
        ELSE
            RAISE NOTICE '  ❌ balance_after column MISSING';
        END IF;
    ELSE
        RAISE NOTICE '❌ token_transactions table DOES NOT EXIST';
    END IF;
END $$;

-- ============================================================================
-- Check purchase_history table
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_history') THEN
        RAISE NOTICE '✅ purchase_history table exists';
        
        -- Check required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_history' AND column_name = 'user_id') THEN
            RAISE NOTICE '  ✓ user_id column exists';
        ELSE
            RAISE NOTICE '  ❌ user_id column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_history' AND column_name = 'transaction_type') THEN
            RAISE NOTICE '  ✓ transaction_type column exists';
        ELSE
            RAISE NOTICE '  ❌ transaction_type column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_history' AND column_name = 'amount') THEN
            RAISE NOTICE '  ✓ amount column exists';
        ELSE
            RAISE NOTICE '  ❌ amount column MISSING';
        END IF;
    ELSE
        RAISE NOTICE '❌ purchase_history table DOES NOT EXIST';
    END IF;
END $$;

-- ============================================================================
-- Check game_history table
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_history') THEN
        RAISE NOTICE '✅ game_history table exists';
        
        -- Check required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_history' AND column_name = 'user_id') THEN
            RAISE NOTICE '  ✓ user_id column exists';
        ELSE
            RAISE NOTICE '  ❌ user_id column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_history' AND column_name = 'game_type') THEN
            RAISE NOTICE '  ✓ game_type column exists';
        ELSE
            RAISE NOTICE '  ❌ game_type column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_history' AND column_name = 'score') THEN
            RAISE NOTICE '  ✓ score column exists';
        ELSE
            RAISE NOTICE '  ❌ score column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_history' AND column_name = 'tokens_won') THEN
            RAISE NOTICE '  ✓ tokens_won column exists';
        ELSE
            RAISE NOTICE '  ❌ tokens_won column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_history' AND column_name = 'tournament_type') THEN
            RAISE NOTICE '  ✓ tournament_type column exists';
        ELSE
            RAISE NOTICE '  ❌ tournament_type column MISSING';
        END IF;
    ELSE
        RAISE NOTICE '❌ game_history table DOES NOT EXIST';
    END IF;
END $$;

-- ============================================================================
-- Check user_game_history table
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_game_history') THEN
        RAISE NOTICE '✅ user_game_history table exists';
        
        -- Check required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_history' AND column_name = 'user_id') THEN
            RAISE NOTICE '  ✓ user_id column exists';
        ELSE
            RAISE NOTICE '  ❌ user_id column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_history' AND column_name = 'game_type') THEN
            RAISE NOTICE '  ✓ game_type column exists';
        ELSE
            RAISE NOTICE '  ❌ game_type column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_history' AND column_name = 'score') THEN
            RAISE NOTICE '  ✓ score column exists';
        ELSE
            RAISE NOTICE '  ❌ score column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_history' AND column_name = 'tokens_earned') THEN
            RAISE NOTICE '  ✓ tokens_earned column exists';
        ELSE
            RAISE NOTICE '  ❌ tokens_earned column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_history' AND column_name = 'competition_type') THEN
            RAISE NOTICE '  ✓ competition_type column exists';
        ELSE
            RAISE NOTICE '  ❌ competition_type column MISSING';
        END IF;
    ELSE
        RAISE NOTICE '❌ user_game_history table DOES NOT EXIST';
    END IF;
END $$;

-- ============================================================================
-- Check users table columns
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Checking users table columns...';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tokens') THEN
        RAISE NOTICE '  ✓ tokens column exists';
    ELSE
        RAISE NOTICE '  ❌ tokens column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_earned') THEN
        RAISE NOTICE '  ✓ total_earned column exists';
    ELSE
        RAISE NOTICE '  ❌ total_earned column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'games_played') THEN
        RAISE NOTICE '  ✓ games_played column exists';
    ELSE
        RAISE NOTICE '  ❌ games_played column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'games_won') THEN
        RAISE NOTICE '  ✓ games_won column exists';
    ELSE
        RAISE NOTICE '  ❌ games_won column MISSING';
    END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '🔍 ============================================================';
    RAISE NOTICE '🔍 VERIFICATION COMPLETE';
    RAISE NOTICE '🔍 ============================================================';
    RAISE NOTICE '💡 If any tables or columns are MISSING, run:';
    RAISE NOTICE '💡   COMPLETE_USER_BACKUP_SYSTEM.sql';
    RAISE NOTICE '💡   or';
    RAISE NOTICE '💡   FIXED_USER_BACKUP_SYSTEM.sql';
    RAISE NOTICE '🔍 ============================================================';
END $$;

