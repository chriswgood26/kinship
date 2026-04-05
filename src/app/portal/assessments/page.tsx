import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalAssessmentsPage() {
  const user = await currentUser();
  if (!user) redirect("/portal/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("id, client_id, organization_id, access_settings")
    .eq("clerk_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!portalUser) redirect("/portal/dashboard");

  const { data: screenings } = await supabaseAdmin
    .from("screenings")
    .select("id, tool, total_score, severity_label, administered_at, source")
    .eq("client_id", portalUser.client_id)
    .eq("organization_id", portalUser.organization_id)
    .order("administered_at", { ascending: false })
    .limit(20);

  const toolName = (tool: string) =>
    tool === "phq9" ? "PHQ-9 (Depression)" : tool === "gad7" ? "GAD-7 (Anxiety)" : tool.toUpperCase();

  const severityColor = (label: string | null) => {
    if (!label) return "bg-slate-100 text-slate-600";
    const l = label.toLowerCase();
    if (l.includes("minimal") || l.includes("none")) return "bg-emerald-100 text-emerald-700";
    if (l.includes("mild")) return "bg-blue-100 text-blue-700";
    if (l.includes("moderate")) return "bg-amber-100 text-amber-700";
    if (l.includes("severe")) return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Health Questionnaires</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Complete these brief questionnaires before your appointment to help your care team prepare.
        </p>
      </div>

      {/* Available questionnaires */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Start a Questionnaire</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/portal/assessments/phq9"
            className="bg-white border-2 border-blue-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-sm transition-all no-underline"
          >
            <div className="text-3xl mb-2">🔵</div>
            <div className="font-bold text-slate-900">PHQ-9</div>
            <div className="text-sm text-slate-500 mt-1">Patient Health Questionnaire — 9 questions about depression symptoms over the past 2 weeks</div>
            <div className="mt-3 text-xs text-blue-600 font-semibold">~2 minutes →</div>
          </Link>
          <Link
            href="/portal/assessments/gad7"
            className="bg-white border-2 border-purple-200 rounded-2xl p-5 hover:border-purple-400 hover:shadow-sm transition-all no-underline"
          >
            <div className="text-3xl mb-2">🟣</div>
            <div className="font-bold text-slate-900">GAD-7</div>
            <div className="text-sm text-slate-500 mt-1">Generalized Anxiety Disorder Scale — 7 questions about anxiety symptoms over the past 2 weeks</div>
            <div className="mt-3 text-xs text-purple-600 font-semibold">~2 minutes →</div>
          </Link>
        </div>
      </div>

      {/* Past submissions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Your Submission History</h2>
        {!screenings?.length ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-slate-500 text-sm">No questionnaires submitted yet.</p>
            <p className="text-slate-400 text-xs mt-1">Your results will appear here after you complete your first questionnaire.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {screenings.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <div className="text-2xl">{s.tool === "phq9" ? "🔵" : s.tool === "gad7" ? "🟣" : "📋"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 text-sm">{toolName(s.tool)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {s.administered_at
                      ? new Date(s.administered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                    {s.source === "patient_portal" && (
                      <span className="ml-2 text-teal-600 font-medium">· Self-reported</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {s.severity_label && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${severityColor(s.severity_label)}`}>
                      {s.severity_label}
                    </span>
                  )}
                  <div className="text-xs text-slate-400 mt-1">Score: {s.total_score ?? "—"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-600">
        <strong>Note:</strong> Your responses are shared securely with your care team. If you are in crisis or having thoughts of harming yourself, please call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline) or call <strong>911</strong>.
      </div>
    </div>
  );
}
