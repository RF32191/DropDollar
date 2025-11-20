'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  XMarkIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface TrackingSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  listingTitle: string;
  winnerUsername: string;
  sellerEarnings: number;
  onSuccess?: () => void;
}

export default function TrackingSubmissionModal({
  isOpen,
  onClose,
  sessionId,
  listingTitle,
  winnerUsername,
  sellerEarnings,
  onSuccess
}: TrackingSubmissionModalProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingProvider, setTrackingProvider] = useState('USPS');
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const carriers = [
    { value: 'USPS', label: 'USPS', icon: '📬' },
    { value: 'UPS', label: 'UPS', icon: '📦' },
    { value: 'FedEx', label: 'FedEx', icon: '🚚' },
    { value: 'DHL', label: 'DHL', icon: '✈️' },
    { value: 'Other', label: 'Other Carrier', icon: '🚛' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingNumber.trim()) {
      setMessage({ type: 'error', text: 'Please enter a tracking number' });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      // Calculate estimated delivery date
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + estimatedDeliveryDays);

      // Call the tracking submission function
      const { data, error } = await supabase.rpc('submit_tracking_number_with_notifications', {
        p_session_id: sessionId,
        p_tracking_number: trackingNumber.trim(),
        p_tracking_provider: trackingProvider,
        p_estimated_delivery: estimatedDelivery.toISOString()
      });

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: `✅ Tracking submitted! Funds ($${sellerEarnings.toFixed(2)}) released to your wallet.` 
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Reset form
        setTrackingNumber('');
        setTrackingProvider('USPS');
        setEstimatedDeliveryDays(7);
        setMessage(null);
      }, 2000);

    } catch (error: any) {
      console.error('Error submitting tracking:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to submit tracking number. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full border-2 border-blue-500/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-3 rounded-lg">
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Submit Tracking Number</h2>
              <p className="text-sm text-gray-400">Release funds to your wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Item Details */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-white font-semibold mb-2">📦 Item Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Item:</span>
                <span className="text-white font-medium">{listingTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Winner:</span>
                <span className="text-white font-medium">{winnerUsername}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your Earnings:</span>
                <span className="text-green-400 font-bold">${sellerEarnings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Tracking Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Shipping Carrier *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {carriers.map((carrier) => (
                <button
                  key={carrier.value}
                  type="button"
                  onClick={() => setTrackingProvider(carrier.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    trackingProvider === carrier.value
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{carrier.icon}</div>
                  <div className="text-sm font-medium text-white">{carrier.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tracking Number */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tracking Number *
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: 9400111899561234567890
            </p>
          </div>

          {/* Estimated Delivery */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Estimated Delivery Time
            </label>
            <select
              value={estimatedDeliveryDays}
              onChange={(e) => setEstimatedDeliveryDays(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value={2}>2-3 days (Express)</option>
              <option value={5}>5-7 days (Standard)</option>
              <option value={7}>7-10 days (Economy)</option>
              <option value={14}>14+ days (International)</option>
            </select>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationCircleIcon className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-300">
                <p className="font-semibold mb-1">⚡ Instant Fund Release</p>
                <p className="text-yellow-200/80">
                  Once you submit the tracking number, your <span className="font-bold">${sellerEarnings.toFixed(2)}</span> will 
                  immediately move from pending to released wallet. You can then withdraw via Stripe.
                </p>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`rounded-lg p-4 ${
              message.type === 'success' 
                ? 'bg-green-900/20 border border-green-500/30' 
                : 'bg-red-900/20 border border-red-500/30'
            }`}>
              <div className="flex items-start">
                {message.type === 'success' ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                ) : (
                  <ExclamationCircleIcon className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                )}
                <p className={`text-sm ${
                  message.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !trackingNumber.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <TruckIcon className="w-5 h-5 mr-2" />
                  Submit & Release Funds
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

