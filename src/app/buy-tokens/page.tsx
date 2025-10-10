'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CreditCardIcon, 
  CurrencyDollarIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import StripePaymentService from '@/lib/payments/stripeService';
import { UserService, UserProfile } from '@/lib/supabase/userService';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface TokenPackage {
  id: string;
  tokens: number;
  price: number; // in cents
  bonus: number;
  popular?: boolean;
  description: string;
}

const tokenPackages: TokenPackage[] = [
  {
    id: 'starter',
    tokens: 10,
    price: 1000, // $10.00
    bonus: 0,
    description: 'Perfect for trying out games'
  },
  {
    id: 'popular',
    tokens: 50,
    price: 4500, // $45.00 (10% bonus)
    bonus: 5,
    popular: true,
    description: 'Most popular choice'
  },
  {
    id: 'pro',
    tokens: 100,
    price: 8500, // $85.00 (15% bonus)
    bonus: 15,
    description: 'Great for regular players'
  },
  {
    id: 'champion',
    tokens: 250,
    price: 20000, // $200.00 (20% bonus)
    bonus: 50,
    description: 'For serious competitors'
  },
  {
    id: 'elite',
    tokens: 500,
    price: 37500, // $375.00 (25% bonus)
    bonus: 125,
    description: 'Maximum value package'
  }
];

function CheckoutForm({ selectedPackage, onSuccess, onError }: {
  selectedPackage: TokenPackage;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}) {
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
      // Get current user info
      const getUserInfo = () => {
        try {
          // First check if user is logged in
          const isLoggedIn = localStorage.getItem('isLoggedIn');
          if (isLoggedIn === 'true') {
            let userData = localStorage.getItem('user');
            
            // If not in localStorage, try to get from cookies
            if (!userData) {
              const cookies = document.cookie.split(';');
              const userCookie = cookies.find(cookie => cookie.trim().startsWith('dropdollar_user='));
              if (userCookie) {
                const cookieValue = userCookie.split('=')[1];
                userData = decodeURIComponent(cookieValue);
              }
            }
            
            if (userData) {
              return JSON.parse(userData);
            } else {
              // User is logged in but no data found, create basic user
              return {
                id: 'user_' + Date.now(),
                username: 'User',
                firstName: 'User',
                lastName: '',
                email: 'user@dropdollar.com'
              };
            }
          }
        } catch (error) {
          console.log('Error getting user info:', error);
        }
        
        return { id: 'anonymous', username: 'Guest' };
      };
      
      const user = getUserInfo();
      
      // Create payment intent
      const paymentIntent = await StripePaymentService.createPaymentIntent(
        selectedPackage.price,
        'usd',
        {
          userId: user.id || user.username || 'anonymous',
          type: 'tokens',
          gameType: 'token_purchase'
        }
      );

      // Confirm payment
      const { error, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              name: `${user.firstName || user.username} ${user.lastName || ''}`.trim(),
              email: user.email || '',
            },
          },
        }
      );

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (confirmedPayment?.status === 'succeeded') {
        onSuccess(confirmedPayment);
      }
    } catch (error: any) {
      onError(error.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Card Details
            </label>
            <div className="bg-white rounded-lg p-4">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100 flex items-center justify-center space-x-2"
      >
        {isProcessing ? (
          <>
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <CreditCardIcon className="h-5 w-5" />
            <span>Purchase {selectedPackage.tokens + selectedPackage.bonus} Tokens for ${(selectedPackage.price / 100).toFixed(2)}</span>
          </>
        )}
      </button>
    </form>
  );
}

