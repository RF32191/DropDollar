'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Simple Header */}
      <header className="bg-gray-800 shadow-lg border-b border-green-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
                <img 
                  src="/DropCoin.png" 
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white">DropDollar</span>
                <span className="text-xs text-gray-400 font-medium tracking-wide">
                  GAMING MARKETPLACE
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-300 hover:text-green-400 font-medium">Browse</Link>
              <Link href="/games" className="text-purple-400 hover:text-purple-300 font-bold">🎮 Games</Link>
              <Link href="/hot-sell" className="text-red-400 hover:text-red-300 font-bold">🔥 Hot Sell</Link>
              <Link href="/auth/login" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-6">
            Welcome to DropDollar
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Gaming marketplace where you can buy, sell, and compete
          </p>
          
          {/* DEPLOYMENT INDICATOR */}
          <div className="mb-8 p-4 bg-blue-900 border border-blue-500 rounded-lg max-w-md mx-auto">
            <p className="text-blue-200 font-bold">
              🚀 DEPLOYMENT TEST - Updated {new Date().toLocaleString()}
            </p>
            <p className="text-blue-300 text-sm mt-1">
              If you see this banner, changes are going live!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">🎮 Play Games</h3>
              <p className="text-gray-300 mb-4">Compete in tournaments and win prizes</p>
              <Link href="/games" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                Start Playing
              </Link>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">💰 Buy Tokens</h3>
              <p className="text-gray-300 mb-4">Purchase tokens to participate in games</p>
              <Link href="/buy-tokens" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                Buy Now
              </Link>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">🏆 Tournaments</h3>
              <p className="text-gray-300 mb-4">Join competitive tournaments</p>
              <Link href="/tournaments" className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors">
                View Tournaments
              </Link>
            </div>
          </div>

          <div className="mt-12 p-6 bg-green-900 border border-green-500 rounded-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-green-200 mb-4">✅ Site is Working!</h2>
            <p className="text-green-300">
              The deployment is successful. You can now navigate to different pages and test the login system.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}