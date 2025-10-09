'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function SimpleBuyTokensPage() {
  const [tokenAmount, setTokenAmount] = useState(10);

  // Simple pricing: 1 DropToken = $1.00
  const TOKEN_PRICE = 100; // $1.00 in cents
  const totalCost = tokenAmount * TOKEN_PRICE;

  const handlePurchase = () => {
    alert('🚧 Payment system temporarily disabled for maintenance. Please check back soon!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 shadow-2xl border-b-4 border-green-400">
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
                <span className="text-sm text-green-200 font-bold tracking-wider animate-pulse">
                  ⚡ TOKEN PURCHASE SYSTEM ⚡
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-8">
              <Link href="/listings" className="text-white hover:text-green-300 font-bold text-lg transition-all duration-300 hover:scale-105">Browse</Link>
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
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-pulse">
              💰 Buy DropTokens
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-teal-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-xl text-transparent bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text animate-pulse max-w-3xl mx-auto mb-8">
            Purchase DropTokens to participate in gaming competitions, tournaments, and win amazing prizes. 
            Simple pricing: <strong className="text-yellow-300">1 DropToken = $1.00</strong>
          </p>
        </div>

        {/* Pricing Info Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-green-800 to-emerald-800 p-8 rounded-2xl border-2 border-green-400 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Simple Pricing</h3>
              <p className="text-4xl font-bold text-green-300">$1.00</p>
              <p className="text-lg text-green-200">per DropToken</p>
              <p className="text-sm text-green-300 mt-2">No complex calculations!</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-800 to-indigo-800 p-8 rounded-2xl border-2 border-blue-400 hover:border-blue-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Secure Payment</h3>
              <p className="text-lg text-blue-200">Credit/Debit cards only</p>
              <p className="text-sm text-blue-300 mt-2">Powered by Stripe</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-8 rounded-2xl border-2 border-purple-400 hover:border-purple-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Instant Access</h3>
              <p className="text-lg text-purple-200">Tokens added immediately</p>
              <p className="text-sm text-purple-300 mt-2">Start playing right away</p>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border-2 border-gray-600 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 px-8 py-6">
            <h2 className="text-3xl font-bold text-white">Purchase DropTokens</h2>
            <p className="text-green-100 mt-2 text-lg">Choose your amount - pay with credit or debit card</p>
          </div>

          <div className="p-8">
            <div className="max-w-md mx-auto">
              {/* Token Amount Selection */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-6">Select Token Amount</h3>
                
                {/* Quick Select Buttons */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[10, 25, 50, 100, 250, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTokenAmount(amount)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        tokenAmount === amount
                          ? 'border-green-500 bg-green-600 text-white shadow-lg'
                          : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-green-400 hover:bg-gray-600'
                      }`}
                    >
                      <div className="font-bold text-lg">{amount} Tokens</div>
                      <div className="text-sm">${amount}.00</div>
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div className="mb-8">
                  <label className="block text-lg font-bold text-white mb-3">
                    Custom Amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-4 border-2 border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-700 text-white text-lg"
                    placeholder="Enter number of tokens"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    1 DropToken = $1.00 (no fees, no complexity!)
                  </p>
                </div>

                {/* Cost Display */}
                <div className="bg-gray-700 rounded-xl p-6 mb-8 border border-gray-600">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-300 text-lg">{tokenAmount} DropTokens:</span>
                    <span className="font-bold text-white text-xl">${tokenAmount}.00</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-300 text-lg">Stripe processing fee:</span>
                    <span className="font-bold text-white text-xl">
                      ${((tokenAmount * 100 * 0.029 + 30) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-gray-600 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold text-xl">Total Cost:</span>
                      <span className="text-3xl font-bold text-green-400">
                        ${((tokenAmount * 100 + 30 + (tokenAmount * 100 * 0.029)) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-3 text-center">
                    Stripe processing fees are industry standard
                  </p>
                </div>

                {/* Purchase Button */}
                <button
                  onClick={handlePurchase}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-6 px-8 rounded-xl transition-all transform hover:scale-105 text-xl shadow-lg hover:shadow-2xl"
                >
                  💳 Buy {tokenAmount} DropTokens - ${((tokenAmount * 100 + 30 + (tokenAmount * 100 * 0.029)) / 100).toFixed(2)}
                </button>

                <div className="mt-6 text-center">
                  <Link href="/auth/register" className="text-green-400 hover:text-green-300 font-bold text-lg mr-4">
                    Create Account
                  </Link>
                  <span className="text-gray-400 mx-2">or</span>
                  <Link href="/auth/login" className="text-green-400 hover:text-green-300 font-bold text-lg">
                    Sign In
                  </Link>
                </div>

                <p className="text-sm text-gray-400 mt-6 text-center">
                  💳 Credit/Debit cards only • 🔒 Secure payment by Stripe<br/>
                  Tokens added to your account instantly after payment
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Token Usage Info */}
        <div className="mt-16 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-2xl p-8 border-2 border-purple-400">
          <h3 className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text mb-8 text-center">
            What Can You Do with DropTokens?
          </h3>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🎮</span>
              </div>
              <h4 className="font-bold text-white mb-3 text-xl">Gaming Competitions</h4>
              <p className="text-purple-200">Enter skill-based games for $0.20 per entry</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🏆</span>
              </div>
              <h4 className="font-bold text-white mb-3 text-xl">Tournaments</h4>
              <p className="text-green-200">Join daily tournaments ($5) and 1v1 matches ($5-$25)</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🔥</span>
              </div>
              <h4 className="font-bold text-white mb-3 text-xl">Hot Sell Competitions</h4>
              <p className="text-red-200">Big cash prizes: $10, $100, $500, $2500, $25000</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🛍️</span>
              </div>
              <h4 className="font-bold text-white mb-3 text-xl">Product Listings</h4>
              <p className="text-blue-200">Win real products by playing skill games</p>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <div className="bg-gray-800 rounded-xl p-6 inline-block border border-gray-600">
              <h4 className="font-bold text-white mb-3 text-xl">💡 Simple Math</h4>
              <p className="text-gray-300 text-lg">
                1 DropToken = $1.00 • No blockchain • No complexity • Just fun gaming!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}