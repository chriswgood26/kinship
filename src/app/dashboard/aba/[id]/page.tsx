import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";
import ABCDataEntry from "./ABCDataEntry";

export const dynamic = "force-dynamic";

const FUNCTION_LABELS: Record<string, string> = {
  attention: "Attention",
  escape: "Escape/Avoidance",
  tangible: "Tangible",
  sensory: "Sensory (Automatic)",
  unknown: "Unknown",
  multiple: "Multiple",
};

const MEASUREMENT_LABELS: Record<string, string> = {
  frequency: "Frequency (occurrences/session)",
  rate: "Rate (per unit time)",
  duration: "Duration (seconds)",
  interval: "Interval Recording",
  abc_only: "ABC Narrative Only",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  reduced: "bg-teal-100 text-teal-700",
  eliminated: "bg-violet-100 text-violet-700",
  on_hold: "bg-amber-100 text-amber-700",
  discontinued: "bg-slate-100 text-slate-400",
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: "bg-yellow-100 text-yellow-700",
  moderate: "bg-orange-100 text-orange-700",
  severe: "bg-red-100 text-red-700",
};

const FUNCTION_COLORS: Record<string, string> = {
  attention: "bg-blue-100 text-blue-700",
  escape: "bg-orange-100 text-orange-700",
  tangible: "bg-green-100 text-green-700",
  sensory: "bg-violet-100 text-violet-700",
  unknown: "bg-slate-100 text-slate-600",
};

type Incident = {
  id: string;
  incident_date: string;
  incident_time: string | null;
  setting: string | null;
  frequency_count: number | null;
  duration_seconds: number | null;
  severity: string | null;
  antecedent: string | null;
  behavior_description: string | null;
  consequence: string | null;
  perceived_function: string | null;
  staff_name: string;
  notes: string | null;
  created_at: string;
};

