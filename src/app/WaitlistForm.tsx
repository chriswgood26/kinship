"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [form, setForm] = useState({ name: "", email: "", agency_name: "", agency_type: "", agency_size: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email) { setError("Email required"); return; }
    setLoading(true);
    const res = await fetch("/api/waitlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setDone(true); }
    else { setError("Something went wrong — try again"); }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="bg-teal-500/20 border border-teal-400 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <div className="text-white font-bold text-lg mb-1">You're on the list!</div>
        <div className="text-teal-200 text-sm">We'll reach out when early access opens. Thanks for your interest in Kinship.</div>
      </div>
    );
  }

  const inputClass = "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <div className="grid grid-cols-2 gap-3">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="Your name" />
        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="Work email *" required />
      </div>
      <input value={form.agency_name} onChange={e => setForm(f => ({ ...f, agency_name: e.target.value }))} className={inputClass} placeholder="Agency name" />
      <div className="grid grid-cols-2 gap-3">
        <select value={form.agency_type} onChange={e => setForm(f => ({ ...f, agency_type: e.target.value }))} className={inputClass + " bg-[#1a3260]"}>
          <option value="">Agency type...</option>
          <option>Behavioral Health</option>
          <option>Developmental Disabilities</option>
          <option>Substance Use</option>
          <option>Community Mental Health</option>
          <option>Residential</option>
          <option>Other</option>
        </select>
        <select value={form.agency_size} onChange={e => setForm(f => ({ ...f, agency_size: e.target.value }))} className={inputClass + " bg-[#1a3260]"}>
          <option value="">Agency size...</option>
          <option>1-5 staff</option>
          <option>6-15 staff</option>
          <option>16-50 staff</option>
          <option>50+ staff</option>
        </select>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-teal-500 text-white py-3.5 rounded-xl font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors text-base">
        {loading ? "Joining..." : "Join the waitlist →"}
      </button>
      <p className="text-slate-500 text-xs text-center">No spam. Just early access when we're ready.</p>
    </form>
  );
}
