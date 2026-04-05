import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { getStripe, STRIPE_PLATFORM_FEE_PERCENT } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.kinshipehr.com";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const { invoice_id } = await req.json();
  if (!invoice_id) return NextResponse.json({ error: "invoice_id required" }, { status: 400 });

  const orgId = await getOrgId(userId);

  // Get org's Stripe account
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("stripe_account_id, stripe_onboarding_complete, name")
    .eq("id", orgId)
    .single();

  if (!org?.stripe_account_id || !org?.stripe_onboarding_complete) {
    return NextResponse.json({ error: "Stripe not connected — complete Stripe setup in Settings" }, { status: 400 });
  }

  // Get invoice details
  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("*, client:client_id(first_name, last_name, email)")
    .eq("id", invoice_id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status === "paid") return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });

  const amountCents = Math.round((invoice.patient_responsibility || invoice.balance_due || 0) * 100);
  if (amountCents <= 0) return NextResponse.json({ error: "Invoice balance is zero" }, { status: 400 });

  const client = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client;
  const platformFeeCents = Math.round(amountCents * STRIPE_PLATFORM_FEE_PERCENT / 100);

  // Create Stripe Checkout session on the connected account
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Invoice #${invoice.invoice_number || invoice_id.slice(0, 8)} — ${org.name}`,
            description: `Client balance due — ${invoice.due_date ? `Due ${new Date(invoice.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: client?.email || undefined,
    success_url: `${APP_URL}/dashboard/billing/invoices/${invoice_id}?payment=success`,
    cancel_url: `${APP_URL}/dashboard/billing/invoices/${invoice_id}?payment=cancelled`,
    metadata: {
      invoice_id,
      org_id: orgId,
      client_id: invoice.client_id,
    },
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      metadata: { invoice_id, org_id: orgId },
    },
  }, {
    stripeAccount: org.stripe_account_id,
  });

  return NextResponse.json({ url: session.url, session_id: session.id });
}
