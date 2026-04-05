"use client";

import { useState } from "react";
import Link from "next/link";

/* ─────────────────────── types ── */
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
  client?: Client | Client[];
}
interface Denial {
  id: string;
  denial_date: string;
  denial_reason_code: string;
  denial_reason_description?: string;
  denial_category?: string;
  payer_name?: string;
  payer_claim_number?: string;
  denied_amount?: number;
  appeal_status: string;
  charge?: Charge | Charge[];
}
interface Appeal {
  id: string;
  denial_id: string;
  appeal_level: string;
  appeal_type: string;
  tracking_number?: string;
  submitted_at?: string;
  deadline?: string;
  response_received_at?: string;
  outcome: string;
  amount_appealed?: number;
  amount_recovered?: number;
  notes?: string;
  created_at: string;
  denial?: Denial | Denial[];
}

/* ─────────────────────── constants ── */
const APPEAL_LEVELS: { value: string; label: string }[] = [
  { value: "level_1", label: "Level 1 — Internal" },
  { value: "level_2", label: "Level 2 — Internal" },
  { value: "external_review", label: "External / IRE Review" },
];

const APPEAL_TYPES: { value: string; label: string }[] = [
  { value: "written", label: "Written" },
  { value: "peer_to_peer", label: "Peer-to-Peer" },
  { value: "expedited", label: "Expedited" },
  { value: "external", label: "External (State/Federal)" },
];

const OUTCOMES: Record<string, { label: string; color: string }> = {
  pending:             { label: "Pending",            color: "bg-amber-100 text-amber-700" },
  approved:            { label: "Approved",           color: "bg-emerald-100 text-emerald-700" },
  partially_approved:  { label: "Partial Win",        color: "bg-teal-100 text-teal-700" },
  denied:              { label: "Denied",             color: "bg-red-100 text-red-600" },
  withdrawn:           { label: "Withdrawn",          color: "bg-slate-100 text-slate-500" },
};

const CARC_CODES: Record<string, string> = {
  "CO-4":  "Procedure code inconsistent with modifier",
  "CO-11": "Diagnosis inconsistent with procedure",
  "CO-15": "Authorization number invalid",
  "CO-16": "Claim lacks information needed for adjudication",
  "CO-18": "Duplicate claim",
  "CO-29": "Time limit for filing has expired",
  "CO-45": "Charge exceeds fee schedule / maximum allowable",
  "CO-50": "Non-covered service — not deemed medically necessary",
  "CO-96": "Non-covered charge(s)",
  "CO-97": "Benefit included in another service/procedure payment",
  "CO-197": "Precertification / authorization absent",
  "CO-204": "Service not covered by this plan",
};

/* ─────────────────────── helpers ── */
function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function fmtMoney(v?: number | null) {
  if (v == null) return "—";
  return `$${Number(v).toFixed(2)}`;
}

