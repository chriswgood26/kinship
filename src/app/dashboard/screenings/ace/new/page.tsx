"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ACE, getACEScore, getACESeverity } from "@/lib/aceScreening";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; }

function AceForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [form, setForm] = useState({ client_id: "", patient_name: "", administered_by: "", notes: "" });

  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setClients(d.patients || []));
    } else {
      setClients([]);
    }
  }, [clientSearch]);

  const answeredCount = ACE.questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== null).length;
  const allAnswered = answeredCount === ACE.questions.length;
  const totalScore = getACEScore(answers);
  const severity = getACESeverity(totalScore);
  const pctComplete = Math.round((answeredCount / ACE.questions.length) * 100);

  async function handleSubmit() {
    if (!form.client_id || !allAnswered) return;
    setSaving(true);
    const res = await fetch("/api/screenings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        tool: "ace",
        answers,
        total_score: totalScore,
        severity_label: severity.label,
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/dashboard/screenings/ace/${data.screening.id}`);
    else setSaving(false);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ACE — Adverse Childhood Experiences</h1>
          <p className="text-slate-500 text-sm mt-0.5">Trauma-informed care screening · 10 questions · Max score 10</p>
        </div>
      </div>

      {/* Client + info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="relative">
          <label className={labelClass}>Client *</label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "" }))} className="text-teal-500 text-sm">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} className={inputClass} placeholder="Search client..." />
              {clients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {clients.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setForm(f => ({ ...f, client_id: c.id, patient_name: `${c.last_name}, ${c.first_name}` })); setClientSearch(""); setClients([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div className="font-semibold text-sm text-slate-900">{c.last_name}, {c.first_name}</div>
                      <div className="text-xs text-slate-400">MRN: {c.mrn || "—"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <label className={labelClass}>Administered By</label>
          <input value={form.administered_by} onChange={e => setForm(f => ({ ...f, administered_by: e.target.value }))} className={inputClass} placeholder="Your name + credentials" />
        </div>
      </div>

      {/* Trauma-sensitive notice */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">🌱</span>
        <div>
          <div className="font-semibold text-rose-800 text-sm">Trauma-Sensitive Administration</div>
          <div className="text-xs text-rose-700 mt-0.5">
            These questions ask about difficult past experiences. Administer in a private, safe setting. Inform the client they may skip questions they are not comfortable answering. Have a trauma-informed response ready if distress arises.
          </div>
        </div>
      </div>

      {/* Progress */}
      {answeredCount > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-rose-500 h-2 rounded-full transition-all" style={{ width: `${pctComplete}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{pctComplete}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">ACE score: <span className="font-bold text-slate-900">{totalScore}/{ACE.maxScore}</span></span>
            {allAnswered && <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${severity.color}`}>{severity.label}</span>}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-slate-900 mb-1">Instructions</p>
        <p className="text-sm text-slate-700">{ACE.instructions}</p>
        <p className="text-xs text-slate-500 mt-2">Each "Yes" response counts as 1 ACE point. Total score ranges from 0–10.</p>
      </div>

      {/* Questions grouped by category */}
      <div className="space-y-3">
        {ACE.questions.map((q, i) => {
          const response = answers[q.id];
          const isAnswered = response !== undefined && response !== null;
          const isPositive = response === true;
          return (
            <div key={q.id} className={`bg-white rounded-2xl border-2 p-5 transition-colors ${
              isAnswered ? (isPositive ? "border-rose-200 bg-rose-50/20" : "border-emerald-200") : "border-slate-200"
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                  isAnswered
                    ? isPositive ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {isAnswered ? (isPositive ? "!" : "✓") : i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{q.category}</div>
                  <p className="text-sm font-medium text-slate-900 mb-3">{q.text}</p>
                  <div className="flex gap-3">
                    <button type="button"
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: true }))}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                        response === true
                          ? "bg-rose-500 text-white border-rose-500"
                          : "border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600"
                      }`}>
                      YES
                    </button>
                    <button type="button"
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: false }))}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                        response === false
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                      }`}>
                      NO
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className={labelClass}>Clinical Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
          className={inputClass + " resize-none"} placeholder="Clinical observations, trauma history context, referral plan, client response to screening..." />
      </div>

      {/* Results preview */}
      {allAnswered && (
        <div className="border-2 border-slate-200 rounded-2xl p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-slate-900 text-lg">ACE Results</div>
            <div className="text-3xl font-bold text-slate-900">{totalScore}<span className="text-sm font-normal text-slate-400">/{ACE.maxScore}</span></div>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-bold ${severity.color}`}>{severity.label}</span>
          <p className="text-sm text-slate-600 mt-3">{severity.recommendation}</p>
          {totalScore >= 4 && (
            <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-rose-700">⚠ ACE score ≥ 4 is associated with significantly increased risk for chronic illness, mental health disorders, and substance use. Trauma-specialized assessment and referral is strongly recommended.</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/screenings" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button onClick={handleSubmit} disabled={!allAnswered || !form.client_id || saving}
          className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-500 disabled:opacity-50">
          {saving ? "Saving..." : "Save ACE →"}
        </button>
      </div>
    </div>
  );
}

export default function AceNewPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><AceForm /></Suspense>;
}
