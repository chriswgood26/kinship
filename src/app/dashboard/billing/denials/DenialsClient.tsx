"use client";

import { useState } from "react";
import Link from "next/link";

/* ──────────────────────────────────────── types ── */
interface Client {
  id: string;
  first_name: string;
  last_name: string;
  mrn?: string;
}
interface Charge {
  id: string;
  service_date: string;
  cpt_code: string;
  cpt_description?: string;
  charge_amount: number;
  status: string;
  modifier?: string;
  icd10_codes?: string[];
  client?: Client | Client[];
}
interface Denial {
  id: string;
  charge_id: string;
  denial_date: string;
  denial_reason_code: string;
  denial_reason_description?: string;
  denial_category?: string;
  payer_name?: string;
  payer_claim_number?: string;
  original_charge_amount?: number;
  denied_amount?: number;
  appeal_status: string;
  appeal_deadline?: string;
  appeal_submitted_at?: string;
  appeal_notes?: string;
  resolution?: string;
  resolved_at?: string;
  notes?: string;
  charge?: Charge | Charge[];
}

/* ──────────────────────────────── reason code map ── */
export const CARC_CODES: Record<string, string> = {
  "CO-4":  "Procedure code inconsistent with modifier",
  "CO-11": "Diagnosis inconsistent with procedure",
  "CO-15": "Authorization number invalid",
  "CO-16": "Claim lacks information needed for adjudication",
  "CO-18": "Duplicate claim",
  "CO-19": "Claim denied: worker's comp",
  "CO-22": "This care may be covered by another payer",
  "CO-29": "Time limit for filing has expired",
  "CO-38": "Services not provided or authorized by designated provider",
  "CO-45": "Charge exceeds fee schedule / maximum allowable",
  "CO-50": "Non-covered service — not deemed medically necessary",
  "CO-51": "Non-covered service — not deemed medically necessary (pre-existing)",
  "CO-57": "Prior hospitalization not related to current claim",
  "CO-96": "Non-covered charge(s)",
  "CO-97": "Benefit included in another service/procedure payment",
  "CO-109": "Claim not covered by this payer / contractor",
  "CO-119": "Benefit maximum has been reached",
  "CO-167": "This (these) diagnosis(es) is (are) not covered",
  "CO-197": "Precertification / authorization absent",
  "CO-204": "Service not covered by this plan",
  "CO-B7":  "Provider not certified for this procedure",
  "PR-1":  "Deductible amount",
  "PR-2":  "Coinsurance amount",
  "PR-3":  "Co-payment amount",
  "PR-26": "Expenses incurred prior to coverage",
  "PR-27": "Expenses incurred after coverage terminated",
  "OA-23": "Adjusted per payment system — no additional patient liability",
};

const CATEGORIES = [
  { value: "medical_necessity", label: "Medical Necessity" },
  { value: "timely_filing", label: "Timely Filing" },
  { value: "eligibility", label: "Eligibility" },
  { value: "authorization", label: "Authorization" },
  { value: "duplicate", label: "Duplicate" },
  { value: "coding", label: "Coding Error" },
  { value: "patient_responsibility", label: "Patient Responsibility" },
  { value: "other", label: "Other" },
];

