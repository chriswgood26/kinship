import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  psychotherapy:   "Psychotherapy",
  substance_use:   "Substance Use",
  trauma:          "Trauma-Focused",
  family:          "Family",
  community:       "Community",
  medication:      "Medication",
  other:           "Other",
};

const STATUS_COLORS: Record<string, string> = {
  planning:      "bg-slate-100 text-slate-600",
  training:      "bg-amber-100 text-amber-700",
  active:        "bg-emerald-100 text-emerald-700",
  on_hold:       "bg-orange-100 text-orange-700",
  discontinued:  "bg-red-100 text-red-700",
};

const FIDELITY_COLORS: Record<string, string> = {
  high:          "bg-emerald-100 text-emerald-700",
  moderate:      "bg-amber-100 text-amber-700",
  low:           "bg-orange-100 text-orange-700",
  non_adherent:  "bg-red-100 text-red-700",
};

const EVIDENCE_BADGES: Record<string, string> = {
  well_supported: "bg-teal-100 text-teal-700",
  supported:      "bg-blue-100 text-blue-700",
  promising:      "bg-purple-100 text-purple-700",
  emerging:       "bg-slate-100 text-slate-600",
};

function fmt(label: string) {
  return label.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default async function EBPTrackingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const [{ data: practices }, { data: assessments }] = await Promise.all([
    supabaseAdmin
      .from("ebp_practices")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),

    supabaseAdmin
      .from("ebp_fidelity_assessments")
      .select("*")
      .eq("organization_id", orgId)
      .order("assessment_date", { ascending: false }),
  ]);

  const practiceList = practices || [];
  const assessmentList = assessments || [];

  // Attach latest assessment to each practice
  const enriched = practiceList.map(p => {
    const history = assessmentList
      .filter(a => a.ebp_practice_id === p.id)
      .sort((a, b) => new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime());
    return { ...p, latest: history[0] || null, assessment_count: history.length };
  });

  const activePractices = enriched.filter(p => p.status === "active").length;
  const totalAssessments = assessmentList.length;
  const highFidelity = assessmentList.filter(a => a.fidelity_level === "high").length;
  const avgScore = assessmentList.length > 0
    ? Math.round(assessmentList.reduce((s, a) => s + (Number(a.overall_score) || 0), 0) / assessmentList.length)
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/dashboard/assessments" className="hover:text-slate-600">Assessments</Link>
            <span>›</span>
            <span className="text-slate-600 font-medium">EBP Fidelity</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Evidence-Based Practice Tracking</h1>
          <p className="text-slate-500 text-sm mt-0.5">Monitor fidelity and implementation of evidence-based practices</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/assessments/ebp/new?mode=practice"
            className="border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors text-sm"
          >
            + Add EBP
          </Link>
          <Link
            href="/dashboard/assessments/ebp/new"
            className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm"
          >
            + Fidelity Assessment
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-2xl mb-1">📚</div>
          <div className="text-2xl font-bold text-slate-900">{activePractices}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Active EBPs</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-2xl mb-1">📋</div>
          <div className="text-2xl font-bold text-slate-900">{totalAssessments}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Total Assessments</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-2xl mb-1">✅</div>
          <div className="text-2xl font-bold text-emerald-600">{highFidelity}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">High Fidelity</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-2xl mb-1">📊</div>
          <div className="text-2xl font-bold text-slate-900">{avgScore !== null ? `${avgScore}%` : "—"}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Avg Fidelity Score</div>
        </div>
      </div>

      {/* EBP Practices grid */}
      {enriched.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">🔬</div>
          <div className="font-semibold text-slate-700 mb-1">No EBPs registered yet</div>
          <p className="text-sm text-slate-400 mb-4">Add the evidence-based practices your agency is implementing</p>
          <Link
            href="/dashboard/assessments/ebp/new?mode=practice"
            className="inline-block bg-teal-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-teal-400 transition-colors"
          >
            + Register First EBP
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {enriched.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-bold text-slate-900">{p.practice_name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] || "bg-slate-100 text-slate-600"}`}>
                      {fmt(p.status)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVIDENCE_BADGES[p.evidence_level] || "bg-slate-100 text-slate-500"}`}>
                      {fmt(p.evidence_level)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">
                    {CATEGORY_LABELS[p.practice_category] || p.practice_category}
                    {p.target_population && ` · ${p.target_population}`}
                    {p.go_live_date && ` · Live since ${new Date(p.go_live_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                  </div>
                  {p.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{p.description}</p>
                  )}

                  {/* Trained staff + fidelity tool */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {p.trained_staff_count > 0 && (
                      <span>👥 {p.trained_staff_count} trained staff</span>
                    )}
                    {p.fidelity_tool && (
                      <span>📏 {p.fidelity_tool}</span>
                    )}
                    <span>📋 {p.assessment_count} fidelity {p.assessment_count === 1 ? "assessment" : "assessments"}</span>
                  </div>
                </div>

                {/* Latest assessment score */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {p.latest ? (
                    <>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">
                          {p.latest.overall_score !== null ? `${Math.round(p.latest.overall_score)}%` : "—"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(p.latest.assessment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      {p.latest.fidelity_level && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${FIDELITY_COLORS[p.latest.fidelity_level]}`}>
                          {fmt(p.latest.fidelity_level)} Fidelity
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No assessments yet</span>
                  )}
                  <Link
                    href={`/dashboard/assessments/ebp/new?practice_id=${p.id}`}
                    className="text-xs text-teal-600 font-semibold hover:underline"
                  >
                    + Add Assessment
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Assessments */}
      {assessmentList.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Fidelity Assessments</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {assessmentList.slice(0, 10).map(a => {
              const practice = practiceList.find(p => p.id === a.ebp_practice_id);
              return (
                <Link
                  key={a.id}
                  href={`/dashboard/assessments/ebp/${a.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors no-underline"
                >
                  <div className="text-xl">📋</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm truncate">
                      {practice?.practice_name || "Unknown EBP"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(a.assessment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      {fmt(a.assessment_type)}
                      {a.assessor_name && ` · ${a.assessor_name}`}
                      {a.clinician_assessed && ` · Clinician: ${a.clinician_assessed}`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {a.overall_score !== null && (
                      <div className="text-lg font-bold text-slate-900">{Math.round(a.overall_score)}%</div>
                    )}
                    {a.fidelity_level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FIDELITY_COLORS[a.fidelity_level]}`}>
                        {fmt(a.fidelity_level)}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                    a.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {a.status === "completed" ? "Complete" : "Draft"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
