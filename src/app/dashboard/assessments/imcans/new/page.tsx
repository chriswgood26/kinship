"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EncounterContextBanner from "@/components/EncounterContextBanner";
import EncounterAttachment from "@/components/EncounterAttachment";
import ClientTimelineDrawer from "@/components/ClientTimelineDrawer";
import { Suspense } from "react";
import { IMCANS_DOMAINS, RATING_LABELS, calcTotalNeedScore, calcLOC, calcDomainScore } from "@/lib/imcans";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; date_of_birth?: string | null; }

function IMCANSForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});

  const [form, setForm] = useState({
    client_id: "", patient_name: "",
    assessment_date: new Date().toISOString().split("T")[0],
    assessor_name: "",
    clinical_notes: "",
  });

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`)
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  // Pre-fill patient from URL param
  useEffect(() => {
    const pid = params.get("patient_id");
    if (pid) {
      fetch(`/api/clients/${pid}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          const p = d.patient || d.client;
          if (p) setForm(f => ({ ...f, client_id: p.id, patient_name: `${p.last_name}, ${p.first_name}` }));
        })
        .catch(() => {});
    }
  }, []);

  // Auto-fill assessor name from user profile
  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          const name = [d.profile.first_name, d.profile.last_name].filter(Boolean).join(" ");
          const creds = d.profile.credentials || d.profile.title || "";
          setForm(f => ({ ...f, assessor_name: creds ? `${name}, ${creds}` : name }));
        }
      })
      .catch(() => {});
  }, []);

  const totalScore = calcTotalNeedScore(scores);
  const locRecommendation = calcLOC(totalScore);

  const allItems = IMCANS_DOMAINS.flatMap(d => d.items);
  const ratedItems = allItems.filter(item => scores[item.id] !== undefined).length;
  const progress = Math.round((ratedItems / allItems.length) * 100);

  async function handleSave(status: "in_progress" | "completed") {
    if (!form.client_id) { setError("Select a client"); return; }
    setSaving(true);
    const res = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        assessment_type: "IM+CANS",
        scores,
        total_score: totalScore,
        level_of_care: locRecommendation,
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/assessments/imcans/${data.assessment.id}`);
  }

  const domain = IMCANS_DOMAINS[activeTab];
  const domainScore = domain ? calcDomainScore(scores, domain) : 0;

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <EncounterContextBanner encounterId={params.get("encounter_id")} patientId={params.get("patient_id") || params.get("client_id")} />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/assessments" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IM+CANS Assessment</h1>
          <p className="text-slate-500 text-sm mt-0.5">Illinois Integrated Assessment — Child & Adolescent Needs and Strengths</p>
        </div>
      </div>

      {/* Header info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Patient */}
          <div className="relative col-span-2">
            <label className={labelClass}>Client *</label>
            {form.patient_name ? (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
                <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "" }))} className="text-teal-500 text-sm">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input type="text" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search client..." />
                {patients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                    {patients.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setForm(f => ({ ...f, client_id: p.id, patient_name: `${p.last_name}, ${p.first_name}` })); setPatientSearch(""); setPatients([]); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                        <div className="font-semibold text-sm text-slate-900">{p.last_name}, {p.first_name}</div>
                        <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Assessment Date</label>
            <input type="date" value={form.assessment_date} onChange={e => setForm(f => ({ ...f, assessment_date: e.target.value }))} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Assessor Name</label>
            <input value={form.assessor_name} onChange={e => setForm(f => ({ ...f, assessor_name: e.target.value }))} className={inputClass} placeholder="Your name + credentials" />
          </div>
        </div>

        {/* Progress + score */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Progress</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-semibold text-slate-700">{progress}%</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{ratedItems} of {allItems.length} items rated</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Total Need Score</div>
            <div className="text-3xl font-bold text-slate-900">{totalScore}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Level of Care Rec.</div>
            <div className="text-sm font-semibold text-teal-700">{locRecommendation}</div>
          </div>
        </div>
      </div>

      {/* Domain tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {IMCANS_DOMAINS.map((d, i) => {
          const dScore = calcDomainScore(scores, d);
          const ratedInDomain = d.items.filter(item => scores[item.id] !== undefined).length;
          return (
            <button key={d.id} onClick={() => setActiveTab(i)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${activeTab === i ? "bg-[#0d1b2e] text-white border-[#0d1b2e]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {d.icon} {d.label.split(" ")[0]}
              {ratedInDomain > 0 && (
                <span className={`ml-1 text-xs ${activeTab === i ? "text-teal-300" : "text-slate-400"}`}>
                  ({ratedInDomain}/{d.items.length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Current domain */}
      {domain && (
        <div className={`bg-white rounded-2xl border-2 overflow-hidden ${domain.color}`}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{domain.icon}</span>
              <h2 className="font-bold text-slate-900">{domain.label}</h2>
              {domain.isStrengths && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Strengths — Higher is Better</span>}
            </div>
            <div className="text-sm font-semibold text-slate-600">Domain Score: <span className="text-lg font-bold text-slate-900">{domainScore}</span></div>
          </div>

          <div className="divide-y divide-slate-100">
            {domain.items.map(item => {
              const score = scores[item.id];
              return (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-sm mb-0.5">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.description}</div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {RATING_LABELS.map(r => (
                        <button key={r.value} type="button"
                          onClick={() => setScores(s => ({ ...s, [item.id]: r.value }))}
                          className={`w-9 h-9 rounded-xl text-sm font-bold border-2 transition-all ${
                            score === r.value
                              ? `${r.color} scale-110 shadow-sm`
                              : "border-slate-200 text-slate-400 hover:border-slate-300 bg-white"
                          }`}>
                          {r.value}
                        </button>
                      ))}
                    </div>
                  </div>
                  {score !== undefined && (
                    <div className={`mt-1.5 text-xs px-2 py-0.5 rounded-full inline-block font-medium ${RATING_LABELS[score]?.color}`}>
                      {RATING_LABELS[score]?.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation between domains */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setActiveTab(Math.max(0, activeTab - 1)); window.scrollTo({top: 0, behavior: 'smooth'}); }} disabled={activeTab === 0}
          className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-30">
          ← Previous Domain
        </button>
        <span className="text-xs text-slate-400">{activeTab + 1} of {IMCANS_DOMAINS.length}</span>
        {activeTab < IMCANS_DOMAINS.length - 1 ? (
          <button onClick={() => { setActiveTab(Math.min(IMCANS_DOMAINS.length - 1, activeTab + 1)); window.scrollTo({top: 0, behavior: 'smooth'}); }}
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
            Next Domain →
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => handleSave("in_progress")} disabled={saving}
              className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
              Save Draft
            </button>
            <button onClick={() => handleSave("completed")} disabled={saving || !form.client_id}
              className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
              {saving ? "Saving..." : "Complete Assessment"}
            </button>
          </div>
        )}
      </div>

      {/* Clinical notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className={labelClass}>Clinical Notes / Observations</label>
        <textarea value={form.clinical_notes} onChange={e => setForm(f => ({ ...f, clinical_notes: e.target.value }))}
          rows={4} className={inputClass + " resize-none"}
          placeholder="Clinical impressions, contextual factors, observations during assessment..." />
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Bottom save */}
      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/assessments" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button onClick={() => handleSave("in_progress")} disabled={saving}
          className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
          Save Draft
        </button>
        <button onClick={() => handleSave("completed")} disabled={saving || !form.client_id}
          className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
          {saving ? "Saving..." : "Complete Assessment"}
        </button>
      </div>
      {form.client_id && <ClientTimelineDrawer clientId={form.client_id} />}
    </div>
  );
}

export default function NewIMCANSPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><IMCANSForm /></Suspense>;
}
