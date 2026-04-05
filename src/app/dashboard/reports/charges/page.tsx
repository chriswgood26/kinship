import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChargesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const from = params.from || firstOfMonth;
  const to = params.to || today;

  const { data: charges } = await supabaseAdmin
    .from("charges")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .gte("service_date", from)
    .lte("service_date", to)
    .order("service_date", { ascending: false })
    .limit(200);

  const total = charges?.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0) || 0;
  const paid = charges?.filter(c => c.status === "paid").reduce((s, c) => s + (Number(c.charge_amount) || 0), 0) || 0;
  const pending = charges?.filter(c => c.status === "pending").reduce((s, c) => s + (Number(c.charge_amount) || 0), 0) || 0;
  const denied = charges?.filter(c => c.status === "denied").reduce((s, c) => s + (Number(c.charge_amount) || 0), 0) || 0;

  const byCPT: Record<string, { count: number; total: number }> = {};
  charges?.forEach(c => {
    if (!byCPT[c.cpt_code]) byCPT[c.cpt_code] = { count: 0, total: 0 };
    byCPT[c.cpt_code].count++;
    byCPT[c.cpt_code].total += Number(c.charge_amount) || 0;
  });

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    submitted: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
    denied: "bg-red-100 text-red-600",
    void: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Charge Summary</h1>
          <p className="text-slate-500 text-sm mt-0.5">Revenue and billing activity</p>
        </div>
      </div>
        <ReportActions reportTitle="Charge Summary Report" />
      </div>

      {/* Date filter */}
      <form method="GET" className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From</label>
          <input type="date" name="from" defaultValue={from} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To</label>
          <input type="date" name="to" defaultValue={to} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button type="submit" className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">Apply</button>
      </form>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Charged", value: `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "bg-slate-50 border-slate-200" },
          { label: "Paid", value: `$${paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "bg-emerald-50 border-emerald-100" },
          { label: "Pending", value: `$${pending.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "bg-amber-50 border-amber-100" },
          { label: "Denied", value: `$${denied.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: denied > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* CPT breakdown */}
      {Object.keys(byCPT).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Revenue by CPT Code</h3>
          <div className="space-y-3">
            {Object.entries(byCPT).sort((a, b) => b[1].total - a[1].total).map(([cpt, data]) => {
              const maxTotal = Math.max(...Object.values(byCPT).map(v => v.total));
              return (
                <div key={cpt} className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-slate-700 w-16 flex-shrink-0">{cpt}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div className="bg-teal-500 h-6 rounded-full flex items-center justify-between px-3" style={{ width: `${(data.total / maxTotal) * 100}%` }}>
                      <span className="text-white text-xs font-bold truncate">${data.total.toFixed(0)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 w-16 text-right flex-shrink-0">{data.count} claims</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charges table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-5 gap-4">
          <span>Patient</span><span>Date</span><span>CPT</span><span>Amount</span><span>Status</span>
        </div>
        {!charges?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No charges in this date range</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {charges.map(c => {
              const patient = Array.isArray(c.patient) ? c.patient[0] : c.patient;
              return (
                <div key={c.id} className="grid grid-cols-5 gap-4 px-5 py-3.5 items-center hover:bg-slate-50">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
                    <div className="text-xs text-slate-400">{patient?.mrn}</div>
                  </div>
                  <div className="text-sm text-slate-600">{new Date(c.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  <div>
                    <div className="font-mono text-sm font-bold text-slate-900">{c.cpt_code}</div>
                    <div className="text-xs text-slate-400">{c.cpt_description}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">${Number(c.charge_amount).toFixed(2)}</div>
                  <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-500"}`}>{c.status}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
