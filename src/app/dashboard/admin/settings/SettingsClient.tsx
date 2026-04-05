"use client";

import { useRouter } from "next/navigation";
import StripeConnectButton from "@/components/StripeConnectButton";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Org {
  id: string;
  name: string | null;
  npi: string | null;
  tax_id: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  billing_contact: string | null;
}

interface Props { org: Org | null; }

const CLINICAL_DEFAULTS = {
  default_note_type: "SOAP",
  require_encounter_attachment: "no",
  note_lock_hours: "24",
  treatment_plan_cycle: "90",
  appointment_reminder: "24",
};

const BILLING_DEFAULTS = {
  clearinghouse: "Not configured",
  place_of_service: "11 — Office",
  era_autopost: "Disabled",
};

export default function SettingsClient({ org }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);

  // Org form
  // Fetch fresh org data on mount to ensure we have the latest values
  useEffect(() => {
    fetch("/api/admin/org", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.org) {
          const o = d.org as Record<string, string | null>;
          setOrgForm(prev => ({
            ...prev,
            name: o.name || prev.name,
            npi: o.npi || prev.npi,
            tax_id: o.tax_id || prev.tax_id,
            phone: o.phone || prev.phone,
            address_line1: o.address_line1 || prev.address_line1,
            city: o.city || prev.city,
            state: o.state || prev.state,
            zip: o.zip || prev.zip,
            billing_contact: o.billing_contact_name || prev.billing_contact,
            billing_contact_email: o.billing_contact_email || prev.billing_contact_email,
            billing_contact_phone: o.billing_contact_phone || prev.billing_contact_phone,
            client_terminology: o.client_terminology || prev.client_terminology,
            pay_period_type: o.pay_period_type || prev.pay_period_type,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const [orgForm, setOrgForm] = useState({
    name: org?.name || "",
    npi: org?.npi || "",
    tax_id: org?.tax_id || "",
    phone: org?.phone || "",
    address_line1: org?.address_line1 || "",
    city: org?.city || "",
    state: org?.state || "",
    zip: org?.zip || "",
    billing_contact: (org as {billing_contact_name?: string})?.billing_contact_name || "",
    billing_contact_email: (org as {billing_contact_email?: string})?.billing_contact_email || "",
    billing_contact_phone: (org as {billing_contact_phone?: string})?.billing_contact_phone || "",
    client_terminology: (org as unknown as {client_terminology?: string})?.client_terminology || "patient",
    pay_period_type: (org as unknown as {pay_period_type?: string})?.pay_period_type || "biweekly",
    pay_period_start_day: (org as unknown as {pay_period_start_day?: string})?.pay_period_start_day || "1",
    pay_period_start_date: (org as unknown as {pay_period_start_date?: string})?.pay_period_start_date || "",
  });

  // Clinical settings (stored in localStorage for POC)
  const [clinicalForm, setClinicalForm] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("drcloud_clinical_settings");
      if (saved) try { return { ...CLINICAL_DEFAULTS, ...JSON.parse(saved) }; } catch {}
    }
    return { ...CLINICAL_DEFAULTS };
  });
  const [billingForm, setBillingForm] = useState({ ...BILLING_DEFAULTS });
  const [complianceForm, setComplianceForm] = useState({
    ccbhc: "Yes",
    hipaa: "Enabled",
    audit_retention: "7",
    session_timeout: "30",
  });

  async function saveOrg() {
    setSaving(true);
    const res = await fetch("/api/admin/org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...orgForm,
        billing_contact_name: orgForm.billing_contact,
        billing_contact: undefined,  // remove the old key
      }),
    });
    setSaving(false);
    if (res.ok) {
      // Update form from saved response to reflect actual DB values
      const saved = await res.json();
      if (saved.org) {
        const o = saved.org as Record<string, string | null>;
        setOrgForm(prev => ({
          ...prev,
          name: o.name || prev.name,
          npi: o.npi || prev.npi,
          tax_id: o.tax_id || prev.tax_id,
          phone: o.phone || prev.phone,
          client_terminology: o.client_terminology || prev.client_terminology,
          billing_contact: o.billing_contact_name || (prev as {billing_contact?: string}).billing_contact || "",
          billing_contact_email: o.billing_contact_email || prev.billing_contact_email,
          billing_contact_phone: o.billing_contact_phone || prev.billing_contact_phone,
        }));
      }
    }
    setSaved("Organization");
    setEditing(null);
    // Persist to localStorage AND fire custom event so Sidebar updates immediately in same tab
    if (typeof window !== "undefined") {
      localStorage.setItem("drcloud_terminology", orgForm.client_terminology);
      window.dispatchEvent(new CustomEvent("drcloud_terminology_change", { detail: orgForm.client_terminology }));
    }
    // Refresh server data so hard reload also reflects DB value
    router.refresh();
    setTimeout(() => setSaved(null), 3000);
  }

  function saveLocal(section: string) {
    // Persist clinical/billing/compliance settings to localStorage
    if (typeof window !== "undefined") {
      if (section === "Clinical") {
        localStorage.setItem("drcloud_clinical_settings", JSON.stringify(clinicalForm));
      } else if (section === "Billing") {
        localStorage.setItem("drcloud_billing_settings", JSON.stringify(billingForm));
      } else if (section === "Compliance") {
        localStorage.setItem("drcloud_compliance_settings", JSON.stringify(complianceForm));
      }
    }
    setSaved(section);
    setEditing(null);
    setTimeout(() => setSaved(null), 3000);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1";

  const renderField = (label: string, value: string) => (
    <div key={label} className="flex items-center justify-between px-6 py-3.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value || "—"}</span>
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Organization and system configuration</p>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-2 text-emerald-700 text-sm font-medium">
          ✅ {saved} settings saved successfully
        </div>
      )}

      {/* Organization */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xl">🏢</span>
          <h2 className="font-semibold text-slate-900">Organization</h2>
          <button onClick={() => setEditing(editing === "org" ? null : "org")}
            className="ml-auto text-xs text-teal-600 font-medium hover:text-teal-700 border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-50">
            {editing === "org" ? "Cancel" : "Edit"}
          </button>
        </div>
        {editing === "org" ? (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Organization Name</label><input value={orgForm.name} onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>NPI</label><input value={orgForm.npi} onChange={e => setOrgForm(f => ({ ...f, npi: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Tax ID / EIN</label><input value={orgForm.tax_id} onChange={e => setOrgForm(f => ({ ...f, tax_id: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Phone</label><input value={orgForm.phone} onChange={e => setOrgForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} /></div>
              <div className="col-span-2"><label className={labelClass}>Address</label><input value={orgForm.address_line1} onChange={e => setOrgForm(f => ({ ...f, address_line1: e.target.value }))} className={inputClass} placeholder="Street address" /></div>
              <div><label className={labelClass}>City</label><input value={orgForm.city} onChange={e => setOrgForm(f => ({ ...f, city: e.target.value }))} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelClass}>State</label><input value={orgForm.state} onChange={e => setOrgForm(f => ({ ...f, state: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>ZIP</label><input value={orgForm.zip} onChange={e => setOrgForm(f => ({ ...f, zip: e.target.value }))} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Billing Contact</label><input value={orgForm.billing_contact} onChange={e => setOrgForm(f => ({ ...f, billing_contact: e.target.value }))} className={inputClass} /></div>
              <div>
                <label className={labelClass}>Client Terminology</label>
                <select value={orgForm.client_terminology} onChange={e => setOrgForm(f => ({ ...f, client_terminology: e.target.value }))} className={inputClass}>
                  <option value="patient">Patient / Patients</option>
                  <option value="client">Client / Clients</option>
                  <option value="individual">Individual / Individuals</option>
                  <option value="recipient">Recipient / Recipients</option>
                  <option value="resident">Resident / Residents</option>
                  <option value="consumer">Consumer / Consumers</option>
                  <option value="member">Member / Members</option>
                  <option value="participant">Participant / Participants</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Controls how clients are referred to throughout the system</p>
              </div>
            </div>
            <button onClick={saveOrg} disabled={saving}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : "Save Organization"}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {renderField("Organization Name", orgForm.name)}
            {renderField("NPI", orgForm.npi)}
            {renderField("Tax ID / EIN", orgForm.tax_id)}
            {renderField("Phone", orgForm.phone)}
            {renderField("Address", [orgForm.address_line1, orgForm.city, orgForm.state].filter(Boolean).join(", "))}
            {renderField("Billing Contact", orgForm.billing_contact)}
            {renderField("Client Terminology", orgForm.client_terminology.charAt(0).toUpperCase() + orgForm.client_terminology.slice(1))}
          </div>
        )}
      </div>

      {/* Clinical Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xl">⚕️</span>
          <h2 className="font-semibold text-slate-900">Clinical Settings</h2>
          <button onClick={() => setEditing(editing === "clinical" ? null : "clinical")}
            className="ml-auto text-xs text-teal-600 font-medium hover:text-teal-700 border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-50">
            {editing === "clinical" ? "Cancel" : "Edit"}
          </button>
        </div>
        {editing === "clinical" ? (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Default Note Type</label>
                <label className={labelClass}>Require Encounter on All Forms</label>
                <select value={(clinicalForm as {require_encounter_attachment?: string}).require_encounter_attachment || "no"} onChange={e => setClinicalForm((f: typeof clinicalForm) => ({ ...f, require_encounter_attachment: e.target.value }))} className={inputClass}>
                  <option value="no">No — forms can be standalone or attached</option>
                  <option value="yes">Yes — all forms must be attached to an encounter</option>
                  <option value="warn">Warn — remind staff but allow standalone</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Default Note Type</label>
                <select value={clinicalForm.default_note_type} onChange={e => setClinicalForm((f: typeof clinicalForm) => ({ ...f, default_note_type: e.target.value }))} className={inputClass}>
                  <option value="SOAP">SOAP (Subjective / Objective / Assessment / Plan)</option>
                  <option value="DAP">DAP (Data / Assessment / Plan)</option>
                  <option value="BIRP">BIRP (Behavior / Intervention / Response / Plan)</option>
                  <option value="Free">Free Text</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Auto-lock Notes After (hours)</label>
                <select value={clinicalForm.note_lock_hours} onChange={e => setClinicalForm((f: typeof clinicalForm) => ({ ...f, note_lock_hours: e.target.value }))} className={inputClass}>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                  <option value="168">7 days</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Treatment Plan Review Cycle (days)</label>
                <select value={clinicalForm.treatment_plan_cycle} onChange={e => setClinicalForm((f: typeof clinicalForm) => ({ ...f, treatment_plan_cycle: e.target.value }))} className={inputClass}>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Appointment Reminder (hours before)</label>
                <select value={clinicalForm.appointment_reminder} onChange={e => setClinicalForm((f: typeof clinicalForm) => ({ ...f, appointment_reminder: e.target.value }))} className={inputClass}>
                  <option value="2">2 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                </select>
              </div>
            </div>
            <button onClick={() => saveLocal("Clinical")}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
              Save Clinical Settings
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {renderField("Require Encounter on Forms", (clinicalForm as {require_encounter_attachment?: string}).require_encounter_attachment === "yes" ? "Required" : (clinicalForm as {require_encounter_attachment?: string}).require_encounter_attachment === "warn" ? "Warn only" : "Not required")}
            {renderField("Default Note Type", clinicalForm.default_note_type)}
            {renderField("Auto-lock Notes After", `${clinicalForm.note_lock_hours} hours`)}
            {renderField("Treatment Plan Review Cycle", `${clinicalForm.treatment_plan_cycle} days`)}
            {renderField("Appointment Reminder", `${clinicalForm.appointment_reminder} hours prior`)}
          </div>
        )}
      </div>

      {/* Workflow Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xl">⚙️</span>
          <h2 className="font-semibold text-slate-900">Workflow Configuration</h2>
        </div>
        <div className="divide-y divide-slate-50">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">📋 Encounter &amp; Appointment Types</div>
              <div className="text-xs text-slate-400 mt-0.5">Define custom type options for scheduling and encounter creation</div>
            </div>
            <Link href="/dashboard/admin/encounter-types"
              className="text-xs text-teal-600 font-semibold border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors">
              Configure →
            </Link>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">🗂 Data Collection Fields</div>
              <div className="text-xs text-slate-400 mt-0.5">Control which fields are shown, hidden, or required on patient forms</div>
            </div>
            <Link href="/dashboard/admin/field-config"
              className="text-xs text-teal-600 font-semibold border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors">
              Configure →
            </Link>
          </div>
        </div>
      </div>

      {/* Billing Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xl">💰</span>
          <h2 className="font-semibold text-slate-900">Billing Settings</h2>
          <button onClick={() => setEditing(editing === "billing" ? null : "billing")}
            className="ml-auto text-xs text-teal-600 font-medium hover:text-teal-700 border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-50">
            {editing === "billing" ? "Cancel" : "Edit"}
          </button>
        </div>
        {editing === "billing" ? (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Clearinghouse</label>
                <select value={billingForm.clearinghouse} onChange={e => setBillingForm((f: typeof billingForm) => ({ ...f, clearinghouse: e.target.value }))} className={inputClass}>
                  <option>Not configured</option>
                  <option>Availity</option>
                  <option>Change Healthcare</option>
                  <option>Office Ally</option>
                  <option>Waystar</option>
                  <option>Trizetto</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Default Place of Service</label>
                <select value={billingForm.place_of_service} onChange={e => setBillingForm((f: typeof billingForm) => ({ ...f, place_of_service: e.target.value }))} className={inputClass}>
                  <option>11 — Office</option>
                  <option>02 — Telehealth (patient home)</option>
                  <option>10 — Telehealth (non-home)</option>
                  <option>53 — Community Mental Health Center</option>
                  <option>57 — Non-residential Substance Abuse</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Pay Period Type</label>
                <select value={(orgForm as {pay_period_type?: string}).pay_period_type || "biweekly"} onChange={e => setOrgForm(f => ({ ...f, pay_period_type: e.target.value }))} className={inputClass}>
                  <option value="weekly">Weekly (every 7 days)</option>
                  <option value="biweekly">Bi-weekly (every 14 days)</option>
                  <option value="semimonthly">Semi-monthly (1st & 15th, or custom)</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {((orgForm as {pay_period_type?: string}).pay_period_type === "semimonthly") && (
                <div><label className={labelClass}>Second Pay Period Start Day</label>
                  <select value={(orgForm as {pay_period_start_day?: string}).pay_period_start_day || "16"} onChange={e => setOrgForm(f => ({ ...f, pay_period_start_day: e.target.value }))} className={inputClass}>
                    {Array.from({length: 28}, (_,i) => i+1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                  </select>
                </div>
              )}
              {((orgForm as {pay_period_type?: string}).pay_period_type === "biweekly" || (orgForm as {pay_period_type?: string}).pay_period_type === "weekly") && (
                <div><label className={labelClass}>Pay Period Anchor Date</label>
                  <input type="date" value={(orgForm as {pay_period_start_date?: string}).pay_period_start_date || ""} onChange={e => setOrgForm(f => ({ ...f, pay_period_start_date: e.target.value }))} className={inputClass} />
                  <p className="text-xs text-slate-400 mt-1">A past Monday that anchors your pay cycle (e.g. the start of a recent pay period)</p>
                </div>
              )}
              <div><label className={labelClass}>ERA Auto-post</label>
                <select value={billingForm.era_autopost} onChange={e => setBillingForm((f: typeof billingForm) => ({ ...f, era_autopost: e.target.value }))} className={inputClass}>
                  <option>Disabled</option>
                  <option>Enabled</option>
                </select>
              </div>
            </div>
            <button onClick={() => saveLocal("Billing")}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
              Save Billing Settings
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {renderField("Clearinghouse", billingForm.clearinghouse)}
          </div>
        )}
        {/* Quick-links for billing configuration */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin/clearinghouse"
            className="text-xs text-teal-600 font-semibold border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
          >
            🔌 Clearinghouse Setup →
          </Link>
          <Link
            href="/dashboard/admin/payers"
            className="text-xs text-teal-600 font-semibold border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
          >
            🏥 Payer Management →
          </Link>
        </div>
      </div>

      {/* Stripe Connect */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Online Payments</h2>
          <p className="text-xs text-slate-400 mt-0.5">Connect Stripe to accept patient copays and invoice payments online</p>
        </div>
        <div className="p-6">
          <StripeConnectButton />
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-400">Powered by Stripe Connect. Patient payments go directly to your bank account (minus Stripe's 2.9% + 30¢ processing fee). DrCloud Neo charges a 0.5% platform fee.</p>
        </div>
      </div>

      {/* Compliance */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xl">✅</span>
          <h2 className="font-semibold text-slate-900">Compliance</h2>
          <button onClick={() => setEditing(editing === "compliance" ? null : "compliance")}
            className="ml-auto text-xs text-teal-600 font-medium hover:text-teal-700 border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-50">
            {editing === "compliance" ? "Cancel" : "Edit"}
          </button>
        </div>
        {editing === "compliance" ? (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>CCBHC Certified</label>
                <select value={complianceForm.ccbhc} onChange={e => setComplianceForm((f: typeof complianceForm) => ({ ...f, ccbhc: e.target.value }))} className={inputClass}>
                  <option>Yes</option><option>No</option><option>In Progress</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>HIPAA Compliance Mode</label>
                <select value={complianceForm.hipaa} onChange={e => setComplianceForm((f: typeof complianceForm) => ({ ...f, hipaa: e.target.value }))} className={inputClass}>
                  <option>Enabled</option><option>Disabled</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Audit Log Retention (years)</label>
                <select value={complianceForm.audit_retention} onChange={e => setComplianceForm((f: typeof complianceForm) => ({ ...f, audit_retention: e.target.value }))} className={inputClass}>
                  <option value="3">3 years</option>
                  <option value="7">7 years</option>
                  <option value="10">10 years</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Session Timeout (minutes)</label>
                <select value={complianceForm.session_timeout} onChange={e => setComplianceForm((f: typeof complianceForm) => ({ ...f, session_timeout: e.target.value }))} className={inputClass}>
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">60 min</option>
                </select>
              </div>
            </div>
            <button onClick={() => saveLocal("Compliance")}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
              Save Compliance Settings
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {renderField("CCBHC Certified", complianceForm.ccbhc)}
            {renderField("HIPAA Compliance Mode", complianceForm.hipaa)}
            {renderField("Audit Log Retention", `${complianceForm.audit_retention} years`)}
            {renderField("Session Timeout", `${complianceForm.session_timeout} minutes`)}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-50">
          <h2 className="font-semibold text-red-600">Danger Zone</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900">Export All Data</div>
              <div className="text-xs text-slate-400">Download a full export of your organization's data</div>
            </div>
            <button className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50">Export</button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-red-600">Deactivate Organization</div>
              <div className="text-xs text-slate-400">This will disable all access. Cannot be undone.</div>
            </div>
            <button className="text-sm border border-red-200 text-red-500 px-4 py-2 rounded-lg hover:bg-red-50">Deactivate</button>
          </div>
        </div>
      </div>
    </div>
  );
}
