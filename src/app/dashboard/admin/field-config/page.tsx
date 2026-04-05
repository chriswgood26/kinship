"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type FieldState = "hidden" | "optional" | "required";

interface FieldDef {
  key: string;
  label: string;
  description: string;
  defaultState: FieldState;
  category: string;
  note?: string;
}

const CONFIGURABLE_FIELDS: FieldDef[] = [
  // Core demographics — always shown, just required vs optional
  { key: "pronouns", label: "Pronouns", description: "Gender pronouns", defaultState: "optional", category: "Core Demographics" },
  { key: "preferred_name", label: "Preferred Name", description: "Legal name vs. preferred name toggle", defaultState: "optional", category: "Core Demographics" },
  { key: "middle_name", label: "Middle Name", description: "Middle name on patient record", defaultState: "optional", category: "Core Demographics" },

  // Reporting demographics
  { key: "ssn_last4", label: "SSN (Last 4)", description: "Last 4 digits of Social Security Number — used for identity matching in state reporting", defaultState: "optional", category: "Reporting Demographics", note: "Nevada and some states explicitly do not require SSN" },
  { key: "veteran_status", label: "Veteran Status", description: "Military veteran status and branch of service", defaultState: "optional", category: "Reporting Demographics" },
  { key: "county", label: "County of Residence", description: "County — required for most state Medicaid reporting", defaultState: "required", category: "Reporting Demographics" },
  { key: "race", label: "Race", description: "Race — OMB standard categories", defaultState: "optional", category: "Reporting Demographics" },
  { key: "ethnicity", label: "Ethnicity", description: "Hispanic/Latino — OMB standard", defaultState: "optional", category: "Reporting Demographics" },
  { key: "primary_language", label: "Primary Language", description: "Preferred language for services", defaultState: "optional", category: "Reporting Demographics" },
  { key: "pregnancy_status", label: "Pregnancy Status", description: "For female patients — required by some state programs", defaultState: "hidden", category: "Reporting Demographics" },

  // Contact
  { key: "phone_secondary", label: "Secondary Phone", description: "Alternative phone number", defaultState: "optional", category: "Contact Information" },
  { key: "email", label: "Email Address", description: "Patient email — required for portal access", defaultState: "optional", category: "Contact Information" },
  { key: "address", label: "Full Address", description: "Street address, city, state, zip", defaultState: "optional", category: "Contact Information" },

  // Insurance & Financial
  { key: "insurance_group_number", label: "Insurance Group Number", description: "Group number on insurance card", defaultState: "optional", category: "Insurance & Financial" },
  { key: "insurance_copay", label: "Copay Amount", description: "Standard copay for check-in collection", defaultState: "optional", category: "Insurance & Financial" },
  { key: "insurance_deductible", label: "Deductible & OOP Max", description: "Annual deductible and out-of-pocket maximum", defaultState: "optional", category: "Insurance & Financial" },
  { key: "subscriber_info", label: "Subscriber Information", description: "When patient is not the primary subscriber", defaultState: "optional", category: "Insurance & Financial" },
  { key: "financial_class", label: "Financial Class", description: "Medicaid/Medicare/Commercial/Self-Pay etc.", defaultState: "required", category: "Insurance & Financial" },

  // Clinical
  { key: "marital_status", label: "Marital Status", description: "Collected in BPS; required by SAMHSA TEDS", defaultState: "optional", category: "Clinical / Intake", note: "Nevada does not require marital status" },
  { key: "employment_status", label: "Employment Status", description: "Employment at intake — TEDS required", defaultState: "optional", category: "Clinical / Intake" },
  { key: "education_level", label: "Education Level", description: "Highest level of education — TEDS required", defaultState: "optional", category: "Clinical / Intake" },
  { key: "living_situation", label: "Living Situation", description: "Housing status at intake — TEDS required", defaultState: "optional", category: "Clinical / Intake" },
  { key: "prior_treatment_episodes", label: "Prior Treatment Episodes", description: "Number of previous BH treatment episodes", defaultState: "optional", category: "Clinical / Intake" },
];

const CATEGORIES = [...new Set(CONFIGURABLE_FIELDS.map(f => f.category))];

