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
import { ActivityService } from '@/lib/supabase/activityService';
import MinimalCheckout from '@/components/MinimalCheckout';
import CelebrationEffect from '@/components/CelebrationEffect';
import CoinDropAnimation from '@/components/CoinDropAnimation';
import CleanNavigation from '@/components/navigation/CleanNavigation';

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
    tokens: 50, 
    price: 5000, // $50.00 (1 token = $1.00, no bonus)
    bonus: 0, 
    description: 'Most popular choice', 
    popular: true,
    icon: '⭐'
  },
  { 
    id: 'pro', 
    tokens: 100, 
    price: 10000, // $100.00 (1 token = $1.00, no bonus)
    bonus: 0, 
    description: 'For serious competitors',
    icon: '💪'
  },
  { 
    id: 'champion', 
    tokens: 250, 
    price: 25000, // $250.00 (1 token = $1.00, no bonus)
    bonus: 0, 
    description: 'Dominate the leaderboards',
    icon: '🏆'
  },
  { 
    id: 'elite', 
    tokens: 500, 
    price: 50000, // $500.00 (1 token = $1.00, no bonus)
    bonus: 0, 
    description: 'Ultimate gaming power',
    icon: '👑'
  },
];

export default function ProfessionalTokenWallet() {
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage>(tokenPackages[1]); // Default to popular
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [tokenTransactions, setTokenTransactions] = useState<TokenTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'wallet' | 'purchase' | 'history'>('wallet');
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCoinDrop, setShowCoinDrop] = useState(false);
  const [purchasedTokens, setPurchasedTokens] = useState(0);

  // Enhanced user detection
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        console.log('🔍 Professional Token Wallet: Checking authentication...');
        
        // Multiple ways to detect logged-in user
        const isLoggedInFlag = localStorage.getItem('isLoggedIn') === 'true';
        const userData = localStorage.getItem('user');
        const sessionId = localStorage.getItem('sessionId');
        const loginTime = localStorage.getItem('loginTime');
        
        console.log('🔍 Auth flags:', { isLoggedInFlag, hasUserData: !!userData, hasSessionId: !!sessionId, hasLoginTime: !!loginTime });
        
        // Check if UsernameDropdown exists (indicates user is logged in)
        const usernameDropdown = document.querySelector('[data-username-dropdown]');
        console.log('🔍 UsernameDropdown exists:', !!usernameDropdown);
        
        if (isLoggedInFlag || userData || sessionId || loginTime || usernameDropdown) {
          console.log('🔍 User appears to be logged in, getting profile...');
          
          // Get current user using UserService
          const currentUser = UserService.getCurrentUser();
          
          if (currentUser) {
            console.log('✅ [TokenWallet] User found:', currentUser.username);
            console.log('🔍 [TokenWallet] User ID:', currentUser.id);
            
            // Get or create user profile in Supabase
            const profile = await UserService.getOrCreateUser(currentUser);
            console.log('✅ [TokenWallet] Initial profile:', profile);
            console.log('💰 [TokenWallet] Initial tokens:', profile.tokens);
            
            // Fetch fresh profile to ensure latest data
            const freshProfile = await UserService.getUserProfile(currentUser.id);
            if (freshProfile) {
              console.log('✅ [TokenWallet] Fresh profile fetched:', freshProfile);
              console.log('💰 [TokenWallet] Fresh tokens:', freshProfile.tokens);
              setUserProfile(freshProfile);
            } else {
              setUserProfile(profile);
            }
            
            setIsLoggedIn(true);
            
            // Load token transactions
            const transactions = await UserService.getUserTokenTransactions(currentUser.id);
            setTokenTransactions(transactions);
            console.log('✅ [TokenWallet] Loaded', transactions.length, 'transactions');
            
            // Load purchase history
            const purchases = await UserService.getUserPurchaseHistory(currentUser.id);
            console.log('✅ [TokenWallet] Loaded', purchases.length, 'purchases');
            
            // Load game history
            const games = await UserService.getUserGameHistory(currentUser.id);
            console.log('✅ [TokenWallet] Loaded', games.length, 'games');
          } else {
            console.log('🔍 No user profile found, creating basic user...');
            // Create a basic user if logged in but no profile
            const basicUser = {
              id: 'user_' + Date.now(),
              username: 'User',
              firstName: 'User',
              lastName: '',
              email: 'user@dropdollar.com'
            };
            
            const profile = await UserService.getOrCreateUser(basicUser);
            setUserProfile(profile);
            setIsLoggedIn(true);
          }
        } else {
          console.log('🔍 No user logged in');
          setIsLoggedIn(false);
          setUserProfile(null);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('🔍 Error checking authentication:', error);
        setIsLoggedIn(false);
        setUserProfile(null);
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  const handlePaymentSuccess = async (paymentIntent: any) => {
    if (!userProfile) return;
    
    try {
      console.log('💰 [TokenWallet] Payment successful! Processing token purchase...');
      console.log('💰 [TokenWallet] Payment Intent:', paymentIntent);
      
      const totalTokens = isCustomAmount ? parseInt(customAmount) : selectedPackage.tokens;
      const amountPaid = isCustomAmount ? parseInt(customAmount) * 100 : selectedPackage.price;
      
      console.log(`💰 [TokenWallet] Adding ${totalTokens} tokens to account...`);
      console.log(`💰 [TokenWallet] Amount paid: $${amountPaid / 100}`);
      
      // Step 1: Fetch fresh user data from Supabase
      const freshProfile = await UserService.getUserProfile(userProfile.id);
      const currentTokens = freshProfile ? freshProfile.tokens : userProfile.tokens;
      const newBalance = currentTokens + totalTokens;
      
      console.log(`💰 [TokenWallet] Current tokens in Supabase: ${currentTokens}`);
      console.log(`💰 [TokenWallet] New balance will be: ${newBalance} tokens`);
      
      // Step 2: Update tokens in Supabase
      console.log(`🔄 [TokenWallet] Updating tokens in Supabase: ${currentTokens} → ${newBalance}`);
      const updateResult = await UserService.updateUserTokens(userProfile.id, newBalance);
      console.log('✅ [TokenWallet] Tokens updated in Supabase:', updateResult);
      
      if (!updateResult) {
        throw new Error('Failed to update tokens in Supabase');
      }
      
      // Step 3: Add token transaction record
      const transactionResult = await UserService.addTokenTransaction({
        userId: userProfile.id,
        type: 'purchase',
        amount: totalTokens,
        description: `Purchased ${totalTokens} tokens via Stripe`,
        stripePaymentIntentId: paymentIntent.id,
        metadata: {
          payment_intent_id: paymentIntent.id,
          amount_paid: amountPaid / 100,
          timestamp: new Date().toISOString()
        }
      });
      console.log('✅ [TokenWallet] Transaction recorded:', transactionResult);
      
      // Step 4: Save purchase history
      const purchaseResult = await UserService.savePurchaseHistory({
        userId: userProfile.id,
        purchaseType: 'tokens',
        amount: amountPaid / 100,
        tokensPurchased: totalTokens,
        stripePaymentIntentId: paymentIntent.id,
        status: 'completed',
        description: `Purchased ${totalTokens} tokens`,
        metadata: {
          payment_intent_id: paymentIntent.id,
          tokens: totalTokens,
          price_per_token: 1,
          timestamp: new Date().toISOString()
        }
      });
      console.log('✅ [TokenWallet] Purchase history saved:', purchaseResult);
      
      // Step 5: Log activity for complete tracking
      await ActivityService.logActivity(userProfile.id, 'token_purchase', {
        tokens: totalTokens,
        amount: amountPaid / 100,
        payment_intent_id: paymentIntent.id,
        timestamp: new Date().toISOString()
      });
      console.log('✅ [TokenWallet] Activity logged');
      
      // Step 6: Fetch fresh profile with updated data
      const updatedProfile = await UserService.getUserProfile(userProfile.id);
      if (updatedProfile) {
        setUserProfile(updatedProfile);
        console.log('✅ [TokenWallet] User profile refreshed from Supabase');
        console.log('💰 [TokenWallet] Verified new balance:', updatedProfile.tokens);
        
        // Verify the update was successful
        if (updatedProfile.tokens !== newBalance) {
          console.error(`❌ [TokenWallet] Token mismatch! Expected ${newBalance}, got ${updatedProfile.tokens}`);
          throw new Error(`Token update verification failed. Expected ${newBalance}, got ${updatedProfile.tokens}`);
        } else {
          console.log('✅ [TokenWallet] Token balance verified successfully!');
        }
      } else {
        console.error('❌ [TokenWallet] Could not fetch updated profile');
        throw new Error('Failed to verify token update');
      }
      
      // Step 7: Reload transaction history
      const transactions = await UserService.getUserTokenTransactions(userProfile.id);
      setTokenTransactions(transactions);
      console.log('✅ [TokenWallet] Transaction history reloaded:', transactions.length, 'transactions');
      
      // Verify the new transaction exists
      const latestTransaction = transactions[0];
      if (latestTransaction && latestTransaction.stripePaymentIntentId === paymentIntent.id) {
        console.log('✅ [TokenWallet] Latest transaction verified:', latestTransaction);
      } else {
        console.warn('⚠️ [TokenWallet] Latest transaction not found in history');
      }
      
      // Step 8: Show success message
      setPaymentResult({
        success: true,
        message: `🎉 Successfully purchased ${totalTokens} tokens! Your new balance is ${newBalance} tokens.`
      });
      
      setShowCheckout(false);
      setActiveTab('wallet'); // Go back to wallet view after purchase
      
      // Step 9: Show coin drop animation and celebration
      setPurchasedTokens(totalTokens);
      setShowCoinDrop(false); // Reset first
      setShowCelebration(false);
      
      setTimeout(() => {
        console.log('💰 [TokenWallet] Starting coin drop animation...');
        setShowCoinDrop(true);
        
        // Start celebration shortly after coins start dropping
        setTimeout(() => {
          setShowCelebration(true);
        }, 500);
      }, 100);
      
      console.log('✅ [TokenWallet] Payment success handler completed!');
      console.log('💰 [TokenWallet] Final token balance:', newBalance);
    } catch (error) {
      console.error('❌ [TokenWallet] Error in handlePaymentSuccess:', error);
      
      // Try to recover by calling the manual credit endpoint
      console.log('🔄 [TokenWallet] Attempting automatic token credit recovery...');
      
      try {
        const creditResponse = await fetch('/api/payments/credit-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            userId: userProfile.id
          })
        });

        const creditResult = await creditResponse.json();
        
        if (creditResult.success) {
          console.log('✅ [TokenWallet] Token credit recovery successful!');
          
          // Refresh user profile
          const recoveredProfile = await UserService.getUserProfile(userProfile.id);
          if (recoveredProfile) {
            setUserProfile(recoveredProfile);
          }
          
          setPaymentResult({
            success: true,
            message: `🎉 Payment successful! ${creditResult.tokensAdded} tokens have been added to your account. New balance: ${creditResult.newBalance} tokens.`
          });
          
          // Show success animations
          setPurchasedTokens(creditResult.tokensAdded);
          setShowCoinDrop(true);
          setTimeout(() => setShowCelebration(true), 500);
          
          setShowCheckout(false);
          setActiveTab('wallet');
          
          // Reload transaction history
          const transactions = await UserService.getUserTokenTransactions(userProfile.id);
          setTokenTransactions(transactions);
          
          return;
        }
      } catch (recoveryError) {
        console.error('❌ [TokenWallet] Token credit recovery failed:', recoveryError);
      }
      
      // If recovery failed, show error with payment ID
      setPaymentResult({
        success: false,
        message: `⚠️ Payment succeeded but token update failed. Your payment has been processed successfully. Please contact support with payment ID: ${paymentIntent.id} to have your tokens credited manually. We apologize for the inconvenience.`
      });
    }
  };

  const getCurrentPackage = () => {
    if (isCustomAmount && customAmount) {
      const tokens = parseInt(customAmount);
      const price = tokens * 100; // $1 per token in cents
      return {
        id: 'custom',
        tokens,
        price,
        bonus: 0,
        description: 'Custom amount',
        icon: '🎯'
      };
    }
    return selectedPackage;
  };

  const handleCustomAmountChange = (value: string) => {
    const numValue = parseInt(value);
    if (numValue >= 1) {
      setCustomAmount(value);
    } else if (value === '') {
      setCustomAmount('');
    }
  };

  const handlePaymentError = (error: string) => {
    setPaymentResult({
      success: false,
      message: `Payment failed: ${error}`
    });
    setShowCheckout(false);
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <img 
              src="/DropCoin.png" 
              alt="DropDollar Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Loading Token Wallet...</h2>
          <p className="text-gray-300">Verifying your account...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center bg-gray-800 rounded-2xl p-10 shadow-2xl border border-gray-700 max-w-md mx-auto">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Sign In Required</h2>
          <p className="text-gray-300 mb-8">
            Please sign in to access your token wallet and purchase DropTokens.
          </p>
          <Link
            href="/auth/login"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center space-x-2"
          >
            <UserIcon className="h-6 w-6" />
            <span>Sign In Now</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Coin Drop Animation */}
      <CoinDropAnimation
        show={showCoinDrop}
        tokenCount={purchasedTokens}
        onComplete={() => setShowCoinDrop(false)}
        duration={3000}
      />
      
      {/* Celebration Effect for Token Purchase */}
      <CelebrationEffect 
        show={showCelebration} 
        message="Tokens Purchased!" 
        onComplete={() => setShowCelebration(false)}
        duration={3000}
      />
      
      {/* Clean Navigation */}
      <CleanNavigation variant="gradient" currentPage="/buy-tokens" />
      
      {/* User Info and Balance Banner - Only show if logged in */}
      {isLoggedIn && userProfile && (
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 shadow-lg border-b-2 border-green-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-6 w-6 text-white" />
                  <span className="text-lg font-bold text-white">Welcome, {userProfile.username}!</span>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
                <div className="flex items-center space-x-3">
                  <BanknotesIcon className="h-8 w-8 text-yellow-300" />
                  <div className="text-center sm:text-right">
                    <div className="text-sm text-green-200">Token Balance</div>
                    <div className="text-2xl font-bold text-white">{userProfile.tokens} Tokens</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-pulse">
              {activeTab === 'wallet' ? 'My Token Wallet' : activeTab === 'purchase' ? 'Buy DropTokens' : 'Transaction History'}
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-teal-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {activeTab === 'wallet' && 'Manage your DropTokens, view your balance, and track your activity.'}
            {activeTab === 'purchase' && 'Fuel your competitive spirit! Purchase DropTokens to enter competitions and unlock features.'}
            {activeTab === 'history' && 'Review your past token purchases and spending activities.'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center space-x-4 mb-12">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
              activeTab === 'wallet'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg scale-105'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <CurrencyDollarIcon className="h-6 w-6 inline-block mr-2" /> Wallet
          </button>
          <button
            onClick={() => setActiveTab('purchase')}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
              activeTab === 'purchase'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg scale-105'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <CreditCardIcon className="h-6 w-6 inline-block mr-2" /> Purchase
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 shadow-lg scale-105'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <ClockIcon className="h-6 w-6 inline-block mr-2" /> History
          </button>
        </div>

        {/* Wallet Tab Content */}
        {activeTab === 'wallet' && (
          <div className="max-w-3xl mx-auto bg-gray-800 rounded-2xl p-10 shadow-2xl border border-gray-700">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-4">Your DropToken Balance</h2>
              <div className="flex items-center justify-center space-x-4">
                <span className="text-6xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {showBalance ? userProfile.tokens : '••••'}
                </span>
                <span className="text-4xl font-bold text-gray-400">Tokens</span>
                <button onClick={() => setShowBalance(!showBalance)} className="text-gray-400 hover:text-white transition-colors">
                  {showBalance ? <EyeSlashIcon className="h-8 w-8" /> : <EyeIcon className="h-8 w-8" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <Link href="/dashboard" className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
                <UserIcon className="h-6 w-6" />
                <span>Go to Dashboard</span>
              </Link>
              <button
                onClick={() => setActiveTab('purchase')}
                className="bg-green-700 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <CreditCardIcon className="h-6 w-6" />
                <span>Buy More Tokens</span>
              </button>
            </div>
          </div>
        )}

        {/* Purchase Tab Content */}
        {activeTab === 'purchase' && (
          <>
            {paymentResult && (
              <div className={`mb-8 p-6 rounded-xl text-center ${
                paymentResult.success
                  ? 'bg-green-900 border-2 border-green-500'
                  : 'bg-red-900 border-2 border-red-500'
              }`}>
                <div className="flex items-center justify-center space-x-3">
                  {paymentResult.success ? (
                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                  ) : (
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                  )}
                  <p className={`text-lg font-semibold ${
                    paymentResult.success ? 'text-green-200' : 'text-red-200'
                  }`}>
                    {paymentResult.message}
                  </p>
                </div>
              </div>
            )}

            {/* Token Packages */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {tokenPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border-2 transition-all duration-300 hover:scale-105 cursor-pointer ${
                    selectedPackage.id === pkg.id && !isCustomAmount
                      ? 'border-green-500 shadow-2xl shadow-green-500/25'
                      : 'border-gray-600 hover:border-green-400'
                  } ${pkg.popular ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}`}
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setIsCustomAmount(false);
                  }}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <div className="text-4xl mb-4">{pkg.icon}</div>
                      <div className="text-4xl font-bold text-white mb-2">
                        {pkg.tokens} Tokens
                      </div>
                    <div className="text-3xl font-bold text-green-400 mb-4">
                      ${(pkg.price / 100).toFixed(2)}
                    </div>
                    <p className="text-gray-400 text-sm mb-6">{pkg.description}</p>
                  </div>
                </div>
              ))}

              {/* Custom Amount Option */}
              <div
                className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border-2 transition-all duration-300 hover:scale-105 cursor-pointer ${
                  isCustomAmount
                    ? 'border-blue-500 shadow-2xl shadow-blue-500/25'
                    : 'border-gray-600 hover:border-blue-400'
                }`}
                onClick={() => setIsCustomAmount(true)}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">🎯</div>
                  <div className="text-4xl font-bold text-white mb-2">
                    Custom Amount
                  </div>
                  <div className="text-3xl font-bold text-blue-400 mb-4">
                    $1.00+ per Token
                  </div>
                  <p className="text-gray-400 text-sm mb-6">Choose your own amount</p>
                  
                  {isCustomAmount && (
                    <div className="mt-4">
                      <input
                        type="number"
                        min="1"
                        value={customAmount}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        placeholder="Enter tokens"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl font-bold"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {customAmount && parseInt(customAmount) >= 1 && (
                        <div className="mt-3 text-lg font-bold text-blue-400">
                          ${(parseInt(customAmount) * 1).toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 text-sm text-gray-300 mt-4">
                    <div className="flex justify-between">
                      <span>Price per Token:</span>
                      <span>$1.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minimum:</span>
                      <span>1 Token</span>
                    </div>
                    <div className="flex justify-between font-semibold text-white border-t border-gray-600 pt-2">
                      <span>No Bonus:</span>
                      <span>Standard Rate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkout Section */}
            {showCheckout ? (
              <div className="max-w-2xl mx-auto">
                <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-4">Complete Your Purchase</h2>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-400 mb-2">
                        {getCurrentPackage().tokens} Tokens
                      </div>
                      <div className="text-xl text-white">
                        ${(getCurrentPackage().price / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <Elements stripe={stripePromise}>
                    <MinimalCheckout
                      selectedPackage={getCurrentPackage()}
                      userProfile={userProfile}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </Elements>

                  <button
                    onClick={() => setShowCheckout(false)}
                    className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <button
                  onClick={() => {
                    if (isCustomAmount && (!customAmount || parseInt(customAmount) < 1)) {
                      alert('Please enter a valid amount (1 or more tokens)');
                      return;
                    }
                    setShowCheckout(true);
                  }}
                  disabled={isCustomAmount && (!customAmount || parseInt(customAmount) < 1)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-12 py-6 rounded-xl font-bold text-xl shadow-lg hover:shadow-2xl hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-300 inline-flex items-center space-x-3"
                >
                  <CreditCardIcon className="h-8 w-8" />
                  <span>Purchase {getCurrentPackage().tokens} Tokens</span>
                  <span className="text-green-200">${(getCurrentPackage().price / 100).toFixed(2)}</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* History Tab Content */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto bg-gray-800 rounded-2xl p-10 shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Your Transaction History</h2>
            {tokenTransactions.length === 0 ? (
              <div className="text-center text-gray-400 text-lg">
                No transactions yet. Purchase some tokens to get started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {tokenTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(transaction.created_at!).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.type === 'purchase' ? 'bg-green-100 text-green-800' :
                            transaction.type === 'win' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {transaction.amount} Tokens
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {transaction.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}