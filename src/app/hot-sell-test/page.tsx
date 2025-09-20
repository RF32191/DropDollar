'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function HotSellTestPage() {
  const [selectedDollars, setSelectedDollars] = useState<{ [key: string]: number }>({});
  
  // Mock token price for display
  const tokenPrice = 2.45; // $2.45 per token

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/DropCoin.png" alt="Dollar Drop" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">Dollar Drop</span>
            </Link>
            <nav className="flex space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              <Link href="/hot-sell" className="text-purple-600 hover:text-purple-700 font-bold">🔥 Hot Sell</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔥 Fractional Token System Test
          </h1>
          <p className="text-xl text-gray-600">
            Testing the new dollar-based token entry system
          </p>
        </div>

        {/* Tournament Card */}
        <div className="max-w-md mx-auto bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border-2 border-green-200 shadow-lg">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Test Tournament</h3>
            <div className="text-3xl font-bold text-green-600 mt-2">$100</div>
            <div className="text-sm text-gray-600">Token Prize Pool</div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Entry:</span>
              <span className="font-bold text-gray-900">$1-$3 worth of tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Token Price:</span>
              <span className="font-bold text-blue-600">${tokenPrice.toFixed(4)} per token</span>
            </div>
          </div>

          {/* Dollar Amount Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Dollar Amount:</label>
            <div className="flex space-x-2">
              {[1, 2, 3].map(dollars => {
                const tokensNeeded = (dollars / tokenPrice).toFixed(4);
                return (
                  <button
                    key={dollars}
                    onClick={() => setSelectedDollars(prev => ({ ...prev, 'test': dollars }))}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                      (selectedDollars['test'] || 1) === dollars
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-center">
                      <div>${dollars}</div>
                      <div className="text-xs opacity-75">
                        {tokensNeeded} tokens
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <button 
            onClick={() => alert(`Selected: $${selectedDollars['test'] || 1} worth of tokens`)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            🪙 Enter with ${selectedDollars['test'] || 1} worth of tokens
          </button>
        </div>

        {/* Token Calculation Examples */}
        <div className="max-w-2xl mx-auto mt-8 bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Token Calculation Examples</h3>
          <div className="space-y-2">
            {[1, 2, 3].map(dollars => {
              const tokens = (dollars / tokenPrice).toFixed(4);
              return (
                <div key={dollars} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium">${dollars} entry:</span>
                  <span className="text-blue-600">{tokens} tokens needed</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> Users always pay $1-$3 worth of tokens, regardless of token price fluctuations. 
              The system automatically calculates the exact fractional token amount needed.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
