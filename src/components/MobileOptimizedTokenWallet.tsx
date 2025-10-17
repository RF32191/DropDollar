'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCardIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon,
  ChartBarIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentService from '@/lib/payments/stripeService';
import { UserService, UserProfile, TokenTransaction } from '@/lib/supabase/userService';
import MobileOptimizedNavigation from '@/components/navigation/MobileOptimizedNavigation';
import MinimalCheckout from '@/components/MinimalCheckout';
import CelebrationEffect from '@/components/CelebrationEffect';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface TokenPackage {
  id: string;
  tokens: number;
  price: number; // in cents
  bonus: number;
  popular?: boolean;
  description: string;
  icon: string;
}

const tokenPackages: TokenPackage[] = [
  { 
    id: 'starter', 
    tokens: 10, 
    price: 1000, // $10.00 (1 token = $1.00)
    bonus: 0, 
    description: 'Perfect for new players',
    icon: '🎮'
  },
  { 
    id: 'popular', 
    tokens: 25, 
    price: 2000, // $20.00 (1 token = $0.80)
    bonus: 5, 
    popular: true,
    description: 'Most popular choice',
    icon: '⭐'
  },
  { 
    id: 'pro', 
    tokens: 50, 
    price: 3500, // $35.00 (1 token = $0.70)
    bonus: 15, 
    description: 'Great value',
    icon: '💎'
  },
  { 
    id: 'elite', 
    tokens: 100, 
    price: 6000, // $60.00 (1 token = $0.60)
    bonus: 40, 
    description: 'Best value',
    icon: '👑'
  }
];

export default function MobileOptimizedTokenWallet() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Mobile: Load only essential data with short timeout
      const data = await Promise.race([
        Promise.all([
          UserService.getCurrentUserProfile().catch(() => null),
          UserService.getUserTokenTransactions(5).catch(() => []) // Only last 5 transactions
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Mobile timeout')), 2000)
        )
      ]);

      const [profile, userTransactions] = data as any;
      setUserProfile(profile);
      setTransactions(userTransactions);

    } catch (error) {
      console.error('Mobile wallet data load failed:', error);
      setUserProfile(null);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePackageSelect = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setPaymentResult(null);
  };

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      setIsProcessing(true);
      
      // Add tokens to user account
      const result = await StripePaymentService.creditTokensToUser(
        paymentIntent.id,
        selectedPackage!.tokens + selectedPackage!.bonus
      );

      if (result.success) {
        setPaymentResult({
          type: 'success',
          message: `Successfully purchased ${selectedPackage!.tokens + selectedPackage!.bonus} tokens!`
        });
        setShowCelebration(true);
        
        // Refresh user data
        setTimeout(() => {
          loadUserData();
        }, 1000);
      } else {
        setPaymentResult({
          type: 'error',
          message: result.error || 'Payment processing failed'
        });
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setPaymentResult({
        type: 'error',
        message: 'An error occurred while processing your payment'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    setPaymentResult({
      type: 'error',
      message: error.message || 'Payment failed'
    });
    setIsProcessing(false);
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(priceInCents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <MobileOptimizedNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <MobileOptimizedNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">💰 Token Wallet</h1>
          <p className="text-gray-300">Buy tokens to play tournaments</p>
        </div>

        {/* Token Balance */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BanknotesIcon className="w-8 h-8 text-yellow-400 mr-3" />
              <h2 className="text-xl font-bold text-white">Your Balance</h2>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="text-gray-400 hover:text-white"
            >
              {showBalance ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {showBalance ? (
                <>
                  {userProfile?.tokens || 0}
                  <span className="text-2xl text-yellow-400 ml-2">🎮</span>
                </>
              ) : (
                '••••'
              )}
            </div>
            <p className="text-gray-300">
              {showBalance ? 'Available Tokens' : 'Balance Hidden'}
            </p>
          </div>
        </div>

        {/* Token Packages */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Buy Tokens</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {tokenPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-white/10 backdrop-blur-xl rounded-2xl p-4 border transition-all duration-300 cursor-pointer ${
                  selectedPackage?.id === pkg.id
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-white/20 hover:border-white/40'
                } ${pkg.popular ? 'ring-2 ring-yellow-400' : ''}`}
                onClick={() => handlePackageSelect(pkg)}
              >
                {pkg.popular && (
                  <div className="text-center mb-2">
                    <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-3xl mb-2">{pkg.icon}</div>
                  <div className="text-lg font-bold text-white mb-1">
                    {pkg.tokens + pkg.bonus} Tokens
                  </div>
                  <div className="text-sm text-gray-300 mb-2">
                    {pkg.tokens} + {pkg.bonus} bonus
                  </div>
                  <div className="text-xl font-bold text-yellow-400 mb-2">
                    {formatPrice(pkg.price)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {pkg.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Form */}
        {selectedPackage && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-8">
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              Complete Purchase
            </h3>
            
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-white mb-2">
                {selectedPackage.tokens + selectedPackage.bonus} Tokens
              </div>
              <div className="text-lg text-yellow-400">
                {formatPrice(selectedPackage.price)}
              </div>
            </div>

            <Elements stripe={stripePromise}>
              <MinimalCheckout
                amount={selectedPackage.price}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                isProcessing={isProcessing}
              />
            </Elements>
          </div>
        )}

        {/* Payment Result */}
        {paymentResult && (
          <div className={`mb-6 p-4 rounded-xl border ${
            paymentResult.type === 'success' 
              ? 'bg-green-500/20 border-green-500/50 text-green-300' 
              : 'bg-red-500/20 border-red-500/50 text-red-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {paymentResult.type === 'success' ? (
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                )}
                {paymentResult.message}
              </div>
              <button
                onClick={() => setPaymentResult(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
          
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="bg-white/5 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium">
                        {transaction.type === 'purchase' ? 'Token Purchase' : 'Token Usage'}
                      </div>
                      <div className="text-gray-300 text-sm">
                        {formatDate(transaction.created_at)}
                      </div>
                    </div>
                    <div className={`font-bold ${
                      transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">No transactions yet</p>
          )}
        </div>
      </div>

      {/* Celebration Effect */}
      {showCelebration && (
        <CelebrationEffect
          message="Tokens Added Successfully!"
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
