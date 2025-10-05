#!/bin/bash

echo "🚀 DropDollar Database Schema Deployment"
echo "========================================"
echo ""
echo "📋 INSTRUCTIONS:"
echo "1. Go to your Supabase project: https://evcmkemuczvfdyedvwcu.supabase.co"
echo "2. Click 'SQL Editor' in the left sidebar"
echo "3. Click 'New Query'"
echo "4. Copy and paste the contents of 'supabase-production-schema.sql'"
echo "5. Click 'Run' to execute the schema"
echo ""
echo "📁 Schema file: $(pwd)/supabase-production-schema.sql"
echo "📊 Tables to be created:"
echo "   ✅ users (with location compliance)"
echo "   ✅ user_balances (tokens & cash)"
echo "   ✅ user_transactions (payment history)"
echo "   ✅ user_bank_accounts (Stripe Connect)"
echo "   ✅ payment_transactions (Stripe records)"
echo "   ✅ escrow_transactions (seller payouts)"
echo "   ✅ user_levels (DropPoints system)"
echo "   ✅ tournaments & competitions"
echo "   ✅ game_scores & leaderboards"
echo "   ✅ And 15+ more tables for complete functionality"
echo ""
echo "🔒 Security: All tables have Row Level Security (RLS) enabled"
echo "⚡ Performance: Optimized indexes for millions of users"
echo "📈 Analytics: Built-in performance monitoring"
echo ""
echo "🎯 After running the schema, restart your dev server:"
echo "   npm run dev"
echo ""

# Check if schema file exists
if [ -f "supabase-production-schema.sql" ]; then
    echo "✅ Schema file found: $(wc -l < supabase-production-schema.sql) lines"
    echo "📦 File size: $(du -h supabase-production-schema.sql | cut -f1)"
else
    echo "❌ Schema file not found!"
    exit 1
fi

echo ""
echo "🌐 Your Supabase Project URL: https://evcmkemuczvfdyedvwcu.supabase.co"
echo "🔑 Environment variables are already configured in .env.local"
echo ""
echo "Ready to deploy! 🚀"
