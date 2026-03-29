import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  submitted: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-600",
  void: "bg-slate-100 text-slate-500",
};

export default async function BillingPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", user.id).single();
  const orgId = profile?.organization_id;

  const params = await searchParams;
  const status = params.status || "";

  let query = supabaseAdmin
    .from("charges")
    .select("*, client:client_id(first_name, last_name, mrn)")
    .eq("organization_id", orgId || "")
    .order("service_date", { ascending: false })
    .limit(50);

  if (status) query = query.eq("status", status);
  const { data: charges } = await query;

  const total = charges?.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0) || 0;
  const pending = charges?.filter(c => c.status === "pending").length || 0;
  const paid = charges?.filter(c => c.status === "paid").length || 0;
  const denied = charges?.filter(c => c.status === "denied").length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-500 text-sm mt-0.5">Charge capture and revenue tracking</p>
        </div>
        <Link href="/dashboard/billing/new" className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + Add Charge
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Charged", value: `$${total.toFixed(2)}`, color: "bg-slate-50 border-slate-200" },
          { label: "Pending", value: pending, color: "bg-amber-50 border-amber-100" },
          { label: "Paid", value: paid, color: "bg-emerald-50 border-emerald-100" },
          { label: "Denied", value: denied, color: denied > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {["", "pending", "submitted", "paid", "denied"].map(s => (
          <Link key={s} href={`/dashboard/billing?status=${s}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${status === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {s || "All"}
          </Link>
        ))}
      </div>

      {/* Charges table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!charges?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">💰</div>
            <p className="font-semibold text-slate-900 mb-1">No charges yet</p>
            <Link href="/dashboard/billing/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block mt-3">
              + Add First Charge
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">CPT</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnoses</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {charges.map(charge => {
                const client = Array.isArray(charge.client) ? charge.client[0] : charge.client;
                return (
                  <tr key={charge.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 text-sm">{client ? `${client.last_name}, ${client.first_name}` : "—"}</div>
                      <div className="text-xs text-slate-400">{client?.mrn || "—"}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{charge.service_date ? new Date(charge.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                    <td className="px-4 py-4">
                      <div className="font-mono font-bold text-sm text-slate-900">{charge.cpt_code}</div>
                      {charge.cpt_description && <div className="text-xs text-slate-400">{charge.cpt_description}</div>}
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-slate-500">{charge.icd10_codes?.slice(0,2).join(", ") || "—"}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">{charge.charge_amount ? `$${Number(charge.charge_amount).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[charge.status] || STATUS_COLORS.pending}`}>{charge.status}</span>
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
