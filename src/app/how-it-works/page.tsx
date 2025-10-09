'use client';

import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 shadow-2xl border-b-4 border-blue-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <img 
                  src="/DropCoin.png" 
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold text-white drop-shadow-lg">DropDollar</span>
                <span className="text-sm text-blue-200 font-bold tracking-wider animate-pulse">
                  ⚡ HOW IT WORKS ⚡
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-8">
              <Link href="/listings" className="text-white hover:text-blue-300 font-bold text-lg transition-all duration-300 hover:scale-105">Browse</Link>
              <Link href="/games" className="text-purple-300 hover:text-purple-200 font-bold text-lg transition-all duration-300 hover:scale-105">🎮 Games</Link>
              <Link href="/tournaments" className="text-yellow-300 hover:text-yellow-200 font-bold text-lg transition-all duration-300 hover:scale-105">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-red-300 hover:text-red-200 font-bold text-lg transition-all duration-300 hover:scale-105">🔥 Hot Sell</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
              🚀 How It Works
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-xl text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text animate-pulse max-w-3xl mx-auto mb-8">
            Learn how DropDollar's skill-based gaming platform works and start winning amazing prizes!
          </p>
        </div>

        {/* Step-by-Step Process */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {/* Step 1 */}
          <div className="bg-gradient-to-br from-blue-800 to-indigo-800 p-8 rounded-2xl border-2 border-blue-400 hover:border-blue-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">1</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">🛍️ Browse Listings</h3>
              <p className="text-blue-200 text-lg">
                Discover amazing products from sellers. Each listing has a skill-based game attached to win the item.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-gradient-to-br from-green-800 to-emerald-800 p-8 rounded-2xl border-2 border-green-400 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">💰 Buy Tokens</h3>
              <p className="text-green-200 text-lg">
                Purchase DropTokens ($1 each) to enter competitions. Simple pricing with no hidden fees.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-8 rounded-2xl border-2 border-purple-400 hover:border-purple-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">🎮 Play Games</h3>
              <p className="text-purple-200 text-lg">
                Enter skill-based games like Multi-Target Reaction, Color Sequence Memory, and Laser Dodge.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-gradient-to-br from-yellow-800 to-orange-800 p-8 rounded-2xl border-2 border-yellow-400 hover:border-yellow-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">4</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">🏆 Win Prizes</h3>
              <p className="text-yellow-200 text-lg">
                Highest score wins! Get the product delivered to your door or cash prizes for tournaments.
              </p>
            </div>
          </div>
        </div>

        {/* Game Types Section */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text mb-8 text-center">
            🎮 Available Games
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Multi-Target Reaction */}
            <div className="bg-gradient-to-br from-red-800 to-pink-800 p-6 rounded-xl border-2 border-red-400 hover:border-red-300 transition-all duration-300 hover:scale-105 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-3">🎯 Multi-Target Reaction</h3>
              <p className="text-red-200 mb-4">Click targets as they appear. Test your reaction speed and accuracy.</p>
              <div className="text-sm text-red-300">
                <strong>Entry Cost:</strong> $0.20 (0.2 DropTokens)<br/>
                <strong>Duration:</strong> 60 seconds<br/>
                <strong>Skill:</strong> Reaction Time
              </div>
            </div>

            {/* Color Sequence Memory */}
            <div className="bg-gradient-to-br from-blue-800 to-indigo-800 p-6 rounded-xl border-2 border-blue-400 hover:border-blue-300 transition-all duration-300 hover:scale-105 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-3">🌈 Color Sequence Memory</h3>
              <p className="text-blue-200 mb-4">Memorize and repeat color sequences. Challenge your memory skills.</p>
              <div className="text-sm text-blue-300">
                <strong>Entry Cost:</strong> $0.20 (0.2 DropTokens)<br/>
                <strong>Duration:</strong> 90 seconds<br/>
                <strong>Skill:</strong> Memory
              </div>
            </div>

            {/* Laser Dodge */}
            <div className="bg-gradient-to-br from-green-800 to-emerald-800 p-6 rounded-xl border-2 border-green-400 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-3">🔥 Laser Dodge EXTREME</h3>
              <p className="text-green-200 mb-4">Navigate through laser obstacles. Test your precision and timing.</p>
              <div className="text-sm text-green-300">
                <strong>Entry Cost:</strong> $0.20 (0.2 DropTokens)<br/>
                <strong>Duration:</strong> 75 seconds<br/>
                <strong>Skill:</strong> Precision
              </div>
            </div>

            {/* Falling Object Catch */}
            <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-6 rounded-xl border-2 border-purple-400 hover:border-purple-300 transition-all duration-300 hover:scale-105 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-3">💰 Falling Object Catch</h3>
              <p className="text-purple-200 mb-4">Catch falling objects while avoiding obstacles. Test your coordination.</p>
              <div className="text-sm text-purple-300">
                <strong>Entry Cost:</strong> $0.20 (0.2 DropTokens)<br/>
                <strong>Duration:</strong> 60 seconds<br/>
                <strong>Skill:</strong> Coordination
              </div>
            </div>

            {/* Quick Click */}
            <div className="bg-gradient-to-br from-yellow-800 to-orange-800 p-6 rounded-xl border-2 border-yellow-400 hover:border-yellow-300 transition-all duration-300 hover:scale-105 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-3">⚡ Quick Click</h3>
              <p className="text-yellow-200 mb-4">Click rapidly on targets. Test your clicking speed and endurance.</p>
              <div className="text-sm text-yellow-300">
                <strong>Entry Cost:</strong> $0.20 (0.2 DropTokens)<br/>
                <strong>Duration:</strong> 45 seconds<br/>
                <strong>Skill:</strong> Speed
              </div>
            </div>

            {/* Sword Parry */}
            <div className="bg-gradient-to-br from-indigo-800 to-blue-800 p-6 rounded-xl border-2 border-indigo-400 hover:border-indigo-300 transition-all duration-300 hover:scale-105 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-3">⚔️ Sword Parry</h3>
              <p className="text-indigo-200 mb-4">Parry incoming attacks with perfect timing. Test your reflexes.</p>
              <div className="text-sm text-indigo-300">
                <strong>Entry Cost:</strong> $0.20 (0.2 DropTokens)<br/>
                <strong>Duration:</strong> 60 seconds<br/>
                <strong>Skill:</strong> Reflexes
              </div>
            </div>
          </div>
        </div>

        {/* Competition Types */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text mb-8 text-center">
            🏆 Competition Types
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Product Listings */}
            <div className="bg-gradient-to-br from-emerald-800 to-green-800 p-8 rounded-2xl border-2 border-emerald-400 hover:border-emerald-300 transition-all duration-300 hover:scale-105 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">🛍️</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Product Listings</h3>
                <p className="text-emerald-200 mb-4">Win real products by playing skill games. Highest score takes the item!</p>
                <div className="text-sm text-emerald-300">
                  <strong>Entry Cost:</strong> $0.20<br/>
                  <strong>Prize:</strong> Physical Product<br/>
                  <strong>Winner:</strong> Highest Score
                </div>
              </div>
            </div>

            {/* Tournaments */}
            <div className="bg-gradient-to-br from-yellow-800 to-orange-800 p-8 rounded-2xl border-2 border-yellow-400 hover:border-yellow-300 transition-all duration-300 hover:scale-105 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">🏆</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Tournaments</h3>
                <p className="text-yellow-200 mb-4">Daily tournaments with cash prizes. Compete against other players!</p>
                <div className="text-sm text-yellow-300">
                  <strong>Entry Cost:</strong> $5.00<br/>
                  <strong>Prize:</strong> Cash ($425)<br/>
                  <strong>Winner:</strong> Highest Score
                </div>
              </div>
            </div>

            {/* Hot Sell */}
            <div className="bg-gradient-to-br from-red-800 to-pink-800 p-8 rounded-2xl border-2 border-red-400 hover:border-red-300 transition-all duration-300 hover:scale-105 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">🔥</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Hot Sell</h3>
                <p className="text-red-200 mb-4">Fast-paced cash competitions with big prizes. Limited time tournaments!</p>
                <div className="text-sm text-red-300">
                  <strong>Entry Cost:</strong> $10-$25,000<br/>
                  <strong>Prize:</strong> Cash<br/>
                  <strong>Winner:</strong> Highest Score
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text mb-8 text-center">
            💰 Simple Pricing
          </h2>
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-2xl p-8 border-2 border-blue-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">DropToken Pricing</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">1 DropToken</span>
                    <span className="text-white font-bold">$1.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">10 DropTokens</span>
                    <span className="text-white font-bold">$10.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">100 DropTokens</span>
                    <span className="text-white font-bold">$100.00</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">Entry Costs</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-200">Product Games</span>
                    <span className="text-white font-bold">$0.20</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-200">Daily Tournaments</span>
                    <span className="text-white font-bold">$5.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-200">Hot Sell Competitions</span>
                    <span className="text-white font-bold">$10-$25,000</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-blue-200 text-lg">
                <strong>No hidden fees!</strong> What you see is what you pay. Simple and transparent pricing.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text mb-8">
            Ready to Start Playing?
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/listings" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Browse Listings
            </Link>
            <Link href="/buy-tokens" className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Buy Tokens
            </Link>
            <Link href="/games" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Play Games
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
