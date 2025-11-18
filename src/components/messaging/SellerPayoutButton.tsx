'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { BanknotesIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface SellerPayoutButtonProps {
  listingId: string;
  sellerId: string;
  prizeAmount: number;
  onPayoutComplete?: () => void;
}

export default function SellerPayoutButton({ 
  listingId, 
  sellerId, 
  prizeAmount,
  onPayoutComplete 
}: SellerPayoutButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handlePayout = async () => {
    setIsProcessing(true);
    setStatus('idle');
    setMessage('');

    try {
      console.log('🏦 Releasing funds to seller:', { listingId, sellerId, prizeAmount });

      const { data, error } = await supabase.rpc('release_marketplace_funds_to_seller', {
        p_listing_id: listingId,
        p_seller_id: sellerId
      });

      if (error) throw error;

      console.log('✅ Funds released successfully:', data);
      setStatus('success');
      setMessage(`✅ ${prizeAmount.toFixed(2)} tokens transferred to your wallet!`);
      
      if (onPayoutComplete) {
        onPayoutComplete();
      }
    } catch (error: any) {
      console.error('❌ Payout failed:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to release funds. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 my-3">
        <div className="flex items-center text-green-400">
          <CheckCircleIcon className="w-5 h-5 mr-2" />
          <span className="font-semibold">{message}</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 my-3">
        <div className="flex items-center text-red-400 mb-3">
          <XCircleIcon className="w-5 h-5 mr-2" />
          <span className="font-semibold">{message}</span>
        </div>
        <button
          onClick={handlePayout}
          disabled={isProcessing}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 rounded-lg p-4 my-3">
      <div className="mb-3">
        <p className="text-white font-bold text-lg mb-1">💰 Funds Ready for Transfer</p>
        <p className="text-gray-300 text-sm">
          Click below to transfer <span className="text-green-400 font-bold">{prizeAmount.toFixed(2)} tokens</span> to your wallet
        </p>
      </div>
      
      <button
        onClick={handlePayout}
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing...
          </>
        ) : (
          <>
            <BanknotesIcon className="w-5 h-5 mr-2" />
            Transfer {prizeAmount.toFixed(2)} Tokens to My Wallet
          </>
        )}
      </button>
      
      <p className="text-xs text-gray-400 mt-2 text-center">
        ⚠️ This action cannot be undone. Make sure you've shipped the item before releasing funds.
      </p>
    </div>
  );
}

