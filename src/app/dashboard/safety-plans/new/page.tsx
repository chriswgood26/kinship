"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string | null;
  preferred_name?: string | null;
}

interface Contact {
  name: string;
  phone: string;
  relationship: string;
}

interface ProfessionalContact {
  name: string;
  phone: string;
  agency: string;
}

const RISK_LEVELS = ["Low Risk", "Moderate Risk", "High Risk", "Imminent Risk"] as const;

const COMMON_WARNING_SIGNS = [
  "Increased isolation or withdrawal",
  "Increased substance use",
  "Hopelessness or feeling like a burden",
  "Giving away possessions",
  "Talking about wanting to die",
  "Extreme mood changes",
  "Increased agitation or anxiety",
  "Drastic changes in sleep or eating",
  "Saying goodbye to people",
  "Loss of interest in activities",
];

const COMMON_COPING_STRATEGIES = [
  "Deep breathing or relaxation exercises",
  "Physical activity or exercise",
  "Listening to music",
  "Journaling or writing",
  "Watching a favorite show or movie",
  "Going for a walk",
  "Practicing mindfulness or meditation",
  "Spending time with a pet",
  "Drawing or creative activities",
  "Playing a game or puzzle",
];

function SafetyPlanForm() {
  const router = useRouter();
  const params = useSearchParams();
  const cssrsId = params.get("cssrs_id");
  const riskParam = params.get("risk_level");
  const clientIdParam = params.get("client_id");

  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  const [form, setForm] = useState({
    client_id: "",
    client_name: "",
    risk_level: riskParam || "",
    clinician_name: "",
    clinician_credentials: "",
    reasons_for_living: "",
    means_restriction_discussed: false,
    means_restriction_notes: "",
    crisis_line_included: true,
    client_agreement: false,
    client_signature_date: "",
    clinician_signature_date: new Date().toISOString().split("T")[0],
    follow_up_date: "",
    notes: "",
  });

  const [warningSigns, setWarningSigns] = useState<string[]>([""]);
  const [copingStrategies, setCopingStrategies] = useState<string[]>([""]);
  const [socialContacts, setSocialContacts] = useState<Contact[]>([{ name: "", phone: "", relationship: "" }]);
  const [supportContacts, setSupportContacts] = useState<Contact[]>([{ name: "", phone: "", relationship: "" }]);
  const [professionalContacts, setProfessionalContacts] = useState<ProfessionalContact[]>([
    { name: "", phone: "", agency: "" },
  ]);

  // Pre-fill from query params
  useEffect(() => {
    if (clientIdParam) {
      fetch(`/api/clients/${clientIdParam}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          if (d.client) {
            setForm(f => ({
              ...f,
              client_id: d.client.id,
              client_name: `${d.client.last_name}, ${d.client.first_name}`,
            }));
          }
        });
    }
  }, [clientIdParam]);

  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setClients(d.clients || []));
    } else {
      setClients([]);
    }
  }, [clientSearch]);

  // Helper: add/remove items from string arrays
  function addItem(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter(prev => [...prev, ""]);
  }
  function updateItem(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) {
    setter(prev => prev.map((v, i) => (i === idx ? val : v)));
  }
  function removeItem(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) {
    setter(prev => prev.filter((_, i) => i !== idx));
  }
  function toggleQuickAdd(setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) {
    setter(prev => {
      if (prev.includes(val)) return prev.filter(v => v !== val);
      const empties = prev.filter(v => v === "");
      if (empties.length > 0) {
        const idx = prev.indexOf("");
        return prev.map((v, i) => (i === idx ? val : v));
      }
      return [...prev, val];
    });
  }

  // Helper: contacts
  function updateContact<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number, field: keyof T, val: string) {
    setter(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  }
  function addContact<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, empty: T) {
    setter(prev => [...prev, empty]);
  }
  function removeContact<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number) {
    setter(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!form.client_id) return;
    setSaving(true);

    const payload = {
      ...form,
      cssrs_screening_id: cssrsId || null,
      warning_signs: warningSigns.filter(Boolean),
      internal_coping_strategies: copingStrategies.filter(Boolean),
      social_contacts: socialContacts.filter(c => c.name),
      support_contacts: supportContacts.filter(c => c.name),
      professional_contacts: professionalContacts.filter(c => c.name || c.agency),
    };

    const res = await fetch("/api/safety-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      router.push(`/dashboard/safety-plans/${data.safety_plan.id}`);
    } else {
      console.error(data.error);
      setSaving(false);
    }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";
  const sectionClass = "bg-white rounded-2xl border border-slate-200 p-5 space-y-4";

  const riskColorMap: Record<string, string> = {
    "Low Risk": "bg-emerald-500",
    "Moderate Risk": "bg-amber-500",
    "High Risk": "bg-orange-500",
    "Imminent Risk": "bg-red-600",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/safety-plans" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Safety Plan</h1>
          <p className="text-slate-500 text-sm mt-0.5">CCBHC-compliant crisis safety planning documentation</p>
        </div>
      </div>

      {cssrsId && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">🔗</span>
          <div className="text-sm text-blue-800">
            <span className="font-semibold">Linked to C-SSRS assessment.</span> This safety plan will be associated with the completed screening.
          </div>
        </div>
      )}

      {/* Client */}
      <div className={sectionClass}>
        <h2 className="font-semibold text-slate-900">Client & Risk Level</h2>
        <div className="relative">
          <label className={labelClass}>Client *</label>
          {form.client_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.client_name}</span>
              {!clientIdParam && (
                <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", client_name: "" }))} className="text-teal-500 text-sm">✕</button>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className={inputClass}
                placeholder="Search client..."
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

        <div>
          <label className={labelClass}>Risk Level (from C-SSRS)</label>
          <div className="flex gap-2 flex-wrap">
            {RISK_LEVELS.map(level => (
              <button key={level} type="button"
                onClick={() => setForm(f => ({ ...f, risk_level: level }))}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.risk_level === level
                    ? `${riskColorMap[level]} text-white border-transparent`
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}>
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 1: Warning Signs */}
      <div className={sectionClass}>
        <div>
          <h2 className="font-semibold text-slate-900">Step 1: Warning Signs</h2>
          <p className="text-xs text-slate-500 mt-0.5">Personal signs that a crisis may be developing</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_WARNING_SIGNS.map(sign => (
            <button key={sign} type="button"
              onClick={() => toggleQuickAdd(setWarningSigns, sign)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                warningSigns.includes(sign)
                  ? "bg-amber-100 border-amber-300 text-amber-800 font-semibold"
                  : "border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-700"
              }`}>
              {warningSigns.includes(sign) ? "✓ " : "+ "}{sign}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {warningSigns.map((sign, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={sign}
                onChange={e => updateItem(setWarningSigns, idx, e.target.value)}
                className={inputClass}
                placeholder={`Warning sign ${idx + 1}...`}
              />
              {warningSigns.length > 1 && (
                <button type="button" onClick={() => removeItem(setWarningSigns, idx)}
                  className="text-slate-400 hover:text-red-500 px-2">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem(setWarningSigns)}
            className="text-sm text-teal-600 font-medium hover:text-teal-700">+ Add warning sign</button>
        </div>
      </div>

      {/* Step 2: Internal Coping Strategies */}
      <div className={sectionClass}>
        <div>
          <h2 className="font-semibold text-slate-900">Step 2: Internal Coping Strategies</h2>
          <p className="text-xs text-slate-500 mt-0.5">Things the client can do on their own to distract from suicidal thoughts</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_COPING_STRATEGIES.map(strat => (
            <button key={strat} type="button"
              onClick={() => toggleQuickAdd(setCopingStrategies, strat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                copingStrategies.includes(strat)
                  ? "bg-teal-100 border-teal-300 text-teal-800 font-semibold"
                  : "border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-700"
              }`}>
              {copingStrategies.includes(strat) ? "✓ " : "+ "}{strat}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {copingStrategies.map((strat, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={strat}
                onChange={e => updateItem(setCopingStrategies, idx, e.target.value)}
                className={inputClass}
                placeholder={`Coping strategy ${idx + 1}...`}
              />
              {copingStrategies.length > 1 && (
                <button type="button" onClick={() => removeItem(setCopingStrategies, idx)}
                  className="text-slate-400 hover:text-red-500 px-2">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem(setCopingStrategies)}
            className="text-sm text-teal-600 font-medium hover:text-teal-700">+ Add coping strategy</button>
        </div>
      </div>

      {/* Step 3: Social Contacts (distraction) */}
      <div className={sectionClass}>
        <div>
          <h2 className="font-semibold text-slate-900">Step 3: Social Contacts & Distractions</h2>
          <p className="text-xs text-slate-500 mt-0.5">People and settings that provide distraction from suicidal thoughts</p>
        </div>
        <div className="space-y-3">
          {socialContacts.map((c, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2">
              <input value={c.name} onChange={e => updateContact(setSocialContacts, idx, "name", e.target.value)}
                className={inputClass} placeholder="Name" />
              <input value={c.phone} onChange={e => updateContact(setSocialContacts, idx, "phone", e.target.value)}
                className={inputClass} placeholder="Phone" />
              <div className="flex gap-2">
                <input value={c.relationship} onChange={e => updateContact(setSocialContacts, idx, "relationship", e.target.value)}
                  className={inputClass} placeholder="Relationship" />
                {socialContacts.length > 1 && (
                  <button type="button" onClick={() => removeContact(setSocialContacts, idx)}
                    className="text-slate-400 hover:text-red-500 px-1 flex-shrink-0">✕</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => addContact(setSocialContacts, { name: "", phone: "", relationship: "" })}
            className="text-sm text-teal-600 font-medium hover:text-teal-700">+ Add contact</button>
        </div>
      </div>

      {/* Step 4: Support Contacts (to ask for help) */}
      <div className={sectionClass}>
        <div>
          <h2 className="font-semibold text-slate-900">Step 4: People to Ask for Help</h2>
          <p className="text-xs text-slate-500 mt-0.5">People the client can tell they are in crisis and ask for help</p>
        </div>
        <div className="space-y-3">
          {supportContacts.map((c, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2">
              <input value={c.name} onChange={e => updateContact(setSupportContacts, idx, "name", e.target.value)}
                className={inputClass} placeholder="Name" />
              <input value={c.phone} onChange={e => updateContact(setSupportContacts, idx, "phone", e.target.value)}
                className={inputClass} placeholder="Phone" />
              <div className="flex gap-2">
                <input value={c.relationship} onChange={e => updateContact(setSupportContacts, idx, "relationship", e.target.value)}
                  className={inputClass} placeholder="Relationship" />
                {supportContacts.length > 1 && (
                  <button type="button" onClick={() => removeContact(setSupportContacts, idx)}
                    className="text-slate-400 hover:text-red-500 px-1 flex-shrink-0">✕</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => addContact(setSupportContacts, { name: "", phone: "", relationship: "" })}
            className="text-sm text-teal-600 font-medium hover:text-teal-700">+ Add contact</button>
        </div>
      </div>

      {/* Step 5: Professional Contacts */}
      <div className={sectionClass}>
        <div>
          <h2 className="font-semibold text-slate-900">Step 5: Professional & Crisis Contacts</h2>
          <p className="text-xs text-slate-500 mt-0.5">Clinicians, crisis lines, and emergency services</p>
        </div>

        {/* Crisis lines — always shown */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-1.5">
          <div className="text-xs font-bold text-red-700 uppercase tracking-wide">Crisis Resources (always included)</div>
          <div className="grid grid-cols-2 gap-2 text-sm text-red-800">
            <div>📞 <span className="font-semibold">988 Suicide &amp; Crisis Lifeline:</span> Call or text 988</div>
            <div>💬 <span className="font-semibold">Crisis Text Line:</span> Text HOME to 741741</div>
            <div>🚨 <span className="font-semibold">Emergency Services:</span> 911</div>
            <div>🏥 <span className="font-semibold">Nearest ER:</span> Local emergency room</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="crisis_line" checked={form.crisis_line_included}
            onChange={e => setForm(f => ({ ...f, crisis_line_included: e.target.checked }))}
            className="w-4 h-4 accent-teal-500" />
          <label htmlFor="crisis_line" className="text-sm text-slate-700">Confirm crisis line numbers were reviewed with client</label>
        </div>

        <div className="space-y-3">
          {professionalContacts.map((c, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2">
              <input value={c.name} onChange={e => updateContact(setProfessionalContacts, idx, "name", e.target.value)}
                className={inputClass} placeholder="Provider name" />
              <input value={c.phone} onChange={e => updateContact(setProfessionalContacts, idx, "phone", e.target.value)}
                className={inputClass} placeholder="Phone" />
              <div className="flex gap-2">
                <input value={c.agency} onChange={e => updateContact(setProfessionalContacts, idx, "agency", e.target.value)}
                  className={inputClass} placeholder="Agency / role" />
                {professionalContacts.length > 1 && (
                  <button type="button" onClick={() => removeContact(setProfessionalContacts, idx)}
                    className="text-slate-400 hover:text-red-500 px-1 flex-shrink-0">✕</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => addContact(setProfessionalContacts, { name: "", phone: "", agency: "" })}
            className="text-sm text-teal-600 font-medium hover:text-teal-700">+ Add professional contact</button>
        </div>
      </div>

      {/* Step 6: Means Restriction */}
      <div className={sectionClass}>
        <div>
          <h2 className="font-semibold text-slate-900">Step 6: Making the Environment Safe</h2>
          <p className="text-xs text-slate-500 mt-0.5">Means restriction counseling — reducing access to lethal means</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="means_restriction" checked={form.means_restriction_discussed}
            onChange={e => setForm(f => ({ ...f, means_restriction_discussed: e.target.checked }))}
            className="w-4 h-4 accent-teal-500" />
          <label htmlFor="means_restriction" className="text-sm font-medium text-slate-700">Means restriction counseling was provided</label>
        </div>
        {form.means_restriction_discussed && (
          <div>
            <label className={labelClass}>Means Restriction Notes</label>
            <textarea value={form.means_restriction_notes}
              onChange={e => setForm(f => ({ ...f, means_restriction_notes: e.target.value }))}
              rows={3} className={inputClass + " resize-none"}
              placeholder="Document specific means discussed (firearms, medications, etc.) and plan to restrict access..." />
          </div>
        )}
      </div>

      {/* Reasons for Living */}
      <div className={sectionClass}>
        <div>
          <h2 className="font-semibold text-slate-900">Reasons for Living</h2>
          <p className="text-xs text-slate-500 mt-0.5">Client&apos;s personal reasons for staying alive — strengthens commitment to safety plan</p>
        </div>
        <textarea value={form.reasons_for_living}
          onChange={e => setForm(f => ({ ...f, reasons_for_living: e.target.value }))}
          rows={3} className={inputClass + " resize-none"}
          placeholder="List the client's personal reasons for living in their own words..." />
      </div>

      {/* Clinician & Signatures */}
      <div className={sectionClass}>
        <h2 className="font-semibold text-slate-900">Clinician Documentation</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Clinician Name</label>
            <input value={form.clinician_name} onChange={e => setForm(f => ({ ...f, clinician_name: e.target.value }))}
              className={inputClass} placeholder="Full name" />
          </div>
          <div>
            <label className={labelClass}>Credentials</label>
            <input value={form.clinician_credentials} onChange={e => setForm(f => ({ ...f, clinician_credentials: e.target.value }))}
              className={inputClass} placeholder="LCSW, LPC, etc." />
          </div>
          <div>
            <label className={labelClass}>Clinician Signature Date</label>
            <input type="date" value={form.clinician_signature_date}
              onChange={e => setForm(f => ({ ...f, clinician_signature_date: e.target.value }))}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Follow-Up Appointment Date</label>
            <input type="date" value={form.follow_up_date}
              onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
              className={inputClass} />
          </div>
        </div>
        <div className="space-y-2 pt-1">
          <div className="flex items-start gap-2">
            <input type="checkbox" id="client_agreement" checked={form.client_agreement}
              onChange={e => setForm(f => ({ ...f, client_agreement: e.target.checked }))}
              className="w-4 h-4 accent-teal-500 mt-0.5" />
            <label htmlFor="client_agreement" className="text-sm text-slate-700">
              Client participated in developing this safety plan and agrees to follow it. Client received a copy.
            </label>
          </div>
          {form.client_agreement && (
            <div>
              <label className={labelClass}>Client Signature Date</label>
              <input type="date" value={form.client_signature_date}
                onChange={e => setForm(f => ({ ...f, client_signature_date: e.target.value }))}
                className={inputClass + " max-w-xs"} />
            </div>
          )}
        </div>
      </div>

      {/* Clinical Notes */}
      <div className={sectionClass}>
        <label className={labelClass}>Additional Clinical Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={3} className={inputClass + " resize-none"}
          placeholder="Clinical rationale, observations, plan for follow-up, reason for not hospitalizing if high risk..." />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/safety-plans" className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
          Cancel
        </Link>
        <button onClick={handleSave} disabled={!form.client_id || saving}
          className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-red-400">
          {saving ? "Saving..." : "Save Safety Plan →"}
        </button>
      </div>
    </div>
  );
}

export default function NewSafetyPlanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <SafetyPlanForm />
    </Suspense>
  );
}
