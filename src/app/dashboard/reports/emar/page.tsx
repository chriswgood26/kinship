import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EmarReportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const orgId = "34e600b3-beb0-440c-88c4-20032185e727";
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Get all active medication orders with patient info
  const { data: orders } = await supabaseAdmin
    .from("medication_orders")
    .select("id, medication_name, dosage, frequency, is_controlled, controlled_schedule, client:client_id(id, first_name, last_name, mrn)")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("medication_name");

  // Get administrations in past 30 days
  const { data: admins } = await supabaseAdmin
    .from("medication_administrations")
    .select("order_id, status, scheduled_time, administered_at, administered_by, refused_reason")
    .gte("scheduled_time", thirtyDaysAgo)
    .order("scheduled_time", { ascending: false });

  // Build compliance stats per order
  const adminMap: Record<string, { total: number; administered: number; missed: number; refused: number; held: number }> = {};
  for (const a of (admins || [])) {
    if (!adminMap[a.order_id]) adminMap[a.order_id] = { total: 0, administered: 0, missed: 0, refused: 0, held: 0 };
    adminMap[a.order_id].total++;
    if (a.status === "administered") adminMap[a.order_id].administered++;
    else if (a.status === "missed") adminMap[a.order_id].missed++;
    else if (a.status === "refused") adminMap[a.order_id].refused++;
    else if (a.status === "held") adminMap[a.order_id].held++;
  }

  const orderStats = (orders || []).map(o => {
    const stats = adminMap[o.id] || { total: 0, administered: 0, missed: 0, refused: 0, held: 0 };
    const rate = stats.total > 0 ? Math.round((stats.administered / stats.total) * 100) : null;
    const patient = Array.isArray(o.client) ? o.client[0] : o.client;
    return { ...o, patient, stats, rate };
  }).sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100));

  const controlled = orderStats.filter(o => o.is_controlled);
  const lowCompliance = orderStats.filter(o => o.rate !== null && o.rate < 80);
  const overallRate = orderStats.filter(o => o.rate !== null).length > 0
    ? Math.round(orderStats.filter(o => o.rate !== null).reduce((s, o) => s + (o.rate || 0), 0) / orderStats.filter(o => o.rate !== null).length)
    : null;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">eMAR Compliance Report</h1>
            <p className="text-slate-500 text-sm mt-0.5">Medication administration compliance — last 30 days</p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Overall Compliance", value: overallRate !== null ? `${overallRate}%` : "—", color: overallRate && overallRate >= 90 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : overallRate && overallRate >= 75 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-700" },
          { label: "Active Orders", value: orderStats.length, color: "bg-slate-50 border-slate-200 text-slate-700" },
          { label: "Low Compliance (<80%)", value: lowCompliance.length, color: lowCompliance.length > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Controlled Substances", value: controlled.length, color: "bg-purple-50 border-purple-200 text-purple-700" },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-4 ${stat.color}`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs font-semibold mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Low compliance alert */}
      {lowCompliance.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <div className="font-semibold text-red-800 mb-2">⚠️ {lowCompliance.length} medication{lowCompliance.length !== 1 ? "s" : ""} below 80% compliance</div>
          <div className="flex flex-wrap gap-2">
            {lowCompliance.map(o => (
              <span key={o.id} className="text-xs bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-semibold">
                {o.patient?.last_name} — {o.medication_name} ({o.rate}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Medication Compliance by Patient</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Medication</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Compliance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Administered</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Missed</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Refused</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Held</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orderStats.map(o => (
                <tr key={o.id} className={`hover:bg-slate-50 ${o.rate !== null && o.rate < 80 ? "bg-red-50/30" : ""}`}>
                  <td className="px-5 py-3">
                    {o.patient ? (
                      <Link href={`/dashboard/clients/${o.patient.id}`} className="font-semibold text-slate-900 hover:text-teal-600">
                        {o.patient.last_name}, {o.patient.first_name}
                      </Link>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 text-sm">{o.medication_name}</div>
                    <div className="text-xs text-slate-400">{o.dosage}</div>
                    {o.is_controlled && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">Schedule {o.controlled_schedule}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{o.frequency}</td>
                  <td className="px-4 py-3">
                    {o.rate !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 w-20">
                          <div className={`h-2 rounded-full ${o.rate >= 90 ? "bg-emerald-500" : o.rate >= 75 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${o.rate}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${o.rate >= 90 ? "text-emerald-600" : o.rate >= 75 ? "text-amber-600" : "text-red-600"}`}>{o.rate}%</span>
                      </div>
                    ) : <span className="text-xs text-slate-400">No data</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">{o.stats.administered}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{o.stats.missed || "—"}</td>
                  <td className="px-4 py-3 text-sm text-red-500">{o.stats.refused || "—"}</td>
                  <td className="px-4 py-3 text-sm text-amber-600">{o.stats.held || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controlled substance section */}
      {controlled.length > 0 && (
        <div className="bg-white rounded-2xl border border-purple-200 overflow-hidden">
          <div className="px-5 py-4 bg-purple-50 border-b border-purple-100">
            <h2 className="font-semibold text-purple-900">🔐 Controlled Substance Audit Log</h2>
            <p className="text-xs text-purple-600 mt-0.5">All administrations require witness documentation. Discrepancies must be reported immediately.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Medication</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Schedule</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Administered</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {controlled.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">{o.patient?.last_name}, {o.patient?.first_name}</td>
                  <td className="px-4 py-3"><div className="font-medium text-slate-900">{o.medication_name}</div><div className="text-xs text-slate-400">{o.dosage}</div></td>
                  <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded">Schedule {o.controlled_schedule}</span></td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">{o.stats.administered} doses</td>
                  <td className="px-4 py-3"><span className={`text-xs font-bold ${(o.rate || 0) >= 90 ? "text-emerald-600" : "text-amber-600"}`}>{o.rate}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
