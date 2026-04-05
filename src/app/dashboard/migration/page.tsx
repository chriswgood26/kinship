"use client";

import { useState } from "react";
import Link from "next/link";

interface MigrationEstimate {
  phase: string;
  duration: string;
  tasks: string[];
  color: string;
}

interface MigrationPlan {
  customer: string;
  complexity: "simple" | "moderate" | "complex";
  totalWeeks: number;
  goLiveDate: string;
  phases: MigrationEstimate[];
  dataItems: { label: string; count: string; migrates: boolean; notes: string }[];
  risks: { level: "low" | "medium" | "high"; description: string }[];
  summary: string;
}

function generatePlan(
  customerName: string,
  patientCount: number,
  hasHistoricalNotes: boolean,
  hasBillingHistory: boolean,
  dataQuality: "clean" | "mixed" | "messy",
  hasDD: boolean,
  hasCCBHC: boolean,
): MigrationPlan {
  const complexity =
    patientCount < 100 && !hasHistoricalNotes && dataQuality === "clean" ? "simple" :
    patientCount > 500 || dataQuality === "messy" || (hasHistoricalNotes && hasBillingHistory) ? "complex" :
    "moderate";

  const baseWeeks = complexity === "simple" ? 2 : complexity === "moderate" ? 4 : 8;
  const ddWeeks = hasDD ? 1 : 0;
  const ccbhcWeeks = hasCCBHC ? 1 : 0;
  const totalWeeks = baseWeeks + ddWeeks + ccbhcWeeks;

  const goLive = new Date();
  goLive.setDate(goLive.getDate() + totalWeeks * 7 + 7);
  const goLiveDate = goLive.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const phases: MigrationEstimate[] = [
    {
      phase: "1. Discovery & Analysis",
      duration: complexity === "simple" ? "2-3 days" : complexity === "moderate" ? "3-5 days" : "1-2 weeks",
      color: "bg-blue-50 border-blue-200",
      tasks: [
        "Export source data from DrCloudEHR legacy system",
        "AI analysis of data quality and completeness",
        "Identify fields that map cleanly vs. require transformation",
        `Flag ${dataQuality === "messy" ? "significant cleanup needed — estimated 30-40% of records" : dataQuality === "mixed" ? "moderate cleanup needed — estimated 10-20% of records" : "minimal cleanup needed — data quality is high"}`,
        "Generate migration specification document",
      ],
    },
    {
      phase: "2. Environment Setup",
      duration: "1-2 days",
      color: "bg-purple-50 border-purple-200",
      tasks: [
        `Create ${customerName} organization in DrCloud Neo`,
        "Configure org settings, terminology, and clinical defaults",
        "Set up staff accounts and role assignments",
        "Configure programs, sliding fee schedule, and billing settings",
        "Test connectivity and permissions",
      ],
    },
    {
      phase: "3. Data Migration (Test)",
      duration: complexity === "simple" ? "2-3 days" : complexity === "moderate" ? "1 week" : "2-3 weeks",
      color: "bg-amber-50 border-amber-200",
      tasks: [
        `Migrate ${patientCount.toLocaleString()} patient demographics to test environment`,
        "Import active insurance and financial eligibility data",
        "Migrate open authorizations and treatment plans",
        hasDD ? "Import ISP plans and DD program enrollments" : "",
        hasBillingHistory ? "Migrate open AR balances and pending claims (separate from historical)" : "",
        "Run data integrity validation — record counts, required fields, referential integrity",
        "Generate validation report for customer review",
      ].filter(Boolean) as string[],
    },
    {
      phase: "4. Customer UAT",
      duration: "3-5 business days",
      color: "bg-teal-50 border-teal-200",
      tasks: [
        "Customer reviews migrated data in test environment",
        "Staff complete test encounters and documentation",
        "Billing team validates charge codes and payer setup",
        "Sign-off on data accuracy before go-live",
        "Address any data discrepancies identified",
      ],
    },
    {
      phase: "5. Go-Live Cutover",
      duration: "1-2 days",
      color: "bg-emerald-50 border-emerald-200",
      tasks: [
        "Final data migration from live DrCloudEHR system",
        `Go-live date: ${goLiveDate}`,
        "Legacy DrCloudEHR moved to read-only mode (historical access preserved)",
        "Staff begin documenting new encounters in DrCloud Neo",
        "Support team on standby for 48 hours post-go-live",
      ],
    },
    {
      phase: "6. Parallel Run",
      duration: "30-90 days",
      color: "bg-slate-50 border-slate-200",
      tasks: [
        "DrCloud Neo is primary system for all new activity",
        "Legacy system available read-only for historical reference",
        "Claims submitted from DrCloud Neo via clearinghouse",
        "Monthly check-in to address any transition issues",
        "Legacy system decommissioned after parallel run complete",
      ],
    },
  ];

  const dataItems = [
    { label: "Patient Demographics", count: `${patientCount.toLocaleString()} records`, migrates: true, notes: "Full migration — demographics, insurance, emergency contacts" },
    { label: "Active Authorizations", count: "All open auths", migrates: true, notes: "Active and pending authorizations migrate; expired/historical stay in legacy" },
    { label: "Treatment Plans", count: "Active plans", migrates: true, notes: "Active plans with goals and objectives migrate fully" },
    { label: "Insurance / Financial Class", count: "All active", migrates: true, notes: "Primary + secondary insurance, copay, deductible, financial class" },
    { label: "Program Enrollments", count: "Active enrollments", migrates: true, notes: "Current program/service enrollments" },
    { label: "Open Claims / AR", count: hasBillingHistory ? "In-flight claims" : "N/A", migrates: hasBillingHistory, notes: hasBillingHistory ? "In-flight claims complete in legacy first; opening balance recorded in Neo" : "No open AR to migrate" },
    { label: "ISP / DD Plans", count: hasDD ? "All active" : "N/A", migrates: hasDD, notes: hasDD ? "Active ISP plans with goals, signatures, and review dates" : "Not applicable" },
    { label: "CCBHC Measure Data", count: hasCCBHC ? "YTD data" : "N/A", migrates: hasCCBHC, notes: hasCCBHC ? "Current year CCBHC measure baselines imported for continuity" : "Not applicable" },
    { label: "Historical SOAP Notes", count: "Stays in legacy", migrates: false, notes: "5-10 years of notes stay in legacy system (read-only access preserved)" },
    { label: "Historical Claims", count: "Stays in legacy", migrates: false, notes: "Historical billing for AR and audit remains in legacy" },
    { label: "Scanned Documents", count: "Stays in legacy", migrates: false, notes: "Scanned PDFs and attachments stay in legacy; new uploads in Neo going forward" },
  ];

  const risks = [
    { level: "low" as const, description: "Data integrity — validation scripts catch mismatches before go-live" },
    { level: dataQuality === "messy" ? "high" as const : dataQuality === "mixed" ? "medium" as const : "low" as const, description: `Data quality — source data is ${dataQuality === "clean" ? "clean, minimal cleanup expected" : dataQuality === "mixed" ? "mixed quality, some records will need manual review" : "inconsistent, plan for significant cleanup effort"}` },
    { level: "low" as const, description: "Staff adoption — DrCloud Neo is 72% fewer clicks; training timeline 1-2 days" },
    { level: patientCount > 300 ? "medium" as const : "low" as const, description: `Volume — ${patientCount.toLocaleString()} patients is ${patientCount > 300 ? "moderate-to-large volume; plan extra validation time" : "manageable; standard timeline applies"}` },
    { level: "low" as const, description: "Billing continuity — clearinghouse enrollment runs in parallel; no gap in claims submission" },
  ];

  return {
    customer: customerName,
    complexity,
    totalWeeks,
    goLiveDate,
    phases,
    dataItems,
    risks,
    summary: `${customerName} is a ${complexity} migration. ${patientCount.toLocaleString()} active patients with ${dataQuality} data quality. Estimated go-live in ${totalWeeks} weeks. Legacy DrCloudEHR preserved read-only for historical access.`,
  };
}

