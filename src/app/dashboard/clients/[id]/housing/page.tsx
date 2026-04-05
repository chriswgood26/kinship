"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface HousingAssessment {
  id: string;
  housing_status: string;
  housing_type: string | null;
  duration_homeless_months: number | null;
  is_chronically_homeless: boolean;
  assessment_date: string;
  next_assessment_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const HOUSING_STATUS_OPTIONS = [
  { value: "housed_stable", label: "Housed — Stable", description: "Owns or rents stable housing", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
  { value: "housed_at_risk", label: "Housed — At Risk", description: "Behind on rent, eviction notice, or unsafe conditions", color: "bg-yellow-100 border-yellow-300 text-yellow-800" },
  { value: "doubled_up", label: "Doubled Up / Couch Surfing", description: "Temporarily staying with others due to housing instability", color: "bg-amber-100 border-amber-300 text-amber-800" },
  { value: "transitional", label: "Transitional Housing", description: "Transitional housing program or sober living", color: "bg-blue-100 border-blue-300 text-blue-800" },
  { value: "permanent_supportive", label: "Permanent Supportive Housing", description: "PSH with wraparound support services", color: "bg-teal-100 border-teal-300 text-teal-800" },
  { value: "emergency_shelter", label: "Emergency Shelter", description: "Staying in an emergency or domestic violence shelter", color: "bg-orange-100 border-orange-300 text-orange-800" },
  { value: "homeless_unsheltered", label: "Homeless — Unsheltered", description: "Living on the street, in a car, encampment, or outdoors", color: "bg-red-100 border-red-300 text-red-800" },
  { value: "institutional", label: "Institutional / Incarcerated", description: "Hospital, correctional facility, or other institution", color: "bg-slate-100 border-slate-300 text-slate-700" },
  { value: "unknown", label: "Unknown / Declined to Answer", description: "Client declined or status is unknown", color: "bg-slate-100 border-slate-200 text-slate-500" },
];

const HOUSING_TYPE_OPTIONS = [
  "Own home",
  "Rented apartment / house",
  "Subsidized / Section 8 housing",
  "Boarding house / rooming house",
  "Hotel / motel",
  "Transitional housing program",
  "Permanent supportive housing",
  "Sober living / recovery residence",
  "Emergency shelter",
  "Domestic violence shelter",
  "Vehicle (car, RV, van)",
  "Encampment / tent",
  "Outdoors / street",
  "Hospital / inpatient facility",
  "Correctional facility",
  "With family",
  "With friends",
  "Other",
];

function getStatusConfig(status: string) {
  return HOUSING_STATUS_OPTIONS.find(o => o.value === status) || {
    label: status,
    description: "",
    color: "bg-slate-100 border-slate-200 text-slate-600",
  };
}

function isHomeless(status: string) {
  return ["homeless_unsheltered", "emergency_shelter", "doubled_up"].includes(status);
}

export default function HousingStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const [assessments, setAssessments] = useState<HousingAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    housing_status: "",
    housing_type: "",
    duration_homeless_months: "",
    is_chronically_homeless: false,
    assessment_date: new Date().toISOString().split("T")[0],
    next_assessment_date: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/housing-status?client_id=${clientId}`, { credentials: "include" });
    const data = await res.json();
    setAssessments(data.assessments || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [clientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.housing_status) { setError("Housing status is required"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/housing-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_id: clientId,
        housing_status: form.housing_status,
        housing_type: form.housing_type || null,
        duration_homeless_months: form.duration_homeless_months ? Number(form.duration_homeless_months) : null,
        is_chronically_homeless: form.is_chronically_homeless,
        assessment_date: form.assessment_date,
        next_assessment_date: form.next_assessment_date || null,
        notes: form.notes || null,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({
        housing_status: "",
        housing_type: "",
        duration_homeless_months: "",
        is_chronically_homeless: false,
        assessment_date: new Date().toISOString().split("T")[0],
        next_assessment_date: "",
        notes: "",
      });
      load();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to save assessment");
    }
    setSaving(false);
  }

  const active = assessments.find(a => a.status === "active");
  const activeConfig = active ? getStatusConfig(active.housing_status) : null;
  const isDueForReassessment = active && new Date(active.next_assessment_date) <= new Date();
  const isDueSoon = active && !isDueForReassessment && new Date(active.next_assessment_date) <= new Date(Date.now() + 30 * 86400000);

  const showHomelessFields = isHomeless(form.housing_status);

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/clients/${clientId}`} className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Housing Status</h1>
          <p className="text-slate-500 text-sm mt-0.5">CCBHC &amp; grant reporting — housing stability assessment</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400"
        >
          + New Assessment
        </button>
      </div>

      {/* Current status banner */}
      {active && activeConfig && (
        <div className={`rounded-2xl border-2 p-6 ${isDueForReassessment ? "border-red-300 bg-red-50" : isDueSoon ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Current Housing Status</div>
              <span className={`inline-flex items-center text-sm font-bold px-3 py-1.5 rounded-full border ${activeConfig.color}`}>
                {activeConfig.label}
              </span>
              {active.housing_type && (
                <div className="mt-2 text-sm text-slate-600">
                  <span className="font-medium">Type:</span> {active.housing_type}
                </div>
              )}
              {active.is_chronically_homeless && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-red-100 border border-red-200 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                  ⚠️ Chronically Homeless
                </div>
              )}
              {active.duration_homeless_months != null && (
                <div className="mt-1 text-sm text-slate-600">
                  Duration: <span className="font-semibold">{active.duration_homeless_months} month{active.duration_homeless_months !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
            <div className="text-right text-sm">
              <div className="text-slate-500 text-xs">Assessed</div>
              <div className="font-semibold text-slate-900">
                {new Date(active.assessment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div className="text-slate-500 text-xs mt-2">Next due</div>
              <div className={`font-semibold ${isDueForReassessment ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-slate-900"}`}>
                {new Date(active.next_assessment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>
          {active.notes && (
            <div className="mt-3 pt-3 border-t border-white/50 text-sm text-slate-700">
              <span className="font-medium">Notes:</span> {active.notes}
            </div>
          )}
          {isDueForReassessment && (
            <div className="mt-3 text-xs font-semibold text-red-700">
              ⛔ Reassessment overdue — complete a new housing assessment
            </div>
          )}
          {isDueSoon && !isDueForReassessment && (
            <div className="mt-3 text-xs font-semibold text-amber-700">
              ⚠️ Reassessment due within 30 days
            </div>
          )}
        </div>
      )}

      {!active && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
          ⚠️ No housing assessment on file. Complete an assessment to document housing status for CCBHC reporting and grant compliance.
        </div>
      )}

      {/* New assessment form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">New Housing Assessment</h2>

          {/* Housing status selection */}
          <div>
            <label className={labelClass}>Housing Status *</label>
            <div className="space-y-2">
              {HOUSING_STATUS_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    form.housing_status === opt.value
                      ? `${opt.color} border-current`
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="housing_status"
                    value={opt.value}
                    checked={form.housing_status === opt.value}
                    onChange={e => setForm(f => ({ ...f, housing_status: e.target.value, is_chronically_homeless: false, duration_homeless_months: "" }))}
                    className="mt-0.5 accent-teal-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{opt.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Housing type */}
          <div>
            <label className={labelClass}>Housing Type (optional)</label>
            <select
              value={form.housing_type}
              onChange={e => setForm(f => ({ ...f, housing_type: e.target.value }))}
              className={inputClass}
            >
              <option value="">Select housing type...</option>
              {HOUSING_TYPE_OPTIONS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Homelessness-specific fields */}
          {showHomelessFields && (
            <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-4">
              <div className="text-xs font-bold text-red-800 uppercase tracking-wide">Homelessness Details</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Duration Homeless (months)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.duration_homeless_months}
                    onChange={e => setForm(f => ({ ...f, duration_homeless_months: e.target.value }))}
                    className={inputClass}
                    placeholder="e.g. 3"
                  />
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_chronically_homeless}
                  onChange={e => setForm(f => ({ ...f, is_chronically_homeless: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 accent-teal-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Chronically Homeless</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    HUD definition: homeless for 12+ months or 4+ episodes in past 3 years, with a disabling condition
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Assessment Date</label>
              <input
                type="date"
                value={form.assessment_date}
                onChange={e => setForm(f => ({ ...f, assessment_date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Next Assessment Due</label>
              <input
                type="date"
                value={form.next_assessment_date}
                onChange={e => setForm(f => ({ ...f, next_assessment_date: e.target.value }))}
                className={inputClass}
                placeholder="Auto: 6 months"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className={inputClass + " resize-none"}
              placeholder="e.g. recently lost housing, on waitlist for supportive housing..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
            💡 Housing status is reported for CCBHC measures and federal grant compliance. Reassessment is recommended every 6 months or when status changes.
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-teal-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Assessment"}
            </button>
          </div>
        </form>
      )}

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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Housing Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Chronic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {assessments.map(a => {
                const cfg = getStatusConfig(a.housing_status);
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900 whitespace-nowrap">
                      {new Date(a.assessment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{a.housing_type || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      {a.is_chronically_homeless ? (
                        <span className="text-xs font-bold text-red-600">Yes</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${a.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
      )}
    </div>
  );
}
