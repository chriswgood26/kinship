"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DEFAULT_SFS_TIERS, FPL_YEAR, PROGRAM_AREA_OPTIONS, PAYER_EXCLUSION_REASONS, type SFSTier, type SFSProgramOverride, type SFSServiceOverride, type SFSGrantSchedule, type SFSPayerExclusion } from "@/lib/fpl";
import PayerSelect from "@/components/PayerSelect";

type Tab = "base" | "programs" | "services" | "grants" | "payers" | "retro";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "base",     label: "Base Schedule",      icon: "📋" },
  { key: "programs", label: "Program Overrides",   icon: "🏥" },
  { key: "services", label: "Service Overrides",   icon: "💊" },
  { key: "grants",   label: "Grant Schedules",     icon: "🏛️" },
  { key: "payers",   label: "Payer Exclusions",    icon: "🚫" },
  { key: "retro",    label: "Retroactive Adjust",  icon: "🔄" },
];

const inputClass = "border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full";
const btnPrimary = "bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50";
const btnSecondary = "border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50";

// ── Base Schedule Tab ────────────────────────────────────────────────────────
function BaseScheduleTab() {
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
    setSaving(false); setSaved(true); setIsDefault(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-5">
      {isDefault && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800">
          ℹ️ Using default sliding fee schedule. Customize below and save to apply your organization's specific tiers.
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Fee Tiers</h2>
          <button onClick={() => setTiers(DEFAULT_SFS_TIERS.map(t => ({ ...t })))} className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg">Reset to defaults</button>
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
                <input type="number" value={tier.fpl_max === 9999 ? "" : tier.fpl_max} onChange={e => updateTier(i, "fpl_max", e.target.value === "" ? 9999 : Number(e.target.value))} className={inputClass} placeholder="No max" />
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
                <div className="text-xs text-slate-400 mb-1">{tier.discount_type === "flat" ? "Copay ($)" : tier.discount_type === "percent" ? "Discount (%)" : "—"}</div>
                <input type="number" value={tier.discount_type === "none" ? "" : tier.discount_value} onChange={e => updateTier(i, "discount_value", Number(e.target.value))} className={inputClass} disabled={tier.discount_type === "none"} min="0" max={tier.discount_type === "percent" ? "100" : undefined} />
              </div>
              <div className="col-span-1 text-right">
                <button onClick={() => setTiers(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
              </div>
            </div>
          ))}
          <button onClick={() => setTiers(prev => [...prev, { tier: String.fromCharCode(65 + prev.length), label: `Tier ${String.fromCharCode(65 + prev.length)}`, fpl_min: 0, fpl_max: 9999, discount_type: "none", discount_value: 0, description: "" }])}
            className="w-full border-2 border-dashed border-slate-200 text-slate-400 py-2.5 rounded-xl text-sm hover:border-teal-300 hover:text-teal-500 transition-colors">
            + Add tier
          </button>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Preview — $180 charge (90837)</div>
          <div className="grid grid-cols-5 gap-2">
            {tiers.slice(0, 5).map((tier, i) => {
              const adj = tier.discount_type === "flat" ? Math.max(0, 180 - tier.discount_value) : tier.discount_type === "percent" ? 180 - Math.round(180 * tier.discount_value / 100 * 100) / 100 : 180;
              return (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                  <div className="text-xs font-bold text-slate-500">{tier.label}</div>
                  <div className="text-xs text-slate-400 mb-1">{tier.fpl_min}–{tier.fpl_max === 9999 ? "∞" : tier.fpl_max}%</div>
                  <div className="text-lg font-bold text-teal-600">${adj.toFixed(2)}</div>
                  {tier.discount_type !== "none" && <div className="text-xs text-slate-400">saves ${(180 - adj).toFixed(2)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        {saved && <span className="text-teal-600 text-sm font-medium self-center">✓ Saved</span>}
        <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save Schedule"}</button>
      </div>
    </div>
  );
}

// ── Program Overrides Tab ────────────────────────────────────────────────────
function ProgramOverridesTab() {
  const [overrides, setOverrides] = useState<SFSProgramOverride[]>([]);
  const [editing, setEditing] = useState<SFSProgramOverride | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/sliding-fee/program-overrides", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setOverrides(d.overrides || []); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank: SFSProgramOverride = { program_area: "mental_health", label: "Mental Health", tiers: DEFAULT_SFS_TIERS.map(t => ({ ...t })), is_active: true };

  async function saveOverride() {
    if (!editing) return;
    setSaving(true);
    await fetch("/api/admin/sliding-fee/program-overrides", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(editing),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setEditing(null);
    load();
  }

  async function removeOverride(id: string) {
    await fetch(`/api/admin/sliding-fee/program-overrides?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  function updateEditTier(i: number, field: keyof SFSTier, value: string | number) {
    if (!editing) return;
    setEditing(prev => prev ? { ...prev, tiers: prev.tiers.map((t, idx) => idx === i ? { ...t, [field]: value } : t) } : null);
  }

  const activeOverrides = overrides.filter(o => o.is_active);

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800">
        <strong>Program-area overrides</strong> let you apply different SFS tiers for specific clinical programs (e.g., a lower copay schedule for substance use vs. mental health). When a charge is linked to a program area, the program's tier set takes precedence over the base schedule.
      </div>

      {/* Existing overrides */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Active Overrides ({activeOverrides.length})</h2>
          <button onClick={() => setEditing(blank)} className={btnPrimary + " py-1.5 px-4 text-xs"}>+ Add Override</button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : activeOverrides.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No program overrides configured. Using base schedule for all programs.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Program Area</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Label</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tiers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeOverrides.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">{PROGRAM_AREA_OPTIONS.find(p => p.value === o.program_area)?.label || o.program_area}</td>
                  <td className="px-4 py-4 text-slate-600">{o.label}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(o.tiers || []).map((t, i) => (
                        <span key={i} className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full">
                          {t.label}: {t.discount_type === "flat" ? `$${t.discount_value}` : t.discount_type === "percent" ? `${t.discount_value}% off` : "full"}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(o)} className="text-xs text-teal-600 hover:text-teal-700 font-semibold">Edit</button>
                      <button onClick={() => o.id && removeOverride(o.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor panel */}
      {editing && (
        <div className="bg-white rounded-2xl border border-teal-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
            <h2 className="font-semibold text-teal-900">{editing.id ? "Edit Override" : "New Program Override"}</h2>
            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Program Area</label>
                <select value={editing.program_area} onChange={e => setEditing(p => p ? { ...p, program_area: e.target.value, label: PROGRAM_AREA_OPTIONS.find(o => o.value === e.target.value)?.label || p.label } : null)} className={inputClass}>
                  {PROGRAM_AREA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Schedule Label</label>
                <input value={editing.label} onChange={e => setEditing(p => p ? { ...p, label: e.target.value } : null)} className={inputClass} placeholder="e.g. Mental Health SFS" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">Tier Configuration</label>
              <div className="space-y-2">
                {editing.tiers.map((tier, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="col-span-1"><div className="text-xs text-slate-400 mb-1">Tier</div><input value={tier.tier} onChange={e => updateEditTier(i, "tier", e.target.value)} className={inputClass} /></div>
                    <div className="col-span-2"><div className="text-xs text-slate-400 mb-1">Label</div><input value={tier.label} onChange={e => updateEditTier(i, "label", e.target.value)} className={inputClass} /></div>
                    <div className="col-span-2"><div className="text-xs text-slate-400 mb-1">FPL Min%</div><input type="number" value={tier.fpl_min} onChange={e => updateEditTier(i, "fpl_min", Number(e.target.value))} className={inputClass} /></div>
                    <div className="col-span-2"><div className="text-xs text-slate-400 mb-1">FPL Max%</div><input type="number" value={tier.fpl_max === 9999 ? "" : tier.fpl_max} onChange={e => updateEditTier(i, "fpl_max", e.target.value === "" ? 9999 : Number(e.target.value))} className={inputClass} placeholder="∞" /></div>
                    <div className="col-span-2"><div className="text-xs text-slate-400 mb-1">Type</div><select value={tier.discount_type} onChange={e => updateEditTier(i, "discount_type", e.target.value as "flat" | "percent" | "none")} className={inputClass}><option value="flat">Flat $</option><option value="percent">% off</option><option value="none">Full fee</option></select></div>
                    <div className="col-span-2"><div className="text-xs text-slate-400 mb-1">Value</div><input type="number" value={tier.discount_type === "none" ? "" : tier.discount_value} onChange={e => updateEditTier(i, "discount_value", Number(e.target.value))} className={inputClass} disabled={tier.discount_type === "none"} min="0" /></div>
                    <div className="col-span-1 text-right"><button onClick={() => setEditing(p => p ? { ...p, tiers: p.tiers.filter((_, idx) => idx !== i) } : null)} className="text-red-400 hover:text-red-600">✕</button></div>
                  </div>
                ))}
                <button onClick={() => setEditing(p => p ? { ...p, tiers: [...p.tiers, { tier: String.fromCharCode(65 + p.tiers.length), label: `Tier ${String.fromCharCode(65 + p.tiers.length)}`, fpl_min: 0, fpl_max: 9999, discount_type: "none", discount_value: 0, description: "" }] } : null)} className="w-full border-2 border-dashed border-slate-200 text-slate-400 py-2 rounded-xl text-sm hover:border-teal-300 hover:text-teal-500">+ Add tier</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Notes (optional)</label>
              <input value={editing.notes || ""} onChange={e => setEditing(p => p ? { ...p, notes: e.target.value } : null)} className={inputClass} placeholder="Internal notes about this override" />
            </div>
            <div className="flex justify-end gap-3">
              {saved && <span className="text-teal-600 text-sm self-center">✓ Saved</span>}
              <button onClick={() => setEditing(null)} className={btnSecondary}>Cancel</button>
              <button onClick={saveOverride} disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save Override"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Service Overrides Tab ────────────────────────────────────────────────────
function ServiceOverridesTab() {
  const [overrides, setOverrides] = useState<SFSServiceOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ cpt_code: "", cpt_description: "", override_type: "flat" as "flat" | "percent" | "waive" | "full_fee", override_value: "", applies_to_fpl_max: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/sliding-fee/service-overrides", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setOverrides(d.overrides || []); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addOverride() {
    if (!form.cpt_code) return;
    setSaving(true);
    await fetch("/api/admin/sliding-fee/service-overrides", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form, override_value: Number(form.override_value), applies_to_fpl_max: form.applies_to_fpl_max ? Number(form.applies_to_fpl_max) : null }),
    });
    setSaving(false); setSaved(true);
    setForm({ cpt_code: "", cpt_description: "", override_type: "flat", override_value: "", applies_to_fpl_max: "", notes: "" });
    setTimeout(() => setSaved(false), 3000);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/sliding-fee/service-overrides?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  const activeOverrides = overrides.filter(o => o.is_active);

  const overrideTypeLabel = (t: string) => ({ flat: "Flat copay", percent: "% discount", waive: "Waived", full_fee: "Full fee" }[t] || t);

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-800">
        <strong>Per-service overrides</strong> apply a specific copay, discount, or waiver to a CPT code regardless of the client's SFS tier. Useful for no-cost services (e.g., initial screenings), grant-funded services, or services with mandated copay amounts. Optionally restrict to clients at or below a specific FPL%.
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Add Service Override</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-6 gap-4 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">CPT Code</label>
              <input value={form.cpt_code} onChange={e => setForm(p => ({ ...p, cpt_code: e.target.value }))} className={inputClass} placeholder="90837" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 block mb-1">Description (optional)</label>
              <input value={form.cpt_description} onChange={e => setForm(p => ({ ...p, cpt_description: e.target.value }))} className={inputClass} placeholder="60-min psychotherapy" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Override Type</label>
              <select value={form.override_type} onChange={e => setForm(p => ({ ...p, override_type: e.target.value as typeof form.override_type }))} className={inputClass}>
                <option value="flat">Flat $ copay</option>
                <option value="percent">% discount</option>
                <option value="waive">Waive (free)</option>
                <option value="full_fee">Full fee (no SFS)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">{form.override_type === "flat" ? "Copay ($)" : form.override_type === "percent" ? "Discount (%)" : "—"}</label>
              <input type="number" value={form.override_value} onChange={e => setForm(p => ({ ...p, override_value: e.target.value }))} className={inputClass} disabled={["waive", "full_fee"].includes(form.override_type)} min="0" max={form.override_type === "percent" ? "100" : undefined} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Max FPL% (optional)</label>
              <input type="number" value={form.applies_to_fpl_max} onChange={e => setForm(p => ({ ...p, applies_to_fpl_max: e.target.value }))} className={inputClass} placeholder="All FPL%" min="0" />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-500 block mb-1">Notes (optional)</label>
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="Reason for this override" />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            {saved && <span className="text-teal-600 text-sm self-center">✓ Added</span>}
            <button onClick={addOverride} disabled={saving || !form.cpt_code} className={btnPrimary}>{saving ? "Adding..." : "Add Override"}</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Active Service Overrides ({activeOverrides.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : activeOverrides.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No service overrides configured.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">CPT Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Override</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Applies To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeOverrides.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="font-mono font-semibold text-slate-900">{o.cpt_code}</div>
                    {o.cpt_description && <div className="text-xs text-slate-400">{o.cpt_description}</div>}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${o.override_type === "waive" ? "bg-green-100 text-green-700" : o.override_type === "full_fee" ? "bg-slate-100 text-slate-600" : "bg-teal-100 text-teal-700"}`}>
                      {overrideTypeLabel(o.override_type)}
                      {o.override_type === "flat" && ` $${o.override_value}`}
                      {o.override_type === "percent" && ` ${o.override_value}%`}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-xs">{o.applies_to_fpl_max != null ? `≤${o.applies_to_fpl_max}% FPL` : "All clients"}</td>
                  <td className="px-4 py-4 text-slate-400 text-xs">{o.notes || "—"}</td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => o.id && remove(o.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Grant Schedules Tab ──────────────────────────────────────────────────────
function GrantSchedulesTab() {
  const [schedules, setSchedules] = useState<SFSGrantSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SFSGrantSchedule | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/sliding-fee/grant-schedules", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setSchedules(d.schedules || []); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const blankGrant: SFSGrantSchedule = {
    grant_name: "", grant_number: "", funder: "",
    tiers: DEFAULT_SFS_TIERS.map(t => ({ ...t })),
    fpl_ceiling: null, effective_date: new Date().toISOString().split("T")[0],
    expiration_date: null, applies_to_program_areas: [], is_active: true, notes: "",
  };

  async function save() {
    if (!editing) return;
    setSaving(true);
    await fetch("/api/admin/sliding-fee/grant-schedules", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(editing),
    });
    setSaving(false); setEditing(null); load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/sliding-fee/grant-schedules?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  function toggleProgramArea(area: string) {
    if (!editing) return;
    const current = editing.applies_to_program_areas;
    setEditing(p => p ? { ...p, applies_to_program_areas: current.includes(area) ? current.filter(a => a !== area) : [...current, area] } : null);
  }

  function updateGrantTier(i: number, field: keyof SFSTier, value: string | number) {
    if (!editing) return;
    setEditing(p => p ? { ...p, tiers: p.tiers.map((t, idx) => idx === i ? { ...t, [field]: value } : t) } : null);
  }

  const today = new Date().toISOString().split("T")[0];
  const activeSchedules = schedules.filter(s => s.is_active);

  return (
    <div className="space-y-5">
      <div className="bg-purple-50 border border-purple-100 rounded-2xl px-5 py-4 text-sm text-purple-800">
        <strong>Grant-specific schedules</strong> override the standard SFS for clients served under a specific grant. For example, an HRSA grant may require a specific sliding fee schedule with a FPL ceiling of 200%. Grant schedules take priority over program overrides and the base schedule.
      </div>

      <div className="flex justify-end">
        <button onClick={() => setEditing(blankGrant)} className={btnPrimary}>+ Add Grant Schedule</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Grant Schedules ({activeSchedules.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : activeSchedules.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No grant schedules configured.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Grant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Funder</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">FPL Ceiling</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeSchedules.map(s => {
                const isActive = s.effective_date <= today && (!s.expiration_date || s.expiration_date >= today);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{s.grant_name}</div>
                      {s.grant_number && <div className="text-xs text-slate-400">#{s.grant_number}</div>}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{s.funder || "—"}</td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {s.effective_date}{s.expiration_date ? ` → ${s.expiration_date}` : " → ongoing"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{s.fpl_ceiling != null ? `≤${s.fpl_ceiling}%` : "None"}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(s)} className="text-xs text-teal-600 hover:text-teal-700 font-semibold">Edit</button>
                        <button onClick={() => s.id && remove(s.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor */}
      {editing && (
        <div className="bg-white rounded-2xl border border-purple-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
            <h2 className="font-semibold text-purple-900">{editing.id ? "Edit Grant Schedule" : "New Grant Schedule"}</h2>
            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Grant Name *</label>
                <input value={editing.grant_name} onChange={e => setEditing(p => p ? { ...p, grant_name: e.target.value } : null)} className={inputClass} placeholder="HRSA FQHC Grant" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Grant Number</label>
                <input value={editing.grant_number || ""} onChange={e => setEditing(p => p ? { ...p, grant_number: e.target.value } : null)} className={inputClass} placeholder="H80CS00000" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Funder</label>
                <input value={editing.funder || ""} onChange={e => setEditing(p => p ? { ...p, funder: e.target.value } : null)} className={inputClass} placeholder="HRSA / SAMHSA / State DMHSAS" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Effective Date *</label>
                <input type="date" value={editing.effective_date} onChange={e => setEditing(p => p ? { ...p, effective_date: e.target.value } : null)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Expiration Date (optional)</label>
                <input type="date" value={editing.expiration_date || ""} onChange={e => setEditing(p => p ? { ...p, expiration_date: e.target.value || null } : null)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">FPL Ceiling (optional)</label>
                <input type="number" value={editing.fpl_ceiling ?? ""} onChange={e => setEditing(p => p ? { ...p, fpl_ceiling: e.target.value ? Number(e.target.value) : null } : null)} className={inputClass} placeholder="e.g. 200 (for ≤200% FPL only)" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">Applies To Program Areas (leave unchecked = all programs)</label>
              <div className="flex flex-wrap gap-2">
                {PROGRAM_AREA_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => toggleProgramArea(o.value)} className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${editing.applies_to_program_areas.includes(o.value) ? "bg-purple-100 border-purple-300 text-purple-800" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">Grant Tier Configuration</label>
              <div className="space-y-2">
                {editing.tiers.map((tier, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="col-span-1"><div className="text-xs text-slate-400 mb-1">Tier</div><input value={tier.tier} onChange={e => updateGrantTier(i, "tier", e.target.value)} className={inputClass} /></div>
                    <div className="col-span-2"><div className="text-xs text-slate-400 mb-1">Label</div><input value={tier.label} onChange={e => updateGrantTier(i, "label", e.target.value)} className={inputClass} /></div>
                    <div className="col-span-2"><div className="text-xs text-slate-400 mb-1">FPL Min%</div><input type="number" value={tier.fpl_min} onChange={e => updateGrantTier(i, "fpl_min", Number(e.target.value))} className={inputClass} /></div>
                    <div className="col-span-2"><div className="text-xs text-slate-400 mb-1">FPL Max%</div><input type="number" value={tier.fpl_max === 9999 ? "" : tier.fpl_max} onChange={e => updateGrantTier(i, "fpl_max", e.target.value === "" ? 9999 : Number(e.target.value))} className={inputClass} placeholder="∞" /></div>
                    <div className="col-span-2"><div className="text-xs text-slate-400 mb-1">Type</div><select value={tier.discount_type} onChange={e => updateGrantTier(i, "discount_type", e.target.value as "flat" | "percent" | "none")} className={inputClass}><option value="flat">Flat $</option><option value="percent">% off</option><option value="none">Full fee</option></select></div>
                    <div className="col-span-2"><div className="text-xs text-slate-400 mb-1">Value</div><input type="number" value={tier.discount_type === "none" ? "" : tier.discount_value} onChange={e => updateGrantTier(i, "discount_value", Number(e.target.value))} className={inputClass} disabled={tier.discount_type === "none"} min="0" /></div>
                    <div className="col-span-1 text-right"><button onClick={() => setEditing(p => p ? { ...p, tiers: p.tiers.filter((_, idx) => idx !== i) } : null)} className="text-red-400 hover:text-red-600">✕</button></div>
                  </div>
                ))}
                <button onClick={() => setEditing(p => p ? { ...p, tiers: [...p.tiers, { tier: String.fromCharCode(65 + p.tiers.length), label: `Tier ${String.fromCharCode(65 + p.tiers.length)}`, fpl_min: 0, fpl_max: 9999, discount_type: "none", discount_value: 0, description: "" }] } : null)} className="w-full border-2 border-dashed border-slate-200 text-slate-400 py-2 rounded-xl text-sm hover:border-purple-300 hover:text-purple-500">+ Add tier</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Notes</label>
              <input value={editing.notes || ""} onChange={e => setEditing(p => p ? { ...p, notes: e.target.value } : null)} className={inputClass} placeholder="Grant requirements, compliance notes, etc." />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className={btnSecondary}>Cancel</button>
              <button onClick={save} disabled={saving || !editing.grant_name} className={btnPrimary}>{saving ? "Saving..." : "Save Grant Schedule"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Payer Exclusions Tab ─────────────────────────────────────────────────────
function PayerExclusionsTab() {
  const [exclusions, setExclusions] = useState<SFSPayerExclusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ payer_name: "", payer_id: "", reason: "commercial_insurance", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/sliding-fee/payer-exclusions", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setExclusions(d.exclusions || []); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.payer_name) return;
    setSaving(true);
    await fetch("/api/admin/sliding-fee/payer-exclusions", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true);
    setForm({ payer_name: "", payer_id: "", reason: "commercial_insurance", notes: "" });
    setTimeout(() => setSaved(false), 3000);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/sliding-fee/payer-exclusions?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  const activeExclusions = exclusions.filter(e => e.is_active);

  return (
    <div className="space-y-5">
      <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-800">
        <strong>Payer exclusions</strong> prevent SFS from being applied when a client has a specific insurance payer on file. This ensures that insured clients pay their normal cost-sharing (copay/coinsurance) rather than the sliding fee. SFS is a self-pay program — it should not reduce charges billed to insurance.
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Add Payer Exclusion</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-4 gap-4 items-end">
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-500 block mb-1">Payer Name *</label>
              <PayerSelect
                value={form.payer_name}
                onChange={v => setForm(p => ({ ...p, payer_name: v }))}
                placeholder="Select payer…"
                inputClass={inputClass}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Payer ID (optional)</label>
              <input value={form.payer_id} onChange={e => setForm(p => ({ ...p, payer_id: e.target.value }))} className={inputClass} placeholder="BCBSO" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Reason</label>
              <select value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} className={inputClass}>
                {PAYER_EXCLUSION_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <button onClick={add} disabled={saving || !form.payer_name} className={btnPrimary + " w-full"}>{saving ? "Adding..." : "Add Exclusion"}</button>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold text-slate-500 block mb-1">Notes (optional)</label>
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="e.g. per OHP contract, SFS not applicable" />
          </div>
          {saved && <div className="mt-2 text-teal-600 text-sm">✓ Exclusion added</div>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Excluded Payers ({activeExclusions.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : activeExclusions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No payer exclusions configured. SFS applies to all self-pay clients.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Payer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Payer ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeExclusions.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">{e.payer_name}</td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-500">{e.payer_id || "—"}</td>
                  <td className="px-4 py-4"><span className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded-full">{PAYER_EXCLUSION_REASONS.find(r => r.value === e.reason)?.label || e.reason || "—"}</span></td>
                  <td className="px-4 py-4 text-xs text-slate-400">{e.notes || "—"}</td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => e.id && remove(e.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Retroactive Adjust Tab ───────────────────────────────────────────────────
interface RetroResult {
  charge_id: string;
  cpt_code: string;
  charge_amount: number;
  old_patient_owes: number;
  new_patient_owes: number;
  new_adjustment: number;
  delta: number;
}

function RetroactiveAdjustTab() {
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [newFpl, setNewFpl] = useState("");
  const [oldFpl, setOldFpl] = useState("");
  const [preview, setPreview] = useState<RetroResult[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ id: string; first_name: string; last_name: string; mrn: string }[]>([]);
  const [history, setHistory] = useState<{id: string; client_id: string; new_fpl_percent: number; old_fpl_percent: number; charges_affected: number; total_adjustment_delta: number; created_at: string}[]>([]);

  useEffect(() => {
    fetch("/api/admin/sliding-fee/retroactive-adjust", { credentials: "include" })
      .then(r => r.json())
      .then(d => setHistory(d.history || []));
  }, [applied]);

  async function searchClients() {
    if (!clientSearch.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/clients?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" });
    const d = await res.json();
    setSearchResults(d.clients || []);
    setSearching(false);
  }

  async function runPreview() {
    if (!clientId || !newFpl) return;
    setPreview(null);
    const res = await fetch("/api/admin/sliding-fee/retroactive-adjust", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ client_id: clientId, new_fpl_percent: Number(newFpl), old_fpl_percent: oldFpl ? Number(oldFpl) : null, apply: false }),
    });
    const d = await res.json();
    setPreview(d.adjustments || []);
  }

  async function applyAdjustments() {
    if (!clientId || !newFpl || !preview) return;
    setApplying(true);
    await fetch("/api/admin/sliding-fee/retroactive-adjust", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ client_id: clientId, new_fpl_percent: Number(newFpl), old_fpl_percent: oldFpl ? Number(oldFpl) : null, apply: true }),
    });
    setApplying(false); setApplied(true); setPreview(null);
    setTimeout(() => setApplied(false), 5000);
  }

  const totalDelta = preview?.reduce((s, r) => s + r.delta, 0) ?? 0;
  const changedCharges = preview?.filter(r => r.delta !== 0) ?? [];

  return (
    <div className="space-y-5">
      <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4 text-sm text-orange-800">
        <strong>Retroactive adjustment</strong> re-calculates pending/draft charges for a client based on a new FPL assessment. Use this when a client's income changes mid-year and you want to correct existing unpaid charges. A full audit log is maintained.
      </div>

      {/* Client Lookup */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Select Client</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchClients()} className={inputClass} placeholder="Search by name or MRN…" />
            <button onClick={searchClients} disabled={searching} className={btnSecondary}>{searching ? "…" : "Search"}</button>
          </div>
          {searchResults.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {searchResults.map(c => (
                <button key={c.id} onClick={() => { setClientId(c.id); setClientName(`${c.first_name} ${c.last_name} (${c.mrn})`); setSearchResults([]); setPreview(null); }}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-teal-50 border-b border-slate-100 last:border-0 transition-colors ${clientId === c.id ? "bg-teal-50 font-semibold" : ""}`}>
                  <span className="font-medium text-slate-900">{c.last_name}, {c.first_name}</span>
                  <span className="text-slate-400 ml-2 text-xs">MRN: {c.mrn}</span>
                </button>
              ))}
            </div>
          )}
          {clientId && <div className="text-sm font-semibold text-teal-700 bg-teal-50 px-4 py-2 rounded-xl">✓ Selected: {clientName}</div>}
        </div>
      </div>

      {/* FPL Input */}
      {clientId && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">New FPL Assessment</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Old FPL % (optional, for log)</label>
                <input type="number" value={oldFpl} onChange={e => setOldFpl(e.target.value)} className={inputClass} placeholder="e.g. 185" min="0" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">New FPL % *</label>
                <input type="number" value={newFpl} onChange={e => setNewFpl(e.target.value)} className={inputClass} placeholder="e.g. 120" min="0" />
              </div>
              <div>
                <button onClick={runPreview} disabled={!newFpl} className={btnSecondary + " w-full"}>Preview Adjustments</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Results */}
      {preview && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Adjustment Preview</h2>
              <p className="text-xs text-slate-400 mt-0.5">{preview.length} pending charge(s) · {changedCharges.length} would change · Net delta: <span className={totalDelta < 0 ? "text-green-600 font-semibold" : totalDelta > 0 ? "text-red-600 font-semibold" : "text-slate-600"}>${totalDelta.toFixed(2)}</span></p>
            </div>
            <button onClick={applyAdjustments} disabled={applying || changedCharges.length === 0} className={btnPrimary}>
              {applying ? "Applying…" : `Apply ${changedCharges.length} Adjustment${changedCharges.length !== 1 ? "s" : ""}`}
            </button>
          </div>
          {preview.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No pending charges found for this client.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">CPT</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Charge</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Old Owes</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">New Owes</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {preview.map(r => (
                  <tr key={r.charge_id} className={`hover:bg-slate-50 ${r.delta !== 0 ? "" : "opacity-50"}`}>
                    <td className="px-5 py-3 font-mono font-semibold text-slate-900">{r.cpt_code}</td>
                    <td className="px-4 py-3 text-right text-slate-600">${r.charge_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">${r.old_patient_owes.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">${r.new_patient_owes.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.delta < 0 ? "text-green-600" : r.delta > 0 ? "text-red-600" : "text-slate-400"}`}>
                      {r.delta === 0 ? "—" : `${r.delta > 0 ? "+" : ""}$${r.delta.toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {applied && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-sm text-green-800 font-semibold">
          ✓ Retroactive adjustments applied and logged successfully.
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Adjustment History (recent 20)</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">FPL Change</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Charges</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Net Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.slice(0, 20).map(h => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">{new Date(h.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</td>
                  <td className="px-4 py-3 text-slate-600">{h.old_fpl_percent != null ? `${h.old_fpl_percent}%` : "?"} → <span className="font-semibold">{h.new_fpl_percent}%</span></td>
                  <td className="px-4 py-3 text-right text-slate-600">{h.charges_affected}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${Number(h.total_adjustment_delta) < 0 ? "text-green-600" : Number(h.total_adjustment_delta) > 0 ? "text-red-600" : "text-slate-400"}`}>
                    {Number(h.total_adjustment_delta) === 0 ? "—" : `${Number(h.total_adjustment_delta) > 0 ? "+" : ""}$${Number(h.total_adjustment_delta).toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SlidingFeeSchedulePage() {
  const [activeTab, setActiveTab] = useState<Tab>("base");

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/settings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sliding Fee Schedule</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure discounts by Federal Poverty Level — {FPL_YEAR} HHS guidelines · Program overrides · Grant schedules · Payer exclusions
          </p>
        </div>
      </div>

      {/* Priority order legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700 mr-2">Resolution priority:</span>
        <span className="inline-flex items-center gap-1">
          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">Payer Exclusion</span>
          <span>→</span>
          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">Grant Schedule</span>
          <span>→</span>
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold">Service Override</span>
          <span>→</span>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">Program Override</span>
          <span>→</span>
          <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-semibold">Base Schedule</span>
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${activeTab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "base"     && <BaseScheduleTab />}
      {activeTab === "programs" && <ProgramOverridesTab />}
      {activeTab === "services" && <ServiceOverridesTab />}
      {activeTab === "grants"   && <GrantSchedulesTab />}
      {activeTab === "payers"   && <PayerExclusionsTab />}
      {activeTab === "retro"    && <RetroactiveAdjustTab />}
    </div>
  );
}
