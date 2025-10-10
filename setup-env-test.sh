#!/bin/bash

# DropDollar Environment Setup Script (with test keys)
echo "🔧 Setting up DropDollar environment variables with test keys..."

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local already exists"
    echo "📋 Current environment variables:"
    echo "STRIPE_SECRET_KEY: $(if [ -n "$STRIPE_SECRET_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
    echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: $(if [ -n "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
else
    echo "📝 Creating .env.local file with test keys..."
    
    # Create .env.local with test values
    cat > .env.local << 'EOF'
# DropDollar Environment Variables (Test Configuration)

NEXT_PUBLIC_APP_URL=https://drop-dollar.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xqkjdmgfcpjwqpjzgmhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxa2pkbWdmY3Bqd3FwanpnbWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5NzI4ODUsImV4cCI6MjA0MzU0ODg4NX0.C6t1TGRJlmABGUbCzLbCJpqOzgpvFiZ5JfQlNxHlGR4

# Stripe Test Keys (for testing - replace with live keys for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Q9vXfEMlzOaQXPNKGxLRqPKJxKjMdMCl4w0fPGKv3VQKqBjEQEtXhkD9wNKKtSZlhXKGsL7JzDLKpNfz9R5VxVx00dKcGt9Gq
STRIPE_SECRET_KEY=sk_test_51Q9vXfEMlzOaQXPNKGxLRqPKJxKjMdMCl4w0fPGKv3VQKqBjEQEtXhkD9wNKKtSZlhXKGsL7JzDLKpNfz9R5VxVx00dKcGt9Gq

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://drop-dollar.com
NEXT_PUBLIC_APP_NAME=DropDollar
NEXT_PUBLIC_APP_DESCRIPTION=Skill-based gaming marketplace

# Development Settings
NODE_ENV=production
NEXT_PUBLIC_DEBUG_MODE=false
EOF

    echo "✅ .env.local created successfully with test keys"
fi

# Load environment variables
if [ -f ".env.local" ]; then
    echo "🔄 Loading environment variables..."
    export $(cat .env.local | grep -v '^#' | xargs)
    
    echo "📋 Environment variables loaded:"
    echo "STRIPE_SECRET_KEY: $(if [ -n "$STRIPE_SECRET_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
    echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: $(if [ -n "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
    echo "NEXT_PUBLIC_SUPABASE_URL: $(if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: $(if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
fi

echo ""
echo "⚠️  NOTE: Using Stripe TEST keys for now"
echo "🎯 Next steps:"
echo "1. Get your actual Stripe live keys from: https://dashboard.stripe.com/apikeys"
echo "2. Replace the test keys in .env.local with your live keys"
echo "3. Restart your development server: npm run dev"
echo "4. Test token purchase functionality"
echo ""
echo "✅ Environment setup complete!"
