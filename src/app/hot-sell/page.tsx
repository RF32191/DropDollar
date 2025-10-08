'use client';

import React from 'react';
import Link from 'next/link';

export default function HotSellPage() {
  return (
    <div className="min-h-screen bg-gray-900 transition-colors">
      {/* HOT SELL Header */}
      <header className="bg-gradient-to-r from-red-900 via-orange-800 to-red-900 dark:from-red-950 dark:via-orange-900 dark:to-red-950 shadow-2xl border-b-4 border-orange-500/50 transition-all duration-300 relative overflow-hidden">
        <div className="max-w-8xl mx-auto px-3 lg:px-4 relative z-10">
          <div className="flex justify-between items-center py-3">
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 via-orange-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-red-500/25 transition-all duration-300 group-hover:scale-105">
                  <img src="/DropCoin.png" alt="DropDollar Logo" className="w-full h-full object-contain"/>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">DropDollar</span>
                <span className="text-xs text-gray-400 font-medium tracking-wide">HOT SELL TOURNAMENTS</span>
              </div>
            </Link>

            {/* Navigation */}
            <div className="flex items-center justify-center flex-1 mx-4">
              <nav className="hidden lg:flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Link href="/buy-tokens" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-3 py-2 rounded-lg transition-all hover:scale-105 shadow-lg text-sm">
                    💰 Buy Tokens
                  </Link>
                  <Link href="/listings" className="relative group px-2 py-2 text-orange-200 hover:text-white font-medium transition-all duration-300 text-sm">
                    Browse
                  </Link>
                  <Link href="/categories" className="relative group px-2 py-2 text-orange-200 hover:text-white font-medium transition-all duration-300 text-sm">
                    Categories
                  </Link>
                </div>
                <div className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-red-600/60 to-orange-600/60 rounded-xl border-2 border-orange-400/50 backdrop-blur-sm shadow-lg shadow-red-500/25">
                  <Link href="/games" className="relative group px-2 py-1 text-purple-200 hover:text-white font-bold transition-all duration-300 flex items-center space-x-1 text-xs">
                    <span>🎮</span><span>Games</span>
                  </Link>
                  <Link href="/tournaments" className="relative group px-2 py-1 text-yellow-200 hover:text-white font-bold transition-all duration-300 flex items-center space-x-1 text-xs">
                    <span>🏆</span><span>Tournaments</span>
                  </Link>
                  <Link href="/hot-sell" className="relative group px-3 py-1 text-red-100 hover:text-white font-bold transition-all duration-300 flex items-center space-x-1 bg-gradient-to-r from-red-500/40 to-orange-500/40 rounded-lg border border-orange-300/30 text-xs">
                    <span className="animate-pulse">🔥</span><span>HOT SELL</span>
                  </Link>
                </div>
              </nav>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-2">
              <Link href="/auth/login" className="px-3 py-2 text-orange-200 hover:text-white font-medium transition-colors duration-300 text-sm">
                Sign In
              </Link>
              <Link href="/auth/register" className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm">
                Sign Up
              </Link>
              <Link href="/seller/apply" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm">
                Sell
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-800 dark:via-orange-700 dark:to-yellow-600 py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-7xl md:text-8xl font-black mb-6 bg-gradient-to-r from-white via-yellow-100 to-orange-100 bg-clip-text text-transparent drop-shadow-2xl">
              🔥 HOT SELL 🔥
            </h1>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">
              Winner Cooldown Tournaments
            </h2>
            <p className="text-3xl font-bold text-yellow-200 mb-8 italic drop-shadow-lg">
              "Don't drop out, drop a dollar."
            </p>
            <p className="text-xl text-orange-100 max-w-4xl mx-auto drop-shadow-md">
              🚀 FAST-PACED CASH COMPETITIONS! 💰 Limited time tournaments with REAL money prizes!
            </p>
            
            {/* Stats Grid */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-yellow-300">5 MIN</div>
                <div className="text-orange-200 text-xs">$10 Tournaments</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-green-300">10 MIN</div>
                <div className="text-orange-200 text-xs">$100 Tournaments</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-blue-300">30 MIN</div>
                <div className="text-orange-200 text-xs">$500 Tournaments</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-purple-300">1 HOUR</div>
                <div className="text-orange-200 text-xs">$2500 Tournaments</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-pink-300">2 HOURS</div>
                <div className="text-orange-200 text-xs">$25000 Tournaments</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-red-300">LIVE</div>
                <div className="text-orange-200 text-xs">Active Now</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Cards Section */}
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-16 bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:to-red-950 transition-colors">
        <section className="mb-20">
          <h2 className="text-5xl font-black text-center mb-4 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
            🔥 LIVE FIRE TOURNAMENTS 🔥
          </h2>
          <p className="text-xl text-center text-gray-600 dark:text-gray-300 mb-12 transition-colors">
            ⚡ FAST & FURIOUS ⚡ Multiple Winners Every Round!
          </p>
          
          {/* Tournament Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
            {/* $10 Micro Tournament */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-yellow-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute top-2 right-2 w-16 h-16 bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-2 left-2 w-20 h-20 bg-orange-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/20 to-transparent"></div>
              </div>
              <div className="relative z-10 text-center text-white">
                <div className="text-4xl mb-4">🔥</div>
                <h3 className="text-xl font-bold mb-2 text-yellow-300">$10 Micro Tournament</h3>
                <div className="text-2xl font-black text-yellow-400 mb-2">Winner Gets: $8.50</div>
                <div className="text-sm mb-4 text-gray-300">Multi-Target Reaction</div>
                <div className="text-xs text-gray-400 mb-4">(-15% platform fee)</div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">Progress</span>
                    <span className="text-gray-400">0%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-500" style={{width: '0%'}}></div>
                  </div>
                </div>
                
                {/* Entry Amount Selector */}
                <div className="mb-4">
                  <div className="flex space-x-1">
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-yellow-600 text-black text-xs border border-yellow-500">
                      <div>$1</div>
                    </button>
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 text-xs border border-gray-600">
                      <div>$2</div>
                    </button>
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 text-xs border border-gray-600">
                      <div>$3</div>
                    </button>
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-black font-bold py-3 rounded-lg transition-all hover:scale-105 shadow-lg border border-yellow-500">
                  🔥 Enter with $1
                </button>
                
                <div className="absolute top-2 left-2 bg-yellow-600/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold text-black">
                  5 MIN
                </div>
              </div>
            </div>

            {/* $100 Standard Tournament */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-green-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute top-2 right-2 w-16 h-16 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-2 left-2 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent"></div>
              </div>
              <div className="relative z-10 text-center text-white">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl font-bold mb-2 text-green-300">$100 Standard Tournament</h3>
                <div className="text-2xl font-black text-green-400 mb-2">Winner Gets: $85.00</div>
                <div className="text-sm mb-4 text-gray-300">Falling Object Catch</div>
                <div className="text-xs text-gray-400 mb-4">(-15% platform fee)</div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">Progress</span>
                    <span className="text-gray-400">0%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500" style={{width: '0%'}}></div>
                  </div>
                </div>
                
                {/* Entry Amount Selector */}
                <div className="mb-4">
                  <div className="flex space-x-1">
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-green-600 text-black text-xs border border-green-500">
                      <div>$1</div>
                    </button>
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 text-xs border border-gray-600">
                      <div>$2</div>
                    </button>
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 text-xs border border-gray-600">
                      <div>$3</div>
                    </button>
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-black font-bold py-3 rounded-lg transition-all hover:scale-105 shadow-lg border border-green-500">
                  💰 Enter with $1
                </button>
                
                <div className="absolute top-2 left-2 bg-green-600/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold text-black">
                  10 MIN
                </div>
              </div>
            </div>

            {/* $500 Premium Tournament */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-blue-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute top-2 right-2 w-16 h-16 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-2 left-2 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
              </div>
              <div className="relative z-10 text-center text-white">
                <div className="text-4xl mb-4">💎</div>
                <h3 className="text-xl font-bold mb-2 text-blue-300">$500 Premium Tournament</h3>
                <div className="text-2xl font-black text-blue-400 mb-2">Winner Gets: $425.00</div>
                <div className="text-sm mb-4 text-gray-300">Color Sequence Memory</div>
                <div className="text-xs text-gray-400 mb-4">(-15% platform fee)</div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">Progress</span>
                    <span className="text-gray-400">0%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500" style={{width: '0%'}}></div>
                  </div>
                </div>
                
                {/* Entry Amount Selector */}
                <div className="mb-4">
                  <div className="flex space-x-1">
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-blue-600 text-white text-xs border border-blue-500">
                      <div>$1</div>
                    </button>
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 text-xs border border-gray-600">
                      <div>$2</div>
                    </button>
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 text-xs border border-gray-600">
                      <div>$3</div>
                    </button>
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg transition-all hover:scale-105 shadow-lg border border-blue-500">
                  💎 Enter with $1
                </button>
                
                <div className="absolute top-2 left-2 bg-blue-600/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold text-white">
                  30 MIN
                </div>
              </div>
            </div>

            {/* $2500 Advanced Tournament */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-purple-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute top-2 right-2 w-16 h-16 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-2 left-2 w-20 h-20 bg-violet-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent"></div>
              </div>
              <div className="relative z-10 text-center text-white">
                <div className="text-4xl mb-4">👑</div>
                <h3 className="text-xl font-bold mb-2 text-purple-300">$2500 Advanced Tournament</h3>
                <div className="text-2xl font-black text-purple-400 mb-2">Winner Gets: $2125.00</div>
                <div className="text-sm mb-4 text-gray-300">Multi-Target Reaction</div>
                <div className="text-xs text-gray-400 mb-4">(-15% platform fee)</div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">Progress</span>
                    <span className="text-gray-400">0%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full transition-all duration-500" style={{width: '0%'}}></div>
                  </div>
                </div>
                
                {/* Entry Amount Selector */}
                <div className="mb-4">
                  <div className="flex space-x-1">
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-purple-600 text-white text-xs border border-purple-500">
                      <div>$1</div>
                    </button>
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 text-xs border border-gray-600">
                      <div>$2</div>
                    </button>
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 text-xs border border-gray-600">
                      <div>$3</div>
                    </button>
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-3 rounded-lg transition-all hover:scale-105 shadow-lg border border-purple-500">
                  👑 Enter with $1
                </button>
                
                <div className="absolute top-2 left-2 bg-purple-600/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold text-white">
                  1 HOUR
                </div>
              </div>
            </div>

            {/* $25000 Elite Tournament */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-6 shadow-2xl border-2 border-red-500/30 hover:scale-105 transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute top-2 right-2 w-16 h-16 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-2 left-2 w-20 h-20 bg-rose-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent"></div>
              </div>
              <div className="relative z-10 text-center text-white">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-xl font-bold mb-2 text-red-300">$25000 Elite Championship</h3>
                <div className="text-2xl font-black text-red-400 mb-2">Winner Gets: $21250.00</div>
                <div className="text-sm mb-4 text-gray-300">Falling Objects Catch</div>
                <div className="text-xs text-gray-400 mb-4">(-15% platform fee)</div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">Progress</span>
                    <span className="text-gray-400">0%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-red-500 to-rose-500 h-2 rounded-full transition-all duration-500" style={{width: '0%'}}></div>
                  </div>
                </div>
                
                {/* Entry Amount Selector */}
                <div className="mb-4">
                  <div className="flex space-x-1">
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-red-600 text-white text-xs border border-red-500">
                      <div>$1</div>
                    </button>
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 text-xs border border-gray-600">
                      <div>$2</div>
                    </button>
                    <button className="flex-1 py-2 px-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 text-xs border border-gray-600">
                      <div>$3</div>
                    </button>
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-3 rounded-lg transition-all hover:scale-105 shadow-lg border border-red-500">
                  🏆 Enter with $1
                </button>
                
                <div className="absolute top-2 left-2 bg-red-600/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold text-white">
                  2 HOURS
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 DropDollar - Revolutionary Multi-Winner Tournament System</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
            <Link href="/categories" className="text-gray-400 hover:text-white">Categories</Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-400 hover:text-white">Terms & Conditions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
