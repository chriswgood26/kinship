@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Kinship is a SaaS EHR platform for small/mid-size behavioral health, DD, and community mental health agencies. It's a commercial repackaging of DrCloud Neo's clinical engine with multi-tenant subscription tiers. Full-stack TypeScript on Next.js 16 + Supabase + Clerk + Stripe. Pre-launch — in active development.

## Commands

- `npm run dev` — dev server on localhost:3000
- `npm run build` — production build
- `npm run lint` — ESLint (Next.js core web vitals + TypeScript)

No test suite configured.

## Architecture

**Two audiences:**
- `/dashboard/*` — Staff EHR (clients, scheduling, encounters, billing, assessments, treatment plans, screenings, ROI, programs, reports, admin, feedback)
- `/sign-in/`, `/sign-up/` — Clerk auth pages
- `/superadmin/` — Feature gate admin dashboard
- `/api/*` — RESTful route handlers
- Landing page at `/` with pricing tiers and waitlist form

**Key lib files:**
- `src/lib/supabaseAdmin.ts` — server-side Supabase (service role)
- `src/lib/getOrgId.ts` — maps Clerk userId to organization_id (**use in ALL API routes**)
- `src/lib/terminology.ts` — configurable client/patient/individual terminology per org (8 options)
- `src/lib/plans.ts` — subscription tier feature matrix + `hasFeature()` utility
- `src/lib/billingRules.ts` — charge validation engine (8 rules: auth, MH diagnosis, session limits)
- `src/lib/screenings.ts` — PHQ-9, GAD-7 question definitions + scoring
- `src/lib/cssrs.ts` — C-SSRS suicide risk assessment
- `src/lib/fpl.ts` — Federal Poverty Level calculations
- `src/lib/defaultCharges.ts` — standard CPT codes + pricing
- `src/lib/communications.ts` — email (Resend) + SMS (Twilio)

**Database:** Schema in `database/schema.sql`. Demo org ID fallback: `34e600b3-beb0-440c-88c4-20032185e727`.

## Critical Patterns

**API route template — every route must use `getOrgId`:**
```typescript
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const orgId = await getOrgId(userId);
// All queries must scope to organization_id via orgId
```

**Client-side fetches must use `credentials: "include"`.**

**Terminology:** Never hardcode "patient" or "client" — use `TerminologyTitle` component or `getTerminology()`. Stored in `organizations.client_terminology`.

**Feature gating:** Use `hasFeature(org.plan, "feature_name", org.addons)` from `plans.ts`. Tiers: starter, growth, practice, agency, custom. Add-ons: sms, ccbhc, emar, dd.

**Billing validation:** Run charges through `billingRules.ts` before insert — validates MH diagnosis requirements, prior auth tracking, session limits per payer.

**Screenings:** PHQ-9, GAD-7, C-SSRS stored as JSONB `answers` with `severity_label` and `total_score`.

## Conventions

- All new database tables must include `organization_id` FK for multi-tenancy
- Sidebar accepts `clientTermPlural` prop from dashboard layout

## Related

- **DrCloud Neo** (`~/projects/drcloud-neo`) is the original codebase this was built from. It has detailed ARCHITECTURE.md and PROJECT.md docs that also apply here. Fixes and patterns there may apply here.
