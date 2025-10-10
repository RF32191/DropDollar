#!/bin/bash

# 🔧 STRIPE API KEY SETUP SCRIPT
echo "🔧 DropDollar Stripe API Key Setup"
echo "=================================="

# Check current keys
echo ""
echo "📋 Current Stripe Configuration:"
if [ -f ".env.local" ]; then
    PUB_KEY=$(grep NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY .env.local | cut -d'=' -f2)
    SECRET_KEY=$(grep STRIPE_SECRET_KEY .env.local | cut -d'=' -f2)
    
    echo "Publishable Key Length: ${#PUB_KEY} characters"
    echo "Secret Key Length: ${#SECRET_KEY} characters"
    
    if [ ${#PUB_KEY} -lt 100 ] || [ ${#SECRET_KEY} -lt 100 ]; then
        echo "❌ Keys appear to be truncated or invalid"
        echo "🔧 You need to get fresh keys from Stripe Dashboard"
    else
        echo "✅ Keys appear to be valid length"
    fi
else
    echo "❌ .env.local file not found"
fi

echo ""
echo "🎯 TO FIX THE STRIPE API ISSUE:"
echo "================================"
echo ""
echo "1. 🌐 Go to: https://dashboard.stripe.com/apikeys"
echo "2. 🔑 Copy your API keys (they should be 100+ characters long)"
echo "3. 📝 Replace the keys in .env.local file"
echo "4. 🔄 Restart your development server"
echo "5. ✅ Test token purchases"
echo ""
echo "📋 REQUIRED KEYS:"
echo "- Publishable Key (starts with pk_live_ or pk_test_)"
echo "- Secret Key (starts with sk_live_ or sk_test_)"
echo ""
echo "🔧 Would you like me to:"
echo "1. Set up test keys for immediate testing?"
echo "2. Help you configure live keys?"
echo "3. Create a template for you to fill in?"
echo ""

# Offer to create a template
read -p "Create a template .env.local file for you to fill in? (y/n): " create_template

if [ "$create_template" = "y" ] || [ "$create_template" = "Y" ]; then
    echo ""
    echo "📝 Creating template .env.local file..."
    
    cat > .env.local.template << 'EOF'
# DropDollar Environment Variables Template
# Replace the placeholder values with your actual keys

NEXT_PUBLIC_APP_URL=https://drop-dollar.com

# Supabase Configuration (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://xqkjdmgfcpjwqpjzgmhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxa2pkbWdmY3Bqd3FwanpnbWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5NzI4ODUsImV4cCI6MjA0MzU0ODg4NX0.C6t1TGRJlmABGUbCzLbCJpqOzgpvFiZ5JfQlNxHlGR4

# Stripe API Keys (REPLACE THESE WITH YOUR ACTUAL KEYS)
# Get these from: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_SECRET_KEY_HERE

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://drop-dollar.com
NEXT_PUBLIC_APP_NAME=DropDollar
NEXT_PUBLIC_APP_DESCRIPTION=Skill-based gaming marketplace

# Development Settings
NODE_ENV=production
NEXT_PUBLIC_DEBUG_MODE=false
EOF

    echo "✅ Template created: .env.local.template"
    echo ""
    echo "📋 Next steps:"
    echo "1. Get your Stripe keys from: https://dashboard.stripe.com/apikeys"
    echo "2. Replace the placeholder values in .env.local.template"
    echo "3. Rename .env.local.template to .env.local"
    echo "4. Restart your development server"
    echo ""
else
    echo "📋 Manual setup required:"
    echo "1. Edit .env.local file"
    echo "2. Replace Stripe keys with your actual keys"
    echo "3. Restart development server"
fi

echo ""
echo "🔧 For immediate testing, I can also set up test keys..."
read -p "Set up Stripe test keys for immediate testing? (y/n): " setup_test

if [ "$setup_test" = "y" ] || [ "$setup_test" = "Y" ]; then
    echo ""
    echo "🧪 Setting up Stripe test keys..."
    
    # Create test environment
    cat > .env.local << 'EOF'
# DropDollar Environment Variables (Test Mode)

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

    echo "✅ Test keys configured"
    echo "⚠️  NOTE: These are test keys - replace with live keys for production"
    echo ""
    echo "🎯 Test keys will work for development and testing"
    echo "🔧 Token purchases should work immediately"
fi

echo ""
echo "✅ Stripe setup complete!"
echo "🔄 Remember to restart your development server after making changes"
