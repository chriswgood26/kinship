# Kinship EHR — Multi-Environment Setup

Kinship uses **three separate Supabase projects** to keep development, staging,
and production data completely isolated. Each environment has its own database,
auth tokens, and Row-Level Security policies.

| Environment | When used | Vercel target | Supabase project |
|-------------|-----------|---------------|------------------|
| **Development** | Local dev (`npm run dev`) | Vercel "Development" | `kinship-dev` |
| **Staging** | PR previews / QA | Vercel "Preview" | `kinship-staging` |
| **Production** | `vercel --prod` | Vercel "Production" | `kinship-prod` |

---

## 1. Create the Supabase Projects

1. Log in to [supabase.com](https://supabase.com) and create three projects:
   - `kinship-dev`
   - `kinship-staging`
   - `kinship-prod`

2. For each project, run `database/schema.sql` in the Supabase SQL editor to
   initialize the schema.

3. Note each project's credentials from **Settings → API**:
   - Project URL (`https://<ref>.supabase.co`)
   - Anon key
   - Service-role key *(keep this secret — server-side only)*

---

## 2. Configure Local Development

Copy the example template and fill in the **development** credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_DEV_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...dev_anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...dev_service_role_key...
```

`.env.local` is git-ignored and never committed.

---

## 3. Configure Vercel Environment Variables

In the [Vercel Dashboard](https://vercel.com) → **Project → Settings →
Environment Variables**, add the following variables **scoped to each
environment**:

### Staging (Preview)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_STAGING_REF.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service-role key |

### Production

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROD_REF.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | production service-role key |

> Vercel automatically uses the correct set of variables based on the
> deployment target (`VERCEL_ENV` = `"preview"` vs `"production"`).

---

## 4. Schema Migrations

When you make schema changes:

1. Update `database/schema.sql`
2. Run the updated SQL in each Supabase project's SQL editor
   (dev first, then staging, then prod after QA sign-off)

---

## 5. Verify Environment at Runtime

The `src/lib/env.ts` module exports a `DEPLOY_ENV` constant that reflects the
current environment (`"development"`, `"preview"`, or `"production"`). You can
use it for environment-specific logging or feature flags:

```typescript
import { DEPLOY_ENV } from "@/lib/env";

if (DEPLOY_ENV !== "production") {
  console.log("Not in production — safe to run seeding scripts");
}
```

---

## Troubleshooting

**"Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"**
→ Your `.env.local` is missing or the variable is not set in Vercel for this
  environment. See steps 2–3 above.

**"permission denied for table …" in Supabase logs**
→ Row-Level Security is enabled. Make sure your server-side routes use
  `supabaseAdmin` (service-role key), not the anon client.
