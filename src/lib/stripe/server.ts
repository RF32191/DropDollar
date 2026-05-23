// Stripe server-side configuration — lazily instantiated so Next.js build can load routes
// without STRIPE_SECRET_KEY present (secrets are injected at runtime on Vercel).
import Stripe from 'stripe';

type GlobalStripe = typeof globalThis & { __stripeServerClient?: Stripe };

export function getStripe(): Stripe {
  const g = globalThis as GlobalStripe;
  if (g.__stripeServerClient) return g.__stripeServerClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
  }
  g.__stripeServerClient = new Stripe(key, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  });
  return g.__stripeServerClient;
}

// Helper to get base URL
export function getBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

