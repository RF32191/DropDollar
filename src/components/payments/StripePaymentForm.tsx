import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useAuth } from '@/contexts/AuthContext';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  amount: number; // Amount in cents
  currency?: string;
  type: 'listing' | 'tournament' | 'match' | 'hotsell' | 'ad_campaign';
  metadata: {
    listingId?: string;
    tournamentId?: string;
    matchId?: string;
    gameType?: string;
    entryNumber?: number;
  };
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'usd',
  type,
  metadata,
  onSuccess,
  onError,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');

  // Create payment intent when component mounts
  useEffect(() => {
    if (!user) return;

    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            currency,
            metadata: {
              userId: user.id,
              type,
              ...metadata
            }
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          setClientSecret(data.paymentIntent.client_secret);
        } else {
          onError(data.error || 'Failed to create payment intent');
        }
      } catch (error: any) {
        onError(error.message || 'Failed to initialize payment');
      }
    };

    createPaymentIntent();
  }, [user, amount, currency, type, metadata, onError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      onError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: user?.email || 'DropDollar User',
            email: user?.email
          },
        },
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on server
        const confirmResponse = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id
          }),
        });

        const confirmData = await confirmResponse.json();
        
        if (confirmData.success) {
          onSuccess(paymentIntent);
        } else {
          onError(confirmData.error || 'Payment confirmation failed');
        }
      }
    } catch (error: any) {
      onError(error.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentDescription = () => {
    const amountInDollars = (amount / 100).toFixed(2);
    
    switch (type) {
      case 'listing':
        return `Listing Entry Fee - $${amountInDollars}`;
      case 'tournament':
        return `Tournament Entry - $${amountInDollars}`;
      case 'match':
        return `1v1 Match Entry - $${amountInDollars}`;
      case 'hotsell':
        return `Hot Sell Competition - $${amountInDollars}`;
      case 'ad_campaign':
        return `Ad Campaign - $${amountInDollars}`;
      default:
        return `Payment - $${amountInDollars}`;
    }
  };

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Initializing payment...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Complete Your Payment
        </h3>
        <p className="text-gray-600">{getPaymentDescription()}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Information
          </label>
          <div className="p-3 border border-gray-300 rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!stripe || isProcessing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </span>
            ) : (
              `Pay $${(amount / 100).toFixed(2)}`
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>🔒 Your payment is secured by Stripe</p>
        <p>All transactions are encrypted and secure</p>
      </div>
    </div>
  );
};

// Wrapper component with Stripe Elements provider
const StripePaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};

export default StripePaymentForm;