export default function MigrationPlannerPage() {
  const [step, setStep] = useState<"input" | "plan">("input");
  const [plan, setPlan] = useState<MigrationPlan | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    patientCount: "",
    hasHistoricalNotes: true,
    hasBillingHistory: true,
    dataQuality: "mixed" as "clean" | "mixed" | "messy",
    hasDD: false,
    hasCCBHC: false,
  });

  function generateEstimate() {
    if (!form.customerName || !form.patientCount) return;
    const p = generatePlan(
      form.customerName,
      parseInt(form.patientCount),
      form.hasHistoricalNotes,
      form.hasBillingHistory,
      form.dataQuality,
      form.hasDD,
      form.hasCCBHC,
    );
    setPlan(p);
    setStep("plan");
  }

  const RISK_COLORS = { low: "text-emerald-600 bg-emerald-50", medium: "text-amber-600 bg-amber-50", high: "text-red-600 bg-red-50" };
  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Migration Planner</h1>
            <p className="text-slate-500 text-sm mt-0.5">Generate a migration estimate for any DrCloudEHR customer</p>
          </div>
        </div>
        {step === "plan" && (
          <button onClick={() => setStep("input")} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">
            ← New Estimate
          </button>
        )}
      </div>

      {step === "input" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">Customer Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className={labelClass}>Customer / Agency Name *</label><input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className={inputClass} placeholder="e.g. Marion County, OR HHS" /></div>
            <div><label className={labelClass}>Active Patient Count *</label><input type="number" value={form.patientCount} onChange={e => setForm(f => ({ ...f, patientCount: e.target.value }))} className={inputClass} placeholder="e.g. 250" /></div>
            <div><label className={labelClass}>Data Quality (historical assessment)</label>
              <select value={form.dataQuality} onChange={e => setForm(f => ({ ...f, dataQuality: e.target.value as "clean" | "mixed" | "messy" }))} className={inputClass}>
                <option value="clean">Clean — consistent, complete data</option>
                <option value="mixed">Mixed — some gaps and inconsistencies</option>
                <option value="messy">Messy — significant cleanup needed</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">What needs to migrate?</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "hasHistoricalNotes", label: "Has years of historical SOAP notes", desc: "Notes stay in legacy (read-only)" },
                { key: "hasBillingHistory", label: "Has open AR / billing history", desc: "In-flight claims handled separately" },
                { key: "hasDD", label: "DD (Developmental Disabilities) services", desc: "ISP plans, DD program enrollments" },
                { key: "hasCCBHC", label: "CCBHC certified program", desc: "YTD measure data imported" },
              ].map(opt => (
                <div key={opt.key} onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key as keyof typeof f] }))}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${(form as Record<string,unknown>)[opt.key] ? "border-teal-300 bg-teal-50" : "border-slate-100 hover:border-slate-200"}`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${(form as Record<string,unknown>)[opt.key] ? "bg-teal-500 border-teal-500" : "border-slate-300"}`}>
                    {!!(form as Record<string,unknown>)[opt.key] && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{opt.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={generateEstimate} disabled={!form.customerName || !form.patientCount}
              className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              Generate Migration Plan →
            </button>
          </div>
        </div>
      )}

      {step === "plan" && plan && (
        <>
          {/* Summary header */}
          <div className="bg-[#0d1b2e] rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Migration Plan</div>
                <h2 className="text-2xl font-bold text-white">{plan.customer}</h2>
                <p className="text-slate-300 text-sm mt-1">{plan.summary}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-6">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Estimated Go-Live</div>
                <div className="text-xl font-bold text-teal-300 mt-1">{plan.goLiveDate}</div>
                <div className={`mt-2 inline-block text-xs font-bold px-3 py-1 rounded-full ${plan.complexity === "simple" ? "bg-emerald-500" : plan.complexity === "moderate" ? "bg-amber-500" : "bg-red-500"} text-white capitalize`}>
                  {plan.complexity} Migration · {plan.totalWeeks} weeks
                </div>
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="space-y-3">
            {plan.phases.map((phase, i) => (
              <div key={i} className={`rounded-2xl border p-5 ${phase.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900">{phase.phase}</h3>
                  <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{phase.duration}</span>
                </div>
                <ul className="space-y-1.5">
                  {phase.tasks.map((task, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-slate-400 flex-shrink-0 mt-0.5">▸</span>{task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Data inventory */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Data Inventory</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Data Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Volume</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Migrates</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {plan.dataItems.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{item.label}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{item.count}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.migrates ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.migrates ? "✓ Migrates" : "Stays in legacy"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{item.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Risk assessment */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Risk Assessment</h3>
            <div className="space-y-2">
              {plan.risks.map((risk, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 capitalize ${RISK_COLORS[risk.level]}`}>{risk.level}</span>
                  <span className="text-sm text-slate-700">{risk.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key message */}
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
            <div className="font-semibold text-teal-900 mb-2">🔑 Why DrCloud Neo migrations are faster</div>
            <p className="text-sm text-teal-800">The architect has 10 years of direct experience with DrCloudEHR's data schema — every table, every field, every quirk. Most EHR migrations take 6-18 months per customer because the new vendor doesn't know the source. This is different: the source and destination were built by the same person. Migration scripts are not generic — they're built with intimate knowledge of how DrCloudEHR actually stores data.</p>
          </div>
        </>
      )}
    </div>
  );
}
