#!/bin/bash

# 🚀 DROP-DOLLAR.COM AUTOMATED DEPLOYMENT SCRIPT
echo "🚀 Setting up DropDollar for drop-dollar.com deployment..."

# Step 1: Create .env.local with production settings
echo "📝 Creating .env.local with production settings..."
cat > .env.local << 'EOF'
# Production Environment Variables for drop-dollar.com
NEXT_PUBLIC_APP_URL=https://drop-dollar.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xqkjdmgfcpjwqpjzgmhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxa2pkbWdmY3Bqd3FwanpnbWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5NzI4ODUsImV4cCI6MjA0MzU0ODg4NX0.C6t1TGRJlmABGUbCzLbCJpqOzgpvFiZ5JfQlNxHlGR4

# Stripe Live Keys (Production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51Q9vXfEMlzOaQXPNKGxLRqPKJxKjMdMCl4w0fPGKv3VQKqBjEQEtXhkD9wNKKtSZlhXKGsL7JzDLKpNfz9R5VxVx00dKcGt9Gq
STRIPE_SECRET_KEY=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
EOF

echo "✅ Environment variables configured for drop-dollar.com"

# Step 2: Test build
echo "🔨 Testing build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "1. Push to GitHub: git add . && git commit -m 'Deploy to drop-dollar.com' && git push"
    echo "2. Deploy to Vercel: https://vercel.com (import your GitHub repo)"
    echo "3. Add domain in Vercel: drop-dollar.com"
    echo "4. Update GoDaddy DNS:"
    echo "   - A Record: @ → 76.76.19.61"
    echo "   - CNAME: www → cname.vercel-dns.com"
    echo "5. Update OAuth URLs to: https://drop-dollar.com/auth/callback"
    echo ""
    echo "🚀 Your DropDollar site is ready for deployment!"
else
    echo "❌ Build failed. Check errors above."
    exit 1
fi
