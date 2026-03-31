"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DEFAULT_SFS_TIERS, FPL_YEAR, type SFSTier } from "@/lib/fpl";

export default function SlidingFeeSchedulePage() {
  const [tiers, setTiers] = useState<SFSTier[]>(DEFAULT_SFS_TIERS);
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sliding-fee", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setTiers(d.tiers); setIsDefault(d.isDefault); });
  }, []);

  function updateTier(i: number, field: keyof SFSTier, value: string | number) {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/sliding-fee", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ tiers }),
    });
    setSaving(false);
    setSaved(true);
    setIsDefault(false);
    setTimeout(() => setSaved(false), 3000);
  }

  function resetToDefaults() {
    setTiers(DEFAULT_SFS_TIERS.map(t => ({ ...t })));
  }

  const inputClass = "border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full";

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/settings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sliding Fee Schedule</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure discounts by Federal Poverty Level — {FPL_YEAR} HHS guidelines auto-applied</p>
        </div>
      </div>

      {isDefault && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800">
          ℹ️ Using default sliding fee schedule. Customize below and save to apply your organization's specific tiers.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Fee Tiers</h2>
          <button onClick={resetToDefaults} className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg">Reset to defaults</button>
        </div>

        <div className="p-4 space-y-3">
          {tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-end p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="col-span-1">
                <div className="text-xs text-slate-400 mb-1">Tier</div>
                <input value={tier.tier} onChange={e => updateTier(i, "tier", e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-400 mb-1">Label</div>
                <input value={tier.label} onChange={e => updateTier(i, "label", e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-400 mb-1">FPL Min %</div>
                <input type="number" value={tier.fpl_min} onChange={e => updateTier(i, "fpl_min", Number(e.target.value))} className={inputClass} />
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-400 mb-1">FPL Max %</div>
                <input type="number" value={tier.fpl_max === 9999 ? "" : tier.fpl_max} onChange={e => updateTier(i, "fpl_max", e.target.value === "" ? 9999 : Number(e.target.value))}
                  className={inputClass} placeholder="No max" />
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-400 mb-1">Discount Type</div>
                <select value={tier.discount_type} onChange={e => updateTier(i, "discount_type", e.target.value as "flat" | "percent" | "none")} className={inputClass}>
                  <option value="flat">Flat $ copay</option>
                  <option value="percent">% discount</option>
                  <option value="none">Full fee</option>
                </select>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-400 mb-1">
                  {tier.discount_type === "flat" ? "Copay ($)" : tier.discount_type === "percent" ? "Discount (%)" : "—"}
                </div>
                <input type="number" value={tier.discount_type === "none" ? "" : tier.discount_value}
                  onChange={e => updateTier(i, "discount_value", Number(e.target.value))}
                  className={inputClass} disabled={tier.discount_type === "none"} min="0"
                  max={tier.discount_type === "percent" ? "100" : undefined} />
              </div>
              <div className="col-span-1 text-right">
                <button onClick={() => setTiers(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
              </div>
            </div>
          ))}

          <button onClick={() => setTiers(prev => [...prev, { tier: String.fromCharCode(65 + prev.length), label: `Tier ${String.fromCharCode(65 + prev.length)}`, fpl_min: 0, fpl_max: 9999, discount_type: "none", discount_value: 0, description: "" }])}
            className="w-full border-2 border-dashed border-slate-200 text-slate-400 py-2.5 rounded-xl text-sm hover:border-teal-300 hover:text-teal-500 transition-colors">
            + Add tier
          </button>
        </div>

        {/* Example */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Preview — $180 charge (90837)</div>
          <div className="grid grid-cols-5 gap-2">
            {tiers.map((tier, i) => {
              const adj = tier.discount_type === "flat" ? Math.max(0, 180 - tier.discount_value) :
                tier.discount_type === "percent" ? 180 - Math.round(180 * tier.discount_value / 100 * 100) / 100 : 180;
              return (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                  <div className="text-xs font-bold text-slate-500">{tier.label}</div>
                  <div className="text-xs text-slate-400 mb-1">{tier.fpl_min}–{tier.fpl_max === 9999 ? "∞" : tier.fpl_max}%</div>
                  <div className="text-lg font-bold text-teal-600">${adj.toFixed(2)}</div>
                  {tier.discount_type !== "none" && (
                    <div className="text-xs text-slate-400">saves ${(180 - adj).toFixed(2)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {saved && <span className="text-teal-600 text-sm font-medium self-center">✓ Saved</span>}
        <button onClick={save} disabled={saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Save Schedule"}
        </button>
      </div>
    </div>
  );
}
