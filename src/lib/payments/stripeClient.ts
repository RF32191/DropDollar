import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const getStripe = async (): Promise<Stripe | null> => {
  return await stripePromise;
};

export default stripePromise;
