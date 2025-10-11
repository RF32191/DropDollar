'use client';

import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
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
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [postalCode, setPostalCode] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      onError('Payment system not ready. Please refresh the page.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    
    if (!cardElement) {
      onError('Card element not found. Please refresh the page.');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Starting real Stripe payment with Elements...');
      
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

      // Confirm payment with Stripe Elements
      const result = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: userProfile.username || 'User',
              email: userProfile.email,
              address: {
                postal_code: postalCode || undefined,
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

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#fff',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
        backgroundColor: '#374151',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">💳 Payment Information</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Card Details</label>
          <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
            <CardElement options={cardElementOptions} />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Secure payment powered by Stripe
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Postal Code (Optional)</label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="12345"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing || !stripe}
          onClick={() => SoundEffects.playButtonClick()}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Pay $${(selectedPackage.price / 100).toFixed(2)}`
          )}
        </button>

        <div className="text-center text-xs text-gray-400">
          🔒 Your payment information is encrypted and secure
        </div>
      </form>
    </div>
  );
}
