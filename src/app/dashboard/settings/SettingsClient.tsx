"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Org { id: string; name: string | null; npi: string | null; phone: string | null; address_line1: string | null; city: string | null; state: string | null; zip: string | null; client_terminology: string | null; org_type: string | null; }

const TERMS = ["client", "patient", "individual", "recipient", "resident", "consumer", "member"];
const ORG_TYPES = ["behavioral_health", "developmental_disabilities", "substance_use", "residential", "cmhc", "outpatient"];

export default function SettingsClient({ org }: { org: Org | null }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    name: org?.name || "",
    npi: org?.npi || "",
    phone: org?.phone || "",
    address_line1: org?.address_line1 || "",
    city: org?.city || "",
    state: org?.state || "",
    zip: org?.zip || "",
    client_terminology: org?.client_terminology || "client",
    org_type: org?.org_type || "behavioral_health",
  });

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true); setEditing(false); router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  const fields = [
    { label: "Organization Name", value: form.name },
    { label: "NPI", value: form.npi },
    { label: "Phone", value: form.phone },
    { label: "Address", value: [form.address_line1, form.city && `${form.city}, ${form.state} ${form.zip}`].filter(Boolean).join(", ") },
    { label: "Client Terminology", value: form.client_terminology?.charAt(0).toUpperCase() + (form.client_terminology?.slice(1) || "") },
    { label: "Organization Type", value: form.org_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Organization configuration</p>
      </div>

      {saved && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-sm text-emerald-700 font-medium">✅ Settings saved</div>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">🏢 Organization</h2>
          <button onClick={() => setEditing(!editing)}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-50">
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing ? (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Organization Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>NPI</label><input value={form.npi} onChange={e => setForm(f => ({ ...f, npi: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Organization Type</label>
                <select value={form.org_type} onChange={e => setForm(f => ({ ...f, org_type: e.target.value }))} className={inputClass}>
                  {ORG_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className={labelClass}>Address</label><input value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelClass}>State</label><input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>ZIP</label><input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} className={inputClass} /></div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Client Terminology — how do you refer to the people you serve?</label>
              <div className="flex flex-wrap gap-2">
                {TERMS.map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, client_terminology: t }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors ${form.client_terminology === t ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={save} disabled={saving}
              className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {fields.map(f => (
              <div key={f.label} className="flex items-center justify-between px-6 py-3.5">
                <span className="text-sm text-slate-500">{f.label}</span>
                <span className="text-sm font-medium text-slate-900">{f.value || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
