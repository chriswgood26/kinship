import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

function fmt(label: string) {
  return label.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const FIDELITY_COLORS: Record<string, string> = {
  high:          "bg-emerald-100 text-emerald-700 border-emerald-200",
  moderate:      "bg-amber-100 text-amber-700 border-amber-200",
  low:           "bg-orange-100 text-orange-700 border-orange-200",
  non_adherent:  "bg-red-100 text-red-700 border-red-200",
};

const DOMAIN_LABELS: Record<string, string> = {
  training_competence: "Training & Competence",
  supervision: "Supervision",
  session_structure: "Session Structure / Protocol Adherence",
  client_engagement: "Client Engagement",
  technique_fidelity: "EBP Technique Fidelity",
  documentation: "Documentation Quality",
  outcome_monitoring: "Outcome Monitoring",
  cultural_adaptation: "Cultural Responsiveness",
};

type ChecklistItem = {
  item: string;
  met: boolean | null;
  notes?: string;
};

export default async function EBPAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { data: assessment } = await supabaseAdmin
    .from("ebp_fidelity_assessments")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (!assessment) notFound();

  const { data: practice } = await supabaseAdmin
    .from("ebp_practices")
    .select("*")
    .eq("id", assessment.ebp_practice_id)
    .single();

  // Previous assessments for this practice
  const { data: history } = await supabaseAdmin
    .from("ebp_fidelity_assessments")
    .select("id, assessment_date, overall_score, fidelity_level, assessor_name, assessment_type")
    .eq("ebp_practice_id", assessment.ebp_practice_id)
    .eq("organization_id", orgId)
    .order("assessment_date", { ascending: false })
    .limit(6);

  const checklist: ChecklistItem[] = Array.isArray(assessment.checklist_items)
    ? assessment.checklist_items
    : [];

  const metItems = checklist.filter(c => c.met === true);
  const notMetItems = checklist.filter(c => c.met === false);
  const naItems = checklist.filter(c => c.met === null);

  const domainScores: Record<string, number> = assessment.domain_scores || {};
  const domainEntries = Object.entries(domainScores).filter(([, v]) => v !== null && !isNaN(Number(v)));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/assessments/ebp" className="text-slate-400 hover:text-slate-700">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-0.5">
            <Link href="/dashboard/assessments/ebp" className="hover:text-slate-600">EBP Tracking</Link>
            <span>›</span>
            <span className="text-slate-600">{practice?.practice_name || "Assessment"}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Fidelity Assessment</h1>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
          assessment.status === "completed"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          {assessment.status === "completed" ? "Complete" : "Draft"}
        </span>
      </div>

      {/* Score Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 flex items-center gap-6">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Overall Fidelity</div>
          <div className={`text-5xl font-bold ${
            assessment.fidelity_level === "high" ? "text-emerald-400" :
            assessment.fidelity_level === "moderate" ? "text-amber-400" :
            assessment.fidelity_level === "low" ? "text-orange-400" :
            assessment.fidelity_level === "non_adherent" ? "text-red-400" :
            "text-white"
          }`}>
            {assessment.overall_score !== null ? `${Math.round(assessment.overall_score)}%` : "—"}
          </div>
        </div>
        {assessment.fidelity_level && (
          <div className={`px-4 py-2 rounded-xl border font-bold text-sm ${FIDELITY_COLORS[assessment.fidelity_level]}`}>
            {fmt(assessment.fidelity_level)} Fidelity
          </div>
        )}
        <div className="flex-1 text-right text-sm text-slate-400 space-y-1">
          <div>{practice?.practice_name}</div>
          <div>
            {new Date(assessment.assessment_date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
            })}
          </div>
          <div>{fmt(assessment.assessment_type)} · {assessment.assessor_name}</div>
        </div>
      </div>

      {/* Meta info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-4">Assessment Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {assessment.clinician_assessed && (
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Clinician Assessed</div>
              <div className="font-medium text-slate-900">{assessment.clinician_assessed}</div>
            </div>
          )}
          {assessment.program_assessed && (
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Program / Unit</div>
              <div className="font-medium text-slate-900">{assessment.program_assessed}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Checklist Items</div>
            <div className="font-medium text-slate-900">
              {assessment.items_met || 0} / {assessment.items_total || checklist.length} met
              {checklist.length > 0 && (
                <span className="text-slate-400 ml-1">
                  ({Math.round(((assessment.items_met || 0) / Math.max(assessment.items_total || checklist.length, 1)) * 100)}%)
                </span>
              )}
            </div>
          </div>
          {assessment.follow_up_date && (
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Follow-up Scheduled</div>
              <div className="font-medium text-slate-900">
                {new Date(assessment.follow_up_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Domain Scores */}
      {domainEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-4">Domain Ratings</h2>
          <div className="space-y-3">
            {domainEntries.map(([key, score]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-slate-700">{DOMAIN_LABELS[key] || fmt(key)}</span>
                  <span className={`font-bold ${
                    score >= 80 ? "text-emerald-700" :
                    score >= 60 ? "text-amber-700" :
                    "text-red-700"
                  }`}>{Math.round(score)}%</span>
                </div>
                <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      score >= 80 ? "bg-emerald-500" :
                      score >= 60 ? "bg-amber-400" :
                      "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(score, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-4">
            Fidelity Checklist
            <span className="ml-2 text-slate-400 font-normal normal-case">
              {metItems.length} met · {notMetItems.length} not met · {naItems.length} N/A
            </span>
          </h2>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                  item.met === true ? "bg-emerald-50 border border-emerald-200" :
                  item.met === false ? "bg-red-50 border border-red-200" :
                  "bg-slate-50 border border-slate-200"
                }`}
              >
                <span className={`text-base flex-shrink-0 ${
                  item.met === true ? "text-emerald-600" :
                  item.met === false ? "text-red-500" :
                  "text-slate-400"
                }`}>
                  {item.met === true ? "✓" : item.met === false ? "✗" : "—"}
                </span>
                <div className="flex-1">
                  <div className="text-sm text-slate-800">{item.item}</div>
                  {item.notes && (
                    <div className="text-xs text-slate-500 mt-1 italic">{item.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Narrative */}
      {(assessment.strengths || assessment.areas_for_improvement || assessment.recommendations || assessment.action_plan) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Narrative Summary</h2>

          {assessment.strengths && (
            <div>
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">✅ Strengths</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{assessment.strengths}</p>
            </div>
          )}

          {assessment.areas_for_improvement && (
            <div>
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">⚠️ Areas for Improvement</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{assessment.areas_for_improvement}</p>
            </div>
          )}

          {assessment.recommendations && (
            <div>
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">💡 Recommendations</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{assessment.recommendations}</p>
            </div>
          )}

          {assessment.action_plan && (
            <div>
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">📋 Action Plan</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{assessment.action_plan}</p>
            </div>
          )}
        </div>
      )}

      {assessment.notes && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</div>
          <p className="text-sm text-slate-700">{assessment.notes}</p>
        </div>
      )}

      {/* Assessment history for this practice */}
      {history && history.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Assessment History — {practice?.practice_name}</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {history.map(h => (
              <Link
                key={h.id}
                href={`/dashboard/assessments/ebp/${h.id}`}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors no-underline ${h.id === id ? "bg-teal-50" : ""}`}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    {new Date(h.assessment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {h.id === id && <span className="ml-2 text-xs text-teal-600 font-semibold">← Current</span>}
                  </div>
                  <div className="text-xs text-slate-400">{fmt(h.assessment_type)} · {h.assessor_name}</div>
                </div>
                <div className="text-right">
                  {h.overall_score !== null && (
                    <div className="font-bold text-slate-900">{Math.round(h.overall_score)}%</div>
                  )}
                  {h.fidelity_level && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      FIDELITY_COLORS[h.fidelity_level]?.replace("border-", "").split(" ").slice(0, 2).join(" ")
                    }`}>
                      {fmt(h.fidelity_level)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex gap-3 pb-6">
        <Link
          href={`/dashboard/assessments/ebp/new?practice_id=${assessment.ebp_practice_id}`}
          className="border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
        >
          + New Assessment
        </Link>
        <Link
          href="/dashboard/assessments/ebp"
          className="text-slate-500 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
        >
          ← All EBPs
        </Link>
      </div>
    </div>
  );
}
