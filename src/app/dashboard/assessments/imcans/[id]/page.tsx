import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PrintButton from "@/components/PrintButton";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { IMCANS_DOMAINS, RATING_LABELS, calcDomainScore, calcTotalNeedScore, calcLOC, LOC_THRESHOLDS } from "@/lib/imcans";

export const dynamic = "force-dynamic";

export default async function IMCANSDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const { data: assessment } = await supabaseAdmin
    .from("assessments")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("id", id)
    .single();

  if (!assessment) notFound();

  const patient = Array.isArray(assessment.patient) ? assessment.patient[0] : assessment.patient;
  // Ensure score values are numbers (jsonb can return them as strings)
  const rawScores = assessment.scores || {};
  const scores: Record<string, number> = Object.fromEntries(
    Object.entries(rawScores).map(([k, v]) => [k, Number(v)])
  );
  const totalScore = calcTotalNeedScore(scores);
  const locRec = calcLOC(totalScore);
  const locInfo = LOC_THRESHOLDS.find(t => totalScore <= t.max);

  function calcAge(dob: string | null) {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob + "T12:00:00").getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  const SCORE_COLORS = ["bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700", "bg-amber-100 text-amber-700", "bg-red-100 text-red-600"];

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/assessments" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">IM+CANS Assessment</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${assessment.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {assessment.status === "completed" ? "✓ Completed" : "In Progress"}
              </span>
            </div>
            {patient && (
              <Link href={`/dashboard/clients/${patient.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
                {patient.last_name}, {patient.first_name}{calcAge(patient.date_of_birth) !== null ? ` · Age ${calcAge(patient.date_of_birth)}` : ""} · MRN: {patient.mrn || "—"}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <PrintButton />
          {assessment.status !== "completed" && (
            <Link href={`/dashboard/assessments/imcans/${id}/edit`}
              className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
              Continue →
            </Link>
          )}
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6 text-white">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-slate-300 text-xs uppercase font-semibold tracking-wide mb-1">Assessment Date</div>
            <div className="font-semibold">{assessment.assessment_date ? new Date(assessment.assessment_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</div>
            <div className="text-slate-400 text-xs mt-0.5">{assessment.assessor_name || "Assessor not recorded"}</div>
          </div>
          <div>
            <div className="text-slate-300 text-xs uppercase font-semibold tracking-wide mb-1">Total Need Score</div>
            <div className="text-5xl font-bold text-teal-300">{totalScore}</div>
          </div>
          <div className="col-span-2">
            <div className="text-slate-300 text-xs uppercase font-semibold tracking-wide mb-1">Level of Care Recommendation</div>
            <div className="text-xl font-bold text-teal-300">{locRec}</div>
            {locInfo && <div className="text-slate-300 text-sm mt-0.5">{locInfo.description}</div>}
          </div>
        </div>

        {/* Domain score bars */}
        <div className="mt-5 pt-5 border-t border-white/10 space-y-2">
          {IMCANS_DOMAINS.map(domain => {
            const dScore = calcDomainScore(scores, domain);
            const maxScore = domain.items.length * 3;
            return (
              <div key={domain.id} className="flex items-center gap-3">
                <span className="text-sm w-40 flex-shrink-0 text-slate-300">{domain.icon} {domain.label.replace(" Needs", "").replace(" Behaviors", "").replace(" Experiences", "")}</span>
                <div className="flex-1 bg-white/10 rounded-full h-3 overflow-hidden">
                  <div className={`h-3 rounded-full transition-all ${domain.isStrengths ? "bg-emerald-400" : "bg-teal-400"}`}
                    style={{ width: `${maxScore > 0 ? (dScore / maxScore) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-semibold text-white w-8 text-right">{dScore}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed scores by domain */}
      {IMCANS_DOMAINS.map(domain => {
        const ratedItems = domain.items.filter(item => scores[item.id] !== undefined);
        if (ratedItems.length === 0) return null;
        return (
          <div key={domain.id} className={`bg-white rounded-2xl border-2 overflow-hidden ${domain.color}`}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{domain.icon}</span>
                <h2 className="font-bold text-slate-900">{domain.label}</h2>
                {domain.isStrengths && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Strengths</span>}
              </div>
              <span className="text-sm font-semibold text-slate-600">Score: <span className="text-lg font-bold text-slate-900">{calcDomainScore(scores, domain)}</span></span>
            </div>
            <div className="divide-y divide-slate-50">
              {domain.items.map(item => {
                const score = Number(scores[item.id]);
                if (scores[item.id] === undefined) return null;
                const scoreColor = SCORE_COLORS[score] || SCORE_COLORS[0];
                return (
                  <div key={item.id} className="flex items-center justify-between px-6 py-3.5">
                    <div>
                      <div className="font-medium text-slate-900 text-sm">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.description}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`w-8 h-8 rounded-xl text-sm font-bold flex items-center justify-center border ${scoreColor}`}>{score}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${scoreColor}`}>{RATING_LABELS[score]?.label.split(" — ")[1]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Clinical notes */}
      {assessment.clinical_notes && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Clinical Notes</div>
          <p className="text-sm text-slate-700 leading-relaxed">{assessment.clinical_notes}</p>
        </div>
      )}
    </div>
  );
}
