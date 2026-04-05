import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "bg-slate-200",
  moderate: "bg-amber-400",
  serious: "bg-orange-500",
  critical: "bg-red-500",
};

const SEVERITY_TEXT: Record<string, string> = {
  minor: "text-slate-600",
  moderate: "text-amber-700",
  serious: "text-orange-700",
  critical: "text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-400",
  under_review: "bg-amber-400",
  submitted_to_state: "bg-blue-400",
  closed: "bg-emerald-500",
};

const INCIDENT_ICONS: Record<string, string> = {
  "Behavioral Incident": "😤",
  "Fall / Injury": "🤕",
  "Medication Error": "💊",
  "Elopement": "🚶",
  "Abuse / Neglect": "⚠️",
  "Property Damage": "🏠",
  "Medical Emergency": "🚑",
  "Restraint Use": "🔒",
  "Self-Harm": "🆘",
  "Workplace Injury": "🦺",
  "Near Miss": "⚡",
  "Staff Misconduct": "🚫",
  "Visitor Injury": "👥",
  "Other": "📋",
};

export default async function IncidentReportSummaryPage({
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
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
  const from = params.from || ninetyDaysAgo;
  const to = params.to || today;

  // Incidents in selected range
  const { data: incidents } = await supabaseAdmin
    .from("incident_reports")
    .select("id, incident_date, incident_type, severity, status, location, injury_occurred, medical_attention, state_report_required, state_report_submitted_at, guardian_notified_at, incident_category, created_at")
    .eq("organization_id", orgId)
    .gte("incident_date", from)
    .lte("incident_date", to)
    .order("incident_date", { ascending: false });

  // Last 6 months for trend (regardless of date range filter)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const trendStart = sixMonthsAgo.toISOString().split("T")[0];

  const { data: trendIncidents } = await supabaseAdmin
    .from("incident_reports")
    .select("incident_date, severity, status")
    .eq("organization_id", orgId)
    .gte("incident_date", trendStart)
    .lte("incident_date", today);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const total = incidents?.length ?? 0;
  const openCount = incidents?.filter(i => i.status === "open").length ?? 0;
  const criticalSerious = incidents?.filter(i => i.severity === "critical" || i.severity === "serious").length ?? 0;
  const withInjury = incidents?.filter(i => i.injury_occurred).length ?? 0;
  const stateReportPending = incidents?.filter(i => i.state_report_required && !i.state_report_submitted_at).length ?? 0;
  const guardianPending = incidents?.filter(i => i.status !== "closed" && !i.guardian_notified_at).length ?? 0;
  const injuryRate = total > 0 ? Math.round((withInjury / total) * 100) : 0;

  // ── 6-month trend ────────────────────────────────────────────────────────
  const monthLabels: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    monthLabels.push({ key, label });
  }

  const monthlyData: Record<string, { total: number; serious: number }> = {};
  monthLabels.forEach(m => (monthlyData[m.key] = { total: 0, serious: 0 }));
  trendIncidents?.forEach(i => {
    const key = i.incident_date?.slice(0, 7);
    if (key && monthlyData[key]) {
      monthlyData[key].total++;
      if (i.severity === "critical" || i.severity === "serious") monthlyData[key].serious++;
    }
  });
  const maxMonthly = Math.max(...Object.values(monthlyData).map(m => m.total), 1);

  // ── By incident type ──────────────────────────────────────────────────────
  const byType: Record<string, number> = {};
  incidents?.forEach(i => {
    const t = i.incident_type || "Other";
    byType[t] = (byType[t] || 0) + 1;
  });
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const maxType = Math.max(...typeEntries.map(([, v]) => v), 1);

  // ── By severity ────────────────────────────────────────────────────────────
  const bySeverity: Record<string, number> = { minor: 0, moderate: 0, serious: 0, critical: 0 };
  incidents?.forEach(i => {
    if (i.severity && bySeverity[i.severity] !== undefined) bySeverity[i.severity]++;
  });

  // ── By status ─────────────────────────────────────────────────────────────
  const byStatus: Record<string, number> = { open: 0, under_review: 0, submitted_to_state: 0, closed: 0 };
  incidents?.forEach(i => {
    if (i.status && byStatus[i.status] !== undefined) byStatus[i.status]++;
  });

  // ── By location ────────────────────────────────────────────────────────────
  const byLocation: Record<string, number> = {};
  incidents?.forEach(i => {
    if (i.location) byLocation[i.location] = (byLocation[i.location] || 0) + 1;
  });
  const locationEntries = Object.entries(byLocation).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxLocation = Math.max(...locationEntries.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/incidents" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Incident Report Summary</h1>
            <p className="text-slate-500 text-sm mt-0.5">Aggregate incident reporting and trends</p>
          </div>
        </div>
        <ReportActions reportTitle="Incident Report Summary" />
      </div>

      {/* Compliance alerts */}
      {(stateReportPending > 0 || guardianPending > 0) && (
        <div className="space-y-2">
          {stateReportPending > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
              <span className="text-xl">🚨</span>
              <span className="text-sm text-red-800 font-medium">
                {stateReportPending} incident{stateReportPending > 1 ? "s require" : " requires"} state reporting — submit within required timeframe
              </span>
              <Link href="/dashboard/incidents?status=open" className="ml-auto text-xs font-semibold text-red-700 hover:text-red-900">
                Review →
              </Link>
            </div>
          )}
          {guardianPending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
              <span className="text-xl">📞</span>
              <span className="text-sm text-amber-800 font-medium">
                {guardianPending} incident{guardianPending > 1 ? "s have" : " has"} not had guardian notification documented
              </span>
              <Link href="/dashboard/incidents" className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900">
                Review →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Date range filter */}
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
        <div className="ml-auto flex gap-2">
          {[
            { label: "This Month", from: firstOfMonth, to: today },
            {
              label: "Last 30d",
              from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
              to: today,
            },
            {
              label: "Last 90d",
              from: new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0],
              to: today,
            },
            {
              label: "Last 12 Mo",
              from: new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0],
              to: today,
            },
          ].map(p => (
            <Link
              key={p.label}
              href={`/dashboard/reports/incidents?from=${p.from}&to=${p.to}`}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium transition-colors"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </form>

      {/* KPI cards */}
      <div className="grid grid-cols-6 gap-4">
        {[
          {
            label: "Total Incidents",
            value: total,
            sub: `in selected period`,
            color: "bg-slate-50 border-slate-200",
            textColor: "text-slate-900",
            icon: "📋",
          },
          {
            label: "Open",
            value: openCount,
            sub: "needs action",
            color: openCount > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200",
            textColor: openCount > 0 ? "text-red-600" : "text-slate-900",
            icon: "🔴",
          },
          {
            label: "Serious / Critical",
            value: criticalSerious,
            sub: `${total > 0 ? Math.round((criticalSerious / total) * 100) : 0}% of total`,
            color: criticalSerious > 0 ? "bg-orange-50 border-orange-100" : "bg-slate-50 border-slate-200",
            textColor: criticalSerious > 0 ? "text-orange-700" : "text-slate-900",
            icon: "⚠️",
          },
          {
            label: "Injuries",
            value: withInjury,
            sub: `${injuryRate}% injury rate`,
            color: withInjury > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200",
            textColor: withInjury > 0 ? "text-amber-700" : "text-slate-900",
            icon: "🤕",
          },
          {
            label: "State Reports Due",
            value: stateReportPending,
            sub: "awaiting submission",
            color: stateReportPending > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200",
            textColor: stateReportPending > 0 ? "text-red-600" : "text-slate-900",
            icon: "🚨",
          },
          {
            label: "Guardian Notices Pending",
            value: guardianPending,
            sub: "not yet documented",
            color: guardianPending > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200",
            textColor: guardianPending > 0 ? "text-amber-700" : "text-slate-900",
            icon: "📞",
          },
        ].map(k => (
          <div key={k.label} className={`${k.color} border rounded-2xl p-4`}>
            <div className="text-xl mb-1">{k.icon}</div>
            <div className={`text-3xl font-bold ${k.textColor}`}>{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
            <div className="text-xs text-slate-400 mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 6-month trend + severity breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {/* Monthly trend — 2/3 */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">6-Month Incident Trend</h3>
          {trendIncidents?.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No incident data in the last 6 months</div>
          ) : (
            <>
              <div className="flex items-end gap-3 h-40">
                {monthLabels.map(m => {
                  const data = monthlyData[m.key];
                  const totalH = maxMonthly > 0 ? (data.total / maxMonthly) * 100 : 0;
                  const seriousH = maxMonthly > 0 ? (data.serious / maxMonthly) * 100 : 0;
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center gap-0.5 h-32">
                        <div
                          className="flex-1 bg-slate-200 rounded-t-md transition-all"
                          style={{ height: `${totalH}%` }}
                          title={`Total: ${data.total}`}
                        />
                        <div
                          className="flex-1 bg-red-400 rounded-t-md transition-all"
                          style={{ height: `${seriousH}%` }}
                          title={`Serious/Critical: ${data.serious}`}
                        />
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{m.label}</span>
                      <span className="text-xs font-semibold text-slate-700">{data.total}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-slate-200" />
                  <span className="text-xs text-slate-500">All Incidents</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-400" />
                  <span className="text-xs text-slate-500">Serious / Critical</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Severity breakdown — 1/3 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-1">By Severity</h3>
          <p className="text-xs text-slate-400 mb-4">Incidents in selected period</p>
          <div className="space-y-3">
            {(["critical", "serious", "moderate", "minor"] as const).map(sev => {
              const count = bySeverity[sev] ?? 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={sev}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`capitalize font-medium ${SEVERITY_TEXT[sev]}`}>{sev}</span>
                    <span className="font-semibold text-slate-700">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-2 ${SEVERITY_COLORS[sev]} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
              <span className="text-slate-500">Total</span>
              <span className="font-bold text-slate-900">{total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Incident types + status breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {/* By incident type */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">By Incident Type</h3>
          {typeEntries.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-6">No incidents in selected period</div>
          ) : (
            <div className="space-y-3">
              {typeEntries.slice(0, 8).map(([type, count]) => {
                const pct = maxType > 0 ? (count / maxType) * 100 : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">{INCIDENT_ICONS[type] || "📋"}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 truncate">{type}</span>
                        <span className="font-semibold text-slate-900 ml-2 flex-shrink-0">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">By Status</h3>
          <div className="space-y-3 mb-6">
            {([
              { key: "open", label: "Open" },
              { key: "under_review", label: "Under Review" },
              { key: "submitted_to_state", label: "Submitted to State" },
              { key: "closed", label: "Closed" },
            ] as const).map(s => {
              const count = byStatus[s.key] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-32 flex-shrink-0">{s.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={`${STATUS_COLORS[s.key]} h-5 rounded-full flex items-center justify-end pr-2 transition-all`}
                      style={{ width: `${pct}%` }}
                    >
                      {pct >= 15 && <span className="text-white text-xs font-bold">{pct}%</span>}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-10 text-right flex-shrink-0">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Location breakdown */}
          {locationEntries.length > 0 && (
            <>
              <h3 className="font-semibold text-slate-900 mb-3 pt-4 border-t border-slate-100">By Location</h3>
              <div className="space-y-2">
                {locationEntries.map(([loc, count]) => {
                  const pct = maxLocation > 0 ? (count / maxLocation) * 100 : 0;
                  return (
                    <div key={loc} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-32 flex-shrink-0 truncate">{loc}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div className="h-4 bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-6 text-right flex-shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "All Incidents", desc: "View and manage incident log", href: "/dashboard/incidents", icon: "📋" },
          { label: "Report New Incident", desc: "Document a new incident", href: "/dashboard/incidents/new", icon: "➕" },
          { label: "Open Incidents", desc: "Incidents requiring action", href: "/dashboard/incidents?status=open", icon: "🔴" },
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
          <div className="text-4xl mb-3">✅</div>
          <p className="font-semibold text-slate-700 mb-1">No incidents in this period</p>
          <p className="text-sm text-slate-400 mb-4">Adjust the date range or report an incident when one occurs.</p>
          <Link href="/dashboard/incidents/new"
            className="bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-400 inline-block">
            + Report Incident
          </Link>
        </div>
      )}
    </div>
  );
}
