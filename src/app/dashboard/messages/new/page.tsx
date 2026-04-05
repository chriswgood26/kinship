"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface User { clerk_user_id: string; first_name: string | null; last_name: string | null; role: string; credentials?: string | null; title?: string | null; }

function NewMessageForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [form, setForm] = useState({ subject: "", body: "" });

  useEffect(() => {
    // Include all users — not excluding self so superadmin can message themselves
    fetch("/api/org-users?include_self=true", { credentials: "include" })
      .then(r => r.json())
      .then(d => setAllUsers(d.users || []));
  }, []);

  const filteredUsers = searchQuery.length >= 1
    ? allUsers.filter(u => {
        const name = `${u.first_name} ${u.last_name}`.toLowerCase();
        const role = (u.role || "").toLowerCase();
        const q = searchQuery.toLowerCase();
        const alreadySelected = selectedUsers.some(s => s.clerk_user_id === u.clerk_user_id);
        return !alreadySelected && (name.includes(q) || role.includes(q));
      })
    : [];

  function addRecipient(user: User) {
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery("");
    setShowDropdown(false);
  }

  function removeRecipient(id: string) {
    setSelectedUsers(prev => prev.filter(u => u.clerk_user_id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject || !form.body || selectedUsers.length === 0) {
      setError("Subject, message, and at least one recipient required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, recipient_ids: selectedUsers.map(u => u.clerk_user_id) }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/messages/${data.thread_id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/messages" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Message</h1>
          <p className="text-slate-500 text-sm mt-0.5">Send a secure internal message</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {/* Recipients */}
        <div>
          <label className={labelClass}>
            To *
            {selectedUsers.length > 0 && <span className="ml-2 text-teal-600 normal-case font-normal">{selectedUsers.length} recipient{selectedUsers.length !== 1 ? "s" : ""}</span>}
          </label>

          {/* Selected recipient badges */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedUsers.map(u => (
              <span key={u.clerk_user_id} className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                {u.first_name} {u.last_name}
                <button type="button" onClick={() => removeRecipient(u.clerk_user_id)} className="text-teal-400 hover:text-teal-700 ml-0.5 leading-none">✕</button>
              </span>
            ))}
          </div>

          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Search by name or role to add recipient..."
              className={inputClass}
            />
            {showDropdown && filteredUsers.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                {filteredUsers.map(u => (
                  <button key={u.clerk_user_id} type="button"
                    onMouseDown={() => addRecipient(u)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-teal-50 text-left border-b border-slate-50 last:border-0">
                    <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0">
                      {u.first_name?.[0]}{u.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-slate-400 capitalize">{u.role?.replace("_", " ")}{u.credentials ? ` · ${u.credentials}` : ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && searchQuery.length >= 1 && filteredUsers.length === 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 px-4 py-3 text-xs text-slate-400">
                No users found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Subject *</label>
          <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            className={inputClass} placeholder="Message subject..." required />
        </div>

        <div>
          <label className={labelClass}>Message *</label>
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={6} className={inputClass + " resize-none text-slate-900"} placeholder="Write your message..." required />
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
          ⚕️ <strong>HIPAA Notice:</strong> Do not include patient names, dates of birth, or other PHI in message body. Reference patients by MRN only.
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/messages" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Sending..." : "Send Message"}
        </button>
      </div>
    </form>
  );
}

export default function NewMessagePage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewMessageForm /></Suspense>;
}
