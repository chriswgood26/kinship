"use client";

import { useState, useEffect, use, lazy, Suspense } from "react";
import DocumentUploader from "@/components/DocumentUploader";
import Link from "next/link";
import { calculateFPLPercent, getFPLLabel, getFPLThreshold, FPL_YEAR } from "@/lib/fpl";

interface Assessment {
  id: string;
  annual_income: number;
  family_size: number;
  fpl_percent: number;
  verification_method: string;
  effective_date: string;
  expiration_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export default function IncomeAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = use(params);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [insurance, setInsurance] = useState({
    provider: "", member_id: "", group_number: "", effective_date: "",
    patient_is_subscriber: true,
    subscriber_name: "", subscriber_dob: "", subscriber_relationship: "", subscriber_id: "",
  });
  const [insuranceSaving, setInsuranceSaving] = useState(false);
  const [insuranceSaved, setInsuranceSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    annual_income: "",
    family_size: "1",
    verification_method: "self_reported",
    effective_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  async function load() {
    const [assessRes, patRes] = await Promise.all([
      fetch(`/api/income-assessments?client_id=${patientId}`, { credentials: "include" }),
      fetch(`/api/clients/${patientId}`, { credentials: "include" }),
    ]);
    const assessData = await assessRes.json();
    setAssessments(assessData.assessments || []);
    if (patRes.ok) {
      const patData = await patRes.json();
      const p = patData.patient;
      if (p) setInsurance({
          provider: p.insurance_provider || "",
          member_id: p.insurance_member_id || "",
          group_number: p.insurance_group_number || "",
          effective_date: "",
          patient_is_subscriber: p.patient_is_subscriber !== false,
          subscriber_name: p.subscriber_name || "",
          subscriber_dob: p.subscriber_dob || "",
          subscriber_relationship: p.subscriber_relationship || "",
          subscriber_id: p.subscriber_id || "",
        });
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [patientId]);

  const income = Number(form.annual_income);
  const size = Number(form.family_size);
  const fplPercent = income > 0 && size > 0 ? calculateFPLPercent(income, size) : null;
  const fplThreshold = size > 0 ? getFPLThreshold(size) : 0;

  async function saveInsurance(e: React.FormEvent) {
    e.preventDefault();
    setInsuranceSaving(true);
    await fetch(`/api/clients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        insurance_provider: insurance.provider,
        insurance_member_id: insurance.member_id,
        insurance_group_number: insurance.group_number,
        patient_is_subscriber: insurance.patient_is_subscriber,
        subscriber_name: insurance.patient_is_subscriber ? null : insurance.subscriber_name,
        subscriber_dob: insurance.patient_is_subscriber ? null : insurance.subscriber_dob,
        subscriber_relationship: insurance.patient_is_subscriber ? null : insurance.subscriber_relationship,
        subscriber_id: insurance.patient_is_subscriber ? null : insurance.subscriber_id,
      }),
    });
    setInsuranceSaving(false);
    setInsuranceSaved(true);
    setTimeout(() => setInsuranceSaved(false), 3000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.annual_income || !form.family_size) { setError("Income and family size required"); return; }
    setSaving(true);
    const res = await fetch("/api/income-assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...form, client_id: patientId }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ annual_income: "", family_size: "1", verification_method: "self_reported", effective_date: new Date().toISOString().split("T")[0], notes: "" });
      load();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to save");
    }
    setSaving(false);
  }

  const active = assessments.find(a => a.status === "active");
  const isExpiringSoon = active && new Date(active.expiration_date) < new Date(Date.now() + 30 * 86400000);
  const isExpired = active && new Date(active.expiration_date) < new Date();

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  const TIER_COLORS: Record<string, string> = {
    "≤100% FPL": "bg-red-50 border-red-200 text-red-800",
    "101–150% FPL": "bg-orange-50 border-orange-200 text-orange-800",
    "151–200% FPL": "bg-amber-50 border-amber-200 text-amber-800",
    "201–250% FPL": "bg-yellow-50 border-yellow-200 text-yellow-800",
    "251–300% FPL": "bg-blue-50 border-blue-200 text-blue-800",
    ">300% FPL": "bg-slate-50 border-slate-200 text-slate-700",
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/clients/${patientId}`} className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Income Assessment</h1>
          <p className="text-slate-500 text-sm mt-0.5">Sliding fee scale eligibility — {FPL_YEAR} Federal Poverty Guidelines</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="ml-auto bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
          + New Assessment
        </button>
      </div>

      {/* Active assessment summary */}
      {active && (
        <div className={`rounded-2xl border-2 p-6 ${isExpired ? "border-red-300 bg-red-50" : isExpiringSoon ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Active Assessment</div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{active.fpl_percent}% FPL</div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${TIER_COLORS[getFPLLabel(active.fpl_percent)] || "bg-slate-100 border-slate-200 text-slate-600"}`}>
                {getFPLLabel(active.fpl_percent)}
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-slate-500">Annual income</div>
              <div className="font-bold text-slate-900">${Number(active.annual_income).toLocaleString()}</div>
              <div className="text-slate-500 mt-1">Family size</div>
              <div className="font-bold text-slate-900">{active.family_size}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span>Effective: {new Date(active.effective_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <span className={isExpired ? "text-red-600 font-bold" : isExpiringSoon ? "text-amber-600 font-semibold" : ""}>
              {isExpired ? "⛔ Expired: " : isExpiringSoon ? "⚠️ Expires: " : "Expires: "}
              {new Date(active.expiration_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="capitalize">Verified: {active.verification_method?.replace("_", " ")}</span>
          </div>
          {(isExpired || isExpiringSoon) && (
            <div className={`mt-3 text-xs font-semibold ${isExpired ? "text-red-700" : "text-amber-700"}`}>
              {isExpired ? "⛔ Annual redetermination required — charges may not receive SFS discount" : "⚠️ Annual redetermination due within 30 days — complete a new assessment soon"}
            </div>
          )}
        </div>
      )}

      {!active && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
          ⚠️ No active income assessment on file. Complete an assessment to determine sliding fee eligibility.
        </div>
      )}

      {/* New assessment form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">New Income Assessment</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Annual Household Income *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" value={form.annual_income} onChange={e => setForm(f => ({ ...f, annual_income: e.target.value }))}
                  className={inputClass + " pl-7"} placeholder="0" min="0" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Family / Household Size *</label>
              <input type="number" value={form.family_size} onChange={e => setForm(f => ({ ...f, family_size: e.target.value }))}
                className={inputClass} min="1" max="20" />
            </div>
          </div>

          {/* Live FPL preview */}
          {fplPercent !== null && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Calculated FPL</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">{fplPercent}%</div>
                  <div className={`mt-1 inline-flex text-xs font-bold px-2.5 py-1 rounded-full border ${TIER_COLORS[getFPLLabel(fplPercent)] || ""}`}>
                    {getFPLLabel(fplPercent)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>{FPL_YEAR} FPL threshold</div>
                  <div className="font-semibold text-slate-700">${fplThreshold.toLocaleString()} / yr</div>
                  <div className="mt-1">for {size} person{size !== 1 ? "s" : ""}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Income Verification</label>
              <select value={form.verification_method} onChange={e => setForm(f => ({ ...f, verification_method: e.target.value }))} className={inputClass}>
                <option value="self_reported">Self-reported (attestation)</option>
                <option value="pay_stubs">Pay stubs</option>
                <option value="tax_return">Tax return</option>
                <option value="benefit_letter">Benefit award letter</option>
                <option value="employer_letter">Employer letter</option>
                <option value="none">Unable to verify</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Effective Date</label>
              <input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className={inputClass + " resize-none"} placeholder="e.g. seasonal employment, household changes..." />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : "Save Assessment"}
            </button>
          </div>
        </form>
      )}

      {/* Insurance / Payer Information */}
      <form onSubmit={saveInsurance} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Insurance / Payer Information</h2>
          {insuranceSaved && <span className="text-xs text-teal-600 font-semibold">✓ Saved</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Insurance Provider / Payer</label>
            <input value={insurance.provider} onChange={e => setInsurance(i => ({ ...i, provider: e.target.value }))}
              className={inputClass} placeholder="e.g. Regence BlueShield, Medicaid OHP..." />
          </div>
          <div>
            <label className={labelClass}>Member / Subscriber ID</label>
            <input value={insurance.member_id} onChange={e => setInsurance(i => ({ ...i, member_id: e.target.value }))}
              className={inputClass} placeholder="Member ID number" />
          </div>
          <div>
            <label className={labelClass}>Group Number</label>
            <input value={insurance.group_number} onChange={e => setInsurance(i => ({ ...i, group_number: e.target.value }))}
              className={inputClass} placeholder="Group / plan number" />
          </div>
          <div>
            <label className={labelClass}>Coverage Effective Date</label>
            <input type="date" value={insurance.effective_date} onChange={e => setInsurance(i => ({ ...i, effective_date: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Subscriber toggle */}
        <div className="flex items-center gap-3 pt-1">
          <input type="checkbox" id="patient_is_subscriber" checked={insurance.patient_is_subscriber}
            onChange={e => setInsurance(i => ({ ...i, patient_is_subscriber: e.target.checked }))}
            className="w-4 h-4 accent-teal-500" />
          <label htmlFor="patient_is_subscriber" className="text-sm text-slate-900 cursor-pointer">
            Patient is the primary subscriber / policy holder
          </label>
        </div>

        {/* Subscriber fields — shown when patient is NOT the subscriber */}
        {!insurance.patient_is_subscriber && (
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">Primary Subscriber / Policy Holder</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Subscriber Full Name</label>
                <input value={insurance.subscriber_name} onChange={e => setInsurance(i => ({ ...i, subscriber_name: e.target.value }))}
                  className={inputClass} placeholder="First Last" />
              </div>
              <div>
                <label className={labelClass}>Subscriber Date of Birth</label>
                <input type="date" value={insurance.subscriber_dob} onChange={e => setInsurance(i => ({ ...i, subscriber_dob: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Relationship to Patient</label>
                <select value={insurance.subscriber_relationship} onChange={e => setInsurance(i => ({ ...i, subscriber_relationship: e.target.value }))} className={inputClass}>
                  <option value="">Select relationship...</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="guardian">Legal Guardian</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Subscriber Member ID</label>
                <input value={insurance.subscriber_id} onChange={e => setInsurance(i => ({ ...i, subscriber_id: e.target.value }))}
                  className={inputClass} placeholder="Subscriber's member ID" />
              </div>
            </div>
          </div>
        )}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-700">
          💡 If patient has both insurance and qualifies for sliding fee, insurance is billed first. SFS discount applies to patient responsibility portion only.
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={insuranceSaving}
            className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
            {insuranceSaving ? "Saving..." : "Save Insurance Info"}
          </button>
        </div>
      </form>

      {/* Supporting Documents */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Supporting Documents</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload income verification, insurance cards, benefit letters, and eligibility documentation</p>
        </div>
        <DocumentUploader
          patientId={patientId}
          categories={[
            "Income Verification — Pay Stubs",
            "Income Verification — Tax Return",
            "Income Verification — Benefit Award Letter",
            "Income Verification — Employer Letter",
            "Insurance Card — Front",
            "Insurance Card — Back",
            "Insurance EOB / Explanation of Benefits",
            "Medicaid / Medicare Eligibility Letter",
            "Sliding Fee Application / Attestation",
            "Other Financial Document",
          ]}
        />
      </div>

      {/* Assessment history */}
      {assessments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Assessment History</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Income</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Family</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">FPL %</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {assessments.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">{new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">${Number(a.annual_income).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{a.family_size}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${TIER_COLORS[getFPLLabel(a.fpl_percent)] || ""}`}>{a.fpl_percent}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${a.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(a.expiration_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
