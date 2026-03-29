"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RATING_OPTIONS, getScore, isSuicidalIdeation } from "@/lib/screenings";

interface Question { id: string; text: string; }
interface Tool {
  id: string; name: string; fullName: string; instructions: string; maxScore: number;
  questions: Question[];
  bonus?: { id: string; text: string; options: { value: number; label: string }[] };
  severity: { max: number; label: string; color: string; recommendation: string }[];
}
interface Client { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }

interface Props {
  tool: Tool;
  prefilledClientId?: string;
}

export default function ScreeningForm({ tool, prefilledClientId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ client_id: prefilledClientId || "", client_name: "", administered_by: "", notes: "" });
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (prefilledClientId) {
      fetch(`/api/clients/${prefilledClientId}`, { credentials: "include" }).then(r => r.json()).then(d => {
        if (d.client) setForm(f => ({ ...f, client_id: d.client.id, client_name: `${d.client.last_name}, ${d.client.first_name}` }));
      });
    }
  }, []);

  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" }).then(r => r.json()).then(d => setClients(d.clients || []));
    } else setClients([]);
  }, [clientSearch]);

  const totalScore = getScore(answers, tool.questions);
  const severityItem = tool.severity.find((s: {max: number}) => totalScore <= s.max) || tool.severity[tool.severity.length - 1];
  const severity = severityItem as { max: number; label: string; color: string; recommendation: string };
  const allAnswered = tool.questions.every(q => answers[q.id] !== undefined);
  const hasSI = tool.id === "phq9" && isSuicidalIdeation(answers);
  const pctComplete = Math.round((Object.keys(answers).filter(k => tool.questions.some(q => q.id === k)).length / tool.questions.length) * 100);

  async function handleSubmit() {
    if (!form.client_id) return;
    setSaving(true);
    const res = await fetch("/api/screenings", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form, tool: tool.id, answers, total_score: totalScore, severity_label: severity.label }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/dashboard/screenings/${tool.id}/${data.screening.id}`);
    else setSaving(false);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{tool.name} — {tool.fullName}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tool.description}</p>
        </div>
      </div>

      {/* Client + info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="relative">
          <label className={labelClass}>Client *</label>
          {form.client_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.client_name}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", client_name: "" }))} className="text-teal-500 text-sm">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} className={inputClass} placeholder="Search client..." />
              {clients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {clients.map(c => (
                    <button key={c.id} type="button" onClick={() => { setForm(f => ({ ...f, client_id: c.id, client_name: `${c.last_name}, ${c.first_name}` })); setClientSearch(""); setClients([]); }}
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
        <div><label className={labelClass}>Administered By</label>
          <input value={form.administered_by} onChange={e => setForm(f => ({ ...f, administered_by: e.target.value }))} className={inputClass} placeholder="Your name + credentials" />
        </div>
      </div>

      {/* Progress */}
      {Object.keys(answers).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${pctComplete}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{pctComplete}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Running score: <span className="font-bold text-slate-900">{totalScore}/{tool.maxScore}</span></span>
            {allAnswered && <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${severity.color}`}>{severity.label}</span>}
          </div>
        </div>
      )}

      {/* SI Alert */}
      {hasSI && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🚨</span>
          <div>
            <div className="font-bold text-red-800">Suicidal Ideation Flagged</div>
            <div className="text-sm text-red-700 mt-0.5">Client endorsed question 9 (thoughts of self-harm). Conduct a full suicide risk assessment immediately. Document safety planning.</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-slate-900 mb-1">{tool.instructions}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {RATING_OPTIONS.map(r => (
            <span key={r.value} className="text-xs bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
              {r.value} = {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {tool.questions.map((q, i) => (
          <div key={q.id} className={`bg-white rounded-2xl border-2 p-5 transition-colors ${answers[q.id] !== undefined ? "border-teal-200" : "border-slate-200"}`}>
            <div className="flex items-start gap-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${answers[q.id] !== undefined ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                {answers[q.id] !== undefined ? "✓" : i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 mb-3">{q.text}</p>
                <div className="grid grid-cols-4 gap-2">
                  {RATING_OPTIONS.map(option => (
                    <button key={option.value} type="button"
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: option.value }))}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold border-2 transition-all text-center ${
                        answers[q.id] === option.value
                          ? option.value === 0 ? "bg-emerald-500 text-white border-emerald-500"
                            : option.value === 1 ? "bg-blue-500 text-white border-blue-500"
                            : option.value === 2 ? "bg-amber-500 text-white border-amber-500"
                            : "bg-red-500 text-white border-red-500"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}>
                      <div className="text-lg font-bold">{option.value}</div>
                      <div className="text-[10px] leading-tight">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Bonus question */}
        {tool.bonus && allAnswered && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-900 mb-3">{tool.bonus.text}</p>
            <div className="grid grid-cols-4 gap-2">
              {tool.bonus.options.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setAnswers(a => ({ ...a, [tool.bonus!.id]: opt.value }))}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border-2 transition-all text-center ${answers[tool.bonus!.id] === opt.value ? "bg-slate-700 text-white border-slate-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className={labelClass}>Clinical Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
          className={inputClass + " resize-none"} placeholder="Clinical observations, context, follow-up plan..." />
      </div>

      {/* Results preview */}
      {allAnswered && (
        <div className={`border-2 rounded-2xl p-5 ${severity.color.replace("text-", "border-").split(" ")[0]} bg-white`}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-slate-900 text-lg">{tool.name} Results</div>
            <div className="text-3xl font-bold text-slate-900">{totalScore}<span className="text-sm font-normal text-slate-400">/{tool.maxScore}</span></div>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-bold ${severity.color}`}>{severity.label}</span>
          <p className="text-sm text-slate-600 mt-3">{severity.recommendation}</p>
          {hasSI && <p className="text-sm font-bold text-red-600 mt-2">⚠️ SAFETY ALERT: Suicidal ideation endorsed — immediate safety assessment required</p>}
        </div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/screenings" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button onClick={handleSubmit} disabled={!allAnswered || !form.client_id || saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : `Save ${tool.name} →`}
        </button>
      </div>
    </div>
  );
}
