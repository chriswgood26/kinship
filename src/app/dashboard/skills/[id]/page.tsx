import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";
import SkillDataEntry from "./SkillDataEntry";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  daily_living: "Daily Living", communication: "Communication", social: "Social",
  academic: "Academic", vocational: "Vocational", self_care: "Self-Care",
  motor: "Motor", safety: "Safety", other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  mastered: "bg-teal-100 text-teal-700",
  on_hold: "bg-amber-100 text-amber-700",
  discontinued: "bg-slate-100 text-slate-400",
};

type DataPoint = {
  id: string;
  recorded_date: string;
  staff_name: string;
  trials_total: number | null;
  trials_correct: number | null;
  prompt_level: string | null;
  duration_seconds: number | null;
  frequency_count: number | null;
  session_notes: string | null;
  created_at: string;
};

export default async function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { data: skill } = await supabaseAdmin
    .from("skill_programs")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (!skill) notFound();

  const { data: rawDataPoints } = await supabaseAdmin
    .from("skill_data_points")
    .select("*")
    .eq("skill_program_id", id)
    .order("recorded_date", { ascending: true })
    .limit(60);

  const dataPoints: DataPoint[] = rawDataPoints || [];
  const client = Array.isArray(skill.client) ? skill.client[0] : skill.client;

  // Compute summary stats
  const totalSessions = dataPoints.length;
  const recentPoints = dataPoints.slice(-10); // last 10 sessions

  let avgPercent: number | null = null;
  let recentAvgPercent: number | null = null;
  let trend: "up" | "down" | "stable" | null = null;

  if (skill.measurement_type === "percent_correct") {
    const validPoints = dataPoints.filter(d => d.trials_total != null && d.trials_total > 0);
    const recentValid = recentPoints.filter(d => d.trials_total != null && d.trials_total > 0);

    if (validPoints.length > 0) {
      avgPercent = Math.round(
        validPoints.reduce((sum, d) => sum + ((d.trials_correct || 0) / (d.trials_total || 1)) * 100, 0) / validPoints.length
      );
    }
    if (recentValid.length >= 2) {
      const first = recentValid.slice(0, Math.ceil(recentValid.length / 2));
      const second = recentValid.slice(Math.ceil(recentValid.length / 2));
      const firstAvg = first.reduce((s, d) => s + ((d.trials_correct || 0) / (d.trials_total || 1)) * 100, 0) / first.length;
      const secondAvg = second.reduce((s, d) => s + ((d.trials_correct || 0) / (d.trials_total || 1)) * 100, 0) / second.length;
      recentAvgPercent = Math.round(secondAvg);
      trend = secondAvg > firstAvg + 2 ? "up" : secondAvg < firstAvg - 2 ? "down" : "stable";
    }
  }

  // Chart data — percent correct per session (last 20)
  const chartPoints = dataPoints.slice(-20);
  const maxChartVal = Math.max(
    skill.target_value || 100,
    ...chartPoints.map(d => {
      if (skill.measurement_type === "percent_correct" && d.trials_total) {
        return Math.round(((d.trials_correct || 0) / d.trials_total) * 100);
      }
      return d.frequency_count || d.duration_seconds || 0;
    }),
    1
  );

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/skills" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{skill.skill_name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[skill.status] || STATUS_COLORS.active}`}>
                {skill.status?.replace("_", " ")}
              </span>
            </div>
            {client && (
              <Link href={`/dashboard/clients/${client.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
                {client.last_name}, {client.first_name} · MRN: {client.mrn || "—"}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/reports/skills?client_id=${skill.client_id}`}
            className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">
            📊 Progress Report
          </Link>
        </div>
      </div>

      {/* Skill overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Program Details</h2>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Category</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{CATEGORY_LABELS[skill.category] || skill.category}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Measurement</dt>
            <dd className="font-medium text-slate-900 mt-0.5 capitalize">{skill.measurement_type?.replace(/_/g, " ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Baseline</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {skill.baseline_value != null ? `${skill.baseline_value}${skill.measurement_type === "percent_correct" ? "%" : ""}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Target</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {skill.target_value != null ? `${skill.target_value}${skill.measurement_type === "percent_correct" ? "%" : ""}` : "—"}
            </dd>
          </div>
        </div>
        {skill.mastery_criteria && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Mastery Criteria</dt>
            <dd className="text-sm text-slate-700">{skill.mastery_criteria}</dd>
          </div>
        )}
        {skill.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Description</dt>
            <dd className="text-sm text-slate-700">{skill.description}</dd>
          </div>
        )}
      </div>

      {/* Performance summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Total Sessions</div>
          <div className="text-4xl font-bold text-slate-900">{totalSessions}</div>
          <div className="text-xs text-slate-400 mt-1">data points recorded</div>
        </div>
        {skill.measurement_type === "percent_correct" && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Overall Average</div>
              <div className={`text-4xl font-bold ${avgPercent != null && skill.target_value != null && avgPercent >= skill.target_value ? "text-emerald-600" : "text-slate-900"}`}>
                {avgPercent != null ? `${avgPercent}%` : "—"}
              </div>
              {skill.target_value != null && avgPercent != null && (
                <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${avgPercent >= skill.target_value ? "bg-emerald-500" : "bg-teal-400"}`}
                    style={{ width: `${Math.min((avgPercent / (skill.target_value || 100)) * 100, 100)}%` }}
                  />
                </div>
              )}
              {skill.target_value != null && (
                <div className="text-xs text-slate-400 mt-1">Target: {skill.target_value}%</div>
              )}
            </div>
            <div className={`bg-white rounded-2xl border p-5 ${trend === "up" ? "border-emerald-200" : trend === "down" ? "border-red-200" : "border-slate-200"}`}>
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Recent Trend</div>
              <div className={`text-4xl font-bold ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-slate-900"}`}>
                {trend === "up" ? "↑" : trend === "down" ? "↓" : trend === "stable" ? "→" : "—"}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {recentAvgPercent != null ? `${recentAvgPercent}% recent avg` : totalSessions < 4 ? "Need more data" : "—"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Progress chart */}
      {chartPoints.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Progress Chart</h2>
            <div className="text-xs text-slate-400">Last {chartPoints.length} sessions</div>
          </div>
          <div className="flex items-end gap-2 h-40">
            {chartPoints.map((dp, i) => {
              let val = 0;
              if (skill.measurement_type === "percent_correct" && dp.trials_total) {
                val = Math.round(((dp.trials_correct || 0) / dp.trials_total) * 100);
              } else if (skill.measurement_type === "frequency") {
                val = dp.frequency_count || 0;
              } else if (skill.measurement_type === "duration") {
                val = dp.duration_seconds || 0;
              }
              const height = maxChartVal > 0 ? (val / maxChartVal) * 100 : 0;
              const atTarget = skill.target_value != null && val >= skill.target_value;
              return (
                <div key={dp.id || i} className="flex-1 flex flex-col items-center gap-1" title={`${dp.recorded_date}: ${val}${skill.measurement_type === "percent_correct" ? "%" : ""}`}>
                  <div className="w-full flex flex-col justify-end h-32">
                    <div
                      className={`w-full rounded-t-md transition-all ${atTarget ? "bg-emerald-500" : "bg-teal-400"}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400" style={{ fontSize: "9px" }}>
                    {new Date(dp.recorded_date + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
          {skill.target_value != null && (
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" /><span className="text-xs text-slate-500">At or above target ({skill.target_value}{skill.measurement_type === "percent_correct" ? "%" : ""})</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-teal-400" /><span className="text-xs text-slate-500">Below target</span></div>
            </div>
          )}
        </div>
      )}

      {/* Data entry */}
      <SkillDataEntry skillId={id} measurementType={skill.measurement_type} promptLevels={skill.prompt_levels || []} targetTrials={skill.target_trials || 10} />

      {/* Session log */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Session Log</h2>
          <span className="text-xs text-slate-400">{totalSessions} sessions recorded</span>
        </div>
        {dataPoints.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No data recorded yet — use the form above to add your first session</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {skill.measurement_type === "percent_correct" ? "Trials" : skill.measurement_type === "frequency" ? "Count" : "Duration"}
                  </th>
                  {skill.measurement_type === "percent_correct" && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">% Correct</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prompt</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...dataPoints].reverse().map(dp => {
                  const pct = dp.trials_total ? Math.round(((dp.trials_correct || 0) / dp.trials_total) * 100) : null;
                  const atTarget = skill.target_value != null && pct != null && pct >= skill.target_value;
                  return (
                    <tr key={dp.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-sm text-slate-700 font-medium">
                        {new Date(dp.recorded_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {skill.measurement_type === "percent_correct"
                          ? (dp.trials_correct != null && dp.trials_total != null ? `${dp.trials_correct}/${dp.trials_total}` : "—")
                          : skill.measurement_type === "frequency"
                          ? (dp.frequency_count != null ? dp.frequency_count : "—")
                          : (dp.duration_seconds != null ? `${dp.duration_seconds}s` : "—")
                        }
                      </td>
                      {skill.measurement_type === "percent_correct" && (
                        <td className="px-4 py-3">
                          {pct != null ? (
                            <span className={`text-sm font-bold ${atTarget ? "text-emerald-600" : "text-slate-900"}`}>
                              {pct}%
                            </span>
                          ) : <span className="text-slate-400 text-sm">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs text-slate-500">{dp.prompt_level || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{dp.staff_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{dp.session_notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
