import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { MMSE, getCognitiveSeverity, getDomainScore } from "@/lib/cognitiveScreenings";

export const dynamic = "force-dynamic";

export default async function MMSEDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const severity = getCognitiveSeverity(score, MMSE);
  const answers: Record<string, number> = screening.answers || {};

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">MMSE Results</h1>
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
            <div className="text-6xl font-bold text-slate-900 mt-1">
              {score}<span className="text-xl font-normal text-slate-400">/{MMSE.maxScore}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Classification</div>
            <span className={`text-lg px-4 py-2 rounded-xl font-bold ${severity.color}`}>{severity.label}</span>
          </div>
        </div>

        <div className="bg-slate-100 rounded-full h-4 overflow-hidden mb-3">
          <div className={`h-4 rounded-full transition-all ${
            score >= 24 ? "bg-emerald-500" : score >= 18 ? "bg-amber-500" : score >= 10 ? "bg-orange-500" : "bg-red-500"
          }`} style={{ width: `${(score / MMSE.maxScore) * 100}%` }} />
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clinical Recommendation</div>
          <p className="text-sm text-slate-700">{severity.recommendation}</p>
        </div>

        {/* Domain score summary */}
        <div className="grid grid-cols-2 gap-2">
          {MMSE.domains.map(domain => {
            const ds = getDomainScore(answers, domain);
            return (
              <div key={domain.id} className={`rounded-xl p-3 border ${domain.bgColor}`}>
                <div className={`text-xs font-semibold ${domain.color} mb-1`}>{domain.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-bold ${domain.color}`}>{ds}</span>
                  <span className="text-xs text-slate-400">/ {domain.maxPoints}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div><div className="text-xs text-slate-400">Administered</div><div className="font-medium text-slate-900">{screening.administered_at ? new Date(screening.administered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</div></div>
          <div><div className="text-xs text-slate-400">Administered By</div><div className="font-medium text-slate-900">{screening.administered_by || "—"}</div></div>
          <div><div className="text-xs text-slate-400">Tool</div><div className="font-bold font-mono text-slate-900">MMSE</div></div>
        </div>
      </div>

      {/* Domain-by-domain breakdown */}
      <div className="space-y-4">
        {MMSE.domains.map(domain => {
          const domainScore = getDomainScore(answers, domain);
          return (
            <div key={domain.id} className={`rounded-2xl border overflow-hidden ${domain.bgColor}`}>
              <div className="px-5 py-3 flex items-center justify-between border-b border-white/50">
                <h2 className={`font-bold text-base ${domain.color}`}>{domain.name}</h2>
                <span className={`font-bold ${domain.color}`}>{domainScore} / {domain.maxPoints}</span>
              </div>
              <div className="divide-y divide-white/50">
                {domain.items.map((item, i) => {
                  const pts = answers[item.id] ?? null;
                  const passed = pts !== null && pts > 0;
                  return (
                    <div key={item.id} className="flex items-start gap-3 px-5 py-3 bg-white/60">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                        pts === null ? "bg-slate-100 text-slate-400" :
                        passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                      }`}>
                        {pts === null ? "—" : pts}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-400 mb-0.5">Item {i + 1}</div>
                        <div className="text-sm font-medium text-slate-900">{item.text}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {pts === null ? "Not scored" : passed ? `Scored: ${pts} / ${item.maxPoints} pt${item.maxPoints > 1 ? "s" : ""}` : `0 / ${item.maxPoints} pts`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
        <Link href="/dashboard/screenings/mmse/new" className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-500">
          Administer Again
        </Link>
      </div>
    </div>
  );
}