export default function BuyTokensPage() {
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage>(tokenPackages[1]); // Default to popular
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string } | null>(null);
  const [userTokens, setUserTokens] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load user's current token balance and user info
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        console.log('💰 Buy Tokens: Checking authentication...');
        
        // Get current user using UserService
        const currentUser = UserService.getCurrentUser();
        
        if (currentUser) {
          console.log('💰 Buy Tokens: User found:', currentUser.username);
          
          // Get or create user profile in Supabase
          const profile = await UserService.getOrCreateUser(currentUser);
          setUserProfile(profile);
          setUserTokens(profile.tokens);
          setIsLoggedIn(true);
          
          console.log('💰 Buy Tokens: User profile loaded:', profile);
        } else {
          console.log('💰 Buy Tokens: No user logged in');
          setIsLoggedIn(false);
          setUserProfile(null);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('💰 Buy Tokens: Error checking authentication:', error);
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
    const newBalance = userTokens + totalTokens;
    
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
    setUserTokens(newBalance);
    setUserProfile(prev => prev ? { ...prev, tokens: newBalance } : null);
    
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
        description: 'Custom amount'
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
          <h2 className="text-2xl font-bold text-white mb-4">Loading Token Purchase...</h2>
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
                  💰 TOKEN PURCHASE CENTER 💰
                </span>
              </div>
            </Link>

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
                      <div className="text-sm text-green-200">Current Balance</div>
                      <div className="text-2xl font-bold text-white">{userTokens} Tokens</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-900/30 rounded-xl px-6 py-3 border border-blue-500/30">
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-6 w-6 text-blue-400" />
                  <div>
                    <div className="text-sm text-blue-200">Please sign in to purchase tokens</div>
                    <Link href="/auth/login" className="text-blue-300 hover:text-blue-200 font-medium">
                      Sign In →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-white hover:text-green-300 font-bold text-lg transition-all duration-300 hover:scale-105">Dashboard</Link>
              <Link href="/games" className="text-purple-300 hover:text-purple-200 font-bold text-lg transition-all duration-300 hover:scale-105">🎮 Games</Link>
              <Link href="/tournaments" className="text-yellow-300 hover:text-yellow-200 font-bold text-lg transition-all duration-300 hover:scale-105">🏆 Tournaments</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-pulse">
              💰 Buy DropTokens
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-teal-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Purchase DropTokens to participate in competitions, tournaments, and skill-based gaming. 
            Secure payments powered by Stripe.
          </p>
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
            {!paymentResult.success && (
              <div className="mt-4">
                <Link
                  href="/auth/login"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center space-x-2"
                >
                  <span>🔐</span>
                  <span>Sign In to Purchase Tokens</span>
                </Link>
              </div>
            )}
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
                
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>Base Tokens:</span>
                    <span>{pkg.tokens}</span>
                  </div>
                  {pkg.bonus > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Bonus:</span>
                      <span>+{pkg.bonus}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-white border-t border-gray-600 pt-2">
                    <span>Total:</span>
                    <span>{pkg.tokens + pkg.bonus}</span>
                  </div>
                </div>
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
            {isLoggedIn && userProfile && showCheckout ? (
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
            ) : isLoggedIn && userProfile ? (
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
            ) : (
              <div className="text-center">
                <div className="bg-blue-900/30 rounded-xl p-8 border border-blue-500/30">
                  <h3 className="text-2xl font-bold text-blue-300 mb-4">Sign In Required</h3>
                  <p className="text-blue-200 mb-6">
                    Please sign in to purchase tokens and access your account.
                  </p>
                  <Link
                    href="/auth/login"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center space-x-2"
                  >
                    <UserIcon className="h-6 w-6" />
                    <span>Sign In to Purchase Tokens</span>
                  </Link>
                </div>
              </div>
            )}

        {/* Security Notice */}
        <div className="mt-16 bg-blue-900/30 rounded-xl p-8 border border-blue-500/30">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-blue-400" />
            <h3 className="text-2xl font-bold text-blue-200">Secure Payment Processing</h3>
          </div>
          <p className="text-blue-300 text-center max-w-3xl mx-auto">
            All payments are processed securely through Stripe. Your payment information is encrypted and never stored on our servers. 
            We support all major credit cards and digital wallets.
          </p>
        </div>
      </main>
    </div>
  );
}