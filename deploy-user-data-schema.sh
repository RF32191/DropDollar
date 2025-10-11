#!/bin/bash

echo "🚀 DropDollar - Complete User Data Schema Deployment"
echo "===================================================="
echo ""
echo "This script will deploy the complete user data schema to Supabase."
echo "The schema includes:"
echo "  - users (profiles, tokens, balance)"
echo "  - token_transactions (purchase/spend history)"
echo "  - game_history (all games played)"
echo "  - purchase_history (all Stripe payments)"
echo "  - user_activity (activity log)"
echo "  - user_statistics VIEW (aggregated data)"
echo ""
echo "===================================================="
echo ""

# Check if SUPABASE_URL and SUPABASE_ANON_KEY are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL is not set"
    echo "Please set it in your .env.local file or environment"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
    echo "Please set it in your .env.local file or environment"
    exit 1
fi

echo "✅ Environment variables found"
echo "📊 Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Check if the schema file exists
if [ ! -f "src/lib/supabase/COMPLETE_USER_DATA_SCHEMA.sql" ]; then
    echo "❌ Schema file not found: src/lib/supabase/COMPLETE_USER_DATA_SCHEMA.sql"
    exit 1
fi

echo "✅ Schema file found"
echo ""

echo "===================================================="
echo "📋 MANUAL DEPLOYMENT INSTRUCTIONS:"
echo "===================================================="
echo ""
echo "1. Go to your Supabase Dashboard:"
echo "   https://app.supabase.com/project/_/sql/new"
echo ""
echo "2. Copy the contents of this file:"
echo "   src/lib/supabase/COMPLETE_USER_DATA_SCHEMA.sql"
echo ""
echo "3. Paste into the SQL Editor in Supabase"
echo ""
echo "4. Click 'Run' to execute the schema"
echo ""
echo "5. Verify the tables were created:"
echo "   - users"
echo "   - token_transactions"
echo "   - game_history"
echo "   - user_listings"
echo "   - purchase_history"
echo "   - user_activity"
echo "   - user_statistics (VIEW)"
echo ""
echo "===================================================="
echo ""

# Display the schema
echo "📄 Schema Preview (first 20 lines):"
echo "------------------------------------"
head -n 20 src/lib/supabase/COMPLETE_USER_DATA_SCHEMA.sql
echo "..."
echo ""

echo "✅ Schema is ready for deployment!"
echo ""
echo "Would you like to open the schema file? (y/n)"
read -r response

if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
    if command -v code &> /dev/null; then
        code src/lib/supabase/COMPLETE_USER_DATA_SCHEMA.sql
        echo "✅ Opened in VS Code"
    elif command -v open &> /dev/null; then
        open src/lib/supabase/COMPLETE_USER_DATA_SCHEMA.sql
        echo "✅ Opened with default editor"
    else
        cat src/lib/supabase/COMPLETE_USER_DATA_SCHEMA.sql
    fi
fi

echo ""
echo "🎉 Done! Deploy the schema manually in Supabase Dashboard."