const APPEAL_STATUSES: Record<string, { label: string; color: string }> = {
  none:        { label: "No Appeal",    color: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In Progress",  color: "bg-amber-100 text-amber-700" },
  submitted:   { label: "Submitted",    color: "bg-blue-100 text-blue-700" },
  approved:    { label: "Approved",     color: "bg-emerald-100 text-emerald-700" },
  denied:      { label: "Appeal Denied", color: "bg-red-100 text-red-600" },
};

const RESOLUTIONS: { value: string; label: string }[] = [
  { value: "corrected_resubmit",  label: "Corrected & Resubmit" },
  { value: "appeal_approved",     label: "Appeal Approved" },
  { value: "appeal_denied",       label: "Appeal Denied" },
  { value: "write_off",           label: "Write Off" },
  { value: "patient_responsible", label: "Patient Responsible" },
  { value: "duplicate_void",      label: "Duplicate — Void" },
];

/* ──────────────────────── modal ── */
function EditDenialModal({
  denial,
  onClose,
  onSaved,
}: {
  denial: Denial;
  onClose: () => void;
  onSaved: (updated: Denial) => void;
}) {
  const charge = Array.isArray(denial.charge) ? denial.charge[0] : denial.charge;
  const client = charge
    ? Array.isArray(charge.client)
      ? charge.client[0]
      : charge.client
    : undefined;

  const [appealStatus, setAppealStatus] = useState(denial.appeal_status);
  const [appealDeadline, setAppealDeadline] = useState(denial.appeal_deadline || "");
  const [appealSubmittedAt, setAppealSubmittedAt] = useState(denial.appeal_submitted_at || "");
  const [appealNotes, setAppealNotes] = useState(denial.appeal_notes || "");
  const [resolution, setResolution] = useState(denial.resolution || "");
  const [notes, setNotes] = useState(denial.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/billing/denials/${denial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appeal_status: appealStatus,
          appeal_deadline: appealDeadline || null,
          appeal_submitted_at: appealSubmittedAt || null,
          appeal_notes: appealNotes || null,
          resolution: resolution || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Save failed"); return; }
      onSaved(data.denial);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Manage Denial</h2>
              {client && (
                <p className="text-sm text-slate-500 mt-0.5">
                  {client.last_name}, {client.first_name} — {charge?.cpt_code} — ${Number(denial.denied_amount || 0).toFixed(2)}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none mt-0.5">×</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Denial info (read-only) */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 text-sm">
            <div className="font-semibold text-red-800 mb-1">
              {denial.denial_reason_code} — {denial.denial_reason_description || CARC_CODES[denial.denial_reason_code] || "Unknown reason"}
            </div>
            <div className="text-red-600 text-xs">
              Denied {new Date(denial.denial_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {denial.payer_name ? ` · ${denial.payer_name}` : ""}
              {denial.payer_claim_number ? ` · Claim #${denial.payer_claim_number}` : ""}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Appeal Status</label>
              <select
                value={appealStatus}
                onChange={e => setAppealStatus(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {Object.entries(APPEAL_STATUSES).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Appeal Deadline</label>
              <input
                type="date"
                value={appealDeadline}
                onChange={e => setAppealDeadline(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Appeal Submitted Date</label>
            <input
              type="date"
              value={appealSubmittedAt}
              onChange={e => setAppealSubmittedAt(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Appeal Notes</label>
            <textarea
              value={appealNotes}
              onChange={e => setAppealNotes(e.target.value)}
              rows={2}
              placeholder="Document appeal rationale, supporting documentation, etc."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Resolution</label>
            <select
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">— Select resolution —</option>
              {RESOLUTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Internal Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes about this denial..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 pb-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── log denial modal ── */
interface DeniableCharge {
  id: string;
  service_date: string;
  cpt_code: string;
  cpt_description?: string;
  charge_amount: number;
  client?: Client | Client[];
}

function LogDenialModal({
  charges,
  onClose,
  onLogged,
}: {
  charges: DeniableCharge[];
  onClose: () => void;
  onLogged: (denial: Denial) => void;
}) {
  const [chargeId, setChargeId] = useState(charges[0]?.id || "");
  const [denialDate, setDenialDate] = useState(new Date().toISOString().split("T")[0]);
  const [reasonCode, setReasonCode] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [reasonDesc, setReasonDesc] = useState("");
  const [category, setCategory] = useState("other");
  const [payerName, setPayerName] = useState("");
  const [payerClaimNum, setPayerClaimNum] = useState("");
  const [deniedAmount, setDeniedAmount] = useState("");
  const [appealDeadline, setAppealDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const finalCode = reasonCode === "__custom__" ? customCode : reasonCode;

  const submit = async () => {
    if (!chargeId || !finalCode) { setError("Select a charge and reason code"); return; }
    setSaving(true);
    setError("");
    const selectedCharge = charges.find(c => c.id === chargeId);
    try {
      const res = await fetch("/api/billing/denials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          charge_id: chargeId,
          denial_date: denialDate,
          denial_reason_code: finalCode,
          denial_reason_description: reasonDesc || CARC_CODES[finalCode] || null,
          denial_category: category,
          payer_name: payerName || null,
          payer_claim_number: payerClaimNum || null,
          original_charge_amount: selectedCharge?.charge_amount,
          denied_amount: deniedAmount ? parseFloat(deniedAmount) : selectedCharge?.charge_amount,
          appeal_deadline: appealDeadline || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to log denial"); return; }
      onLogged(data.denial);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-900 text-lg">Log Claim Denial</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Charge</label>
            <select
              value={chargeId}
              onChange={e => setChargeId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {charges.map(c => {
                const cl = Array.isArray(c.client) ? c.client[0] : c.client;
                return (
                  <option key={c.id} value={c.id}>
                    {cl ? `${cl.last_name}, ${cl.first_name}` : "—"} · {c.cpt_code} · {c.service_date} · ${Number(c.charge_amount).toFixed(2)}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Denial Date</label>
              <input
                type="date"
                value={denialDate}
                onChange={e => setDenialDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Appeal Deadline</label>
              <input
                type="date"
                value={appealDeadline}
                onChange={e => setAppealDeadline(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Denial Reason Code (CARC)</label>
            <select
              value={reasonCode}
              onChange={e => {
                setReasonCode(e.target.value);
                if (e.target.value !== "__custom__") setReasonDesc(CARC_CODES[e.target.value] || "");
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">— Select reason code —</option>
              {Object.entries(CARC_CODES).map(([code, desc]) => (
                <option key={code} value={code}>{code} — {desc}</option>
              ))}
              <option value="__custom__">Other / Custom code…</option>
            </select>
          </div>

          {reasonCode === "__custom__" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Custom Reason Code</label>
              <input
                value={customCode}
                onChange={e => setCustomCode(e.target.value)}
                placeholder="e.g. MA130, N130, OA-23"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Reason Description (optional)</label>
            <input
              value={reasonDesc}
              onChange={e => setReasonDesc(e.target.value)}
              placeholder="Payer-specific explanation..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Denied Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={deniedAmount}
                onChange={e => setDeniedAmount(e.target.value)}
                placeholder="Leave blank = full charge"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Payer Name</label>
              <input
                value={payerName}
                onChange={e => setPayerName(e.target.value)}
                placeholder="e.g. BlueCross BlueShield"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Payer Claim #</label>
              <input
                value={payerClaimNum}
                onChange={e => setPayerClaimNum(e.target.value)}
                placeholder="Payer's claim number"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional notes about this denial..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 pb-6 flex justify-end gap-2 sticky bottom-0 bg-white pt-2 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-5 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-400 disabled:opacity-50 transition-colors"
          >
            {saving ? "Logging…" : "Log Denial"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────── main component ── */
const TAB_FILTERS: Record<string, string> = {
  all: "All",
  none: "Unaddressed",
  in_progress: "In Progress",
  submitted: "Appeal Submitted",
  approved: "Resolved",
};

interface DenialsClientProps {
  initialDenials: Denial[];
  deniableCharges: DeniableCharge[];
}

export default function DenialsClient({ initialDenials, deniableCharges }: DenialsClientProps) {
  const [denials, setDenials] = useState<Denial[]>(initialDenials);
  const [tab, setTab] = useState("all");
  const [editing, setEditing] = useState<Denial | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const filtered = denials.filter(d => {
    if (tab === "all") return true;
    if (tab === "approved") return d.appeal_status === "approved" || !!d.resolution;
    return d.appeal_status === tab;
  });

  const totalDenied = denials.reduce((s, d) => s + (Number(d.denied_amount) || 0), 0);
  const inAppeal = denials.filter(d => d.appeal_status === "submitted" || d.appeal_status === "in_progress").length;
  const unaddressed = denials.filter(d => d.appeal_status === "none" && !d.resolution).length;
  const resolved = denials.filter(d => !!d.resolution || d.appeal_status === "approved").length;

  const handleUpdated = (updated: Denial) => {
    setDenials(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
    setEditing(null);
  };

  const handleLogged = (denial: Denial) => {
    setDenials(prev => [denial, ...prev]);
    setLogOpen(false);
  };

  const categoryLabel = (cat?: string) =>
    CATEGORIES.find(c => c.value === cat)?.label || cat || "—";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/billing" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Claim Denials</h1>
            <p className="text-slate-500 text-sm mt-0.5">Track denied claims, reason codes, and appeal workflow</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/billing/appeals"
            className="px-4 py-2.5 rounded-xl font-semibold transition-colors text-sm border bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
          >
            Claim Appeals →
          </Link>
          <button
            onClick={() => setLogOpen(true)}
            className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-red-400 transition-colors text-sm"
          >
            + Log Denial
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Denied", value: `$${totalDenied.toFixed(2)}`, color: "bg-red-50 border-red-100" },
          { label: "Unaddressed", value: unaddressed, color: unaddressed > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "In Appeal", value: inAppeal, color: inAppeal > 0 ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-200" },
          { label: "Resolved", value: resolved, color: "bg-emerald-50 border-emerald-100" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {Object.entries(TAB_FILTERS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Denials table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!filtered.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-semibold text-slate-900 mb-1">
              {tab === "all" ? "No denied claims" : "No denials in this category"}
            </p>
            <p className="text-slate-500 text-sm">
              {tab === "all"
                ? "Click '+ Log Denial' to record a denied claim from your payer."
                : "Switch to 'All' to see all denials."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason Code</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payer</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Appeal</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Deadline</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(denial => {
                const charge = Array.isArray(denial.charge) ? denial.charge[0] : denial.charge;
                const client = charge
                  ? Array.isArray(charge.client) ? charge.client[0] : charge.client
                  : undefined;
                const appealInfo = APPEAL_STATUSES[denial.appeal_status] || APPEAL_STATUSES.none;
                const isOverdue =
                  denial.appeal_deadline &&
                  !denial.resolution &&
                  new Date(denial.appeal_deadline) < new Date();

                return (
                  <tr key={denial.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 text-sm">
                        {client ? `${client.last_name}, ${client.first_name}` : "—"}
                      </div>
                      <div className="text-xs text-slate-400">{client?.mrn || "—"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-mono font-bold text-sm text-slate-900">{charge?.cpt_code || "—"}</div>
                      <div className="text-xs text-slate-400">
                        {charge?.service_date
                          ? new Date(charge.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-mono text-sm font-bold text-red-600">{denial.denial_reason_code}</div>
                      <div className="text-xs text-slate-500 max-w-[180px] truncate" title={denial.denial_reason_description || CARC_CODES[denial.denial_reason_code]}>
                        {denial.denial_reason_description || CARC_CODES[denial.denial_reason_code] || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">{categoryLabel(denial.denial_category)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{denial.payer_name || "—"}</td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                      ${Number(denial.denied_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${appealInfo.color}`}>
                        {denial.resolution
                          ? RESOLUTIONS.find(r => r.value === denial.resolution)?.label || denial.resolution
                          : appealInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {denial.appeal_deadline ? (
                        <span className={isOverdue ? "text-red-600 font-semibold" : "text-slate-600"}>
                          {isOverdue ? "⚠️ " : ""}
                          {new Date(denial.appeal_deadline + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setEditing(denial)}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium whitespace-nowrap"
                      >
                        Manage →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {editing && (
        <EditDenialModal
          denial={editing}
          onClose={() => setEditing(null)}
          onSaved={handleUpdated}
        />
      )}

      {logOpen && (
        <LogDenialModal
          charges={deniableCharges}
          onClose={() => setLogOpen(false)}
          onLogged={handleLogged}
        />
      )}
    </div>
  );
}
