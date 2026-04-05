import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalBillingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users").select("*").eq("clerk_user_id", user.id).single();
  if (!portalUser || !portalUser.access_settings?.billing) redirect("/portal/dashboard");

  // Only show patient invoices — NOT raw charge data
  const { data: invoices } = await supabaseAdmin
    .from("patient_invoices")
    .select("id, invoice_number, invoice_date, due_date, subtotal, insurance_paid, balance_due, amount_paid, status")
    .eq("client_id", portalUser.client_id)
    .order("invoice_date", { ascending: false })
    .limit(20);

  const totalOwed = invoices?.filter(i => i.status !== "paid" && i.status !== "voided")
    .reduce((s, i) => s + (Number(i.balance_due) || 0), 0) || 0;

  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    open: { label: "Balance Due", color: "bg-amber-100 text-amber-700" },
    sent: { label: "Statement Sent", color: "bg-blue-100 text-blue-700" },
    paid: { label: "Paid ✓", color: "bg-emerald-100 text-emerald-700" },
    voided: { label: "Voided", color: "bg-slate-100 text-slate-400" },
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">My Billing</h1>

      {totalOwed > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="font-semibold text-amber-900 text-lg">Balance Due: ${totalOwed.toFixed(2)}</div>
          <div className="text-amber-700 text-sm mt-0.5">Please contact our billing office to arrange payment.</div>
          <div className="mt-3 text-sm text-amber-800 font-medium">📞 Contact Billing: (503) 555-0100</div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Statements & Invoices</h2>
        </div>
        {!invoices?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No billing statements on file</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {invoices.map(inv => {
              const s = STATUS_LABEL[inv.status] || STATUS_LABEL.open;
              const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== "paid";
              return (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-4">
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
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">Questions about your bill?</p>
        <p>Contact our billing office at <span className="font-medium">(503) 555-0100</span> or email <span className="font-medium">billing@beavertonmh.org</span>. We're available Monday–Friday, 9am–5pm.</p>
      </div>
    </div>
  );
}
