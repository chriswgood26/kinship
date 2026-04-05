"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MMSE, getCognitiveScore, getCognitiveSeverity, getDomainScore } from "@/lib/cognitiveScreenings";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; }

function MMSEForm() {
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

  const allItems = MMSE.domains.flatMap(d => d.items);
  const answeredCount = allItems.filter(item => answers[item.id] !== undefined).length;
  const allAnswered = answeredCount === allItems.length;
  const totalScore = getCognitiveScore(answers, MMSE);
  const severity = getCognitiveSeverity(totalScore, MMSE);
  const pctComplete = Math.round((answeredCount / allItems.length) * 100);

  function setItemScore(itemId: string, pts: number) {
    setAnswers(a => ({ ...a, [itemId]: pts }));
  }

  async function handleSubmit() {
    if (!form.client_id || !allAnswered) return;
    setSaving(true);
    const res = await fetch("/api/screenings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        tool: "mmse",
        answers,
        total_score: totalScore,
        severity_label: severity.label,
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/dashboard/screenings/mmse/${data.screening.id}`);
    else setSaving(false);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">MMSE — Mini-Mental State Examination</h1>
          <p className="text-slate-500 text-sm mt-0.5">Clinician-administered · 30 points · Orientation, memory, language, and praxis</p>
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
              <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${pctComplete}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{pctComplete}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Running score: <span className="font-bold text-slate-900">{totalScore}/{MMSE.maxScore}</span></span>
            {allAnswered && <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${severity.color}`}>{severity.label}</span>}
          </div>
        </div>
      )}

      {/* Administration note */}
      <div className="bg-purple-50 border border-purple-100 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-purple-900 mb-1">Administration Instructions</p>
        <p className="text-sm text-purple-800">Ask each question in order. Record the score for each item based on the client&apos;s response. Do not give credit for approximations or near-correct answers unless noted.</p>
        <p className="text-xs text-purple-600 mt-2">Standard cutoff: ≥24 = no significant impairment · 18–23 = mild · 10–17 = moderate · ≤9 = severe.</p>
      </div>

      {/* Domain-based scoring */}
      <div className="space-y-4">
        {MMSE.domains.map(domain => {
          const domainScore = getDomainScore(answers, domain);
          const domainAnswered = domain.items.filter(item => answers[item.id] !== undefined).length;
          return (
            <div key={domain.id} className={`rounded-2xl border p-5 ${domain.bgColor}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`font-bold text-base ${domain.color}`}>{domain.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{domainAnswered}/{domain.items.length} items scored · max {domain.maxPoints} pts</p>
                </div>
                <div className={`text-2xl font-bold ${domain.color}`}>
                  {domainAnswered > 0 ? domainScore : "—"}<span className="text-sm font-normal text-slate-400">/{domain.maxPoints}</span>
                </div>
              </div>

              <div className="space-y-3">
                {domain.items.map((item, idx) => {
                  const current = answers[item.id];
                  const isAnswered = current !== undefined;
                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-white/80 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                          isAnswered ? (current > 0 ? "bg-emerald-500 text-white" : "bg-slate-300 text-white") : "bg-slate-100 text-slate-500"
                        }`}>
                          {isAnswered ? (current > 0 ? current : "0") : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 mb-1">{item.text}</p>
                          {item.adminNote && (
                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">{item.adminNote}</p>
                          )}
                          {/* Score buttons */}
                          {item.maxPoints === 1 ? (
                            <div className="flex gap-2">
                              <button type="button"
                                onClick={() => setItemScore(item.id, 1)}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                                  current === 1 ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                                }`}>
                                ✓ Pass (1 pt)
                              </button>
                              <button type="button"
                                onClick={() => setItemScore(item.id, 0)}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                                  current === 0 ? "bg-red-400 text-white border-red-400" : "border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-500"
                                }`}>
                                ✗ Fail (0 pts)
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              {Array.from({ length: item.maxPoints + 1 }, (_, i) => i).map(pts => (
                                <button key={pts} type="button"
                                  onClick={() => setItemScore(item.id, pts)}
                                  className={`py-2 px-3 rounded-xl font-bold text-sm border-2 transition-all ${
                                    current === pts
                                      ? pts === 0 ? "bg-red-400 text-white border-red-400"
                                        : pts === item.maxPoints ? "bg-emerald-500 text-white border-emerald-500"
                                        : "bg-amber-400 text-white border-amber-400"
                                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                                  }`}>
                                  {pts} pt{pts !== 1 ? "s" : ""}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className={labelClass}>Clinical Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
          className={inputClass + " resize-none"} placeholder="Behavioral observations, cooperation level, sensory/motor limitations, referral plan..." />
      </div>

      {/* Results preview */}
      {allAnswered && (
        <div className="border-2 border-purple-200 rounded-2xl p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-slate-900 text-lg">MMSE Results</div>
            <div className="text-3xl font-bold text-slate-900">{totalScore}<span className="text-sm font-normal text-slate-400">/{MMSE.maxScore}</span></div>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-bold ${severity.color}`}>{severity.label}</span>
          <p className="text-sm text-slate-600 mt-3">{severity.recommendation}</p>
        </div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/screenings" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button onClick={handleSubmit} disabled={!allAnswered || !form.client_id || saving}
          className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-500 disabled:opacity-50">
          {saving ? "Saving..." : "Save MMSE →"}
        </button>
      </div>
    </div>
  );
}

export default function MMSENewPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><MMSEForm /></Suspense>;
}
