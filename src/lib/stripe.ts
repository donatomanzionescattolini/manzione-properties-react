import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

// Stripe is optional – payment will fall back to manual recording if not configured
export const stripePromise = publishableKey
  ? loadStripe(publishableKey)
  : null;

export const stripeEnabled = Boolean(publishableKey);
