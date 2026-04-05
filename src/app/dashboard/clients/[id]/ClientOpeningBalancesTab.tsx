"use client";

import { useState, useEffect, useCallback } from "react";

interface OpeningBalance {
  id: string;
  balance_date: string;
  amount: number;
  balance_type: string;
  source_system: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
}

const BALANCE_TYPE_LABELS: Record<string, string> = {
  self_pay: "Self-Pay",
  copay: "Copay",
  deductible: "Deductible",
  coinsurance: "Coinsurance",
  insurance: "Insurance (Payer)",
  other: "Other",
};

const BALANCE_TYPE_COLORS: Record<string, string> = {
  self_pay: "bg-amber-100 text-amber-700",
  copay: "bg-blue-100 text-blue-700",
  deductible: "bg-purple-100 text-purple-700",
  coinsurance: "bg-indigo-100 text-indigo-700",
  insurance: "bg-teal-100 text-teal-700",
  other: "bg-slate-100 text-slate-600",
};

export default function ClientOpeningBalancesTab({ clientId }: { clientId: string }) {
  const [balances, setBalances] = useState<OpeningBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    balance_date: new Date().toISOString().split("T")[0],
    amount: "",
    balance_type: "self_pay",
    source_system: "",
    description: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/opening-balances?client_id=${clientId}`, { credentials: "include" });
    const json = await res.json();
    setBalances(json.opening_balances || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/clients/opening-balances", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, client_id: clientId }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error || "Failed to save");
      setSaving(false);
      return;
    }
    setForm({ balance_date: new Date().toISOString().split("T")[0], amount: "", balance_type: "self_pay", source_system: "", description: "", notes: "" });
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this opening balance?")) return;
    await fetch(`/api/clients/opening-balances?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  const totalBalance = balances.reduce((sum, b) => sum + Number(b.amount), 0);

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Opening Balances</h2>
          <p className="text-slate-500 text-sm mt-0.5">Legacy outstanding balances carried over from prior system at migration</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); }}
          className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Balance"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Record Opening Balance</h3>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>As-of Date *</label>
              <input type="date" required value={form.balance_date} onChange={e => setForm(f => ({ ...f, balance_date: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Amount ($) *</label>
              <input type="number" step="0.01" min="0.01" required placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Balance Type</label>
              <select value={form.balance_type} onChange={e => setForm(f => ({ ...f, balance_type: e.target.value }))} className={inputClass}>
                {Object.entries(BALANCE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Source System</label>
              <input type="text" placeholder="e.g. DrCloudEHR, AdvancedMD" value={form.source_system} onChange={e => setForm(f => ({ ...f, source_system: e.target.value }))} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Description</label>
              <input type="text" placeholder="e.g. Unpaid copays from Q1 2025, outstanding deductible" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Internal Notes</label>
              <textarea rows={2} placeholder="Any additional context about this balance" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">{saving ? "Saving\u2026" : "Save Balance"}</button>
          </div>
        </form>
      )}

      {balances.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Total Opening Balance</div>
            <div className="text-2xl font-bold text-amber-900 mt-0.5">${totalBalance.toFixed(2)}</div>
          </div>
          <div className="text-xs text-amber-700 text-right">{balances.length} {balances.length === 1 ? "entry" : "entries"} from legacy system</div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Loading\u2026</div>
      ) : balances.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="text-3xl mb-3">\uD83C\uDFE6</div>
          <div className="font-semibold text-slate-700 mb-1">No opening balances recorded</div>
          <div className="text-sm text-slate-400">If this client had an outstanding balance in the prior system, add it here so it is reflected in their account.</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">As-of Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Source System</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {balances.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-700">{new Date(b.balance_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BALANCE_TYPE_COLORS[b.balance_type] || BALANCE_TYPE_COLORS.other}`}>
                      {BALANCE_TYPE_LABELS[b.balance_type] || b.balance_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{b.source_system || "\u2014"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{b.description || <span className="text-slate-400">\u2014</span>}</div>
                    {b.notes && <div className="text-xs text-slate-400 mt-0.5">{b.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">${Number(b.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(b.id)} className="text-slate-300 hover:text-red-500 transition-colors text-xs" title="Remove">\u2715</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
        <strong className="text-slate-500">Note:</strong> Opening balances are informational records of legacy AR carried over from a prior system. They do not create charges in Kinship \u2014 they represent the starting financial position at migration.
      </div>
    </div>
  );
}
