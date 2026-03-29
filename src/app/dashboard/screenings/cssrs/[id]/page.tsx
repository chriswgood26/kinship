import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { CSSRS, getCSSRSRisk } from "@/lib/cssrs";

export const dynamic = "force-dynamic";

export default async function CSSRSDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const { data: screening } = await supabaseAdmin
    .from("screenings")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("id", id)
    .single();

  if (!screening) notFound();

  const patient = Array.isArray(screening.patient) ? screening.patient[0] : screening.patient;
  const answers = screening.answers || {};
  const ideation = answers.ideation || {};
  const behavior = answers.behavior || {};
  const intensity = answers.intensity || {};
  const risk = getCSSRSRisk(ideation, behavior);

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/assessments" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">C-SSRS Results</h1>
          {patient && (
            <Link href={`/dashboard/clients/${client.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
              {client.last_name}, {client.first_name} · MRN: {client.mrn || "—"}
            </Link>
          )}
        </div>
      </div>

      {/* Risk level */}
      <div className={`border-2 rounded-2xl p-6 ${risk.borderColor}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-2xl text-slate-900">Risk Assessment</div>
          <span className={`text-lg px-4 py-2 rounded-xl font-bold ${risk.color}`}>{risk.level}</span>
        </div>
        <p className="text-slate-600 text-sm mb-3">{risk.description}</p>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Recommended Action</div>
          <p className="text-sm font-medium text-slate-900">{risk.action}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div><div className="text-xs text-slate-400">Date</div><div className="font-medium">{screening.administered_at ? new Date(screening.administered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</div></div>
          <div><div className="text-xs text-slate-400">Administered By</div><div className="font-medium">{screening.administered_by || "—"}</div></div>
          <div><div className="text-xs text-slate-400">Tool</div><div className="font-bold font-mono">C-SSRS</div></div>
        </div>
      </div>

      {/* Ideation summary */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Suicidal Ideation</h2></div>
        <div className="divide-y divide-slate-50">
          {CSSRS.ideation.questions.map((q, i) => {
            const val = ideation[q.id as keyof typeof ideation] as boolean | undefined;
            if (val === undefined) return null;
            return (
              <div key={q.id} className={`flex items-start gap-3 px-5 py-3.5 ${val ? "bg-red-50/30" : ""}`}>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5 ${val ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{val ? "YES" : "NO"}</span>
                <div>
                  <div className="text-xs text-slate-400">{q.label}</div>
                  <div className="text-sm text-slate-900">{q.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Behavior summary */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Suicidal Behavior (Past 3 months)</h2></div>
        <div className="divide-y divide-slate-50">
          {CSSRS.behavior.questions.map(q => {
            const val = behavior[q.id as keyof typeof behavior] as boolean | undefined;
            if (val === undefined) return null;
            return (
              <div key={q.id} className={`flex items-start gap-3 px-5 py-3.5 ${val ? "bg-red-50/30" : ""}`}>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5 ${val ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{val ? "YES" : "NO"}</span>
                <div>
                  <div className="text-xs text-slate-400">{q.label}</div>
                  <div className="text-sm text-slate-900">{q.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clinical notes */}
      {screening.notes && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Clinical Notes / Safety Plan</div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{screening.notes}</p>
        </div>
      )}

      <div className="flex gap-3 pb-4">
        {patient && <Link href={`/dashboard/clients/${client.id}`} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">View Client</Link>}
        <Link href="/dashboard/assessments/screenings/cssrs/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">Administer Again</Link>
      </div>
    </div>
  );
}
