'use client';

import React from 'react';
import Link from 'next/link';

export default function TournamentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* GOLD TOURNAMENTS Header */}
      <header className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 dark:from-yellow-600 dark:via-yellow-700 dark:to-amber-800 shadow-2xl border-b-4 border-yellow-600 dark:border-yellow-500">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo Section */}
            <Link href="/" className="flex items-center group">
              <div className="bg-gradient-to-br from-yellow-300 to-amber-500 dark:from-yellow-400 dark:to-amber-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 mr-4">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-white to-yellow-100 dark:from-yellow-100 dark:to-white bg-clip-text text-transparent group-hover:from-yellow-100 group-hover:to-white transition-all duration-300">
                DropDollar
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex-1 mx-4">
              <div className="flex items-center justify-center space-x-4">
                <Link href="/listings" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">
                  Browse
                </Link>
                <Link href="/categories" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">
                  Categories
                </Link>
                <Link href="/games" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">
                  🎮 Games
                </Link>
                <div className="bg-gradient-to-r from-yellow-300 to-amber-400 dark:from-yellow-400 dark:to-amber-500 px-4 py-2 rounded-xl shadow-lg">
                  <Link href="/tournaments" className="text-yellow-900 dark:text-yellow-800 hover:text-yellow-800 dark:hover:text-yellow-700 font-bold transition-colors text-sm">
                    🏆 Tournaments
                  </Link>
                </div>
                <Link href="/hot-sell" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">
                  🔥 Hot Sell
                </Link>
                <Link href="/how-it-works" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">
                  How It Works
                </Link>
              </div>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-2">
              <Link href="/auth/login" className="text-yellow-100 dark:text-yellow-200 hover:text-white dark:hover:text-yellow-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-yellow-600/30">
                Sign In
              </Link>
              <Link href="/auth/register" className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-white/30">
                Sign Up
              </Link>
              <Link href="/seller/apply" className="bg-yellow-300 hover:bg-yellow-200 text-yellow-900 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg">
                Sell
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 dark:from-yellow-600 dark:via-amber-700 dark:to-yellow-800 rounded-3xl p-8 mb-8 shadow-2xl border-4 border-yellow-500 dark:border-yellow-400">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              🏆 Daily Tournament Arena 🏆
            </h1>
            <p className="text-xl text-yellow-100 dark:text-yellow-200 max-w-4xl mx-auto mb-6">
              Compete in $5 daily tournaments with smaller player pools for better winning odds!
            </p>
            <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-6 max-w-3xl mx-auto border border-white/30">
              <h2 className="text-2xl font-bold text-white mb-4">
                Today's Featured Game: 🌈 Color Sequence Memory
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold">$5</div>
                  <div className="text-sm">Entry Fee</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold">15%</div>
                  <div className="text-sm">Platform Fee</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold">4</div>
                  <div className="text-sm">Daily Tournaments</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* $500 Tournament */}
          <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-3xl p-8 shadow-2xl border-2 border-red-400/50 hover:scale-105 transition-all duration-300 group overflow-hidden">
            <div className="relative z-10 text-center mb-6">
              <div className="text-6xl mb-4">🔥</div>
              <h3 className="text-2xl font-black text-white mb-2">$500 Prize Pool</h3>
              <div className="text-3xl font-black text-yellow-300 mb-2">Winner Gets: $425</div>
              <p className="text-xl font-bold text-white/90 mb-1">$500 Elite Championship</p>
              <p className="text-white/80">Multi-Target Reaction</p>
              <div className="text-sm text-white/70 mt-2">(After 15% platform fee)</div>
            </div>
            
            <div className="relative z-10 space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white">0/100</div>
                  <div className="text-xs text-white/80">Participants</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white">$5</div>
                  <div className="text-xs text-white/80">Entry Fee</div>
                </div>
              </div>
            </div>
            
            <div className="relative z-10">
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-white/30">
                🎯 JOIN TOURNAMENT - $5
              </button>
            </div>
          </div>

          {/* $250 Tournament */}
          <div className="relative bg-gradient-to-br from-orange-600 via-orange-700 to-orange-800 rounded-3xl p-8 shadow-2xl border-2 border-orange-400/50 hover:scale-105 transition-all duration-300 group overflow-hidden">
            <div className="relative z-10 text-center mb-6">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-2xl font-black text-white mb-2">$250 Prize Pool</h3>
              <div className="text-3xl font-black text-yellow-300 mb-2">Winner Gets: $212.50</div>
              <p className="text-xl font-bold text-white/90 mb-1">$250 Pro Tournament</p>
              <p className="text-white/80">Falling Object Catch</p>
              <div className="text-sm text-white/70 mt-2">(After 15% platform fee)</div>
            </div>
            
            <div className="relative z-10 space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white">0/50</div>
                  <div className="text-xs text-white/80">Participants</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white">$5</div>
                  <div className="text-xs text-white/80">Entry Fee</div>
                </div>
              </div>
            </div>
            
            <div className="relative z-10">
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-white/30">
                🎯 JOIN TOURNAMENT - $5
              </button>
            </div>
          </div>

          {/* $100 Tournament */}
          <div className="relative bg-gradient-to-br from-yellow-600 via-yellow-700 to-yellow-800 rounded-3xl p-8 shadow-2xl border-2 border-yellow-400/50 hover:scale-105 transition-all duration-300 group overflow-hidden">
            <div className="relative z-10 text-center mb-6">
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-2xl font-black text-white mb-2">$100 Prize Pool</h3>
              <div className="text-3xl font-black text-yellow-300 mb-2">Winner Gets: $85</div>
              <p className="text-xl font-bold text-white/90 mb-1">$100 Challenger Cup</p>
              <p className="text-white/80">Color Sequence Memory</p>
              <div className="text-sm text-white/70 mt-2">(After 15% platform fee)</div>
            </div>
            
            <div className="relative z-10 space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white">0/25</div>
                  <div className="text-xs text-white/80">Participants</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white">$5</div>
                  <div className="text-xs text-white/80">Entry Fee</div>
                </div>
              </div>
            </div>
            
            <div className="relative z-10">
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black py-4 px-6 rounded-xl transition-all hover:scale-105 shadow-lg border border-white/30">
                🎯 JOIN TOURNAMENT - $5
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 border-2 border-red-300 dark:border-red-600 rounded-2xl p-6 mb-8">
          <div className="text-center">
            <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-4">💰 Daily Tournament Rules</h3>
            <div className="text-red-800 dark:text-red-200 text-center mb-4">
              <p className="mb-2"><strong>$5 Entry Fee:</strong> All daily tournaments have a fixed $5 entry fee to keep competition accessible.</p>
              <p className="mb-2"><strong>15% Platform Fee:</strong> DropDollar takes 15% of the total prize pool. Winners get 85% of collected fees.</p>
              <p><strong>Daily Reset:</strong> Tournaments reset every day unless they haven't filled up - then they continue until complete.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
