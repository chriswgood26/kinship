"use client";

import { useState } from "react";

interface RuleResult {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  field?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: RuleResult[];
  warnings: RuleResult[];
  infos: RuleResult[];
}

interface Charge {
  id: string;
  client_id: string;
  service_date: string;
  cpt_code: string;
  icd10_codes: string[] | null;
  units: number;
  charge_amount: number;
  auth_number?: string;
  patient?: { first_name: string; last_name: string; mrn: string | null } | null;
}

interface Props {
  charges: Charge[];
}

export default function ClaimScrubber({ charges }: Props) {
  const [results, setResults] = useState<Record<string, ValidationResult>>({});
  const [scrubbing, setScrubbing] = useState(false);
  const [done, setDone] = useState(false);

  async function runScrub() {
    setScrubbing(true);
    setDone(false);
    const newResults: Record<string, ValidationResult> = {};

    await Promise.all(charges.map(async (charge) => {
      const res = await fetch("/api/billing/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          client_id: charge.client_id,
          service_date: charge.service_date,
          cpt_code: charge.cpt_code,
          icd10_codes: charge.icd10_codes || [],
          units: charge.units,
          charge_amount: charge.charge_amount,
          auth_number: charge.auth_number,
        }),
      });
      newResults[charge.id] = await res.json();
    }));

    setResults(newResults);
    setScrubbing(false);
    setDone(true);
  }

  const totalErrors = Object.values(results).reduce((s, r) => s + r.errors.length, 0);
  const totalWarnings = Object.values(results).reduce((s, r) => s + r.warnings.length, 0);
  const cleanCount = Object.values(results).filter(r => r.valid && r.warnings.length === 0).length;

  const SEVERITY_STYLES = {
    error: "bg-red-50 border-red-200 text-red-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    info: "bg-blue-50 border-blue-200 text-blue-600",
  };
  const SEVERITY_ICON = { error: "❌", warning: "⚠️", info: "ℹ️" };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900">Claim Scrubber</h3>
            <p className="text-xs text-slate-500 mt-0.5">Validates charges against billing rules before submission</p>
          </div>
          <button onClick={runScrub} disabled={scrubbing || charges.length === 0}
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 flex items-center gap-2">
            {scrubbing ? <><span className="animate-spin">⏳</span> Scrubbing...</> : "🔍 Run Scrub"}
          </button>
        </div>

        {/* Rules legend */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { icon: "✅", label: "BL001", desc: "MH CPT requires MH diagnosis" },
            { icon: "✅", label: "BL002", desc: "Prior auth recommended for eval CPTs" },
            { icon: "✅", label: "BL003", desc: "Units within allowed maximum" },
            { icon: "✅", label: "BL004", desc: "At least one ICD-10 code required" },
            { icon: "✅", label: "BL005", desc: "Max 4 diagnosis codes per claim" },
            { icon: "✅", label: "BL006", desc: "Payer session limit advisory" },
            { icon: "✅", label: "BL007", desc: "Service date not in the future" },
            { icon: "✅", label: "BL008", desc: "Timely filing within 90 days" },
          ].map(r => (
            <div key={r.label} className="flex items-start gap-1.5 bg-slate-50 rounded-lg p-2">
              <span className="text-xs">{r.icon}</span>
              <div>
                <span className="font-mono font-bold text-slate-600">{r.label}</span>
                <span className="text-slate-400 ml-1">{r.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {done && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`${totalErrors > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"} border rounded-2xl p-4 text-center`}>
              <div className="text-3xl font-bold text-slate-900">{totalErrors}</div>
              <div className="text-sm text-slate-500">Errors</div>
              <div className="text-xs text-slate-400 mt-0.5">{totalErrors > 0 ? "Must fix before submitting" : "All clear!"}</div>
            </div>
            <div className={`${totalWarnings > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200"} border rounded-2xl p-4 text-center`}>
              <div className="text-3xl font-bold text-slate-900">{totalWarnings}</div>
              <div className="text-sm text-slate-500">Warnings</div>
              <div className="text-xs text-slate-400 mt-0.5">Review before submitting</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-slate-900">{cleanCount}</div>
              <div className="text-sm text-slate-500">Clean Claims</div>
              <div className="text-xs text-slate-400 mt-0.5">Ready to submit</div>
            </div>
          </div>

          {/* Per-charge results */}
          <div className="space-y-3">
            {charges.map(charge => {
              const result = results[charge.id];
              if (!result) return null;
              const patient = Array.isArray(charge.patient) ? charge.patient[0] : charge.patient;
              const allIssues = [...(result.errors || []), ...(result.warnings || []), ...(result.infos || [])];

              return (
                <div key={charge.id} className={`bg-white rounded-2xl border overflow-hidden ${
                  result.errors.length > 0 ? "border-red-200" :
                  result.warnings.length > 0 ? "border-amber-200" :
                  "border-emerald-200"
                }`}>
                  <div className={`flex items-center justify-between px-5 py-3 ${
                    result.errors.length > 0 ? "bg-red-50" :
                    result.warnings.length > 0 ? "bg-amber-50" :
                    "bg-emerald-50"
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{result.errors.length > 0 ? "❌" : result.warnings.length > 0 ? "⚠️" : "✅"}</span>
                      <div>
                        <div className="font-semibold text-sm text-slate-900">
                          {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {charge.cpt_code} · {new Date(charge.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${Number(charge.charge_amount).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-medium">
                      {result.errors.length > 0 && <span className="text-red-600">{result.errors.length} error{result.errors.length > 1 ? "s" : ""}</span>}
                      {result.warnings.length > 0 && <span className="text-amber-600 ml-2">{result.warnings.length} warning{result.warnings.length > 1 ? "s" : ""}</span>}
                      {allIssues.length === 0 && <span className="text-emerald-600">Clean</span>}
                    </div>
                  </div>
                  {allIssues.length > 0 && (
                    <div className="px-5 py-3 space-y-2">
                      {allIssues.map((issue, i) => (
                        <div key={i} className={`flex items-start gap-2 border rounded-lg px-3 py-2 text-xs ${SEVERITY_STYLES[issue.severity]}`}>
                          <span className="flex-shrink-0">{SEVERITY_ICON[issue.severity]}</span>
                          <div>
                            <span className="font-mono font-bold mr-1">{issue.code}</span>
                            {issue.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
