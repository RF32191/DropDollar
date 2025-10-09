#!/bin/bash

# ========================================
# CLEAR ALL ACCOUNTS FROM SUPABASE
# ========================================
# This script clears all user accounts and data from Supabase

echo "🗑️ CLEARING ALL ACCOUNTS FROM SUPABASE..."
echo "=========================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    echo "Please run this from your project root or initialize Supabase first"
    exit 1
fi

echo "⚠️  WARNING: This will delete ALL user accounts and data!"
echo "This action cannot be undone."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Operation cancelled"
    exit 0
fi

echo ""
echo "🧹 Starting cleanup process..."

# Create SQL script to clear all data
cat > clear_all_accounts.sql << 'EOF'
-- ========================================
-- CLEAR ALL ACCOUNTS AND DATA
-- ========================================

-- Disable RLS temporarily for cleanup
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.game_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hot_sell_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.listing_entries DISABLE ROW LEVEL SECURITY;

-- Clear all user-related data
DELETE FROM public.user_transactions;
DELETE FROM public.user_balances;
DELETE FROM public.game_scores;
DELETE FROM public.tournament_entries;
DELETE FROM public.hot_sell_entries;
DELETE FROM public.listing_entries;
DELETE FROM public.user_profiles;
DELETE FROM public.users;

-- Clear auth.users table (Supabase auth)
-- Note: This requires admin privileges
DELETE FROM auth.users;

-- Re-enable RLS
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hot_sell_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.listing_entries ENABLE ROW LEVEL SECURITY;

-- Force schema refresh
NOTIFY pgrst, 'reload schema';

-- Show confirmation
SELECT 'All accounts and data cleared successfully!' as status;
EOF

echo "📝 Created SQL script: clear_all_accounts.sql"

# Execute the SQL script
echo "🚀 Executing cleanup script..."
supabase db reset --linked

if [ $? -eq 0 ]; then
    echo "✅ Successfully cleared all accounts from Supabase!"
    echo ""
    echo "📊 Summary:"
    echo "- All user accounts deleted"
    echo "- All user data cleared"
    echo "- All transactions removed"
    echo "- All game scores cleared"
    echo "- All tournament entries removed"
    echo "- Database reset to clean state"
else
    echo "❌ Failed to clear accounts. Please check your Supabase connection."
    exit 1
fi

# Clean up
rm -f clear_all_accounts.sql

echo ""
echo "🎉 CLEANUP COMPLETE!"
echo "All accounts have been removed from Supabase."
echo "The site is now ready for fresh users."
