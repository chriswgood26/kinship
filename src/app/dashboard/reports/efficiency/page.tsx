import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function EfficiencyReportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const workflows = [
    {
      category: "Clinical Documentation",
      tasks: [
        {
          task: "Complete a progress note (SOAP)",
          legacy: 14,
          neo: 4,
          legacySteps: ["Login", "Navigate to patient list", "Search patient", "Open chart", "Find encounters tab", "Click 'new encounter'", "Select note type", "Open text editor", "Type S section", "Tab to O section", "Tab to A section", "Tab to P section", "Click save", "Click confirm"],
          neoSteps: ["Open Encounters", "Click + New", "Select patient", "Type SOAP → Sign"],
        },
        {
          task: "Sign & lock a clinical note",
          legacy: 8,
          neo: 2,
          legacySteps: ["Find note in queue", "Open note", "Review note", "Click 'signature'", "Enter PIN", "Confirm signature", "Close dialog", "Return to list"],
          neoSteps: ["Open note", "Click Sign & Lock"],
        },
        {
          task: "Create a treatment plan",
          legacy: 22,
          neo: 6,
          legacySteps: ["Login to treatment planning module (separate)", "Select patient", "Click 'new plan'", "Fill demographics tab", "Click next", "Fill diagnosis tab", "Click next", "Add goal 1", "Save goal", "Add objective", "Save objective", "Add intervention", "Save intervention", "Add goal 2", "Save goal", "Add objective", "Save objective", "Click 'review'", "Click 'approve'", "Print for signature", "Scan signed copy", "Upload to chart"],
          neoSteps: ["Open Treatment Plans", "Click + New", "Search patient", "Fill presenting problem + strengths", "Add goals/objectives inline", "Save"],
        },
        {
          task: "View patient's full history",
          legacy: 6,
          neo: 2,
          legacySteps: ["Navigate to patient search", "Enter patient ID", "Open chart", "Select correct chart version", "Navigate to history tab", "Filter by date"],
          neoSteps: ["Open Patients", "Click patient name"],
        },
      ],
    },
    {
      category: "Scheduling",
      tasks: [
        {
          task: "Schedule a new appointment",
          legacy: 11,
          neo: 4,
          legacySteps: ["Navigate to scheduling module", "Select provider calendar", "Find available slot", "Click slot", "Search patient", "Select patient", "Select appointment type", "Set duration", "Set location", "Add notes", "Save"],
          neoSteps: ["Open Scheduling", "Click time slot", "Search + select patient", "Save"],
        },
        {
          task: "View today's schedule",
          legacy: 5,
          neo: 1,
          legacySteps: ["Navigate to scheduling", "Select provider", "Set date filter to today", "Select 'day view'", "Wait for load"],
          neoSteps: ["Open Dashboard (today's schedule shown automatically)"],
        },
      ],
    },
    {
      category: "Billing",
      tasks: [
        {
          task: "Add a charge after an encounter",
          legacy: 13,
          neo: 4,
          legacySteps: ["Navigate to billing module", "Search patient", "Select correct patient", "Click 'new charge'", "Enter service date", "Search CPT code", "Enter CPT manually", "Enter units", "Enter diagnosis codes", "Enter charge amount", "Select rendering provider", "Click save", "Submit to queue"],
          neoSteps: ["Open Billing", "Click + Add Charge", "Search patient + select CPT (auto-fills amount)", "Save"],
        },
        {
          task: "Check claim status",
          legacy: 7,
          neo: 2,
          legacySteps: ["Navigate to billing", "Search patient", "Open billing tab", "Find claim", "Click claim", "Check status screen", "Return to list"],
          neoSteps: ["Open Billing", "Filter by status"],
        },
      ],
    },
    {
      category: "Referrals & Care Coordination",
      tasks: [
        {
          task: "Send an internal referral",
          legacy: 10,
          neo: 4,
          legacySteps: ["Open patient chart", "Navigate to referrals tab", "Click 'new referral'", "Select referral type", "Search receiving provider", "Enter clinical reason", "Set priority", "Set due date", "Save", "Print referral form"],
          neoSteps: ["Open Referrals", "Click + New", "Select patient + provider + reason", "Save (notification auto-sent)"],
        },
        {
          task: "Accept an incoming referral",
          legacy: 8,
          neo: 2,
          legacySteps: ["Check fax machine or email", "Log into system", "Find referral in inbox", "Review referral", "Open acceptance form", "Fill form", "Save", "Notify referring provider manually"],
          neoSteps: ["Click notification bell", "Click Accept"],
        },
      ],
    },
  ];

  const totalLegacyClicks = workflows.flatMap(w => w.tasks).reduce((sum, t) => sum + t.legacy, 0);
  const totalNeoClicks = workflows.flatMap(w => w.tasks).reduce((sum, t) => sum + t.neo, 0);
  const totalSaved = totalLegacyClicks - totalNeoClicks;
  const pctReduction = Math.round((totalSaved / totalLegacyClicks) * 100);

  const maxClicks = Math.max(...workflows.flatMap(w => w.tasks).map(t => t.legacy));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workflow Efficiency Analysis</h1>
          <p className="text-slate-500 text-sm mt-0.5">DrCloud Legacy vs. DrCloud Neo — clicks per task</p>
        </div>
      </div>

      {/* Hero summary */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6 text-white">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-5xl font-bold text-red-300">{totalLegacyClicks}</div>
            <div className="text-sm text-slate-300 mt-1">Legacy total clicks</div>
            <div className="text-xs text-slate-400 mt-0.5">across {workflows.flatMap(w => w.tasks).length} common workflows</div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="text-4xl mb-1">→</div>
            <div className="text-xl font-bold text-teal-300">{pctReduction}% fewer clicks</div>
            <div className="text-xs text-slate-400">{totalSaved} clicks saved per cycle</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-teal-300">{totalNeoClicks}</div>
            <div className="text-sm text-slate-300 mt-1">Neo total clicks</div>
            <div className="text-xs text-slate-400 mt-0.5">same {workflows.flatMap(w => w.tasks).length} workflows</div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-teal-300 font-bold">~2 hrs/day</div>
            <div className="text-slate-400 text-xs">estimated time saved per clinician</div>
          </div>
          <div>
            <div className="text-teal-300 font-bold">~40 hrs/month</div>
            <div className="text-slate-400 text-xs">per full-time clinician</div>
          </div>
          <div>
            <div className="text-teal-300 font-bold">$2,400+/month</div>
            <div className="text-slate-400 text-xs">value @ $60/hr billed time recovered</div>
          </div>
        </div>
      </div>

      {/* Category breakdowns */}
      {workflows.map(category => (
        <div key={category.category} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">{category.category}</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {category.tasks.map(task => {
              const saved = task.legacy - task.neo;
              const pct = Math.round((saved / task.legacy) * 100);
              return (
                <div key={task.task} className="px-6 py-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 text-sm">{task.task}</h3>
                    <span className="text-xs bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ml-3">
                      {pct}% fewer clicks
                    </span>
                  </div>

                  {/* Bar chart */}
                  <div className="space-y-2.5 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-16 flex-shrink-0 text-right">Legacy</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
                        <div
                          className="bg-red-400 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${(task.legacy / maxClicks) * 100}%` }}>
                          <span className="text-white text-xs font-bold">{task.legacy}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-16 flex-shrink-0 text-right">Neo</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
                        <div
                          className="bg-teal-500 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${(task.neo / maxClicks) * 100}%` }}>
                          <span className="text-white text-xs font-bold">{task.neo}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 rounded-xl p-3">
                      <div className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Legacy ({task.legacy} steps)</div>
                      <ol className="space-y-1">
                        {task.legacySteps.map((step, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="text-red-300 font-bold flex-shrink-0">{i + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="bg-teal-50 rounded-xl p-3">
                      <div className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Neo ({task.neo} steps)</div>
                      <ol className="space-y-1">
                        {task.neoSteps.map((step, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="text-teal-500 font-bold flex-shrink-0">{i + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Footer note */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-500">
        <p><strong>Methodology:</strong> Click counts represent the number of distinct user interactions (clicks, tab navigations, form submissions, and confirmations) required to complete each task in a standard workflow. Legacy counts were documented by observing the current DrCloud EHR workflow. Neo counts represent the same task in DrCloud Neo as of v0.1 POC.</p>
      </div>
    </div>
  );
}
