import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe, STRIPE_PLATFORM_FEE_PERCENT } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.kinshipehr.com";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Online payments are not configured" }, { status: 503 });

  const { invoice_id } = await req.json();
  if (!invoice_id) return NextResponse.json({ error: "invoice_id required" }, { status: 400 });

  // Resolve portal user — must be active and have billing access
  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("client_id, organization_id, access_settings, email")
    .eq("clerk_user_id", userId)
    .eq("is_active", true)
    .single();

  if (!portalUser) return NextResponse.json({ error: "Not a portal user" }, { status: 403 });
  if (!portalUser.access_settings?.billing) {
    return NextResponse.json({ error: "Online payments not enabled for your account" }, { status: 403 });
  }

  // Fetch invoice — must belong to this portal user's client and org
  const { data: invoice } = await supabaseAdmin
    .from("patient_invoices")
    .select("id, invoice_number, balance_due, patient_responsibility, due_date, status, client_id, organization_id")
    .eq("id", invoice_id)
    .eq("client_id", portalUser.client_id)
    .eq("organization_id", portalUser.organization_id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status === "paid" || invoice.status === "voided") {
    return NextResponse.json({ error: "Invoice is already paid or voided" }, { status: 400 });
  }

  const amountCents = Math.round((Number(invoice.balance_due) || 0) * 100);
  if (amountCents <= 0) return NextResponse.json({ error: "Invoice balance is zero" }, { status: 400 });

  // Get org's connected Stripe account
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("stripe_account_id, stripe_onboarding_complete, name, phone")
    .eq("id", portalUser.organization_id)
    .single();

  if (!org?.stripe_account_id || !org?.stripe_onboarding_complete) {
    return NextResponse.json({ error: "Online payments not available — please contact the billing office" }, { status: 400 });
  }

  const platformFeeCents = Math.round(amountCents * STRIPE_PLATFORM_FEE_PERCENT / 100);

  const dueLabel = invoice.due_date
    ? `Due ${new Date(invoice.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "Patient balance due";

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card", "us_bank_account"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Statement #${invoice.invoice_number || invoice_id.slice(0, 8)} — ${org.name}`,
              description: dueLabel,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      customer_email: portalUser.email || undefined,
      success_url: `${APP_URL}/portal/billing?payment=success&invoice=${invoice_id}`,
      cancel_url: `${APP_URL}/portal/billing?payment=cancelled`,
      metadata: {
        patient_invoice_id: invoice_id,
        org_id: portalUser.organization_id,
        client_id: portalUser.client_id,
        source: "patient_portal",
      },
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        metadata: {
          patient_invoice_id: invoice_id,
          org_id: portalUser.organization_id,
          source: "patient_portal",
        },
      },
    },
    { stripeAccount: org.stripe_account_id }
  );

  return NextResponse.json({ url: session.url, session_id: session.id });
}
