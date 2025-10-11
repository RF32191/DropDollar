'use client';

import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { UserProfile } from '@/lib/supabase/userService';
import SoundEffects from '@/lib/SoundEffects';
import SavedCardsManager from './SavedCardsManager';

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
  const [saveCard, setSaveCard] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedSavedCard, setSelectedSavedCard] = useState<string | null>(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [hasSavedCards, setHasSavedCards] = useState(false);
  const [cvcForSavedCard, setCvcForSavedCard] = useState('');

  // Check for existing customer on mount
  useEffect(() => {
    const checkExistingCustomer = async () => {
      try {
        const response = await fetch('/api/payments/create-customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userProfile.id,
            email: userProfile.email,
            name: userProfile.username
          })
        });

        if (response.ok) {
          const data = await response.json();
          setCustomerId(data.customerId);
          setHasSavedCards(data.existing);
          console.log('✅ [Checkout] Customer loaded:', data.customerId);
          console.log('💳 [Checkout] Has saved cards:', data.existing);
        }
      } catch (error) {
        console.error('Error checking customer:', error);
      }
    };

    checkExistingCustomer();
  }, [userProfile]);

  const handleSavedCardSelected = (paymentMethodId: string) => {
    setSelectedSavedCard(paymentMethodId);
    setShowNewCardForm(false);
    setCvcForSavedCard(''); // Reset CVC when switching cards
    console.log('💳 [Checkout] Saved card selected:', paymentMethodId);
  };

  const handleAddNewCard = () => {
    setSelectedSavedCard(null);
    setShowNewCardForm(true);
    console.log('➕ [Checkout] Adding new card');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe) {
      onError('Payment system not ready. Please refresh the page.');
      return;
    }

    // Only check for card element if using a new card
    if (!selectedSavedCard) {
      if (!elements) {
        onError('Payment system not ready. Please refresh the page.');
        return;
      }
      
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        onError('Please enter your card details.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      console.log('💳 [Checkout] Starting secure payment with card encryption...');
      
      // PRE-FLIGHT CHECK: Verify Supabase connection and user exists
      console.log('🔍 [Checkout] PRE-FLIGHT: Verifying database connection...');
      
      try {
        const { UserService } = await import('@/lib/supabase/userService');
        
        // Test 1: Can we reach Supabase?
        console.log('🔍 [Checkout] PRE-FLIGHT: Testing Supabase connection...');
        const testProfile = await UserService.getUserProfile(userProfile.id);
        
        if (!testProfile) {
          console.error('❌ [Checkout] PRE-FLIGHT FAILED: User profile not found in database');
          throw new Error('Cannot verify your account in the database. Please try signing in again or contact support before making a payment.');
        }
        
        console.log('✅ [Checkout] PRE-FLIGHT: User found in database');
        console.log('✅ [Checkout] PRE-FLIGHT: Current token balance:', testProfile.tokens);
        
        // Test 2: Can we update tokens?
        console.log('🔍 [Checkout] PRE-FLIGHT: Testing token update capability...');
        const currentTokens = testProfile.tokens;
        const testUpdate = await UserService.updateUserTokens(userProfile.id, currentTokens);
        
        if (!testUpdate) {
          console.error('❌ [Checkout] PRE-FLIGHT FAILED: Cannot update tokens in database');
          throw new Error('Database is currently read-only. Please wait a moment and try again.');
        }
        
        console.log('✅ [Checkout] PRE-FLIGHT: Token update capability verified');
        console.log('✅ [Checkout] PRE-FLIGHT: All systems operational');
        console.log('💳 [Checkout] PRE-FLIGHT PASSED - Safe to proceed with payment');
        
      } catch (preflightError: any) {
        console.error('❌ [Checkout] PRE-FLIGHT CHECK FAILED:', preflightError);
        setIsProcessing(false);
        onError(`⚠️ Cannot process payment at this time: ${preflightError.message || 'Database connection issue'}. Your card has NOT been charged.`);
        return;
      }
      
      // Step 1: Create or get Stripe customer if saving card
      let stripeCustomerId = customerId;
      
      if (saveCard && !stripeCustomerId) {
        console.log('👤 [Checkout] Creating Stripe customer for card saving...');
        
        const customerResponse = await fetch('/api/payments/create-customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userProfile.id,
            email: userProfile.email,
            name: userProfile.username
          })
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          stripeCustomerId = customerData.customerId;
          setCustomerId(stripeCustomerId);
          console.log('✅ [Checkout] Stripe customer ready:', stripeCustomerId);
        } else {
          console.warn('⚠️ [Checkout] Failed to create customer, continuing without card save');
        }
      }
      
      // Step 2: Create payment intent
      console.log('🔧 [Checkout] Creating payment intent...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch('/api/payments/simple-intent', {
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
            gameType: 'token_purchase',
            tokensAmount: selectedPackage.tokens
          },
          customerId: stripeCustomerId,
          saveCard: saveCard
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [Checkout] API Error:', errorData);
        throw new Error(errorData.error || 'Failed to create payment intent');
      }
      
      console.log('✅ [Checkout] Payment intent created successfully');

      const data = await response.json();
      const paymentIntent = data.paymentIntent;

      console.log('💳 [Checkout] Payment intent ID:', paymentIntent.id);
      console.log('💳 [Checkout] Amount:', paymentIntent.amount / 100, 'USD');
      console.log('🔒 [Checkout] Card saving:', saveCard ? 'ENABLED' : 'DISABLED');

      // Step 3: Confirm payment with Stripe Elements (Encrypted by Stripe) or Saved Card
      console.log('🔒 [Checkout] Confirming payment with encrypted card data...');
      
      let confirmOptions: any;
      
      if (selectedSavedCard) {
        // Use saved card with CVC verification
        console.log('💳 [Checkout] Using saved card:', selectedSavedCard);
        console.log('🔒 [Checkout] CVC provided:', cvcForSavedCard ? 'Yes' : 'No');
        
        if (!cvcForSavedCard || cvcForSavedCard.length < 3) {
          setIsProcessing(false);
          onError('Please enter the CVC code for your saved card');
          return;
        }
        
        confirmOptions = {
          payment_method: selectedSavedCard,
          payment_method_options: {
            card: {
              cvc: cvcForSavedCard
            }
          }
        };
      } else {
        // Use new card
        const cardElement = elements?.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }
        
        confirmOptions = {
          payment_method: {
            card: cardElement, // Stripe handles encryption automatically
            billing_details: {
              name: userProfile.username || 'User',
              email: userProfile.email,
              address: {
                postal_code: postalCode || undefined,
              },
            },
          },
        };
      }

      const result = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        confirmOptions
      );

      console.log('💳 [Checkout] Payment confirmation result:', result.paymentIntent?.status);

      if (result.error) {
        console.error('❌ [Checkout] Payment error:', result.error.message);
        SoundEffects.playError();
        onError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent?.status === 'succeeded') {
        console.log('✅ [Checkout] Payment succeeded!');
        console.log('💰 [Checkout] Amount charged:', result.paymentIntent.amount / 100, 'USD');
        
        if (saveCard && stripeCustomerId) {
          console.log('🔒 [Checkout] Card saved securely (encrypted by Stripe)');
          console.log('👤 [Checkout] Customer ID:', stripeCustomerId);
        }
        
        SoundEffects.playTokenPurchase();
        SoundEffects.playSuccess();
        onSuccess(result.paymentIntent);
      } else {
        console.error('❌ [Checkout] Payment not successful, status:', result.paymentIntent?.status);
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
    disableLink: true, // Disable Stripe Link autofill
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">💳 Payment Information</h3>
      
      <form 
        onSubmit={handleSubmit} 
        className="space-y-4"
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
      >
        {/* Saved Cards Manager */}
        {hasSavedCards && !showNewCardForm && (
          <>
            <SavedCardsManager
              customerId={customerId}
              onCardSelected={handleSavedCardSelected}
              onAddNewCard={handleAddNewCard}
            />
            
            {/* CVC Input for Saved Card */}
            {selectedSavedCard && (
              <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-blue-200 mb-2">🔒 Security Verification Required</h4>
                    <p className="text-xs text-blue-300 mb-3">
                      For your security, please enter the 3-digit CVC code from the back of your card.
                    </p>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 max-w-xs">
                        <label htmlFor="savedCardCvc" className="block text-xs font-medium text-blue-200 mb-1">
                          CVC Code
                        </label>
                        <input
                          id="savedCardCvc"
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={cvcForSavedCard}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setCvcForSavedCard(value);
                          }}
                          placeholder="123"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div className="text-xs text-blue-300 pt-5">
                        <p>Find on back of card</p>
                        <p className="text-blue-400">💳 (3-4 digits)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* New Card Form */}
        {(!hasSavedCards || showNewCardForm) && (
          <>
            {showNewCardForm && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCardForm(false);
                    setSelectedSavedCard(null);
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  ← Back to saved cards
                </button>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {showNewCardForm ? 'New Card Details' : 'Card Details'}
              </label>
              <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                <CardElement options={cardElementOptions} />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                🔒 Secure payment powered by Stripe
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
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
              />
            </div>

            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="saveCard"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="w-4 h-4 text-green-600 bg-gray-600 border-gray-500 rounded focus:ring-green-500 focus:ring-2"
                />
                <label htmlFor="saveCard" className="text-sm font-medium text-gray-200 cursor-pointer select-none">
                  💾 Save card for future purchases
                </label>
              </div>
              <p className="text-xs text-gray-400 ml-6">
                🔒 Your card is encrypted and securely stored by Stripe (PCI DSS Level 1 compliant). We never see or store your card details.
              </p>
            </div>
          </>
        )}

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
