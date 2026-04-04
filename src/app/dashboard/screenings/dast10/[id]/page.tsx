import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { DAST10, getDAST10Severity } from "@/lib/substanceScreenings";

export const dynamic = "force-dynamic";

export default async function Dast10DetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    .select("*, client:client_id(id, first_name, last_name, mrn)")
    .eq("id", id)
    .eq("organization_id", profile?.organization_id || "")
    .single();

  if (!screening) notFound();

  const client = Array.isArray(screening.client) ? screening.client[0] : screening.client;
  const score = screening.total_score ?? 0;
  const severity = getDAST10Severity(score);
  const answers: Record<string, boolean | null> = screening.answers || {};

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">DAST-10 Results</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-semibold ${severity.color}`}>{severity.label}</span>
          </div>
          {client && (
            <Link href={`/dashboard/clients/${client.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
              {client.last_name}, {client.first_name} · MRN: {client.mrn || "—"}
            </Link>
          )}
        </div>
      </div>

      {/* Score summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Total Score</div>
            <div className="text-6xl font-bold text-slate-900 mt-1">{score}<span className="text-xl font-normal text-slate-400">/{DAST10.maxScore}</span></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Level</div>
            <span className={`text-lg px-4 py-2 rounded-xl font-bold ${severity.color}`}>{severity.label}</span>
          </div>
        </div>

        <div className="bg-slate-100 rounded-full h-4 overflow-hidden mb-3">
          <div className={`h-4 rounded-full transition-all ${
            score === 0 ? "bg-emerald-500" :
            score <= 2 ? "bg-blue-500" :
            score <= 5 ? "bg-amber-500" :
            score <= 8 ? "bg-orange-500" : "bg-red-500"
          }`} style={{ width: `${(score / DAST10.maxScore) * 100}%` }} />
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clinical Recommendation</div>
          <p className="text-sm text-slate-700">{severity.recommendation}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">Administered</div>
            <div className="font-medium text-slate-900">
              {screening.administered_at ? new Date(screening.administered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Administered By</div>
            <div className="font-medium text-slate-900">{screening.administered_by || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Tool</div>
            <div className="font-bold font-mono text-slate-900">DAST-10</div>
          </div>
        </div>
      </div>

      {/* Item-by-item breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Response Detail</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {DAST10.questions.map((q, i) => {
            const answer = answers[q.id];
            const isAnswered = answer !== undefined && answer !== null;
            // Clinically significant if YES on scoreOnYes:true questions, or NO on scoreOnYes:false
            const isPositive = q.scoreOnYes ? answer === true : answer === false;
            return (
              <div key={q.id} className={`flex items-start gap-4 px-5 py-4 ${isPositive ? "bg-orange-50/30" : ""}`}>
                {isAnswered ? (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${answer ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {answer ? "YES" : "NO"}
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 bg-slate-100 text-slate-400">—</span>
                )}
                <div className="flex-1">
                  <div className="text-xs text-slate-400 mb-0.5">Q{i + 1}</div>
                  <div className="text-sm text-slate-900 font-medium">{q.text}</div>
                  {isPositive && <div className="text-xs font-semibold text-orange-600 mt-1">⚠ Clinically significant response</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {screening.notes && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Clinical Notes</div>
          <p className="text-sm text-slate-700 leading-relaxed">{screening.notes}</p>
        </div>
      )}

      <div className="flex gap-3 pb-4">
        {client && (
          <Link href={`/dashboard/clients/${client.id}`} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
            View Client
          </Link>
        )}
        <Link href="/dashboard/screenings/dast10/new" className="bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-500">
          Administer Again
        </Link>
      </div>
    </div>
  );
}
