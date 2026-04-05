import Stripe from "stripe";

// DrCloud Neo platform Stripe keys
// Organizations connect their own Stripe accounts via Connect
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PLATFORM_FEE_PERCENT = 0.5; // 0.5% platform fee on patient payments

export function getStripe() {
  if (!STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY not configured — Stripe features disabled");
    return null;
  }
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
}

export { STRIPE_PLATFORM_FEE_PERCENT };
