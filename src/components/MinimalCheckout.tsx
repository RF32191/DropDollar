'use client';

import React, { useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { UserProfile } from '@/lib/supabase/userService';
import SoundEffects from '@/lib/SoundEffects';

interface MinimalCheckoutProps {
  selectedPackage: {
    tokens: number;
    price: number;
  };
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  userProfile: UserProfile;
}

export default function MinimalCheckout({ selectedPackage, onSuccess, onError, userProfile }: MinimalCheckoutProps) {
  const stripe = useStripe();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe) {
      onError('Payment system not ready. Please refresh the page.');
      return;
    }

    // Validate inputs
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
      console.log('Starting real Stripe payment...');
      
      // Try simple API route first
      let apiEndpoint = '/api/payments/simple-intent';
      let response;
      
      try {
        console.log('🔧 Trying simple payment intent API...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: selectedPackage.price,
            currency: 'usd',
            metadata: {
              userId: userProfile.id,
              type: 'tokens',
              gameType: 'token_purchase'
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Simple API failed: ${response.status}`);
        }
        
        console.log('✅ Simple API succeeded');
        
      } catch (simpleError) {
        console.log('⚠️ Simple API failed, trying original API...', simpleError);
        
        // Fallback to original API route
        apiEndpoint = '/api/payments/create-intent';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: selectedPackage.price,
            currency: 'usd',
            metadata: {
              userId: userProfile.id,
              type: 'tokens',
              gameType: 'token_purchase'
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      const paymentIntent = data.paymentIntent;

      console.log('Payment intent created:', paymentIntent.id);

      // Parse expiry date
      const [month, year] = expiryDate.split('/');
      const expMonth = parseInt(month);
      const expYear = parseInt('20' + year);

      if (isNaN(expMonth) || isNaN(expYear) || expMonth < 1 || expMonth > 12) {
        onError('Please enter a valid expiry date');
        return;
      }

      // Confirm payment with Stripe
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
        SoundEffects.playError();
        onError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent?.status === 'succeeded') {
        SoundEffects.playTokenPurchase();
        SoundEffects.playSuccess();
        onSuccess(result.paymentIntent);
      } else {
        SoundEffects.playError();
        onError('Payment not successful');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      SoundEffects.playError();
      
      // Provide more user-friendly error messages
      if (error.name === 'AbortError') {
        onError('Payment request timed out. Please try again.');
      } else if (error.message.includes('connection')) {
        onError('Connection error. Please check your internet and try again.');
      } else if (error.message.includes('rate limit')) {
        onError('Too many requests. Please wait a moment and try again.');
      } else {
        onError(error.message || 'Payment failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

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
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Payment Information</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Card Number</label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            maxLength={19}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Expiry</label>
            <input
              type="text"
              value={expiryDate}
              onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
              placeholder="MM/YY"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              maxLength={5}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">CVC</label>
            <input
              type="text"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="123"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              maxLength={4}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Postal Code</label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="12345"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          onClick={() => SoundEffects.playButtonClick()}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : `Pay $${(selectedPackage.price / 100).toFixed(2)}`}
        </button>
      </form>
    </div>
  );
}
