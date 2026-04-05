import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as { metadata?: Record<string, string>; payment_intent?: string; amount_total?: number };
      const { invoice_id, org_id, client_id } = session.metadata || {};

      if (invoice_id) {
        const amountPaid = (session.amount_total || 0) / 100;

        // Mark invoice as paid
        await supabaseAdmin
          .from("invoices")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            paid_amount: amountPaid,
            payment_method: "card_online",
            stripe_payment_intent: session.payment_intent as string || null,
            balance_due: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice_id);

        // Create notification for billing staff
        const { data: staffMembers } = await supabaseAdmin
          .from("user_profiles")
          .select("clerk_user_id")
          .eq("organization_id", org_id || "")
          .in("role", ["admin", "billing"]);

        if (staffMembers && staffMembers.length > 0) {
          await supabaseAdmin.from("notifications").insert(
            staffMembers.map(s => ({
              user_clerk_id: s.clerk_user_id,
              type: "payment_received",
              title: "Client payment received",
              message: `Online payment of $${amountPaid.toFixed(2)} received for invoice ${invoice_id.slice(0, 8)}`,
              entity_type: "invoice",
              entity_id: invoice_id,
              link: `/dashboard/billing/invoices/${invoice_id}`,
              is_read: false,
            }))
          );
        }

        void client_id; // used in metadata for future analytics
      }
      break;
    }

    case "account.updated": {
      // Update org's Stripe onboarding status
      const account = event.data.object as { id: string; details_submitted?: boolean; email?: string };
      if (account.details_submitted) {
        await supabaseAdmin
          .from("organizations")
          .update({
            stripe_onboarding_complete: true,
            stripe_account_email: account.email || null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_account_id", account.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
