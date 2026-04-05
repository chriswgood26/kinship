import Link from "next/link";
import SearchInput from '@/components/SearchInput';
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "bg-slate-100 text-slate-600",
  moderate: "bg-amber-100 text-amber-700",
  serious: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-600",
  under_review: "bg-amber-100 text-amber-700",
  submitted_to_state: "bg-blue-100 text-blue-700",
  closed: "bg-emerald-100 text-emerald-700",
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
  "Other": "📋",
};

export default async function IncidentsPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; severity?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const statusFilter = params.status || "";
  const severityFilter = params.severity || "";

  let query = supabaseAdmin
    .from("incident_reports")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .order("incident_date", { ascending: false })
    .limit(100);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (severityFilter) query = query.eq("severity", severityFilter);

  const { data: incidents } = await query;

  const open = incidents?.filter(i => i.status === "open").length || 0;
  const stateRequired = incidents?.filter(i => i.state_report_required && !i.state_report_submitted_at).length || 0;
  const guardianPending = incidents?.filter(i => !i.guardian_notified_at).length || 0;
  const critical = incidents?.filter(i => i.severity === "critical" || i.severity === "serious").length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incident Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Document, track and report behavioral and safety incidents</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/reports/incidents"
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors text-sm">
            📊 Summary &amp; Trends
          </Link>
          <Link href="/dashboard/incidents/new"
            className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-red-400 transition-colors text-sm">
            + Report Incident
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {(stateRequired > 0 || guardianPending > 0) && (
        <div className="space-y-2">
          {stateRequired > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
              <span className="text-xl">🚨</span>
              <span className="text-sm text-red-800 font-medium">
                {stateRequired} incident{stateRequired > 1 ? "s require" : " requires"} state reporting — submit within required timeframe
              </span>
            </div>
          )}
          {guardianPending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
              <span className="text-xl">📞</span>
              <span className="text-sm text-amber-800 font-medium">
                {guardianPending} incident{guardianPending > 1 ? "s have" : " has"} not had guardian notification documented
              </span>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Open Incidents", value: open, color: open > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "State Report Required", value: stateRequired, color: stateRequired > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "Guardian Notification Pending", value: guardianPending, color: guardianPending > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Serious / Critical", value: critical, color: critical > 0 ? "bg-orange-50 border-orange-100" : "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <SearchInput placeholder="Search patient, incident type..." />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[["", "All Status"], ["open", "Open"], ["under_review", "Under Review"], ["submitted_to_state", "Submitted"], ["closed", "Closed"]].map(([val, label]) => (
            <Link key={val} href={`/dashboard/incidents?status=${val}&severity=${severityFilter}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[["", "All Severity"], ["minor", "Minor"], ["moderate", "Moderate"], ["serious", "Serious"], ["critical", "Critical"]].map(([val, label]) => (
            <Link key={val} href={`/dashboard/incidents?status=${statusFilter}&severity=${val}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${severityFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Incidents list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!incidents?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-slate-900 mb-1">No incidents reported</p>
            <p className="text-slate-500 text-sm">Document incidents when they occur for compliance and tracking</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {incidents.map(inc => {
              const patient = Array.isArray(inc.patient) ? inc.patient[0] : inc.patient;
              return (
                <Link key={inc.id} href={`/dashboard/incidents/${inc.id}`}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors no-underline">
                  <div className="text-2xl flex-shrink-0 mt-0.5">{INCIDENT_ICONS[inc.incident_type] || "📋"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-slate-900 text-sm">{inc.incident_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SEVERITY_COLORS[inc.severity] || ""}`}>{inc.severity}</span>
                      {inc.state_report_required && !inc.state_report_submitted_at && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">🚨 State Report Due</span>
                      )}
                      {inc.injury_occurred && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Injury</span>}
                    </div>
                    <div className="text-sm font-medium text-teal-700">{patient ? `${patient.last_name}, ${patient.first_name}` : <span className="text-slate-400 italic">No client — {inc.incident_category || "general"} incident</span>}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{inc.description}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-slate-500">{new Date(inc.incident_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize mt-1 inline-block ${STATUS_COLORS[inc.status] || ""}`}>{inc.status?.replace("_", " ")}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
