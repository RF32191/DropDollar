'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCardIcon, 
  CurrencyDollarIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  ChartBarIcon,
  ClockIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePaymentService from '@/lib/payments/stripeService';
import { UserService, UserProfile, TokenTransaction } from '@/lib/supabase/userService';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Debug Stripe configuration
console.log('🔧 ProfessionalTokenWallet Stripe Config:');
console.log('🔧 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.log('🔧 Stripe Promise:', !!stripePromise);

interface TokenPackage {
  id: string;
  tokens: number;
  price: number; // in cents
  bonus: number;
  description: string;
  popular?: boolean;
  icon: string;
}

const tokenPackages: TokenPackage[] = [
  { 
    id: 'starter', 
    tokens: 10, 
    price: 1000, 
    bonus: 0, 
    description: 'Perfect for new players',
    icon: '🎮'
  },
  { 
    id: 'popular', 
    tokens: 50, 
    price: 4500, 
    bonus: 5, 
    description: 'Most popular choice', 
    popular: true,
    icon: '⭐'
  },
  { 
    id: 'pro', 
    tokens: 100, 
    price: 8500, 
    bonus: 15, 
    description: 'For serious competitors',
    icon: '💪'
  },
  { 
    id: 'champion', 
    tokens: 250, 
    price: 20000, 
    bonus: 50, 
    description: 'Dominate the leaderboards',
    icon: '🏆'
  },
  { 
    id: 'elite', 
    tokens: 500, 
    price: 37500, 
    bonus: 125, 
    description: 'Ultimate gaming power',
    icon: '👑'
  },
];

interface CheckoutFormProps {
  selectedPackage: TokenPackage;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  userProfile: UserProfile;
}

function CheckoutForm({ selectedPackage, onSuccess, onError, userProfile }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const paymentIntent = await StripePaymentService.createPaymentIntent(
        selectedPackage.price,
        'usd',
        {
          userId: userProfile.id,
          type: 'tokens',
          gameType: 'token_purchase'
        }
      );

      // Real Stripe payment processing
      console.log('🔧 Processing real Stripe payment:', paymentIntent.id);

      // Confirm payment
      const { error, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
              email: userProfile.email,
            },
          },
        }
      );

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (confirmedPayment?.status === 'succeeded') {
        onSuccess(confirmedPayment);
      } else {
        onError('Payment not successful. Status: ' + confirmedPayment?.status);
      }
    } catch (error: any) {
      onError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-700 p-4 rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#fff',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#fa755a',
                iconColor: '#fa755a',
              },
            },
          }}
        />
      </div>
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <ArrowPathIcon className="h-6 w-6 animate-spin mr-2" />
        ) : (
          <CreditCardIcon className="h-6 w-6 mr-2" />
        )}
        {isProcessing ? 'Processing...' : `Pay $${(selectedPackage.price / 100).toFixed(2)}`}
      </button>
    </form>
  );
}

