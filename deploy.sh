#!/bin/bash

echo "🚀 Deploying DropDollar to Vercel..."

# Check if we're logged in to Vercel
if ! vercel whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

# Deploy to Vercel
echo "📦 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your site should be available at: https://drop-dollar.com"
echo "📊 Check deployment status at: https://vercel.com/dashboard"
