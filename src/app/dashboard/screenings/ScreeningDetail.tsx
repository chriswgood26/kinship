import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { RATING_OPTIONS, getSeverity, isSuicidalIdeation } from "@/lib/screenings";

export const dynamic = "force-dynamic";

interface Tool { id: string; name: string; fullName: string; maxScore: number; questions: { id: string; text: string }[]; severity: { max: number; label: string; color: string; recommendation: string }[]; }

export default async function ScreeningDetail({ tool, screeningId }: { tool: Tool; screeningId: string }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: screening } = await supabaseAdmin
    .from("screenings")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("id", screeningId)
    .single();

  if (!screening) notFound();

  const client = Array.isArray(screening.client) ? screening.client[0] : screening.client;
  const severity = getSeverity(screening.total_score || 0, tool);
  const hasSI = tool.id === "phq9" && isSuicidalIdeation(screening.answers || {});

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{tool.name} Results</h1>
          {client && <Link href={`/dashboard/clients/${client.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">{client.last_name}, {client.first_name} · MRN: {client.mrn || "—"}</Link>}
        </div>
      </div>

      {hasSI && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <div className="font-bold text-red-800">Suicidal Ideation Flagged</div>
            <div className="text-sm text-red-700">Question 9 was endorsed. Immediate safety assessment required. Document safety planning.</div>
          </div>
        </div>
      )}

      {/* Score summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Total Score</div>
            <div className="text-6xl font-bold text-slate-900 mt-1">{screening.total_score}<span className="text-xl font-normal text-slate-400">/{tool.maxScore}</span></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Severity</div>
            <span className={`text-lg px-4 py-2 rounded-xl font-bold ${severity.color}`}>{severity.label}</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="bg-slate-100 rounded-full h-4 overflow-hidden mb-3">
          <div className={`h-4 rounded-full transition-all ${
            (screening.total_score || 0) / tool.maxScore < 0.33 ? "bg-emerald-500" :
            (screening.total_score || 0) / tool.maxScore < 0.66 ? "bg-amber-500" : "bg-red-500"
          }`} style={{ width: `${((screening.total_score || 0) / tool.maxScore) * 100}%` }} />
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clinical Recommendation</div>
          <p className="text-sm text-slate-700">{severity.recommendation}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div><div className="text-xs text-slate-400">Administered</div><div className="font-medium text-slate-900">{screening.administered_at ? new Date(screening.administered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</div></div>
          <div><div className="text-xs text-slate-400">Administered By</div><div className="font-medium text-slate-900">{screening.administered_by || "—"}</div></div>
          <div><div className="text-xs text-slate-400">Tool</div><div className="font-bold font-mono text-slate-900">{tool.name}</div></div>
        </div>
      </div>

      {/* Item-by-item breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Response Detail</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {tool.questions.map((q, i) => {
            const answer = (screening.answers || {})[q.id];
            const label = RATING_OPTIONS.find(r => r.value === answer)?.label || "Not answered";
            const isHighAlert = tool.id === "phq9" && q.id === "q9" && answer > 0;
            return (
              <div key={q.id} className={`flex items-start gap-4 px-5 py-4 ${isHighAlert ? "bg-red-50" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  answer === 0 ? "bg-emerald-100 text-emerald-700" :
                  answer === 1 ? "bg-blue-100 text-blue-700" :
                  answer === 2 ? "bg-amber-100 text-amber-700" :
                  answer === 3 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                }`}>{answer ?? "—"}</div>
                <div className="flex-1">
                  <div className="text-xs text-slate-400 mb-0.5">Q{i + 1}</div>
                  <div className="text-sm text-slate-900 font-medium">{q.text}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                  {isHighAlert && <div className="text-xs font-bold text-red-600 mt-1">🚨 Suicidal ideation indicator</div>}
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
        {client && <Link href={`/dashboard/clients/${client.id}`} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">View Client</Link>}
        <Link href={`/dashboard/screenings/${tool.id}/new`} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">Administer Again</Link>
      </div>
    </div>
  );
}
