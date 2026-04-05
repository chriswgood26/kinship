import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";
import ReportActions from "@/components/ReportActions";

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

type SkillProgram = {
  id: string;
  skill_name: string;
  category: string;
  measurement_type: string;
  status: string;
  target_value: number | null;
  baseline_value: number | null;
  client_id: string;
  client: { id: string; first_name: string; last_name: string; mrn: string | null } | null;
};

type DataPoint = {
  skill_program_id: string;
  recorded_date: string;
  trials_total: number | null;
  trials_correct: number | null;
  frequency_count: number | null;
  duration_seconds: number | null;
};

export default async function SkillsProgressReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; client_id?: string; status?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const from = params.from || ninetyDaysAgo;
  const to = params.to || today;
  const clientFilter = params.client_id || "";
  const statusFilter = params.status || "active";

  // Fetch skill programs
  let skillQuery = supabaseAdmin
    .from("skill_programs")
    .select("id, skill_name, category, measurement_type, status, target_value, baseline_value, client_id, client:client_id(id, first_name, last_name, mrn)")
    .eq("organization_id", orgId)
    .order("client_id")
    .order("skill_name");

  if (statusFilter && statusFilter !== "all") skillQuery = skillQuery.eq("status", statusFilter);
  if (clientFilter) skillQuery = skillQuery.eq("client_id", clientFilter);

  const { data: skills } = await skillQuery;
  const skillList: SkillProgram[] = (skills || []).map(s => ({
    ...s,
    client: Array.isArray(s.client) ? s.client[0] : s.client,
  }));

  const skillIds = skillList.map(s => s.id);

  // Fetch data points in date range
  let dataPoints: DataPoint[] = [];
  if (skillIds.length > 0) {
    const { data: dpData } = await supabaseAdmin
      .from("skill_data_points")
      .select("skill_program_id, recorded_date, trials_total, trials_correct, frequency_count, duration_seconds")
      .eq("organization_id", orgId)
      .in("skill_program_id", skillIds)
      .gte("recorded_date", from)
      .lte("recorded_date", to)
      .order("recorded_date");
    dataPoints = dpData || [];
  }

  // Group data points by skill
  const dpBySkill: Record<string, DataPoint[]> = {};
  dataPoints.forEach(dp => {
    if (!dpBySkill[dp.skill_program_id]) dpBySkill[dp.skill_program_id] = [];
    dpBySkill[dp.skill_program_id].push(dp);
  });

  // Compute per-skill stats
  type SkillStats = {
    skill: SkillProgram;
    sessions: number;
    avgPercent: number | null;
    recentPercent: number | null;
    improvement: number | null;
    atTarget: boolean;
  };

  const skillStats: SkillStats[] = skillList.map(skill => {
    const pts = dpBySkill[skill.id] || [];
    let avgPercent: number | null = null;
    let recentPercent: number | null = null;
    let improvement: number | null = null;

    if (skill.measurement_type === "percent_correct" && pts.length > 0) {
      const valid = pts.filter(d => d.trials_total != null && d.trials_total > 0);
      if (valid.length > 0) {
        const all = valid.map(d => ((d.trials_correct || 0) / (d.trials_total || 1)) * 100);
        avgPercent = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
        recentPercent = Math.round(all[all.length - 1]);
        if (all.length >= 2) improvement = Math.round(all[all.length - 1] - all[0]);
      }
    }

    const atTarget = skill.target_value != null && recentPercent != null && recentPercent >= skill.target_value;

    return { skill, sessions: pts.length, avgPercent, recentPercent, improvement, atTarget };
  });

  // Summary KPIs
  const totalSkills = skillList.length;
  const activeSkills = skillList.filter(s => s.status === "active").length;
  const masteredSkills = skillList.filter(s => s.status === "mastered").length;
  const atTargetCount = skillStats.filter(s => s.atTarget).length;
  const totalSessions = dataPoints.length;
  const uniqueClients = new Set(skillList.map(s => s.client_id)).size;

  // Category breakdown
  const byCategory: Record<string, { total: number; sessions: number }> = {};
  skillList.forEach(s => {
    if (!byCategory[s.category]) byCategory[s.category] = { total: 0, sessions: 0 };
    byCategory[s.category].total++;
    byCategory[s.category].sessions += (dpBySkill[s.id] || []).length;
  });
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
  const maxCat = Math.max(...categoryEntries.map(([, v]) => v.total), 1);

  // Clients list for filter
  const { data: allClients } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("last_name");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Skills Progress Report</h1>
            <p className="text-slate-500 text-sm mt-0.5">Skill acquisition tracking and progress toward mastery</p>
          </div>
        </div>
        <ReportActions reportTitle="Skills Progress Report" />
      </div>

      {/* Filters */}
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
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Individual</label>
          <select name="client_id" defaultValue={clientFilter}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Individuals</option>
            {allClients?.map(c => (
              <option key={c.id} value={c.id}>{c.last_name}, {c.first_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Status</label>
          <select name="status" defaultValue={statusFilter}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="mastered">Mastered</option>
            <option value="on_hold">On Hold</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
        <button type="submit" className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
          Apply
        </button>
        <div className="ml-auto flex gap-2 flex-wrap">
          {[
            { label: "This Month", from: firstOfMonth, to: today },
            { label: "Last 30d", from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], to: today },
            { label: "Last 90d", from: ninetyDaysAgo, to: today },
            { label: "Last 6 Mo", from: new Date(Date.now() - 180 * 86400000).toISOString().split("T")[0], to: today },
          ].map(p => (
            <Link key={p.label}
              href={`/dashboard/reports/skills?from=${p.from}&to=${p.to}${clientFilter ? `&client_id=${clientFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium transition-colors">
              {p.label}
            </Link>
          ))}
        </div>
      </form>

      {/* KPI strip */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6">
        <div className="grid grid-cols-5 gap-6 text-center">
          {[
            { label: "Skill Programs", value: totalSkills, sub: statusFilter === "all" ? "total" : statusFilter, color: "text-white" },
            { label: "Active", value: activeSkills, sub: "in progress", color: "text-teal-300" },
            { label: "Mastered", value: masteredSkills, sub: "goal achieved", color: "text-emerald-300" },
            { label: "At Target", value: atTargetCount, sub: "in period", color: atTargetCount > 0 ? "text-emerald-300" : "text-slate-300" },
            { label: "Sessions Recorded", value: totalSessions, sub: `${from} → ${to}`, color: "text-slate-200" },
          ].map(k => (
            <div key={k.label}>
              <div className={`text-4xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-slate-300 text-sm mt-1">{k.label}</div>
              <div className="text-slate-500 text-xs mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {totalSkills === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <p className="font-semibold text-slate-900 mb-1">No skill programs found</p>
          <p className="text-slate-500 text-sm mb-4">Create skill acquisition programs to track progress</p>
          <Link href="/dashboard/skills/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
            + New Skill Program
          </Link>
        </div>
      ) : (
        <>
          {/* Category breakdown + client count */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">By Skill Category</h3>
              <div className="space-y-3">
                {categoryEntries.map(([cat, data]) => {
                  const pct = maxCat > 0 ? (data.total / maxCat) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{CATEGORY_LABELS[cat] || cat}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">{data.sessions} sessions</span>
                          <span className="font-semibold text-slate-900">{data.total} skills</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-1">Summary</h3>
              <p className="text-xs text-slate-400 mb-4">In selected period</p>
              <div className="space-y-4">
                {[
                  { label: "Individuals Tracked", value: uniqueClients, icon: "👤" },
                  { label: "Active Programs", value: activeSkills, icon: "🎯" },
                  { label: "Mastered Skills", value: masteredSkills, icon: "🏆" },
                  { label: "On Hold", value: skillList.filter(s => s.status === "on_hold").length, icon: "⏸️" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{s.icon}</span>
                      <span className="text-sm text-slate-700">{s.label}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per-skill progress table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Skill-by-Skill Progress</h3>
              <span className="text-xs text-slate-400">{totalSkills} programs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Individual</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Skill</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sessions</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg %</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent %</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Change</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {skillStats.map(({ skill, sessions, avgPercent, recentPercent, improvement, atTarget }) => (
                    <tr key={skill.id} className={`hover:bg-slate-50 ${atTarget ? "bg-emerald-50/30" : ""}`}>
                      <td className="px-5 py-4">
                        <div className="font-medium text-sm text-slate-900">
                          {skill.client ? `${skill.client.last_name}, ${skill.client.first_name}` : "—"}
                        </div>
                        {skill.client?.mrn && <div className="text-xs text-slate-400">{skill.client.mrn}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-sm text-slate-900 max-w-[200px] truncate">{skill.skill_name}</div>
                        <div className="text-xs text-slate-400 capitalize">{skill.measurement_type?.replace(/_/g, " ")}</div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">{CATEGORY_LABELS[skill.category] || skill.category}</td>
                      <td className="px-4 py-4 text-sm text-slate-700 font-medium">{sessions}</td>
                      <td className="px-4 py-4">
                        {skill.measurement_type === "percent_correct" ? (
                          avgPercent != null ? (
                            <span className={`text-sm font-bold ${atTarget ? "text-emerald-600" : "text-slate-900"}`}>{avgPercent}%</span>
                          ) : <span className="text-slate-400 text-sm">—</span>
                        ) : <span className="text-slate-400 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-4">
                        {skill.measurement_type === "percent_correct" ? (
                          recentPercent != null ? (
                            <div>
                              <span className={`text-sm font-bold ${atTarget ? "text-emerald-600" : "text-slate-900"}`}>{recentPercent}%</span>
                              {skill.target_value != null && (
                                <div className="mt-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-1.5 rounded-full ${atTarget ? "bg-emerald-500" : "bg-teal-400"}`}
                                    style={{ width: `${Math.min((recentPercent / skill.target_value) * 100, 100)}%` }} />
                                </div>
                              )}
                            </div>
                          ) : <span className="text-slate-400 text-sm">—</span>
                        ) : <span className="text-slate-400 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-4">
                        {improvement != null ? (
                          <span className={`text-sm font-bold ${improvement > 0 ? "text-emerald-600" : improvement < 0 ? "text-red-500" : "text-slate-400"}`}>
                            {improvement > 0 ? "+" : ""}{improvement}%
                          </span>
                        ) : <span className="text-slate-400 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[skill.status] || STATUS_COLORS.active}`}>
                          {skill.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/dashboard/skills/${skill.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "All Skill Programs", desc: "View and manage all skill programs", href: "/dashboard/skills", icon: "🎯" },
              { label: "Add Skill Program", desc: "Create a new skill acquisition program", href: "/dashboard/skills/new", icon: "➕" },
              { label: "Individual Support Plans", desc: "Link skills to ISP goals", href: "/dashboard/isp", icon: "🧩" },
            ].map(link => (
              <Link key={link.label} href={link.href}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition-shadow no-underline">
                <span className="text-2xl">{link.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{link.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{link.desc}</div>
                </div>
                <span className="text-slate-300 text-sm">→</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
