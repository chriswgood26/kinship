import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";
import ReportActions from "@/components/ReportActions";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  intake: "Intake",
  clinical: "Clinical",
  discharge: "Discharge",
  crisis: "Crisis",
  consent: "Consent",
  medication: "Medication",
  group: "Group",
  administrative: "Administrative",
};

const CATEGORY_COLORS: Record<string, string> = {
  intake: "bg-blue-50 text-blue-700 border-blue-200",
  clinical: "bg-teal-50 text-teal-700 border-teal-200",
  discharge: "bg-purple-50 text-purple-700 border-purple-200",
  crisis: "bg-red-50 text-red-700 border-red-200",
  consent: "bg-amber-50 text-amber-700 border-amber-200",
  medication: "bg-emerald-50 text-emerald-700 border-emerald-200",
  group: "bg-indigo-50 text-indigo-700 border-indigo-200",
  administrative: "bg-slate-50 text-slate-600 border-slate-200",
};

type TemplateRow = {
  template_id: string;
  template_name: string;
  template_category: string | null;
  total: number;
  completed: number;
  in_progress: number;
  abandoned: number;
  completion_rate: number;
  avg_score: number | null;
};

type ProgramRow = {
  program_id: string | null;
  program_name: string;
  total: number;
  completed: number;
  completion_rate: number;
  avg_score: number | null;
};

type Analytics = {
  summary: {
    total: number;
    completed: number;
    in_progress: number;
    abandoned: number;
    completion_rate: number;
    avg_score: number | null;
    unique_templates: number;
  };
  by_template: TemplateRow[];
  by_program: ProgramRow[];
};

