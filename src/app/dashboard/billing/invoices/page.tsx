import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-600",
  voided: "bg-slate-100 text-slate-400",
};

export default async function InvoicesPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const statusFilter = params.status || "";

  let query = supabaseAdmin
    .from("patient_invoices")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .order("invoice_date", { ascending: false })
    .limit(100);

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: invoices } = await query;

  const totalOutstanding = invoices?.filter(i => i.status !== "paid" && i.status !== "voided")
    .reduce((s, i) => s + (Number(i.balance_due) || 0), 0) || 0;
  const overdue = invoices?.filter(i => {
    if (i.status === "paid" || i.status === "voided") return false;
    return i.due_date && new Date(i.due_date) < new Date();
  }).length || 0;
  const openCount = invoices?.filter(i => i.status === "open" || i.status === "sent").length || 0;
  const paidCount = invoices?.filter(i => i.status === "paid").length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/billing" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patient Invoices</h1>
            <p className="text-slate-500 text-sm mt-0.5">Patient responsibility statements and payment tracking</p>
          </div>
        </div>
        <Link href="/dashboard/billing/invoices/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New Invoice
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Outstanding Balance", value: `$${totalOutstanding.toFixed(2)}`, color: totalOutstanding > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Open / Sent", value: openCount, color: "bg-slate-50 border-slate-200" },
          { label: "Overdue", value: overdue, color: overdue > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "Paid", value: paidCount, color: "bg-emerald-50 border-emerald-100" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-red-800 font-medium">{overdue} invoice{overdue > 1 ? "s are" : " is"} past due — consider sending payment reminders</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[["", "All"], ["open", "Open"], ["sent", "Sent"], ["overdue", "Overdue"], ["paid", "Paid"], ["voided", "Voided"]].map(([val, label]) => (
          <Link key={val} href={`/dashboard/billing/invoices?status=${val}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
          </Link>
        ))}
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!invoices?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="font-semibold text-slate-900 mb-1">No patient invoices yet</p>
            <p className="text-slate-500 text-sm mb-4">Create invoices for patient responsibility after insurance processing</p>
            <Link href="/dashboard/billing/invoices/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
              + New Invoice
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Billed / Ins.</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance Due</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map(inv => {
                const patient = Array.isArray(inv.patient) ? inv.patient[0] : inv.patient;
                const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== "paid" && inv.status !== "voided";
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono text-sm font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900 text-sm">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
                      <div className="text-xs text-slate-400">{patient?.mrn || "—"}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{new Date(inv.invoice_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-4 py-4">
                      <div className={`text-sm ${isOverdue ? "text-red-500 font-semibold" : "text-slate-600"}`}>
                        {inv.due_date ? new Date(inv.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        {isOverdue && " ⚠️"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">${Number(inv.subtotal).toFixed(2)}</div>
                      <div className="text-xs text-emerald-600">ins: ${Number(inv.insurance_paid).toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-900">${Number(inv.balance_due).toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[isOverdue ? "overdue" : inv.status] || STATUS_COLORS.open}`}>
                        {isOverdue ? "Overdue" : inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/billing/invoices/${inv.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
