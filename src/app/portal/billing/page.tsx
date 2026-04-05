import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PayNowButton from "./PayNowButton";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ payment?: string; invoice?: string }>;
}

export default async function PortalBillingPage({ searchParams }: PageProps) {
  const user = await currentUser();
  if (!user) redirect("/portal/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("*")
    .eq("clerk_user_id", user.id)
    .single();
  if (!portalUser || !portalUser.access_settings?.billing) redirect("/portal/dashboard");

  const { payment } = await searchParams;

  // Fetch invoices for this patient
  const { data: invoices } = await supabaseAdmin
    .from("patient_invoices")
    .select("id, invoice_number, invoice_date, due_date, subtotal, insurance_paid, balance_due, amount_paid, status")
    .eq("client_id", portalUser.client_id)
    .order("invoice_date", { ascending: false })
    .limit(20);

  const totalOwed = invoices
    ?.filter(i => i.status !== "paid" && i.status !== "voided")
    .reduce((s, i) => s + (Number(i.balance_due) || 0), 0) || 0;

  // Does the org have Stripe online payments enabled?
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("stripe_account_id, stripe_onboarding_complete, phone, name")
    .eq("id", portalUser.organization_id)
    .single();

  const onlinePaymentsEnabled = !!(org?.stripe_account_id && org?.stripe_onboarding_complete);

  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    open: { label: "Balance Due", color: "bg-amber-100 text-amber-700" },
    sent: { label: "Statement Sent", color: "bg-blue-100 text-blue-700" },
    paid: { label: "Paid ✓", color: "bg-emerald-100 text-emerald-700" },
    voided: { label: "Voided", color: "bg-slate-100 text-slate-400" },
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">My Billing</h1>

      {/* Payment result banners */}
      {payment === "success" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-semibold text-emerald-900">Payment received — thank you!</div>
            <div className="text-emerald-700 text-sm">Your payment has been processed. It may take a moment to reflect below.</div>
          </div>
        </div>
      )}
      {payment === "cancelled" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">↩️</span>
          <div>
            <div className="font-semibold text-amber-900">Payment was cancelled</div>
            <div className="text-amber-700 text-sm">No charge was made. You can try again below.</div>
          </div>
        </div>
      )}

      {/* Outstanding balance summary */}
      {totalOwed > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="font-semibold text-amber-900 text-lg">Total Balance Due: ${totalOwed.toFixed(2)}</div>
          {onlinePaymentsEnabled ? (
            <div className="text-amber-700 text-sm mt-0.5 mb-3">
              Pay securely online with a credit/debit card or bank transfer (ACH).
            </div>
          ) : (
            <div className="text-amber-700 text-sm mt-0.5">
              Please contact our billing office to arrange payment.
            </div>
          )}
          {onlinePaymentsEnabled && !invoices?.find(i => i.status !== "paid" && i.status !== "voided") ? null : null}
          {onlinePaymentsEnabled && org?.phone && (
            <div className="text-xs text-amber-700 mt-2">
              Questions? Call <span className="font-medium">{org.phone}</span>
            </div>
          )}
          {!onlinePaymentsEnabled && org?.phone && (
            <div className="mt-3 text-sm text-amber-800 font-medium">📞 Contact Billing: {org.phone}</div>
          )}
        </div>
      )}

      {/* Invoices list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Statements &amp; Invoices</h2>
        </div>
        {!invoices?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No billing statements on file</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {invoices.map(inv => {
              const s = STATUS_LABEL[inv.status] || STATUS_LABEL.open;
              const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== "paid";
              const canPay = onlinePaymentsEnabled && inv.status !== "paid" && inv.status !== "voided" && Number(inv.balance_due) > 0;
              return (
                <div key={inv.id} className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 text-sm">Statement #{inv.invoice_number}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(inv.invoice_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </div>
                      {inv.due_date && inv.status !== "paid" && (
                        <div className={`text-xs mt-0.5 ${isOverdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                          Due: {new Date(inv.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {isOverdue && " ⚠️ Past due"}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">${Number(inv.balance_due).toFixed(2)}</div>
                      <div className="text-xs text-slate-400">of ${Number(inv.subtotal).toFixed(2)} billed</div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${s.color}`}>{s.label}</span>
                  </div>
                  {canPay && (
                    <div className="mt-3 flex justify-end">
                      <PayNowButton
                        invoiceId={inv.id}
                        balanceDue={Number(inv.balance_due)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">Questions about your bill?</p>
        <p>
          Contact our billing office{org?.phone ? <> at <span className="font-medium">{org.phone}</span></> : ""}.
          {" "}We&apos;re available Monday–Friday, 9am–5pm.
        </p>
        {onlinePaymentsEnabled && (
          <p className="mt-1.5">
            🔒 Online payments are processed securely via Stripe. We accept credit/debit cards and bank transfers (ACH).
          </p>
        )}
      </div>
    </div>
  );
}
