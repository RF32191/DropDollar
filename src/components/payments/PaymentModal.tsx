import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import StripePaymentForm from './StripePaymentForm';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number; // Amount in cents
  title: string;
  description: string;
  type: 'listing' | 'tournament' | 'match' | 'hotsell' | 'ad_campaign';
  metadata: {
    listingId?: string;
    tournamentId?: string;
    matchId?: string;
    gameType?: string;
    entryNumber?: number;
  };
  onSuccess: (paymentIntent: any) => void;
  onError?: (error: string) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  title,
  description,
  type,
  metadata,
  onSuccess,
  onError
}) => {
  const [paymentError, setPaymentError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentSuccess = (paymentIntent: any) => {
    setIsProcessing(false);
    onSuccess(paymentIntent);
    onClose();
  };

  const handlePaymentError = (error: string) => {
    setPaymentError(error);
    setIsProcessing(false);
    if (onError) {
      onError(error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">{description}</p>

          {/* Payment Error */}
          {paymentError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-medium">Payment Error</div>
              <div className="text-red-600 text-sm mt-1">{paymentError}</div>
              <button
                onClick={() => setPaymentError('')}
                className="text-red-600 hover:text-red-800 text-sm underline mt-2"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Stripe Payment Form */}
          <StripePaymentForm
            amount={amount}
            type={type}
            metadata={metadata}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={onClose}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <span>💳 Secure payment by Stripe</span>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">
                Total: ${(amount / 100).toFixed(2)} USD
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
