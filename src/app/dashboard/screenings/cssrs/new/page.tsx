"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CSSRS, getCSSRSRisk } from "@/lib/cssrs";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }

function CSSRSForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [form, setForm] = useState({ client_id: "", client_name: "", administered_by: "", notes: "" });
  const [ideation, setIdeation] = useState<Record<string, boolean>>({});
  const [intensity, setIntensity] = useState<Record<string, number>>({});
  const [behavior, setBehavior] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<"ideation" | "intensity" | "behavior" | "results">("ideation");

  useEffect(() => {
    const cid = params.get("client_id");
    if (cid) fetch(`/api/clients/${cid}`, { credentials: "include" }).then(r => r.json()).then(d => {
      if (d.client) setForm(f => ({ ...f, client_id: d.client.id, client_name: `${d.client.last_name}, ${d.client.first_name}` }));
    });
  }, []);

  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" }).then(r => r.json()).then(d => setClients(d.clients || []));
    } else setClients([]);
  }, [clientSearch]);

  const anyIdeation = Object.values(ideation).some(v => v);
  const highestIdeation = Object.entries(ideation).filter(([, v]) => v).map(([k]) => parseInt(k.replace("i", ""))).reduce((max, n) => Math.max(max, n), 0);
  const risk = getCSSRSRisk(ideation, behavior);

  async function handleSave() {
    if (!form.client_id) return;
    setSaving(true);
    const res = await fetch("/api/screenings", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        ...form, tool: "cssrs",
        answers: { ideation, intensity, behavior },
        total_score: highestIdeation,
        severity_label: risk.level,
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/dashboard/screenings/cssrs/${data.screening.id}`);
    else setSaving(false);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/screenings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">C-SSRS</h1>
          <p className="text-slate-500 text-sm mt-0.5">Columbia Suicide Severity Rating Scale</p>
        </div>
      </div>

      {/* IMMINENT RISK ALERT */}
      {(ideation.i5 || behavior.b4) && (
        <div className="bg-red-600 rounded-2xl p-5 text-white flex items-start gap-3 animate-pulse">
          <span className="text-3xl flex-shrink-0">🚨</span>
          <div>
            <div className="font-bold text-xl">EMERGENCY — IMMINENT RISK</div>
            <div className="text-red-100 mt-1">Client has endorsed {ideation.i5 ? "suicidal ideation with specific plan and intent" : "an actual suicide attempt"}. Do NOT leave client alone. Call 911 or mobile crisis immediately.</div>
          </div>
        </div>
      )}

      {/* HIGH RISK ALERT */}
      {!ideation.i5 && !behavior.b4 && (ideation.i4 || behavior.b2 || behavior.b3) && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-bold text-orange-900">HIGH RISK — Immediate Intervention Required</div>
            <div className="text-orange-700 text-sm mt-0.5">Consider psychiatric hospitalization. Contact crisis services. Do not leave alone.</div>
          </div>
        </div>
      )}

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

      {/* Step tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[
          { key: "ideation", label: "Ideation" },
          { key: "intensity", label: "Intensity", disabled: !anyIdeation },
          { key: "behavior", label: "Behavior" },
          { key: "results", label: "Results" },
        ].map(s => (
          <button key={s.key} type="button"
            onClick={() => !s.disabled && setStep(s.key as typeof step)}
            disabled={s.disabled}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${step === s.key ? "bg-white text-slate-900 shadow-sm" : s.disabled ? "text-slate-300 cursor-not-allowed" : "text-slate-500 hover:text-slate-700"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* IDEATION SUBSCALE */}
      {step === "ideation" && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
            <strong>Instructions:</strong> {CSSRS.ideation.description}
          </div>
          {CSSRS.ideation.questions.map((q, i) => (
            <div key={q.id} className={`bg-white rounded-2xl border-2 p-5 transition-colors ${ideation[q.id] ? "border-red-300 bg-red-50/30" : "border-slate-200"}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${ideation[q.id] !== undefined ? (ideation[q.id] ? "bg-red-500 text-white" : "bg-emerald-500 text-white") : "bg-slate-100 text-slate-500"}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{q.label}</div>
                  <p className="text-sm font-medium text-slate-900">{q.text}</p>
                </div>
              </div>
              <div className="flex gap-3 ml-11">
                <button type="button" onClick={() => setIdeation(a => ({ ...a, [q.id]: true }))}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${ideation[q.id] === true ? "bg-red-500 text-white border-red-500" : "border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600"}`}>
                  YES
                </button>
                <button type="button" onClick={() => setIdeation(a => ({ ...a, [q.id]: false }))}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${ideation[q.id] === false ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600"}`}>
                  NO
                </button>
              </div>
              {ideation[q.id] && q.severity >= 3 && (
                <div className={`mt-3 ml-11 text-xs font-semibold px-3 py-1.5 rounded-lg ${q.severity >= 5 ? "bg-red-100 text-red-700" : q.severity >= 4 ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                  ⚠️ Severity Level {q.severity} — {q.severity >= 5 ? "IMMINENT RISK" : q.severity >= 4 ? "HIGH RISK" : "MODERATE RISK"}
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3">
            {anyIdeation && <button type="button" onClick={() => setStep("intensity")} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">Rate Intensity →</button>}
            <button type="button" onClick={() => setStep("behavior")} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">Skip to Behavior →</button>
          </div>
        </div>
      )}

      {/* INTENSITY SUBSCALE */}
      {step === "intensity" && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
            <strong>Rate intensity for the MOST SEVERE ideation endorsed above (Level {highestIdeation}).</strong>
          </div>
          {CSSRS.intensity.questions.map(q => (
            <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{q.label}</div>
              <p className="text-sm font-medium text-slate-900 mb-3">{q.text}</p>
              <div className="space-y-2">
                {q.options.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setIntensity(i => ({ ...i, [q.id]: opt.value }))}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border-2 transition-all flex items-center gap-3 ${intensity[q.id] === opt.value ? "bg-teal-50 border-teal-400 text-teal-900" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${intensity[q.id] === opt.value ? "bg-teal-500 border-teal-500" : "border-slate-300"}`}>
                      {intensity[q.id] === opt.value && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-500 w-4">{opt.value}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep("ideation")} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
            <button type="button" onClick={() => setStep("behavior")} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">Next: Behavior →</button>
          </div>
        </div>
      )}

      {/* BEHAVIOR SUBSCALE */}
      {step === "behavior" && (
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700">
            <strong>Past 3 months:</strong> {CSSRS.behavior.description}
          </div>
          {CSSRS.behavior.questions.map((q, i) => (
            <div key={q.id} className={`bg-white rounded-2xl border-2 p-5 ${behavior[q.id] ? "border-red-300 bg-red-50/30" : "border-slate-200"}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className="text-sm font-bold text-slate-400 w-5 flex-shrink-0 mt-0.5">{i + 1}</div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{q.label}</div>
                  <p className="text-sm font-medium text-slate-900">{q.text}</p>
                  {q.note && <p className="text-xs text-slate-400 italic mt-1">{q.note}</p>}
                </div>
              </div>
              <div className="flex gap-3 ml-7">
                <button type="button" onClick={() => setBehavior(b => ({ ...b, [q.id]: true }))}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 ${behavior[q.id] === true ? "bg-red-500 text-white border-red-500" : "border-slate-200 text-slate-600 hover:border-red-300"}`}>YES</button>
                <button type="button" onClick={() => setBehavior(b => ({ ...b, [q.id]: false }))}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 ${behavior[q.id] === false ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-200 text-slate-600 hover:border-emerald-300"}`}>NO</button>
              </div>
            </div>
          ))}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(anyIdeation ? "intensity" : "ideation")} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
            <button type="button" onClick={() => setStep("results")} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">View Results →</button>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {step === "results" && (
        <div className="space-y-4">
          <div className={`border-2 rounded-2xl p-6 ${risk.borderColor}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-2xl text-slate-900">Risk Level</div>
              <span className={`text-lg px-4 py-2 rounded-xl font-bold ${risk.color}`}>{risk.level}</span>
            </div>
            <p className="text-slate-600 text-sm mb-3">{risk.description}</p>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Recommended Action</div>
              <p className="text-sm font-medium text-slate-900">{risk.action}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-900">Assessment Summary</h3>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ideation</div>
              {CSSRS.ideation.questions.map(q => ideation[q.id] !== undefined && (
                <div key={q.id} className="flex items-center gap-2 text-sm py-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${ideation[q.id] ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{ideation[q.id] ? "YES" : "NO"}</span>
                  <span className="text-slate-700">{q.label}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Behavior</div>
              {CSSRS.behavior.questions.map(q => behavior[q.id] !== undefined && (
                <div key={q.id} className="flex items-center gap-2 text-sm py-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${behavior[q.id] ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{behavior[q.id] ? "YES" : "NO"}</span>
                  <span className="text-slate-700">{q.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <label className={labelClass}>Clinical Notes & Safety Plan</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={4}
              className={inputClass + " resize-none"} placeholder="Safety plan, clinical observations, follow-up actions, reason for not hospitalizing if high risk..." />
          </div>

          <div className="flex gap-3 justify-end pb-6">
            <button type="button" onClick={() => setStep("behavior")} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
            <button onClick={handleSave} disabled={!form.client_id || saving}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 text-white ${risk.level.includes("High") || risk.level.includes("Imminent") ? "bg-red-500 hover:bg-red-400" : "bg-teal-500 hover:bg-teal-400"}`}>
              {saving ? "Saving..." : "Save C-SSRS Assessment →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CSSRSPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><CSSRSForm /></Suspense>;
}
