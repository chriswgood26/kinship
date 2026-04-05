"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PayerSelect from "@/components/PayerSelect";

export default function EditPatientForm({ patient }: { patient: Record<string, string | null> }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: patient.first_name || "",
    last_name: patient.last_name || "",
    middle_name: (patient as {middle_name?: string}).middle_name || "",
    pronouns: patient.pronouns || "",
    race: patient.race || "",
    ethnicity: patient.ethnicity || "",
    primary_language: patient.primary_language || "",
    marital_status: (patient as {marital_status?: string}).marital_status || "",
    employment_status: (patient as {employment_status?: string}).employment_status || "",
    education_level: (patient as {education_level?: string}).education_level || "",
    living_situation: (patient as {living_situation?: string}).living_situation || "",
    county: (patient as {county?: string}).county || "",
    veteran_status: (patient as {veteran_status?: string}).veteran_status || "",
    preferred_name: patient.preferred_name || "",
    date_of_birth: patient.date_of_birth || "",
    gender: patient.gender || "",
    email: patient.email || "",
    phone_primary: patient.phone_primary || "",
    address_line1: patient.address_line1 || "",
    city: patient.city || "",
    state: patient.state || "",
    zip: patient.zip || "",
    emergency_contact_name: patient.emergency_contact_name || "",
    emergency_contact_phone: patient.emergency_contact_phone || "",
    emergency_contact_relationship: patient.emergency_contact_relationship || "",
    financial_class: (patient as {financial_class?: string}).financial_class || "",
    insurance_provider: patient.insurance_provider || "",
    insurance_member_id: patient.insurance_member_id || "",
    insurance_group_number: patient.insurance_group_number || "",
    insurance_auth_number: patient.insurance_auth_number || "",
    insurance_secondary_provider: patient.insurance_secondary_provider || "",
    insurance_secondary_member_id: patient.insurance_secondary_member_id || "",
    insurance_secondary_group_number: (patient as {insurance_secondary_group_number?: string}).insurance_secondary_group_number || "",
    insurance_secondary_auth_number: (patient as {insurance_secondary_auth_number?: string}).insurance_secondary_auth_number || "",
    insurance_tertiary_provider: (patient as {insurance_tertiary_provider?: string}).insurance_tertiary_provider || "",
    insurance_tertiary_member_id: (patient as {insurance_tertiary_member_id?: string}).insurance_tertiary_member_id || "",
    insurance_tertiary_group_number: (patient as {insurance_tertiary_group_number?: string}).insurance_tertiary_group_number || "",
    insurance_tertiary_auth_number: (patient as {insurance_tertiary_auth_number?: string}).insurance_tertiary_auth_number || "",
    // Copay / benefits
    insurance_copay: (patient as {insurance_copay?: number | null}).insurance_copay?.toString() || "",
    insurance_deductible: (patient as {insurance_deductible?: number | null}).insurance_deductible?.toString() || "",
    insurance_deductible_met: (patient as {insurance_deductible_met?: number | null}).insurance_deductible_met?.toString() || "",
    insurance_oop_max: (patient as {insurance_oop_max?: number | null}).insurance_oop_max?.toString() || "",
    insurance_oop_met: (patient as {insurance_oop_met?: number | null}).insurance_oop_met?.toString() || "",
    insurance_effective_date: (patient as {insurance_effective_date?: string | null}).insurance_effective_date || "",
    insurance_verified_date: (patient as {insurance_verified_date?: string | null}).insurance_verified_date || "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/clients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    router.push(`/dashboard/clients/${patient.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Top action bar */}
      <div className="flex gap-3 justify-end sticky top-0 bg-slate-50/90 backdrop-blur py-2 -mx-1 px-1 z-10">
        <Link href={`/dashboard/clients/${patient.id}`} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 bg-white">Cancel</Link>
        <button type="submit" disabled={saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Demographics</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>First Name</label><input value={form.first_name} onChange={e => set("first_name", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Last Name</label><input value={form.last_name} onChange={e => set("last_name", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Preferred Name</label><input value={form.preferred_name} onChange={e => set("preferred_name", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Gender</label>
            <select value={form.gender} onChange={e => set("gender", e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              <option>Male</option><option>Female</option><option>Non-binary</option><option>Other</option><option>Prefer not to say</option>
            </select>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Contact</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Phone</label><input value={form.phone_primary} onChange={e => set("phone_primary", e.target.value)} className={inputClass} /></div>
          <div className="col-span-2"><label className={labelClass}>Address</label><input value={form.address_line1} onChange={e => set("address_line1", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>City</label><input value={form.city} onChange={e => set("city", e.target.value)} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>State</label><input value={form.state} onChange={e => set("state", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>ZIP</label><input value={form.zip} onChange={e => set("zip", e.target.value)} className={inputClass} /></div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Emergency Contact & Insurance</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Emergency Contact Name</label><input value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Emergency Contact Phone</label><input value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Relationship</label><input value={form.emergency_contact_relationship} onChange={e => set("emergency_contact_relationship", e.target.value)} className={inputClass} /></div>
          <div className="col-span-2">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Primary Insurance</h3>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Financial Class <span className="text-red-500">*</span></label>
            <select value={(form as {financial_class?: string}).financial_class || ""} onChange={e => set("financial_class", e.target.value)}
              className={inputClass + ((form as {financial_class?: string}).financial_class ? " border-emerald-300" : " border-red-200 bg-red-50")}>
              <option value="">— Select Financial Class —</option>
              <optgroup label="Government"><option value="Medicaid">Medicaid</option><option value="Medicare">Medicare</option><option value="Medicare/Medicaid (Dual)">Medicare/Medicaid Dual</option><option value="VA/TriCare">VA / TriCare</option></optgroup>
              <optgroup label="Commercial"><option value="Commercial Insurance">Commercial Insurance</option><option value="HMO">HMO</option><option value="PPO">PPO</option><option value="Self-Funded / Employer">Self-Funded / Employer</option></optgroup>
              <optgroup label="Self-Pay"><option value="Uninsured / Self-Pay">Uninsured / Self-Pay</option><option value="Sliding Fee Scale">Sliding Fee Scale</option><option value="Charity Care">Charity Care</option></optgroup>
              <optgroup label="Pending"><option value="Pending Medicaid">Pending Medicaid</option><option value="Pending Medicare">Pending Medicare</option><option value="Pending Verification">Pending Verification</option></optgroup>
              <optgroup label="Other"><option value="Workers Compensation">Workers Compensation</option><option value="Grant Funded">Grant Funded</option><option value="Other">Other</option></optgroup>
            </select>
          </div>
          {/* Demographics reporting fields */}
          <div className="col-span-2 pt-2"><h3 className="font-semibold text-slate-700 text-sm mb-3">Demographics & Reporting</h3></div>
          <div><label className={labelClass}>Pronouns</label>
            <select value={form.pronouns || ""} onChange={e => set("pronouns", e.target.value)} className={inputClass}>
              <option value="">Select...</option><option>He/Him</option><option>She/Her</option><option>They/Them</option><option>He/They</option><option>She/They</option><option>Other</option><option>Prefer not to say</option>
            </select>
          </div>
          <div><label className={labelClass}>Race</label>
            <select value={(form as {race?: string}).race || ""} onChange={e => set("race", e.target.value)} className={inputClass}>
              <option value="">Select...</option><option>White</option><option>Black or African American</option><option>American Indian or Alaska Native</option><option>Asian</option><option>Native Hawaiian or Other Pacific Islander</option><option>Two or More Races</option><option>Unknown / Declined</option>
            </select>
          </div>
          <div><label className={labelClass}>Ethnicity</label>
            <select value={(form as {ethnicity?: string}).ethnicity || ""} onChange={e => set("ethnicity", e.target.value)} className={inputClass}>
              <option value="">Select...</option><option>Hispanic or Latino</option><option>Not Hispanic or Latino</option><option>Unknown / Declined</option>
            </select>
          </div>
          <div><label className={labelClass}>Primary Language</label>
            <select value={(form as {primary_language?: string}).primary_language || ""} onChange={e => set("primary_language", e.target.value)} className={inputClass}>
              <option value="">Select...</option><option>English</option><option>Spanish</option><option>Vietnamese</option><option>Chinese (Mandarin)</option><option>Chinese (Cantonese)</option><option>Somali</option><option>Russian</option><option>Arabic</option><option>Other</option>
            </select>
          </div>
          <div><label className={labelClass}>County of Residence</label>
            <input value={(form as {county?: string}).county || ""} onChange={e => set("county", e.target.value)} className={inputClass} placeholder="e.g. Multnomah, Washington" />
          </div>
          <div><label className={labelClass}>Veteran Status</label>
            <select value={(form as {veteran_status?: string}).veteran_status || ""} onChange={e => set("veteran_status", e.target.value)} className={inputClass}>
              <option value="">Select...</option><option>No</option><option>Yes — Army</option><option>Yes — Navy</option><option>Yes — Air Force</option><option>Yes — Marines</option><option>Yes — Coast Guard</option><option>Yes — Branch unknown</option><option>Unknown</option>
            </select>
          </div>

          {/* Insurance section header */}
          <div className="col-span-2 pt-2"><h3 className="font-semibold text-slate-700 text-sm mb-3">Emergency Contact & Insurance</h3></div>
          <div><label className={labelClass}>Insurance Provider</label><PayerSelect value={form.insurance_provider} onChange={v => set("insurance_provider", v)} placeholder="Select payer…" inputClass={inputClass} /></div>
          <div><label className={labelClass}>Member ID</label><input value={form.insurance_member_id} onChange={e => set("insurance_member_id", e.target.value)} className={inputClass} placeholder="Member ID number" /></div>
          <div><label className={labelClass}>Group Number</label><input value={form.insurance_group_number} onChange={e => set("insurance_group_number", e.target.value)} className={inputClass} placeholder="Group #" /></div>
          <div><label className={labelClass}>Prior Auth Number</label><input value={form.insurance_auth_number} onChange={e => set("insurance_auth_number", e.target.value)} className={inputClass} placeholder="PA-XXXX-XXXXX" /></div>
          <div><label className={labelClass}>Coverage Effective Date</label><input type="date" value={(form as {insurance_effective_date?: string}).insurance_effective_date || ""} onChange={e => set("insurance_effective_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Last Verified Date</label><input type="date" value={(form as {insurance_verified_date?: string}).insurance_verified_date || ""} onChange={e => set("insurance_verified_date", e.target.value)} className={inputClass} /></div>
          <div className="col-span-2 mt-2"><h3 className="font-semibold text-slate-700 text-sm mb-3">Benefits / Copay Information</h3></div>
          <div>
            <label className={labelClass}>Copay Amount</label>
            <div className="relative"><span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span><input type="number" step="0.01" value={(form as {insurance_copay?: string}).insurance_copay || ""} onChange={e => set("insurance_copay", e.target.value)} className={inputClass + " pl-7"} placeholder="20.00" /></div>
          </div>
          <div>
            <label className={labelClass}>Annual Deductible</label>
            <div className="relative"><span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span><input type="number" step="0.01" value={(form as {insurance_deductible?: string}).insurance_deductible || ""} onChange={e => set("insurance_deductible", e.target.value)} className={inputClass + " pl-7"} placeholder="1500.00" /></div>
          </div>
          <div>
            <label className={labelClass}>Deductible Met (YTD)</label>
            <div className="relative"><span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span><input type="number" step="0.01" value={(form as {insurance_deductible_met?: string}).insurance_deductible_met || ""} onChange={e => set("insurance_deductible_met", e.target.value)} className={inputClass + " pl-7"} placeholder="0.00" /></div>
          </div>
          <div>
            <label className={labelClass}>Out-of-Pocket Max</label>
            <div className="relative"><span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span><input type="number" step="0.01" value={(form as {insurance_oop_max?: string}).insurance_oop_max || ""} onChange={e => set("insurance_oop_max", e.target.value)} className={inputClass + " pl-7"} placeholder="5000.00" /></div>
          </div>
          <div className="col-span-2 pt-2 border-t border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Secondary Insurance <span className="text-slate-400 font-normal">(optional)</span></h3>
          </div>
          <div><label className={labelClass}>Secondary Provider</label><PayerSelect value={form.insurance_secondary_provider} onChange={v => set("insurance_secondary_provider", v)} placeholder="Select secondary payer…" inputClass={inputClass} /></div>
          <div><label className={labelClass}>Secondary Member ID</label><input value={form.insurance_secondary_member_id} onChange={e => set("insurance_secondary_member_id", e.target.value)} className={inputClass} placeholder="Member ID" /></div>
          <div><label className={labelClass}>Secondary Group Number</label><input value={(form as {insurance_secondary_group_number?: string}).insurance_secondary_group_number || ""} onChange={e => set("insurance_secondary_group_number", e.target.value)} className={inputClass} placeholder="Group #" /></div>
          <div><label className={labelClass}>Secondary Prior Auth</label><input value={(form as {insurance_secondary_auth_number?: string}).insurance_secondary_auth_number || ""} onChange={e => set("insurance_secondary_auth_number", e.target.value)} className={inputClass} placeholder="PA-XXXX-XXXXX" /></div>
          <div className="col-span-2 pt-2 border-t border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Tertiary Insurance <span className="text-slate-400 font-normal">(optional)</span></h3>
          </div>
          <div><label className={labelClass}>Tertiary Provider</label><PayerSelect value={(form as {insurance_tertiary_provider?: string}).insurance_tertiary_provider || ""} onChange={v => set("insurance_tertiary_provider", v)} placeholder="Select tertiary payer…" inputClass={inputClass} /></div>
          <div><label className={labelClass}>Tertiary Member ID</label><input value={(form as {insurance_tertiary_member_id?: string}).insurance_tertiary_member_id || ""} onChange={e => set("insurance_tertiary_member_id", e.target.value)} className={inputClass} placeholder="Member ID" /></div>
          <div><label className={labelClass}>Tertiary Group Number</label><input value={(form as {insurance_tertiary_group_number?: string}).insurance_tertiary_group_number || ""} onChange={e => set("insurance_tertiary_group_number", e.target.value)} className={inputClass} placeholder="Group #" /></div>
          <div><label className={labelClass}>Tertiary Prior Auth</label><input value={(form as {insurance_tertiary_auth_number?: string}).insurance_tertiary_auth_number || ""} onChange={e => set("insurance_tertiary_auth_number", e.target.value)} className={inputClass} placeholder="PA-XXXX-XXXXX" /></div>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <Link href={`/dashboard/clients/${patient.id}`} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
