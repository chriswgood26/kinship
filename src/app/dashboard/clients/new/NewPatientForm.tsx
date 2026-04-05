"use client";
import { useTerminology } from "@/components/TerminologyProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

export default function NewPatientForm({ prefill = {}, referralId }: { prefill?: Record<string, string>; referralId?: string }) {
  const term = useTerminology();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("demographics");

  const [form, setForm] = useState({
    first_name: prefill.first_name || "", last_name: prefill.last_name || "", middle_name: "", preferred_name: "",
    date_of_birth: prefill.date_of_birth || "", gender: "", pronouns: "",
    ssn_last4: "", race: "", ethnicity: "", primary_language: "English",
    phone_primary: prefill.phone_primary || "", phone_secondary: "", email: prefill.email || "",
    address_line1: "", address_line2: "", city: "", state: "", zip: "",
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relationship: "",
    insurance_provider: prefill.insurance_provider || "", insurance_member_id: "", insurance_group_number: "",
  });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name || !form.last_name) { setError("First and last name are required."); return; }
    setSaving(true);
    setError("");

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error || "Failed to save patient"); setSaving(false); return; }
    router.push(`/dashboard/clients/${data.patient.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  const tabs = [
    { id: "demographics", label: "Demographics" },
    { id: "contact", label: "Contact" },
    { id: "emergency", label: "Emergency Contact" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Tab nav */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-100">
          {tabs.map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "text-teal-600 border-b-2 border-teal-500 -mb-px bg-teal-50/50"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* Demographics */}
          {activeTab === "demographics" && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className={labelClass}>First Name *</label>
                  <input type="text" value={form.first_name} onChange={e => set("first_name", e.target.value)} className={inputClass} placeholder="First" required />
                </div>
                <div>
                  <label className={labelClass}>Middle Name</label>
                  <input type="text" value={form.middle_name} onChange={e => set("middle_name", e.target.value)} className={inputClass} placeholder="Middle" />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input type="text" value={form.last_name} onChange={e => set("last_name", e.target.value)} className={inputClass} placeholder="Last" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Preferred Name</label>
                  <input type="text" value={form.preferred_name} onChange={e => set("preferred_name", e.target.value)} className={inputClass} placeholder="Goes by..." />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Gender</label>
                  <select value={form.gender} onChange={e => set("gender", e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                    <option>Transgender Male</option>
                    <option>Transgender Female</option>
                    <option>Other</option>
                    <option>Unknown / Decline</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Pronouns</label>
                  <select value={form.pronouns} onChange={e => set("pronouns", e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    <option>He/Him</option>
                    <option>She/Her</option>
                    <option>They/Them</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>SSN Last 4</label>
                  <input type="text" value={form.ssn_last4} onChange={e => set("ssn_last4", e.target.value.replace(/\D/g, "").slice(0, 4))} className={inputClass} placeholder="XXXX" maxLength={4} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Race</label>
                  <select value={form.race} onChange={e => set("race", e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    <option>American Indian / Alaska Native</option>
                    <option>Asian</option>
                    <option>Black / African American</option>
                    <option>Native Hawaiian / Pacific Islander</option>
                    <option>White</option>
                    <option>Multi-racial</option>
                    <option>Other</option>
                    <option>Unknown / Decline</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Ethnicity</label>
                  <select value={form.ethnicity} onChange={e => set("ethnicity", e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    <option>Hispanic or Latino</option>
                    <option>Not Hispanic or Latino</option>
                    <option>Unknown / Decline</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Primary Language</label>
                  <select value={form.primary_language} onChange={e => set("primary_language", e.target.value)} className={inputClass}>
                    <option>English</option>
                    <option>Spanish</option>
                    <option>Mandarin</option>
                    <option>French</option>
                    <option>Arabic</option>
                    <option>Vietnamese</option>
                    <option>Korean</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Contact */}
          {activeTab === "contact" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Primary Phone</label>
                  <input type="tel" value={form.phone_primary} onChange={e => set("phone_primary", e.target.value)} className={inputClass} placeholder="(555) 000-0000" />
                </div>
                <div>
                  <label className={labelClass}>Secondary Phone</label>
                  <input type="tel" value={form.phone_secondary} onChange={e => set("phone_secondary", e.target.value)} className={inputClass} placeholder="(555) 000-0000" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputClass} placeholder="patient@email.com" />
              </div>

              <div>
                <label className={labelClass}>Address Line 1</label>
                <input type="text" value={form.address_line1} onChange={e => set("address_line1", e.target.value)} className={inputClass} placeholder="123 Main St" />
              </div>
              <div>
                <label className={labelClass}>Address Line 2</label>
                <input type="text" value={form.address_line2} onChange={e => set("address_line2", e.target.value)} className={inputClass} placeholder="Apt, Suite, Unit..." />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className={labelClass}>City</label>
                  <input type="text" value={form.city} onChange={e => set("city", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select value={form.state} onChange={e => set("state", e.target.value)} className={inputClass}>
                    <option value="">—</option>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>ZIP</label>
                  <input type="text" value={form.zip} onChange={e => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))} className={inputClass} placeholder="00000" />
                </div>
              </div>
            </>
          )}

          {/* Emergency Contact */}
          {activeTab === "emergency" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Contact Name</label>
                  <input type="text" value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} className={inputClass} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelClass}>Relationship</label>
                  <select value={form.emergency_contact_relationship} onChange={e => set("emergency_contact_relationship", e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    <option>Spouse / Partner</option>
                    <option>Parent</option>
                    <option>Child</option>
                    <option>Sibling</option>
                    <option>Grandparent</option>
                    <option>Guardian</option>
                    <option>Friend</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Contact Phone</label>
                <input type="tel" value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)} className={inputClass} placeholder="(555) 000-0000" />
              </div>
            </>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/clients"
          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </Link>
        <button type="submit" disabled={saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving ? "Saving..." : `Save ${term.singular}`}
        </button>
      </div>
    </form>
  );
}
