#!/bin/bash

# Stripe Configuration Test Script
echo "🔧 Testing Stripe Configuration..."

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "❌ .env.local file not found"
    exit 1
fi

# Test Stripe keys
echo ""
echo "📋 Stripe Configuration Test:"
echo "STRIPE_SECRET_KEY: $(if [ -n "$STRIPE_SECRET_KEY" ]; then echo "✅ Set (${STRIPE_SECRET_KEY:0:20}...)"; else echo "❌ Not set"; fi)"
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: $(if [ -n "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then echo "✅ Set (${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:0:20}...)"; else echo "❌ Not set"; fi)"

# Test Supabase keys
echo ""
echo "📋 Supabase Configuration Test:"
echo "NEXT_PUBLIC_SUPABASE_URL: $(if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: $(if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"

# Test Stripe API connection (if Node.js is available)
if command -v node &> /dev/null; then
    echo ""
    echo "🔌 Testing Stripe API connection..."
    
    # Create a simple test script
    cat > test-stripe.js << 'EOF'
const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    console.log('❌ STRIPE_SECRET_KEY not found');
    process.exit(1);
}

try {
    const stripe = new Stripe(stripeSecretKey);
    console.log('✅ Stripe initialized successfully');
    
    // Test API connection by retrieving account info
    stripe.accounts.retrieve().then(account => {
        console.log('✅ Stripe API connection successful');
        console.log('📋 Account ID:', account.id);
        console.log('📋 Country:', account.country);
        console.log('📋 Charges Enabled:', account.charges_enabled);
        console.log('📋 Payouts Enabled:', account.payouts_enabled);
    }).catch(error => {
        console.log('❌ Stripe API connection failed:', error.message);
    });
} catch (error) {
    console.log('❌ Stripe initialization failed:', error.message);
}
EOF

    node test-stripe.js
    rm test-stripe.js
else
    echo "⚠️ Node.js not available for API testing"
fi

echo ""
echo "🎯 Configuration test complete!"
echo "If all tests pass, your Stripe integration should work properly."
