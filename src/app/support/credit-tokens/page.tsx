'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserService, UserProfile } from '@/lib/supabase/userService';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function CreditTokensPage() {
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const profile = await UserService.getOrCreateUser({
            id: userData.id || userData.sessionId,
            username: userData.username || 'User',
            firstName: userData.firstName || userData.username || 'User',
            lastName: userData.lastName || '',
            email: userData.email || 'user@dropdollar.com'
          });
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentIntentId.trim()) {
      setResult({ success: false, message: 'Please enter a payment ID' });
      return;
    }

    if (!userProfile) {
      setResult({ success: false, message: 'Please sign in to credit tokens' });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/payments/credit-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId.trim(),
          userId: userProfile.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: data.alreadyProcessed 
            ? `✅ Tokens were already credited for this payment. Your current balance is ${data.currentBalance} tokens.`
            : `🎉 Success! ${data.tokensAdded} tokens have been credited to your account. Your new balance is ${data.newBalance} tokens.`
        });
        
        // Reload user profile to show updated balance
        const updatedProfile = await UserService.getUserProfile(userProfile.id);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
        
        // Clear the input
        setPaymentIntentId('');
      } else {
        setResult({
          success: false,
          message: `❌ Failed to credit tokens: ${data.error || 'Unknown error'}`
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `❌ Error: ${error.message || 'Failed to process request'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <CleanNavigation variant="gradient" currentPage="/support/credit-tokens" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              💰 Credit Missing Tokens
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            If your payment succeeded but tokens weren't added, use this tool to credit them manually.
          </p>
        </div>

        {/* User Info */}
        {userProfile && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8 border-2 border-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Logged in as:</p>
                <p className="text-2xl font-bold text-white">{userProfile.username}</p>
              </div>
              <div className="text-right">
                <p className="text-green-200">Current Balance:</p>
                <p className="text-3xl font-bold text-yellow-300">{userProfile.tokens} Tokens</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">📋 Instructions</h2>
          <ol className="space-y-3 text-gray-300">
            <li className="flex items-start">
              <span className="font-bold text-blue-400 mr-3">1.</span>
              <span>Find your payment ID from the error message or your email receipt</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-400 mr-3">2.</span>
              <span>Payment IDs start with "pi_" followed by a long string</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-400 mr-3">3.</span>
              <span>Enter the payment ID below and click "Credit Tokens"</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-400 mr-3">4.</span>
              <span>The system will verify the payment and credit your tokens</span>
            </li>
          </ol>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="paymentId" className="block text-lg font-medium text-white mb-2">
                Payment ID (starts with "pi_")
              </label>
              <input
                type="text"
                id="paymentId"
                value={paymentIntentId}
                onChange={(e) => setPaymentIntentId(e.target.value)}
                placeholder="pi_3SH0MrJg3uAQc32S0j5xnxeP"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isProcessing}
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing || !userProfile}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 shadow-lg"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <ArrowPathIcon className="animate-spin h-5 w-5 mr-3" />
                  Processing...
                </span>
              ) : (
                '💰 Credit Tokens'
              )}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-900 border border-green-600' : 'bg-red-900 border border-red-600'}`}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3 flex-shrink-0" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-red-400 mr-3 flex-shrink-0" />
                )}
                <p className={`text-lg ${result.success ? 'text-green-100' : 'text-red-100'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-900 bg-opacity-50 rounded-xl p-6 border border-blue-700">
          <h3 className="text-xl font-bold text-white mb-3">Need more help?</h3>
          <p className="text-blue-200 mb-4">
            If you're still having issues or can't find your payment ID, please contact our support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 hover:scale-105 text-center"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/buy-tokens"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 hover:scale-105 text-center"
            >
              Buy More Tokens
            </Link>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>🔒 Your payment information is secure. This tool only credits tokens for verified payments.</p>
          <p className="mt-2">All transactions are logged and can be reviewed in your transaction history.</p>
        </div>
      </main>
    </div>
  );
}

