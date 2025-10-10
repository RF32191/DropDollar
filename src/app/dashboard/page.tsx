'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { UserService, UserProfile, TokenTransaction, WithdrawalRequest } from '@/lib/supabase/userService';
import { 
  TrophyIcon, 
  StarIcon, 
  HeartIcon,
  XMarkIcon,
  CheckIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface BankAccount {
  id: string;
  accountId: string;
  bankName: string;
  accountType: string;
  last4: string;
  isVerified: boolean;
  isOnboarded: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  country: string;
  email: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
}

export default function SimpleDashboard() {
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [testimonialData, setTestimonialData] = useState({
    title: '',
    story: '',
    gameType: '',
    prizeWon: '',
    rating: 5
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [tokenTransactions, setTokenTransactions] = useState<TokenTransaction[]>([]);
  const [showBankLinking, setShowBankLinking] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get current user using UserService
        const currentUser = UserService.getCurrentUser();
        
        if (currentUser) {
          // Get or create user profile in Supabase
          const profile = await UserService.getOrCreateUser(currentUser);
          setUserProfile(profile);
          
          // Load token transactions
          const transactions = await UserService.getUserTokenTransactions(profile.id);
          setTokenTransactions(transactions);
          
          // Load withdrawal requests
          const withdrawals = await UserService.getUserWithdrawalRequests(profile.id);
          setWithdrawalRequests(withdrawals);
          
          console.log('Dashboard: User profile loaded:', profile);
        } else {
          console.log('Dashboard: No user logged in');
          // Redirect to login if no user
          window.location.href = '/auth/login';
        }
      } catch (error) {
        console.error('Dashboard: Error loading user data:', error);
        // Redirect to login on error
        window.location.href = '/auth/login';
      }
    };

    loadUserData();
  }, []);

  const handleTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testimonialData.title || !testimonialData.story || !testimonialData.gameType || !testimonialData.prizeWon) {
      alert('Please fill in all fields');
      return;
    }

    if (!userProfile) {
      alert('Please log in to submit a testimonial');
      return;
    }

    try {
      // Create testimonial object
      const testimonial = {
        id: Date.now().toString(),
        username: userProfile.username,
        ...testimonialData,
        createdAt: new Date().toISOString()
      };

      // Save to localStorage for now (can be moved to Supabase later)
      const existingTestimonials = localStorage.getItem('victoryTestimonials');
      const testimonials = existingTestimonials ? JSON.parse(existingTestimonials) : [];
      testimonials.push(testimonial);
      localStorage.setItem('victoryTestimonials', JSON.stringify(testimonials));
      
      // Reset form
      setTestimonialData({
        title: '',
        story: '',
        gameType: '',
        prizeWon: '',
        rating: 5
      });
      setShowTestimonialForm(false);
      
      alert('Victory story submitted successfully!');
    } catch (error) {
      console.error('Error saving testimonial:', error);
      alert('Error saving testimonial. Please try again.');
    }
  };

  const handleBankAccountLink = async () => {
    try {
      if (!userProfile) {
        alert('Please log in to link a bank account');
        return;
      }
      
      // Create Stripe Connect account
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userProfile.id,
          email: userProfile.email,
          country: 'US'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe Connect account');
      }

      const { accountId, onboardingUrl } = await response.json();
      
      // Store account ID for later use
      const newAccount: BankAccount = {
        id: Date.now().toString(),
        accountId: accountId,
        bankName: 'Pending Setup',
        accountType: 'Checking',
        last4: '****',
        isVerified: false,
        isOnboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        country: 'US',
        email: userProfile.email
      };
      
      const updatedAccounts = [...bankAccounts, newAccount];
      setBankAccounts(updatedAccounts);
      localStorage.setItem('userBankAccounts', JSON.stringify(updatedAccounts));
      setShowBankLinking(false);
      
      // Redirect to Stripe Connect onboarding
      window.location.href = onboardingUrl;
      
    } catch (error) {
      console.error('Error linking bank account:', error);
      alert('Failed to link bank account. Please try again.');
    }
  };

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) {
      alert('Please log in to request a withdrawal');
      return;
    }
    
    const amount = parseFloat(withdrawalAmount);
    if (amount <= 0 || amount > userProfile.balance) {
      alert('Invalid withdrawal amount');
      return;
    }
    
    if (bankAccounts.length === 0) {
      alert('Please link a bank account first');
      return;
    }
    
    // Find a verified bank account
    const verifiedAccount = bankAccounts.find(account => account.isOnboarded && account.payoutsEnabled);
    if (!verifiedAccount) {
      alert('Please complete bank account verification first');
      return;
    }
    
    try {
      // Create Stripe payout
      const response = await fetch('/api/stripe/connect/create-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: verifiedAccount.accountId,
          amount: amount,
          currency: 'usd'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payout');
      }

      const payoutData = await response.json();
      
      const withdrawal: WithdrawalRequest = {
        id: payoutData.payoutId,
        userId: userProfile.id,
        amount,
        status: payoutData.status === 'paid' ? 'completed' : 'processing',
        stripeAccountId: verifiedAccount.accountId,
        payoutId: payoutData.payoutId,
        requestedAt: new Date().toISOString(),
        completedAt: payoutData.status === 'paid' ? new Date().toISOString() : undefined
      };
      
      // Save to Supabase
      await UserService.addWithdrawalRequest(withdrawal);
      
      // Update local state
      const updatedWithdrawals = [...withdrawalRequests, withdrawal];
      setWithdrawalRequests(updatedWithdrawals);
      
      // Update user balance in Supabase
      const newBalance = userProfile.balance - amount;
      await UserService.updateUserBalance(userProfile.id, newBalance);
      
      // Update local profile
      setUserProfile(prev => prev ? { ...prev, balance: newBalance } : null);
      
      setWithdrawalAmount('');
      setShowWithdrawalForm(false);
      
      alert(`Withdrawal ${payoutData.status === 'paid' ? 'completed' : 'processing'} for $${amount.toFixed(2)}`);
      
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      alert('Failed to process withdrawal. Please try again.');
    }
  };

  const renderStars = (rating: number, onRatingChange?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => onRatingChange && onRatingChange(i + 1)}
        className={`h-6 w-6 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
        } ${onRatingChange ? 'hover:text-yellow-300 cursor-pointer' : ''}`}
      >
        <StarIcon className="h-full w-full" />
      </button>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 shadow-2xl border-b-4 border-amber-400">
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
                <span className="text-sm text-yellow-200 font-bold tracking-wider animate-pulse">
                  ⚡ PROFESSIONAL GAMING MARKETPLACE ⚡
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-8">
              <Link href="/listings" className="text-white hover:text-yellow-300 font-bold text-lg transition-all duration-300 hover:scale-105">Browse</Link>
              <Link href="/games" className="text-purple-300 hover:text-purple-200 font-bold text-lg transition-all duration-300 hover:scale-105">🎮 Games</Link>
              <Link href="/tournaments" className="text-yellow-300 hover:text-yellow-200 font-bold text-lg transition-all duration-300 hover:scale-105">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-red-300 hover:text-red-200 font-bold text-lg transition-all duration-300 hover:scale-105">🔥 Hot Sell</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-pulse">
              🎯 Dashboard
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-teal-500 mx-auto rounded-full animate-pulse mb-6"></div>
              <p className="text-xl text-transparent bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text animate-pulse">
                Welcome to your DropDollar dashboard, {userProfile?.username}!
              </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Token Balance */}
          <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-8 rounded-2xl border-2 border-purple-400 hover:border-purple-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">🎮 DropTokens</h3>
              <BanknotesIcon className="h-8 w-8 text-purple-300" />
            </div>
                <div className="text-4xl font-bold text-white mb-4">{userProfile?.tokens || 0}</div>
            <p className="text-purple-200 mb-6">Available for gaming competitions</p>
            <Link href="/buy-tokens" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 inline-block">
              Buy More Tokens
            </Link>
          </div>

          {/* Cash Balance */}
          <div className="bg-gradient-to-br from-green-800 to-emerald-800 p-8 rounded-2xl border-2 border-green-400 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">💰 Cash Balance</h3>
              <CreditCardIcon className="h-8 w-8 text-green-300" />
            </div>
                <div className="text-4xl font-bold text-white mb-4">${(userProfile?.balance || 0).toFixed(2)}</div>
            <p className="text-green-200 mb-6">Available for withdrawal</p>
            <button 
              onClick={() => setShowWithdrawalForm(true)}
              disabled={(userProfile?.balance || 0) <= 0 || bankAccounts.length === 0}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed inline-block"
            >
              Request Withdrawal
            </button>
          </div>

          {/* Bank Accounts */}
          <div className="bg-gradient-to-br from-blue-800 to-indigo-800 p-8 rounded-2xl border-2 border-blue-400 hover:border-blue-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">🏦 Bank Accounts</h3>
              <ShieldCheckIcon className="h-8 w-8 text-blue-300" />
            </div>
            <div className="text-4xl font-bold text-white mb-4">{bankAccounts.length}</div>
            <p className="text-blue-200 mb-6">Linked for withdrawals</p>
            <button 
              onClick={() => setShowBankLinking(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 inline-block"
            >
              Link Bank Account
            </button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Games Card */}
          <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-8 rounded-2xl border-2 border-purple-400 hover:border-purple-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6">🎮 Play Games</h3>
            <p className="text-purple-200 mb-8 text-lg">Compete in tournaments and win prizes with our secure gaming platform</p>
            <Link href="/games" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
              Start Playing
            </Link>
          </div>

          {/* Tournaments Card */}
          <div className="bg-gradient-to-br from-yellow-800 to-orange-800 p-8 rounded-2xl border-2 border-yellow-400 hover:border-yellow-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6">🏆 Tournaments</h3>
            <p className="text-yellow-200 mb-8 text-lg">Join competitive tournaments with real-time leaderboards</p>
            <Link href="/tournaments" className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
              View Tournaments
            </Link>
          </div>

          {/* Hot Sell Card */}
          <div className="bg-gradient-to-br from-red-800 to-pink-800 p-8 rounded-2xl border-2 border-red-400 hover:border-red-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6">🔥 Hot Sell</h3>
            <p className="text-red-200 mb-8 text-lg">Fast-paced cash competitions with real money prizes</p>
            <Link href="/hot-sell" className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
              Enter Hot Sell
            </Link>
          </div>
        </div>

        {/* Bank Account Linking Modal */}
        {showBankLinking && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Link Bank Account</h3>
                <button
                  onClick={() => setShowBankLinking(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-blue-900/30 rounded-lg p-4 mb-4">
                  <ShieldCheckIcon className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-200 text-sm">
                    Bank account linking is powered by Stripe Connect for secure withdrawals.
                  </p>
                </div>
                <p className="text-gray-300 text-sm">
                  In a production environment, this would integrate with Stripe Connect to securely link your bank account for withdrawals.
                </p>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={handleBankAccountLink}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Link Account
                </button>
                <button
                  onClick={() => setShowBankLinking(false)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Request Modal */}
        {showWithdrawalForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Request Withdrawal</h3>
                <button
                  onClick={() => setShowWithdrawalForm(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-6">
                    <div className="bg-green-900/30 rounded-lg p-4 mb-4">
                      <div className="text-green-400 font-bold text-lg">Available Balance: ${(userProfile?.balance || 0).toFixed(2)}</div>
                    </div>
                
                <form onSubmit={handleWithdrawalRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Withdrawal Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                          max={userProfile?.balance || 0}
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5 inline mr-2" />
                      Request Withdrawal
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWithdrawalForm(false)}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Bank Accounts List */}
        {bankAccounts.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Linked Bank Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bankAccounts.map((account) => (
                <div key={account.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{account.bankName}</h3>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      account.isVerified 
                        ? 'bg-green-900 text-green-200' 
                        : 'bg-yellow-900 text-yellow-200'
                    }`}>
                      {account.isVerified ? 'Verified' : 'Pending'}
                    </div>
                  </div>
                  <div className="text-gray-300">
                    <div className="mb-2">{account.accountType} Account</div>
                    <div className="text-sm">**** **** **** {account.last4}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdrawal History */}
        {withdrawalRequests.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Withdrawal History</h2>
            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-white font-semibold">Amount</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Requested</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalRequests.map((withdrawal) => (
                      <tr key={withdrawal.id} className="border-t border-gray-700">
                        <td className="px-6 py-4 text-white font-semibold">${withdrawal.amount.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            withdrawal.status === 'completed' ? 'bg-green-900 text-green-200' :
                            withdrawal.status === 'processing' ? 'bg-blue-900 text-blue-200' :
                            withdrawal.status === 'failed' ? 'bg-red-900 text-red-200' :
                            'bg-yellow-900 text-yellow-200'
                          }`}>
                            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {new Date(withdrawal.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {withdrawal.completedAt ? new Date(withdrawal.completedAt).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Victory Story Section */}
        <div className="mt-16 text-center">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text mb-8">
            🏆 Share Your Victory Story
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Won a game? Got a prize? Tell us about your success and inspire other players!
          </p>
          
          {!showTestimonialForm ? (
            <button
              onClick={() => setShowTestimonialForm(true)}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center"
            >
              <TrophyIcon className="h-6 w-6 mr-2" />
              Write Victory Story
            </button>
          ) : (
            <div className="max-w-2xl mx-auto bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Your Victory Story</h3>
                <button
                  onClick={() => setShowTestimonialForm(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleTestimonialSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Story Title
                  </label>
                  <input
                    type="text"
                    value={testimonialData.title}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., 'My First Big Win!'"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Type
                  </label>
                  <select
                    value={testimonialData.gameType}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, gameType: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a game</option>
                    <option value="Multi-Target Reaction">Multi-Target Reaction</option>
                    <option value="Falling Object Catch">Falling Object Catch</option>
                    <option value="Color Sequence Memory">Color Sequence Memory</option>
                    <option value="Laser Dodge EXTREME">Laser Dodge EXTREME</option>
                    <option value="Quick Click">Quick Click</option>
                    <option value="Sword Parry">Sword Parry</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prize Won
                  </label>
                  <input
                    type="text"
                    value={testimonialData.prizeWon}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, prizeWon: e.target.value }))}
                    placeholder="e.g., '$100 Cash Prize' or 'iPhone 15'"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Story
                  </label>
                  <textarea
                    value={testimonialData.story}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, story: e.target.value }))}
                    placeholder="Tell us about your victory! How did you feel? What was the experience like?"
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rating
                  </label>
                  <div className="flex items-center space-x-2">
                    {renderStars(testimonialData.rating, (rating) => setTestimonialData(prev => ({ ...prev, rating })))}
                    <span className="text-gray-400 ml-2">{testimonialData.rating}/5</span>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <CheckIcon className="h-5 w-5 inline mr-2" />
                    Submit Story
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTestimonialForm(false)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="mt-8">
            <Link
              href="/testimonials"
              className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
            >
              View All Victory Stories →
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-16 text-center">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text mb-8">
            Quick Actions
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/listings" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Browse Listings
            </Link>
            <Link href="/hot-sell" className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Hot Sell
            </Link>
            <Link href="/categories" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Categories
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}