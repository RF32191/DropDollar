-- ============================================================================
-- ADD MISSING COLUMNS TO BACKUP TABLES
-- ============================================================================
-- This script adds any missing columns to the backup tables to ensure
-- full transaction tracking for the Hot Sell payout system.
-- ============================================================================

-- ============================================================================
-- Add missing columns to token_transactions
-- ============================================================================
DO $$
BEGIN
    -- Add transaction_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'token_transactions' AND column_name = 'transaction_type'
    ) THEN
        ALTER TABLE public.token_transactions 
        ADD COLUMN transaction_type TEXT;
        
        RAISE NOTICE '✅ Added transaction_type to token_transactions';
    ELSE
        RAISE NOTICE 'ℹ️  transaction_type already exists in token_transactions';
    END IF;
    
    -- Add description column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'token_transactions' AND column_name = 'description'
    ) THEN
        ALTER TABLE public.token_transactions 
        ADD COLUMN description TEXT;
        
        RAISE NOTICE '✅ Added description to token_transactions';
    ELSE
        RAISE NOTICE 'ℹ️  description already exists in token_transactions';
    END IF;
END $$;

-- ============================================================================
-- Add missing columns to purchase_history
-- ============================================================================
DO $$
BEGIN
    -- Add transaction_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_history' AND column_name = 'transaction_type'
    ) THEN
        ALTER TABLE public.purchase_history 
        ADD COLUMN transaction_type TEXT;
        
        RAISE NOTICE '✅ Added transaction_type to purchase_history';
    ELSE
        RAISE NOTICE 'ℹ️  transaction_type already exists in purchase_history';
    END IF;
    
    -- Add amount column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_history' AND column_name = 'amount'
    ) THEN
        ALTER TABLE public.purchase_history 
        ADD COLUMN amount NUMERIC DEFAULT 0;
        
        RAISE NOTICE '✅ Added amount to purchase_history';
    ELSE
        RAISE NOTICE 'ℹ️  amount already exists in purchase_history';
    END IF;
    
    -- Add description column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_history' AND column_name = 'description'
    ) THEN
        ALTER TABLE public.purchase_history 
        ADD COLUMN description TEXT;
        
        RAISE NOTICE '✅ Added description to purchase_history';
    ELSE
        RAISE NOTICE 'ℹ️  description already exists in purchase_history';
    END IF;
END $$;

-- ============================================================================
-- Add missing columns to user_game_history
-- ============================================================================
DO $$
BEGIN
    -- Add tokens_earned column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_game_history' AND column_name = 'tokens_earned'
    ) THEN
        ALTER TABLE public.user_game_history 
        ADD COLUMN tokens_earned NUMERIC DEFAULT 0;
        
        RAISE NOTICE '✅ Added tokens_earned to user_game_history';
    ELSE
        RAISE NOTICE 'ℹ️  tokens_earned already exists in user_game_history';
    END IF;
    
    -- Add competition_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_game_history' AND column_name = 'competition_type'
    ) THEN
        ALTER TABLE public.user_game_history 
        ADD COLUMN competition_type TEXT;
        
        RAISE NOTICE '✅ Added competition_type to user_game_history';
    ELSE
        RAISE NOTICE 'ℹ️  competition_type already exists in user_game_history';
    END IF;
END $$;

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ MISSING BACKUP COLUMNS ADDED SUCCESSFULLY!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ All backup tables now have the required columns for:';
    RAISE NOTICE '✅   - Token transaction tracking';
    RAISE NOTICE '✅   - Purchase history tracking';
    RAISE NOTICE '✅   - Game history tracking';
    RAISE NOTICE '✅   - User game history tracking';
    RAISE NOTICE '✅ ============================================================';
END $$;

