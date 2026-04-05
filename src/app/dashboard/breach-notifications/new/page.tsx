"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const BREACH_TYPES = [
  { value: "unauthorized_access", label: "Unauthorized Access", icon: "🔓" },
  { value: "hacking", label: "Hacking / IT Incident", icon: "💻" },
  { value: "ransomware", label: "Ransomware", icon: "🦠" },
  { value: "theft", label: "Theft (device/records)", icon: "🚨" },
  { value: "loss", label: "Loss (device/records)", icon: "📦" },
  { value: "improper_disposal", label: "Improper Disposal", icon: "🗑️" },
  { value: "wrong_recipient", label: "Wrong Recipient", icon: "📧" },
  { value: "other", label: "Other", icon: "📋" },
];

const PHI_TYPE_OPTIONS = [
  "Name",
  "Address",
  "Date of Birth",
  "Social Security Number",
  "Phone / Fax Number",
  "Email Address",
  "Medical Record Number",
  "Health Plan Beneficiary Number",
  "Account Numbers",
  "Certificate / License Numbers",
  "Vehicle Identifiers",
  "Device Identifiers",
  "Web URLs",
  "IP Addresses",
  "Biometric Identifiers",
  "Full-Face Photographs",
  "Diagnosis / Condition",
  "Treatment Information",
  "Medication Information",
  "Insurance / Payer Information",
  "Financial Information",
  "Mental Health Records",
  "Substance Use Records",
];

function NewBreachForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    discovered_date: new Date().toISOString().split("T")[0],
    breach_date: "",
    breach_type: "unauthorized_access",
    breach_cause: "",
    business_associate_involved: false,
    business_associate_name: "",
    individuals_affected: "",
    description: "",
    risk_level: "medium",
    risk_assessment_notes: "",
    remediation_actions: "",
    legal_counsel_notified: false,
    phi_types: [] as string[],
  });

  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  function togglePhiType(type: string) {
    setForm((f) => ({
      ...f,
      phi_types: f.phi_types.includes(type)
        ? f.phi_types.filter((t) => t !== type)
        : [...f.phi_types, type],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description) {
      setError("Breach description is required");
      return;
    }
    if (form.phi_types.length === 0) {
      setError("Select at least one PHI type involved");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/breach-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        individuals_affected: form.individuals_affected
          ? parseInt(form.individuals_affected)
          : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }
    router.push(`/dashboard/breach-notifications/${data.breach.id}`);
  }

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass =
    "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/breach-notifications" className="text-slate-400 hover:text-slate-700">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Report HIPAA Breach</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Document a breach of unsecured PHI — HIPAA requires notification within 60 days of discovery
          </p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
        <span className="text-xl">⚠️</span>
        <span className="text-sm text-red-800">
          <strong>Time-sensitive:</strong> HIPAA requires affected individuals and HHS to be notified within{" "}
          <strong>60 calendar days</strong> of breach discovery. Document promptly and consult legal counsel.
        </span>
      </div>

      {/* Breach details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Breach Information</h2>

        {/* Breach type */}
        <div>
          <label className={labelClass}>Breach Type *</label>
          <div className="grid grid-cols-4 gap-2">
            {BREACH_TYPES.map((bt) => (
              <button
                key={bt.value}
                type="button"
                onClick={() => set("breach_type", bt.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-colors ${
                  form.breach_type === bt.value
                    ? "bg-red-50 border-red-300 text-red-800"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className="text-lg">{bt.icon}</span>
                {bt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Date Breach Discovered *</label>
            <input
              type="date"
              value={form.discovered_date}
              onChange={(e) => set("discovered_date", e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>
              Date Breach Occurred{" "}
              <span className="text-slate-400 font-normal normal-case">(if different)</span>
            </label>
            <input
              type="date"
              value={form.breach_date}
              onChange={(e) => set("breach_date", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Breach Description * (what happened, how PHI was exposed)</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
            className={inputClass + " resize-none"}
            placeholder="Describe the breach in factual terms — how PHI was accessed, disclosed, or used without authorization..."
            required
          />
        </div>

        <div>
          <label className={labelClass}>Root Cause</label>
          <input
            value={form.breach_cause}
            onChange={(e) => set("breach_cause", e.target.value)}
            className={inputClass}
            placeholder="e.g. Unencrypted laptop stolen from car, phishing email, misconfigured server access..."
          />
        </div>

        <div>
          <label className={labelClass}>Estimated Individuals Affected</label>
          <input
            type="number"
            min="0"
            value={form.individuals_affected}
            onChange={(e) => set("individuals_affected", e.target.value)}
            className={inputClass}
            placeholder="Enter estimated or confirmed count..."
          />
          {parseInt(form.individuals_affected) >= 500 && (
            <p className="text-xs text-orange-600 font-medium mt-1.5">
              📰 ≥500 individuals: media notification required within 60 days (45 CFR §164.406)
            </p>
          )}
        </div>
      </div>

      {/* PHI types */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">PHI Types Involved *</h2>
        <p className="text-xs text-slate-500">
          Select all categories of protected health information that were involved in this breach
        </p>
        <div className="flex flex-wrap gap-2">
          {PHI_TYPE_OPTIONS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => togglePhiType(type)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                form.phi_types.includes(type)
                  ? "bg-red-100 border-red-300 text-red-800"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {form.phi_types.includes(type) ? "✓ " : ""}
              {type}
            </button>
          ))}
        </div>
        {form.phi_types.length > 0 && (
          <p className="text-xs text-slate-500">
            Selected: {form.phi_types.length} PHI type{form.phi_types.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Risk assessment */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Risk Assessment</h2>
        <div>
          <label className={labelClass}>Risk Level</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: "low", label: "Low", color: "bg-slate-50 border-slate-300 text-slate-700", active: "bg-slate-200 border-slate-400 text-slate-900" },
              { value: "medium", label: "Medium", color: "bg-amber-50 border-amber-200 text-amber-700", active: "bg-amber-100 border-amber-400 text-amber-900" },
              { value: "high", label: "High", color: "bg-orange-50 border-orange-200 text-orange-700", active: "bg-orange-100 border-orange-400 text-orange-900" },
              { value: "critical", label: "Critical", color: "bg-red-50 border-red-200 text-red-700", active: "bg-red-100 border-red-400 text-red-900" },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => set("risk_level", r.value)}
                className={`p-3 rounded-xl border text-sm font-semibold transition-colors ${
                  form.risk_level === r.value ? r.active : r.color
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Risk Assessment Notes</label>
          <textarea
            value={form.risk_assessment_notes}
            onChange={(e) => set("risk_assessment_notes", e.target.value)}
            rows={3}
            className={inputClass + " resize-none"}
            placeholder="Document the likelihood that PHI has been compromised and potential harm to individuals..."
          />
        </div>
      </div>

      {/* Business associate */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Business Associate</h2>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="ba"
            checked={form.business_associate_involved}
            onChange={(e) => set("business_associate_involved", e.target.checked)}
            className="w-4 h-4 rounded accent-teal-500"
          />
          <label htmlFor="ba" className="text-sm font-medium text-slate-900">
            Business associate (BA) was involved in this breach
          </label>
        </div>
        {form.business_associate_involved && (
          <div>
            <label className={labelClass}>Business Associate Name</label>
            <input
              value={form.business_associate_name}
              onChange={(e) => set("business_associate_name", e.target.value)}
              className={inputClass}
              placeholder="Name of the business associate..."
            />
          </div>
        )}
      </div>

      {/* Remediation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Remediation & Initial Response</h2>
        <div>
          <label className={labelClass}>Immediate Remediation Actions Taken</label>
          <textarea
            value={form.remediation_actions}
            onChange={(e) => set("remediation_actions", e.target.value)}
            rows={3}
            className={inputClass + " resize-none"}
            placeholder="Steps taken to contain the breach, secure systems, retrain staff, update policies..."
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="legal"
            checked={form.legal_counsel_notified}
            onChange={(e) => set("legal_counsel_notified", e.target.checked)}
            className="w-4 h-4 rounded accent-teal-500"
          />
          <label htmlFor="legal" className="text-sm font-medium text-slate-900">
            Legal counsel has been notified
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <Link
          href="/dashboard/breach-notifications"
          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Report Breach"}
        </button>
      </div>
    </form>
  );
}

export default function NewBreachPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <NewBreachForm />
    </Suspense>
  );
}
