-- ============================================================================
-- CLEANUP ALL MARKETPLACE LISTING FUNCTIONS
-- ============================================================================
-- This removes all versions of create_marketplace_listing
-- Run this FIRST, then run CREATE_MARKETPLACE_LISTING_RPC.sql
-- ============================================================================

-- Find and drop all versions of the function
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT 
            p.oid::regprocedure as func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'create_marketplace_listing'
        AND n.nspname = 'public'
    LOOP
        RAISE NOTICE 'Dropping function: %', func_record.func_signature;
        EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', func_record.func_signature);
    END LOOP;
    
    RAISE NOTICE '✅ All versions of create_marketplace_listing removed';
END $$;

-- Verify it's gone
SELECT 
    CASE 
        WHEN COUNT(*) = 0 
        THEN '✅ No functions found - ready to create new one!'
        ELSE '❌ Still ' || COUNT(*) || ' functions remaining'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_marketplace_listing'
AND n.nspname = 'public';

SELECT '✅ NOW RUN CREATE_MARKETPLACE_LISTING_RPC.sql' as next_step;

