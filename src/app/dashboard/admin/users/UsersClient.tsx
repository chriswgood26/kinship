"use client";

import { useState } from "react";
import DocumentUploader from "@/components/DocumentUploader";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  clerk_user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  title: string | null;
  credentials: string | null;
  npi: string | null;
  is_active: boolean;
}

const ROLES = ["admin", "clinician", "supervisor", "billing", "care_coordinator", "receptionist"];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  clinician: "bg-teal-100 text-teal-700",
  supervisor: "bg-blue-100 text-blue-700",
  billing: "bg-amber-100 text-amber-700",
  receptionist: "bg-slate-100 text-slate-600",
  care_coordinator: "bg-emerald-100 text-emerald-700",
};

const ROLE_PERMS: Record<string, string> = {
  admin: "Full access — all modules, users, settings",
  clinician: "Patients, encounters, notes, treatment plans",
  supervisor: "Clinician access + approve/review notes",
  billing: "Billing, charges, claims — no clinical notes",
  care_coordinator: "Scheduling, referrals, patient demographics",
  receptionist: "Scheduling and patient check-in only",
};

export default function UsersClient({ users: initial, currentUserId, isAdmin = false }: {
  users: UserProfile[];
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const [users, setUsers] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const [editForm, setEditForm] = useState<Partial<UserProfile & { supervisor_id?: string }>>({});
  const [inviteForm, setInviteForm] = useState({
    first_name: "", last_name: "", email: "",
    role: "clinician", title: "", credentials: "", npi: "",
  });

  function startEdit(u: UserProfile) {
    setEditingId(u.id);
    setEditForm({ ...u });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    const res = await fetch(`/api/admin/users/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === editingId ? { ...u, ...editForm } : u));
      setSuccess("User updated successfully");
      setEditingId(null);
    }
    setSaving(false);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function toggleActive(u: UserProfile) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, is_active: !usr.is_active } : usr));
      setSuccess(`${u.first_name} ${u.last_name} ${!u.is_active ? "activated" : "deactivated"}`);
      setTimeout(() => setSuccess(""), 3000);
    }
  }

  async function sendInvite() {
    setSaving(true);
    const res = await fetch("/api/admin/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(inviteForm),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers(prev => [data.user, ...prev]);
      setSuccess(`Invitation sent to ${inviteForm.email}`);
      setInviteOpen(false);
      setInviteForm({ first_name: "", last_name: "", email: "", role: "clinician", title: "", credentials: "", npi: "" });
    } else {
      setSuccess(`Error: ${data.error || "Failed to invite"}`);
    }
    setSaving(false);
    setTimeout(() => setSuccess(""), 4000);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1";

  const activeCount = users.filter(u => u.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage staff accounts and roles</p>
        </div>
        <button onClick={() => setInviteOpen(true)}
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + Invite User
        </button>
      </div>

      {success && (
        <div className={`rounded-2xl px-5 py-3 text-sm font-medium flex items-center gap-2 ${success.startsWith("Error") ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"}`}>
          {success.startsWith("Error") ? "❌" : "✅"} {success}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
          <div className="text-3xl font-bold text-slate-900">{activeCount}</div>
          <div className="text-sm text-slate-500 mt-0.5">Active Users</div>
        </div>
        {[
          { role: "clinician", label: "Clinicians" },
          { role: "admin", label: "Admins" },
          { role: "billing", label: "Billers" },
        ].map(({ role, label }) => (
          <div key={role} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="text-3xl font-bold text-slate-900">
              {users.filter(u => u.role === role).length}
            </div>
            <div className="text-sm text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-semibold text-slate-900 mb-1">No users yet</p>
            <button onClick={() => setInviteOpen(true)} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 mt-2">+ Invite User</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">NPI</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <>
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.is_active ? "opacity-50" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {u.first_name} {u.last_name}
                            {u.credentials && <span className="text-slate-400 font-normal">, {u.credentials}</span>}
                            {u.clerk_user_id === currentUserId && <span className="ml-2 text-xs bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded font-medium">You</span>}
                          </div>
                          <div className="text-xs text-slate-400">{u.email || "No email"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${ROLE_COLORS[u.role] || "bg-slate-100 text-slate-600"}`}>
                        {u.role?.replace("_", " ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{u.title || "—"}</td>
                    <td className="px-4 py-4 text-sm font-mono text-slate-600">{u.npi || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => editingId === u.id ? setEditingId(null) : startEdit(u)}
                          className="text-teal-600 text-sm font-medium hover:text-teal-700">
                          {editingId === u.id ? "Cancel" : "Edit"}
                        </button>
                        {u.clerk_user_id !== currentUserId && (
                          <button onClick={() => toggleActive(u)}
                            className={`text-xs font-medium ${u.is_active ? "text-red-500 hover:text-red-600" : "text-emerald-600 hover:text-emerald-700"}`}>
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit row */}
                  {editingId === u.id && (
                    <tr key={`${u.id}-edit`}>
                      <td colSpan={6} className="px-5 py-5 bg-slate-50 border-b border-slate-200">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div><label className={labelClass}>First Name</label><input value={editForm.first_name || ""} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} className={inputClass} /></div>
                          <div><label className={labelClass}>Last Name</label><input value={editForm.last_name || ""} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} className={inputClass} /></div>
                          <div><label className={labelClass}>Role</label>
                            <select value={editForm.role || "clinician"} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className={inputClass}>
                              {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                            </select>
                          </div>
                          <div><label className={labelClass}>Title</label><input value={editForm.title || ""} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="LCSW, LPC, MD..." /></div>
                          <div><label className={labelClass}>Credentials</label><input value={editForm.credentials || ""} onChange={e => setEditForm(f => ({ ...f, credentials: e.target.value }))} className={inputClass} placeholder="LCSW, PhD..." /></div>
                          <div><label className={labelClass}>NPI</label><input value={editForm.npi || ""} onChange={e => setEditForm(f => ({ ...f, npi: e.target.value }))} className={inputClass} placeholder="10-digit NPI" /></div>
                        </div>
                        <div className="text-xs text-slate-500 bg-white rounded-lg px-3 py-2 border border-slate-200 mb-3">
                          <strong className="text-slate-700">{editForm.role?.replace("_", " ")} permissions:</strong> {ROLE_PERMS[editForm.role || "clinician"]}
                        </div>
                        <button onClick={saveEdit} disabled={saving}
                          className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                      </td>
                    </tr>
                  )}
                  {editingId === u.id && (
                    <tr>
                      <td colSpan={6} className="px-6 pb-5 bg-slate-50 border-b border-slate-100">
                        <div className="pt-3">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Staff Documents</div>
                          <DocumentUploader
                            userProfileId={u.id}
                            categories={[
                              "License / Certification",
                              "NPI Documentation",
                              "CPR / First Aid Certification",
                              "Background Check",
                              "Continuing Education",
                              "Employment Agreement",
                              "Credentialing Document",
                              "Supervision Agreement",
                              "Other Staff Document",
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Role guide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-3">Role Permissions</h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(ROLE_PERMS).map(([role, desc]) => (
            <div key={role} className={`${Object.entries(ROLE_COLORS).find(([r]) => r === role)?.[1]?.replace("text-", "border-")?.split(" ")[0] || ""} border rounded-xl p-3 bg-slate-50`}>
              <div className="font-semibold text-slate-900 text-xs capitalize mb-1">{role.replace("_", " ")}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setInviteOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-lg">Invite New User</h2>
              <button onClick={() => setInviteOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>First Name *</label><input value={inviteForm.first_name} onChange={e => setInviteForm(f => ({ ...f, first_name: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Last Name *</label><input value={inviteForm.last_name} onChange={e => setInviteForm(f => ({ ...f, last_name: e.target.value }))} className={inputClass} /></div>
              <div className="col-span-2"><label className={labelClass}>Email Address *</label><input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="clinician@beavertonmh.org" /></div>
              <div><label className={labelClass}>Role *</label>
                <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} className={inputClass}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Title</label><input value={inviteForm.title} onChange={e => setInviteForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="LCSW, LPC..." /></div>
              <div><label className={labelClass}>Credentials</label><input value={inviteForm.credentials} onChange={e => setInviteForm(f => ({ ...f, credentials: e.target.value }))} className={inputClass} placeholder="LCSW, PhD..." /></div>
              <div><label className={labelClass}>NPI (if applicable)</label><input value={inviteForm.npi} onChange={e => setInviteForm(f => ({ ...f, npi: e.target.value }))} className={inputClass} placeholder="10-digit NPI" /></div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
              ℹ️ An invitation will be created in the system. The user will need to sign in with their email via the Clerk authentication portal.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setInviteOpen(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={sendInvite} disabled={saving || !inviteForm.email || !inviteForm.first_name || !inviteForm.last_name}
                className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                {saving ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
