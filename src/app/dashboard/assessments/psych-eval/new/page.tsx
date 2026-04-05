"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import EncounterContextBanner from "@/components/EncounterContextBanner";
import PatientTimelineDrawer from "@/components/ClientTimelineDrawer";

const SECTIONS = [
  { id: "identifying", label: "Identifying Information", icon: "👤" },
  { id: "hpi", label: "Chief Complaint & HPI", icon: "🎯" },
  { id: "psych_history", label: "Psychiatric History", icon: "🧠" },
  { id: "substance", label: "Substance Use", icon: "💊" },
  { id: "medical", label: "Medical History & ROS", icon: "🏥" },
  { id: "family", label: "Family Psychiatric History", icon: "👨‍👩‍👧" },
  { id: "social", label: "Social & Developmental", icon: "🌱" },
  { id: "mse", label: "Mental Status Exam", icon: "🔍" },
  { id: "risk", label: "Risk Assessment", icon: "⚠️" },
  { id: "formulation", label: "Diagnostic Formulation", icon: "📋" },
  { id: "treatment", label: "Treatment Plan", icon: "📝" },
];

function PsychEvalForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<{id:string;first_name:string;last_name:string;mrn:string|null}[]>([]);
  const [attachedEncounterId] = useState(params.get("encounter_id") || "");
  const [encounterPolicy, setEncounterPolicy] = useState<"no"|"yes"|"warn">("no");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("drcloud_clinical_settings");
      if (saved) try {
        const s = JSON.parse(saved);
        setEncounterPolicy(s.require_encounter_attachment || "no");
      } catch {}
    }
  }, []);

  const [form, setForm] = useState({
    client_id: params.get("patient_id") || "",
    encounter_id: params.get("encounter_id") || "",
    assessment_date: new Date().toISOString().split("T")[0],
    assessor_name: "",
    assessor_credentials: "",
    // Section 1 — Identifying Information
    referral_source: "",
    referral_reason: "",
    interpreter_needed: "no",
    interpreter_language: "",
    // Section 2 — Chief Complaint & HPI
    chief_complaint: "",
    hpi: "",
    symptom_onset: "",
    symptom_duration: "",
    symptom_course: "episodic",
    precipitating_events: "",
    previous_episodes: "no",
    // Section 3 — Psychiatric History
    previous_psych_treatment: "no",
    outpatient_history: "",
    inpatient_history: "",
    previous_diagnoses: "",
    previous_medications: "",
    medication_response: "",
    current_medications: "",
    medication_adherence: "n_a",
    // Section 4 — Substance Use
    alcohol_use: "none",
    alcohol_frequency: "",
    tobacco_use: "none",
    cannabis_use: "none",
    stimulant_use: "none",
    opioid_use: "none",
    other_substances: "",
    substance_treatment_history: "",
    last_use_date: "",
    // Section 5 — Medical History & ROS
    pcp_name: "",
    last_physical: "",
    medical_conditions: "",
    current_medical_meds: "",
    allergies: "",
    surgeries: "",
    head_trauma: "no",
    seizures: "no",
    neurological_issues: "",
    // Section 6 — Family Psychiatric History
    family_psych_history: "none",
    family_psych_details: "",
    family_suicide_history: "no",
    family_substance_history: "no",
    // Section 7 — Social & Developmental History
    birth_complications: "no",
    developmental_milestones: "normal",
    developmental_concerns: "",
    childhood_abuse: "no",
    educational_history: "",
    military_history: "no",
    military_details: "",
    relationship_status: "",
    living_situation: "",
    children: "",
    employment_status: "",
    legal_history: "none",
    legal_details: "",
    social_support: "",
    // Section 8 — Mental Status Examination
    mse_appearance: "",
    mse_grooming: "adequate",
    mse_eye_contact: "normal",
    mse_psychomotor: "normal",
    mse_attitude: "cooperative",
    mse_speech_rate: "normal",
    mse_speech_volume: "normal",
    mse_speech_quality: "",
    mse_mood: "",
    mse_affect: "euthymic",
    mse_affect_range: "full",
    mse_affect_congruence: "congruent",
    mse_thought_process: "linear",
    mse_thought_content: "",
    mse_delusions: "no",
    mse_hallucinations: "none",
    mse_hallucination_details: "",
    mse_obsessions: "no",
    mse_phobias: "no",
    mse_suicidal_ideation: "denied",
    mse_homicidal_ideation: "denied",
    mse_orientation: "x4",
    mse_memory_recent: "intact",
    mse_memory_remote: "intact",
    mse_concentration: "intact",
    mse_fund_of_knowledge: "average",
    mse_abstraction: "intact",
    mse_insight: "good",
    mse_judgment: "good",
    // Section 9 — Risk Assessment
    current_si: "none",
    si_plan: "no",
    si_intent: "no",
    si_means: "no",
    si_attempts_history: "no",
    si_attempt_details: "",
    current_hi: "no",
    self_harm_current: "no",
    self_harm_history: "no",
    self_harm_details: "",
    risk_level: "low",
    protective_factors: "",
    safety_plan_completed: "no",
    // Section 10 — Diagnostic Formulation
    axis1_diagnoses: "",
    axis2_considerations: "",
    medical_diagnoses: "",
    differential_diagnoses: "",
    clinical_formulation: "",
    gaf_score: "",
    // Section 11 — Treatment Plan
    level_of_care: "outpatient",
    treatment_modalities: [] as string[],
    medication_plan: "",
    therapy_referral: "no",
    therapy_type: "",
    frequency_of_visits: "",
    goals: "",
    follow_up_plan: "",
    additional_referrals: "",
    clinician_signature: "",
  });

  const set = (k: string, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));

  // Pre-fill patient from URL param
  useEffect(() => {
    const pid = params.get("patient_id");
    if (pid) {
      fetch(`/api/clients/${pid}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          const p = d.patient || d.client;
          if (p) {
            setForm(f => ({ ...f, client_id: p.id }));
            setPatientName(`${p.last_name}, ${p.first_name}`);
          }
        }).catch(() => {});
    }
    const eid = params.get("encounter_id");
    if (eid) setForm(f => ({ ...f, encounter_id: eid }));
  }, []);

  // Auto-fill assessor
  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          const name = [d.profile.first_name, d.profile.last_name].filter(Boolean).join(" ");
          const creds = d.profile.credentials || d.profile.title || "";
          setForm(f => ({ ...f, assessor_name: name, assessor_credentials: creds }));
        }
      }).catch(() => {});
  }, []);

  // Patient search
  useEffect(() => {
    if (!patientSearch || form.client_id) return;
    const t = setTimeout(() => {
      fetch(`/api/clients?search=${encodeURIComponent(patientSearch)}&limit=8`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setPatients(d.clients || d.patients || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch, form.client_id]);

  async function handleSave(status: "draft" | "completed") {
    if (!form.client_id) return;
    setSaving(true);
    const res = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_id: form.client_id,
        assessment_type: "Psych Eval",
        assessment_date: form.assessment_date,
        assessor_name: [form.assessor_name, form.assessor_credentials].filter(Boolean).join(", "),
        status,
        scores: form,
        clinical_notes: form.clinical_formulation,
        level_of_care: form.level_of_care,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/assessments");
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";
  const sectionClass = "bg-white rounded-2xl border border-slate-200 p-6 space-y-5";
  const radioGroup = (key: string, options: {value: string; label: string}[]) => (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => set(key, o.value)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${(form as unknown as Record<string,string>)[key] === o.value ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );

  const section = SECTIONS[activeSection];

  return (
    <div className="max-w-3xl space-y-5">
      <EncounterContextBanner encounterId={params.get("encounter_id")} patientId={form.client_id} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/assessments" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Psychiatric Evaluation</h1>
            {patientName && <p className="text-teal-600 text-sm font-medium mt-0.5">{patientName}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave("draft")} disabled={!form.client_id || saving}
            className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            Save Draft
          </button>
        </div>
      </div>

      {/* Client + Date + Assessor */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        {/* Client search */}
        {!form.client_id ? (
          <div className="relative">
            <label className={labelClass}>Client *</label>
            <input
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              className={inputClass}
              placeholder="Search by name or MRN..."
            />
            {patients.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {patients.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => { setForm(f => ({ ...f, client_id: p.id })); setPatientName(`${p.last_name}, ${p.first_name}`); setPatients([]); setPatientSearch(""); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-900">{p.last_name}, {p.first_name}</span>
                    {p.mrn && <span className="ml-2 text-slate-400 text-xs">MRN: {p.mrn}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</span><div className="font-semibold text-slate-900 text-sm mt-0.5">{patientName}</div></div>
            <button onClick={() => { setForm(f => ({ ...f, client_id: "" })); setPatientName(""); }} className="text-xs text-slate-400 hover:text-red-500">Change</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Evaluation Date</label><input type="date" value={form.assessment_date} onChange={e => set("assessment_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Evaluator Name</label><input value={form.assessor_name} onChange={e => set("assessor_name", e.target.value)} className={inputClass} placeholder="First Last" /></div>
          <div><label className={labelClass}>Credentials / Title</label><input value={form.assessor_credentials} onChange={e => set("assessor_credentials", e.target.value)} className={inputClass} placeholder="MD, APRN, LCSW..." /></div>
        </div>
      </div>

      {/* Section progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-1 flex-wrap">
          {SECTIONS.map((s, i) => (
            <button key={s.id} onClick={() => { setActiveSection(i); window.scrollTo({top:0,behavior:"smooth"}); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${i === activeSection ? "bg-[#0d1b2e] text-white" : "border border-slate-200 text-slate-500 hover:border-slate-300"}`}>
              <span>{s.icon}</span><span className="hidden sm:inline">{i + 1}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 text-sm font-semibold text-slate-700">{section.icon} {section.label} <span className="text-slate-400 font-normal text-xs">({activeSection + 1} of {SECTIONS.length})</span></div>
        <div className="mt-2 bg-slate-100 rounded-full h-1.5">
          <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${((activeSection + 1) / SECTIONS.length) * 100}%` }} />
        </div>
      </div>

      {/* ── Section 1: Identifying Information ── */}
      {activeSection === 0 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">👤 Identifying Information</h2>
          <div><label className={labelClass}>Referral Source</label><input value={form.referral_source} onChange={e => set("referral_source", e.target.value)} className={inputClass} placeholder="Self, PCP, court, school, ED, other..." /></div>
          <div><label className={labelClass}>Reason for Referral / Evaluation Purpose</label><textarea value={form.referral_reason} onChange={e => set("referral_reason", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Describe the reason this evaluation is being requested..." /></div>
          <div><label className={labelClass}>Interpreter Needed?</label>{radioGroup("interpreter_needed", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
          {form.interpreter_needed === "yes" && <div><label className={labelClass}>Language</label><input value={form.interpreter_language} onChange={e => set("interpreter_language", e.target.value)} className={inputClass} /></div>}
        </div>
      )}

      {/* ── Section 2: Chief Complaint & HPI ── */}
      {activeSection === 1 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🎯 Chief Complaint & History of Present Illness</h2>
          <div><label className={labelClass}>Chief Complaint (client's own words) *</label><textarea value={form.chief_complaint} onChange={e => set("chief_complaint", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="What brings you in today?" /></div>
          <div><label className={labelClass}>History of Present Illness</label><textarea value={form.hpi} onChange={e => set("hpi", e.target.value)} rows={6} className={inputClass + " resize-none"} placeholder="Describe the onset, character, chronology, context, modifying factors, associated symptoms, and impact of the presenting concern..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Symptom Onset</label><input value={form.symptom_onset} onChange={e => set("symptom_onset", e.target.value)} className={inputClass} placeholder="Approximate date or timeframe..." /></div>
            <div><label className={labelClass}>Duration</label><input value={form.symptom_duration} onChange={e => set("symptom_duration", e.target.value)} className={inputClass} placeholder="Days, weeks, months, years..." /></div>
          </div>
          <div><label className={labelClass}>Symptom Course</label>{radioGroup("symptom_course", [{value:"episodic",label:"Episodic"},{value:"progressive",label:"Progressive"},{value:"chronic_stable",label:"Chronic / Stable"},{value:"improving",label:"Improving"},{value:"new_onset",label:"New Onset"}])}</div>
          <div><label className={labelClass}>Precipitating Events</label><textarea value={form.precipitating_events} onChange={e => set("precipitating_events", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Stressors, life events, changes triggering or worsening symptoms..." /></div>
          <div><label className={labelClass}>Previous Similar Episodes?</label>{radioGroup("previous_episodes", [{value:"no",label:"No"},{value:"yes",label:"Yes"},{value:"unknown",label:"Unknown"}])}</div>
        </div>
      )}

      {/* ── Section 3: Psychiatric History ── */}
      {activeSection === 2 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🧠 Psychiatric History</h2>
          <div><label className={labelClass}>Previous Psychiatric Treatment</label>{radioGroup("previous_psych_treatment", [{value:"no",label:"No"},{value:"yes_outpatient",label:"Yes — Outpatient"},{value:"yes_inpatient",label:"Yes — Inpatient"},{value:"yes_both",label:"Both"}])}</div>
          {form.previous_psych_treatment !== "no" && (
            <>
              <div><label className={labelClass}>Outpatient Treatment History</label><textarea value={form.outpatient_history} onChange={e => set("outpatient_history", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Therapists, psychiatrists, clinics, duration, response..." /></div>
              <div><label className={labelClass}>Inpatient / Hospitalization History</label><textarea value={form.inpatient_history} onChange={e => set("inpatient_history", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Number of hospitalizations, dates, facilities, reasons, length of stay..." /></div>
            </>
          )}
          <div><label className={labelClass}>Previous Psychiatric Diagnoses</label><input value={form.previous_diagnoses} onChange={e => set("previous_diagnoses", e.target.value)} className={inputClass} placeholder="List prior diagnoses if known..." /></div>
          <div><label className={labelClass}>Previous Psychiatric Medications</label><textarea value={form.previous_medications} onChange={e => set("previous_medications", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Medications tried previously, doses, response, reason discontinued..." /></div>
          <div><label className={labelClass}>Current Psychiatric Medications</label><textarea value={form.current_medications} onChange={e => set("current_medications", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Name, dose, frequency, prescriber..." /></div>
          <div><label className={labelClass}>Medication Adherence</label>{radioGroup("medication_adherence", [{value:"n_a",label:"N/A"},{value:"consistent",label:"Consistent"},{value:"partial",label:"Partial"},{value:"inconsistent",label:"Inconsistent"},{value:"refuses",label:"Refuses"}])}</div>
        </div>
      )}

      {/* ── Section 4: Substance Use ── */}
      {activeSection === 3 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">💊 Substance Use History</h2>
          <div><label className={labelClass}>Alcohol</label>{radioGroup("alcohol_use", [{value:"none",label:"None"},{value:"social",label:"Social"},{value:"moderate",label:"Moderate"},{value:"heavy",label:"Heavy"},{value:"dependent",label:"Dependent / AUD"}])}</div>
          {form.alcohol_use !== "none" && <div><label className={labelClass}>Alcohol — Frequency & Amount</label><input value={form.alcohol_frequency} onChange={e => set("alcohol_frequency", e.target.value)} className={inputClass} placeholder="Standard drinks/day, days/week..." /></div>}
          <div><label className={labelClass}>Tobacco / Nicotine</label>{radioGroup("tobacco_use", [{value:"none",label:"Never"},{value:"former",label:"Former"},{value:"current",label:"Current"}])}</div>
          <div><label className={labelClass}>Cannabis</label>{radioGroup("cannabis_use", [{value:"none",label:"None"},{value:"occasional",label:"Occasional"},{value:"regular",label:"Regular"},{value:"daily",label:"Daily"}])}</div>
          <div><label className={labelClass}>Stimulants (cocaine, meth, Adderall misuse)</label>{radioGroup("stimulant_use", [{value:"none",label:"None"},{value:"past",label:"Past"},{value:"current",label:"Current"}])}</div>
          <div><label className={labelClass}>Opioids (heroin, prescription)</label>{radioGroup("opioid_use", [{value:"none",label:"None"},{value:"past",label:"Past"},{value:"current",label:"Current"}])}</div>
          <div><label className={labelClass}>Other Substances</label><input value={form.other_substances} onChange={e => set("other_substances", e.target.value)} className={inputClass} placeholder="Benzodiazepines, hallucinogens, inhalants, etc." /></div>
          <div><label className={labelClass}>Date of Last Use</label><input type="date" value={form.last_use_date} onChange={e => set("last_use_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Substance Use Treatment History</label><textarea value={form.substance_treatment_history} onChange={e => set("substance_treatment_history", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Detox, rehab, MAT, 12-step, current status..." /></div>
        </div>
      )}

      {/* ── Section 5: Medical History & ROS ── */}
      {activeSection === 4 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🏥 Medical History & Review of Systems</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Primary Care Provider</label><input value={form.pcp_name} onChange={e => set("pcp_name", e.target.value)} className={inputClass} placeholder="Name / practice..." /></div>
            <div><label className={labelClass}>Last Physical Exam</label><input type="date" value={form.last_physical} onChange={e => set("last_physical", e.target.value)} className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Current Medical Conditions</label><textarea value={form.medical_conditions} onChange={e => set("medical_conditions", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Chronic conditions, active diagnoses..." /></div>
          <div><label className={labelClass}>Current Medical Medications</label><textarea value={form.current_medical_meds} onChange={e => set("current_medical_meds", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Non-psychiatric medications, OTC, supplements..." /></div>
          <div><label className={labelClass}>Allergies (medications, environmental, food)</label><input value={form.allergies} onChange={e => set("allergies", e.target.value)} className={inputClass} placeholder="Reaction type noted..." /></div>
          <div><label className={labelClass}>Relevant Surgical / Hospitalization History</label><textarea value={form.surgeries} onChange={e => set("surgeries", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
          <div><label className={labelClass}>History of Head Trauma / Loss of Consciousness</label>{radioGroup("head_trauma", [{value:"no",label:"No"},{value:"yes",label:"Yes — describe below"}])}</div>
          <div><label className={labelClass}>History of Seizures</label>{radioGroup("seizures", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
          {(form.head_trauma === "yes" || form.seizures === "yes") && <div><label className={labelClass}>Neurological Details</label><textarea value={form.neurological_issues} onChange={e => set("neurological_issues", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>}
        </div>
      )}

      {/* ── Section 6: Family Psychiatric History ── */}
      {activeSection === 5 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">👨‍👩‍👧 Family Psychiatric History</h2>
          <div><label className={labelClass}>Family Mental Health History</label>{radioGroup("family_psych_history", [{value:"none",label:"None known"},{value:"yes",label:"Yes"},{value:"unknown",label:"Unknown"}])}</div>
          {form.family_psych_history === "yes" && <div><label className={labelClass}>Details (relationship, diagnosis, treatment)</label><textarea value={form.family_psych_details} onChange={e => set("family_psych_details", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="e.g., Mother — bipolar disorder, Father — alcohol use disorder..." /></div>}
          <div><label className={labelClass}>Family History of Suicide Attempts or Completion</label>{radioGroup("family_suicide_history", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
          <div><label className={labelClass}>Family History of Substance Use Disorders</label>{radioGroup("family_substance_history", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
        </div>
      )}

      {/* ── Section 7: Social & Developmental History ── */}
      {activeSection === 6 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🌱 Social & Developmental History</h2>
          <div><label className={labelClass}>Birth / Perinatal Complications</label>{radioGroup("birth_complications", [{value:"no",label:"None reported"},{value:"yes",label:"Yes"}])}</div>
          <div><label className={labelClass}>Developmental Milestones</label>{radioGroup("developmental_milestones", [{value:"normal",label:"Within normal limits"},{value:"delayed",label:"Delayed"},{value:"unknown",label:"Unknown"}])}</div>
          {form.developmental_milestones === "delayed" && <div><label className={labelClass}>Developmental Concerns</label><textarea value={form.developmental_concerns} onChange={e => set("developmental_concerns", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>}
          <div><label className={labelClass}>History of Childhood Abuse / Neglect</label>{radioGroup("childhood_abuse", [{value:"no",label:"None reported"},{value:"yes",label:"Yes"},{value:"declines",label:"Declines to answer"}])}</div>
          <div><label className={labelClass}>Educational History</label><input value={form.educational_history} onChange={e => set("educational_history", e.target.value)} className={inputClass} placeholder="Highest level, special services, academic difficulties..." /></div>
          <div><label className={labelClass}>Military Service</label>{radioGroup("military_history", [{value:"no",label:"No"},{value:"yes_active",label:"Active duty"},{value:"yes_veteran",label:"Veteran"}])}</div>
          {form.military_history !== "no" && <div><label className={labelClass}>Military Details / Combat Exposure</label><input value={form.military_details} onChange={e => set("military_details", e.target.value)} className={inputClass} /></div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Relationship Status</label>
              <select value={form.relationship_status} onChange={e => set("relationship_status", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Single</option><option>In a relationship</option><option>Married</option>
                <option>Partnered</option><option>Separated</option><option>Divorced</option><option>Widowed</option>
              </select>
            </div>
            <div><label className={labelClass}>Employment Status</label>
              <select value={form.employment_status} onChange={e => set("employment_status", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Employed full-time</option><option>Employed part-time</option>
                <option>Self-employed</option><option>Unemployed</option><option>Student</option>
                <option>Retired</option><option>Disability / SSI</option>
              </select>
            </div>
          </div>
          <div><label className={labelClass}>Living Situation</label><input value={form.living_situation} onChange={e => set("living_situation", e.target.value)} className={inputClass} placeholder="Alone, with partner, family, roommates, shelter..." /></div>
          <div><label className={labelClass}>Children (ages, custody)</label><input value={form.children} onChange={e => set("children", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Legal History</label>{radioGroup("legal_history", [{value:"none",label:"None"},{value:"past",label:"Past — resolved"},{value:"current",label:"Current — pending"}])}</div>
          {form.legal_history !== "none" && <div><label className={labelClass}>Legal Details</label><input value={form.legal_details} onChange={e => set("legal_details", e.target.value)} className={inputClass} /></div>}
          <div><label className={labelClass}>Social Support System</label><textarea value={form.social_support} onChange={e => set("social_support", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Describe support network, key relationships..." /></div>
        </div>
      )}

      {/* ── Section 8: Mental Status Examination ── */}
      {activeSection === 7 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🔍 Mental Status Examination</h2>

          <div className="border border-slate-100 rounded-xl p-4 space-y-4 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Appearance & Behavior</h3>
            <div><label className={labelClass}>General Appearance / Physical Observations</label><input value={form.mse_appearance} onChange={e => set("mse_appearance", e.target.value)} className={inputClass} placeholder="Age-appropriate, well/poorly groomed, casual/disheveled attire..." /></div>
            <div><label className={labelClass}>Grooming / Hygiene</label>{radioGroup("mse_grooming", [{value:"adequate",label:"Adequate"},{value:"disheveled",label:"Disheveled"},{value:"poor",label:"Poor"},{value:"meticulous",label:"Meticulous"}])}</div>
            <div><label className={labelClass}>Eye Contact</label>{radioGroup("mse_eye_contact", [{value:"normal",label:"Normal"},{value:"reduced",label:"Reduced"},{value:"avoiding",label:"Avoiding"},{value:"intense",label:"Intense / Staring"}])}</div>
            <div><label className={labelClass}>Psychomotor Activity</label>{radioGroup("mse_psychomotor", [{value:"normal",label:"Normal"},{value:"agitated",label:"Agitated"},{value:"restless",label:"Restless"},{value:"retarded",label:"Retarded / Slowed"},{value:"tremor",label:"Tremor"}])}</div>
            <div><label className={labelClass}>Attitude / Behavior Toward Examiner</label>{radioGroup("mse_attitude", [{value:"cooperative",label:"Cooperative"},{value:"guarded",label:"Guarded"},{value:"hostile",label:"Hostile"},{value:"suspicious",label:"Suspicious"},{value:"seductive",label:"Seductive"},{value:"regressed",label:"Regressed"}])}</div>
          </div>

          <div className="border border-slate-100 rounded-xl p-4 space-y-4 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Speech</h3>
            <div><label className={labelClass}>Rate</label>{radioGroup("mse_speech_rate", [{value:"normal",label:"Normal"},{value:"rapid",label:"Rapid / Pressured"},{value:"slow",label:"Slow"},{value:"slurred",label:"Slurred"}])}</div>
            <div><label className={labelClass}>Volume</label>{radioGroup("mse_speech_volume", [{value:"normal",label:"Normal"},{value:"loud",label:"Loud"},{value:"soft",label:"Soft / Quiet"},{value:"mute",label:"Mute"}])}</div>
            <div><label className={labelClass}>Quality / Additional Notes</label><input value={form.mse_speech_quality} onChange={e => set("mse_speech_quality", e.target.value)} className={inputClass} placeholder="Coherent, tangential, circumstantial, loose, disorganized..." /></div>
          </div>

          <div className="border border-slate-100 rounded-xl p-4 space-y-4 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mood & Affect</h3>
            <div><label className={labelClass}>Mood (subjective — client's own words)</label><input value={form.mse_mood} onChange={e => set("mse_mood", e.target.value)} className={inputClass} placeholder='e.g., "depressed," "anxious," "okay," "angry"' /></div>
            <div><label className={labelClass}>Affect (objective — clinician observed)</label>{radioGroup("mse_affect", [{value:"euthymic",label:"Euthymic"},{value:"depressed",label:"Depressed"},{value:"anxious",label:"Anxious"},{value:"elevated",label:"Elevated"},{value:"irritable",label:"Irritable"},{value:"labile",label:"Labile"},{value:"flat",label:"Flat"},{value:"blunted",label:"Blunted"},{value:"dysphoric",label:"Dysphoric"}])}</div>
            <div><label className={labelClass}>Affect Range</label>{radioGroup("mse_affect_range", [{value:"full",label:"Full"},{value:"restricted",label:"Restricted"},{value:"blunted",label:"Blunted"},{value:"flat",label:"Flat"}])}</div>
            <div><label className={labelClass}>Mood-Affect Congruence</label>{radioGroup("mse_affect_congruence", [{value:"congruent",label:"Congruent"},{value:"incongruent",label:"Incongruent"}])}</div>
          </div>

          <div className="border border-slate-100 rounded-xl p-4 space-y-4 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thought Process & Content</h3>
            <div><label className={labelClass}>Thought Process</label>{radioGroup("mse_thought_process", [{value:"linear",label:"Linear / Goal-directed"},{value:"circumstantial",label:"Circumstantial"},{value:"tangential",label:"Tangential"},{value:"loose",label:"Loose Associations"},{value:"flight_of_ideas",label:"Flight of Ideas"},{value:"thought_blocking",label:"Thought Blocking"},{value:"perseveration",label:"Perseveration"}])}</div>
            <div><label className={labelClass}>Thought Content — Notable Themes</label><textarea value={form.mse_thought_content} onChange={e => set("mse_thought_content", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Guilt, hopelessness, grandiosity, paranoia, somatic concerns..." /></div>
            <div><label className={labelClass}>Delusions Present?</label>{radioGroup("mse_delusions", [{value:"no",label:"No"},{value:"paranoid",label:"Paranoid"},{value:"grandiose",label:"Grandiose"},{value:"somatic",label:"Somatic"},{value:"referential",label:"Referential"},{value:"other",label:"Other"}])}</div>
            <div><label className={labelClass}>Hallucinations</label>{radioGroup("mse_hallucinations", [{value:"none",label:"None"},{value:"auditory",label:"Auditory"},{value:"visual",label:"Visual"},{value:"tactile",label:"Tactile"},{value:"olfactory",label:"Olfactory"},{value:"command",label:"Command (AH)"}])}</div>
            {form.mse_hallucinations !== "none" && <div><label className={labelClass}>Hallucination Details</label><textarea value={form.mse_hallucination_details} onChange={e => set("mse_hallucination_details", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Frequency, content, distress level, response..." /></div>}
            <div><label className={labelClass}>Obsessions / Compulsions</label>{radioGroup("mse_obsessions", [{value:"no",label:"No"},{value:"yes",label:"Yes — describe in thought content"}])}</div>
            <div><label className={labelClass}>Active Suicidal Ideation</label>{radioGroup("mse_suicidal_ideation", [{value:"denied",label:"Denied"},{value:"passive",label:"Passive"},{value:"active",label:"Active"},{value:"plan",label:"With Plan"},{value:"intent",label:"With Intent"}])}</div>
            <div><label className={labelClass}>Active Homicidal Ideation</label>{radioGroup("mse_homicidal_ideation", [{value:"denied",label:"Denied"},{value:"passive",label:"Passive"},{value:"active",label:"Active"}])}</div>
          </div>

          <div className="border border-slate-100 rounded-xl p-4 space-y-4 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cognition</h3>
            <div><label className={labelClass}>Orientation</label>{radioGroup("mse_orientation", [{value:"x4",label:"×4 (person, place, time, situation)"},{value:"x3",label:"×3"},{value:"x2",label:"×2"},{value:"x1",label:"×1"},{value:"disoriented",label:"Disoriented"}])}</div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Recent Memory</label>{radioGroup("mse_memory_recent", [{value:"intact",label:"Intact"},{value:"mildly_impaired",label:"Mildly Impaired"},{value:"impaired",label:"Impaired"}])}</div>
              <div><label className={labelClass}>Remote Memory</label>{radioGroup("mse_memory_remote", [{value:"intact",label:"Intact"},{value:"mildly_impaired",label:"Mildly Impaired"},{value:"impaired",label:"Impaired"}])}</div>
            </div>
            <div><label className={labelClass}>Concentration / Attention</label>{radioGroup("mse_concentration", [{value:"intact",label:"Intact"},{value:"mildly_impaired",label:"Mildly Impaired"},{value:"impaired",label:"Impaired"},{value:"severely_impaired",label:"Severely Impaired"}])}</div>
            <div><label className={labelClass}>Fund of Knowledge / Intelligence (estimated)</label>{radioGroup("mse_fund_of_knowledge", [{value:"below_average",label:"Below Average"},{value:"average",label:"Average"},{value:"above_average",label:"Above Average"}])}</div>
            <div><label className={labelClass}>Abstraction</label>{radioGroup("mse_abstraction", [{value:"intact",label:"Intact"},{value:"concrete",label:"Concrete"},{value:"impaired",label:"Impaired"}])}</div>
          </div>

          <div className="border border-slate-100 rounded-xl p-4 space-y-4 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Insight & Judgment</h3>
            <div><label className={labelClass}>Insight (awareness of illness / need for treatment)</label>{radioGroup("mse_insight", [{value:"good",label:"Good"},{value:"fair",label:"Fair"},{value:"poor",label:"Poor"},{value:"absent",label:"Absent"}])}</div>
            <div><label className={labelClass}>Judgment (decision-making capacity)</label>{radioGroup("mse_judgment", [{value:"good",label:"Good"},{value:"fair",label:"Fair"},{value:"poor",label:"Poor"},{value:"impaired",label:"Impaired"}])}</div>
          </div>
        </div>
      )}

      {/* ── Section 9: Risk Assessment ── */}
      {activeSection === 8 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">⚠️ Risk Assessment</h2>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            ⚠️ If imminent risk is identified, initiate safety protocol immediately. Complete C-SSRS if SI is present.
          </div>
          <div><label className={labelClass}>Current Suicidal Ideation</label>{radioGroup("current_si", [{value:"none",label:"None"},{value:"passive",label:"Passive (wish to be dead)"},{value:"active_no_plan",label:"Active — no plan"},{value:"active_with_plan",label:"Active — with plan"},{value:"intent",label:"Active — with intent to act"}])}</div>
          {form.current_si !== "none" && (
            <div className="space-y-3 pl-4 border-l-2 border-red-200">
              <div><label className={labelClass}>Specific Plan?</label>{radioGroup("si_plan", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
              <div><label className={labelClass}>Intent to Act?</label>{radioGroup("si_intent", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
              <div><label className={labelClass}>Access to Means?</label>{radioGroup("si_means", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
            </div>
          )}
          <div><label className={labelClass}>History of Suicide Attempts</label>{radioGroup("si_attempts_history", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
          {form.si_attempts_history === "yes" && <div><label className={labelClass}>Attempt Details</label><textarea value={form.si_attempt_details} onChange={e => set("si_attempt_details", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Number, dates, methods, lethality, rescue circumstances..." /></div>}
          <div><label className={labelClass}>Current Homicidal Ideation</label>{radioGroup("current_hi", [{value:"no",label:"No"},{value:"passive",label:"Passive"},{value:"active_no_plan",label:"Active — no plan"},{value:"active_with_plan",label:"Active — with plan"}])}</div>
          <div><label className={labelClass}>Current Non-Suicidal Self-Injury (NSSI)</label>{radioGroup("self_harm_current", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
          <div><label className={labelClass}>History of Non-Suicidal Self-Injury</label>{radioGroup("self_harm_history", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
          {(form.self_harm_current === "yes" || form.self_harm_history === "yes") && <div><label className={labelClass}>NSSI Details</label><textarea value={form.self_harm_details} onChange={e => set("self_harm_details", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Method, frequency, function, injuries..." /></div>}
          <div><label className={labelClass}>Overall Risk Level</label>{radioGroup("risk_level", [{value:"low",label:"Low"},{value:"moderate",label:"Moderate"},{value:"high",label:"High"},{value:"imminent",label:"Imminent — Safety Action Required"}])}</div>
          <div><label className={labelClass}>Protective Factors</label><textarea value={form.protective_factors} onChange={e => set("protective_factors", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Reasons for living, children, spirituality, support, treatment engagement..." /></div>
          <div><label className={labelClass}>Safety Plan</label>{radioGroup("safety_plan_completed", [{value:"no",label:"Not indicated"},{value:"yes",label:"Safety plan completed"},{value:"crisis_referral",label:"Referred to crisis services"},{value:"ips",label:"Involuntary hold initiated"}])}</div>
        </div>
      )}

      {/* ── Section 10: Diagnostic Formulation ── */}
      {activeSection === 9 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">📋 Diagnostic Formulation</h2>
          <div><label className={labelClass}>Primary DSM-5 / ICD-10 Diagnosis (Axis I)</label><textarea value={form.axis1_diagnoses} onChange={e => set("axis1_diagnoses", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Primary diagnosis, secondary diagnoses, rule-outs with DSM-5 codes..." /></div>
          <div><label className={labelClass}>Personality Features / Axis II Considerations</label><textarea value={form.axis2_considerations} onChange={e => set("axis2_considerations", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Personality disorder, intellectual disability, traits..." /></div>
          <div><label className={labelClass}>Relevant Medical Diagnoses</label><textarea value={form.medical_diagnoses} onChange={e => set("medical_diagnoses", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Medical conditions contributing to or affected by psychiatric presentation..." /></div>
          <div><label className={labelClass}>Differential Diagnoses Considered</label><textarea value={form.differential_diagnoses} onChange={e => set("differential_diagnoses", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Diagnoses considered and ruled out, and rationale..." /></div>
          <div><label className={labelClass}>Clinical Formulation</label><textarea value={form.clinical_formulation} onChange={e => set("clinical_formulation", e.target.value)} rows={7} className={inputClass + " resize-none"} placeholder="Biopsychosocial formulation integrating predisposing, precipitating, perpetuating, and protective factors. Summarize how history, presenting symptoms, MSE findings, and risk assessment inform the diagnosis and treatment approach..." /></div>
          <div><label className={labelClass}>Global Assessment of Functioning (GAF) Score (optional)</label><input value={form.gaf_score} onChange={e => set("gaf_score", e.target.value)} className={inputClass} placeholder="0–100" /></div>
        </div>
      )}

      {/* ── Section 11: Treatment Plan ── */}
      {activeSection === 10 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">📝 Treatment Plan & Recommendations</h2>
          <div><label className={labelClass}>Recommended Level of Care</label>
            <select value={form.level_of_care} onChange={e => set("level_of_care", e.target.value)} className={inputClass}>
              <option value="outpatient">Outpatient (weekly or biweekly)</option>
              <option value="iop">Intensive Outpatient (IOP — 9+ hrs/week)</option>
              <option value="php">Partial Hospitalization (PHP — 20+ hrs/week)</option>
              <option value="residential">Residential Treatment</option>
              <option value="inpatient">Inpatient Psychiatric Hospitalization</option>
              <option value="crisis">Crisis Stabilization Unit</option>
              <option value="med_mgmt_only">Medication Management Only</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Treatment Modalities Recommended</label>
            <div className="flex flex-wrap gap-2">
              {[
                "Individual therapy","Group therapy","Family therapy","Couples therapy",
                "Medication management","Psychiatric monitoring","Case management",
                "Peer support","Skills training","EMDR","DBT","CBT","ACT","CPT",
                "Substance use treatment","Crisis intervention","Neuropsychological testing",
              ].map(m => (
                <button key={m} type="button"
                  onClick={() => {
                    const current = form.treatment_modalities || [];
                    set("treatment_modalities", current.includes(m) ? current.filter((x: string) => x !== m) : [...current, m]);
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${(form.treatment_modalities || []).includes(m) ? "bg-teal-50 border-teal-300 text-teal-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {(form.treatment_modalities || []).includes(m) ? "✓ " : ""}{m}
                </button>
              ))}
            </div>
          </div>
          <div><label className={labelClass}>Medication Plan / Prescriptions</label><textarea value={form.medication_plan} onChange={e => set("medication_plan", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Medications prescribed, doses, instructions, monitoring plan, labs ordered..." /></div>
          <div><label className={labelClass}>Therapy Referral Initiated?</label>{radioGroup("therapy_referral", [{value:"no",label:"No"},{value:"yes_internal",label:"Yes — internal"},{value:"yes_external",label:"Yes — external referral"},{value:"on_waitlist",label:"On waitlist"}])}</div>
          {form.therapy_referral !== "no" && <div><label className={labelClass}>Therapy Type / Modality</label><input value={form.therapy_type} onChange={e => set("therapy_type", e.target.value)} className={inputClass} placeholder="CBT, DBT, EMDR, supportive, etc." /></div>}
          <div><label className={labelClass}>Frequency of Psychiatric Follow-up Visits</label><input value={form.frequency_of_visits} onChange={e => set("frequency_of_visits", e.target.value)} className={inputClass} placeholder="e.g., monthly, every 2–3 months, as needed..." /></div>
          <div><label className={labelClass}>Treatment Goals</label><textarea value={form.goals} onChange={e => set("goals", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Measurable, client-centered goals for this treatment episode..." /></div>
          <div><label className={labelClass}>Additional Referrals / Services</label><textarea value={form.additional_referrals} onChange={e => set("additional_referrals", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Labs, neuropsychological testing, community services, housing, etc." /></div>
          <div><label className={labelClass}>Follow-up Plan</label><textarea value={form.follow_up_plan} onChange={e => set("follow_up_plan", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Next appointment, tasks before next visit, escalation criteria..." /></div>
          <div className="pt-2 border-t border-slate-100"><label className={labelClass}>Clinician Signature / Attestation</label><input value={form.clinician_signature} onChange={e => set("clinician_signature", e.target.value)} className={inputClass} placeholder="Name, credentials, date will be recorded on submission" /></div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setActiveSection(Math.max(0, activeSection - 1)); window.scrollTo({top:0,behavior:"smooth"}); }} disabled={activeSection === 0}
          className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-30">
          ← Previous
        </button>
        <span className="text-xs text-slate-400">{activeSection + 1} of {SECTIONS.length}</span>
        {activeSection < SECTIONS.length - 1 ? (
          <button onClick={() => { setActiveSection(activeSection + 1); window.scrollTo({top:0,behavior:"smooth"}); }}
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
            Next →
          </button>
        ) : (
          <button onClick={() => handleSave("completed")} disabled={!form.client_id || saving}
            className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
            {saving ? "Saving..." : encounterPolicy === "yes" && !attachedEncounterId ? "⚠️ Encounter Required" : "Complete Evaluation ✓"}
          </button>
        )}
      </div>
      {form.client_id && <PatientTimelineDrawer patientId={form.client_id} />}
    </div>
  );
}

export default function NewPsychEvalPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><PsychEvalForm /></Suspense>;
}
