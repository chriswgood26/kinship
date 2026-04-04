/**
 * Centralized, validated environment variable access.
 *
 * Kinship uses separate Supabase projects per environment:
 *   - Development  → local .env.local (or Vercel "Development" env)
 *   - Staging      → Vercel "Preview" env vars (separate Supabase project)
 *   - Production   → Vercel "Production" env vars (separate Supabase project)
 *
 * Set the three SUPABASE_* variables in each Vercel environment via:
 *   Vercel Dashboard → Project → Settings → Environment Variables
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Make sure it is set in .env.local (dev) or Vercel environment variables (staging/prod).\n` +
        `See ENVIRONMENTS.md for setup instructions.`
    );
  }
  return value;
}

/** Supabase project URL — scoped per environment */
export const SUPABASE_URL = (): string =>
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");

/** Supabase anon key — scoped per environment */
export const SUPABASE_ANON_KEY = (): string =>
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

/** Supabase service-role key — server-side only, never exposed to browser */
export const SUPABASE_SERVICE_ROLE_KEY = (): string =>
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");

/** Clerk publishable key */
export const CLERK_PUBLISHABLE_KEY = (): string =>
  requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");

/** Clerk secret key — server-side only */
export const CLERK_SECRET_KEY = (): string => requireEnv("CLERK_SECRET_KEY");

/**
 * The active deployment environment.
 * Vercel sets VERCEL_ENV automatically; falls back to NODE_ENV for local dev.
 */
export const DEPLOY_ENV: "development" | "preview" | "production" =
  (process.env.VERCEL_ENV as "development" | "preview" | "production") ??
  (process.env.NODE_ENV === "production" ? "production" : "development");
