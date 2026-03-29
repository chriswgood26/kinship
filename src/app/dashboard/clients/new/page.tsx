"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TABS = ["demographics", "contact", "insurance"];

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("demographics");

  const [form, setForm] = useState({
    first_name: "", last_name: "", preferred_name: "", middle_name: "",
    date_of_birth: "", gender: "", pronouns: "", primary_language: "English",
    race: "", ethnicity: "", ssn_last4: "",
    phone_primary: "", phone_secondary: "", email: "",
    address_line1: "", city: "", state: "", zip: "",
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relationship: "",
    insurance_provider: "", insurance_member_id: "", insurance_group_number: "",
    status: "active",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name || !form.last_name) { setError("First and last name required"); return; }
    setSaving(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/clients/${data.client.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clients" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Client</h1>
          <p className="text-slate-500 text-sm mt-0.5">Add a new client to your caseload</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[["demographics", "Demographics"], ["contact", "Contact"], ["insurance", "Insurance"]].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "demographics" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>First Name *</label><input value={form.first_name} onChange={e => set("first_name", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Last Name *</label><input value={form.last_name} onChange={e => set("last_name", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Preferred Name</label><input value={form.preferred_name} onChange={e => set("preferred_name", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Middle Name</label><input value={form.middle_name} onChange={e => set("middle_name", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Gender</label>
              <select value={form.gender} onChange={e => set("gender", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Male</option><option>Female</option><option>Non-binary</option><option>Transgender male</option><option>Transgender female</option><option>Other</option><option>Prefer not to say</option>
              </select>
            </div>
            <div><label className={labelClass}>Pronouns</label>
              <select value={form.pronouns} onChange={e => set("pronouns", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>he/him</option><option>she/her</option><option>they/them</option><option>he/they</option><option>she/they</option><option>Other</option>
              </select>
            </div>
            <div><label className={labelClass}>Primary Language</label><input value={form.primary_language} onChange={e => set("primary_language", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Race</label><input value={form.race} onChange={e => set("race", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Ethnicity</label><input value={form.ethnicity} onChange={e => set("ethnicity", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>SSN Last 4</label><input value={form.ssn_last4} onChange={e => set("ssn_last4", e.target.value)} className={inputClass} placeholder="XXXX" maxLength={4} /></div>
            <div><label className={labelClass}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={inputClass}>
                <option value="active">Active</option><option value="waitlist">Waitlist</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end"><button type="button" onClick={() => setActiveTab("contact")} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">Next →</button></div>
        </div>
      )}

      {activeTab === "contact" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Phone (Primary)</label><input value={form.phone_primary} onChange={e => set("phone_primary", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Phone (Secondary)</label><input value={form.phone_secondary} onChange={e => set("phone_secondary", e.target.value)} className={inputClass} /></div>
            <div className="col-span-2"><label className={labelClass}>Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputClass} /></div>
            <div className="col-span-2"><label className={labelClass}>Address</label><input value={form.address_line1} onChange={e => set("address_line1", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>City</label><input value={form.city} onChange={e => set("city", e.target.value)} className={inputClass} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelClass}>State</label><input value={form.state} onChange={e => set("state", e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>ZIP</label><input value={form.zip} onChange={e => set("zip", e.target.value)} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>Emergency Contact Name</label><input value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Emergency Contact Phone</label><input value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Relationship</label><input value={form.emergency_contact_relationship} onChange={e => set("emergency_contact_relationship", e.target.value)} className={inputClass} /></div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setActiveTab("demographics")} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
            <button type="button" onClick={() => setActiveTab("insurance")} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">Next →</button>
          </div>
        </div>
      )}

      {activeTab === "insurance" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Insurance Provider</label><input value={form.insurance_provider} onChange={e => set("insurance_provider", e.target.value)} className={inputClass} placeholder="e.g. Medicaid, BCBS" /></div>
            <div><label className={labelClass}>Member ID</label><input value={form.insurance_member_id} onChange={e => set("insurance_member_id", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Group Number</label><input value={form.insurance_group_number} onChange={e => set("insurance_group_number", e.target.value)} className={inputClass} /></div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setActiveTab("contact")} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
            <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : "Create Client"}
            </button>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
    </form>
  );
}
