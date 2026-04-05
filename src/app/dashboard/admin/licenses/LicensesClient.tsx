"use client";

import { useState } from "react";

interface LicenseProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  credentials: string | null;
  roles: string[];
  license_number: string | null;
  license_type: string | null;
  license_state: string | null;
  license_expiry_date: string | null;
  license_notes: string | null;
  is_active: boolean;
}

type ExpiryStatus = "expired" | "critical" | "warning" | "ok" | "unknown";

function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return "unknown";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const daysUntil = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return "expired";
  if (daysUntil <= 30) return "critical";
  if (daysUntil <= 90) return "warning";
  return "ok";
}

function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG: Record<ExpiryStatus, { label: string; badge: string; row: string }> = {
  expired:  { label: "Expired",      badge: "bg-red-100 text-red-700",      row: "bg-red-50/50" },
  critical: { label: "Expires Soon", badge: "bg-orange-100 text-orange-700", row: "bg-orange-50/50" },
  warning:  { label: "Expiring",     badge: "bg-amber-100 text-amber-700",   row: "bg-amber-50/30" },
  ok:       { label: "Valid",        badge: "bg-emerald-100 text-emerald-700", row: "" },
  unknown:  { label: "No License",   badge: "bg-slate-100 text-slate-500",   row: "" },
};

