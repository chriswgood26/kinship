import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function BarRow({
  label,
  value,
  max,
  color = "bg-teal-500",
  suffix = "",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-700 truncate max-w-[180px]">{label}</span>
        <span className="font-semibold text-slate-900 text-sm ml-2 shrink-0">
          {value}{suffix}
        </span>
      </div>
      <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function ProductivityReportPage({
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
  const from = params.from || firstOfMonth;
  const to = params.to || today;

  // Date range in days (for per-week rate calculations)
  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T23:59:59");
  const rangeDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000));
  const rangeWeeks = Math.max(1, rangeDays / 7);

  // ── Fetch clinicians in org ──────────────────────────────────────────────
  const { data: clinicians } = await supabaseAdmin
    .from("user_profiles")
    .select("id, first_name, last_name, credentials, role, roles, clerk_user_id, is_active")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("last_name");

  const activeClinicians = (clinicians || []).filter((c) => {
    const r: string[] = c.roles || (c.role ? [c.role] : []);
    return r.some((x) => ["clinician", "supervisor", "admin", "psychiatrist", "nurse_practitioner"].includes(x));
  });

  const clerkIds = activeClinicians.map((c) => c.clerk_user_id).filter(Boolean);

  // ── Fetch clinical notes (encounters attributed via signed_by_clerk_id) ──
  const { data: notes } = await supabaseAdmin
    .from("clinical_notes")
    .select(
      "id, is_signed, signed_by_clerk_id, signed_at, created_at, encounter:encounter_id(organization_id, encounter_date, encounter_type, duration_minutes, status)"
    )
    .gte("created_at", from + "T00:00:00")
    .lte("created_at", to + "T23:59:59");

  // Filter to org notes only (via encounter.organization_id)
  const orgNotes = (notes || []).filter((n) => {
    const enc = Array.isArray(n.encounter) ? n.encounter[0] : n.encounter;
    return enc?.organization_id === orgId;
  });

  // ── Fetch time entries for billable hours ────────────────────────────────
  const { data: timeEntries } = await supabaseAdmin
    .from("time_entries")
    .select("clinician_clerk_id, clinician_name, duration_minutes, is_billable, activity_type, entry_date, status")
    .eq("organization_id", orgId)
    .gte("entry_date", from)
    .lte("entry_date", to);

  // ── Fetch encounters directly (for total encounter count) ─────────────────
  const { data: encounters } = await supabaseAdmin
    .from("encounters")
    .select("id, encounter_date, encounter_type, status, duration_minutes")
    .eq("organization_id", orgId)
    .gte("encounter_date", from)
    .lte("encounter_date", to);

  // ── Aggregate per clinician ──────────────────────────────────────────────
  type ClinicianMetrics = {
    profile: (typeof activeClinicians)[0];
    notesCreated: number;
    notesSigned: number;
    avgSignHours: number; // avg hours from note creation to signing
    totalBillableMinutes: number;
    totalMinutes: number;
    encsByType: Record<string, number>;
    activityBreakdown: Record<string, number>;
  };

  const metricsMap = new Map<string, ClinicianMetrics>();
  for (const c of activeClinicians) {
    metricsMap.set(c.clerk_user_id, {
      profile: c,
      notesCreated: 0,
      notesSigned: 0,
      avgSignHours: 0,
      totalBillableMinutes: 0,
      totalMinutes: 0,
      encsByType: {},
      activityBreakdown: {},
    });
  }

  // Process notes
  const signTurnaroundByClerk: Record<string, number[]> = {};
  for (const note of orgNotes) {
    const clerkId = note.signed_by_clerk_id;
    if (!clerkId) continue;
    const m = metricsMap.get(clerkId);
    if (!m) continue;
    m.notesCreated++;
    if (note.is_signed) {
      m.notesSigned++;
      if (note.created_at && note.signed_at) {
        const created = new Date(note.created_at).getTime();
        const signed = new Date(note.signed_at).getTime();
        const hours = (signed - created) / 3600000;
        if (hours >= 0) {
          if (!signTurnaroundByClerk[clerkId]) signTurnaroundByClerk[clerkId] = [];
          signTurnaroundByClerk[clerkId].push(hours);
        }
      }
    }
  }

  // Compute avg sign turnaround
  for (const [clerkId, times] of Object.entries(signTurnaroundByClerk)) {
    const m = metricsMap.get(clerkId);
    if (m && times.length > 0) {
      m.avgSignHours = times.reduce((s, v) => s + v, 0) / times.length;
    }
  }

  // Process time entries
  for (const entry of timeEntries || []) {
    const clerkId = entry.clinician_clerk_id;
    if (!clerkId) continue;
    const m = metricsMap.get(clerkId);
    if (!m) continue;
    m.totalMinutes += entry.duration_minutes || 0;
    if (entry.is_billable) m.totalBillableMinutes += entry.duration_minutes || 0;
    const act: string = entry.activity_type || "other";
    m.activityBreakdown[act] = (m.activityBreakdown[act] || 0) + (entry.duration_minutes || 0);
  }

  // ── Org-wide totals ──────────────────────────────────────────────────────
  const totalEncounters = encounters?.length || 0;
  const signedEncounters = encounters?.filter((e) => e.status === "signed").length || 0;
  const totalNotes = orgNotes.length;
  const signedNotes = orgNotes.filter((n) => n.is_signed).length;
  const orgBillableMinutes = (timeEntries || []).filter((e) => e.is_billable).reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const orgTotalMinutes = (timeEntries || []).reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const orgBillableRate = orgTotalMinutes > 0 ? Math.round((orgBillableMinutes / orgTotalMinutes) * 100) : 0;

  // ── Build ranked list for display ───────────────────────────────────────
  const ranked = Array.from(metricsMap.values())
    .filter((m) => m.notesCreated > 0 || m.totalMinutes > 0)
    .sort((a, b) => b.totalBillableMinutes - a.totalBillableMinutes);

  const maxBillable = Math.max(...ranked.map((m) => m.totalBillableMinutes), 1);
  const maxNotes = Math.max(...ranked.map((m) => m.notesSigned), 1);

  // ── Encounter type breakdown ─────────────────────────────────────────────
  const encByType: Record<string, number> = {};
  for (const enc of encounters || []) {
    const t = enc.encounter_type || "Unknown";
    encByType[t] = (encByType[t] || 0) + 1;
  }
  const sortedEncTypes = Object.entries(encByType).sort((a, b) => b[1] - a[1]);
  const maxEncType = Math.max(...sortedEncTypes.map(([, v]) => v), 1);

  // ── Activity type breakdown (org-wide from time entries) ─────────────────
  const actByType: Record<string, { total: number; billable: number }> = {};
  for (const entry of timeEntries || []) {
    const act: string = entry.activity_type || "other";
    if (!actByType[act]) actByType[act] = { total: 0, billable: 0 };
    actByType[act].total += entry.duration_minutes || 0;
    if (entry.is_billable) actByType[act].billable += entry.duration_minutes || 0;
  }
  const sortedActivities = Object.entries(actByType).sort((a, b) => b[1].total - a[1].total).slice(0, 8);
  const maxActivity = Math.max(...sortedActivities.map(([, v]) => v.total), 1);

  const ACTIVITY_LABELS: Record<string, string> = {
    individual_therapy: "Individual Therapy",
    group_therapy: "Group Therapy",
    psychiatric_eval: "Psychiatric Evaluation",
    medication_management: "Medication Management",
    case_management: "Case Management",
    crisis_intervention: "Crisis Intervention",
    telehealth: "Telehealth",
    assessment: "Assessment / Intake",
    documentation: "Documentation",
    care_coordination: "Care Coordination",
    consultation: "Consultation",
    supervision: "Supervision",
    training: "Training",
    admin: "Administrative",
    travel: "Travel / Home Visit",
    other: "Other",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Productivity</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Clinician metrics, benchmarks, and billable hour tracking
            </p>
          </div>
        </div>
        <ReportActions reportTitle="Staff Productivity Report" />
      </div>

      {/* Date Filter */}
      <form
        method="GET"
        className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 items-end"
      >
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            From
          </label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            To
          </label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          type="submit"
          className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400"
        >
          Apply
        </button>
        <div className="ml-auto text-xs text-slate-400 self-center">
          {rangeDays} days · {rangeWeeks.toFixed(1)} weeks
        </div>
      </form>

      {/* KPI cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Total Encounters",
            value: totalEncounters,
            icon: "⚕️",
            sub: `${(totalEncounters / rangeWeeks).toFixed(1)}/wk avg`,
            color: "bg-teal-50 border-teal-100",
          },
          {
            label: "Signed Encounters",
            value: signedEncounters,
            icon: "✅",
            sub:
              totalEncounters > 0
                ? `${Math.round((signedEncounters / totalEncounters) * 100)}% signed`
                : "—",
            color:
              totalEncounters > 0 && signedEncounters / totalEncounters < 0.8
                ? "bg-amber-50 border-amber-100"
                : "bg-emerald-50 border-emerald-100",
          },
          {
            label: "Notes Signed",
            value: signedNotes,
            icon: "📝",
            sub:
              totalNotes > 0
                ? `${Math.round((signedNotes / totalNotes) * 100)}% of ${totalNotes}`
                : "—",
            color:
              totalNotes > 0 && signedNotes / totalNotes < 0.8
                ? "bg-amber-50 border-amber-100"
                : "bg-blue-50 border-blue-100",
          },
          {
            label: "Billable Hours",
            value: `${(orgBillableMinutes / 60).toFixed(1)}h`,
            icon: "💰",
            sub: `${(orgBillableMinutes / 60 / rangeWeeks).toFixed(1)}h/wk avg`,
            color: "bg-slate-50 border-slate-200",
          },
          {
            label: "Billable Rate",
            value: `${orgBillableRate}%`,
            icon: "📊",
            sub: `${formatHours(orgTotalMinutes)} total logged`,
            color:
              orgBillableRate >= 70
                ? "bg-emerald-50 border-emerald-100"
                : orgBillableRate >= 50
                ? "bg-amber-50 border-amber-100"
                : "bg-slate-50 border-slate-200",
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`${kpi.color} border rounded-2xl p-4`}>
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">{kpi.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Per-clinician table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Clinician Breakdown</h2>
          <span className="text-xs text-slate-400">{ranked.length} clinicians with activity</span>
        </div>
        {!ranked.length ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No productivity data for the selected period.
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 grid grid-cols-7 gap-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span className="col-span-2">Clinician</span>
              <span className="text-right">Notes Signed</span>
              <span className="text-right">Sign Rate</span>
              <span className="text-right">Avg Turnaround</span>
              <span className="text-right">Billable Hrs</span>
              <span className="text-right">Billable %</span>
            </div>
            <div className="divide-y divide-slate-50">
              {ranked.map((m) => {
                const p = m.profile;
                const displayName = `${p.last_name}, ${p.first_name}${p.credentials ? ` ${p.credentials}` : ""}`;
                const role: string[] = p.roles || (p.role ? [p.role] : []);
                const signRate =
                  m.notesCreated > 0
                    ? Math.round((m.notesSigned / m.notesCreated) * 100)
                    : null;
                const billableRate =
                  m.totalMinutes > 0
                    ? Math.round((m.totalBillableMinutes / m.totalMinutes) * 100)
                    : null;
                const billableHrs = (m.totalBillableMinutes / 60).toFixed(1);

                return (
                  <div
                    key={p.clerk_user_id}
                    className="px-5 py-4 grid grid-cols-7 gap-3 items-center hover:bg-slate-50 transition-colors"
                  >
                    <div className="col-span-2">
                      <div className="font-semibold text-sm text-slate-900">{displayName}</div>
                      <div className="text-xs text-slate-400 capitalize mt-0.5">
                        {role.join(", ").replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-900 text-sm">{m.notesSigned}</span>
                      <span className="text-slate-400 text-xs ml-1">/ {m.notesCreated}</span>
                    </div>
                    <div className="text-right">
                      {signRate !== null ? (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            signRate >= 90
                              ? "bg-emerald-100 text-emerald-700"
                              : signRate >= 70
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {signRate}%
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      {m.avgSignHours > 0 ? (
                        <span
                          className={
                            m.avgSignHours <= 24
                              ? "text-emerald-600 font-medium"
                              : m.avgSignHours <= 72
                              ? "text-amber-600 font-medium"
                              : "text-red-500 font-medium"
                          }
                        >
                          {m.avgSignHours < 1
                            ? `${Math.round(m.avgSignHours * 60)}m`
                            : `${m.avgSignHours.toFixed(1)}h`}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </div>
                    <div className="text-right font-semibold text-slate-900 text-sm">
                      {billableHrs}h
                    </div>
                    <div className="text-right">
                      {billableRate !== null ? (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            billableRate >= 70
                              ? "bg-emerald-100 text-emerald-700"
                              : billableRate >= 50
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {billableRate}%
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom section: two columns */}
      <div className="grid grid-cols-2 gap-5">
        {/* Encounter types */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Encounters by Type</h2>
          {sortedEncTypes.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No encounter data</p>
          ) : (
            <div className="space-y-3">
              {sortedEncTypes.slice(0, 8).map(([type, count]) => (
                <BarRow
                  key={type}
                  label={type}
                  value={count}
                  max={maxEncType}
                  color="bg-teal-500"
                />
              ))}
            </div>
          )}
        </div>

        {/* Activity breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Time by Activity</h2>
          {sortedActivities.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No time entry data</p>
          ) : (
            <div className="space-y-3">
              {sortedActivities.map(([act, { total, billable }]) => {
                const billablePct = total > 0 ? Math.round((billable / total) * 100) : 0;
                return (
                  <div key={act}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 truncate max-w-[180px]">
                        {ACTIVITY_LABELS[act] || act}
                      </span>
                      <div className="text-right shrink-0 ml-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {formatHours(total)}
                        </span>
                        {billable > 0 && (
                          <span className="text-teal-600 text-xs ml-1">({billablePct}% billable)</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${Math.round((total / maxActivity) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Benchmark reference */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <h2 className="font-semibold text-slate-900 mb-3">📊 Productivity Benchmarks</h2>
        <div className="grid grid-cols-4 gap-4 text-sm">
          {[
            {
              metric: "Note Signature Rate",
              target: "≥ 90%",
              note: "Notes signed within 24 hours",
              color: "text-teal-600",
            },
            {
              metric: "Documentation Turnaround",
              target: "≤ 24h",
              note: "Industry standard for behavioral health",
              color: "text-blue-600",
            },
            {
              metric: "Billable Hour Rate",
              target: "≥ 70%",
              note: "Direct service vs. total logged hours",
              color: "text-indigo-600",
            },
            {
              metric: "Encounters per Week",
              target: "20–30",
              note: "Typical full-time outpatient caseload",
              color: "text-emerald-600",
            },
          ].map((b) => (
            <div key={b.metric} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={`text-lg font-bold ${b.color}`}>{b.target}</div>
              <div className="font-medium text-slate-900 text-sm mt-0.5">{b.metric}</div>
              <div className="text-xs text-slate-400 mt-1">{b.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
