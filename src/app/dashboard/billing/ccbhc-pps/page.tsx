"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PPS_METHODOLOGY_LABELS,
  PPS_METHODOLOGY_DESCRIPTIONS,
  DEFAULT_PPS_BILLING_CODE,
  type PpsMethodology,
  type CcbhcPpsSettings,
  type CcbhcPpsClaim,
} from "@/lib/ccbhcPps";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClaimWithClient extends CcbhcPpsClaim {
  client?: { first_name: string; last_name: string; mrn: string | null } | null;
}

// ─── Status badge ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  submitted: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-600",
  void: "bg-slate-100 text-slate-400",
};

// ─── PPS Settings Form ─────────────────────────────────────────────────────────

function PpsSettingsPanel({
  settings,
  onSaved,
}: {
  settings: CcbhcPpsSettings | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(!settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    methodology: (settings?.methodology || "pps1_daily") as PpsMethodology,
    daily_rate: settings?.daily_rate?.toString() || "",
    monthly_rate: settings?.monthly_rate?.toString() || "",
    billing_code: settings?.billing_code || DEFAULT_PPS_BILLING_CODE,
    billing_modifier: settings?.billing_modifier || "",
    effective_date: settings?.effective_date || new Date().toISOString().split("T")[0],
    state_program_id: settings?.state_program_id || "",
    notes: settings?.notes || "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true); setError("");
    const res = await fetch("/api/billing/ccbhc-pps/rates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }
    setSaving(false); setEditing(false); onSaved();
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-900 text-base">PPS Rate Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure your state-approved CCBHC PPS methodology and rates</p>
        </div>
        {settings && !editing && (
          <button onClick={() => setEditing(true)} className="text-sm text-teal-600 hover:text-teal-800 font-medium">
            Edit
          </button>
        )}
      </div>

      {!editing && settings ? (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wide">Methodology</div>
            <div className="font-semibold text-slate-900">{PPS_METHODOLOGY_LABELS[settings.methodology]}</div>
            <div className="text-xs text-slate-500 mt-0.5">{PPS_METHODOLOGY_DESCRIPTIONS[settings.methodology]}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wide">Approved Rate</div>
            <div className="text-2xl font-bold text-teal-700">
              ${settings.methodology === "pps1_daily" ? settings.daily_rate?.toFixed(2) : settings.monthly_rate?.toFixed(2)}
              <span className="text-sm font-normal text-slate-500 ml-1">
                {settings.methodology === "pps1_daily" ? "/ day" : "/ month"}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wide">Billing Code</div>
            <div className="font-mono text-slate-900">{settings.billing_code}{settings.billing_modifier ? ` / ${settings.billing_modifier}` : ""}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wide">Effective Date</div>
            <div className="text-slate-900">{new Date(settings.effective_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
          </div>
          {settings.state_program_id && (
            <div>
              <div className="text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wide">State Program ID</div>
              <div className="font-mono text-slate-900">{settings.state_program_id}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Methodology selector */}
          <div>
            <label className={labelClass}>PPS Methodology *</label>
            <div className="grid grid-cols-2 gap-3">
              {(["pps1_daily", "pps2_monthly"] as PpsMethodology[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("methodology", m)}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${
                    form.methodology === m
                      ? "border-teal-400 bg-teal-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-sm text-slate-900">{PPS_METHODOLOGY_LABELS[m]}</div>
                  <div className="text-xs text-slate-500 mt-1">{PPS_METHODOLOGY_DESCRIPTIONS[m]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {form.methodology === "pps1_daily" ? (
              <div>
                <label className={labelClass}>Daily Rate (per beneficiary per day) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input type="number" value={form.daily_rate} onChange={e => set("daily_rate", e.target.value)}
                    step="0.01" min="0" className={inputClass + " pl-7"} placeholder="0.00" />
                </div>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Monthly Rate (per beneficiary per month) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input type="number" value={form.monthly_rate} onChange={e => set("monthly_rate", e.target.value)}
                    step="0.01" min="0" className={inputClass + " pl-7"} placeholder="0.00" />
                </div>
              </div>
            )}
            <div>
              <label className={labelClass}>Effective Date</label>
              <input type="date" value={form.effective_date} onChange={e => set("effective_date", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Billing Code</label>
              <input value={form.billing_code} onChange={e => set("billing_code", e.target.value)}
                className={inputClass + " font-mono"} placeholder="T1015" />
              <p className="text-xs text-slate-400 mt-1">Default: T1015 — check your state Medicaid plan</p>
            </div>
            <div>
              <label className={labelClass}>Modifier (optional)</label>
              <input value={form.billing_modifier} onChange={e => set("billing_modifier", e.target.value)}
                className={inputClass + " font-mono"} placeholder="e.g. U1, HQ" />
            </div>
          </div>

          <div>
            <label className={labelClass}>State Program ID (optional)</label>
            <input value={form.state_program_id} onChange={e => set("state_program_id", e.target.value)}
              className={inputClass} placeholder="State-assigned CCBHC program identifier" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-1">
            {settings && <button type="button" onClick={() => setEditing(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>}
            <button type="button" onClick={save} disabled={saving}
              className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : "Save PPS Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Generate Claims Panel ────────────────────────────────────────────────────

function GenerateClaimsPanel({
  settings,
  onGenerated,
}: {
  settings: CcbhcPpsSettings | null;
  onGenerated: () => void;
}) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(lastOfMonth);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; total_amount: number; message: string } | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    if (!settings) { setError("Configure PPS rates first before generating claims."); return; }
    setGenerating(true); setError(""); setResult(null);
    const res = await fetch("/api/billing/ccbhc-pps/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ date_from: dateFrom, date_to: dateTo }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to generate claims"); setGenerating(false); return; }
    setResult(data);
    setGenerating(false);
    if (data.created > 0) onGenerated();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="mb-4">
        <h2 className="font-semibold text-slate-900 text-base">Generate PPS Claims</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Scan qualifying encounters and auto-generate draft {settings ? PPS_METHODOLOGY_LABELS[settings.methodology] : "PPS"} claims
        </p>
      </div>

      {!settings && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-4">
          Configure PPS rates above before generating claims.
        </div>
      )}

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button onClick={generate} disabled={generating || !settings}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 whitespace-nowrap">
          {generating ? "Generating..." : "Generate Claims"}
        </button>
      </div>

      {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      {result && (
        <div className={`mt-3 rounded-xl px-4 py-3 text-sm border ${result.created > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
          <div className="font-semibold mb-0.5">
            {result.created > 0 ? `✅ ${result.created} draft claim${result.created !== 1 ? "s" : ""} created` : "No new claims generated"}
          </div>
          <div className="text-xs">{result.message}</div>
          {result.created > 0 && result.total_amount > 0 && (
            <div className="text-xs mt-1">Total amount: <span className="font-semibold">${result.total_amount.toFixed(2)}</span></div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Claims Table ─────────────────────────────────────────────────────────────

function ClaimsTable({ claims, onStatusChange }: {
  claims: ClaimWithClient[];
  onStatusChange: (id: string, status: string) => void;
}) {
  const [updating, setUpdating] = useState<string | null>(null);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch("/api/billing/ccbhc-pps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, status }),
    });
    setUpdating(null);
    onStatusChange(id, status);
  }

  if (!claims.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="text-4xl mb-3">📋</div>
        <p className="font-semibold text-slate-900 mb-1">No PPS claims yet</p>
        <p className="text-sm text-slate-500">Configure your PPS rates and generate claims from qualifying encounters above.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
            <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
            <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
            <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
            <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnoses</th>
            <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
            <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {claims.map(claim => {
            const client = Array.isArray(claim.client) ? claim.client[0] : claim.client;
            const isPps2 = claim.methodology === "pps2_monthly";
            const periodLabel = isPps2
              ? new Date(claim.period_start + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
              : new Date(claim.period_start + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            return (
              <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900 text-sm">
                    {client ? `${client.last_name}, ${client.first_name}` : "—"}
                  </div>
                  <div className="text-xs text-slate-400">{client?.mrn || "—"}</div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">{periodLabel}</td>
                <td className="px-4 py-4">
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                    {isPps2 ? "PPS-2" : "PPS-1"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="font-mono text-sm text-slate-900">{claim.billing_code}</span>
                  {claim.billing_modifier && (
                    <span className="ml-1 font-mono text-xs text-slate-500">{claim.billing_modifier}</span>
                  )}
                </td>
                <td className="px-4 py-4 text-xs font-mono text-slate-500">
                  {claim.icd10_codes?.slice(0, 2).join(", ") || "—"}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                  ${Number(claim.charge_amount).toFixed(2)}
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[claim.status] || STATUS_COLORS.draft}`}>
                    {claim.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {claim.status === "draft" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(claim.id, "pending")}
                        disabled={updating === claim.id}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium disabled:opacity-50">
                        Submit
                      </button>
                      <button
                        onClick={() => updateStatus(claim.id, "void")}
                        disabled={updating === claim.id}
                        className="text-xs text-slate-400 hover:text-slate-600 font-medium disabled:opacity-50">
                        Void
                      </button>
                    </div>
                  )}
                  {claim.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(claim.id, "paid")}
                        disabled={updating === claim.id}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-50">
                        Mark Paid
                      </button>
                      <button
                        onClick={() => updateStatus(claim.id, "denied")}
                        disabled={updating === claim.id}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50">
                        Denied
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CcbhcPpsPage() {
  const [settings, setSettings] = useState<CcbhcPpsSettings | null>(null);
  const [claims, setClaims] = useState<ClaimWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    const [settingsRes, claimsRes] = await Promise.all([
      fetch("/api/billing/ccbhc-pps/rates", { credentials: "include" }),
      fetch(`/api/billing/ccbhc-pps${statusFilter ? `?status=${statusFilter}` : ""}`, { credentials: "include" }),
    ]);
    const [settingsData, claimsData] = await Promise.all([settingsRes.json(), claimsRes.json()]);
    setSettings(settingsData.settings || null);
    setClaims(claimsData.claims || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  function handleStatusChange(id: string, status: string) {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: status as CcbhcPpsClaim["status"] } : c));
  }

  const draft = claims.filter(c => c.status === "draft").length;
  const pending = claims.filter(c => c.status === "pending").length;
  const paid = claims.filter(c => c.status === "paid").length;
  const totalPaid = claims.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.charge_amount), 0);
  const totalPending = claims.filter(c => c.status === "pending" || c.status === "draft").reduce((s, c) => s + Number(c.charge_amount), 0);

  if (loading) {
    return <div className="p-8 text-slate-400 text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/billing" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CCBHC Prospective Payment</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {settings
                ? `${PPS_METHODOLOGY_LABELS[settings.methodology]} · $${settings.methodology === "pps1_daily" ? settings.daily_rate?.toFixed(2) : settings.monthly_rate?.toFixed(2)} rate`
                : "Configure your state-approved PPS rate to begin billing"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full font-semibold">CCBHC Add-on</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Draft Claims", value: draft, color: "bg-slate-50 border-slate-200" },
          { label: "Pending Submission", value: `$${totalPending.toFixed(2)}`, sub: `${pending} claim${pending !== 1 ? "s" : ""}`, color: "bg-amber-50 border-amber-100" },
          { label: "Paid / Collected", value: `$${totalPaid.toFixed(2)}`, sub: `${paid} claim${paid !== 1 ? "s" : ""}`, color: "bg-emerald-50 border-emerald-100" },
          {
            label: "Rate Type",
            value: settings ? (settings.methodology === "pps1_daily" ? "PPS-1" : "PPS-2") : "Not set",
            sub: settings
              ? `$${settings.methodology === "pps1_daily" ? settings.daily_rate?.toFixed(2) : settings.monthly_rate?.toFixed(2)} ${settings.methodology === "pps1_daily" ? "/ day" : "/ mo"}`
              : "Set up below",
            color: settings ? "bg-violet-50 border-violet-100" : "bg-slate-50 border-slate-200",
          },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            {"sub" in s && s.sub && <div className="text-xs text-slate-500">{s.sub}</div>}
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* PPS info banner */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 flex gap-5 items-start">
        <div className="text-3xl flex-shrink-0">🏥</div>
        <div className="text-sm">
          <div className="font-semibold text-violet-900 mb-1">CCBHC Prospective Payment System</div>
          <p className="text-violet-700">
            CCBHC-certified organizations bill Medicaid using a pre-approved per-diem (PPS-1) or monthly per-member (PPS-2) rate
            instead of individual CPT codes. Generate PPS claims by scanning qualifying encounters, then submit to your state Medicaid clearinghouse.
          </p>
          <div className="mt-2 flex gap-3 text-xs text-violet-600">
            <span>✓ 9 required CCBHC service categories</span>
            <span>✓ Auto-deduplication by period</span>
            <span>✓ SAMHSA cost report compliance</span>
          </div>
        </div>
      </div>

      {/* PPS Settings */}
      <PpsSettingsPanel settings={settings} onSaved={load} />

      {/* Generate Claims */}
      <GenerateClaimsPanel settings={settings} onGenerated={load} />

      {/* Claims list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">PPS Claims</h2>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {["", "draft", "pending", "submitted", "paid", "denied"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${statusFilter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {s || "All"}
              </button>
            ))}
          </div>
        </div>
        <ClaimsTable claims={claims} onStatusChange={handleStatusChange} />
      </div>
    </div>
  );
}
