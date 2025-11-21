-- ============================================
-- VERIFY WALLET & TRACKING FIX
-- ============================================
-- Run this after deploying FIX_WALLET_AND_TRACKING_COMPLETE.sql
-- ============================================

-- Check 1: Verify send_winner_address_to_seller function exists and updated
SELECT 
    'send_winner_address_to_seller' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'send_winner_address_to_seller'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check 2: Verify send_seller_address_notification function exists
SELECT 
    'send_seller_address_notification' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'send_seller_address_notification'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check 3: Verify submit_tracking_number_with_notifications function exists
SELECT 
    'submit_tracking_number_with_notifications' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'submit_tracking_number_with_notifications'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check 4: Verify get_seller_notifications function exists
SELECT 
    'get_seller_notifications' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'get_seller_notifications'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check 5: Verify get_seller_wallet function exists
SELECT 
    'get_seller_wallet' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'get_seller_wallet'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check 6: Verify seller_wallets table has required columns
SELECT 
    'seller_wallets.pending_balance' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'seller_wallets' 
            AND column_name = 'pending_balance'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

SELECT 
    'seller_wallets.released_balance' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'seller_wallets' 
            AND column_name = 'released_balance'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

SELECT 
    'seller_wallets.total_pending_sales' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'seller_wallets' 
            AND column_name = 'total_pending_sales'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

SELECT 
    'seller_wallets.total_released_sales' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'seller_wallets' 
            AND column_name = 'total_released_sales'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

SELECT 
    'seller_wallets.total_earned' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'seller_wallets' 
            AND column_name = 'total_earned'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check 7: Verify admin_messages table has action columns
SELECT 
    'admin_messages.action_required' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_messages' 
            AND column_name = 'action_required'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

SELECT 
    'admin_messages.action_type' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_messages' 
            AND column_name = 'action_type'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

SELECT 
    'admin_messages.action_label' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_messages' 
            AND column_name = 'action_label'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check 8: Verify marketplace_sessions has tracking columns
SELECT 
    'marketplace_sessions.tracking_number' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'marketplace_sessions' 
            AND column_name = 'tracking_number'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

SELECT 
    'marketplace_sessions.tracking_provider' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'marketplace_sessions' 
            AND column_name = 'tracking_provider'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

SELECT 
    'marketplace_sessions.winner_shipping_address' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'marketplace_sessions' 
            AND column_name = 'winner_shipping_address'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Summary
SELECT 
    '============================================' as message
UNION ALL
SELECT '✅ VERIFICATION COMPLETE'
UNION ALL
SELECT '============================================'
UNION ALL
SELECT ''
UNION ALL
SELECT 'If all checks show ✅, the fix is deployed correctly!'
UNION ALL
SELECT 'If any show ❌, run FIX_WALLET_AND_TRACKING_COMPLETE.sql again'
UNION ALL
SELECT ''
UNION ALL
SELECT '🧪 Next: Test the flow by having a winner claim a prize';

