import Stripe from "stripe";

/**
 * Create a Stripe client instance.
 *
 * The Cloudflare Workers runtime does not support Node.js's `http` module,
 * so we must use the `fetch` http client provided by Stripe.
 *
 * Usage:
 *   const stripe = createStripe(env.STRIPE_SECRET_KEY);
 */
export function createStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    // Use the global fetch (available in Workers and modern Node.js)
    httpClient: Stripe.createFetchHttpClient(),
  });
}

// ─── Pricing constants ────────────────────────────────────────────────────────

export const STRIPE_PLANS = {
  pro: {
    name: "Pro",
    monthlyPrice: 4900, // cents
    features: [
      "Unlimited campaigns",
      "3 Meta Ads accounts",
      "Advanced analytics",
      "500 AI generations / month",
      "Priority support",
    ],
  },
  agency: {
    name: "Agency",
    monthlyPrice: 14900, // cents
    features: [
      "Everything in Pro",
      "Unlimited Meta Ads accounts",
      "White-label reports",
      "Unlimited AI generations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PLANS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a Stripe amount (cents) as a human-readable string.
 * formatAmount(4900) → "$49.00"
 */
export function formatAmount(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Derive the subscription plan name from a Stripe Price ID.
 */
export function planFromPriceId(
  priceId: string,
  proPriceId: string,
  agencyPriceId: string
): StripePlan | "free" {
  if (priceId === proPriceId) return "pro";
  if (priceId === agencyPriceId) return "agency";
  return "free";
}
