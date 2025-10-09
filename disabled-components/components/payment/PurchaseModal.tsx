'use client';

import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  CreditCardIcon,
  WalletIcon,
  ShieldCheckIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { calculateRevenue, formatCurrency } from '@/utils/financial';
import type { Listing, PaymentForm } from '@/types';

interface PurchaseModalProps {
  listing: Listing;
  winningBid: number;
  timerBids: number;
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (paymentData: PaymentForm) => void;
}

export default function PurchaseModal({
  listing,
  winningBid,
  timerBids,
  isOpen,
  onClose,
  onPurchase
}: PurchaseModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'bank'>('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const revenue = calculateRevenue(winningBid, timerBids);
  const totalAmount = revenue.totalRevenue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const paymentData: PaymentForm = {
        amount: totalAmount,
        walletAddress: paymentMethod === 'wallet' ? walletAddress : undefined,
        paymentMethod
      };

      await onPurchase(paymentData);
      onClose();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                    Complete Purchase
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Purchase Summary */}
                <div className="bg-money-50 border border-money-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-money-800 mb-3">Purchase Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-money-600">Item:</span>
                      <span className="font-medium text-money-800">{listing.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-money-600">Your winning bid:</span>
                      <span className="font-medium text-money-800">
                        {formatCurrency(winningBid, 'usd')}
                      </span>
                    </div>
                    {timerBids > 0 && (
                      <div className="flex justify-between">
                        <span className="text-money-600">Timer period bonus:</span>
                        <span className="font-medium text-money-800">
                          +{formatCurrency(timerBids, 'usd')}
                        </span>
                      </div>
                    )}
                    <hr className="border-money-200" />
                    <div className="flex justify-between font-semibold">
                      <span className="text-money-800">Total Amount:</span>
                      <span className="text-money-800">
                        {formatCurrency(totalAmount, 'usd')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Escrow Protection Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <h5 className="font-semibold text-blue-800 mb-1">Buyer Protection</h5>
                      <p className="text-blue-700">
                        Your payment is held in escrow for 14 days. The seller only receives payment after you confirm receipt or the protection period expires.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Payment Method</h4>
                    <div className="space-y-3">
                      {/* Crypto Wallet */}
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="wallet"
                          checked={paymentMethod === 'wallet'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'wallet')}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <WalletIcon className="h-5 w-5 text-gray-600 ml-3 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">Crypto Wallet</div>
                          <div className="text-sm text-gray-600">Pay with your connected wallet</div>
                        </div>
                      </label>

                      {/* Credit Card */}
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="card"
                          checked={paymentMethod === 'card'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'card')}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <CreditCardIcon className="h-5 w-5 text-gray-600 ml-3 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">Credit/Debit Card</div>
                          <div className="text-sm text-gray-600">Pay with card, convert to tokens</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Wallet Address Input */}
                  {paymentMethod === 'wallet' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Wallet Address
                      </label>
                      <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>
                  )}

                  {/* Payment Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h5 className="font-medium text-gray-900 mb-3">Payment Breakdown</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">To Seller:</span>
                        <span className="text-gray-900">
                          {formatCurrency(revenue.sellerPayout, 'usd')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform Fee (6.5%):</span>
                        <span className="text-gray-900">
                          {formatCurrency(revenue.platformFee, 'usd')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          <span>Escrow: 14 days</span>
                        </div>
                        <span>Seller payout after confirmation</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                          Pay {formatCurrency(totalAmount, 'usd')}
                        </div>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
