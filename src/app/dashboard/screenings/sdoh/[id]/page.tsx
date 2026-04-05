import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { SDOH, getSDOHSeverity, getSDOHDomainNeeds } from "@/lib/sdoh";

export const dynamic = "force-dynamic";

export default async function SDOHDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const severity = getSDOHSeverity(score);
  const answers: Record<string, boolean | null> = screening.answers || {};
  const domainsWithNeeds = getSDOHDomainNeeds(answers);

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">SDOH Screening Results</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-semibold ${severity.color}`}>{severity.label}</span>
          </div>
          {client && (
            <Link href={`/dashboard/clients/${client.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
              {client.last_name}, {client.first_name} · MRN: {client.mrn || "—"}
            </Link>
          )}
        </div>
      </div>

      {score >= 3 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⚑</span>
          <div>
            <div className="font-semibold text-amber-800 text-sm">Multiple Social Needs Identified</div>
            <div className="text-xs text-amber-700 mt-0.5">
              {score} social need{score > 1 ? "s" : ""} identified across {domainsWithNeeds.length} domain{domainsWithNeeds.length !== 1 ? "s" : ""}.
              Social work consultation and community resource referrals are recommended.
            </div>
          </div>
        </div>
      )}

      {/* Score summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Social Needs Identified</div>
            <div className="text-6xl font-bold text-slate-900 mt-1">{score}<span className="text-xl font-normal text-slate-400">/{SDOH.maxScore}</span></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Need Level</div>
            <span className={`text-lg px-4 py-2 rounded-xl font-bold ${severity.color}`}>{severity.label}</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="bg-slate-100 rounded-full h-4 overflow-hidden mb-4">
          <div className={`h-4 rounded-full transition-all ${
            score === 0 ? "bg-emerald-500" :
            score <= 2 ? "bg-blue-500" :
            score <= 5 ? "bg-amber-500" : "bg-red-500"
          }`} style={{ width: `${(score / SDOH.maxScore) * 100}%` }} />
        </div>

        {/* Domain need badges */}
        {domainsWithNeeds.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Domains with Identified Needs</div>
            <div className="flex flex-wrap gap-2">
              {domainsWithNeeds.map(domain => (
                <span key={domain.name} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${domain.color}`}>
                  {domain.icon} {domain.name}
                </span>
              ))}
            </div>
          </div>
        )}

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
            <div className="font-bold font-mono text-slate-900">SDOH</div>
          </div>
        </div>
      </div>

      {/* Domain-by-domain breakdown */}
      {SDOH.domains.map(domain => {
        const domainQuestions = domain.questions.map(qid => SDOH.questions.find(q => q.id === qid)!).filter(Boolean);
        const domainNeeds = domainQuestions.filter(q => answers[q.id] === true).length;
        const hasAnyAnswer = domainQuestions.some(q => answers[q.id] !== undefined && answers[q.id] !== null);
        if (!hasAnyAnswer) return null;
        return (
          <div key={domain.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className={`px-5 py-3 border-b flex items-center justify-between ${domainNeeds > 0 ? "bg-amber-50 border-amber-100" : "border-slate-100"}`}>
              <div className="flex items-center gap-2">
                <span>{domain.icon}</span>
                <h2 className="font-semibold text-slate-900 text-sm">{domain.name}</h2>
              </div>
              {domainNeeds > 0 ? (
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{domainNeeds} need{domainNeeds > 1 ? "s" : ""}</span>
              ) : (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">No needs</span>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {domainQuestions.map((q, i) => {
                const globalIndex = SDOH.questions.findIndex(sq => sq.id === q.id);
                const answer = answers[q.id];
                const isAnswered = answer !== undefined && answer !== null;
                const isPositive = answer === true;
                return (
                  <div key={q.id} className={`flex items-start gap-4 px-5 py-4 ${isPositive ? "bg-amber-50/30" : ""}`}>
                    {isAnswered ? (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${answer ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {answer ? "YES" : "NO"}
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 bg-slate-100 text-slate-400">—</span>
                    )}
                    <div className="flex-1">
                      <div className="text-xs text-slate-400 mb-0.5">Q{globalIndex + 1}</div>
                      <div className="text-sm text-slate-900 font-medium">{q.text}</div>
                      {isPositive && <div className="text-xs font-semibold text-amber-600 mt-1">⚑ Social need identified</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

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
        <Link href="/dashboard/screenings/sdoh/new" className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-500">
          Administer Again
        </Link>
      </div>
    </div>
  );
}
