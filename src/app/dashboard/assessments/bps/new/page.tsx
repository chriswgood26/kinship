"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import EncounterContextBanner from "@/components/EncounterContextBanner";
import EncounterAttachment from "@/components/EncounterAttachment";
import PatientTimelineDrawer from "@/components/ClientTimelineDrawer";

const SECTIONS = [
  { id: "presenting", label: "Presenting Problem", icon: "🎯" },
  { id: "mh_history", label: "Mental Health History", icon: "🧠" },
  { id: "substance", label: "Substance Use", icon: "💊" },
  { id: "medical", label: "Medical History", icon: "🏥" },
  { id: "family_social", label: "Family & Social", icon: "👨‍👩‍👧" },
  { id: "trauma", label: "Trauma & Adverse Experiences", icon: "🛡️" },
  { id: "functional", label: "Functional Assessment", icon: "⚙️" },
  { id: "risk", label: "Risk Assessment", icon: "⚠️" },
  { id: "cultural", label: "Cultural & Spiritual", icon: "🌍" },
  { id: "diagnostic", label: "Diagnostic Impression", icon: "📋" },
];

function BPSForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [attachedEncounterId, setAttachedEncounterId] = useState(params.get("encounter_id") || "");
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
  const [assessorName, setAssessorName] = useState("");

  const [form, setForm] = useState({
    client_id: "",
    patient_name: "",
    encounter_id: "",
    assessment_date: new Date().toISOString().split("T")[0],
    assessor_name: "",
    // Section 1 — Presenting Problem
    chief_complaint: "",
    presenting_problem: "",
    onset: "",
    duration: "",
    precipitating_factors: "",
    previous_episodes: "",
    // Section 2 — Mental Health History
    previous_mh_treatment: "no",
    previous_hospitalizations: "no",
    hospitalization_details: "",
    previous_diagnoses: "",
    current_medications: "",
    medication_adherence: "",
    previous_therapy: "",
    therapy_response: "",
    // Section 3 — Substance Use
    alcohol_use: "none",
    alcohol_frequency: "",
    drug_use: "none",
    drug_frequency: "",
    substances_used: "",
    last_use: "",
    treatment_history: "",
    recovery_status: "",
    // Section 4 — Medical History
    primary_care_provider: "",
    last_physical: "",
    medical_conditions: "",
    current_medications_medical: "",
    allergies: "",
    disabilities: "",
    // Section 5 — Family & Social
    living_situation: "",
    household_members: "",
    marital_status: "",
    children: "",
    family_mh_history: "",
    support_system: "",
    employment_status: "",
    education_level: "",
    financial_stressors: "",
    legal_history: "none",
    legal_details: "",
    // Section 6 — Trauma
    trauma_history: "none",
    trauma_types: [] as string[],
    trauma_details: "",
    aces_score: "",
    dissociation: "no",
    ptsd_symptoms: "",
    // Section 7 — Functional
    adl_functioning: "independent",
    iadl_functioning: "independent",
    work_functioning: "",
    social_functioning: "",
    sleep: "",
    appetite: "",
    concentration: "",
    energy: "",
    // Section 8 — Risk
    suicidal_ideation: "none",
    si_history: "no",
    si_plan: "no",
    si_intent: "no",
    si_means: "no",
    homicidal_ideation: "no",
    self_harm: "no",
    protective_factors: "",
    safety_plan_needed: "no",
    // Section 9 — Cultural
    cultural_background: "",
    language: "",
    religion_spirituality: "",
    cultural_strengths: "",
    // Section 10 — Diagnostic
    diagnostic_impression: "",
    provisional_diagnoses: "",
    level_of_care: "outpatient",
    treatment_recommendations: "",
    strengths: "",
    barriers: "",
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
          if (p) { setForm(f => ({ ...f, client_id: p.id, patient_name: `${p.last_name}, ${p.first_name}` })); setPatientName(`${p.last_name}, ${p.first_name}`); }
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
          const full = creds ? `${name}, ${creds}` : name;
          setAssessorName(full);
          setForm(f => ({ ...f, assessor_name: full }));
        }
      }).catch(() => {});
  }, []);

  async function handleSave(status: "draft" | "completed") {
    if (!form.client_id) return;
    setSaving(true);
    const res = await fetch("/api/assessments", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        client_id: form.client_id,
        assessment_type: "BPS",
        assessment_date: form.assessment_date,
        assessor_name: form.assessor_name,
        status,
        scores: form,
        clinical_notes: form.diagnostic_impression,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) router.push(`/dashboard/assessments`);
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
            <h1 className="text-2xl font-bold text-slate-900">Biopsychosocial Assessment</h1>
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

      {/* Date + assessor */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Assessment Date</label><input type="date" value={form.assessment_date} onChange={e => set("assessment_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Assessor Name & Credentials</label><input value={form.assessor_name} onChange={e => set("assessor_name", e.target.value)} className={inputClass} placeholder="Name, LCSW" /></div>
        </div>
      </div>

      {/* Section progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-1 flex-wrap">
          {SECTIONS.map((s, i) => (
            <button key={s.id} onClick={() => { setActiveSection(i); window.scrollTo({top:0,behavior:'smooth'}); }}
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

      {/* Section content */}
      {activeSection === 0 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🎯 Presenting Problem</h2>
          <div><label className={labelClass}>Chief Complaint (in client's words) *</label><textarea value={form.chief_complaint} onChange={e => set("chief_complaint", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="What brings you in today?" /></div>
          <div><label className={labelClass}>Description of Presenting Problem</label><textarea value={form.presenting_problem} onChange={e => set("presenting_problem", e.target.value)} rows={4} className={inputClass + " resize-none"} placeholder="Describe the nature, severity, and impact of the presenting concern..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Onset</label><input value={form.onset} onChange={e => set("onset", e.target.value)} className={inputClass} placeholder="When did symptoms begin?" /></div>
            <div><label className={labelClass}>Duration</label><input value={form.duration} onChange={e => set("duration", e.target.value)} className={inputClass} placeholder="How long has this been occurring?" /></div>
          </div>
          <div><label className={labelClass}>Precipitating Factors</label><textarea value={form.precipitating_factors} onChange={e => set("precipitating_factors", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Events or circumstances that may have triggered or worsened symptoms..." /></div>
          <div><label className={labelClass}>Previous Episodes</label>{radioGroup("previous_episodes", [{value:"no",label:"No"},{value:"yes",label:"Yes — details below"},{value:"unknown",label:"Unknown"}])}</div>
        </div>
      )}

      {activeSection === 1 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🧠 Mental Health History</h2>
          <div><label className={labelClass}>Previous Mental Health Treatment</label>{radioGroup("previous_mh_treatment", [{value:"no",label:"No"},{value:"yes_outpatient",label:"Yes — Outpatient"},{value:"yes_inpatient",label:"Yes — Inpatient"},{value:"yes_both",label:"Both"}])}</div>
          <div><label className={labelClass}>Previous Diagnoses</label><input value={form.previous_diagnoses} onChange={e => set("previous_diagnoses", e.target.value)} className={inputClass} placeholder="List previous psychiatric diagnoses if known..." /></div>
          <div><label className={labelClass}>Previous Hospitalizations</label>{radioGroup("previous_hospitalizations", [{value:"no",label:"No"},{value:"yes_voluntary",label:"Yes — Voluntary"},{value:"yes_involuntary",label:"Yes — Involuntary"}])}</div>
          {form.previous_hospitalizations !== "no" && <div><label className={labelClass}>Hospitalization Details</label><textarea value={form.hospitalization_details} onChange={e => set("hospitalization_details", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Dates, facilities, reasons..." /></div>}
          <div><label className={labelClass}>Current Psychiatric Medications</label><textarea value={form.current_medications} onChange={e => set("current_medications", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="List medications, doses, prescriber..." /></div>
          <div><label className={labelClass}>Medication Adherence</label>{radioGroup("medication_adherence", [{value:"n/a",label:"N/A"},{value:"consistent",label:"Consistent"},{value:"inconsistent",label:"Inconsistent"},{value:"refuses",label:"Refuses"}])}</div>
          <div><label className={labelClass}>Previous Therapy</label><input value={form.previous_therapy} onChange={e => set("previous_therapy", e.target.value)} className={inputClass} placeholder="Type of therapy, duration, response..." /></div>
        </div>
      )}

      {activeSection === 2 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">💊 Substance Use History</h2>
          <div><label className={labelClass}>Alcohol Use</label>{radioGroup("alcohol_use", [{value:"none",label:"None"},{value:"social",label:"Social"},{value:"moderate",label:"Moderate"},{value:"heavy",label:"Heavy"},{value:"dependent",label:"Dependent"}])}</div>
          {form.alcohol_use !== "none" && <div><label className={labelClass}>Alcohol Frequency & Amount</label><input value={form.alcohol_frequency} onChange={e => set("alcohol_frequency", e.target.value)} className={inputClass} placeholder="Frequency and typical amount..." /></div>}
          <div><label className={labelClass}>Drug Use</label>{radioGroup("drug_use", [{value:"none",label:"None"},{value:"cannabis",label:"Cannabis"},{value:"stimulants",label:"Stimulants"},{value:"opioids",label:"Opioids"},{value:"other",label:"Other"}])}</div>
          {form.drug_use !== "none" && (
            <>
              <div><label className={labelClass}>Substances Used</label><input value={form.substances_used} onChange={e => set("substances_used", e.target.value)} className={inputClass} placeholder="List substances, route, frequency..." /></div>
              <div><label className={labelClass}>Date of Last Use</label><input type="date" value={form.last_use} onChange={e => set("last_use", e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Prior Substance Use Treatment</label><textarea value={form.treatment_history} onChange={e => set("treatment_history", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Detox, rehab, MAT, AA/NA participation..." /></div>
              <div><label className={labelClass}>Recovery Status</label>{radioGroup("recovery_status", [{value:"active_use",label:"Active Use"},{value:"in_recovery",label:"In Recovery"},{value:"sustained_recovery",label:"Sustained Recovery (>1yr)"}])}</div>
            </>
          )}
        </div>
      )}

      {activeSection === 3 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🏥 Medical History</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Primary Care Provider</label><input value={form.primary_care_provider} onChange={e => set("primary_care_provider", e.target.value)} className={inputClass} placeholder="Name and practice..." /></div>
            <div><label className={labelClass}>Last Physical Exam</label><input type="date" value={form.last_physical} onChange={e => set("last_physical", e.target.value)} className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Medical Conditions / Diagnoses</label><textarea value={form.medical_conditions} onChange={e => set("medical_conditions", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Chronic conditions, recent diagnoses..." /></div>
          <div><label className={labelClass}>Current Medical Medications</label><textarea value={form.current_medications_medical} onChange={e => set("current_medications_medical", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Non-psychiatric medications..." /></div>
          <div><label className={labelClass}>Known Allergies</label><input value={form.allergies} onChange={e => set("allergies", e.target.value)} className={inputClass} placeholder="Medications, foods, environmental..." /></div>
          <div><label className={labelClass}>Disabilities / Physical Limitations</label><input value={form.disabilities} onChange={e => set("disabilities", e.target.value)} className={inputClass} placeholder="Physical, cognitive, sensory..." /></div>
        </div>
      )}

      {activeSection === 4 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">👨‍👩‍👧 Family & Social History</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Living Situation</label>
              <select value={form.living_situation} onChange={e => set("living_situation", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Alone</option><option>With spouse/partner</option><option>With family</option>
                <option>With roommates</option><option>Group home</option><option>Homeless/unstable</option>
                <option>Residential treatment</option>
              </select>
            </div>
            <div><label className={labelClass}>Marital Status</label>
              <select value={form.marital_status} onChange={e => set("marital_status", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Single</option><option>Married</option><option>Partnered</option>
                <option>Separated</option><option>Divorced</option><option>Widowed</option>
              </select>
            </div>
          </div>
          <div><label className={labelClass}>Children (ages, custody arrangements)</label><input value={form.children} onChange={e => set("children", e.target.value)} className={inputClass} placeholder="Number, ages, living arrangements..." /></div>
          <div><label className={labelClass}>Family Mental Health History</label><textarea value={form.family_mh_history} onChange={e => set("family_mh_history", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Mental health, substance use, suicide in family..." /></div>
          <div><label className={labelClass}>Support System</label><textarea value={form.support_system} onChange={e => set("support_system", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Describe social support network..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Employment Status</label>
              <select value={form.employment_status} onChange={e => set("employment_status", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Employed full-time</option><option>Employed part-time</option>
                <option>Self-employed</option><option>Unemployed</option><option>Student</option>
                <option>Retired</option><option>Disability</option>
              </select>
            </div>
            <div><label className={labelClass}>Education Level</label>
              <select value={form.education_level} onChange={e => set("education_level", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Some high school</option><option>High school / GED</option>
                <option>Some college</option><option>Associate's degree</option>
                <option>Bachelor's degree</option><option>Graduate degree</option>
              </select>
            </div>
          </div>
          <div><label className={labelClass}>Legal History</label>{radioGroup("legal_history", [{value:"none",label:"None"},{value:"past",label:"Past — resolved"},{value:"current",label:"Current — pending"}])}</div>
          {form.legal_history !== "none" && <div><label className={labelClass}>Legal Details</label><input value={form.legal_details} onChange={e => set("legal_details", e.target.value)} className={inputClass} /></div>}
        </div>
      )}

      {activeSection === 5 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🛡️ Trauma & Adverse Experiences</h2>
          <div><label className={labelClass}>Trauma History</label>{radioGroup("trauma_history", [{value:"none",label:"None reported"},{value:"yes_childhood",label:"Childhood trauma"},{value:"yes_adult",label:"Adult trauma"},{value:"yes_both",label:"Both"},{value:"unknown",label:"Unknown/declines"}])}</div>
          {form.trauma_history !== "none" && form.trauma_history !== "unknown" && (
            <>
              <div>
                <label className={labelClass}>Types of Trauma (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {["Physical abuse","Sexual abuse","Emotional/psychological abuse","Neglect","Domestic violence","Community violence","Accident/injury","Medical trauma","Loss/grief","Combat/war","Disaster","Other"].map(t => (
                    <button key={t} type="button" onClick={() => {
                      const current = form.trauma_types || [];
                      set("trauma_types", current.includes(t) ? current.filter((x: string) => x !== t) : [...current, t]);
                    }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${(form.trauma_types || []).includes(t) ? "bg-teal-50 border-teal-300 text-teal-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      {(form.trauma_types || []).includes(t) ? "✓ " : ""}{t}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className={labelClass}>Additional Trauma Details</label><textarea value={form.trauma_details} onChange={e => set("trauma_details", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Describe relevant trauma history as appropriate..." /></div>
              <div><label className={labelClass}>PTSD Symptoms</label><textarea value={form.ptsd_symptoms} onChange={e => set("ptsd_symptoms", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Intrusions, avoidance, hyperarousal, negative cognitions..." /></div>
            </>
          )}
          <div><label className={labelClass}>Dissociative Symptoms</label>{radioGroup("dissociation", [{value:"no",label:"No"},{value:"mild",label:"Mild"},{value:"moderate",label:"Moderate"},{value:"severe",label:"Severe"}])}</div>
        </div>
      )}

      {activeSection === 6 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">⚙️ Functional Assessment</h2>
          <div><label className={labelClass}>ADL Functioning (basic self-care)</label>{radioGroup("adl_functioning", [{value:"independent",label:"Independent"},{value:"minimal_assist",label:"Minimal Assist"},{value:"moderate_assist",label:"Moderate Assist"},{value:"dependent",label:"Dependent"}])}</div>
          <div><label className={labelClass}>IADL Functioning (household, finances, transportation)</label>{radioGroup("iadl_functioning", [{value:"independent",label:"Independent"},{value:"minimal_assist",label:"Minimal Assist"},{value:"moderate_assist",label:"Moderate Assist"},{value:"dependent",label:"Dependent"}])}</div>
          <div><label className={labelClass}>Work / School Functioning</label><textarea value={form.work_functioning} onChange={e => set("work_functioning", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Describe impact of symptoms on work/school performance..." /></div>
          <div><label className={labelClass}>Social / Interpersonal Functioning</label><textarea value={form.social_functioning} onChange={e => set("social_functioning", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Sleep</label>
              <select value={form.sleep} onChange={e => set("sleep", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Normal (7-9 hrs)</option><option>Insomnia</option><option>Hypersomnia</option>
                <option>Fragmented</option><option>Nightmares/disturbed</option>
              </select>
            </div>
            <div><label className={labelClass}>Appetite</label>
              <select value={form.appetite} onChange={e => set("appetite", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Normal</option><option>Decreased</option><option>Increased</option><option>Variable</option>
              </select>
            </div>
            <div><label className={labelClass}>Concentration / Attention</label>
              <select value={form.concentration} onChange={e => set("concentration", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Intact</option><option>Mildly impaired</option><option>Moderately impaired</option><option>Severely impaired</option>
              </select>
            </div>
            <div><label className={labelClass}>Energy Level</label>
              <select value={form.energy} onChange={e => set("energy", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Normal</option><option>Low/fatigued</option><option>Elevated/restless</option><option>Variable</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeSection === 7 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">⚠️ Risk Assessment</h2>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 mb-4">
            ⚠️ If imminent risk is identified, initiate safety protocol immediately. A C-SSRS should be administered.
          </div>
          <div><label className={labelClass}>Current Suicidal Ideation</label>{radioGroup("suicidal_ideation", [{value:"none",label:"None"},{value:"passive",label:"Passive (wish to be dead)"},{value:"active_no_plan",label:"Active — no plan"},{value:"active_with_plan",label:"Active — with plan"},{value:"intent",label:"Intent to act"}])}</div>
          <div><label className={labelClass}>History of Suicide Attempts</label>{radioGroup("si_history", [{value:"no",label:"No"},{value:"yes",label:"Yes — describe below"}])}</div>
          <div><label className={labelClass}>Homicidal Ideation</label>{radioGroup("homicidal_ideation", [{value:"no",label:"No"},{value:"passive",label:"Passive"},{value:"active_no_plan",label:"Active — no plan"},{value:"active_with_plan",label:"Active — with plan"}])}</div>
          <div><label className={labelClass}>History of Self-Harm (non-suicidal)</label>{radioGroup("self_harm", [{value:"no",label:"No"},{value:"past",label:"Past"},{value:"current",label:"Current"}])}</div>
          <div><label className={labelClass}>Protective Factors</label><textarea value={form.protective_factors} onChange={e => set("protective_factors", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Children, pets, religious beliefs, future plans, support network..." /></div>
          <div><label className={labelClass}>Safety Plan Needed?</label>{radioGroup("safety_plan_needed", [{value:"no",label:"No"},{value:"yes",label:"Yes — safety plan completed"},{value:"referred",label:"Referred to crisis services"}])}</div>
        </div>
      )}

      {activeSection === 8 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🌍 Cultural & Spiritual Factors</h2>
          <div><label className={labelClass}>Cultural / Ethnic Background</label><input value={form.cultural_background} onChange={e => set("cultural_background", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Primary Language / Interpreter Needed</label><input value={form.language} onChange={e => set("language", e.target.value)} className={inputClass} placeholder="Language, interpreter needed Y/N..." /></div>
          <div><label className={labelClass}>Religion / Spirituality</label><textarea value={form.religion_spirituality} onChange={e => set("religion_spirituality", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Describe role of religion/spirituality in client's life..." /></div>
          <div><label className={labelClass}>Cultural Strengths & Resources</label><textarea value={form.cultural_strengths} onChange={e => set("cultural_strengths", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Community ties, cultural practices that support wellbeing..." /></div>
        </div>
      )}

      {activeSection === 9 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">📋 Diagnostic Impression & Recommendations</h2>
          <div><label className={labelClass}>Provisional DSM-5 Diagnoses</label><textarea value={form.provisional_diagnoses} onChange={e => set("provisional_diagnoses", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Primary diagnosis, secondary diagnoses, rule-outs..." /></div>
          <div><label className={labelClass}>Diagnostic Impression / Clinical Summary</label><textarea value={form.diagnostic_impression} onChange={e => set("diagnostic_impression", e.target.value)} rows={5} className={inputClass + " resize-none"} placeholder="Clinical summary integrating presenting problem, history, mental status, risk..." /></div>
          <div><label className={labelClass}>Recommended Level of Care</label>
            <select value={form.level_of_care} onChange={e => set("level_of_care", e.target.value)} className={inputClass}>
              <option value="outpatient">Outpatient (weekly or biweekly)</option>
              <option value="iop">Intensive Outpatient (IOP)</option>
              <option value="php">Partial Hospitalization (PHP)</option>
              <option value="residential">Residential</option>
              <option value="inpatient">Inpatient Psychiatric</option>
              <option value="crisis">Crisis Stabilization</option>
            </select>
          </div>
          <div><label className={labelClass}>Treatment Recommendations</label><textarea value={form.treatment_recommendations} onChange={e => set("treatment_recommendations", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Modalities, frequency, goals, referrals needed..." /></div>
          <div><label className={labelClass}>Client Strengths</label><textarea value={form.strengths} onChange={e => set("strengths", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Motivation, insight, support system, coping skills..." /></div>
          <div><label className={labelClass}>Barriers to Treatment</label><textarea value={form.barriers} onChange={e => set("barriers", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Transportation, insurance, language, stigma..." /></div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setActiveSection(Math.max(0, activeSection - 1)); window.scrollTo({top:0,behavior:'smooth'}); }} disabled={activeSection === 0}
          className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-30">
          ← Previous
        </button>
        <span className="text-xs text-slate-400">{activeSection + 1} of {SECTIONS.length}</span>
        {activeSection < SECTIONS.length - 1 ? (
          <button onClick={() => { setActiveSection(activeSection + 1); window.scrollTo({top:0,behavior:'smooth'}); }}
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
            Next →
          </button>
        ) : (
          <button onClick={() => handleSave("completed")} disabled={!form.client_id || saving}
            className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
            {saving ? "Saving..." : encounterPolicy === "yes" && !attachedEncounterId ? "⚠️ Encounter Required" : "Complete Assessment ✓"}
          </button>
        )}
      </div>
      {form.client_id && <PatientTimelineDrawer patientId={form.client_id} />}
    </div>
  );
}

export default function NewBPSPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><BPSForm /></Suspense>;
}
