#!/bin/bash

# DropDollar Environment Setup Script
echo "🔧 Setting up DropDollar environment variables..."

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local already exists"
    echo "📋 Current environment variables:"
    echo "STRIPE_SECRET_KEY: $(if [ -n "$STRIPE_SECRET_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
    echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: $(if [ -n "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
else
    echo "📝 Creating .env.local file..."
    
    # Create .env.local with production values
    cat > .env.local << 'EOF'
# Production Environment Variables for drop-dollar.com

NEXT_PUBLIC_APP_URL=https://drop-dollar.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xqkjdmgfcpjwqpjzgmhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxa2pkbWdmY3Bqd3FwanpnbWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5NzI4ODUsImV4cCI6MjA0MzU0ODg4NX0.C6t1TGRJlmABGUbCzLbCJpqOzgpvFiZ5JfQlNxHlGR4

# Stripe Live Keys (Production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51Q9vXfEMlzOaQXPNKGxLRqPKJxKjMdMCl4w0fPGKv3VQKqBjEQEtXhkD9wNKKtSZlhXKGsL7JzDLKpNfz9R5VxVx00dKcGt9Gq
STRIPE_SECRET_KEY=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

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://drop-dollar.com
NEXT_PUBLIC_APP_NAME=DropDollar
NEXT_PUBLIC_APP_DESCRIPTION=Skill-based gaming marketplace

# Development Settings
NODE_ENV=production
NEXT_PUBLIC_DEBUG_MODE=false
EOF

    echo "✅ .env.local created successfully"
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
echo "🎯 Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Test token purchase functionality"
echo "3. Check browser console for Stripe configuration logs"
echo ""
echo "✅ Environment setup complete!"
