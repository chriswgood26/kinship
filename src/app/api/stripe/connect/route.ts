import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { getStripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.kinshipehr.com";

// GET — get org's Stripe Connect status
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("stripe_account_id, stripe_onboarding_complete, stripe_account_email")
    .eq("id", orgId)
    .single();

  return NextResponse.json({
    connected: !!(org?.stripe_account_id && org?.stripe_onboarding_complete),
    account_id: org?.stripe_account_id || null,
    account_email: org?.stripe_account_email || null,
    onboarding_complete: org?.stripe_onboarding_complete || false,
  });
}

// POST — initiate Stripe Connect OAuth or create Express account
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const orgId = await getOrgId(userId);
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("name, stripe_account_id")
    .eq("id", orgId)
    .single();

  // If already has an account, generate a new onboarding link
  if (org?.stripe_account_id) {
    const accountLink = await stripe.accountLinks.create({
      account: org.stripe_account_id,
      refresh_url: `${APP_URL}/dashboard/settings?stripe=refresh`,
      return_url: `${APP_URL}/dashboard/settings?stripe=success`,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: accountLink.url });
  }

  // Create a new Express account for this org
  const account = await stripe.accounts.create({
    type: "express",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      mcc: "8099", // Health services
      product_description: "Behavioral health services — client copays and invoices",
    },
    metadata: { org_id: orgId, org_name: org?.name || "" },
  });

  // Save account ID to org
  await supabaseAdmin
    .from("organizations")
    .update({ stripe_account_id: account.id, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${APP_URL}/dashboard/settings?stripe=refresh`,
    return_url: `${APP_URL}/dashboard/settings?stripe=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url, account_id: account.id });
}

// DELETE — disconnect Stripe account
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  await supabaseAdmin
    .from("organizations")
    .update({ stripe_account_id: null, stripe_onboarding_complete: false, stripe_account_email: null, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  return NextResponse.json({ disconnected: true });
}
