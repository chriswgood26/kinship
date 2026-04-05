"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import EncounterContextBanner from "@/components/EncounterContextBanner";
import EncounterAttachment from "@/components/EncounterAttachment";
import ClientTimelineDrawer from "@/components/ClientTimelineDrawer";

const SECTIONS = [
  { id: "identifying", label: "Identifying Information", icon: "👤" },
  { id: "presenting", label: "Presenting Concerns", icon: "🎯" },
  { id: "school", label: "School Functioning", icon: "🏫" },
  { id: "family", label: "Family & Home", icon: "🏠" },
  { id: "social", label: "Social Functioning", icon: "👥" },
  { id: "mh_history", label: "MH History", icon: "🧠" },
  { id: "substance", label: "Substance Use", icon: "💊" },
  { id: "medical", label: "Medical / Developmental", icon: "🏥" },
  { id: "trauma", label: "Trauma History", icon: "🛡️" },
  { id: "risk", label: "Risk & Safety", icon: "⚠️" },
  { id: "strengths", label: "Strengths & Resources", icon: "⭐" },
  { id: "diagnostic", label: "Diagnostic Impression", icon: "📋" },
];

function CUMHAForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState(params.get("patient_id") || "");
  const [attachedEncounterId, setAttachedEncounterId] = useState(params.get("encounter_id") || "");
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<{id:string;first_name:string;last_name:string;mrn:string|null}[]>([]);

  const [form, setForm] = useState({
    client_id: params.get("patient_id") || "",
    encounter_id: params.get("encounter_id") || "",
    assessment_date: new Date().toISOString().split("T")[0],
    assessor_name: "",
    assessor_credentials: "",
    // Section 1 — Identifying
    child_age: "",
    grade: "",
    school_name: "",
    guardian_name: "",
    guardian_relationship: "",
    referral_source: "",
    referral_reason: "",
    // Section 2 — Presenting
    presenting_concerns: "",
    onset: "",
    duration_of_concerns: "",
    previous_services: "no",
    previous_services_detail: "",
    // Section 3 — School
    academic_performance: "average",
    grade_retention: "no",
    special_education: "no",
    iep_504: "none",
    behavior_at_school: "",
    school_attendance: "regular",
    // Section 4 — Family
    family_structure: "",
    custody_arrangement: "",
    household_members: "",
    parenting_concerns: "",
    dhs_involvement: "no",
    dhs_detail: "",
    family_stability: "",
    // Section 5 — Social
    peer_relationships: "adequate",
    social_skills: "",
    extracurricular: "",
    community_involvement: "",
    // Section 6 — MH History
    previous_mh_diagnosis: "",
    previous_mh_treatment: "no",
    previous_hospitalizations: "no",
    current_medications: "",
    family_mh_history: "",
    // Section 7 — Substance Use
    child_substance_use: "none",
    substance_detail: "",
    family_substance_use: "no",
    // Section 8 — Medical
    birth_complications: "no",
    developmental_delays: "no",
    developmental_detail: "",
    medical_conditions: "",
    current_medications_medical: "",
    hearing_vision: "normal",
    // Section 9 — Trauma
    trauma_history: "none",
    trauma_types: [] as string[],
    trauma_impact: "",
    ptsd_symptoms: "no",
    // Section 10 — Risk
    suicidal_ideation: "none",
    self_harm: "no",
    homicidal_ideation: "no",
    runaway_history: "no",
    fire_setting: "no",
    animal_cruelty: "no",
    aggression: "no",
    safety_plan_needed: "no",
    // Section 11 — Strengths
    child_strengths: "",
    family_strengths: "",
    community_supports: "",
    cultural_strengths: "",
    // Section 12 — Diagnostic
    provisional_diagnoses: "",
    diagnostic_impression: "",
    level_of_care: "outpatient",
    recommended_services: "",
    safety_concerns: "",
  });

  const set = (k: string, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`, { credentials: "include" })
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  useEffect(() => {
    const pid = params.get("patient_id");
    if (pid) {
      fetch(`/api/clients/${pid}`, { credentials: "include" })
        .then(r => r.json()).then(d => {
          const p = d.patient || d.client;
          if (p) { setPatientId(p.id); setPatientName(`${p.last_name}, ${p.first_name}`); setForm(f => ({ ...f, client_id: p.id })); }
        }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then(r => r.json()).then(d => {
      if (d.profile) {
        setForm(f => ({ ...f, assessor_name: `${d.profile.first_name} ${d.profile.last_name}`, assessor_credentials: d.profile.credentials || "" }));
      }
    }).catch(() => {});
  }, []);

  async function handleSave(status: "draft" | "completed") {
    if (!form.client_id) return;
    setSaving(true);
    await fetch("/api/assessments", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        client_id: form.client_id,
        assessment_type: "CUMHA",
        assessment_date: form.assessment_date,
        assessor_name: `${form.assessor_name}${form.assessor_credentials ? `, ${form.assessor_credentials}` : ""}`,
        status,
        scores: form,
        clinical_notes: form.diagnostic_impression,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }),
    });
    setSaving(false);
    router.push("/dashboard/assessments");
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
      <EncounterContextBanner encounterId={params.get("encounter_id")} patientId={patientId} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/assessments" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CUMHA</h1>
            <p className="text-slate-500 text-sm mt-0.5">Children's Uniform Mental Health Assessment — Oregon OHA</p>
            {patientName ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-teal-600 text-sm font-medium">{patientName}</span>
                <button type="button" onClick={() => { setPatientName(""); setPatientId(""); setForm(f => ({ ...f, client_id: "" })); }}
                  className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg">✕ Change</button>
              </div>
            ) : (
              <div className="relative mt-1">
                <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 w-64"
                  placeholder="Search patient by name or MRN..." />
                {patients.length > 0 && (
                  <div className="absolute top-full left-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 w-72 max-h-48 overflow-y-auto">
                    {patients.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setPatientName(`${p.last_name}, ${p.first_name}`); setPatientId(p.id); setForm(f => ({ ...f, client_id: p.id })); setPatientSearch(""); setPatients([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-teal-50 border-b border-slate-50 last:border-0 text-sm">
                        <div className="font-semibold text-slate-900">{p.last_name}, {p.first_name}</div>
                        <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}</div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-amber-600 mt-1">⚠️ Select a patient to enable saving</p>
              </div>
            )}
          </div>
        </div>
        <button onClick={() => handleSave("draft")} disabled={!form.client_id || saving}
          className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
          Save Draft
        </button>
      </div>

      {/* Date + assessor */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div><label className={labelClass}>Assessment Date</label><input type="date" value={form.assessment_date} onChange={e => set("assessment_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Assessor Name</label><input value={form.assessor_name} onChange={e => set("assessor_name", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Credentials</label><input value={form.assessor_credentials} onChange={e => set("assessor_credentials", e.target.value)} className={inputClass} placeholder="LCSW, QMHP..." /></div>
        </div>
      </div>

      {/* Encounter Attachment */}
      {patientId && (
        <EncounterAttachment
          patientId={patientId}
          encounterId={attachedEncounterId}
          onEncounterChange={(id, action) => setAttachedEncounterId(action === "none" ? "" : id)}
        />
      )}

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">{section.icon} {section.label}</span>
          <span className="text-xs text-slate-400">{activeSection + 1} of {SECTIONS.length}</span>
        </div>
        <div className="flex gap-1 flex-wrap mb-3">
          {SECTIONS.map((s, i) => (
            <button key={s.id} onClick={() => { setActiveSection(i); window.scrollTo({top:0,behavior:'smooth'}); }}
              className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${i === activeSection ? "bg-[#0d1b2e] text-white" : i < activeSection ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"}`}>
              {i + 1}
            </button>
          ))}
        </div>
        <div className="bg-slate-100 rounded-full h-1.5">
          <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${((activeSection + 1) / SECTIONS.length) * 100}%` }} />
        </div>
      </div>

      {/* Section content */}
      {activeSection === 0 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">👤 Identifying Information</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelClass}>Child's Age</label><input value={form.child_age} onChange={e => set("child_age", e.target.value)} className={inputClass} placeholder="e.g. 12" /></div>
            <div><label className={labelClass}>Grade</label><input value={form.grade} onChange={e => set("grade", e.target.value)} className={inputClass} placeholder="e.g. 7th" /></div>
            <div><label className={labelClass}>School Name</label><input value={form.school_name} onChange={e => set("school_name", e.target.value)} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Parent / Guardian Name</label><input value={form.guardian_name} onChange={e => set("guardian_name", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Relationship</label>
              <select value={form.guardian_relationship} onChange={e => set("guardian_relationship", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Biological parent</option><option>Adoptive parent</option><option>Foster parent</option>
                <option>Grandparent</option><option>Other relative</option><option>Legal guardian</option><option>ODHS/DHS</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Referral Source</label>
              <select value={form.referral_source} onChange={e => set("referral_source", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Self/Family</option><option>School</option><option>DHS/ODHS</option><option>Primary care</option>
                <option>Court/Probation</option><option>Hospital/ED</option><option>Another provider</option><option>Other</option>
              </select>
            </div>
            <div><label className={labelClass}>Primary Reason for Referral</label><input value={form.referral_reason} onChange={e => set("referral_reason", e.target.value)} className={inputClass} /></div>
          </div>
        </div>
      )}

      {activeSection === 1 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🎯 Presenting Concerns</h2>
          <div><label className={labelClass}>Presenting Concerns (child/guardian perspective)</label><textarea value={form.presenting_concerns} onChange={e => set("presenting_concerns", e.target.value)} rows={4} className={inputClass + " resize-none"} placeholder="Describe the primary concerns as stated by child and/or guardian..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Onset of Concerns</label><input value={form.onset} onChange={e => set("onset", e.target.value)} className={inputClass} placeholder="When did symptoms begin?" /></div>
            <div><label className={labelClass}>Duration</label><input value={form.duration_of_concerns} onChange={e => set("duration_of_concerns", e.target.value)} className={inputClass} placeholder="How long has this been occurring?" /></div>
          </div>
          <div><label className={labelClass}>Previous Mental Health Services</label>{radioGroup("previous_services", [{value:"no",label:"No"},{value:"yes_outpatient",label:"Yes — Outpatient"},{value:"yes_inpatient",label:"Yes — Inpatient"},{value:"yes_both",label:"Both"}])}</div>
          {form.previous_services !== "no" && <div><label className={labelClass}>Previous Services Details</label><textarea value={form.previous_services_detail} onChange={e => set("previous_services_detail", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>}
        </div>
      )}

      {activeSection === 2 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🏫 School Functioning</h2>
          <div><label className={labelClass}>Academic Performance</label>{radioGroup("academic_performance", [{value:"above_average",label:"Above Average"},{value:"average",label:"Average"},{value:"below_average",label:"Below Average"},{value:"failing",label:"Failing"},{value:"not_enrolled",label:"Not Enrolled"}])}</div>
          <div><label className={labelClass}>Grade Retention</label>{radioGroup("grade_retention", [{value:"no",label:"No"},{value:"yes",label:"Yes — describe below"}])}</div>
          <div><label className={labelClass}>Special Education Services</label>{radioGroup("special_education", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
          <div><label className={labelClass}>IEP / 504 Plan</label>{radioGroup("iep_504", [{value:"none",label:"None"},{value:"iep",label:"IEP"},{value:"504",label:"504 Plan"},{value:"both",label:"Both"}])}</div>
          <div><label className={labelClass}>School Attendance</label>{radioGroup("school_attendance", [{value:"regular",label:"Regular"},{value:"some_absences",label:"Some Absences"},{value:"chronic_absences",label:"Chronic Absenteeism"},{value:"suspended",label:"Suspended/Expelled"}])}</div>
          <div><label className={labelClass}>Behavior at School</label><textarea value={form.behavior_at_school} onChange={e => set("behavior_at_school", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Describe child's behavior and relationships at school..." /></div>
        </div>
      )}

      {activeSection === 3 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🏠 Family & Home Environment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Family Structure</label>
              <select value={form.family_structure} onChange={e => set("family_structure", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option>Two-parent biological</option><option>Two-parent adoptive</option><option>Single parent (mother)</option>
                <option>Single parent (father)</option><option>Blended family</option><option>Foster family</option>
                <option>Grandparent(s)</option><option>Other relative</option><option>Group home/residential</option>
              </select>
            </div>
            <div><label className={labelClass}>Custody Arrangement</label><input value={form.custody_arrangement} onChange={e => set("custody_arrangement", e.target.value)} className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Household Members (names, ages, relationships)</label><textarea value={form.household_members} onChange={e => set("household_members", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
          <div><label className={labelClass}>DHS / ODHS Involvement</label>{radioGroup("dhs_involvement", [{value:"no",label:"No"},{value:"current",label:"Current open case"},{value:"past",label:"Past involvement — closed"},{value:"unknown",label:"Unknown"}])}</div>
          {form.dhs_involvement !== "no" && <div><label className={labelClass}>DHS Details</label><textarea value={form.dhs_detail} onChange={e => set("dhs_detail", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>}
          <div><label className={labelClass}>Family Stability / Stressors</label><textarea value={form.family_stability} onChange={e => set("family_stability", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Housing stability, financial stress, domestic violence, etc." /></div>
          <div><label className={labelClass}>Parenting Concerns</label><textarea value={form.parenting_concerns} onChange={e => set("parenting_concerns", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
        </div>
      )}

      {activeSection === 4 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">👥 Social Functioning</h2>
          <div><label className={labelClass}>Peer Relationships</label>{radioGroup("peer_relationships", [{value:"strong",label:"Strong"},{value:"adequate",label:"Adequate"},{value:"limited",label:"Limited"},{value:"problematic",label:"Problematic"},{value:"isolated",label:"Isolated"}])}</div>
          <div><label className={labelClass}>Social Skills</label><textarea value={form.social_skills} onChange={e => set("social_skills", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Describe child's social skills, friendships, interactions..." /></div>
          <div><label className={labelClass}>Extracurricular / Activities</label><input value={form.extracurricular} onChange={e => set("extracurricular", e.target.value)} className={inputClass} placeholder="Sports, clubs, hobbies, interests..." /></div>
          <div><label className={labelClass}>Community Involvement</label><input value={form.community_involvement} onChange={e => set("community_involvement", e.target.value)} className={inputClass} placeholder="Religious community, cultural groups, mentorship programs..." /></div>
        </div>
      )}

      {activeSection === 5 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🧠 Mental Health History</h2>
          <div><label className={labelClass}>Previous Psychiatric Diagnoses</label><input value={form.previous_mh_diagnosis} onChange={e => set("previous_mh_diagnosis", e.target.value)} className={inputClass} placeholder="List diagnoses if known..." /></div>
          <div><label className={labelClass}>Previous MH Treatment</label>{radioGroup("previous_mh_treatment", [{value:"no",label:"No"},{value:"yes_outpatient",label:"Outpatient"},{value:"yes_inpatient",label:"Inpatient"},{value:"yes_residential",label:"Residential"},{value:"yes_multiple",label:"Multiple levels"}])}</div>
          <div><label className={labelClass}>Previous Hospitalizations</label>{radioGroup("previous_hospitalizations", [{value:"no",label:"No"},{value:"yes_voluntary",label:"Yes — Voluntary"},{value:"yes_involuntary",label:"Yes — Involuntary"}])}</div>
          <div><label className={labelClass}>Current Psychiatric Medications</label><input value={form.current_medications} onChange={e => set("current_medications", e.target.value)} className={inputClass} placeholder="List medications and doses..." /></div>
          <div><label className={labelClass}>Family Mental Health History</label><textarea value={form.family_mh_history} onChange={e => set("family_mh_history", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
        </div>
      )}

      {activeSection === 6 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">💊 Substance Use</h2>
          <div><label className={labelClass}>Child's Substance Use</label>{radioGroup("child_substance_use", [{value:"none",label:"None"},{value:"tobacco",label:"Tobacco/Vaping"},{value:"alcohol",label:"Alcohol"},{value:"cannabis",label:"Cannabis"},{value:"other",label:"Other substances"},{value:"multiple",label:"Multiple"}])}</div>
          {form.child_substance_use !== "none" && <div><label className={labelClass}>Substance Use Details</label><textarea value={form.substance_detail} onChange={e => set("substance_detail", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>}
          <div><label className={labelClass}>Family Substance Use (in household)</label>{radioGroup("family_substance_use", [{value:"no",label:"No known"},{value:"alcohol",label:"Alcohol"},{value:"drugs",label:"Drugs"},{value:"both",label:"Both"},{value:"unknown",label:"Unknown"}])}</div>
        </div>
      )}

      {activeSection === 7 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🏥 Medical & Developmental History</h2>
          <div><label className={labelClass}>Birth Complications</label>{radioGroup("birth_complications", [{value:"no",label:"None"},{value:"yes",label:"Yes — describe below"},{value:"unknown",label:"Unknown"}])}</div>
          <div><label className={labelClass}>Developmental Delays</label>{radioGroup("developmental_delays", [{value:"no",label:"No"},{value:"speech",label:"Speech/Language"},{value:"motor",label:"Motor"},{value:"cognitive",label:"Cognitive"},{value:"multiple",label:"Multiple areas"}])}</div>
          {form.developmental_delays !== "no" && <div><label className={labelClass}>Developmental Details</label><textarea value={form.developmental_detail} onChange={e => set("developmental_detail", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>}
          <div><label className={labelClass}>Current Medical Conditions</label><textarea value={form.medical_conditions} onChange={e => set("medical_conditions", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
          <div><label className={labelClass}>Hearing / Vision Status</label>{radioGroup("hearing_vision", [{value:"normal",label:"Normal"},{value:"hearing_concerns",label:"Hearing concerns"},{value:"vision_concerns",label:"Vision concerns"},{value:"both_concerns",label:"Both concerns"}])}</div>
        </div>
      )}

      {activeSection === 8 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🛡️ Trauma History</h2>
          <div><label className={labelClass}>Trauma History</label>{radioGroup("trauma_history", [{value:"none",label:"None reported"},{value:"yes",label:"Yes — disclosed"},{value:"suspected",label:"Suspected"},{value:"declines",label:"Declines to disclose"}])}</div>
          {form.trauma_history !== "none" && (
            <>
              <div>
                <label className={labelClass}>Types of Trauma</label>
                <div className="flex flex-wrap gap-2">
                  {["Physical abuse","Sexual abuse","Emotional abuse","Neglect","Domestic violence","Parental incarceration","Parental substance use","Community violence","Accident/injury","Medical trauma","Loss/grief","Other"].map(t => (
                    <button key={t} type="button" onClick={() => {
                      const curr = form.trauma_types || [];
                      set("trauma_types", curr.includes(t) ? curr.filter((x:string) => x !== t) : [...curr, t]);
                    }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${(form.trauma_types || []).includes(t) ? "bg-teal-50 border-teal-300 text-teal-800" : "border-slate-200 text-slate-600"}`}>
                      {(form.trauma_types || []).includes(t) ? "✓ " : ""}{t}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className={labelClass}>Impact of Trauma on Functioning</label><textarea value={form.trauma_impact} onChange={e => set("trauma_impact", e.target.value)} rows={3} className={inputClass + " resize-none"} /></div>
            </>
          )}
          <div><label className={labelClass}>PTSD Symptoms</label>{radioGroup("ptsd_symptoms", [{value:"no",label:"No"},{value:"mild",label:"Mild"},{value:"moderate",label:"Moderate"},{value:"severe",label:"Severe"}])}</div>
        </div>
      )}

      {activeSection === 9 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">⚠️ Risk & Safety Assessment</h2>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 mb-4">
            ⚠️ If any risk is identified, initiate safety protocol and consult with supervisor.
          </div>
          <div><label className={labelClass}>Suicidal Ideation</label>{radioGroup("suicidal_ideation", [{value:"none",label:"None"},{value:"passive",label:"Passive ideation"},{value:"active_no_plan",label:"Active — no plan"},{value:"active_with_plan",label:"Active with plan"},{value:"intent",label:"Intent to act"}])}</div>
          <div><label className={labelClass}>Self-Harm</label>{radioGroup("self_harm", [{value:"no",label:"No"},{value:"past",label:"Past history"},{value:"current",label:"Current"}])}</div>
          <div><label className={labelClass}>Homicidal Ideation</label>{radioGroup("homicidal_ideation", [{value:"no",label:"No"},{value:"passive",label:"Passive"},{value:"active",label:"Active"}])}</div>
          <div><label className={labelClass}>Runaway / Elopement History</label>{radioGroup("runaway_history", [{value:"no",label:"No"},{value:"past",label:"Past"},{value:"current_concern",label:"Current concern"}])}</div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelClass}>Fire-setting</label>{radioGroup("fire_setting", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
            <div><label className={labelClass}>Animal Cruelty</label>{radioGroup("animal_cruelty", [{value:"no",label:"No"},{value:"yes",label:"Yes"}])}</div>
            <div><label className={labelClass}>Aggression / Violence</label>{radioGroup("aggression", [{value:"no",label:"No"},{value:"mild",label:"Mild"},{value:"moderate",label:"Moderate"},{value:"severe",label:"Severe"}])}</div>
          </div>
          <div><label className={labelClass}>Safety Plan Needed?</label>{radioGroup("safety_plan_needed", [{value:"no",label:"No"},{value:"yes_completed",label:"Yes — completed"},{value:"yes_crisis_referral",label:"Crisis referral made"}])}</div>
        </div>
      )}

      {activeSection === 10 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">⭐ Strengths & Resources</h2>
          <div><label className={labelClass}>Child's Strengths</label><textarea value={form.child_strengths} onChange={e => set("child_strengths", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Academic abilities, artistic/athletic talents, resilience, positive relationships, interests..." /></div>
          <div><label className={labelClass}>Family Strengths</label><textarea value={form.family_strengths} onChange={e => set("family_strengths", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Supportive relationships, cultural traditions, commitment to treatment..." /></div>
          <div><label className={labelClass}>Community Supports</label><textarea value={form.community_supports} onChange={e => set("community_supports", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="School support, community programs, faith community, mentors..." /></div>
          <div><label className={labelClass}>Cultural Strengths</label><input value={form.cultural_strengths} onChange={e => set("cultural_strengths", e.target.value)} className={inputClass} placeholder="Cultural identity, community, traditions that support wellbeing..." /></div>
        </div>
      )}

      {activeSection === 11 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">📋 Diagnostic Impression & Recommendations</h2>
          <div><label className={labelClass}>Provisional DSM-5 Diagnoses</label><textarea value={form.provisional_diagnoses} onChange={e => set("provisional_diagnoses", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Primary diagnosis, secondary diagnoses, rule-outs..." /></div>
          <div><label className={labelClass}>Clinical Summary / Diagnostic Impression</label><textarea value={form.diagnostic_impression} onChange={e => set("diagnostic_impression", e.target.value)} rows={5} className={inputClass + " resize-none"} placeholder="Integrate presenting concerns, history, risk, and strengths into clinical formulation..." /></div>
          <div><label className={labelClass}>Recommended Level of Care</label>
            <select value={form.level_of_care} onChange={e => set("level_of_care", e.target.value)} className={inputClass}>
              <option value="outpatient">Outpatient</option>
              <option value="iop">Intensive Outpatient (IOP)</option>
              <option value="php">Partial Hospitalization (PHP)</option>
              <option value="residential">Residential</option>
              <option value="inpatient">Inpatient Psychiatric</option>
              <option value="crisis">Crisis Stabilization</option>
            </select>
          </div>
          <div><label className={labelClass}>Recommended Services</label><textarea value={form.recommended_services} onChange={e => set("recommended_services", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Individual therapy, family therapy, case management, psychiatry, school-based services..." /></div>
          {(form.suicidal_ideation !== "none" || form.self_harm === "current" || form.homicidal_ideation !== "no") && (
            <div><label className={labelClass}>Safety Concerns & Plan</label><textarea value={form.safety_concerns} onChange={e => set("safety_concerns", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Document safety plan, crisis contacts, restrictions..." /></div>
          )}
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
            {saving ? "Saving..." : "Complete CUMHA ✓"}
          </button>
        )}
      </div>

      {patientId && <ClientTimelineDrawer clientId={patientId} />}
    </div>
  );
}

export default function NewCUMHAPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><CUMHAForm /></Suspense>;
}