const STATE_LABELS: Record<FieldState, { label: string; color: string; description: string }> = {
  hidden: { label: "Hidden", color: "bg-slate-100 text-slate-500 border-slate-200", description: "Field not shown anywhere in the system" },
  optional: { label: "Optional", color: "bg-blue-50 text-blue-700 border-blue-200", description: "Field shown but not required" },
  required: { label: "Required", color: "bg-emerald-50 text-emerald-700 border-emerald-200", description: "Field required before saving" },
};

export default function FieldConfigPage() {
  const [config, setConfig] = useState<Record<string, FieldState>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/org", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const savedConfig = d.org?.field_config || {};
        // Merge saved config with defaults
        const merged: Record<string, FieldState> = {};
        CONFIGURABLE_FIELDS.forEach(f => {
          merged[f.key] = savedConfig[f.key] || f.defaultState;
        });
        setConfig(merged);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function setFieldState(key: string, state: FieldState) {
    setConfig(prev => ({ ...prev, [key]: state }));
  }

  async function saveConfig() {
    setSaving(true);
    await fetch("/api/admin/org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ field_config: config }),
    });
    // Also save to localStorage for immediate effect
    if (typeof window !== "undefined") {
      localStorage.setItem("drcloud_field_config", JSON.stringify(config));
      window.dispatchEvent(new CustomEvent("drcloud_field_config_change", { detail: config }));
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function resetDefaults() {
    const defaults: Record<string, FieldState> = {};
    CONFIGURABLE_FIELDS.forEach(f => { defaults[f.key] = f.defaultState; });
    setConfig(defaults);
  }

  const hiddenCount = Object.values(config).filter(v => v === "hidden").length;
  const requiredCount = Object.values(config).filter(v => v === "required").length;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/settings" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Data Collection Configuration</h1>
            <p className="text-slate-500 text-sm mt-0.5">Control which fields appear on patient forms for your organization</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={resetDefaults} className="text-xs border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50">
            Reset to defaults
          </button>
          {saved && <span className="text-emerald-600 text-sm font-medium self-center">✓ Saved</span>}
          <button onClick={saveConfig} disabled={saving || loading}
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Field States</div>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(STATE_LABELS) as [FieldState, typeof STATE_LABELS[FieldState]][]).map(([state, info]) => (
            <div key={state} className={`rounded-xl border px-4 py-3 ${info.color}`}>
              <div className="font-bold text-sm">{info.label}</div>
              <div className="text-xs mt-0.5 opacity-80">{info.description}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-500">
          <span>{hiddenCount} fields hidden</span>
          <span>{requiredCount} fields required</span>
          <span>{CONFIGURABLE_FIELDS.length - hiddenCount - requiredCount} fields optional</span>
        </div>
      </div>

      {/* Field groups */}
      {CATEGORIES.map(category => (
        <div key={category} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">{category}</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {CONFIGURABLE_FIELDS.filter(f => f.category === category).map(field => {
              const currentState = config[field.key] || field.defaultState;
              return (
                <div key={field.key} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">{field.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{field.description}</div>
                    {field.note && (
                      <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <span>ℹ️</span>{field.note}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {(["hidden", "optional", "required"] as FieldState[]).map(state => (
                      <button key={state} onClick={() => setFieldState(field.key, state)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          currentState === state
                            ? STATE_LABELS[state].color + " shadow-sm"
                            : "border-slate-200 text-slate-400 hover:border-slate-300"
                        }`}>
                        {STATE_LABELS[state].label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800">
        <div className="font-semibold mb-1">ℹ️ How this works</div>
        <ul className="space-y-1 text-xs">
          <li>• <strong>Hidden</strong> fields do not appear on any patient form and are not collected</li>
          <li>• <strong>Optional</strong> fields appear but staff can leave them blank</li>
          <li>• <strong>Required</strong> fields must be filled before saving the patient record</li>
          <li>• Changes take effect immediately after saving — no page refresh needed</li>
          <li>• State-specific fields (Oregon OHA Client ID, NY Medicaid CIN, etc.) are configured separately in Reporting settings</li>
        </ul>
      </div>
    </div>
  );
}
