"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BASIS24,
  getBasis24Score,
  getSubscaleScore,
  getBasis24Severity,
  hasSelfHarmFlag,
} from "@/lib/basis24";

function BASIS24Form() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<{ id: string; first_name: string; last_name: string; mrn: string | null }[]>([]);
  const [form, setForm] = useState({
    client_id: params.get("patient_id") || "",
    patient_name: "",
    administered_by: "",
    notes: "",
  });

  useEffect(() => {
    const pid = params.get("patient_id");
    if (pid) {
      fetch(`/api/clients/${pid}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          if (d.client)
            setForm(f => ({ ...f, client_id: d.client.id, patient_name: `${d.client.last_name}, ${d.client.first_name}` }));
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setClients(d.patients || []));
    } else {
      setClients([]);
    }
  }, [clientSearch]);

  const answered = Object.keys(answers).filter(k => BASIS24.questions.some(q => q.id === k)).length;
  const total = BASIS24.questions.length;
  const pctComplete = Math.round((answered / total) * 100);
  const allAnswered = answered === total;

  const meanScore = getBasis24Score(answers);
  const severity = getBasis24Severity(meanScore);
  const selfHarm = hasSelfHarmFlag(answers);

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  async function handleSubmit() {
    if (!form.client_id) return;
    setSaving(true);
    const res = await fetch("/api/screenings-tool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_id: form.client_id,
        tool: "basis24",
        answers,
        total_score: meanScore,
        severity_label: severity.label,
        administered_by: form.administered_by || null,
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/dashboard/assessments/basis24/${data.screening.id}`);
    } else {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/assessments" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">BASIS-24</h1>
          <p className="text-slate-500 text-sm mt-0.5">Behavior and Symptom Identification Scale — McLean Hospital</p>
        </div>
      </div>

      {/* Client + clinician */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="relative">
          <label className={labelClass}>Client *</label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "" }))}
                className="text-teal-500 text-sm"
              >✕</button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className={inputClass}
                placeholder="Search client by name or MRN..."
              />
              {clients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {clients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setForm(f => ({ ...f, client_id: c.id, patient_name: `${c.last_name}, ${c.first_name}` }));
                        setClientSearch("");
                        setClients([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    >
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
          <input
            value={form.administered_by}
            onChange={e => setForm(f => ({ ...f, administered_by: e.target.value }))}
            className={inputClass}
            placeholder="Clinician name + credentials"
          />
        </div>
      </div>

      {/* Progress */}
      {answered > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${pctComplete}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{answered}/{total}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Mean score: <span className="font-bold text-slate-900">{meanScore.toFixed(2)}</span>
              <span className="text-slate-400"> / 4.00</span>
            </span>
            {allAnswered && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${severity.color}`}>
                {severity.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Self-harm alert */}
      {selfHarm && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🚨</span>
          <div>
            <div className="font-bold text-red-800">Self-Harm / Suicidal Ideation Flagged</div>
            <div className="text-sm text-red-700 mt-0.5">
              Items 10 or 11 were endorsed. Conduct a full suicide risk assessment immediately and document safety planning.
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-slate-900 mb-2">{BASIS24.instructions}</p>
        <div className="flex flex-wrap gap-2">
          {BASIS24.ratingOptions.map(r => (
            <span key={r.value} className="text-xs bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
              {r.value} = {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Questions grouped by subscale */}
      {BASIS24.subscales.map(sub => (
        <div key={sub.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className={`px-5 py-3 border-b border-slate-100 flex items-center justify-between`}>
            <span className="font-semibold text-slate-800 text-sm">{sub.label}</span>
            {(() => {
              const ss = getSubscaleScore(answers, sub.id);
              return ss !== null ? (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${sub.color}`}>
                  {ss.toFixed(2)} mean
                </span>
              ) : null;
            })()}
          </div>
          <div className="divide-y divide-slate-50">
            {BASIS24.questions
              .filter(q => q.subscale === sub.id)
              .map((q, idx) => {
                const qIdx = BASIS24.questions.findIndex(x => x.id === q.id);
                const isSelfHarmItem = q.id === "q10" || q.id === "q11";
                return (
                  <div
                    key={q.id}
                    className={`p-5 ${isSelfHarmItem && (answers[q.id] || 0) > 0 ? "bg-red-50" : ""}`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${answers[q.id] !== undefined ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {answers[q.id] !== undefined ? "✓" : qIdx + 1}
                      </div>
                      <p className="text-sm font-medium text-slate-900 pt-1">{q.text}</p>
                    </div>
                    <div className="grid grid-cols-5 gap-2 ml-10">
                      {BASIS24.ratingOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.value }))}
                          className={`py-2 px-1 rounded-xl text-xs font-semibold border-2 transition-all text-center ${
                            answers[q.id] === opt.value
                              ? opt.value === 0 ? "bg-emerald-500 text-white border-emerald-500"
                                : opt.value === 1 ? "bg-blue-500 text-white border-blue-500"
                                : opt.value === 2 ? "bg-amber-500 text-white border-amber-500"
                                : opt.value === 3 ? "bg-orange-500 text-white border-orange-500"
                                : "bg-red-500 text-white border-red-500"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <div className="text-base font-bold">{opt.value}</div>
                          <div className="text-[10px] leading-tight">{opt.label}</div>
                        </button>
                      ))}
                    </div>
                    {isSelfHarmItem && (answers[q.id] || 0) > 0 && (
                      <div className="ml-10 mt-2 text-xs font-bold text-red-600">🚨 Self-harm indicator</div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className={labelClass}>Clinical Notes</label>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={3}
          className={inputClass}
          placeholder="Optional clinical observations..."
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pb-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !form.client_id || !allAnswered}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {saving ? "Saving…" : "Save BASIS-24"}
        </button>
        <Link href="/dashboard/assessments" className="text-slate-500 text-sm hover:text-slate-700">Cancel</Link>
        {!form.client_id && (
          <span className="text-xs text-amber-600 font-medium">Select a client to continue</span>
        )}
        {form.client_id && !allAnswered && (
          <span className="text-xs text-amber-600 font-medium">{total - answered} item{total - answered !== 1 ? "s" : ""} remaining</span>
        )}
      </div>
    </div>
  );
}

export default function BASIS24NewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
      <BASIS24Form />
    </Suspense>
  );
}
