"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }
interface PortalUser {
  id: string; client_id: string; email: string; first_name: string | null; last_name: string | null;
  relationship: string; is_active: boolean; access_settings: Record<string, boolean>;
  patient?: Patient | Patient[] | null;
}

const RELATIONSHIPS = [
  "patient", "parent", "guardian", "sibling", "spouse", "partner",
  "parole_officer", "case_manager", "community_member", "employer", "other"
];

const ACCESS_ITEMS = [
  { key: "appointments", label: "Appointments", desc: "View upcoming and past appointments" },
  { key: "documents", label: "Documents", desc: "Download shared files and forms" },
  { key: "notes", label: "Visit Notes", desc: "Read after-visit summaries" },
  { key: "treatment_plan", label: "Care Plan", desc: "View goals and treatment progress" },
  { key: "billing", label: "Billing", desc: "View statements and make payments" },
  { key: "messages", label: "Messages", desc: "Send and receive messages with care team" },
];

const DEFAULT_ACCESS: Record<string, Record<string, boolean>> = {
  patient:          { appointments: true,  documents: true,  notes: true,  treatment_plan: true,  billing: true,  messages: true  },
  parent:           { appointments: true,  documents: true,  notes: true,  treatment_plan: true,  billing: true,  messages: true  },
  guardian:         { appointments: true,  documents: true,  notes: true,  treatment_plan: true,  billing: true,  messages: true  },
  parole_officer:   { appointments: true,  documents: false, notes: false, treatment_plan: false, billing: false, messages: true  },
  case_manager:     { appointments: true,  documents: true,  notes: false, treatment_plan: true,  billing: false, messages: true  },
  community_member: { appointments: false, documents: false, notes: false, treatment_plan: false, billing: false, messages: false },
  employer:         { appointments: true,  documents: false, notes: false, treatment_plan: false, billing: false, messages: false },
  sibling:          { appointments: true,  documents: false, notes: false, treatment_plan: false, billing: false, messages: false },
  spouse:           { appointments: true,  documents: true,  notes: false, treatment_plan: false, billing: true,  messages: true  },
  partner:          { appointments: true,  documents: true,  notes: false, treatment_plan: false, billing: true,  messages: true  },
  other:            { appointments: false, documents: false, notes: false, treatment_plan: false, billing: false, messages: false },
};

