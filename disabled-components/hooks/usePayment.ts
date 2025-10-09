import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StripePaymentService from '@/lib/payments/stripeService';

interface PaymentConfig {
  amount: number; // Amount in cents
  type: 'listing' | 'tournament' | 'match' | 'hotsell' | 'ad_campaign';
  metadata: {
    listingId?: string;
    tournamentId?: string;
    matchId?: string;
    gameType?: string;
    entryNumber?: number;
  };
}

interface PaymentState {
  isProcessing: boolean;
  error: string | null;
  success: boolean;
  paymentIntent: any | null;
}

export function usePayment() {
  const { user } = useAuth();
  const [paymentState, setPaymentState] = useState<PaymentState>({
    isProcessing: false,
    error: null,
    success: false,
    paymentIntent: null
  });

  const processPayment = useCallback(async (config: PaymentConfig) => {
    if (!user) {
      setPaymentState(prev => ({ ...prev, error: 'Please sign in to make a payment' }));
      return;
    }

    setPaymentState({
      isProcessing: true,
      error: null,
      success: false,
      paymentIntent: null
    });

    try {
      // Create payment intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: config.amount,
          currency: 'usd',
          metadata: {
            userId: user.id,
            type: config.type,
            ...config.metadata
          }
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      setPaymentState({
        isProcessing: false,
        error: null,
        success: true,
        paymentIntent: data.paymentIntent
      });

      return data.paymentIntent;

    } catch (error: any) {
      setPaymentState({
        isProcessing: false,
        error: error.message || 'Payment failed',
        success: false,
        paymentIntent: null
      });
      throw error;
    }
  }, [user]);

  const confirmPayment = useCallback(async (paymentIntentId: string) => {
    setPaymentState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentIntentId }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Payment confirmation failed');
      }

      setPaymentState({
        isProcessing: false,
        error: null,
        success: true,
        paymentIntent: data.paymentIntent
      });

      return data.paymentIntent;

    } catch (error: any) {
      setPaymentState({
        isProcessing: false,
        error: error.message || 'Payment confirmation failed',
        success: false,
        paymentIntent: null
      });
      throw error;
    }
  }, []);

  const resetPaymentState = useCallback(() => {
    setPaymentState({
      isProcessing: false,
      error: null,
      success: false,
      paymentIntent: null
    });
  }, []);

  // Get payment amounts for different types
  const getPaymentAmounts = useCallback(() => {
    return StripePaymentService.getPaymentAmounts();
  }, []);

  // Calculate platform fees
  const calculateFees = useCallback((amount: number) => {
    return StripePaymentService.calculatePlatformFee(amount);
  }, []);

  return {
    paymentState,
    processPayment,
    confirmPayment,
    resetPaymentState,
    getPaymentAmounts,
    calculateFees,
    
    // Convenience getters
    isProcessing: paymentState.isProcessing,
    error: paymentState.error,
    success: paymentState.success,
    paymentIntent: paymentState.paymentIntent
  };
}

export default usePayment;
