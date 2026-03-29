"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  title: string | null;
  credentials: string | null;
  clerk_user_id: string;
}

interface CareTeamMember {
  id: string;
  user_profile_id: string | null;
  staff_name: string | null;
  role: string;
  is_active: boolean;
  notes: string | null;
  user_profile?: StaffMember | StaffMember[] | null;
}

interface Props {
  patientId: string;
  primaryClinicianId?: string | null;
  primaryClinicianName?: string | null;
}

const CARE_ROLES = [
  "Primary Clinician", "Psychiatrist", "Prescriber", "Case Manager",
  "Care Coordinator", "Peer Support Specialist", "Behavior Specialist",
  "Occupational Therapist", "Speech Therapist", "Nurse", "Supervisor", "Other"
];

const ROLE_ICONS: Record<string, string> = {
  "Primary Clinician": "⚕️",
  "Psychiatrist": "🧠",
  "Prescriber": "💊",
  "Case Manager": "📋",
  "Care Coordinator": "🤝",
  "Peer Support Specialist": "👥",
  "Behavior Specialist": "📊",
  "Occupational Therapist": "🖐️",
  "Speech Therapist": "💬",
  "Nurse": "🏥",
  "Supervisor": "👔",
  "Other": "👤",
};

export default function CareTeam({ patientId, primaryClinicianId, primaryClinicianName }: Props) {
  const [team, setTeam] = useState<CareTeamMember[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [primarySaving, setPrimarySaving] = useState(false);
  const [primaryId, setPrimaryId] = useState(primaryClinicianId || "");
  const [staffSearch, setStaffSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [form, setForm] = useState({ user_profile_id: "", staff_name: "", role: "Primary Clinician", notes: "" });
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/care-team?patient_id=${patientId}`, { credentials: "include" })
      .then(r => r.json()).then(d => { setTeam(d.team || []); setLoading(false); });
    fetch("/api/org-users", { credentials: "include" })
      .then(r => r.json()).then(d => setStaff(d.users || []));
  }, [patientId]);

  async function addMember() {
    if (!form.role) return;
    setSaving(true);
    const selectedStaff = staff.find(s => s.id === form.user_profile_id);
    const res = await fetch("/api/care-team", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        client_id: patientId,
        user_profile_id: form.user_profile_id || null,
        staff_name: selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name}` : form.staff_name,
        role: form.role,
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setTeam(prev => [...prev, data.member]);
      setShowAdd(false);
      setForm({ user_profile_id: "", staff_name: "", role: "Primary Clinician", notes: "" });
    }
    setSaving(false);
    router.refresh();
  }

  async function removeMember(id: string) {
    await fetch(`/api/care-team/${id}`, { method: "DELETE", credentials: "include" });
    setTeam(prev => prev.filter(m => m.id !== id));
    router.refresh();
  }

  async function setPrimary() {
    setPrimarySaving(true);
    const selected = staff.find(s => s.id === primaryId);
    await fetch(`/api/clients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        primary_clinician_id: primaryId || null,
        primary_clinician_name: selected ? `${selected.first_name} ${selected.last_name}${selected.credentials ? `, ${selected.credentials}` : ""}` : null,
      }),
    });
    setPrimarySaving(false);
    router.refresh();
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const filteredStaff = staffSearch.length >= 1
    ? staff.filter(s => `${s.first_name} ${s.last_name} ${s.credentials || ""} ${s.role}`.toLowerCase().includes(staffSearch.toLowerCase()))
    : staff;
  const filteredMemberStaff = memberSearch.length >= 1
    ? staff.filter(s => `${s.first_name} ${s.last_name} ${s.credentials || ""} ${s.role}`.toLowerCase().includes(memberSearch.toLowerCase()))
    : staff;
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900 text-sm">Care Team</h2>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50">
          {showAdd ? "Cancel" : "+ Add Member"}
        </button>
      </div>

      {/* Primary Clinician */}
      <div className="px-5 py-4 border-b border-slate-50 bg-teal-50/30">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Primary Clinician</div>
        <div className="space-y-2">
          <input
            type="text"
            value={staffSearch}
            onChange={e => setStaffSearch(e.target.value)}
            placeholder="Search providers..."
            className={inputClass}
          />
        <div className="flex items-center gap-2">
          <select value={primaryId} onChange={e => setPrimaryId(e.target.value)} className={inputClass + " flex-1"} size={Math.min(5, filteredStaff.length + 1)}>
            <option value="">— Unassigned —</option>
            {filteredStaff.map(s => (
              <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}{s.credentials ? ` — ${s.credentials}` : ""} ({s.role})</option>
            ))}
          </select>
          <button onClick={setPrimary} disabled={primarySaving}
            className="bg-teal-500 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-teal-400 disabled:opacity-50 flex-shrink-0">
            {primarySaving ? "..." : "Set"}
          </button>
        </div>
        </div>
        {primaryClinicianName && (
          <div className="text-xs text-teal-700 font-medium mt-1.5">Currently: {primaryClinicianName}</div>
        )}
      </div>

      {/* Add member form */}
      {showAdd && (
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
          <div>
            <label className={labelClass}>Staff Member</label>
            <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search staff..." className={inputClass + " mb-1"} />
            <select value={form.user_profile_id} onChange={e => setForm(f => ({ ...f, user_profile_id: e.target.value, staff_name: "" }))} className={inputClass} size={Math.min(5, filteredMemberStaff.length + 2)}>
              <option value="">Select staff member...</option>
              {filteredMemberStaff.map(s => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}{s.credentials ? `, ${s.credentials}` : ""}</option>)}
              <option value="__external__">External provider (not in system)</option>
            </select>
          </div>
          {form.user_profile_id === "__external__" && (
            <div>
              <label className={labelClass}>Provider Name</label>
              <input value={form.staff_name} onChange={e => setForm(f => ({ ...f, staff_name: e.target.value }))} className={inputClass} placeholder="External provider name" />
            </div>
          )}
          <div>
            <label className={labelClass}>Role on Care Team</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputClass}>
              {CARE_ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} placeholder="e.g. Sees every other week for medication management" />
          </div>
          <button onClick={addMember} disabled={saving || (!form.user_profile_id && !form.staff_name)}
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
            {saving ? "Adding..." : "Add to Care Team"}
          </button>
        </div>
      )}

      {/* Team members */}
      {loading ? (
        <div className="px-5 py-4 text-xs text-slate-400">Loading...</div>
      ) : team.length === 0 ? (
        <div className="px-5 py-4 text-xs text-slate-400 text-center">No additional care team members</div>
      ) : (
        <div className="divide-y divide-slate-50">
          {team.filter(m => m.is_active).map(member => {
            const profile = Array.isArray(member.user_profile) ? member.user_profile[0] : member.user_profile;
            const name = profile ? `${profile.last_name}, ${profile.first_name}${profile.credentials ? `, ${profile.credentials}` : ""}` : member.staff_name || "Unknown";
            const icon = ROLE_ICONS[member.role] || "👤";
            return (
              <div key={member.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 truncate">{name}</div>
                  <div className="text-xs text-teal-600 font-medium">{member.role}</div>
                  {member.notes && <div className="text-xs text-slate-400 mt-0.5 truncate">{member.notes}</div>}
                </div>
                <button onClick={() => removeMember(member.id)} className="text-slate-300 hover:text-red-400 text-sm flex-shrink-0">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
