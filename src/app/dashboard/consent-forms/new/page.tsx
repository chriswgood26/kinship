"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }

const FORM_TYPES = [
  { value: "general_consent", label: "General Consent to Treatment", icon: "📋", desc: "Broad consent for assessment and treatment services" },
  { value: "hipaa_notice", label: "HIPAA Notice of Privacy Practices", icon: "🔒", desc: "Acknowledgment of receipt of privacy notice" },
  { value: "treatment_consent", label: "Specific Treatment Consent", icon: "⚕️", desc: "Consent for a specific treatment modality or procedure" },
  { value: "medication_consent", label: "Medication Consent", icon: "💊", desc: "Consent to administer or prescribe specific medications" },
  { value: "telehealth_consent", label: "Telehealth Consent", icon: "🎥", desc: "Informed consent for telehealth / video-based services" },
  { value: "photography_consent", label: "Photography / Media Consent", icon: "📷", desc: "Consent for photos, videos, or media use" },
  { value: "research_consent", label: "Research / Data Use Consent", icon: "🔬", desc: "Consent to use de-identified data for research or quality improvement" },
  { value: "financial_agreement", label: "Financial Agreement", icon: "💰", desc: "Sliding fee, payment plan, or financial responsibility agreement" },
  { value: "other", label: "Other", icon: "📄", desc: "Custom consent form" },
];

function NewConsentFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  const [form, setForm] = useState({
    client_id: params.get("client_id") || "",
    client_name: "",
    form_type: "general_consent",
    title: "General Consent to Treatment",
    status: "pending_signature",
    signed_at: "",
    signed_by: "patient",
    guardian_name: "",
    signature_method: "written",
    witnessed_by: "",
    expiration_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    notes: "",
  });

  // Pre-fill client name if client_id provided
  useEffect(() => {
    const cid = params.get("client_id");
    if (cid) {
      fetch(`/api/clients/${cid}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          if (d.client) {
            setForm(f => ({ ...f, client_id: d.client.id, client_name: `${d.client.last_name}, ${d.client.first_name}` }));
          }
        });
    }
  }, []);

  // Client search
  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setClients(d.patients || []));
    } else {
      setClients([]);
    }
  }, [clientSearch]);

  function selectFormType(value: string) {
    const ft = FORM_TYPES.find(t => t.value === value);
    setForm(f => ({ ...f, form_type: value, title: ft?.label || f.title }));
  }

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { setError("Please select a patient"); return; }
    if (!form.title.trim()) { setError("Form title is required"); return; }

    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {
      client_id: form.client_id,
      form_type: form.form_type,
      title: form.title,
      status: form.status,
      signature_method: form.signature_method,
      witnessed_by: form.witnessed_by || null,
      expiration_date: form.expiration_date || null,
      notes: form.notes || null,
    };

    if (form.status === "signed") {
      payload.signed_at = form.signed_at || new Date().toISOString();
      payload.signed_by = form.signed_by;
      if (form.signed_by === "guardian") payload.guardian_name = form.guardian_name;
    }

    const res = await fetch("/api/consent-forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }
    router.push(`/dashboard/consent-forms/${data.consent_form.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/consent-forms" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Consent Form</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record patient consent and authorization</p>
        </div>
      </div>

      {/* Patient */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Patient</h2>
        <div className="relative">
          <label className={labelClass}>Patient *</label>
          {form.client_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.client_name}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", client_name: "" }))} className="text-teal-500 text-sm hover:text-teal-700">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className={inputClass}
                placeholder="Search patient by name or MRN..."
              />
              {clients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {clients.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => {
                        setForm(f => ({ ...f, client_id: c.id, client_name: `${c.last_name}, ${c.first_name}` }));
                        setClientSearch("");
                        setClients([]);
                      }}
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
      </div>

      {/* Form Type */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Form Type</h2>
        <div className="grid grid-cols-3 gap-2">
          {FORM_TYPES.map(ft => (
            <button
              key={ft.value}
              type="button"
              onClick={() => selectFormType(ft.value)}
              className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-colors ${
                form.form_type === ft.value ? "bg-teal-50 border-teal-400" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-xl mb-1">{ft.icon}</span>
              <span className="font-semibold text-xs text-slate-900">{ft.label}</span>
              <span className="text-xs text-slate-400 mt-0.5 leading-tight">{ft.desc}</span>
            </button>
          ))}
        </div>

        <div>
          <label className={labelClass}>Form Title *</label>
          <input
            value={form.title}
            onChange={e => set("title", e.target.value)}
            className={inputClass}
            placeholder="e.g. Consent to Treatment — Mental Health Services"
          />
        </div>
      </div>

      {/* Signature */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Signature Details</h2>

        {/* Status */}
        <div>
          <label className={labelClass}>Current Status *</label>
          <div className="flex gap-3">
            {[
              { value: "pending_signature", label: "⏳ Pending Signature", desc: "Form prepared, awaiting patient signature" },
              { value: "signed", label: "✅ Already Signed", desc: "Patient has already signed this form" },
            ].map(s => (
              <button key={s.value} type="button" onClick={() => set("status", s.value)}
                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                  form.status === s.value ? "bg-teal-50 border-teal-400" : "border-slate-200 hover:border-slate-300"
                }`}>
                <span className="font-semibold text-sm text-slate-900">{s.label}</span>
                <span className="text-xs text-slate-400">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Signature method */}
        <div>
          <label className={labelClass}>Signature Method</label>
          <select value={form.signature_method} onChange={e => set("signature_method", e.target.value)} className={inputClass}>
            <option value="written">Written signature (in person)</option>
            <option value="electronic">Electronic signature</option>
            <option value="verbal_documented">Verbal with documentation</option>
          </select>
        </div>

        {/* Signed-by fields — shown when status is "signed" */}
        {form.status === "signed" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Signed By</label>
                <select value={form.signed_by} onChange={e => set("signed_by", e.target.value)} className={inputClass}>
                  <option value="patient">Patient</option>
                  <option value="guardian">Guardian / Parent</option>
                  <option value="authorized_rep">Authorized Representative</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Date Signed</label>
                <input type="date" value={form.signed_at} onChange={e => set("signed_at", e.target.value)} className={inputClass} />
              </div>
            </div>
            {form.signed_by === "guardian" && (
              <div>
                <label className={labelClass}>Guardian Name</label>
                <input value={form.guardian_name} onChange={e => set("guardian_name", e.target.value)} className={inputClass} placeholder="Full name of guardian or parent" />
              </div>
            )}
          </>
        )}

        <div>
          <label className={labelClass}>Witnessed By (optional)</label>
          <input value={form.witnessed_by} onChange={e => set("witnessed_by", e.target.value)} className={inputClass} placeholder="Staff member who witnessed signature" />
        </div>
      </div>

      {/* Expiration & Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Expiration & Notes</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Expiration Date (optional)</label>
            <input type="date" value={form.expiration_date} onChange={e => set("expiration_date", e.target.value)} className={inputClass} />
            <p className="text-xs text-slate-400 mt-1">Leave blank for non-expiring consents</p>
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            rows={3}
            className={inputClass + " resize-none"}
            placeholder="Any additional context, limitations, or documentation notes..."
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/consent-forms" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Save Consent Form"}
        </button>
      </div>
    </form>
  );
}

export default function NewConsentFormPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <NewConsentFormInner />
    </Suspense>
  );
}
