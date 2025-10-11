#!/bin/bash

echo "🔧 Checking Vercel Environment Variables..."
echo ""

# Check if user has Vercel CLI installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not installed"
    echo "Install with: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI installed"
echo ""

# Check current project
echo "📋 Current Project:"
vercel project ls 2>&1 | head -n 5
echo ""

# List environment variables
echo "📋 Checking Environment Variables in Vercel:"
echo "Run this command to see your environment variables:"
echo ""
echo "  vercel env ls"
echo ""

# Pull environment variables
echo "📋 Pulling environment variables from Vercel..."
vercel env pull .env.vercel.local 2>&1

if [ -f ".env.vercel.local" ]; then
    echo ""
    echo "✅ Environment variables pulled to .env.vercel.local"
    echo ""
    echo "📋 Checking for Stripe keys:"
    
    if grep -q "STRIPE_SECRET_KEY" .env.vercel.local; then
        echo "✅ STRIPE_SECRET_KEY found in Vercel"
    else
        echo "❌ STRIPE_SECRET_KEY NOT found in Vercel"
        echo ""
        echo "🔧 You need to add it with:"
        echo "  vercel env add STRIPE_SECRET_KEY"
    fi
    
    if grep -q "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" .env.vercel.local; then
        echo "✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY found in Vercel"
    else
        echo "❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY NOT found in Vercel"
        echo ""
        echo "🔧 You need to add it with:"
        echo "  vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    fi
else
    echo "❌ Failed to pull environment variables"
    echo ""
    echo "🔧 Manual check:"
    echo "1. Go to: https://vercel.com/rf32191s-projects/drop-dollar/settings/environment-variables"
    echo "2. Check if STRIPE_SECRET_KEY exists"
    echo "3. Check if NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY exists"
fi

echo ""
echo "🔧 Quick fix - Add environment variables to Vercel:"
echo ""
echo "Option 1: Via Vercel CLI:"
echo "  vercel env add STRIPE_SECRET_KEY"
echo "  (paste your secret key when prompted)"
echo ""
echo "Option 2: Via Vercel Dashboard:"
echo "  https://vercel.com/rf32191s-projects/drop-dollar/settings/environment-variables"
echo ""

