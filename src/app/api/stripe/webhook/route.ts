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
      const session = event.data.object as { metadata?: Record<string, string>; payment_intent?: string; amount_total?: number; payment_method_types?: string[] };
      const { invoice_id, patient_invoice_id, org_id, client_id, source } = session.metadata || {};
      const amountPaid = (session.amount_total || 0) / 100;
      const paymentIntent = session.payment_intent as string | null || null;

      // --- Portal patient payment (patient_invoices table) ---
      if (patient_invoice_id && source === "patient_portal") {
        const now = new Date().toISOString();

        // Fetch current balance
        const { data: inv } = await supabaseAdmin
          .from("patient_invoices")
          .select("amount_paid, balance_due, invoice_number")
          .eq("id", patient_invoice_id)
          .single();

        if (inv) {
          const newAmountPaid = Number(inv.amount_paid) + amountPaid;
          const newBalance = Math.max(0, Number(inv.balance_due) - amountPaid);

          await supabaseAdmin
            .from("patient_invoices")
            .update({
              amount_paid: newAmountPaid,
              balance_due: newBalance,
              status: newBalance <= 0 ? "paid" : "sent",
              stripe_payment_intent: paymentIntent,
              updated_at: now,
            })
            .eq("id", patient_invoice_id);

          // Record payment in patient_payments
          await supabaseAdmin.from("patient_payments").insert({
            organization_id: org_id || null,
            client_id: client_id || null,
            invoice_id: patient_invoice_id,
            payment_date: now.split("T")[0],
            amount: amountPaid,
            payment_method: "card_online",
            reference_number: paymentIntent || null,
            notes: "Online payment via patient portal",
            recorded_by: null,
          });

          // Notify billing staff
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
                title: "Patient portal payment received",
                message: `Online payment of $${amountPaid.toFixed(2)} received for statement ${inv.invoice_number || patient_invoice_id.slice(0, 8)}`,
                entity_type: "invoice",
                entity_id: patient_invoice_id,
                link: `/dashboard/billing/invoices/${patient_invoice_id}`,
                is_read: false,
              }))
            );
          }
        }
        break;
      }

      // --- Staff-initiated checkout (invoices table) ---
      if (invoice_id) {
        // Mark invoice as paid
        await supabaseAdmin
          .from("invoices")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            paid_amount: amountPaid,
            payment_method: "card_online",
            stripe_payment_intent: paymentIntent,
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
