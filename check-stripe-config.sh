#!/bin/bash

echo "🔧 Checking Stripe Configuration..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in project root directory"
    exit 1
fi

echo "📁 Project directory: $(pwd)"
echo ""

# Check environment variables
echo "🔍 Environment Variables:"
echo "------------------------"

if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    echo "📋 Stripe variables in .env.local:"
    grep -E "STRIPE_" .env.local | sed 's/=.*/=***HIDDEN***/' || echo "   No Stripe variables found"
else
    echo "❌ .env.local file not found"
fi

echo ""

# Check Vercel environment
if command -v vercel &> /dev/null; then
    echo "🔍 Vercel Environment:"
    echo "--------------------"
    echo "📋 Stripe variables in Vercel:"
    vercel env ls | grep -E "STRIPE_" || echo "   No Stripe variables found in Vercel"
else
    echo "⚠️  Vercel CLI not installed"
fi

echo ""

# Check if Stripe keys look valid
echo "🔍 Stripe Key Validation:"
echo "-------------------------"

if [ -f ".env.local" ]; then
    STRIPE_SECRET_KEY=$(grep "STRIPE_SECRET_KEY" .env.local | cut -d'=' -f2)
    if [ ! -z "$STRIPE_SECRET_KEY" ]; then
        if [[ $STRIPE_SECRET_KEY == sk_test_* ]]; then
            echo "✅ Stripe secret key format looks correct (test key)"
        elif [[ $STRIPE_SECRET_KEY == sk_live_* ]]; then
            echo "✅ Stripe secret key format looks correct (live key)"
        else
            echo "❌ Stripe secret key format looks incorrect"
        fi
    else
        echo "❌ STRIPE_SECRET_KEY not found in .env.local"
    fi
else
    echo "❌ Cannot check Stripe keys - .env.local not found"
fi

echo ""
echo "🔧 Next Steps:"
echo "=============="
echo "1. Make sure STRIPE_SECRET_KEY is set in .env.local"
echo "2. Make sure STRIPE_SECRET_KEY is set in Vercel environment"
echo "3. Check that the Stripe key is valid and active"
echo "4. Try the payment again and check server logs"
echo ""
echo "📝 To set Vercel environment variables:"
echo "   vercel env add STRIPE_SECRET_KEY"
echo "   vercel env add STRIPE_WEBHOOK_SECRET"
echo ""
