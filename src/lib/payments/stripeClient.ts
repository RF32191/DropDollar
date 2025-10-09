import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key - handle missing keys gracefully
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

export const getStripe = async (): Promise<Stripe | null> => {
  try {
    return await stripePromise;
  } catch (error) {
    console.warn('Stripe initialization failed:', error);
    return null;
  }
};

export default stripePromise;