export default async function FormAnalyticsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; program_id?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const from = params.from || ninetyDaysAgo;
  const to = params.to || today;
  const programFilter = params.program_id || "";

  // Fetch all programs for filter dropdown
  const { data: programs } = await supabaseAdmin
    .from("programs")
    .select("id, name, code")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  // Fetch form submissions in date range
  let submissionsQuery = supabaseAdmin
    .from("form_submissions")
    .select("id, template_id, template_name, template_category, program_id, status, total_score, max_score, created_at, completed_at")
    .eq("organization_id", orgId)
    .gte("created_at", from + "T00:00:00")
    .lte("created_at", to + "T23:59:59");

  if (programFilter) submissionsQuery = submissionsQuery.eq("program_id", programFilter);

  const { data: rawSubmissions, error } = await submissionsQuery;

  // Gracefully handle if table doesn't exist yet
  const submissions = (error && error.code === "42P01") ? [] : (rawSubmissions || []);

  // Build program name map
  const programNameMap: Record<string, string> = Object.fromEntries(
    (programs || []).map(p => [p.id, p.name])
  );

  // ── Compute analytics server-side ────────────────────────────────────────

  // By-template
  const byTemplate: Record<string, TemplateRow> = {};
  for (const row of submissions) {
    const key = row.template_id;
    if (!byTemplate[key]) {
      byTemplate[key] = {
        template_id: row.template_id,
        template_name: row.template_name,
        template_category: row.template_category,
        total: 0,
        completed: 0,
        in_progress: 0,
        abandoned: 0,
        completion_rate: 0,
        avg_score: null,
      };
    }
    const t = byTemplate[key];
    t.total++;
    if (row.status === "completed") t.completed++;
    else if (row.status === "in_progress") t.in_progress++;
    else t.abandoned++;
  }

  // Compute avg scores for each template
  for (const t of Object.values(byTemplate)) {
    t.completion_rate = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
    const scored = submissions.filter(
      r => r.template_id === t.template_id && r.status === "completed" && r.total_score != null
    );
    if (scored.length > 0) {
      t.avg_score = Math.round((scored.reduce((s, r) => s + (r.total_score ?? 0), 0) / scored.length) * 10) / 10;
    }
  }

  const templateRows = Object.values(byTemplate).sort((a, b) => b.total - a.total);

  // By-program
  const byProgram: Record<string, ProgramRow> = {};
  for (const row of submissions) {
    const key = row.program_id ?? "__none__";
    if (!byProgram[key]) {
      byProgram[key] = {
        program_id: row.program_id ?? null,
        program_name: row.program_id ? (programNameMap[row.program_id] ?? "Unknown Program") : "No Program",
        total: 0,
        completed: 0,
        completion_rate: 0,
        avg_score: null,
      };
    }
    const p = byProgram[key];
    p.total++;
    if (row.status === "completed") p.completed++;
  }

  for (const p of Object.values(byProgram)) {
    p.completion_rate = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
    const scored = submissions.filter(
      r => (r.program_id ?? "__none__") === (p.program_id ?? "__none__")
        && r.status === "completed"
        && r.total_score != null
    );
    if (scored.length > 0) {
      p.avg_score = Math.round((scored.reduce((s, r) => s + (r.total_score ?? 0), 0) / scored.length) * 10) / 10;
    }
  }

  const programRows = Object.values(byProgram).sort((a, b) => b.total - a.total);

  // Summary KPIs
  const totalSubmissions = submissions.length;
  const totalCompleted = submissions.filter(r => r.status === "completed").length;
  const totalInProgress = submissions.filter(r => r.status === "in_progress").length;
  const totalAbandoned = submissions.filter(r => r.status === "abandoned").length;
  const overallCompletionRate = totalSubmissions > 0 ? Math.round((totalCompleted / totalSubmissions) * 100) : 0;
  const scoredRows = submissions.filter(r => r.total_score != null && r.status === "completed");
  const overallAvgScore = scoredRows.length > 0
    ? Math.round((scoredRows.reduce((s, r) => s + (r.total_score ?? 0), 0) / scoredRows.length) * 10) / 10
    : null;

  const analytics: Analytics = {
    summary: {
      total: totalSubmissions,
      completed: totalCompleted,
      in_progress: totalInProgress,
      abandoned: totalAbandoned,
      completion_rate: overallCompletionRate,
      avg_score: overallAvgScore,
      unique_templates: templateRows.length,
    },
    by_template: templateRows,
    by_program: programRows,
  };

  const maxProgramTotal = Math.max(...programRows.map(p => p.total), 1);

  const tableData = templateRows.map(t => ({
    Form: t.template_name,
    Category: CATEGORY_LABELS[t.template_category || ""] || (t.template_category ?? "—"),
    Total: t.total,
    Completed: t.completed,
    "In Progress": t.in_progress,
    "Completion Rate": `${t.completion_rate}%`,
    "Avg Score": t.avg_score != null ? String(t.avg_score) : "—",
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Form Analytics</h1>
            <p className="text-slate-500 text-sm mt-0.5">Completion rates and average scores by template and program</p>
          </div>
        </div>
        <ReportActions
          reportTitle="Form Analytics"
          data={tableData}
          columns={Object.keys(tableData[0] ?? {}).map(k => ({ key: k, label: k }))}
        />
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
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Program</label>
          <select name="program_id" defaultValue={programFilter}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Programs</option>
            {(programs || []).map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>
            ))}
          </select>
        </div>
        <button type="submit"
          className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
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
              href={`/dashboard/reports/forms?from=${p.from}&to=${p.to}${programFilter ? `&program_id=${programFilter}` : ""}`}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium transition-colors">
              {p.label}
            </Link>
          ))}
        </div>
      </form>

      {/* KPI strip */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6">
        <div className="grid grid-cols-6 gap-6 text-center">
          {[
            { label: "Total Submissions", value: analytics.summary.total, sub: `${from} → ${to}`, color: "text-white" },
            { label: "Completed", value: analytics.summary.completed, sub: "forms finished", color: "text-teal-300" },
            { label: "In Progress", value: analytics.summary.in_progress, sub: "not yet finished", color: "text-amber-300" },
            { label: "Abandoned", value: analytics.summary.abandoned, sub: "not completed", color: "text-slate-300" },
            {
              label: "Completion Rate",
              value: `${analytics.summary.completion_rate}%`,
              sub: "of all started",
              color: analytics.summary.completion_rate >= 80 ? "text-emerald-300" : analytics.summary.completion_rate >= 50 ? "text-amber-300" : "text-red-300",
            },
            {
              label: "Avg Score",
              value: analytics.summary.avg_score != null ? String(analytics.summary.avg_score) : "—",
              sub: "among scored forms",
              color: "text-slate-200",
            },
          ].map(k => (
            <div key={k.label}>
              <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-slate-300 text-sm mt-1">{k.label}</div>
              <div className="text-slate-500 text-xs mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {analytics.summary.total === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-slate-900 mb-1">No form submissions yet</p>
          <p className="text-slate-500 text-sm mb-4">Form completion data will appear here as staff fill out forms for clients</p>
          <Link href="/dashboard/forms"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
            Browse Form Templates
          </Link>
        </div>
      ) : (
        <>
          {/* Side-by-side: By-template table + By-program bars */}
          <div className="grid grid-cols-3 gap-4">
            {/* By-program completion bars */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">By Program</h3>
              {programRows.length === 0 ? (
                <p className="text-sm text-slate-400">No program data</p>
              ) : (
                <div className="space-y-4">
                  {programRows.map(p => (
                    <div key={p.program_id ?? "__none__"}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium text-slate-800 truncate max-w-[60%]">{p.program_name}</span>
                        <span className="text-xs text-slate-500 ml-2 shrink-0">{p.total} forms</span>
                      </div>
                      {/* Completion bar */}
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-2.5 bg-teal-500 rounded-full"
                          style={{ width: `${p.completion_rate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{p.completion_rate}% complete</span>
                        {p.avg_score != null && (
                          <span className="font-medium text-slate-600">avg {p.avg_score}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* By-template table (2/3 width) */}
            <div className="col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">By Form Template</h3>
                <span className="text-xs text-slate-400">{analytics.summary.unique_templates} templates</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Form</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Done</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Completion</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {analytics.by_template.map(t => {
                      const catColor = CATEGORY_COLORS[t.template_category || ""] || "bg-slate-50 text-slate-600 border-slate-200";
                      return (
                        <tr key={t.template_id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-sm text-slate-900 max-w-[200px] truncate">{t.template_name}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            {t.template_category ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${catColor}`}>
                                {CATEGORY_LABELS[t.template_category] || t.template_category}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm font-medium text-slate-700">{t.total}</td>
                          <td className="px-4 py-3.5 text-center text-sm text-emerald-700 font-semibold">{t.completed}</td>
                          <td className="px-4 py-3.5 text-center text-sm text-amber-600">{t.in_progress}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                                <div
                                  className={`h-2 rounded-full ${
                                    t.completion_rate >= 80 ? "bg-emerald-500" :
                                    t.completion_rate >= 50 ? "bg-teal-400" : "bg-amber-400"
                                  }`}
                                  style={{ width: `${t.completion_rate}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${
                                t.completion_rate >= 80 ? "text-emerald-700" :
                                t.completion_rate >= 50 ? "text-teal-700" : "text-amber-700"
                              }`}>
                                {t.completion_rate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {t.avg_score != null ? (
                              <span className="text-sm font-bold text-slate-900">{t.avg_score}</span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Volume bar chart by program */}
          {programRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Submission Volume by Program</h3>
              <div className="space-y-3">
                {programRows.map(p => {
                  const barPct = maxProgramTotal > 0 ? (p.total / maxProgramTotal) * 100 : 0;
                  return (
                    <div key={p.program_id ?? "__none__"} className="flex items-center gap-4">
                      <div className="w-36 text-sm text-slate-700 font-medium truncate text-right flex-shrink-0">
                        {p.program_name}
                      </div>
                      <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                        <div
                          className="h-7 bg-teal-500 rounded-lg flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max(barPct, 2)}%` }}
                        >
                          {barPct > 15 && (
                            <span className="text-xs text-white font-semibold">{p.total}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-28 text-right flex-shrink-0 text-xs text-slate-500">
                        {barPct <= 15 && <span className="mr-1 font-semibold text-slate-700">{p.total}</span>}
                        {p.completion_rate}% complete
                        {p.avg_score != null && <span className="text-slate-400"> · avg {p.avg_score}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Form Template Library", desc: "Browse and create form templates", href: "/dashboard/forms", icon: "📋" },
          { label: "Programs", desc: "Manage clinical programs", href: "/dashboard/programs", icon: "🏥" },
          { label: "Reports", desc: "Back to all reports", href: "/dashboard/reports", icon: "📊" },
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
    </div>
  );
}
