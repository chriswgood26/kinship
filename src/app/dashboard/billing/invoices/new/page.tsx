"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; insurance_provider?: string | null; }
interface Charge { id: string; service_date: string; cpt_code: string; cpt_description: string | null; charge_amount: number; icd10_codes: string[] | null; status: string; }

function NewInvoiceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientCharges, setPatientCharges] = useState<Charge[]>([]);
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    client_id: params.get("patient_id") || "",
    patient_name: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    notes: "",
  });

  const [lineItems, setLineItems] = useState<{description: string; cpt_code: string; service_date: string; amount_billed: number; insurance_paid: number; adjustment: number; patient_responsibility: number; charge_id?: string}[]>([]);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`)
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  async function loadPatientCharges(patientId: string) {
    const res = await fetch(`/api/billing/charges?patient_id=${patientId}&status=paid,submitted`, { credentials: "include" });
    const data = await res.json();
    setPatientCharges(data.charges || []);
  }

  function selectPatient(p: Patient) {
    setForm(f => ({ ...f, client_id: p.id, patient_name: `${p.last_name}, ${p.first_name}` }));
    setPatientSearch(""); setPatients([]);
    loadPatientCharges(p.id);
  }

  function toggleCharge(charge: Charge) {
    const s = new Set(selectedCharges);
    if (s.has(charge.id)) {
      s.delete(charge.id);
      setLineItems(li => li.filter(l => l.charge_id !== charge.id));
    } else {
      s.add(charge.id);
      setLineItems(li => [...li, {
        charge_id: charge.id,
        description: charge.cpt_description || charge.cpt_code,
        cpt_code: charge.cpt_code,
        service_date: charge.service_date,
        amount_billed: Number(charge.charge_amount),
        insurance_paid: 0,
        adjustment: 0,
        patient_responsibility: Number(charge.charge_amount),
      }]);
    }
    setSelectedCharges(s);
  }

  function updateLine(idx: number, field: string, value: number) {
    setLineItems(li => li.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      updated.patient_responsibility = updated.amount_billed - updated.insurance_paid - updated.adjustment;
      return updated;
    }));
  }

  function addManualLine() {
    setLineItems(li => [...li, { description: "", cpt_code: "", service_date: form.invoice_date, amount_billed: 0, insurance_paid: 0, adjustment: 0, patient_responsibility: 0 }]);
  }

  const subtotal = lineItems.reduce((s, l) => s + l.amount_billed, 0);
  const insurancePaid = lineItems.reduce((s, l) => s + l.insurance_paid, 0);
  const adjustments = lineItems.reduce((s, l) => s + l.adjustment, 0);
  const balanceDue = lineItems.reduce((s, l) => s + l.patient_responsibility, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { setError("Select a patient"); return; }
    if (lineItems.length === 0) { setError("Add at least one line item"); return; }
    setSaving(true);
    const res = await fetch("/api/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...form, line_items: lineItems, subtotal, insurance_paid: insurancePaid, adjustments, balance_due: balanceDue, patient_responsibility: balanceDue }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/billing/invoices/${data.invoice.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/billing/invoices" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Patient Invoice</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create a patient responsibility statement</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Invoice Details</h2>

        {/* Patient */}
        <div className="relative">
          <label className={labelClass}>Patient *</label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button type="button" onClick={() => { setForm(f => ({ ...f, client_id: "", patient_name: "" })); setPatientCharges([]); setLineItems([]); setSelectedCharges(new Set()); }} className="text-teal-500 text-sm">✕ Change</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search patient..." />
              {patients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {patients.map(p => (
                    <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div className="font-semibold text-sm text-slate-900">{p.last_name}, {p.first_name}</div>
                      <div className="text-xs text-slate-400">MRN: {p.mrn || "—"} · {p.insurance_provider || "No insurance"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Invoice Date</label><input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} className={inputClass} /></div>
          <div><label className={labelClass}>Due Date</label><input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inputClass} /></div>
        </div>
      </div>

      {/* Import from charges */}
      {patientCharges.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Import from Paid Charges</h3>
          <div className="space-y-2">
            {patientCharges.map(charge => (
              <div key={charge.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedCharges.has(charge.id) ? "bg-teal-50 border-teal-200" : "border-slate-200 hover:border-slate-300"}`}
                onClick={() => toggleCharge(charge)}>
                <input type="checkbox" checked={selectedCharges.has(charge.id)} onChange={() => {}} className="w-4 h-4 accent-teal-500" />
                <div className="flex-1">
                  <span className="font-mono font-bold text-sm text-slate-900">{charge.cpt_code}</span>
                  <span className="text-slate-500 text-sm ml-2">{charge.cpt_description}</span>
                  <span className="text-slate-400 text-xs ml-2">{new Date(charge.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
                <span className="font-semibold text-slate-900">${Number(charge.charge_amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Line items */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Line Items</h3>
          <button type="button" onClick={addManualLine} className="text-teal-600 text-xs font-semibold border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50">+ Add Manual Line</button>
        </div>
        {lineItems.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">Select charges above or add manual line items</div>
        ) : (
          <div className="p-5 space-y-3">
            {lineItems.map((line, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2"><label className={labelClass}>Description</label><input value={line.description} onChange={e => { const li = [...lineItems]; li[i] = { ...li[i], description: e.target.value }; setLineItems(li); }} className={inputClass} /></div>
                  <div><label className={labelClass}>CPT</label><input value={line.cpt_code} onChange={e => { const li = [...lineItems]; li[i] = { ...li[i], cpt_code: e.target.value }; setLineItems(li); }} className={inputClass} /></div>
                  <div><label className={labelClass}>Service Date</label><input type="date" value={line.service_date} onChange={e => { const li = [...lineItems]; li[i] = { ...li[i], service_date: e.target.value }; setLineItems(li); }} className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div><label className={labelClass}>Billed</label><input type="number" step="0.01" value={line.amount_billed} onChange={e => updateLine(i, "amount_billed", parseFloat(e.target.value) || 0)} className={inputClass} /></div>
                  <div><label className={labelClass}>Ins. Paid</label><input type="number" step="0.01" value={line.insurance_paid} onChange={e => updateLine(i, "insurance_paid", parseFloat(e.target.value) || 0)} className={inputClass} /></div>
                  <div><label className={labelClass}>Adjustment</label><input type="number" step="0.01" value={line.adjustment} onChange={e => updateLine(i, "adjustment", parseFloat(e.target.value) || 0)} className={inputClass} /></div>
                  <div><label className={labelClass}>Patient Owes</label><input type="number" step="0.01" value={line.patient_responsibility.toFixed(2)} readOnly className={inputClass + " bg-white font-semibold"} /></div>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="border-t border-slate-200 pt-3 space-y-1.5">
              {[
                { label: "Total Billed", value: subtotal, class: "text-slate-700" },
                { label: "Insurance Paid", value: -insurancePaid, class: "text-emerald-700" },
                { label: "Adjustments", value: -adjustments, class: "text-slate-500" },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className={r.class}>${Math.abs(r.value).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Balance Due</span>
                <span className={balanceDue > 0 ? "text-red-600" : "text-emerald-600"}>${balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/billing/invoices" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Creating..." : "Create Invoice"}
        </button>
      </div>
    </form>
  );
}

export default function NewInvoicePage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewInvoiceForm /></Suspense>;
}