export default function PortalManagementClient({ portalUsers, patients }: { portalUsers: PortalUser[]; patients: Patient[]; }) {
  const [showInvite, setShowInvite] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const [patientSearch, setPatientSearch] = useState("");
  const [inviteForm, setInviteForm] = useState({
    client_id: "", email: "", first_name: "", last_name: "", relationship: "patient",
    access_settings: { ...DEFAULT_ACCESS.patient },
  });

  const [editAccess, setEditAccess] = useState<Record<string, boolean>>({});

  function setRelationship(rel: string) {
    setInviteForm(f => ({ ...f, relationship: rel, access_settings: { ...DEFAULT_ACCESS[rel] || DEFAULT_ACCESS.other } }));
  }

  function startEdit(pu: PortalUser) {
    setEditingId(pu.id);
    setEditAccess({ ...pu.access_settings });
  }

  async function saveAccess(id: string) {
    setSaving(true);
    await fetch(`/api/portal/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ access_settings: editAccess }),
    });
    setSaving(false); setEditingId(null); setSuccess("Access settings updated"); router.refresh();
    setTimeout(() => setSuccess(""), 3000);
  }

  async function toggleActive(pu: PortalUser) {
    await fetch(`/api/portal/users/${pu.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ is_active: !pu.is_active }),
    });
    router.refresh();
  }

  async function sendInvite() {
    if (!inviteForm.client_id || !inviteForm.email || !inviteForm.first_name) { setSuccess("Fill in all required fields"); return; }
    setSaving(true);
    const res = await fetch("/api/portal/users", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(inviteForm),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { setSuccess(`Portal account created for ${inviteForm.email}`); setShowInvite(false); router.refresh(); }
    else { setSuccess(`Error: ${data.error}`); }
    setTimeout(() => setSuccess(""), 4000);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1";
  const REL_COLORS: Record<string, string> = {
    patient: "bg-teal-100 text-teal-700", parent: "bg-blue-100 text-blue-700", guardian: "bg-blue-100 text-blue-700",
    parole_officer: "bg-amber-100 text-amber-700", case_manager: "bg-purple-100 text-purple-700",
    spouse: "bg-pink-100 text-pink-700", sibling: "bg-slate-100 text-slate-600",
    community_member: "bg-slate-100 text-slate-500", employer: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-4">
      {success && (
        <div className={`rounded-2xl px-5 py-3 text-sm font-medium ${success.startsWith("Error") || success.startsWith("Fill") ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"}`}>
          {success}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => setShowInvite(!showInvite)}
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 text-sm">
          + Create Portal Account
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white rounded-2xl border-2 border-teal-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-900">New Portal Account</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Patient *</label>
              <select value={inviteForm.client_id} onChange={e => setInviteForm(f => ({ ...f, client_id: e.target.value }))} className={inputClass}>
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name} — MRN: {p.mrn || "—"}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>First Name *</label><input value={inviteForm.first_name} onChange={e => setInviteForm(f => ({ ...f, first_name: e.target.value }))} className={inputClass} /></div>
            <div><label className={labelClass}>Last Name</label><input value={inviteForm.last_name} onChange={e => setInviteForm(f => ({ ...f, last_name: e.target.value }))} className={inputClass} /></div>
            <div className="col-span-2"><label className={labelClass}>Email Address *</label><input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="Their email address for login" /></div>
            <div className="col-span-2">
              <label className={labelClass}>Relationship to Patient *</label>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIPS.map(rel => (
                  <button key={rel} type="button" onClick={() => setRelationship(rel)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${inviteForm.relationship === rel ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                    {rel.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass + " mb-2"}>Access Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {ACCESS_ITEMS.map(item => (
                <div key={item.key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${inviteForm.access_settings[item.key] ? "bg-teal-50 border-teal-200" : "border-slate-200 hover:border-slate-300"}`}
                  onClick={() => setInviteForm(f => ({ ...f, access_settings: { ...f.access_settings, [item.key]: !f.access_settings[item.key] } }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${inviteForm.access_settings[item.key] ? "bg-teal-500 border-teal-500" : "border-slate-300"}`}>
                    {inviteForm.access_settings[item.key] && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
            ⚕️ After creating the account, go to Clerk dashboard and invite this email address so they can set their password and log in at <strong>/portal/dashboard</strong>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowInvite(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button onClick={sendInvite} disabled={saving} className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Creating..." : "Create Portal Account"}
            </button>
          </div>
        </div>
      )}

      {/* Portal users list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {portalUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="text-4xl mb-3">🌐</div>
            <p className="font-semibold text-slate-900 mb-1">No portal accounts yet</p>
            <p>Create accounts to give patients and family members access</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {portalUsers.map(pu => {
              const patient = Array.isArray(pu.patient) ? pu.patient[0] : pu.patient;
              return (
                <div key={pu.id}>
                  <div className={`flex items-start gap-4 px-5 py-4 ${!pu.is_active ? "opacity-50" : ""}`}>
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                      {pu.first_name?.[0]}{pu.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{pu.first_name} {pu.last_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${REL_COLORS[pu.relationship] || "bg-slate-100 text-slate-500"}`}>{pu.relationship?.replace("_", " ")}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pu.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{pu.is_active ? "Active" : "Inactive"}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{pu.email}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Patient: <span className="font-medium">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(pu.access_settings || {}).filter(([, v]) => v).map(([k]) => (
                          <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium capitalize">{k.replace("_", " ")}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => editingId === pu.id ? setEditingId(null) : startEdit(pu)} className="text-xs text-teal-600 font-medium hover:text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg">
                        {editingId === pu.id ? "Cancel" : "Edit Access"}
                      </button>
                      <button onClick={() => toggleActive(pu)} className={`text-xs font-medium border px-2.5 py-1 rounded-lg ${pu.is_active ? "text-red-500 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}>
                        {pu.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>

                  {/* Edit access */}
                  {editingId === pu.id && (
                    <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {ACCESS_ITEMS.map(item => (
                          <div key={item.key}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${editAccess[item.key] ? "bg-teal-50 border-teal-200" : "border-slate-200 bg-white"}`}
                            onClick={() => setEditAccess(a => ({ ...a, [item.key]: !a[item.key] }))}>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${editAccess[item.key] ? "bg-teal-500 border-teal-500" : "border-slate-300"}`}>
                              {editAccess[item.key] && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className="text-sm font-medium text-slate-900">{item.label}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => saveAccess(pu.id)} disabled={saving}
                        className="mt-3 bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                        {saving ? "Saving..." : "Save Access Settings"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