export default function LicensesClient({ users: initial }: { users: LicenseProfile[] }) {
  const [users, setUsers] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [filterStatus, setFilterStatus] = useState<ExpiryStatus | "all">("all");
  const [editForm, setEditForm] = useState<Partial<LicenseProfile>>({});

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1";

  function startEdit(u: LicenseProfile) {
    setEditingId(u.id);
    setEditForm({ ...u });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          license_number: editForm.license_number,
          license_type: editForm.license_type,
          license_state: editForm.license_state,
          license_expiry_date: editForm.license_expiry_date || null,
          license_notes: editForm.license_notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === editingId ? { ...u, ...editForm } : u));
        setSuccess("License updated successfully");
        setEditingId(null);
      } else {
        setSuccess(`Error: ${data.error || "Failed to save"}`);
      }
    } catch {
      setSuccess("Error: Unable to save changes. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(""), 3000);
    }
  }

  // Compute summary counts
  const counts = { expired: 0, critical: 0, warning: 0, ok: 0, unknown: 0 };
  users.filter(u => u.is_active).forEach(u => {
    const s = getExpiryStatus(u.license_expiry_date);
    counts[s]++;
  });

  const filtered = filterStatus === "all"
    ? users
    : users.filter(u => getExpiryStatus(u.license_expiry_date) === filterStatus);

  const sorted = [...filtered].sort((a, b) => {
    const order: Record<ExpiryStatus, number> = { expired: 0, critical: 1, warning: 2, unknown: 3, ok: 4 };
    return order[getExpiryStatus(a.license_expiry_date)] - order[getExpiryStatus(b.license_expiry_date)];
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">License Tracking</h1>
        <p className="text-slate-500 text-sm mt-0.5">Monitor clinician license expiration dates and renewal status</p>
      </div>

      {success && (
        <div className={`rounded-2xl px-5 py-3 text-sm font-medium flex items-center gap-2 ${success.startsWith("Error") ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"}`}>
          {success.startsWith("Error") ? "❌" : "✅"} {success}
        </div>
      )}

      {/* Alert banners */}
      {counts.expired > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">🚨</span>
          <div>
            <div className="font-semibold text-red-800 text-sm">{counts.expired} license{counts.expired !== 1 ? "s" : ""} expired</div>
            <div className="text-red-600 text-xs mt-0.5">Immediate renewal required. Clinicians may not be able to practice with an expired license.</div>
          </div>
        </div>
      )}
      {counts.critical > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <div className="font-semibold text-orange-800 text-sm">{counts.critical} license{counts.critical !== 1 ? "s" : ""} expiring within 30 days</div>
            <div className="text-orange-600 text-xs mt-0.5">Renewal process should begin immediately to avoid lapse.</div>
          </div>
        </div>
      )}
      {counts.warning > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">📋</span>
          <div>
            <div className="font-semibold text-amber-800 text-sm">{counts.warning} license{counts.warning !== 1 ? "s" : ""} expiring within 90 days</div>
            <div className="text-amber-600 text-xs mt-0.5">Plan for renewal to ensure continuity of care.</div>
          </div>
        </div>
      )}

      {/* Summary filters */}
      <div className="grid grid-cols-5 gap-3">
        {(["all", "expired", "critical", "warning", "ok"] as const).map(status => {
          const count = status === "all" ? users.length : counts[status as ExpiryStatus];
          const isActive = filterStatus === status;
          const cfg = status === "all" ? null : STATUS_CONFIG[status as ExpiryStatus];
          return (
            <button key={status} onClick={() => setFilterStatus(status)}
              className={`text-left rounded-2xl p-4 border transition-all ${
                isActive ? "border-teal-300 bg-teal-50 ring-2 ring-teal-200" : "bg-white border-slate-200 hover:border-slate-300"
              }`}>
              <div className="text-2xl font-bold text-slate-900">{count}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {status === "all" ? "All Clinicians" :
                 status === "expired" ? "Expired" :
                 status === "critical" ? "≤30 Days" :
                 status === "warning" ? "≤90 Days" : "Valid"}
              </div>
              {cfg && count > 0 && (
                <div className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                  {cfg.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* License table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📜</div>
            <p className="font-semibold text-slate-900 mb-1">No clinicians found</p>
            <p className="text-slate-500 text-sm">Add staff members in User Management to track their licenses.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinician</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">License Type</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">License #</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">State</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry Date</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map(u => {
                const status = getExpiryStatus(u.license_expiry_date);
                const daysUntil = getDaysUntilExpiry(u.license_expiry_date);
                const cfg = STATUS_CONFIG[status];
                return (
                  <>
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${cfg.row} ${!u.is_active ? "opacity-50" : ""}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs flex-shrink-0">
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {u.first_name} {u.last_name}
                              {u.credentials && <span className="text-slate-400 font-normal">, {u.credentials}</span>}
                            </div>
                            <div className="text-xs text-slate-400">{u.title || (u.roles || []).join(", ")}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{u.license_type || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-4 text-sm font-mono text-slate-600">{u.license_number || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{u.license_state || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {u.license_expiry_date
                          ? new Date(u.license_expiry_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : <span className="text-slate-300">Not set</span>}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        {daysUntil !== null && daysUntil < 90 && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d remaining`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button onClick={() => editingId === u.id ? setEditingId(null) : startEdit(u)}
                          className="text-teal-600 text-sm font-medium hover:text-teal-700">
                          {editingId === u.id ? "Cancel" : "Edit"}
                        </button>
                      </td>
                    </tr>

                    {/* Inline edit row */}
                    {editingId === u.id && (
                      <tr key={`${u.id}-edit`}>
                        <td colSpan={7} className="px-5 py-5 bg-slate-50 border-b border-slate-200">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className={labelClass}>License Type</label>
                              <select value={editForm.license_type || ""} onChange={e => setEditForm(f => ({ ...f, license_type: e.target.value }))} className={inputClass}>
                                <option value="">Select type...</option>
                                <option>LCSW</option>
                                <option>LPC</option>
                                <option>LMFT</option>
                                <option>LMSW</option>
                                <option>LPCC</option>
                                <option>MD</option>
                                <option>DO</option>
                                <option>APRN</option>
                                <option>NP</option>
                                <option>PA</option>
                                <option>PhD</option>
                                <option>PsyD</option>
                                <option>RN</option>
                                <option>LPN</option>
                                <option>CADC</option>
                                <option>LADC</option>
                                <option>Other</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>License Number</label>
                              <input value={editForm.license_number || ""} onChange={e => setEditForm(f => ({ ...f, license_number: e.target.value }))} className={inputClass} placeholder="e.g. 12345" />
                            </div>
                            <div>
                              <label className={labelClass}>State</label>
                              <input value={editForm.license_state || ""} onChange={e => setEditForm(f => ({ ...f, license_state: e.target.value }))} className={inputClass} placeholder="e.g. OR" maxLength={2} style={{ textTransform: "uppercase" }} />
                            </div>
                            <div>
                              <label className={labelClass}>Expiry Date</label>
                              <input type="date" value={editForm.license_expiry_date || ""} onChange={e => setEditForm(f => ({ ...f, license_expiry_date: e.target.value }))} className={inputClass} />
                            </div>
                            <div className="col-span-2">
                              <label className={labelClass}>Notes</label>
                              <input value={editForm.license_notes || ""} onChange={e => setEditForm(f => ({ ...f, license_notes: e.target.value }))} className={inputClass} placeholder="Renewal submitted, supervision hours, etc." />
                            </div>
                          </div>
                          {editForm.license_notes && (
                            <div className="text-xs text-slate-500 bg-white rounded-lg px-3 py-2 border border-slate-200 mb-3">
                              <strong className="text-slate-700">Notes:</strong> {editForm.license_notes}
                            </div>
                          )}
                          <button onClick={saveEdit} disabled={saving}
                            className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                            {saving ? "Saving..." : "Save License Info"}
                          </button>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-3">
          {(["expired", "critical", "warning", "ok", "unknown"] as ExpiryStatus[]).map(s => (
            <div key={s} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${STATUS_CONFIG[s].badge}`}>
              <span className="font-medium">{STATUS_CONFIG[s].label}</span>
              <span className="opacity-70">
                {s === "expired" ? "Past expiry date" :
                 s === "critical" ? "Expires within 30 days" :
                 s === "warning" ? "Expires within 90 days" :
                 s === "ok" ? "Valid for 90+ days" : "No license date on file"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
