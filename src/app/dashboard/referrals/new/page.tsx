"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; pronouns?: string | null; }
interface StaffMember { id: string; clerk_user_id: string; first_name: string; last_name: string; title: string | null; role: string; }

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function addDays(dateStr: string, days: number, businessDaysOnly: boolean): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const date = new Date(dateStr + "T12:00:00");
  if (isNaN(date.getTime())) return "";
  if (!businessDaysOnly) {
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return date.toISOString().split("T")[0];
}

function NewReferralForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const [referralDueDays, setReferralDueDays] = useState<{ days: number; business_days: boolean } | null>(null);
  const today = new Date().toISOString().split("T")[0];

  // Fetch org referral settings
  useEffect(() => {
    fetch("/api/settings/referral-defaults", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.referral_due_days) {
          setReferralDueDays(d);
          setForm(f => ({
            ...f,
            due_date: addDays(f.referral_date, d.referral_due_days, d.referral_due_business_days ?? false),
          }));
        }
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    client_id: "", patient_name: "",
    referral_type: "outgoing",
    priority: "routine",
    referred_by: "", referred_by_email: "",
    referred_to: "", referred_to_email: "", referred_to_org: "",
    internal_provider_clerk_id: "",
    reason: "", notes: "",
    referral_date: today,
    due_date: "",
    applicant_first_name: "",
    applicant_last_name: "",
    applicant_dob: "",
    applicant_phone: "",
    applicant_email: "",
    applicant_insurance: "",
  });

  useEffect(() => {
    if (form.referral_type !== "incoming" && patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`, { credentials: "include" })
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch, form.referral_type]);

  // Load staff list for internal referrals
  useEffect(() => {
    if (form.referral_type === "internal" && staffList.length === 0) {
      fetch("/api/admin/users", { credentials: "include" })
        .then(r => r.json()).then(d => setStaffList(d.users || []));
    }
  }, [form.referral_type]);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
  const isIncoming = form.referral_type === "incoming";
  const isInternal = form.referral_type === "internal";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isIncoming && !form.client_id) { setError("Select a patient"); return; }
    if (isIncoming && (!form.applicant_first_name || !form.applicant_last_name)) {
      setError("Applicant first and last name required"); return;
    }
    if (isInternal && !selectedStaff) { setError("Select a provider to refer to"); return; }
    setSaving(true);

    const payload = {
      ...form,
      referred_to: isInternal && selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name}${selectedStaff.title ? `, ${selectedStaff.title}` : ""}` : form.referred_to,
      referred_to_org: isInternal ? "Internal" : form.referred_to_org,
      internal_provider_clerk_id: isInternal && selectedStaff ? selectedStaff.clerk_user_id : null,
      notes: isIncoming
        ? `Applicant: ${form.applicant_first_name} ${form.applicant_last_name}${form.applicant_dob ? ` | DOB: ${form.applicant_dob}` : ""}${form.applicant_phone ? ` | Phone: ${form.applicant_phone}` : ""}${form.applicant_email ? ` | Email: ${form.applicant_email}` : ""}${form.applicant_insurance ? ` | Insurance: ${form.applicant_insurance}` : ""}\n\n${form.notes}`
        : form.notes,
      applicant_email: isIncoming ? form.applicant_email : undefined,
      client_id: isIncoming ? null : form.client_id,
    };

    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }

      // Send internal notification to the referred provider
      if (isInternal && selectedStaff && data.referral) {
        try {
          await fetch("/api/notifications/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              recipient_clerk_id: selectedStaff.clerk_user_id,
              type: "internal_referral",
              title: "New Internal Referral",
              message: `You have a new internal referral${form.patient_name ? ` for ${form.patient_name}` : ""}. Priority: ${form.priority}.${form.reason ? ` Reason: ${form.reason}` : ""}`,
              entity_type: "referral",
              entity_id: data.referral.id,
              link: `/dashboard/referrals/${data.referral.id}`,
            }),
          });
        } catch (notifErr) {
          console.error("Notification failed:", notifErr);
        }
      }

      router.push("/dashboard/referrals");
    } catch (err) {
      setError("Failed to save referral. Please try again.");
      setSaving(false);
    }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/referrals" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Referral</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create an incoming, outgoing, or internal referral</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">

        {/* Referral type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Referral Type *</label>
            <select value={form.referral_type} onChange={e => {
              setForm(f => ({ ...f, client_id: "", patient_name: "", referral_type: e.target.value, internal_provider_clerk_id: "" }));
              setPatientSearch("");
              setSelectedStaff(null);
            }} className={inputClass}>
              <option value="outgoing">Outgoing — Referring out to another provider</option>
              <option value="incoming">Incoming — New applicant referred to us</option>
              <option value="internal">Internal — Transfer within our org</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputClass}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergent">Emergent</option>
            </select>
          </div>
        </div>

        {/* INCOMING: New applicant */}
        {isIncoming ? (
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-sm text-teal-800">
              <strong>Incoming referral</strong> — this person is not yet in the system. Once accepted, you can create a full patient record.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>First Name *</label><input value={form.applicant_first_name} onChange={e => set("applicant_first_name", e.target.value)} className={inputClass} placeholder="First name..." /></div>
              <div><label className={labelClass}>Last Name *</label><input value={form.applicant_last_name} onChange={e => set("applicant_last_name", e.target.value)} className={inputClass} placeholder="Last name..." /></div>
              <div><label className={labelClass}>Date of Birth</label><input type="date" value={form.applicant_dob} onChange={e => set("applicant_dob", e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Phone</label><input type="tel" value={form.applicant_phone} onChange={e => setForm(f => ({ ...f, applicant_phone: formatPhone(e.target.value) }))} className={inputClass} placeholder="(555) 000-0000" /></div>
              <div><label className={labelClass}>Applicant Email</label><input type="email" value={form.applicant_email} onChange={e => set("applicant_email", e.target.value)} className={inputClass} placeholder="applicant@email.com" /></div>
              <div><label className={labelClass}>Insurance / Payor</label><input value={form.applicant_insurance} onChange={e => set("applicant_insurance", e.target.value)} className={inputClass} placeholder="Insurance provider and member ID..." /></div>
            </div>
          </div>
        ) : (
          /* OUTGOING / INTERNAL: search existing patients */
          <div className="relative">
            <label className={labelClass}>Patient *</label>
            {form.patient_name ? (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
                <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "" }))} className="text-teal-500 text-sm">✕ Change</button>
              </div>
            ) : (
              <div className="relative">
                <input type="text" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search patient name or MRN..." />
                {patients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                    {patients.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setForm(f => ({ ...f, client_id: p.id, patient_name: `${p.last_name}, ${p.first_name}` })); setPatientSearch(""); setPatients([]); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                        <div className="font-semibold text-sm text-slate-900">{p.last_name}, {p.first_name}{p.preferred_name && <span className="text-slate-400 font-normal ml-1.5">"{p.preferred_name}"</span>}</div>
                        <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}{p.pronouns ? ` · ${p.pronouns}` : ""}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* INTERNAL: staff provider selector */}
        {isInternal && (
          <div>
            <label className={labelClass}>Refer To (Internal Provider) *</label>
            {selectedStaff ? (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                <div>
                  <div className="font-semibold text-sm text-teal-800">{selectedStaff.first_name} {selectedStaff.last_name}{selectedStaff.title ? `, ${selectedStaff.title}` : ""}</div>
                  <div className="text-xs text-teal-600 capitalize">{selectedStaff.role?.replace("_", " ")}</div>
                </div>
                <button type="button" onClick={() => setSelectedStaff(null)} className="text-teal-500 text-sm">✕ Change</button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {staffList.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">Loading staff...</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {staffList.map(s => (
                      <button key={s.id} type="button" onClick={() => setSelectedStaff(s)}
                        className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors">
                        <div className="font-semibold text-sm text-slate-900">{s.first_name} {s.last_name}{s.title ? `, ${s.title}` : ""}</div>
                        <div className="text-xs text-slate-400 capitalize">{s.role?.replace("_", " ")}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-teal-600">
              <span>📬</span>
              <span>The selected provider will receive an in-app notification when this referral is created.</span>
            </div>
          </div>
        )}

        {/* Outgoing/Incoming provider info */}
        {!isInternal && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{isIncoming ? "Referred By (Sending Provider)" : "Referred To (Receiving Provider)"}</label>
              <input type="text" value={isIncoming ? form.referred_by : form.referred_to}
                onChange={e => set(isIncoming ? "referred_by" : "referred_to", e.target.value)}
                className={inputClass} placeholder="Provider name..." />
            </div>
            <div>
              <label className={labelClass}>{isIncoming ? "Sending Organization" : "Receiving Organization"}</label>
              <input type="text" value={form.referred_to_org} onChange={e => set("referred_to_org", e.target.value)} className={inputClass} placeholder="Organization name..." />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>{isIncoming ? "Referring Provider Email" : "Receiving Provider Email"}</label>
              <input
                type="email"
                value={isIncoming ? form.referred_by_email : form.referred_to_email}
                onChange={e => set(isIncoming ? "referred_by_email" : "referred_to_email", e.target.value)}
                className={inputClass}
                placeholder={isIncoming ? "provider@clinic.com — will be notified of status changes" : "provider@clinic.com — will receive referral details by email"}
              />
              {!isIncoming && form.referred_to_email && (
                <p className="text-xs text-teal-600 mt-1">📧 A referral notification will be sent to this address when you submit.</p>
              )}
              {isIncoming && form.referred_by_email && (
                <p className="text-xs text-teal-600 mt-1">📧 This provider will be emailed when the referral status is updated.</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Referral Date</label><input type="date" value={form.referral_date} onChange={e => {
            const newDate = e.target.value;
            setForm(f => ({
              ...f,
              referral_date: newDate,
              due_date: newDate && referralDueDays ? addDays(newDate, referralDueDays.days, referralDueDays.business_days) : f.due_date,
            }));
          }} className={inputClass} /></div>
          <div><label className={labelClass}>Due / Response By</label><input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} className={inputClass} /></div>
        </div>

        <div>
          <label className={labelClass}>Reason for Referral</label>
          <textarea value={form.reason} onChange={e => set("reason", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Clinical reason for this referral..." />
        </div>

        <div>
          <label className={labelClass}>Additional Notes</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Additional notes..." />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/referrals" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : isInternal ? "Create Referral & Notify Provider" : "Create Referral"}
        </button>
      </div>
    </form>
  );
}

export default function NewReferralPage() {
  return <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}><NewReferralForm /></Suspense>;
}