/* ─────────────────────── file appeal modal ── */
function FileAppealModal({
  denials,
  preselectedDenialId,
  onClose,
  onFiled,
}: {
  denials: Denial[];
  preselectedDenialId?: string;
  onClose: () => void;
  onFiled: (appeal: Appeal) => void;
}) {
  const [denialId, setDenialId] = useState(preselectedDenialId || denials[0]?.id || "");
  const [appealLevel, setAppealLevel] = useState("level_1");
  const [appealType, setAppealType] = useState("written");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [amountAppealed, setAmountAppealed] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedDenial = denials.find(d => d.id === denialId);

  const submit = async () => {
    if (!denialId) { setError("Select a denial to appeal"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/billing/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          denial_id: denialId,
          appeal_level: appealLevel,
          appeal_type: appealType,
          tracking_number: trackingNumber || null,
          submitted_at: submittedAt || null,
          deadline: deadline || null,
          amount_appealed: amountAppealed ? parseFloat(amountAppealed) : null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to file appeal"); return; }
      onFiled(data.appeal);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-900 text-lg">File Claim Appeal</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Denial picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Denied Claim</label>
            <select
              value={denialId}
              onChange={e => setDenialId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {denials.map(d => {
                const charge = Array.isArray(d.charge) ? d.charge[0] : d.charge;
                const client = charge
                  ? Array.isArray(charge.client) ? charge.client[0] : charge.client
                  : undefined;
                return (
                  <option key={d.id} value={d.id}>
                    {client ? `${client.last_name}, ${client.first_name}` : "—"} ·{" "}
                    {charge?.cpt_code || "—"} · {d.payer_name || "Unknown Payer"} ·{" "}
                    {fmtMoney(d.denied_amount)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected denial info */}
          {selectedDenial && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm">
              <div className="font-semibold text-red-800">
                {selectedDenial.denial_reason_code} —{" "}
                {selectedDenial.denial_reason_description ||
                  CARC_CODES[selectedDenial.denial_reason_code] ||
                  "Unknown reason"}
              </div>
              <div className="text-xs text-red-500 mt-0.5">
                Denied {fmtDate(selectedDenial.denial_date)}
                {selectedDenial.payer_claim_number
                  ? ` · Claim #${selectedDenial.payer_claim_number}`
                  : ""}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Appeal Level</label>
              <select
                value={appealLevel}
                onChange={e => setAppealLevel(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {APPEAL_LEVELS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Appeal Type</label>
              <select
                value={appealType}
                onChange={e => setAppealType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {APPEAL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Payer Appeal / Tracking Number
            </label>
            <input
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="e.g. APP-2026-00123"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Submission Date</label>
              <input
                type="date"
                value={submittedAt}
                onChange={e => setSubmittedAt(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Appeal Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Amount Appealed ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={amountAppealed}
              onChange={e => setAmountAppealed(e.target.value)}
              placeholder={
                selectedDenial?.denied_amount
                  ? `Default: ${fmtMoney(selectedDenial.denied_amount)}`
                  : "Enter amount"
              }
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Appeal rationale, supporting docs submitted, arguments…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 pb-6 flex justify-end gap-2 sticky bottom-0 bg-white pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-5 py-2 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors"
          >
            {saving ? "Filing…" : "File Appeal"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── log response modal ── */
function LogResponseModal({
  appeal,
  onClose,
  onSaved,
}: {
  appeal: Appeal;
  onClose: () => void;
  onSaved: (updated: Appeal) => void;
}) {
  const denial = Array.isArray(appeal.denial) ? appeal.denial[0] : appeal.denial;
  const charge = denial
    ? Array.isArray(denial.charge) ? denial.charge[0] : denial.charge
    : undefined;
  const client = charge
    ? Array.isArray(charge.client) ? charge.client[0] : charge.client
    : undefined;

  const [outcome, setOutcome] = useState(appeal.outcome);
  const [responseReceivedAt, setResponseReceivedAt] = useState(
    appeal.response_received_at || ""
  );
  const [amountRecovered, setAmountRecovered] = useState(
    appeal.amount_recovered != null ? String(appeal.amount_recovered) : ""
  );
  const [trackingNumber, setTrackingNumber] = useState(appeal.tracking_number || "");
  const [notes, setNotes] = useState(appeal.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/billing/appeals/${appeal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          outcome,
          response_received_at: responseReceivedAt || null,
          amount_recovered: amountRecovered ? parseFloat(amountRecovered) : null,
          tracking_number: trackingNumber || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Save failed"); return; }
      onSaved(data.appeal);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Log Appeal Response</h2>
            {client && (
              <p className="text-sm text-slate-500 mt-0.5">
                {client.last_name}, {client.first_name} — {charge?.cpt_code} —{" "}
                {APPEAL_LEVELS.find(l => l.value === appeal.appeal_level)?.label}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none mt-0.5">
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Outcome</label>
              <select
                value={outcome}
                onChange={e => setOutcome(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {Object.entries(OUTCOMES).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Response Received Date</label>
              <input
                type="date"
                value={responseReceivedAt}
                onChange={e => setResponseReceivedAt(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          {(outcome === "approved" || outcome === "partially_approved") && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Amount Recovered ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={amountRecovered}
                onChange={e => setAmountRecovered(e.target.value)}
                placeholder={`Appealed: ${fmtMoney(appeal.amount_appealed)}`}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Payer Tracking / Reference Number
            </label>
            <input
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="e.g. APP-2026-00123"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Decision rationale, next steps…"
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
            {saving ? "Saving…" : "Save Response"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── main component ── */
const TAB_FILTERS: Record<string, string> = {
  all:      "All",
  pending:  "Pending",
  approved: "Won",
  denied:   "Lost",
};

interface ClaimAppealsClientProps {
  initialAppeals: Appeal[];
  appealableDenials: Denial[];
}

export default function ClaimAppealsClient({
  initialAppeals,
  appealableDenials,
}: ClaimAppealsClientProps) {
  const [appeals, setAppeals] = useState<Appeal[]>(initialAppeals);
  const [tab, setTab] = useState("all");
  const [filing, setFiling] = useState(false);
  const [logging, setLogging] = useState<Appeal | null>(null);

  const filtered = appeals.filter(a => {
    if (tab === "all") return true;
    if (tab === "approved") return a.outcome === "approved" || a.outcome === "partially_approved";
    if (tab === "denied") return a.outcome === "denied";
    return a.outcome === tab;
  });

  // Stats
  const totalAppealed = appeals.reduce((s, a) => s + (Number(a.amount_appealed) || 0), 0);
  const totalRecovered = appeals.reduce((s, a) => s + (Number(a.amount_recovered) || 0), 0);
  const pendingCount = appeals.filter(a => a.outcome === "pending").length;
  const wonCount = appeals.filter(
    a => a.outcome === "approved" || a.outcome === "partially_approved"
  ).length;
  const lostCount = appeals.filter(a => a.outcome === "denied").length;

  const winRate =
    wonCount + lostCount > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : null;

  const handleFiled = (appeal: Appeal) => {
    setAppeals(prev => [appeal, ...prev]);
    setFiling(false);
  };

  const handleSaved = (updated: Appeal) => {
    setAppeals(prev => prev.map(a => (a.id === updated.id ? { ...a, ...updated } : a)));
    setLogging(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/billing/denials" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Claim Appeals</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Track formal claim-level appeals — levels, outcomes, and recoveries
            </p>
          </div>
        </div>
        <button
          onClick={() => setFiling(true)}
          disabled={appealableDenials.length === 0}
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm disabled:opacity-50"
        >
          + File Appeal
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Total Appealed",
            value: `$${totalAppealed.toFixed(2)}`,
            color: "bg-slate-50 border-slate-200",
          },
          {
            label: "Recovered",
            value: `$${totalRecovered.toFixed(2)}`,
            color: "bg-emerald-50 border-emerald-100",
          },
          {
            label: "Pending Response",
            value: pendingCount,
            color: pendingCount > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200",
          },
          {
            label: "Appeals Won",
            value: wonCount,
            color: wonCount > 0 ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-200",
          },
          {
            label: "Win Rate",
            value: winRate != null ? `${winRate}%` : "—",
            color:
              winRate != null && winRate >= 50
                ? "bg-emerald-50 border-emerald-100"
                : winRate != null
                ? "bg-red-50 border-red-100"
                : "bg-slate-50 border-slate-200",
          },
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
              tab === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Appeals table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!filtered.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-slate-900 mb-1">
              {tab === "all" ? "No appeals on file" : "No appeals in this category"}
            </p>
            <p className="text-slate-500 text-sm mb-4">
              {tab === "all"
                ? appealableDenials.length > 0
                  ? "File an appeal for a denied claim to start tracking."
                  : "Log a claim denial first, then come back to file an appeal."
                : "Switch to 'All' to see all appeals."}
            </p>
            {tab === "all" && appealableDenials.length > 0 && (
              <button
                onClick={() => setFiling(true)}
                className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400"
              >
                + File First Appeal
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Denial
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Level / Type
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tracking #
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Appealed
                </th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Recovered
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Outcome
                </th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(appeal => {
                const denial = Array.isArray(appeal.denial)
                  ? appeal.denial[0]
                  : appeal.denial;
                const charge = denial
                  ? Array.isArray(denial.charge) ? denial.charge[0] : denial.charge
                  : undefined;
                const client = charge
                  ? Array.isArray(charge.client) ? charge.client[0] : charge.client
                  : undefined;

                const outcomeInfo = OUTCOMES[appeal.outcome] || OUTCOMES.pending;
                const isOverdue =
                  appeal.deadline &&
                  appeal.outcome === "pending" &&
                  new Date(appeal.deadline) < new Date();
                const levelLabel =
                  APPEAL_LEVELS.find(l => l.value === appeal.appeal_level)?.label || appeal.appeal_level;
                const typeLabel =
                  APPEAL_TYPES.find(t => t.value === appeal.appeal_type)?.label || appeal.appeal_type;

                return (
                  <tr key={appeal.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 text-sm">
                        {client ? `${client.last_name}, ${client.first_name}` : "—"}
                      </div>
                      <div className="text-xs text-slate-400">{client?.mrn || "—"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-mono font-bold text-sm text-slate-900">
                        {charge?.cpt_code || "—"}
                      </div>
                      <div className="text-xs text-slate-400">{fmtDate(charge?.service_date)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-mono text-sm font-bold text-red-600">
                        {denial?.denial_reason_code || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {denial?.payer_name || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-semibold text-slate-700">{levelLabel}</div>
                      <div className="text-xs text-slate-400">{typeLabel}</div>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-slate-600">
                      {appeal.tracking_number || "—"}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {fmtDate(appeal.submitted_at)}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {appeal.deadline ? (
                        <span
                          className={
                            isOverdue ? "text-red-600 font-semibold" : "text-slate-600"
                          }
                        >
                          {isOverdue ? "⚠️ " : ""}
                          {fmtDate(appeal.deadline)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                      {fmtMoney(appeal.amount_appealed)}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-semibold">
                      {appeal.amount_recovered != null ? (
                        <span className="text-emerald-600">
                          {fmtMoney(appeal.amount_recovered)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${outcomeInfo.color}`}
                      >
                        {outcomeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setLogging(appeal)}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium whitespace-nowrap"
                      >
                        {appeal.outcome === "pending" ? "Log Response →" : "Edit →"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Contextual tip */}
      {appealableDenials.length > 0 && appeals.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          {appealableDenials.length} denied claim
          {appealableDenials.length !== 1 ? "s" : ""} eligible for appeal ·{" "}
          <button
            onClick={() => setFiling(true)}
            className="text-teal-600 hover:underline font-medium"
          >
            File another appeal
          </button>
        </p>
      )}

      {/* Modals */}
      {filing && (
        <FileAppealModal
          denials={appealableDenials}
          onClose={() => setFiling(false)}
          onFiled={handleFiled}
        />
      )}

      {logging && (
        <LogResponseModal
          appeal={logging}
          onClose={() => setLogging(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
