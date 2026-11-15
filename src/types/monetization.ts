export type PlanTier = 'free' | 'pro';

export type CheckoutProvider = 'stripe' | 'lemonsqueezy';

export interface PlanEntitlements {
  tier: PlanTier;
  label: string;
  priceDisplay: string;
  allowStandardSolidPng: boolean;
  allowTransparentPng: boolean;
  allowHighResPng: boolean;
  allowVectorSvg: boolean;
  allowPrintPdf: boolean;
  allowBrandKitZip: boolean;
  allowFaviconsAndSocial: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanTier, PlanEntitlements> = {
  free: {
    tier: 'free',
    label: 'Free',
    priceDisplay: '$0',
    allowStandardSolidPng: true,
    allowTransparentPng: false,
    allowHighResPng: false,
    allowVectorSvg: false,
    allowPrintPdf: false,
    allowBrandKitZip: false,
    allowFaviconsAndSocial: false,
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    priceDisplay: '$29 one-time',
    allowStandardSolidPng: true,
    allowTransparentPng: true,
    allowHighResPng: true,
    allowVectorSvg: true,
    allowPrintPdf: true,
    allowBrandKitZip: true,
    allowFaviconsAndSocial: true,
  },
};

export interface BillingCheckoutConfig {
  provider: CheckoutProvider;
  checkoutUrl?: string;
}

/**
 * Resolves optional Stripe or LemonSqueezy checkout URLs from Vite environment variables.
 * Set VITE_STRIPE_CHECKOUT_URL or VITE_LEMONSQUEEZY_CHECKOUT_URL in production to wire live checkout.
 */
export function getConfiguredCheckoutUrl(provider: CheckoutProvider): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  if (provider === 'stripe') {
    return env.VITE_STRIPE_CHECKOUT_URL?.trim() || undefined;
  }
  return env.VITE_LEMONSQUEEZY_CHECKOUT_URL?.trim() || undefined;
}
