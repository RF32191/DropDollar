'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import W9OnboardingModal from '@/components/tax/W9OnboardingModal';
import { 
  BanknotesIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface StripeStatus {
  connected: boolean;
  accountId?: string;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
}

interface SellerWalletData {
  seller_id: string;
  stripe_account_id: string | null;
  stripe_account_status: string;
  stripe_onboarding_completed: boolean;
  stripe_payouts_enabled: boolean;
  wallet_balance: number;
  can_request_payout: boolean;
}

export default function StripeConnect() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [walletData, setWalletData] = useState<SellerWalletData | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  
  const [isTaxVerified, setIsTaxVerified] = useState(false);
  const [showW9Modal, setShowW9Modal] = useState(false);

  useEffect(() => {
    if (user) {
      loadWalletData();
      checkStripeStatus();
      checkTaxStatus();
    }
  }, [user]);

  const checkTaxStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_tax_verified')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setIsTaxVerified(data?.is_tax_verified || false);
    } catch (error) {
      console.error('Error checking tax status:', error);
    }
  };

  const loadWalletData = async () => {
    try {
      // Try new dual wallet RPC first
      const { data: dualWalletData, error: dualWalletError } = await supabase
        .rpc('get_seller_wallet');

      if (!dualWalletError && dualWalletData) {
        console.log('✅ [StripeConnect] Dual wallet loaded:', dualWalletData);
        setWalletData(dualWalletData);
        return;
      }

      // Fallback to old method if new RPC doesn't exist
      const { data, error } = await supabase
        .rpc('get_seller_stripe_status');

      if (error) throw error;

      if (data && data.length > 0) {
        setWalletData(data[0]);
      }
    } catch (error: any) {
      console.error('Error loading wallet:', error);
    }
  };

  const checkStripeStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/stripe/account-status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      setStripeStatus(data);
    } catch (error: any) {
      console.error('Error checking Stripe status:', error);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: 'Please login first' });
        return;
      }

      // Create Stripe Connect account
      const createResponse = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const createData = await createResponse.json();
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create account');
      }

      // Get account link for onboarding
      const linkResponse = await fetch('/api/stripe/account-link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const linkData = await linkResponse.json();
      if (!linkData.success) {
        throw new Error(linkData.error || 'Failed to create onboarding link');
      }

      // Redirect to Stripe onboarding
      window.location.href = linkData.url;

    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to connect Stripe' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    try {
      setIsRequestingPayout(true);
      setMessage(null);

      const amount = parseFloat(payoutAmount);
      if (isNaN(amount) || amount < 25) {
        setMessage({ type: 'error', text: 'Minimum payout amount is $25' });
        return;
      }

      if (walletData && amount > walletData.wallet_balance) {
        setMessage({ type: 'error', text: 'Insufficient wallet balance' });
        return;
      }

      // Check W-9 status before processing payout
      if (!isTaxVerified) {
        setMessage({ 
          type: 'error', 
          text: 'Please complete your W-9 tax form before requesting payouts' 
        });
        setShowW9Modal(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: 'Please login first' });
        return;
      }

      const response = await fetch('/api/stripe/process-payout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payout');
      }

      setMessage({ 
        type: 'success', 
        text: `Payout of $${amount} is being processed! Funds will arrive in 2-7 business days.` 
      });
      setPayoutAmount('');
      
      // Reload wallet data
      setTimeout(() => {
        loadWalletData();
      }, 1000);

    } catch (error: any) {
      console.error('Error requesting payout:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to request payout' });
    } finally {
      setIsRequestingPayout(false);
    }
  };

  if (!walletData) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = walletData.stripe_onboarding_completed && walletData.stripe_payouts_enabled;

  const handleW9Complete = () => {
    setShowW9Modal(false);
    setIsTaxVerified(true);
    setMessage({
      type: 'success',
      text: '✅ Tax information verified! You can now request payouts.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Tax Verification Status Banner */}
      {!isTaxVerified && (
        <div className="bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-yellow-400 font-bold mb-1">⚠️ Tax Information Required</h3>
              <p className="text-gray-300 text-sm mb-3">
                US law requires W-9 tax information before processing payouts. Complete your W-9 to withdraw funds.
              </p>
              <button
                onClick={() => setShowW9Modal(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded-lg text-sm transition-all"
              >
                Complete W-9 Form
              </button>
            </div>
          </div>
        </div>
      )}

      {isTaxVerified && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <ShieldCheckIcon className="w-5 h-5" />
            <span className="font-semibold">✅ Tax Information Verified</span>
          </div>
        </div>
      )}
      {/* Dual Wallet System - Pending + Released */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Wallet */}
        <div className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl p-6 shadow-xl border-2 border-yellow-400/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="animate-pulse w-3 h-3 bg-yellow-300 rounded-full"></div>
                <p className="text-white/90 text-sm font-semibold uppercase tracking-wide">Pending Wallet</p>
              </div>
              <p className="text-white/60 text-xs mt-1">⏳ Awaiting tracking submission</p>
            </div>
            <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-4xl font-bold text-white">
              ${(walletData.pending_balance || 0).toFixed(2)}
            </p>
            <p className="text-white/70 text-sm mt-2">
              {walletData.total_pending_sales || 0} sale{walletData.total_pending_sales !== 1 ? 's' : ''} pending
            </p>
            <div className="mt-3 bg-yellow-500/20 rounded-lg px-3 py-2">
              <p className="text-white/80 text-xs">
                💡 Submit tracking numbers to release funds
              </p>
            </div>
          </div>
        </div>

        {/* Released Wallet */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-6 shadow-xl border-2 border-green-400/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                <p className="text-white/90 text-sm font-semibold uppercase tracking-wide">Released Wallet</p>
              </div>
              <p className="text-white/60 text-xs mt-1">✅ Ready to withdraw</p>
            </div>
            <BanknotesIcon className="w-12 h-12 text-white/20" />
          </div>
          <div>
            <p className="text-4xl font-bold text-white">
              ${(walletData.released_balance || walletData.wallet_balance || 0).toFixed(2)}
            </p>
            <p className="text-white/70 text-sm mt-2">
              {walletData.total_released_sales || 0} sale{walletData.total_released_sales !== 1 ? 's' : ''} released
            </p>
            <p className="text-white/60 text-xs mt-3">
              85% of your listing sales
            </p>
          </div>
        </div>
      </div>

      {/* Lifetime Stats */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Lifetime Stats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase">Total Earned</p>
            <p className="text-white text-2xl font-bold mt-1">
              ${(walletData.total_earned || walletData.wallet_balance || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase">Total Withdrawn</p>
            <p className="text-white text-2xl font-bold mt-1">
              ${(walletData.total_withdrawn || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase">Pending Sales</p>
            <p className="text-white text-2xl font-bold mt-1">
              {walletData.total_pending_sales || 0}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase">Released Sales</p>
            <p className="text-white text-2xl font-bold mt-1">
              {walletData.total_released_sales || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Stripe Connection Status */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Bank Account</h3>
            <p className="text-gray-400 text-sm">
              Connect your bank account via Stripe to receive payouts
            </p>
          </div>
          {isConnected ? (
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
          ) : (
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
          )}
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-green-400 font-medium">Bank Account Connected</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                You can now request payouts from your seller wallet
              </p>
            </div>

            <button
              onClick={checkStripeStatus}
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
            >
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              Refresh Status
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mr-2" />
                <span className="text-yellow-400 font-medium">Bank Account Not Connected</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Connect your bank account to withdraw your earnings
              </p>
            </div>

            <button
              onClick={handleConnectStripe}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : 'Connect Bank Account'}
            </button>
          </div>
        )}
      </div>

      {/* Payout Request */}
      {isConnected && walletData.wallet_balance >= 25 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Request Payout</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (Minimum $25)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
                  $
                </span>
                <input
                  type="number"
                  min="25"
                  max={walletData.wallet_balance}
                  step="0.01"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Available: ${walletData.wallet_balance.toFixed(2)}
              </p>
            </div>

            <button
              onClick={handleRequestPayout}
              disabled={isRequestingPayout || !payoutAmount}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isRequestingPayout ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <BanknotesIcon className="w-5 h-5 mr-2" />
                  Request Payout
                </>
              )}
            </button>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start">
                <ClockIcon className="w-5 h-5 text-blue-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-blue-400 font-medium text-sm">Processing Time</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Payouts typically arrive in 2-7 business days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={`rounded-lg p-4 ${
          message.type === 'success' ? 'bg-green-900/20 border border-green-500/30' :
          message.type === 'error' ? 'bg-red-900/20 border border-red-500/30' :
          'bg-blue-900/20 border border-blue-500/30'
        }`}>
          <div className="flex items-start">
            {message.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5" />}
            {message.type === 'error' && <XCircleIcon className="w-5 h-5 text-red-500 mr-2 mt-0.5" />}
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-400' :
              message.type === 'error' ? 'text-red-400' :
              'text-blue-400'
            }`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

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

