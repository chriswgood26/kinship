import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  confirmed: "bg-blue-100 text-blue-700",
  arrived: "bg-teal-100 text-teal-700",
  scheduled: "bg-slate-100 text-slate-600",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-amber-100 text-amber-700",
  in_progress: "bg-purple-100 text-purple-700",
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const from = params.from || thirtyDaysAgo;
  const to = params.to || today;

  // ── Main appointments in range ────────────────────────────────────────────
  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select("id, appointment_date, appointment_type, status, start_time, is_group, group_name, provider_id, client_id, client:client_id(first_name, last_name, mrn)")
    .eq("organization_id", orgId)
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .order("appointment_date", { ascending: false });

  // ── 6-month trend ─────────────────────────────────────────────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const trendStart = sixMonthsAgo.toISOString().split("T")[0];

  const { data: trendAppts } = await supabaseAdmin
    .from("appointments")
    .select("appointment_date, status")
    .eq("organization_id", orgId)
    .gte("appointment_date", trendStart)
    .lte("appointment_date", today);

  // ── Provider names ────────────────────────────────────────────────────────
  const providerIds = [...new Set(appointments?.map(a => a.provider_id).filter(Boolean))];
  let providerMap: Record<string, string> = {};
  if (providerIds.length > 0) {
    const { data: providers } = await supabaseAdmin
      .from("user_profiles")
      .select("id, first_name, last_name")
      .in("id", providerIds as string[]);
    providers?.forEach(p => {
      providerMap[p.id] = `${p.last_name}, ${p.first_name}`;
    });
  }

  // ── KPI calculations ──────────────────────────────────────────────────────
  const total = appointments?.length || 0;
  const kept = appointments?.filter(a =>
    a.status === "completed" || a.status === "arrived" || a.status === "in_progress"
  ).length || 0;
  const noShow = appointments?.filter(a => a.status === "no_show").length || 0;
  const cancelled = appointments?.filter(a => a.status === "cancelled").length || 0;
  const scheduled = appointments?.filter(a => a.status === "scheduled" || a.status === "confirmed").length || 0;
  const attended = total - noShow - cancelled;
  const attendanceRate = attended > 0 && total > 0 ? Math.round((kept / attended) * 100) : 0;
  const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;
  const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  // ── 6-month trend data ────────────────────────────────────────────────────
  const monthLabels: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    monthLabels.push({ key, label });
  }

  type MonthBucket = { total: number; noShow: number; cancelled: number; kept: number };
  const monthlyData: Record<string, MonthBucket> = {};
  monthLabels.forEach(m => (monthlyData[m.key] = { total: 0, noShow: 0, cancelled: 0, kept: 0 }));
  trendAppts?.forEach(a => {
    const key = a.appointment_date?.slice(0, 7);
    if (key && monthlyData[key]) {
      monthlyData[key].total++;
      if (a.status === "no_show") monthlyData[key].noShow++;
      else if (a.status === "cancelled") monthlyData[key].cancelled++;
      else if (a.status === "completed" || a.status === "arrived" || a.status === "in_progress")
        monthlyData[key].kept++;
    }
  });
  const maxMonthly = Math.max(...Object.values(monthlyData).map(m => m.total), 1);

  // ── By appointment type ───────────────────────────────────────────────────
  const byType: Record<string, { total: number; noShow: number; cancelled: number }> = {};
  appointments?.forEach(a => {
    const t = a.appointment_type || "Unspecified";
    if (!byType[t]) byType[t] = { total: 0, noShow: 0, cancelled: 0 };
    byType[t].total++;
    if (a.status === "no_show") byType[t].noShow++;
    if (a.status === "cancelled") byType[t].cancelled++;
  });
  const typeEntries = Object.entries(byType)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);

  // ── By provider ───────────────────────────────────────────────────────────
  const byProvider: Record<string, { name: string; total: number; noShow: number; cancelled: number }> = {};
  appointments?.forEach(a => {
    const pid = a.provider_id || "__none__";
    const name = pid === "__none__" ? "Unassigned" : (providerMap[pid] || "Unknown");
    if (!byProvider[pid]) byProvider[pid] = { name, total: 0, noShow: 0, cancelled: 0 };
    byProvider[pid].total++;
    if (a.status === "no_show") byProvider[pid].noShow++;
    if (a.status === "cancelled") byProvider[pid].cancelled++;
  });
  const providerEntries = Object.entries(byProvider)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);

  // ── By day of week ────────────────────────────────────────────────────────
  const byDow: Array<{ total: number; noShow: number; cancelled: number }> = Array.from({ length: 7 }, () => ({
    total: 0, noShow: 0, cancelled: 0,
  }));
  appointments?.forEach(a => {
    if (!a.appointment_date) return;
    const dow = new Date(a.appointment_date + "T12:00:00").getDay();
    byDow[dow].total++;
    if (a.status === "no_show") byDow[dow].noShow++;
    if (a.status === "cancelled") byDow[dow].cancelled++;
  });
  const maxDow = Math.max(...byDow.map(d => d.total), 1);

  // ── Top no-show clients ───────────────────────────────────────────────────
  const clientNoShow: Record<string, { name: string; mrn?: string; noShow: number; total: number }> = {};
  appointments?.forEach(a => {
    if (!a.client_id) return;
    const client = Array.isArray(a.client) ? a.client[0] : a.client;
    const name = client ? `${client.last_name}, ${client.first_name}` : "Unknown";
    if (!clientNoShow[a.client_id]) clientNoShow[a.client_id] = { name, mrn: client?.mrn, noShow: 0, total: 0 };
    clientNoShow[a.client_id].total++;
    if (a.status === "no_show") clientNoShow[a.client_id].noShow++;
  });
  const topNoShowers = Object.entries(clientNoShow)
    .filter(([, v]) => v.noShow > 0)
    .sort((a, b) => b[1].noShow - a[1].noShow)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">No-Show & Cancellation Report</h1>
            <p className="text-slate-500 text-sm mt-0.5">Appointment attendance, no-show rates, and cancellation trends</p>
          </div>
        </div>
        <ReportActions reportTitle="No-Show & Cancellation Report" />
      </div>

      {/* Date range filter */}
      <form method="GET" className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 items-end flex-wrap">
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
        <div className="ml-auto flex gap-2 flex-wrap">
          {[
            { label: "This Month", from: firstOfMonth, to: today },
            { label: "Last 30d", from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], to: today },
            { label: "Last 90d", from: new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0], to: today },
            { label: "Last 6 Mo", from: new Date(Date.now() - 180 * 86400000).toISOString().split("T")[0], to: today },
          ].map(p => (
            <Link
              key={p.label}
              href={`/dashboard/reports/attendance?from=${p.from}&to=${p.to}`}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium transition-colors"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </form>

      {/* Hero metric strip */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6">
        <div className="grid grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-5xl font-bold text-teal-300">{attendanceRate}%</div>
            <div className="text-slate-300 text-sm mt-1">Attendance Rate</div>
            <div className="text-slate-500 text-xs mt-0.5">of attended appts</div>
          </div>
          <div>
            <div className={`text-5xl font-bold ${noShowRate >= 20 ? "text-red-400" : noShowRate >= 10 ? "text-amber-400" : "text-emerald-300"}`}>
              {noShowRate}%
            </div>
            <div className="text-slate-300 text-sm mt-1">No-Show Rate</div>
            <div className="text-slate-500 text-xs mt-0.5">{noShow} of {total}</div>
          </div>
          <div>
            <div className={`text-5xl font-bold ${cancelRate >= 20 ? "text-amber-400" : "text-slate-200"}`}>
              {cancelRate}%
            </div>
            <div className="text-slate-300 text-sm mt-1">Cancellation Rate</div>
            <div className="text-slate-500 text-xs mt-0.5">{cancelled} of {total}</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-white">{total}</div>
            <div className="text-slate-300 text-sm mt-1">Total Appointments</div>
            <div className="text-slate-500 text-xs mt-0.5">{from} → {to}</div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total", value: total, icon: "📅", color: "bg-slate-50 border-slate-200", text: "text-slate-900" },
          { label: "Kept / Attended", value: kept, icon: "✅", color: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
          { label: "No-Show", value: noShow, icon: "🚫", color: noShow > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200", text: noShow > 0 ? "text-red-600" : "text-slate-900" },
          { label: "Cancelled", value: cancelled, icon: "❌", color: cancelled > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200", text: cancelled > 0 ? "text-amber-700" : "text-slate-900" },
          { label: "Upcoming / Pending", value: scheduled, icon: "🗓️", color: "bg-blue-50 border-blue-100", text: "text-blue-700" },
        ].map(k => (
          <div key={k.label} className={`${k.color} border rounded-2xl p-4`}>
            <div className="text-xl mb-1">{k.icon}</div>
            <div className={`text-3xl font-bold ${k.text}`}>{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* 6-month trend + day-of-week pattern */}
      <div className="grid grid-cols-3 gap-4">
        {/* Monthly trend — 2/3 */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">6-Month Trend</h3>
          {!trendAppts?.length ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No appointment data in the last 6 months</div>
          ) : (
            <>
              <div className="flex items-end gap-3 h-40">
                {monthLabels.map(m => {
                  const data = monthlyData[m.key];
                  const totalH = maxMonthly > 0 ? (data.total / maxMonthly) * 100 : 0;
                  const noShowH = maxMonthly > 0 ? (data.noShow / maxMonthly) * 100 : 0;
                  const cancelH = maxMonthly > 0 ? (data.cancelled / maxMonthly) * 100 : 0;
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center gap-0.5 h-32">
                        <div className="flex-1 bg-emerald-400 rounded-t-sm transition-all" style={{ height: `${totalH}%` }} title={`Total: ${data.total}`} />
                        <div className="flex-1 bg-red-400 rounded-t-sm transition-all" style={{ height: `${noShowH}%` }} title={`No-Show: ${data.noShow}`} />
                        <div className="flex-1 bg-amber-400 rounded-t-sm transition-all" style={{ height: `${cancelH}%` }} title={`Cancelled: ${data.cancelled}`} />
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{m.label}</span>
                      <span className="text-xs font-semibold text-slate-700">{data.total}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-5 mt-3">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /><span className="text-xs text-slate-500">Total</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400" /><span className="text-xs text-slate-500">No-Show</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-400" /><span className="text-xs text-slate-500">Cancelled</span></div>
              </div>
            </>
          )}
        </div>

        {/* Day-of-week pattern — 1/3 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-1">By Day of Week</h3>
          <p className="text-xs text-slate-400 mb-4">Appointments in selected range</p>
          <div className="space-y-2">
            {DOW_LABELS.map((day, idx) => {
              const d = byDow[idx];
              const pct = maxDow > 0 ? (d.total / maxDow) * 100 : 0;
              const nsRate = d.total > 0 ? Math.round((d.noShow / d.total) * 100) : 0;
              return (
                <div key={day}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-medium text-slate-700 w-8">{day}</span>
                    <span className="text-slate-500">{d.total} appts</span>
                    {d.noShow > 0 && <span className="text-red-500 font-medium">{nsRate}% NS</span>}
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* By appointment type + by provider */}
      <div className="grid grid-cols-2 gap-4">
        {/* By type */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">By Appointment Type</h3>
          {typeEntries.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-6">No appointments in period</div>
          ) : (
            <div className="space-y-3">
              {typeEntries.map(([type, data]) => {
                const nsRate = data.total > 0 ? Math.round((data.noShow / data.total) * 100) : 0;
                const cancelPct = data.total > 0 ? Math.round((data.cancelled / data.total) * 100) : 0;
                const maxTotal = typeEntries[0][1].total;
                const barPct = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 truncate max-w-[160px]">{type}</span>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span className="text-slate-500">{data.total}</span>
                        {nsRate > 0 && <span className="text-red-500 font-medium">{nsRate}% NS</span>}
                        {cancelPct > 0 && <span className="text-amber-600 font-medium">{cancelPct}% CX</span>}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-teal-500 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By provider */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">By Provider</h3>
          {providerEntries.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-6">No provider data in period</div>
          ) : (
            <div className="space-y-3">
              {providerEntries.map(([pid, data]) => {
                const nsRate = data.total > 0 ? Math.round((data.noShow / data.total) * 100) : 0;
                const cancelPct = data.total > 0 ? Math.round((data.cancelled / data.total) * 100) : 0;
                const maxTotal = providerEntries[0][1].total;
                const barPct = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                return (
                  <div key={pid}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 truncate max-w-[160px]">{data.name}</span>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span className="text-slate-500">{data.total}</span>
                        {nsRate > 0 && <span className="text-red-500 font-medium">{nsRate}% NS</span>}
                        {cancelPct > 0 && <span className="text-amber-600 font-medium">{cancelPct}% CX</span>}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top no-show clients */}
      {topNoShowers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Clients with Highest No-Show Frequency</h3>
          <p className="text-xs text-slate-400 mb-4">Clients with one or more no-shows in selected period — may benefit from outreach or reminders</p>
          <div className="grid grid-cols-4 gap-3">
            {topNoShowers.map(([cid, data]) => {
              const nsRate = data.total > 0 ? Math.round((data.noShow / data.total) * 100) : 0;
              return (
                <Link
                  key={cid}
                  href={`/dashboard/clients/${cid}`}
                  className="bg-red-50 border border-red-100 rounded-xl p-3 hover:border-red-200 transition-colors no-underline"
                >
                  <div className="font-semibold text-sm text-slate-900 truncate">{data.name}</div>
                  {data.mrn && <div className="text-xs text-slate-400">{data.mrn}</div>}
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-red-600">{data.noShow}</span>
                    <span className="text-xs text-slate-500">no-show{data.noShow !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{nsRate}% of {data.total} appts</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Appointment log */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Appointment Log</h3>
          <span className="text-xs text-slate-400">{total} appointments in range</span>
        </div>
        {!appointments?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No appointments in this date range</div>
        ) : (
          <>
            <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-5 gap-4">
              <span>Client</span>
              <span>Date</span>
              <span>Type</span>
              <span>Provider</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
              {appointments.map(appt => {
                const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
                const providerName = appt.provider_id ? (providerMap[appt.provider_id] || "—") : "—";
                return (
                  <div key={appt.id} className="grid grid-cols-5 gap-4 px-5 py-3 items-center hover:bg-slate-50">
                    <div>
                      <div className="font-medium text-sm text-slate-900">
                        {client ? `${client.last_name}, ${client.first_name}` : "—"}
                      </div>
                      {client?.mrn && <div className="text-xs text-slate-400">{client.mrn}</div>}
                    </div>
                    <div className="text-sm text-slate-600">
                      {new Date(appt.appointment_date + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </div>
                    <div className="text-sm text-slate-600 capitalize truncate">{appt.appointment_type || "—"}</div>
                    <div className="text-sm text-slate-600 truncate">{providerName}</div>
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[appt.status] || "bg-slate-100 text-slate-500"}`}>
                        {appt.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today's Schedule", desc: "Front office view with status updates", href: "/dashboard/scheduling/front-office", icon: "🗓️" },
          { label: "All Appointments", desc: "Calendar and list view", href: "/dashboard/scheduling", icon: "📅" },
          { label: "Send Reminders", desc: "Automated reminder settings", href: "/dashboard/settings", icon: "🔔" },
        ].map(link => (
          <Link
            key={link.label}
            href={link.href}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition-shadow no-underline"
          >
            <span className="text-2xl">{link.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">{link.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{link.desc}</div>
            </div>
            <span className="text-slate-300 text-sm">→</span>
          </Link>
        ))}
      </div>

      {total === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">📅</div>
          <p className="font-semibold text-slate-700 mb-1">No appointments found in this period</p>
          <p className="text-sm text-slate-400 mb-4">Try adjusting the date range to see appointment data.</p>
          <Link href="/dashboard/scheduling"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
            View Schedule
          </Link>
        </div>
      )}
    </div>
  );
}
