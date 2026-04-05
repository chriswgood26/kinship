import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EncountersReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; type?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const from = params.from || thirtyDaysAgo;
  const to = params.to || today;
  const type = params.type || "";

  let query = supabaseAdmin
    .from("encounters")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .gte("encounter_date", from)
    .lte("encounter_date", to)
    .order("encounter_date", { ascending: false })
    .limit(100);

  if (type) query = query.eq("encounter_type", type);

  const { data: encounters } = await query;

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  encounters?.forEach(e => {
    byType[e.encounter_type || "Unknown"] = (byType[e.encounter_type || "Unknown"] || 0) + 1;
    byStatus[e.status || "unknown"] = (byStatus[e.status || "unknown"] || 0) + 1;
  });

  const STATUS_COLORS: Record<string, string> = {
    signed: "bg-emerald-100 text-emerald-700",
    in_progress: "bg-amber-100 text-amber-700",
    scheduled: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Encounters Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">{encounters?.length || 0} encounters in selected date range</p>
        </div>
      </div>
        <ReportActions reportTitle="Encounters Report" />
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From</label>
          <input type="date" name="from" defaultValue={from} className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To</label>
          <input type="date" name="to" defaultValue={to} className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Type</label>
          <select name="type" defaultValue={type} className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Types</option>
            <option>Individual Therapy</option>
            <option>Group Therapy</option>
            <option>Psychiatric Evaluation</option>
            <option>Psychiatric Follow-up</option>
            <option>Crisis Intervention</option>
          </select>
        </div>
        <button type="submit" className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">Apply</button>
      </form>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-3xl font-bold text-slate-900">{encounters?.length || 0}</div>
          <div className="text-sm text-slate-500 mt-0.5">Total Encounters</div>
        </div>
        {Object.entries(byStatus).map(([status, count]) => (
          <div key={status} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="text-3xl font-bold text-slate-900">{count}</div>
            <div className="text-sm text-slate-500 mt-0.5 capitalize">{status.replace("_", " ")}</div>
          </div>
        ))}
      </div>

      {/* By type breakdown */}
      {Object.keys(byType).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">By Encounter Type</h3>
          <div className="space-y-3">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const max = Math.max(...Object.values(byType));
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-48 flex-shrink-0">{type}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div className="bg-teal-500 h-5 rounded-full flex items-center justify-end pr-2" style={{ width: `${(count / max) * 100}%` }}>
                      <span className="text-white text-xs font-bold">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 grid grid-cols-5 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Patient</span><span>Date</span><span>Type</span><span>Chief Complaint</span><span>Status</span>
        </div>
        {!encounters?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No encounters in this date range</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {encounters.map(enc => {
              const patient = Array.isArray(enc.patient) ? enc.patient[0] : enc.patient;
              return (
                <Link key={enc.id} href={`/dashboard/encounters`} className="grid grid-cols-5 gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors items-center">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
                    <div className="text-xs text-slate-400">{patient?.mrn}</div>
                  </div>
                  <div className="text-sm text-slate-600">{new Date(enc.encounter_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  <div className="text-sm text-slate-600">{enc.encounter_type || "—"}</div>
                  <div className="text-xs text-slate-500 truncate">{enc.chief_complaint || "—"}</div>
                  <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[enc.status] || "bg-slate-100 text-slate-500"}`}>{enc.status?.replace("_", " ")}</span></div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
