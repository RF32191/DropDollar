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

interface TaxProfile {
  id: string;
  full_name: string;
  total_withdrawals_ytd: number;
  withdrawal_year: number;
}

export default function CashoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isTaxVerified, setIsTaxVerified] = useState(false);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
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
      // Check if user has a W-9 on file (tax_profiles record)
      const { data: taxData, error: taxError } = await supabase
        .from('tax_profiles')
        .select('id, full_name, total_withdrawals_ytd, withdrawal_year')
        .eq('user_id', user?.id)
        .single();

      if (!taxError && taxData) {
        // User has W-9 on file
        setIsTaxVerified(true);
        setTaxProfile(taxData);
      } else {
        // No W-9 on file, check legacy is_tax_verified flag
        const { data: userData } = await supabase
          .from('users')
          .select('is_tax_verified')
          .eq('id', user?.id)
          .single();

        if (userData?.is_tax_verified) {
          setIsTaxVerified(true);
        } else {
          setIsTaxVerified(false);
          // Show W-9 modal for first-time users
          setShowW9Modal(true);
        }
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

      // Record withdrawal for tax purposes (1099 tracking)
      try {
        const { error: taxError } = await supabase.rpc('record_withdrawal_for_tax', {
          p_user_id: user?.id,
          p_amount: amount
        });
        
        if (taxError) {
          console.error('Tax tracking error (non-blocking):', taxError);
        } else {
          // Update local tax profile with new total
          if (taxProfile) {
            const currentYear = new Date().getFullYear();
            const newTotal = (taxProfile.withdrawal_year === currentYear ? taxProfile.total_withdrawals_ytd : 0) + amount;
            setTaxProfile({ ...taxProfile, total_withdrawals_ytd: newTotal, withdrawal_year: currentYear });
          }
        }
      } catch (taxErr) {
        console.error('Tax tracking exception (non-blocking):', taxErr);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Navigation Header */}
      <nav className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-white hover:text-green-400 transition-colors"
              >
                <span className="text-2xl">💰</span>
                <span className="text-xl font-bold">DropDollar</span>
              </button>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400">Cash Out</span>
            </div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="hidden md:flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
                    <span className="text-green-400">✅</span>
                    <span className="text-white font-medium">{user.email}</span>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/50 px-4 py-2 rounded-full">
                    <span className="text-green-400 font-bold">${wonTokens.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg transition-all"
                >
                  Sign In
                </button>
              )}
              
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-white px-3 py-2 rounded-lg transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-12 px-4">
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
                {isTaxVerified ? '✅ W-9 On File' : '⚠️ W-9 Required'}
              </h3>
              
              {isTaxVerified ? (
                <div className="space-y-3">
                  <p className="text-gray-300">
                    Your W-9 tax information is on file. You can withdraw your winnings.
                  </p>
                  
                  {/* W-9 Details */}
                  {taxProfile && (
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Name on W-9:</span>
                        <span className="text-white font-medium">{taxProfile.full_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">{new Date().getFullYear()} Withdrawals (YTD):</span>
                        <span className={`font-bold ${
                          (taxProfile.withdrawal_year === new Date().getFullYear() ? taxProfile.total_withdrawals_ytd : 0) >= 600 
                            ? 'text-yellow-400' 
                            : 'text-green-400'
                        }`}>
                          ${(taxProfile.withdrawal_year === new Date().getFullYear() ? taxProfile.total_withdrawals_ytd : 0).toFixed(2)}
                        </span>
                      </div>
                      {(taxProfile.withdrawal_year === new Date().getFullYear() ? taxProfile.total_withdrawals_ytd : 0) >= 600 && (
                        <p className="text-yellow-400 text-sm mt-2">
                          📋 You will receive a 1099-NEC for tax year {new Date().getFullYear()}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <p className="text-gray-500 text-sm">
                    Your W-9 is saved permanently. You only need to fill it out once.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-300 mb-3">
                    US law requires tax information (W-9) before withdrawing winnings. 
                    You only need to complete this form once.
                  </p>
                  <button
                    onClick={() => setShowW9Modal(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-6 rounded-lg transition-all"
                  >
                    <DocumentTextIcon className="w-5 h-5 inline mr-2" />
                    Complete W-9 Form (One-Time)
                  </button>
                </>
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
      </div>

      {/* W-9 Modal */}
      {showW9Modal && (
        <W9OnboardingModal
          isOpen={showW9Modal}
          onClose={() => setShowW9Modal(false)}
          onSuccess={handleW9Complete}
          walletBalance={wonTokens}
          withdrawalAmount={parseFloat(withdrawalAmount) || 0}
        />
      )}
    </div>
  );
}

