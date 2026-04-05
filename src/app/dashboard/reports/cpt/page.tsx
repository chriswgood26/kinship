import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

export default async function CPTRevenueReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await getOrgId(userId);

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  const from = params.from || firstOfYear;
  const to = params.to || today;

  const { data: charges } = await supabaseAdmin
    .from("charges")
    .select("cpt_code, cpt_description, charge_amount, paid_amount, status, units")
    .eq("organization_id", orgId)
    .gte("service_date", from)
    .lte("service_date", to);

  // Aggregate by CPT
  const byCPT: Record<
    string,
    {
      desc: string;
      count: number;
      units: number;
      charged: number;
      paid: number;
      denied: number;
      pending: number;
    }
  > = {};

  charges?.forEach(c => {
    if (!c.cpt_code) return;
    if (!byCPT[c.cpt_code]) {
      byCPT[c.cpt_code] = { desc: c.cpt_description || "", count: 0, units: 0, charged: 0, paid: 0, denied: 0, pending: 0 };
    }
    byCPT[c.cpt_code].count++;
    byCPT[c.cpt_code].units += Number(c.units) || 1;
    byCPT[c.cpt_code].charged += Number(c.charge_amount) || 0;
    if (c.status === "paid") {
      byCPT[c.cpt_code].paid += Number(c.paid_amount) || Number(c.charge_amount) || 0;
    }
    if (c.status === "denied") byCPT[c.cpt_code].denied += Number(c.charge_amount) || 0;
    if (c.status === "pending") byCPT[c.cpt_code].pending += Number(c.charge_amount) || 0;
  });

  const cptRows = Object.entries(byCPT).sort((a, b) => b[1].charged - a[1].charged);
  const maxCharged = Math.max(...cptRows.map(([, v]) => v.charged), 1);

  const grandTotal = cptRows.reduce((s, [, v]) => s + v.charged, 0);
  const grandPaid = cptRows.reduce((s, [, v]) => s + v.paid, 0);
  const grandDenied = cptRows.reduce((s, [, v]) => s + v.denied, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Revenue by CPT Code</h1>
            <p className="text-slate-500 text-sm mt-0.5">Procedure code performance and collection analysis</p>
          </div>
        </div>
        <ReportActions reportTitle="Revenue by CPT Code" />
      </div>

      {/* Date filter */}
      <form method="GET" className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From</label>
          <input type="date" name="from" defaultValue={from}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To</label>
          <input type="date" name="to" defaultValue={to}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button type="submit" className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
          Apply
        </button>
      </form>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Charged", value: `$${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "bg-slate-50 border-slate-200" },
          { label: "Collected", value: `$${grandPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "bg-emerald-50 border-emerald-100" },
          { label: "Denied", value: `$${grandDenied.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: grandDenied > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "Unique CPT Codes", value: cptRows.length.toString(), color: "bg-blue-50 border-blue-100" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* CPT bar chart */}
      {cptRows.length > 0 ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Revenue Breakdown</h3>
            <div className="space-y-4">
              {cptRows.map(([cpt, data]) => {
                const collRate = data.charged > 0 ? Math.round((data.paid / data.charged) * 100) : 0;
                const denialRate = data.charged > 0 ? Math.round((data.denied / data.charged) * 100) : 0;
                return (
                  <div key={cpt}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">{cpt}</span>
                        {data.desc && <span className="text-xs text-slate-400 truncate max-w-xs">{data.desc}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0 ml-4">
                        <span>{data.count} claims · {data.units} units</span>
                        <span className={`font-semibold ${collRate >= 80 ? "text-teal-600" : collRate >= 50 ? "text-amber-600" : "text-slate-500"}`}>
                          {collRate}% collected
                        </span>
                        {denialRate > 0 && (
                          <span className="text-red-500 font-semibold">{denialRate}% denied</span>
                        )}
                      </div>
                    </div>
                    {/* Stacked bar: paid (teal) + pending (amber) + denied (red) */}
                    <div className="h-7 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-teal-500 h-7 transition-all"
                        style={{ width: `${(data.paid / maxCharged) * 100}%` }}
                        title={`Paid: $${data.paid.toFixed(2)}`}
                      />
                      <div
                        className="bg-amber-400 h-7 transition-all"
                        style={{ width: `${(data.pending / maxCharged) * 100}%` }}
                        title={`Pending: $${data.pending.toFixed(2)}`}
                      />
                      <div
                        className="bg-red-400 h-7 transition-all"
                        style={{ width: `${(data.denied / maxCharged) * 100}%` }}
                        title={`Denied: $${data.denied.toFixed(2)}`}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span>Total: <span className="font-semibold text-slate-700">${data.charged.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
                      <span className="text-teal-600">Paid: ${data.paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      {data.pending > 0 && <span className="text-amber-600">Pending: ${data.pending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>}
                      {data.denied > 0 && <span className="text-red-500">Denied: ${data.denied.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-5 pt-4 border-t border-slate-100">
              {[
                { color: "bg-teal-500", label: "Paid/Collected" },
                { color: "bg-amber-400", label: "Pending" },
                { color: "bg-red-400", label: "Denied" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${l.color}`} />
                  <span className="text-xs text-slate-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-sm">CPT Code Summary Table</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CPT Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Claims</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Units</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Charged</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Collection %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cptRows.map(([cpt, data]) => {
                  const collRate = data.charged > 0 ? Math.round((data.paid / data.charged) * 100) : 0;
                  return (
                    <tr key={cpt} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono font-bold text-sm text-slate-900">{cpt}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{data.desc || "—"}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{data.count}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{data.units}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-slate-900">
                        ${data.charged.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-teal-700">
                        ${data.paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          collRate >= 80 ? "bg-teal-100 text-teal-700" :
                          collRate >= 50 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {collRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={4} className="px-5 py-3 text-sm font-bold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-right text-slate-900">
                    ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right text-teal-700">
                    ${grandPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      grandTotal > 0 && (grandPaid / grandTotal) >= 0.8
                        ? "bg-teal-100 text-teal-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {grandTotal > 0 ? Math.round((grandPaid / grandTotal) * 100) : 0}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-4">💳</div>
          <h2 className="font-semibold text-slate-900 text-lg mb-2">No charges in this period</h2>
          <p className="text-slate-500 text-sm mb-6">Adjust the date range or add charges to see CPT revenue analysis.</p>
          <Link href="/dashboard/billing/new"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
            + Add Charge
          </Link>
        </div>
      )}
    </div>
  );
}