export default async function ABADetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { data: program } = await supabaseAdmin
    .from("behavior_programs")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (!program) notFound();

  const { data: rawIncidents } = await supabaseAdmin
    .from("behavior_incidents")
    .select("*")
    .eq("behavior_program_id", id)
    .order("incident_date", { ascending: true })
    .order("incident_time", { ascending: true })
    .limit(200);

  const incidents: Incident[] = rawIncidents || [];
  const client = Array.isArray(program.client) ? program.client[0] : program.client;

  // Compute summary stats
  const totalIncidents = incidents.reduce((sum, i) => sum + (i.frequency_count || 1), 0);
  const totalSessions = incidents.length;

  // Last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentIncidents = incidents.filter(i => new Date(i.incident_date) >= thirtyDaysAgo);
  const recentCount = recentIncidents.reduce((sum, i) => sum + (i.frequency_count || 1), 0);

  // Baseline comparison
  let percentChange: number | null = null;
  if (program.baseline_value && totalSessions >= 3 && program.measurement_type !== "abc_only") {
    const avgRecent = recentCount / Math.max(recentIncidents.length, 1);
    percentChange = Math.round(((avgRecent - program.baseline_value) / program.baseline_value) * 100);
  }

  // Chart data — frequency per entry (last 20)
  const chartIncidents = incidents.slice(-20);
  const maxChartVal = Math.max(
    ...chartIncidents.map(i => i.frequency_count || i.duration_seconds || 1),
    program.baseline_value || 1,
    1
  );

  // Function distribution for incidents
  const functionCounts: Record<string, number> = {};
  incidents.forEach(i => {
    if (i.perceived_function) {
      functionCounts[i.perceived_function] = (functionCounts[i.perceived_function] || 0) + 1;
    }
  });

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/aba" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{program.behavior_name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[program.status] || STATUS_COLORS.active}`}>
                {program.status?.replace("_", " ")}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                program.behavior_type === "target"
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                {program.behavior_type === "target" ? "↓ Target Behavior" : "↑ Replacement Behavior"}
              </span>
            </div>
            {client && (
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block"
              >
                {client.last_name}, {client.first_name} · MRN: {client.mrn || "—"}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Program details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Program Details</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Function</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {program.behavior_function
                ? FUNCTION_LABELS[program.behavior_function] || program.behavior_function
                : <span className="text-slate-400">Not assessed</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Measurement</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{MEASUREMENT_LABELS[program.measurement_type] || program.measurement_type}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Baseline</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {program.baseline_value != null
                ? `${program.baseline_value}${program.measurement_type === "duration" ? "s" : " occurrences"}/session`
                : <span className="text-slate-400">—</span>}
            </dd>
          </div>
          {program.reduction_target_pct && (
            <div>
              <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Reduction Goal</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{program.reduction_target_pct}% reduction</dd>
            </div>
          )}
          {program.interval_minutes && (
            <div>
              <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Observation Period</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{program.interval_minutes} minutes</dd>
            </div>
          )}
        </div>

        {program.operational_definition && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Operational Definition</dt>
            <dd className="text-sm text-slate-700">{program.operational_definition}</dd>
          </div>
        )}

        {program.intervention_strategy && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Intervention Strategy</dt>
            <dd className="text-sm text-slate-700">{program.intervention_strategy}</dd>
          </div>
        )}

        {(program.preventive_strategies || program.consequence_strategies) && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
            {program.preventive_strategies && (
              <div>
                <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Preventive Strategies</dt>
                <dd className="text-sm text-slate-700">{program.preventive_strategies}</dd>
              </div>
            )}
            {program.consequence_strategies && (
              <div>
                <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Consequence / Staff Response</dt>
                <dd className="text-sm text-slate-700">{program.consequence_strategies}</dd>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Total Recorded</div>
          <div className="text-4xl font-bold text-slate-900">{totalIncidents}</div>
          <div className="text-xs text-slate-400 mt-1">{totalSessions} entries logged</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Last 30 Days</div>
          <div className="text-4xl font-bold text-slate-900">{recentCount}</div>
          <div className="text-xs text-slate-400 mt-1">{recentIncidents.length} entries</div>
        </div>
        <div className={`bg-white rounded-2xl border p-5 ${
          percentChange != null && percentChange < -20 ? "border-emerald-200" :
          percentChange != null && percentChange > 20 ? "border-red-200" :
          "border-slate-200"
        }`}>
          <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">vs. Baseline</div>
          <div className={`text-4xl font-bold ${
            percentChange == null ? "text-slate-900" :
            percentChange < 0 ? "text-emerald-600" :
            percentChange > 0 ? "text-red-500" :
            "text-slate-900"
          }`}>
            {percentChange != null
              ? `${percentChange > 0 ? "+" : ""}${percentChange}%`
              : "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {percentChange != null
              ? percentChange < 0
                ? "reduction from baseline ✓"
                : "increase from baseline"
              : "Need baseline & ≥3 entries"}
          </div>
        </div>
      </div>

      {/* Progress chart */}
      {chartIncidents.length > 0 && program.measurement_type !== "abc_only" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Behavior Frequency Chart</h2>
            <div className="text-xs text-slate-400">Last {chartIncidents.length} entries</div>
          </div>
          {program.baseline_value != null && (
            <div className="text-xs text-slate-400 mb-3">Baseline: {program.baseline_value} occurrences/session</div>
          )}
          <div className="flex items-end gap-1.5 h-32">
            {chartIncidents.map((inc, i) => {
              const val = inc.frequency_count || inc.duration_seconds || 1;
              const height = maxChartVal > 0 ? (val / maxChartVal) * 100 : 0;
              const atOrBelowBaseline = program.baseline_value != null && val <= program.baseline_value;
              return (
                <div
                  key={inc.id || i}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${inc.incident_date}: ${val}`}
                >
                  <div className="w-full flex flex-col justify-end h-28">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        program.behavior_type === "target"
                          ? atOrBelowBaseline ? "bg-emerald-500" : "bg-red-400"
                          : "bg-teal-400"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">
                    {new Date(inc.incident_date + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
          {program.behavior_type === "target" && program.baseline_value != null && (
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-xs text-slate-500">At or below baseline ({program.baseline_value})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-400" />
                <span className="text-xs text-slate-500">Above baseline</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Function distribution */}
      {Object.keys(functionCounts).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Perceived Function Distribution</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(functionCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([fn, count]) => (
                <div
                  key={fn}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
                    FUNCTION_COLORS[fn] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span className="font-bold text-lg">{count}</span>
                  <span className="text-sm font-medium">{FUNCTION_LABELS[fn] || fn}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ABC data entry */}
      <ABCDataEntry programId={id} measurementType={program.measurement_type} />

      {/* Incident log */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Incident Log</h2>
          <span className="text-xs text-slate-400">{totalSessions} entries · {totalIncidents} occurrences</span>
        </div>
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No incidents recorded yet — use the form above to add your first entry
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {[...incidents].reverse().map(inc => (
              <div key={inc.id} className="px-5 py-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Date / meta row */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        {new Date(inc.incident_date + "T12:00:00").toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                        {inc.incident_time && (
                          <span className="font-normal text-slate-400 ml-1">
                            at {inc.incident_time.slice(0, 5)}
                          </span>
                        )}
                      </span>
                      {inc.severity && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SEVERITY_COLORS[inc.severity] || "bg-slate-100"}`}>
                          {inc.severity}
                        </span>
                      )}
                      {inc.perceived_function && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${FUNCTION_COLORS[inc.perceived_function] || "bg-slate-100"}`}>
                          {FUNCTION_LABELS[inc.perceived_function] || inc.perceived_function}
                        </span>
                      )}
                      {inc.setting && (
                        <span className="text-xs text-slate-400">📍 {inc.setting}</span>
                      )}
                      {inc.frequency_count != null && inc.frequency_count > 1 && (
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          ×{inc.frequency_count}
                        </span>
                      )}
                      {inc.duration_seconds != null && (
                        <span className="text-xs text-slate-500">{inc.duration_seconds}s</span>
                      )}
                      <span className="text-xs text-slate-400">— {inc.staff_name}</span>
                    </div>

                    {/* ABC grid */}
                    {(inc.antecedent || inc.behavior_description || inc.consequence) && (
                      <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3 text-xs">
                        <div>
                          <div className="font-bold text-slate-500 uppercase tracking-wide mb-0.5 text-[10px]">A — Antecedent</div>
                          <div className="text-slate-700">{inc.antecedent || <span className="text-slate-400 italic">not recorded</span>}</div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-500 uppercase tracking-wide mb-0.5 text-[10px]">B — Behavior</div>
                          <div className="text-slate-700">{inc.behavior_description || <span className="text-slate-400 italic">not recorded</span>}</div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-500 uppercase tracking-wide mb-0.5 text-[10px]">C — Consequence</div>
                          <div className="text-slate-700">{inc.consequence || <span className="text-slate-400 italic">not recorded</span>}</div>
                        </div>
                      </div>
                    )}

                    {inc.notes && (
                      <div className="text-xs text-slate-400 mt-1.5">{inc.notes}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
