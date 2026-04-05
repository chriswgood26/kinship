import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import ISPSignatureManager from "./ISPSignatureManager";

export const dynamic = "force-dynamic";

const SUPPORT_COLORS: Record<string, string> = {
  minimal: "bg-green-100 text-green-700",
  moderate: "bg-yellow-100 text-yellow-700",
  substantial: "bg-orange-100 text-orange-700",
  intensive: "bg-red-100 text-red-600",
};

export default async function ISPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const { data: plan } = await supabaseAdmin
    .from("individual_support_plans")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("id", id)
    .single();

  if (!plan) notFound();

  const patient = Array.isArray(plan.patient) ? plan.patient[0] : plan.patient;
  const goals = plan.goals || [];
  const reviewDate = plan.review_date ? new Date(plan.review_date + "T12:00:00") : null;
  const isOverdue = reviewDate && reviewDate < new Date();
  const sigCount = [plan.guardian_signed_at, plan.client_signed_at, plan.coordinator_signed_at].filter(Boolean).length;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/isp" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">Individual Support Plan</h1>
              <span className="text-sm font-semibold text-slate-500">{plan.plan_year}</span>
              {plan.level_of_support && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${SUPPORT_COLORS[plan.level_of_support] || "bg-slate-100 text-slate-600"}`}>
                  {plan.level_of_support} support
                </span>
              )}
            </div>
            {patient && (
              <Link href={`/dashboard/clients/${patient.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
                {patient.last_name}, {patient.first_name} · MRN: {patient.mrn || "—"}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/isp/new?clone=${id}`} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">New Annual Review</Link>
          <button className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 no-print">🖨️ Print</button>
        </div>
      </div>

      {/* Alert */}
      {isOverdue && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-red-800 font-medium">Annual review is overdue — this ISP must be updated to maintain compliance</span>
        </div>
      )}

      {/* Plan info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Plan Overview</h2>
        <div className="grid grid-cols-4 gap-4 text-sm mb-5">
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Plan Year</dt><dd className="font-semibold text-slate-900 mt-0.5">{plan.plan_year}</dd></div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Effective</dt><dd className="font-medium text-slate-900 mt-0.5">{plan.effective_date ? new Date(plan.effective_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</dd></div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Annual Review</dt><dd className={`font-medium mt-0.5 ${isOverdue ? "text-red-500 font-bold" : "text-slate-900"}`}>{reviewDate ? reviewDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}{isOverdue && " ⚠️"}</dd></div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Coordinator</dt><dd className="font-medium text-slate-900 mt-0.5">{plan.coordinator || "—"}</dd></div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Living Situation</dt><dd className="text-slate-700">{plan.living_situation || "—"}</dd></div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Day Program / Employment</dt><dd className="text-slate-700">{plan.day_program || "—"}</dd></div>
        </div>

        {plan.primary_diagnosis && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-2">Diagnoses</dt>
            <dd className="flex flex-wrap gap-2">
              {plan.primary_diagnosis.split(",").map((d: string) => (
                <span key={d} className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{d.trim()}</span>
              ))}
              {plan.secondary_diagnoses?.map((d: string) => (
                <span key={d} className="font-mono text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded border">{d}</span>
              ))}
            </dd>
          </div>
        )}
      </div>

      {/* Person-centered background */}
      <div className="grid grid-cols-2 gap-5">
        {[
          { label: "Strengths, Gifts & Talents", value: plan.strengths, icon: "⭐" },
          { label: "Preferences & Dreams", value: plan.preferences, icon: "💭" },
          { label: "Communication Style", value: plan.communication_style, icon: "💬" },
          { label: "Health & Safety Considerations", value: plan.health_safety_concerns, icon: "🏥" },
        ].map(item => item.value && (
          <div key={item.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">{item.icon} {item.label}</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Goals */}
      <div className="space-y-4">
        <h2 className="font-semibold text-slate-900 text-lg">ISP Goals ({goals.length})</h2>
        {goals.map((goal: Record<string, string>, i: number) => (
          <div key={goal.id || i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-100">
              <div className="w-7 h-7 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">{goal.category}</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{goal.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100">
              <div className="px-5 py-3">
                <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Baseline</dt>
                <dd className="text-sm text-slate-700">{goal.baseline || "—"}</dd>
              </div>
              <div className="px-5 py-3">
                <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Target</dt>
                <dd className="text-sm text-slate-700 font-medium">{goal.target || "—"}</dd>
              </div>
              <div className="px-5 py-3">
                <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Method</dt>
                <dd className="text-sm text-slate-700">{goal.method || "—"}</dd>
              </div>
              <div className="px-5 py-3">
                <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Data Collection · Responsible Party</dt>
                <dd className="text-sm text-slate-700">{goal.frequency} · {goal.responsible_party}</dd>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Signature management */}
      <ISPSignatureManager plan={plan} />
    </div>
  );
}
