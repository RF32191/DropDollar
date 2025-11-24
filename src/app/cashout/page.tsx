'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import W9OnboardingModal from '@/components/tax/W9OnboardingModal';
import { 
  BanknotesIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

const supabase = createClientComponentClient();

export default function CashoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isTaxVerified, setIsTaxVerified] = useState(false);
  const [showW9Modal, setShowW9Modal] = useState(false);
  const [wonTokens, setWonTokens] = useState(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      checkTaxStatus();
      loadBalance();
    }
  }, [user]);

  const loadBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('won_tokens')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setWonTokens(data?.won_tokens || 0);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const checkTaxStatus = async () => {
    setLoading(true);
    try {
      // Check if user has completed W-9
      const { data, error } = await supabase
        .from('users')
        .select('is_tax_verified')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setIsTaxVerified(data?.is_tax_verified || false);
      
      // If not verified, show W-9 modal automatically
      if (!data?.is_tax_verified) {
        setShowW9Modal(true);
      }
    } catch (error) {
      console.error('Error checking tax status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);

    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    if (amount > wonTokens) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }

    if (amount < 25) {
      setMessage({ type: 'error', text: 'Minimum withdrawal is $25.00' });
      return;
    }

    if (!isTaxVerified) {
      setMessage({ type: 'error', text: 'Please complete your W-9 form first' });
      setShowW9Modal(true);
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: 'Please log in first' });
        return;
      }

      // Call withdrawal request API
      const response = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount_cents: Math.round(amount * 100),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Withdrawal request failed');
      }

      if (result.requiresTaxInfo) {
        setMessage({ 
          type: 'error', 
          text: 'Tax information required. Please complete your W-9 form.' 
        });
        setShowW9Modal(true);
        return;
      }

      setMessage({ 
        type: 'success', 
        text: 'Withdrawal request submitted successfully! Processing within 2-7 business days.' 
      });
      setWithdrawalAmount('');
      loadBalance();
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to process withdrawal' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleW9Complete = () => {
    setShowW9Modal(false);
    setIsTaxVerified(true);
    setMessage({
      type: 'success',
      text: '✅ Tax information verified! You can now withdraw your winnings.'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <BanknotesIcon className="w-20 h-20 mx-auto text-green-400 mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Cash Out Winnings</h1>
          <p className="text-gray-400">Withdraw your winnings to your bank account</p>
        </div>

        {/* Tax Verification Status */}
        <div className={`mb-8 p-6 rounded-xl border-2 ${
          isTaxVerified 
            ? 'bg-green-500/10 border-green-500/50' 
            : 'bg-yellow-500/10 border-yellow-500/50'
        }`}>
          <div className="flex items-start gap-4">
            {isTaxVerified ? (
              <ShieldCheckIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
            ) : (
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className={`text-lg font-bold mb-2 ${
                isTaxVerified ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {isTaxVerified ? '✅ Tax Information Verified' : '⚠️ Tax Information Required'}
              </h3>
              <p className="text-gray-300 mb-3">
                {isTaxVerified 
                  ? 'Your W-9 tax information is on file. You can withdraw your winnings.' 
                  : 'US law requires tax information (W-9) before withdrawing winnings of $600+ per year. We collect this upfront to stay compliant.'}
              </p>
              {!isTaxVerified && (
                <button
                  onClick={() => setShowW9Modal(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-6 rounded-lg transition-all"
                >
                  <DocumentTextIcon className="w-5 h-5 inline mr-2" />
                  Complete W-9 Form
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700 mb-8">
          <div className="text-center">
            <p className="text-gray-400 mb-2">Available to Withdraw</p>
            <div className="text-6xl font-bold text-green-400 mb-2">
              ${wonTokens.toFixed(2)}
            </div>
            <p className="text-sm text-gray-500">From game winnings</p>
          </div>
        </div>

        {/* Withdrawal Form */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Request Withdrawal</h2>

          {message && (
            <div className={`mb-6 p-4 rounded-lg border-2 ${
              message.type === 'success' 
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : message.type === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 font-semibold mb-2">
                Withdrawal Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">$</span>
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="25.00"
                  min="25"
                  max={wonTokens}
                  step="0.01"
                  disabled={!isTaxVerified || isProcessing}
                  className="w-full pl-8 pr-4 py-4 bg-gray-900 border border-gray-600 rounded-lg text-white text-xl focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Minimum: $25.00 • Maximum: ${wonTokens.toFixed(2)}
              </p>
            </div>

            <button
              onClick={handleWithdrawal}
              disabled={!isTaxVerified || isProcessing || !withdrawalAmount}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? (
                <>Processing...</>
              ) : !isTaxVerified ? (
                <>🔒 Complete W-9 First</>
              ) : (
                <>💰 Request Withdrawal</>
              )}
            </button>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-bold mb-2">📋 Processing Information</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Withdrawals process within 2-7 business days</li>
                <li>• Funds will be transferred to your linked bank account</li>
                <li>• You'll receive a confirmation email when processed</li>
                <li>• 1099 tax forms issued annually for earnings $600+</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* W-9 Modal */}
      {showW9Modal && (
        <W9OnboardingModal
          isOpen={showW9Modal}
          onClose={() => setShowW9Modal(false)}
          onComplete={handleW9Complete}
        />
      )}
    </div>
  );
}

