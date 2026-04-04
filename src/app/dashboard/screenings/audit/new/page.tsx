"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AUDIT, getAUDITScore, getAUDITSeverity } from "@/lib/substanceScreenings";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; }

function AuditForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
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

  const totalScore = getAUDITScore(answers);
  const severity = getAUDITSeverity(totalScore);
  const answeredCount = AUDIT.questions.filter(q => answers[q.id] !== undefined).length;
  const allAnswered = answeredCount === AUDIT.questions.length;
  const pctComplete = Math.round((answeredCount / AUDIT.questions.length) * 100);

  async function handleSubmit() {
    if (!form.client_id || !allAnswered) return;
    setSaving(true);
    const res = await fetch("/api/screenings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        tool: "audit",
        answers,
        total_score: totalScore,
        severity_label: severity.label,
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/dashboard/screenings/audit/${data.screening.id}`);
    else setSaving(false);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AUDIT — Alcohol Use Disorders Identification Test</h1>
          <p className="text-slate-500 text-sm mt-0.5">WHO validated alcohol use screening · 10 questions · Max score 40</p>
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

      {/* Progress */}
      {answeredCount > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${pctComplete}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{pctComplete}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Running score: <span className="font-bold text-slate-900">{totalScore}/{AUDIT.maxScore}</span></span>
            {allAnswered && <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${severity.color}`}>{severity.label}</span>}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-amber-900 mb-1">Instructions</p>
        <p className="text-sm text-amber-800">{AUDIT.instructions}</p>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {AUDIT.questions.map((q, i) => (
          <div key={q.id} className={`bg-white rounded-2xl border-2 p-5 transition-colors ${answers[q.id] !== undefined ? "border-amber-200" : "border-slate-200"}`}>
            <div className="flex items-start gap-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${answers[q.id] !== undefined ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                {answers[q.id] !== undefined ? "✓" : i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 mb-3">{q.text}</p>
                <div className="space-y-2">
                  {q.options.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.value }))}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border-2 transition-all flex items-center gap-3 ${
                        answers[q.id] === opt.value
                          ? "bg-amber-50 border-amber-400 text-amber-900 font-semibold"
                          : "border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        answers[q.id] === opt.value ? "bg-amber-500 border-amber-500" : "border-slate-300"
                      }`}>
                        {answers[q.id] === opt.value && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-400 w-4">{opt.value}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className={labelClass}>Clinical Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
          className={inputClass + " resize-none"} placeholder="Clinical observations, context, referral plan..." />
      </div>

      {/* Results preview */}
      {allAnswered && (
        <div className={`border-2 rounded-2xl p-5 bg-white`}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-slate-900 text-lg">AUDIT Results</div>
            <div className="text-3xl font-bold text-slate-900">{totalScore}<span className="text-sm font-normal text-slate-400">/{AUDIT.maxScore}</span></div>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-bold ${severity.color}`}>{severity.label}</span>
          <p className="text-sm text-slate-600 mt-3">{severity.recommendation}</p>
        </div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/screenings" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button onClick={handleSubmit} disabled={!allAnswered || !form.client_id || saving}
          className="bg-amber-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-400 disabled:opacity-50">
          {saving ? "Saving..." : "Save AUDIT →"}
        </button>
      </div>
    </div>
  );
}

export default function AuditNewPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><AuditForm /></Suspense>;
}
