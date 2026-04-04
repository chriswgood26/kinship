import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PHQ9, GAD7, getSeverity } from "@/lib/screenings";
import { CSSRS } from "@/lib/cssrs";

export const dynamic = "force-dynamic";

export default async function ScreeningsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", user.id).single();

  const { data: screenings } = await supabaseAdmin
    .from("screenings")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", profile?.organization_id || "")
    .order("administered_at", { ascending: false })
    .limit(50);

  const phq9Count = screenings?.filter(s => s.tool === "phq9").length || 0;
  const gad7Count = screenings?.filter(s => s.tool === "gad7").length || 0;
  const cssrsCount = screenings?.filter(s => s.tool === "cssrs").length || 0;
  const siAlerts = screenings?.filter(s => s.tool === "phq9" && (s.answers?.q9 || 0) > 0).length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Screenings</h1>
          <p className="text-slate-500 text-sm mt-0.5">PHQ-9 and GAD-7 standardized screening tools</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/screenings/phq9/new"
            className="border border-teal-200 text-teal-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-50 text-sm">
            + PHQ-9
          </Link>
          <Link href="/dashboard/screenings/gad7/new"
            className="border border-purple-200 text-purple-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-purple-50 text-sm">
            + GAD-7
          </Link>
          <Link href="/dashboard/screenings/cssrs/new"
            className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-red-400 text-sm">
            + C-SSRS
          </Link>
        </div>
      </div>

      {siAlerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <div className="font-semibold text-red-800">Suicidal ideation flagged</div>
            <div className="text-sm text-red-600">{siAlerts} PHQ-9 screening{siAlerts > 1 ? "s have" : " has"} a positive response on question 9 — review immediately</div>
          </div>
        </div>
      )}

      {/* Tool cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { tool: PHQ9, count: phq9Count, href: "/dashboard/screenings/phq9/new", bg: "bg-blue-50 border-blue-100" },
          { tool: GAD7, count: gad7Count, href: "/dashboard/screenings/gad7/new", bg: "bg-purple-50 border-purple-100" },
        ].map(({ tool, count, href, bg }) => (
          <div key={tool.id} className={`${bg} border rounded-2xl p-5`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-slate-900 text-lg">{tool.name}</div>
                <div className="text-sm text-slate-500">{tool.fullName}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">{count}</div>
                <div className="text-xs text-slate-400">completed</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mb-3">{tool.questions.length} questions · Max score {tool.maxScore}</div>
            <div className="flex flex-wrap gap-1 mb-4">
              {tool.severity.map(s => (
                <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
              ))}
            </div>
            <Link href={href} className={`block text-center py-2 rounded-xl text-sm font-semibold ${tool.id === "phq9" ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-purple-500 text-white hover:bg-purple-600"} transition-colors`}>
              Administer {tool.name} →
            </Link>
          </div>
        ))}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-slate-900 text-lg">C-SSRS</div>
              <div className="text-sm text-slate-500">Columbia Suicide Severity Rating Scale</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{cssrsCount}</div>
              <div className="text-xs text-slate-400">completed</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-3">4 subscales · Ideation, Intensity, Behavior, Risk Level</div>
          <div className="flex flex-wrap gap-1 mb-4">
            {["Low Risk", "Moderate Risk", "High Risk", "Imminent Risk"].map(l => (
              <span key={l} className="text-xs bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full font-medium">{l}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/screenings/cssrs/new" className="flex-1 text-center py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">
              Administer C-SSRS →
            </Link>
            <Link href="/dashboard/safety-plans" className="text-center py-2 px-3 rounded-xl text-sm font-semibold border border-red-200 text-red-700 hover:bg-red-50 transition-colors">
              🛡️ Plans
            </Link>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Screening History</h2>
        </div>
        {!screenings?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No screenings completed yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tool</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {screenings.map(s => {
                const client = Array.isArray(s.client) ? s.client[0] : s.client;
                const isCSSRS = s.tool === "cssrs";
                const tool = s.tool === "phq9" ? PHQ9 : GAD7;
                const severity = isCSSRS ? null : getSeverity(s.total_score || 0, tool);
                const hasSI = s.tool === "phq9" && (s.answers?.q9 || 0) > 0;
                const cssrsRiskColors: Record<string, string> = {
                  "Low Risk": "bg-emerald-100 text-emerald-700",
                  "Moderate Risk": "bg-amber-100 text-amber-700",
                  "High Risk": "bg-orange-100 text-orange-700",
                  "Imminent Risk": "bg-red-100 text-red-700",
                };
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-sm text-slate-900">{client ? `${client.last_name}, ${client.first_name}` : "—"}</div>
                      <div className="text-xs text-slate-400">{client?.mrn || "—"}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${s.tool === "phq9" ? "bg-blue-100 text-blue-700" : s.tool === "cssrs" ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"}`}>
                        {s.tool?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{s.administered_at ? new Date(s.administered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                    <td className="px-4 py-3.5 text-2xl font-bold text-slate-900">
                      {isCSSRS ? (
                        <span className="text-sm font-semibold text-slate-500">Level {s.total_score ?? "—"}</span>
                      ) : (
                        <>{s.total_score ?? "—"}<span className="text-sm font-normal text-slate-400">/{tool.maxScore}</span></>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {isCSSRS ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cssrsRiskColors[s.severity_label || ""] || "bg-slate-100 text-slate-600"}`}>
                          {s.severity_label || "—"}
                        </span>
                      ) : (
                        <>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${severity?.color}`}>{severity?.label}</span>
                          {hasSI && <span className="ml-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">🚨 SI</span>}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/dashboard/screenings/${s.tool}/${s.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
