"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }

const ENC_TYPES = ["Individual Therapy", "Group Therapy", "Psychiatric Evaluation", "Psychiatric Follow-up", "Intake Assessment", "Crisis Intervention", "Case Management", "Telehealth"];

function NewEncounterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  const [form, setForm] = useState({
    client_id: params.get("client_id") || "", client_name: "",
    encounter_date: new Date().toISOString().split("T")[0],
    encounter_type: "Individual Therapy", chief_complaint: "",
  });

  useEffect(() => {
    const cid = params.get("client_id");
    if (cid && !form.client_name) {
      fetch(`/api/clients/${cid}`, { credentials: "include" })
        .then(r => r.json()).then(d => {
          if (d.client) setForm(f => ({ ...f, client_id: d.client.id, client_name: `${d.client.last_name}, ${d.client.first_name}` }));
        });
    }
  }, []);

  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" })
        .then(r => r.json()).then(d => setClients(d.clients || []));
    } else setClients([]);
  }, [clientSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { setError("Select a client"); return; }
    setSaving(true);
    const res = await fetch("/api/encounters", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/encounters/${data.encounter.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/encounters" className="text-slate-400 hover:text-slate-700">←</Link>
        <h1 className="text-2xl font-bold text-slate-900">New Encounter</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="relative">
          <label className={labelClass}>Client *</label>
          {form.client_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.client_name}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", client_name: "" }))} className="text-teal-500 text-sm">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} className={inputClass} placeholder="Search client..." />
              {clients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {clients.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setForm(f => ({ ...f, client_id: c.id, client_name: `${c.last_name}, ${c.first_name}` })); setClientSearch(""); setClients([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div className="font-semibold text-sm text-slate-900">{c.last_name}, {c.first_name}</div>
                      <div className="text-xs text-slate-400">MRN: {c.mrn || "—"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Encounter Type</label>
            <select value={form.encounter_type} onChange={e => setForm(f => ({ ...f, encounter_type: e.target.value }))} className={inputClass}>
              {ENC_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Date</label>
            <input type="date" value={form.encounter_date} onChange={e => setForm(f => ({ ...f, encounter_date: e.target.value }))} className={inputClass} />
          </div>
        </div>

        <div><label className={labelClass}>Chief Complaint</label>
          <input value={form.chief_complaint} onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))} className={inputClass} placeholder="Reason for visit..." />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/encounters" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Starting..." : "Start Encounter →"}
        </button>
      </div>
    </form>
  );
}

export default function NewEncounterPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewEncounterForm /></Suspense>;
}
