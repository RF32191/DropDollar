#!/bin/bash

# Build script for DropDollar
# This script handles environment setup and builds the project

echo "🚀 Building DropDollar..."

# Create minimal environment variables to prevent build errors
export NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder_anon_key"
export SUPABASE_SERVICE_ROLE_KEY="placeholder_service_key"
export STRIPE_SECRET_KEY="sk_test_placeholder"
export STRIPE_WEBHOOK_SECRET="whsec_placeholder"
export PAYPAL_CLIENT_ID="placeholder_client_id"
export PAYPAL_CLIENT_SECRET="placeholder_client_secret"
export PAYPAL_BASE_URL="https://api-m.sandbox.paypal.com"
export NODE_ENV="development"

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🌐 Ready for deployment"
else
    echo "❌ Build failed"
    exit 1
fi
