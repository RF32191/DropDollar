'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/navigation/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import PaymentModal from '@/components/payments/PaymentModal';

export default function BuyTokensPage() {
  const { user } = useAuth();
  const [tokenAmount, setTokenAmount] = useState(10);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Simple pricing: 1 DropToken = $1.00
  const TOKEN_PRICE = 100; // $1.00 in cents
  const totalCost = tokenAmount * TOKEN_PRICE;

  const handlePurchase = () => {
    if (!user) {
      alert('Please sign in to purchase DropTokens');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      // Confirm the token purchase on the backend
      const response = await fetch('/api/payments/tokens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          userId: user?.id,
          tokenAmount: tokenAmount
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`🎉 Successfully purchased ${tokenAmount} DropTokens!\n\nNew Balance: ${result.newTokenBalance} DropTokens\n\nTokens have been added to your account balance.`);
        // Refresh user data
        if (user) {
          window.location.reload(); // Simple refresh to update balance
        }
      } else {
        alert(`❌ Token purchase confirmation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Token confirmation error:', error);
      alert('❌ Failed to confirm token purchase. Please contact support.');
    }
    setShowPaymentModal(false);
  };

  const paymentConfig = {
    amount: totalCost,
    currency: 'usd',
    metadata: {
      userId: user?.id || '',
      type: 'listing' as const,
      gameType: 'token_purchase'
    },
    apiEndpoint: '/api/payments/tokens',
    description: `Purchase ${tokenAmount} DropTokens ($${(totalCost / 100).toFixed(2)})`
  };

  const handlePaymentError = (error: string) => {
    alert(`❌ Payment failed: ${error}`);
  };

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
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">DropDollar</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">Browse</Link>
              <Link href="/categories" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">Categories</Link>
              <Link href="/games" className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors">🎮 Games</Link>
              <Link href="/hot-sell" className="text-red-600 dark:text-green-400 hover:text-red-700 dark:hover:text-green-300 font-bold transition-colors">🔥 Hot Sell</Link>
              <Link href="/tournaments" className="text-blue-600 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-300 font-bold transition-colors">🏆 Tournaments</Link>
              <Link href="/dashboard" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">💰 Dashboard</Link>
              <div className="ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                <Navigation variant="light" />
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">💎</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Buy DropTokens</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Purchase DropTokens to participate in gaming competitions, tournaments, and win amazing prizes. 
            Simple pricing: <strong>1 DropToken = $1.00</strong>
          </p>
        </div>

        {/* Pricing Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Simple Pricing</h3>
              <p className="text-3xl font-bold text-green-600">$1.00</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">per DropToken</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">No complex calculations!</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Secure Payment</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Credit/Debit cards only</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Powered by Stripe</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Instant Access</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Tokens added immediately</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Start playing right away</p>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">Purchase DropTokens</h2>
            <p className="text-green-100 mt-2">Choose your amount - pay with credit or debit card</p>
          </div>

          <div className="p-8">
            <div className="max-w-md mx-auto">
              {/* Token Amount Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Token Amount</h3>
                
                {/* Quick Select Buttons */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[10, 25, 50, 100, 250, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTokenAmount(amount)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        tokenAmount === amount
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
                      }`}
                    >
                      <div className="font-semibold">{amount} Tokens</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">${amount}.00</div>
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter number of tokens"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    1 DropToken = $1.00 (no fees, no complexity!)
                  </p>
                </div>

                {/* Cost Display */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600 dark:text-gray-400">{tokenAmount} DropTokens:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">${tokenAmount}.00</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600 dark:text-gray-400">Stripe processing fee:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${((tokenAmount * 100 * 0.029 + 30) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 dark:text-white font-bold">Total Cost:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${((tokenAmount * 100 + 30 + (tokenAmount * 100 * 0.029)) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Stripe processing fees are industry standard
                  </p>
                </div>

                {/* Purchase Button */}
                <button
                  onClick={handlePurchase}
                  disabled={!user}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {!user ? (
                    '🔒 Sign In to Purchase'
                  ) : (
                    `💳 Buy ${tokenAmount} DropTokens - $${((tokenAmount * 100 + 30 + (tokenAmount * 100 * 0.029)) / 100).toFixed(2)}`
                  )}
                </button>

                {!user && (
                  <div className="mt-4 text-center">
                    <Link href="/auth/register" className="text-green-600 hover:text-green-700 font-medium">
                      Create Account
                    </Link>
                    <span className="text-gray-500 mx-2">or</span>
                    <Link href="/auth/login" className="text-green-600 hover:text-green-700 font-medium">
                      Sign In
                    </Link>
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  💳 Credit/Debit cards only • 🔒 Secure payment by Stripe<br/>
                  Tokens added to your account instantly after payment
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Token Usage Info */}
        <div className="mt-12 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">What Can You Do with DropTokens?</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Gaming Competitions</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Enter skill-based games for $0.20 per entry</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🏆</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Tournaments</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Join daily tournaments ($5) and 1v1 matches ($5-$25)</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🔥</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Hot Sell Competitions</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Big cash prizes: $10, $100, $500, $2500, $25000</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🛍️</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Product Listings</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Win real products by playing skill games</p>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 inline-block">
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">💡 Simple Math</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                1 DropToken = $1.00 • No blockchain • No complexity • Just fun gaming!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        config={paymentConfig}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );
}