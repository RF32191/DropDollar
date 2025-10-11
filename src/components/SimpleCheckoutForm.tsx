'use client';

import React, { useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import StripePaymentService from '@/lib/payments/stripeService';
import { UserProfile } from '@/lib/supabase/userService';

interface CheckoutFormProps {
  selectedPackage: {
    tokens: number;
    price: number;
  };
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  userProfile: UserProfile;
}

export default function CheckoutForm({ selectedPackage, onSuccess, onError, userProfile }: CheckoutFormProps) {
  const stripe = useStripe();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Simplified card input state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Basic validation
    if (!stripe) {
      onError('Payment system not ready. Please refresh the page.');
      return;
    }

    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      onError('Please enter a valid card number');
      return;
    }

    if (!expiryDate || !expiryDate.includes('/')) {
      onError('Please enter expiry date as MM/YY');
      return;
    }

    if (!cvc || cvc.length < 3) {
      onError('Please enter a valid CVC');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Starting payment process...');

      // Create payment intent
      const paymentIntent = await StripePaymentService.createPaymentIntent(
        selectedPackage.price,
        'usd',
        {
          userId: userProfile.id,
          type: 'tokens',
          gameType: 'token_purchase'
        }
      );

      console.log('Payment intent created:', paymentIntent.id);

      // Parse expiry date
      const [month, year] = expiryDate.split('/');
      const expMonth = parseInt(month);
      const expYear = parseInt('20' + year);

      if (isNaN(expMonth) || isNaN(expYear) || expMonth < 1 || expMonth > 12) {
        onError('Please enter a valid expiry date');
        return;
      }

      // Confirm payment
      const result = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: {
            card: {
              number: cardNumber.replace(/\s/g, ''),
              exp_month: expMonth,
              exp_year: expYear,
              cvc: cvc,
            },
            billing_details: {
              name: userProfile.username || 'User',
              email: userProfile.email,
              address: {
                postal_code: postalCode || '00000',
              },
            },
          },
        }
      );

      console.log('Payment result:', result);

      if (result.error) {
        onError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent?.status === 'succeeded') {
        onSuccess(result.paymentIntent);
      } else {
        onError('Payment not successful');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      onError(error.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Simple formatting functions
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-700 p-6 rounded-lg space-y-4">
        {/* Card Number */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Card Number
          </label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="off"
            maxLength={19}
          />
        </div>

        {/* Expiry Date and CVC */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expiry Date
            </label>
            <input
              type="text"
              value={expiryDate}
              onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
              placeholder="MM/YY"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="off"
              maxLength={5}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              CVC
            </label>
            <input
              type="text"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="123"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="off"
              maxLength={4}
            />
          </div>
        </div>

        {/* Postal Code */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="12345"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing Payment...
          </>
        ) : (
          `Purchase ${selectedPackage.tokens} Tokens for $${(selectedPackage.price / 100).toFixed(2)}`
        )}
      </button>
    </form>
  );
}