export default function ProfessionalTokenWallet() {
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage>(tokenPackages[1]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [tokenTransactions, setTokenTransactions] = useState<TokenTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'wallet' | 'purchase' | 'history'>('wallet');

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
            console.log('🔍 User found:', currentUser.username);
            
            // Get or create user profile in Supabase
            const profile = await UserService.getOrCreateUser(currentUser);
            setUserProfile(profile);
            setIsLoggedIn(true);
            
            // Load token transactions
            const transactions = await UserService.getUserTokenTransactions(profile.id);
            setTokenTransactions(transactions);
            
            console.log('🔍 User profile loaded:', profile);
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
    
    const totalTokens = isCustomAmount ? parseInt(customAmount) : (selectedPackage.tokens + selectedPackage.bonus);
    const newBalance = userProfile.tokens + totalTokens;
    
    // Update tokens in Supabase
    await UserService.updateUserTokens(userProfile.id, newBalance);
    
    // Add transaction record
    await UserService.addTokenTransaction({
      userId: userProfile.id,
      type: 'purchase',
      amount: totalTokens,
      description: `Purchased ${totalTokens} tokens via Stripe`
    });
    
    // Update local state
    setUserProfile(prev => prev ? { ...prev, tokens: newBalance } : null);
    
    // Reload transactions
    const transactions = await UserService.getUserTokenTransactions(userProfile.id);
    setTokenTransactions(transactions);
    
    setPaymentResult({
      success: true,
      message: `Successfully purchased ${totalTokens} tokens! Your new balance is ${newBalance} tokens.`
    });
    setShowCheckout(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 shadow-2xl border-b-4 border-green-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-4 group">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <img 
                  src="/DropCoin.png" 
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold text-white drop-shadow-lg">DropDollar</span>
                <span className="text-sm text-yellow-200 font-bold tracking-wider animate-pulse">
                  💰 PROFESSIONAL TOKEN WALLET 💰
                </span>
              </div>
            </div>

            {/* User Info and Balance */}
            {isLoggedIn && userProfile ? (
              <div className="flex items-center space-x-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl px-6 py-3 border border-blue-400">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-6 w-6 text-white" />
                    <span className="text-lg font-bold text-white">Welcome, {userProfile.username}!</span>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
                  <div className="flex items-center space-x-3">
                    <BanknotesIcon className="h-8 w-8 text-yellow-300" />
                    <div className="text-right">
                      <div className="text-sm text-green-200">Token Balance</div>
                      <div className="text-2xl font-bold text-white">
                        {showBalance ? `${userProfile.tokens} Tokens` : '••••••'}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      {showBalance ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-900/30 rounded-xl px-6 py-3 border border-red-500/30">
                <div className="flex items-center space-x-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                  <div>
                    <div className="text-sm text-red-200">Please sign in to access token wallet</div>
                    <a href="/auth/login" className="text-red-300 hover:text-red-200 font-medium">
                      Sign In →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-800 rounded-xl p-2 border border-gray-700">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('wallet')}
                className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
                  activeTab === 'wallet'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <BanknotesIcon className="h-5 w-5 inline mr-2" />
                Wallet
              </button>
              <button
                onClick={() => setActiveTab('purchase')}
                className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
                  activeTab === 'purchase'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <CreditCardIcon className="h-5 w-5 inline mr-2" />
                Purchase
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <ChartBarIcon className="h-5 w-5 inline mr-2" />
                History
              </button>
            </div>
          </div>
        </div>

        {/* Payment Result */}
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

        {/* Wallet Tab */}
        {activeTab === 'wallet' && isLoggedIn && userProfile && (
          <div className="text-center">
            <h1 className="text-6xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
                💰 Token Wallet
              </span>
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto rounded-full animate-pulse mb-8"></div>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-blue-800 to-purple-800 p-8 rounded-2xl border-2 border-blue-400 shadow-2xl">
                <div className="text-center">
                  <div className="text-6xl font-bold text-white mb-4">
                    {showBalance ? userProfile.tokens : '••••'}
                  </div>
                  <div className="text-xl text-blue-200 mb-6">DropTokens</div>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setShowBalance(!showBalance)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      {showBalance ? <EyeSlashIcon className="h-5 w-5 inline mr-2" /> : <EyeIcon className="h-5 w-5 inline mr-2" />}
                      {showBalance ? 'Hide' : 'Show'} Balance
                    </button>
                    <button
                      onClick={() => setActiveTab('purchase')}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <PlusIcon className="h-5 w-5 inline mr-2" />
                      Buy Tokens
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Tab */}
        {activeTab === 'purchase' && isLoggedIn && userProfile && (
          <div>
            <h1 className="text-6xl font-extrabold mb-6 text-center">
              <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-pulse">
                💳 Purchase Tokens
              </span>
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-teal-500 mx-auto rounded-full animate-pulse mb-8"></div>

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
                      {pkg.tokens + pkg.bonus} Tokens
                    </div>
                    {pkg.bonus > 0 && (
                      <div className="text-green-400 text-sm font-semibold mb-2">
                        +{pkg.bonus} Bonus Tokens
                      </div>
                    )}
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
                        {getCurrentPackage().tokens + getCurrentPackage().bonus} Tokens
                      </div>
                      <div className="text-xl text-white">
                        ${(getCurrentPackage().price / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <Elements stripe={stripePromise}>
                    <CheckoutForm
                      selectedPackage={getCurrentPackage()}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                      userProfile={userProfile}
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
                  <span>Purchase {getCurrentPackage().tokens + getCurrentPackage().bonus} Tokens</span>
                  <span className="text-green-200">${(getCurrentPackage().price / 100).toFixed(2)}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && isLoggedIn && userProfile && (
          <div>
            <h1 className="text-6xl font-extrabold mb-6 text-center">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-pulse">
                📊 Transaction History
              </span>
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto rounded-full animate-pulse mb-8"></div>

            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-white font-semibold">Type</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Amount</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Description</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t border-gray-700">
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            transaction.type === 'purchase' ? 'bg-green-900 text-green-200' :
                            transaction.type === 'spend' ? 'bg-red-900 text-red-200' :
                            transaction.type === 'earn' ? 'bg-blue-900 text-blue-200' :
                            'bg-yellow-900 text-yellow-200'
                          }`}>
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">
                          {transaction.type === 'purchase' || transaction.type === 'earn' ? '+' : '-'}{transaction.amount}
                        </td>
                        <td className="px-6 py-4 text-gray-300">{transaction.description}</td>
                        <td className="px-6 py-4 text-gray-300">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Not Logged In Message */}
        {!isLoggedIn && (
          <div className="text-center">
            <div className="bg-red-900/30 rounded-xl p-8 border border-red-500/30 max-w-2xl mx-auto">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-red-300 mb-4">Authentication Required</h2>
              <p className="text-red-200 mb-6 text-lg">
                Please sign in to access your token wallet and make purchases.
              </p>
              <a
                href="/auth/login"
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center space-x-2"
              >
                <UserIcon className="h-6 w-6" />
                <span>Sign In to Access Wallet</span>
              </a>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-16 bg-blue-900/30 rounded-xl p-8 border border-blue-500/30">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-blue-400" />
            <h3 className="text-2xl font-bold text-blue-300">Secure & Professional Token System</h3>
          </div>
          <p className="text-blue-200 text-center max-w-2xl mx-auto">
            All token purchases are processed securely through Stripe, with real-time balance updates and complete transaction history. Your tokens are safely stored and synchronized across all devices.
          </p>
        </div>
      </main>
    </div>
  );
}
