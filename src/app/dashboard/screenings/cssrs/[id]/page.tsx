import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { CSSRS } from "@/lib/cssrs";

export const dynamic = "force-dynamic";

const riskColors: Record<string, string> = {
  "Low Risk": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "Moderate Risk": "bg-amber-100 text-amber-700 border-amber-300",
  "High Risk": "bg-orange-100 text-orange-700 border-orange-300",
  "Imminent Risk": "bg-red-100 text-red-700 border-red-300",
};

export default async function CSSRSDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();

  const { data: screening } = await supabaseAdmin
    .from("screenings")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("id", id)
    .eq("organization_id", profile?.organization_id || "")
    .single();

  if (!screening) notFound();

  const client = Array.isArray(screening.client) ? screening.client[0] : screening.client;
  const riskLevel = screening.severity_label || "Low Risk";
  const riskColor = riskColors[riskLevel] || "bg-slate-100 text-slate-700 border-slate-200";
  const answers = screening.answers || {};
  const ideation: Record<string, boolean> = answers.ideation || {};
  const intensity: Record<string, number> = answers.intensity || {};
  const behavior: Record<string, boolean> = answers.behavior || {};

  // Check if a safety plan exists for this screening
  const { data: existingSafetyPlans } = await supabaseAdmin
    .from("safety_plans")
    .select("id, status, created_at")
    .eq("cssrs_screening_id", id)
    .eq("organization_id", profile?.organization_id || "")
    .order("created_at", { ascending: false })
    .limit(1);

  const linkedPlan = existingSafetyPlans?.[0] || null;
  const isHighRisk = riskLevel === "High Risk" || riskLevel === "Imminent Risk";

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">C-SSRS Assessment</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-semibold border ${riskColor}`}>{riskLevel}</span>
          </div>
          {client && (
            <Link href={`/dashboard/clients/${client.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
              {client.last_name}, {client.first_name} · MRN: {client.mrn || "—"}
            </Link>
          )}
        </div>
      </div>

      {/* Imminent/High Risk Alert */}
      {isHighRisk && (
        <div className={`rounded-2xl p-5 flex items-start gap-3 ${riskLevel === "Imminent Risk" ? "bg-red-600 text-white" : "bg-orange-50 border-2 border-orange-300"}`}>
          <span className="text-2xl flex-shrink-0">{riskLevel === "Imminent Risk" ? "🚨" : "⚠️"}</span>
          <div>
            <div className={`font-bold text-xl ${riskLevel === "Imminent Risk" ? "" : "text-orange-900"}`}>
              {riskLevel === "Imminent Risk" ? "EMERGENCY — IMMINENT RISK" : "HIGH RISK — Immediate Intervention Required"}
            </div>
            <div className={`text-sm mt-1 ${riskLevel === "Imminent Risk" ? "text-red-100" : "text-orange-700"}`}>
              {riskLevel === "Imminent Risk"
                ? "Do NOT leave client alone. Call 911 or mobile crisis immediately."
                : "Consider psychiatric hospitalization. Contact crisis services. Do not leave alone."}
            </div>
          </div>
        </div>
      )}

      {/* Safety Plan Prompt / Link */}
      {linkedPlan ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="font-semibold text-emerald-800">Safety Plan Documented</div>
              <div className="text-sm text-emerald-600">
                Created {new Date(linkedPlan.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · Status: {linkedPlan.status}
              </div>
            </div>
          </div>
          <Link href={`/dashboard/safety-plans/${linkedPlan.id}`}
            className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400">
            View Safety Plan →
          </Link>
        </div>
      ) : (
        <div className={`rounded-2xl p-5 flex items-center justify-between ${isHighRisk ? "bg-red-50 border-2 border-red-200" : "bg-blue-50 border border-blue-200"}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className={`font-semibold ${isHighRisk ? "text-red-800" : "text-blue-800"}`}>
                {isHighRisk ? "Safety Plan Required" : "Document a Safety Plan"}
              </div>
              <div className={`text-sm ${isHighRisk ? "text-red-600" : "text-blue-600"}`}>
                {isHighRisk
                  ? "CCBHC requires a safety plan for this risk level. Create one now."
                  : "CCBHC recommends safety planning. Link this assessment to a safety plan."}
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/safety-plans/new?cssrs_id=${id}&client_id=${screening.client_id}&risk_level=${encodeURIComponent(riskLevel)}`}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${isHighRisk ? "bg-red-500 text-white hover:bg-red-400" : "bg-blue-500 text-white hover:bg-blue-400"}`}>
            Create Safety Plan →
          </Link>
        </div>
      )}

      {/* Risk Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Risk Assessment</div>
            <div className="text-3xl font-bold text-slate-900 mt-1">{riskLevel}</div>
          </div>
          <div className="text-right text-sm">
            <div className="text-xs text-slate-400 mb-1">Highest Ideation Level</div>
            <div className="text-4xl font-bold text-slate-900">{screening.total_score ?? "—"}</div>
            <div className="text-xs text-slate-400">of 5</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div><div className="text-xs text-slate-400">Administered</div><div className="font-medium text-slate-900">{screening.administered_at ? new Date(screening.administered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</div></div>
          <div><div className="text-xs text-slate-400">Administered By</div><div className="font-medium text-slate-900">{screening.administered_by || "—"}</div></div>
        </div>
      </div>

      {/* Ideation Results */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Suicidal Ideation</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {CSSRS.ideation.questions.map((q, i) => {
            const answer = ideation[q.id];
            if (answer === undefined) return null;
            return (
              <div key={q.id} className={`flex items-start gap-4 px-5 py-4 ${answer ? "bg-red-50/30" : ""}`}>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${answer ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {answer ? "YES" : "NO"}
                </span>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-400 mb-0.5">Q{i + 1} · {q.label}</div>
                  <p className="text-sm text-slate-700">{q.text}</p>
                </div>
                {answer && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 ${
                    q.severity >= 5 ? "bg-red-100 text-red-700" :
                    q.severity >= 4 ? "bg-orange-100 text-orange-700" :
                    q.severity >= 3 ? "bg-amber-100 text-amber-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>Level {q.severity}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Intensity */}
      {Object.keys(intensity).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Ideation Intensity</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {CSSRS.intensity.questions.map(q => {
              const val = intensity[q.id];
              if (val === undefined) return null;
              const opt = q.options.find(o => o.value === val);
              return (
                <div key={q.id} className="flex items-start gap-4 px-5 py-3.5">
                  <span className="text-sm font-bold text-slate-500 font-mono w-6 flex-shrink-0">{val}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-0.5">{q.label}</div>
                    <p className="text-sm text-slate-700">{opt?.label || `Score: ${val}`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Behavior */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Suicidal Behavior (Past 3 Months)</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {CSSRS.behavior.questions.map((q, i) => {
            const answer = behavior[q.id];
            if (answer === undefined) return null;
            return (
              <div key={q.id} className={`flex items-start gap-4 px-5 py-4 ${answer ? "bg-red-50/30" : ""}`}>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${answer ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {answer ? "YES" : "NO"}
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-0.5">B{i + 1} · {q.label}</div>
                  <p className="text-sm text-slate-700">{q.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clinical Notes */}
      {screening.notes && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Clinical Notes</div>
          <p className="text-sm text-slate-700 leading-relaxed">{screening.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {client && (
          <Link href={`/dashboard/clients/${client.id}`}
            className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
            View Client
          </Link>
        )}
        <Link href={`/dashboard/screenings/cssrs/new?client_id=${screening.client_id}`}
          className="border border-red-200 text-red-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50">
          Administer Again
        </Link>
        {!linkedPlan && (
          <Link
            href={`/dashboard/safety-plans/new?cssrs_id=${id}&client_id=${screening.client_id}&risk_level=${encodeURIComponent(riskLevel)}`}
            className="bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-400">
            Create Safety Plan →
          </Link>
        )}
      </div>
    </div>
  );
}
