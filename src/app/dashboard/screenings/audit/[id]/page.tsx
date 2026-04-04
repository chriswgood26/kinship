import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { AUDIT, getAUDITSeverity } from "@/lib/substanceScreenings";

export const dynamic = "force-dynamic";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const severity = getAUDITSeverity(score);
  const answers: Record<string, number> = screening.answers || {};

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">AUDIT Results</h1>
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
            <div className="text-6xl font-bold text-slate-900 mt-1">{score}<span className="text-xl font-normal text-slate-400">/{AUDIT.maxScore}</span></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Risk Level</div>
            <span className={`text-lg px-4 py-2 rounded-xl font-bold ${severity.color}`}>{severity.label}</span>
          </div>
        </div>

        {/* Score bar with zones */}
        <div className="relative mb-3">
          <div className="flex h-4 rounded-full overflow-hidden">
            <div className="flex-[7] bg-emerald-200" />
            <div className="flex-[8] bg-amber-200" />
            <div className="flex-[4] bg-orange-200" />
            <div className="flex-[21] bg-red-200" />
          </div>
          <div
            className="absolute top-0 w-3 h-4 bg-slate-800 rounded-full -translate-x-1/2 transition-all"
            style={{ left: `${(score / AUDIT.maxScore) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mb-4">
          <span>0 — Low Risk</span>
          <span>8</span>
          <span>16</span>
          <span>20</span>
          <span>40 — Dependence</span>
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
            <div className="font-bold font-mono text-slate-900">AUDIT</div>
          </div>
        </div>
      </div>

      {/* Item-by-item breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Response Detail</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {AUDIT.questions.map((q, i) => {
            const answer = answers[q.id];
            const selectedOpt = q.options.find(o => o.value === answer);
            return (
              <div key={q.id} className="flex items-start gap-4 px-5 py-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  answer === 0 ? "bg-emerald-100 text-emerald-700" :
                  answer <= 2 ? "bg-blue-100 text-blue-700" :
                  answer <= 3 ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {answer ?? "—"}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-400 mb-0.5">Q{i + 1}</div>
                  <div className="text-sm text-slate-900 font-medium">{q.text}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{selectedOpt?.label ?? "Not answered"}</div>
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
        <Link href="/dashboard/screenings/audit/new" className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-400">
          Administer Again
        </Link>
      </div>
    </div>
  );
}
