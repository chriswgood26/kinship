"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }
interface Encounter { id: string; encounter_date: string; encounter_type: string | null; client_id: string; }

const CPT_CODES = [
  { code: "90837", desc: "Individual therapy, 60 min", amount: 175 },
  { code: "90834", desc: "Individual therapy, 45 min", amount: 140 },
  { code: "90832", desc: "Individual therapy, 30 min", amount: 105 },
  { code: "90853", desc: "Group psychotherapy", amount: 65 },
  { code: "90791", desc: "Psychiatric diagnostic eval", amount: 225 },
  { code: "90792", desc: "Psych eval w/ med services", amount: 250 },
  { code: "99213", desc: "Office visit, moderate", amount: 120 },
  { code: "99214", desc: "Office visit, high", amount: 160 },
  { code: "H0031", desc: "Mental health assessment", amount: 95 },
  { code: "H2017", desc: "Psychosocial rehab", amount: 75 },
];

function NewChargeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showCPT, setShowCPT] = useState(false);
  const [cptSearch, setCptSearch] = useState("");
  const [encounter, setEncounter] = useState<Encounter | null>(null);

  const [form, setForm] = useState({
    client_id: "", client_name: "",
    encounter_id: "",
    service_date: new Date().toISOString().split("T")[0],
    cpt_code: "", cpt_description: "", charge_amount: "",
    icd10_codes: "", units: 1, notes: "",
  });

  useEffect(() => {
    const cid = params.get("client_id");
    const eid = params.get("encounter_id");

    if (eid) {
      // Load encounter and pre-fill client + date
      fetch(`/api/encounters/${eid}`, { credentials: "include" }).then(r => r.json()).then(d => {
        if (d.encounter) {
          const enc = d.encounter;
          setEncounter(enc);
          const client = Array.isArray(enc.client) ? enc.client[0] : enc.client;
          setForm(f => ({
            ...f,
            encounter_id: enc.id,
            service_date: enc.encounter_date,
            client_id: enc.client_id,
            client_name: client ? `${client.last_name}, ${client.first_name}` : "",
          }));
        }
      });
    } else if (cid) {
      fetch(`/api/clients/${cid}`, { credentials: "include" }).then(r => r.json()).then(d => {
        if (d.client) setForm(f => ({ ...f, client_id: d.client.id, client_name: `${d.client.last_name}, ${d.client.first_name}` }));
      });
    }
  }, []);

  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" }).then(r => r.json()).then(d => setClients(d.clients || []));
    } else setClients([]);
  }, [clientSearch]);

  const filteredCPT = CPT_CODES.filter(c => !cptSearch || c.code.includes(cptSearch) || c.desc.toLowerCase().includes(cptSearch.toLowerCase()));
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.cpt_code) { setError("Client and CPT code required"); return; }
    setSaving(true);
    const res = await fetch("/api/billing", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        ...form,
        encounter_id: form.encounter_id || null,
        icd10_codes: form.icd10_codes.split(",").map(s => s.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    // Return to encounter if we came from one, otherwise billing list
    if (form.encounter_id) {
      router.push(`/dashboard/encounters/${form.encounter_id}`);
    } else {
      router.push("/dashboard/billing");
    }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={encounter ? `/dashboard/encounters/${encounter.id}` : "/dashboard/billing"} className="text-slate-400 hover:text-slate-700">←</Link>
        <h1 className="text-2xl font-bold text-slate-900">Add Charge</h1>
      </div>

      {/* Encounter context banner */}
      {encounter && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Linked Encounter</div>
            <div className="text-sm text-teal-900 font-medium mt-0.5">
              {encounter.encounter_type || "Encounter"} · {encounter.encounter_date}
            </div>
          </div>
          <Link href={`/dashboard/encounters/${encounter.id}`} className="text-xs text-teal-600 hover:text-teal-800 font-medium">
            View Encounter →
          </Link>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {/* Client */}
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
                    <button key={c.id} type="button" onClick={() => { setForm(f => ({ ...f, client_id: c.id, client_name: `${c.last_name}, ${c.first_name}` })); setClientSearch(""); setClients([]); }}
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

        {/* CPT */}
        <div className="relative">
          <label className={labelClass}>CPT Code *</label>
          {form.cpt_code ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800 font-mono">{form.cpt_code} — {form.cpt_description}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, cpt_code: "", cpt_description: "", charge_amount: "" }))} className="text-teal-500 text-sm">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={cptSearch} onChange={e => { setCptSearch(e.target.value); setShowCPT(true); }} onFocus={() => setShowCPT(true)}
                className={inputClass} placeholder="Search CPT codes..." />
              {showCPT && filteredCPT.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 max-h-56 overflow-y-auto">
                  {filteredCPT.map(cpt => (
                    <button key={cpt.code} type="button"
                      onClick={() => { setForm(f => ({ ...f, cpt_code: cpt.code, cpt_description: cpt.desc, charge_amount: String(cpt.amount) })); setCptSearch(""); setShowCPT(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between">
                      <div><span className="font-mono font-bold text-sm">{cpt.code}</span><span className="text-slate-500 text-sm ml-2">{cpt.desc}</span></div>
                      <span className="text-teal-600 font-semibold text-sm">${cpt.amount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className={labelClass}>Service Date</label><input type="date" value={form.service_date} onChange={e => set("service_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Charge Amount ($)</label><input type="number" value={form.charge_amount} onChange={e => set("charge_amount", e.target.value)} step="0.01" className={inputClass} /></div>
          <div><label className={labelClass}>Units</label><input type="number" value={form.units} onChange={e => set("units", parseInt(e.target.value))} min={1} className={inputClass} /></div>
        </div>

        <div><label className={labelClass}>ICD-10 Codes</label>
          <input value={form.icd10_codes} onChange={e => set("icd10_codes", e.target.value)} className={inputClass + " font-mono"} placeholder="F32.1, F41.1 (comma separated)" />
        </div>

        <div><label className={labelClass}>Notes</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputClass + " resize-none"} />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/billing" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Add Charge"}
        </button>
      </div>
    </form>
  );
}

export default function NewChargePage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewChargeForm /></Suspense>;
}
