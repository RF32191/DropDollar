#!/bin/bash

echo "🚀 Starting CryptoMarket website for iPhone app connection..."
echo "📱 This will allow your iPhone app to connect to localhost"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🌐 Starting Next.js development server..."
echo "📍 Website will be available at: http://localhost:3000"
echo "📱 iPhone app API endpoints:"
echo "   • Health check: http://localhost:3000/api/mobile/health"
echo "   • Crypto data: http://localhost:3000/api/mobile/crypto"
echo "   • DropCoin stats: http://localhost:3000/api/mobile/dropcoin"
echo "   • Leaderboard: http://localhost:3000/api/mobile/leaderboard"
echo ""
echo "🔧 Make sure your iPhone is on the same WiFi network!"
echo "📲 Update iPhone app NetworkManager baseURL to your computer's IP if needed"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="

# Start the development server
npm run dev



