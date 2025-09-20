'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface GamePopularity {
  gameId: string;
  timesPlayed: number;
  timesUsedInListings: number;
  avgScore: number;
  popularityScore: number;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [bestScores, setBestScores] = useState<{[key: string]: number}>({});
  const [gamePopularity, setGamePopularity] = useState<{[key: string]: GamePopularity}>({});

  useEffect(() => {
    // Load your actual best scores and game popularity data from localStorage
    const savedScores = localStorage.getItem('bestScores');
    if (savedScores) {
      setBestScores(JSON.parse(savedScores));
    }

    const savedPopularity = localStorage.getItem('gamePopularity');
    if (savedPopularity) {
      setGamePopularity(JSON.parse(savedPopularity));
    }
    
    setTimeout(() => setLoading(false), 1000);
  }, []);

  // Update score displays when scores change
  useEffect(() => {
    if (!loading) {
      // Update the score displays with your actual average scores
      const multiTargetElement = document.getElementById('multi-target-score');
      const fallingObjectsElement = document.getElementById('falling-objects-score');
      const colorSequenceElement = document.getElementById('color-sequence-score');

      if (multiTargetElement) {
        const avgScore = gamePopularity['multi-target']?.avgScore || 0;
        const timesPlayed = gamePopularity['multi-target']?.timesPlayed || 0;
        multiTargetElement.textContent = avgScore > 0 ? avgScore.toFixed(1) : '-';
        
        const playCountElement = document.getElementById('multi-target-plays');
        if (playCountElement) {
          playCountElement.textContent = timesPlayed > 0 ? `${timesPlayed} games played` : 'No games yet';
        }
      }
      if (fallingObjectsElement) {
        const avgScore = gamePopularity['falling-objects']?.avgScore || 0;
        const timesPlayed = gamePopularity['falling-objects']?.timesPlayed || 0;
        fallingObjectsElement.textContent = avgScore > 0 ? avgScore.toFixed(1) : '-';
        
        const playCountElement = document.getElementById('falling-objects-plays');
        if (playCountElement) {
          playCountElement.textContent = timesPlayed > 0 ? `${timesPlayed} games played` : 'No games yet';
        }
      }
      if (colorSequenceElement) {
        const avgScore = gamePopularity['color-sequence']?.avgScore || 0;
        const timesPlayed = gamePopularity['color-sequence']?.timesPlayed || 0;
        colorSequenceElement.textContent = avgScore > 0 ? avgScore.toFixed(1) : '-';
        
        const playCountElement = document.getElementById('color-sequence-plays');
        if (playCountElement) {
          playCountElement.textContent = timesPlayed > 0 ? `${timesPlayed} games played` : 'No games yet';
        }
      }
    }
  }, [loading, gamePopularity]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
                <img
                  src="/DropCoin.png"
                  alt="Dollar Drop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Dollar Drop</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 hover:text-green-600 font-medium">Browse</Link>
              <Link href="/categories" className="text-gray-700 hover:text-green-600 font-medium">Categories</Link>
              <Link href="/games" className="text-purple-600 hover:text-purple-700 font-bold">🎮 Games</Link>
              <Link href="/hot-sell" className="text-red-600 hover:text-red-700 font-bold">🔥 Hot Sell</Link>
              <Link href="/how-it-works" className="text-gray-700 hover:text-green-600 font-medium">How It Works</Link>
              <Link href="/buy-tokens" className="text-green-600 hover:text-green-700 font-bold">💰 Buy Tokens</Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                <Link href="/wallet" className="text-green-600 hover:text-green-700 font-bold">👛 Wallet</Link>
                <Link href="/analytics" className="text-blue-600 hover:text-blue-700 font-bold">📊 Analytics</Link>
                <Link href="/auth/login" className="text-gray-700 hover:text-green-600 font-medium">Sign In</Link>
                <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sign Up</Link>
                <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sell</Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Analytics</h1>
          <p className="text-gray-600">Real-time insights into DROP token ecosystem and gaming platform</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Token Price</p>
                <p className="text-3xl font-bold text-green-600">$1.00</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Starting Price
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-blue-600">1</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Platform Owner
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Listings</p>
                <p className="text-3xl font-bold text-purple-600">0</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Games Available</p>
                <p className="text-3xl font-bold text-orange-600">3</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                Ready to Play
              </span>
            </div>
          </div>
        </div>

        {/* Your Personal Stats */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 shadow-lg border border-blue-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Gaming Stats</h2>
              <p className="text-gray-600">Personal performance across all games</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-3xl">🏆</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-blue-600 mb-2">Multi-Target Reaction</div>
              <div className="text-sm text-gray-600 mb-1">Average Score</div>
              <div className="text-2xl font-bold text-gray-900" id="multi-target-score">-</div>
              <div className="text-xs text-blue-600 mt-1" id="multi-target-plays">No games yet</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-green-600 mb-2">Falling Object Catch</div>
              <div className="text-sm text-gray-600 mb-1">Average Score</div>
              <div className="text-2xl font-bold text-gray-900" id="falling-objects-score">-</div>
              <div className="text-xs text-green-600 mt-1" id="falling-objects-plays">No games yet</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-purple-600 mb-2">Color Sequence Memory</div>
              <div className="text-sm text-gray-600 mb-1">Average Score</div>
              <div className="text-2xl font-bold text-gray-900" id="color-sequence-score">-</div>
              <div className="text-xs text-purple-600 mt-1" id="color-sequence-plays">No games yet</div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/games" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              🎮 Play Games Now
            </Link>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">🚧</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Advanced Analytics Coming Soon</h3>
          <p className="text-gray-600 mb-6">
            We're building comprehensive analytics including price charts, token distribution, 
            game performance metrics, and blockchain insights.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📈 Price Analytics</h4>
              <p className="text-gray-600">Historical price data, trends, and predictions</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">🎯 Game Metrics</h4>
              <p className="text-gray-600">Performance stats, win rates, and leaderboards</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">⛓️ Blockchain Data</h4>
              <p className="text-gray-600">Transaction history, token distribution, network health</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <img src="/DropCoin.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-lg font-bold">Dollar Drop</span>
              </div>
              <p className="text-gray-400 text-sm">Real-time analytics for the DROP token ecosystem.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Analytics</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/analytics" className="hover:text-white">Platform Metrics</Link></li>
                <li><a href="#" className="hover:text-white">Token Analytics</a></li>
                <li><a href="#" className="hover:text-white">Game Statistics</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/games" className="hover:text-white">Games</Link></li>
                <li><Link href="/listings" className="hover:text-white">Browse Listings</Link></li>
                <li><Link href="/buy-tokens" className="hover:text-white">Buy Tokens</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/how-it-works" className="hover:text-white">How It Works</Link></li>
                <li><a href="#" className="hover:text-white">API Documentation</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 Dollar Drop. All rights reserved. Analytics powered by blockchain data.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}