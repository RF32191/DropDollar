#!/bin/bash

# Dollar Drop - Permanent Server Startup Script
# This ensures we ALWAYS run from the correct directory

echo "🪙 Starting Dollar Drop Server..."
echo "📁 Working Directory: $(pwd)"

# Kill any existing Next.js processes
pkill -f "next dev" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Wait for processes to terminate
sleep 3

# Ensure we're in the right directory
cd /Users/ryanjoshuafermoselle/Desktop/CryptoMarket

# Verify we have the correct files
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in current directory"
    exit 1
fi

if [ ! -f "public/DropCoin.jpg" ]; then
    echo "❌ Error: DropCoin.jpg not found"
    exit 1
fi

# Check package.json contains "dollar-drop"
if ! grep -q "dollar-drop" package.json; then
    echo "❌ Error: This doesn't appear to be the Dollar Drop project"
    exit 1
fi

echo "✅ All checks passed!"
echo "🚀 Starting Dollar Drop development server..."
echo "🌐 Your site will be available at: http://localhost:3000"
echo ""

# Start the server
npm run dev
