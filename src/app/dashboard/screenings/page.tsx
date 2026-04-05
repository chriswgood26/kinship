import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PHQ9, GAD7, getSeverity } from "@/lib/screenings";
import { CSSRS } from "@/lib/cssrs";
import { AUDIT, DAST10 } from "@/lib/substanceScreenings";
import { ACE, getACESeverity } from "@/lib/aceScreening";
import { SDOH, getSDOHSeverity } from "@/lib/sdoh";
import { MOCA, MMSE, getCognitiveSeverity } from "@/lib/cognitiveScreenings";
import OrgScreeningTrends from "@/components/OrgScreeningTrends";

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

  const patientSubmittedCount = screenings?.filter(s => s.source === "patient_portal").length || 0;

  const phq9Count = screenings?.filter(s => s.tool === "phq9").length || 0;
  const gad7Count = screenings?.filter(s => s.tool === "gad7").length || 0;
  const cssrsCount = screenings?.filter(s => s.tool === "cssrs").length || 0;
  const auditCount = screenings?.filter(s => s.tool === "audit").length || 0;
  const dastCount = screenings?.filter(s => s.tool === "dast10").length || 0;
  const aceCount = screenings?.filter(s => s.tool === "ace").length || 0;
  const siAlerts = screenings?.filter(s => s.tool === "phq9" && (s.answers?.q9 || 0) > 0).length || 0;
  const aceHighRisk = screenings?.filter(s => s.tool === "ace" && (s.total_score || 0) >= 4).length || 0;
  const sdohCount = screenings?.filter(s => s.tool === "sdoh").length || 0;
  const sdohHighNeed = screenings?.filter(s => s.tool === "sdoh" && (s.total_score || 0) >= 6).length || 0;
  const mocaCount = screenings?.filter(s => s.tool === "moca").length || 0;
  const mmseCount = screenings?.filter(s => s.tool === "mmse").length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Screenings</h1>
          <p className="text-slate-500 text-sm mt-0.5">PHQ-9, GAD-7, MoCA, MMSE, AUDIT, DAST-10, ACE, SDOH, and C-SSRS standardized screening tools</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/screenings/phq9/new"
            className="border border-teal-200 text-teal-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-50 text-sm">
            + PHQ-9
          </Link>
          <Link href="/dashboard/screenings/gad7/new"
            className="border border-purple-200 text-purple-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-purple-50 text-sm">
            + GAD-7
          </Link>
          <Link href="/dashboard/screenings/audit/new"
            className="border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-amber-50 text-sm">
            + AUDIT
          </Link>
          <Link href="/dashboard/screenings/dast10/new"
            className="border border-violet-200 text-violet-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-violet-50 text-sm">
            + DAST-10
          </Link>
          <Link href="/dashboard/screenings/ace/new"
            className="border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-rose-50 text-sm">
            + ACE
          </Link>
          <Link href="/dashboard/screenings/sdoh/new"
            className="border border-teal-200 text-teal-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-50 text-sm">
            + SDOH
          </Link>
          <Link href="/dashboard/screenings/moca/new"
            className="border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-50 text-sm">
            + MoCA
          </Link>
          <Link href="/dashboard/screenings/mmse/new"
            className="border border-purple-200 text-purple-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-purple-50 text-sm">
            + MMSE
          </Link>
          <Link href="/dashboard/screenings/cssrs/new"
            className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-red-400 text-sm">
            + C-SSRS
          </Link>
        </div>
      </div>

      {patientSubmittedCount > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">📲</span>
          <div>
            <div className="font-semibold text-teal-800">Patient-submitted questionnaires</div>
            <div className="text-sm text-teal-600">{patientSubmittedCount} screening{patientSubmittedCount > 1 ? "s were" : " was"} completed by patients via the portal — review before appointments</div>
          </div>
        </div>
      )}

      {siAlerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <div className="font-semibold text-red-800">Suicidal ideation flagged</div>
            <div className="text-sm text-red-600">{siAlerts} PHQ-9 screening{siAlerts > 1 ? "s have" : " has"} a positive response on question 9 — review immediately</div>
          </div>
        </div>
      )}

      {aceHighRisk > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-semibold text-rose-800">Elevated ACE scores detected</div>
            <div className="text-sm text-rose-600">{aceHighRisk} ACE screening{aceHighRisk > 1 ? "s have" : " has"} a score ≥ 4 — trauma-specialized assessment and referral recommended</div>
          </div>
        </div>
      )}

      {sdohHighNeed > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">⚑</span>
          <div>
            <div className="font-semibold text-amber-800">High social need burden identified</div>
            <div className="text-sm text-amber-600">{sdohHighNeed} SDOH screening{sdohHighNeed > 1 ? "s have" : " has"} 6+ unmet needs — social work consultation and community navigation recommended</div>
          </div>
        </div>
      )}

      {/* Population Trends */}
      <OrgScreeningTrends />

      {/* Tool cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* PHQ-9 */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-slate-900 text-lg">{PHQ9.name}</div>
              <div className="text-sm text-slate-500">{PHQ9.fullName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{phq9Count}</div>
              <div className="text-xs text-slate-400">completed</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-3">{PHQ9.questions.length} questions · Max score {PHQ9.maxScore}</div>
          <div className="flex flex-wrap gap-1 mb-4">
            {PHQ9.severity.map(s => (
              <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
            ))}
          </div>
          <Link href="/dashboard/screenings/phq9/new" className="block text-center py-2 rounded-xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors">
            Administer PHQ-9 →
          </Link>
        </div>

        {/* GAD-7 */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-slate-900 text-lg">{GAD7.name}</div>
              <div className="text-sm text-slate-500">{GAD7.fullName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{gad7Count}</div>
              <div className="text-xs text-slate-400">completed</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-3">{GAD7.questions.length} questions · Max score {GAD7.maxScore}</div>
          <div className="flex flex-wrap gap-1 mb-4">
            {GAD7.severity.map(s => (
              <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
            ))}
          </div>
          <Link href="/dashboard/screenings/gad7/new" className="block text-center py-2 rounded-xl text-sm font-semibold bg-purple-500 text-white hover:bg-purple-600 transition-colors">
            Administer GAD-7 →
          </Link>
        </div>

        {/* MoCA */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-slate-900 text-lg">{MOCA.name}</div>
              <div className="text-sm text-slate-500">{MOCA.fullName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{mocaCount}</div>
              <div className="text-xs text-slate-400">completed</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-3">{MOCA.domains.length} domains · Max score {MOCA.maxScore} · MCI &amp; dementia screening</div>
          <div className="flex flex-wrap gap-1 mb-4">
            {MOCA.severity.map(s => (
              <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
            ))}
          </div>
          <Link href="/dashboard/screenings/moca/new" className="block text-center py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
            Administer MoCA →
          </Link>
        </div>

        {/* MMSE */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-slate-900 text-lg">{MMSE.name}</div>
              <div className="text-sm text-slate-500">{MMSE.fullName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{mmseCount}</div>
              <div className="text-xs text-slate-400">completed</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-3">{MMSE.domains.length} domains · Max score {MMSE.maxScore} · Orientation, memory, language</div>
          <div className="flex flex-wrap gap-1 mb-4">
            {MMSE.severity.map(s => (
              <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
            ))}
          </div>
          <Link href="/dashboard/screenings/mmse/new" className="block text-center py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors">
            Administer MMSE →
          </Link>
        </div>

        {/* AUDIT */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-slate-900 text-lg">{AUDIT.name}</div>
              <div className="text-sm text-slate-500">{AUDIT.fullName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{auditCount}</div>
              <div className="text-xs text-slate-400">completed</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-3">{AUDIT.questions.length} questions · Max score {AUDIT.maxScore} · WHO validated</div>
          <div className="flex flex-wrap gap-1 mb-4">
            {AUDIT.severity.map(s => (
              <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
            ))}
          </div>
          <Link href="/dashboard/screenings/audit/new" className="block text-center py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors">
            Administer AUDIT →
          </Link>
        </div>

        {/* DAST-10 */}
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-slate-900 text-lg">{DAST10.name}</div>
              <div className="text-sm text-slate-500">{DAST10.fullName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{dastCount}</div>
              <div className="text-xs text-slate-400">completed</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-3">{DAST10.questions.length} questions · Max score {DAST10.maxScore} · Yes/No format</div>
          <div className="flex flex-wrap gap-1 mb-4">
            {DAST10.severity.map(s => (
              <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
            ))}
          </div>
          <Link href="/dashboard/screenings/dast10/new" className="block text-center py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors">
            Administer DAST-10 →
          </Link>
        </div>

        {/* ACE */}
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 col-span-2">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-slate-900 text-lg">{ACE.name}</div>
              <div className="text-sm text-slate-500">{ACE.fullName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{aceCount}</div>
              <div className="text-xs text-slate-400">completed</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-3">{ACE.questions.length} questions · Max score {ACE.maxScore} · Trauma-informed care · CDC-Kaiser validated</div>
          <div className="flex flex-wrap gap-1 mb-4">
            {ACE.severity.map(s => (
              <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
            ))}
          </div>
          <Link href="/dashboard/screenings/ace/new" className="block text-center py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-500 transition-colors">
            Administer ACE →
          </Link>
        </div>

        {/* SDOH */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 col-span-2">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-slate-900 text-lg">{SDOH.name}</div>
              <div className="text-sm text-slate-500">{SDOH.fullName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{sdohCount}</div>
              <div className="text-xs text-slate-400">completed</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-3">{SDOH.questions.length} questions · {SDOH.domains.length} domains · Housing, Food, Transportation + more</div>
          <div className="flex flex-wrap gap-1 mb-4">
            {SDOH.severity.map(s => (
              <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
            ))}
          </div>
          <Link href="/dashboard/screenings/sdoh/new" className="block text-center py-2 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-500 transition-colors">
            Administer SDOH →
          </Link>
        </div>

        {/* C-SSRS */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 col-span-2">
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
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
                const isAUDIT = s.tool === "audit";
                const isDAST = s.tool === "dast10";
                const isACE = s.tool === "ace";
                const isSDOH = s.tool === "sdoh";
                const isMoCA = s.tool === "moca";
                const isMMSE = s.tool === "mmse";
                const isCognitive = isMoCA || isMMSE;
                const isSubstance = isAUDIT || isDAST;
                const isStandard = !isCSSRS && !isSubstance && !isACE && !isSDOH && !isCognitive;
                const tool = s.tool === "phq9" ? PHQ9 : GAD7;
                const severity = isStandard ? getSeverity(s.total_score || 0, tool) : null;
                const aceSeverity = isACE ? getACESeverity(s.total_score || 0) : null;
                const sdohSeverity = isSDOH ? getSDOHSeverity(s.total_score || 0) : null;
                const cognitiveSeverity = isCognitive ? getCognitiveSeverity(s.total_score || 0, isMoCA ? MOCA : MMSE) : null;
                const hasSI = s.tool === "phq9" && (s.answers?.q9 || 0) > 0;
                const toolBadgeClass: Record<string, string> = {
                  phq9: "bg-blue-100 text-blue-700",
                  gad7: "bg-purple-100 text-purple-700",
                  cssrs: "bg-red-100 text-red-700",
                  audit: "bg-amber-100 text-amber-700",
                  dast10: "bg-violet-100 text-violet-700",
                  ace: "bg-rose-100 text-rose-700",
                  sdoh: "bg-teal-100 text-teal-700",
                  moca: "bg-indigo-100 text-indigo-700",
                  mmse: "bg-purple-100 text-purple-700",
                };
                const toolMaxScore: Record<string, number> = {
                  phq9: PHQ9.maxScore, gad7: GAD7.maxScore, audit: AUDIT.maxScore, dast10: DAST10.maxScore, ace: ACE.maxScore, sdoh: SDOH.maxScore, moca: MOCA.maxScore, mmse: MMSE.maxScore,
                };
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-sm text-slate-900">{client ? `${client.last_name}, ${client.first_name}` : "—"}</div>
                      <div className="text-xs text-slate-400">{client?.mrn || "—"}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${toolBadgeClass[s.tool] || "bg-slate-100 text-slate-600"}`}>
                        {s.tool === "dast10" ? "DAST-10" : s.tool === "sdoh" ? "SDOH" : s.tool === "moca" ? "MoCA" : s.tool?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {s.source === "patient_portal" ? (
                        <span className="text-xs bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded-full">📲 Patient</span>
                      ) : (
                        <span className="text-xs text-slate-400">Clinician</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{s.administered_at ? new Date(s.administered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                    <td className="px-4 py-3.5 text-2xl font-bold text-slate-900">
                      {isCSSRS ? (
                        <span className="text-sm font-semibold text-slate-500">Level {s.total_score ?? "—"}</span>
                      ) : (
                        <>{s.total_score ?? "—"}<span className="text-sm font-normal text-slate-400">/{toolMaxScore[s.tool] ?? "—"}</span></>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {isACE ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${aceSeverity?.color}`}>
                          {aceSeverity?.label || "—"}
                        </span>
                      ) : isSDOH ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sdohSeverity?.color}`}>
                          {sdohSeverity?.label || "—"}
                        </span>
                      ) : isCognitive ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cognitiveSeverity?.color}`}>
                          {cognitiveSeverity?.label || "—"}
                        </span>
                      ) : (isCSSRS || isSubstance) ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600`}>
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
