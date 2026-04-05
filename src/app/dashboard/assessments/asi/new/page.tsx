"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import EncounterContextBanner from "@/components/EncounterContextBanner";
import ClientTimelineDrawer from "@/components/ClientTimelineDrawer";
import {
  ASI_DOMAINS,
  INTERVIEWER_SEVERITY_LABELS,
  CLIENT_IMPORTANCE_LABELS,
  getSeverityBand,
  getCompositeSeverity,
} from "@/lib/asi";

const SECTIONS = [
  { id: "info",        label: "Interview Information",   icon: "📋" },
  { id: "medical",     label: "Medical Status",          icon: "🏥" },
  { id: "employment",  label: "Employment & Support",    icon: "💼" },
  { id: "alcohol",     label: "Alcohol Use",             icon: "🍺" },
  { id: "drug",        label: "Drug Use",                icon: "💊" },
  { id: "legal",       label: "Legal Status",            icon: "⚖️" },
  { id: "family",      label: "Family & Social",         icon: "👨‍👩‍👧" },
  { id: "psychiatric", label: "Psychiatric Status",      icon: "🧠" },
  { id: "summary",     label: "Summary & Ratings",       icon: "📊" },
];

const YES_NO = [
  { value: "no",  label: "No" },
  { value: "yes", label: "Yes" },
];

function ASIForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<{ id: string; first_name: string; last_name: string; mrn: string | null }[]>([]);

  const [form, setForm] = useState({
    client_id: params.get("patient_id") || "",
    encounter_id: params.get("encounter_id") || "",
    assessment_date: new Date().toISOString().split("T")[0],
    assessor_name: "",
    interview_type: "intake",        // intake | followup
    interview_number: "1",
    contact_type: "in_person",       // in_person | phone | video

    // ── Section 1: Medical ───────────────────────────────────────────
    med_hospitalized_lifetime: "",   // number of hospitalizations
    med_hospitalized_days30: "",     // days with problems last 30
    med_chronic_conditions: "",      // free text
    med_medication: "no",
    med_medication_details: "",
    med_disability: "no",
    med_disability_details: "",
    med_client_troubled: 0,          // 0–4
    med_client_importance: 0,        // 0–4
    med_severity: 0,                 // interviewer 0–9
    med_comments: "",

    // ── Section 2: Employment & Support ─────────────────────────────
    emp_education_years: "",
    emp_training: "no",
    emp_training_details: "",
    emp_work_years: "",
    emp_work_status: "",             // full_time | part_time | unemployed | student | retired | disabled
    emp_unemployment_days30: "",
    emp_income_sources: [] as string[],  // wages | disability | welfare | unemployment | family | illegal | other
    emp_income_amount30: "",
    emp_dependents: "",
    emp_client_troubled: 0,
    emp_client_importance: 0,
    emp_severity: 0,
    emp_comments: "",

    // ── Section 3: Alcohol Use ───────────────────────────────────────
    alc_age_first_use: "",
    alc_years_heavy_use: "",
    alc_intox_days30: "",           // days intoxicated last 30
    alc_withdrawal: "no",
    alc_withdrawal_seizure: "no",
    alc_delirium: "no",
    alc_treatment_episodes: "",
    alc_last_treatment: "",
    alc_money_spent30: "",
    alc_client_troubled: 0,
    alc_client_importance: 0,
    alc_severity: 0,
    alc_comments: "",

    // ── Section 4: Drug Use ──────────────────────────────────────────
    drug_heroin_ever: "no",
    drug_heroin_route: "",
    drug_heroin_age_first: "",
    drug_heroin_years: "",
    drug_heroin_days30: "",
    drug_methadone_ever: "no",
    drug_methadone_days30: "",
    drug_other_opioid_ever: "no",
    drug_other_opioid_days30: "",
    drug_barbiturate_ever: "no",
    drug_barbiturate_days30: "",
    drug_benzo_ever: "no",
    drug_benzo_days30: "",
    drug_cocaine_ever: "no",
    drug_cocaine_days30: "",
    drug_amphetamine_ever: "no",
    drug_amphetamine_days30: "",
    drug_cannabis_ever: "no",
    drug_cannabis_days30: "",
    drug_hallucinogen_ever: "no",
    drug_hallucinogen_days30: "",
    drug_inhalant_ever: "no",
    drug_inhalant_days30: "",
    drug_other_ever: "no",
    drug_other_details: "",
    drug_other_days30: "",
    drug_primary_substance: "",
    drug_secondary_substance: "",
    drug_injection_ever: "no",
    drug_injection_days30: "",
    drug_overdose_lifetime: "",
    drug_treatment_episodes: "",
    drug_money_spent30: "",
    drug_client_troubled: 0,
    drug_client_importance: 0,
    drug_severity: 0,
    drug_comments: "",

    // ── Section 5: Legal Status ──────────────────────────────────────
    legal_charged_ever: "no",
    legal_drug_charges: "",
    legal_dui: "",
    legal_theft: "",
    legal_assault: "",
    legal_other_charges: "",
    legal_incarcerated_months: "",
    legal_last_incarcerated: "",
    legal_probation: "no",
    legal_awaiting_charges: "no",
    legal_awaiting_details: "",
    legal_illegal_activity_days30: "",
    legal_client_troubled: 0,
    legal_client_importance: 0,
    legal_severity: 0,
    legal_comments: "",

    // ── Section 6: Family & Social ───────────────────────────────────
    fam_marital_status: "",          // never | married | widowed | separated | divorced | cohabiting
    fam_satisfied_marital: 0,        // 0–4
    fam_living_with: [] as string[], // sexual_partner | children | parents | family | friends | alone | controlled_env | other
    fam_satisfied_living: 0,         // 0–4
    fam_conflict_family_days30: "",
    fam_conflict_social_days30: "",
    fam_abuse_past: "no",
    fam_abuse_type: "",
    fam_family_alcohol: "no",
    fam_family_drug: "no",
    fam_family_psych: "no",
    fam_close_contacts: "",
    fam_satisfied_social: 0,         // 0–4
    fam_client_troubled: 0,
    fam_client_importance: 0,
    fam_severity: 0,
    fam_comments: "",

    // ── Section 7: Psychiatric ───────────────────────────────────────
    psy_hospitalized_lifetime: "",
    psy_outpatient_lifetime: "",
    psy_medication_psych: "no",
    psy_medication_details: "",
    psy_depression_days30: "",
    psy_anxiety_days30: "",
    psy_hallucinations_days30: "",
    psy_cognitive_problems_days30: "",
    psy_violent_days30: "",
    psy_suicidal_ideation_days30: "",
    psy_suicide_attempt_lifetime: "",
    psy_current_diagnoses: "",
    psy_client_troubled: 0,
    psy_client_importance: 0,
    psy_severity: 0,
    psy_comments: "",

    // ── Summary ──────────────────────────────────────────────────────
    interviewer_comments: "",
  });

  const set = (k: string, v: string | number | string[]) => setForm(f => ({ ...f, [k]: v }));

  // Pre-fill patient
  useEffect(() => {
    const pid = params.get("patient_id");
    if (pid) {
      fetch(`/api/clients/${pid}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          const p = d.patient || d.client;
          if (p) {
            setPatientName(`${p.last_name}, ${p.first_name}`);
            setForm(f => ({ ...f, client_id: p.id }));
          }
        })
        .catch(() => {});
    }
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
          setForm(f => ({ ...f, assessor_name: full }));
        }
      })
      .catch(() => {});
  }, []);

  // Patient search
  useEffect(() => {
    if (!patientSearch || patientSearch.length < 2) { setPatients([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/clients?q=${encodeURIComponent(patientSearch)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setPatients(d.clients || d.patients || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const interviewerRatings: Record<string, number> = {
    medical: form.med_severity,
    employment: form.emp_severity,
    alcohol: form.alc_severity,
    drug: form.drug_severity,
    legal: form.legal_severity,
    family: form.fam_severity,
    psychiatric: form.psy_severity,
  };
  const compositeScore = getCompositeSeverity(interviewerRatings);

  async function handleSave(status: "draft" | "completed") {
    if (!form.client_id) return;
    setSaving(true);
    const totalScore = Math.round(
      Object.values(interviewerRatings).reduce((a, b) => a + b, 0)
    );
    const res = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_id: form.client_id,
        assessment_type: "ASI",
        assessment_date: form.assessment_date,
        assessor_name: form.assessor_name,
        status,
        scores: form,
        total_score: totalScore,
        clinical_notes: form.interviewer_comments,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/assessments");
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";
  const sectionClass = "bg-white rounded-2xl border border-slate-200 p-6 space-y-5";

  function radioGroup(key: string, options: { value: string; label: string }[]) {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o.value} type="button"
            onClick={() => set(key, o.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              (form as unknown as Record<string, string>)[key] === o.value
                ? "bg-teal-500 text-white border-teal-500"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  function multiSelect(key: string, options: string[]) {
    const current: string[] = (form as unknown as Record<string, string[]>)[key] || [];
    return (
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} type="button"
            onClick={() => set(key, current.includes(o) ? current.filter(x => x !== o) : [...current, o])}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
              current.includes(o) ? "bg-teal-50 border-teal-300 text-teal-800" : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}>
            {current.includes(o) ? "✓ " : ""}{o}
          </button>
        ))}
      </div>
    );
  }

  function severitySlider(key: string, max: 4 | 9, label: string) {
    const val = (form as unknown as Record<string, number>)[key] || 0;
    const options = max === 4 ? CLIENT_IMPORTANCE_LABELS : INTERVIEWER_SEVERITY_LABELS;
    return (
      <div>
        <label className={labelClass}>{label}</label>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={max} value={val}
            onChange={e => set(key, parseInt(e.target.value))}
            className="flex-1 accent-teal-500" />
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
            max === 9 ? getSeverityBand(val).color : "bg-slate-100 text-slate-700"
          }`}>
            {val}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {options[val]?.label || ""}
        </p>
      </div>
    );
  }

  function domainRatingBox(domain: {
    clientTroubled: string;
    clientImportance: string;
    severity: string;
    comments: string;
  }) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Self-Ratings</h3>
        {severitySlider(domain.clientTroubled, 4, "How much have you been troubled by this area? (0–4)")}
        {severitySlider(domain.clientImportance, 4, "How important is treatment in this area? (0–4)")}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Interviewer Severity Rating</h3>
          {severitySlider(domain.severity, 9, "Interviewer composite severity (0–9)")}
        </div>
        <div>
          <label className={labelClass}>Comments / Confidence Notes</label>
          <textarea
            value={(form as unknown as Record<string, string>)[domain.comments] || ""}
            onChange={e => set(domain.comments, e.target.value)}
            rows={2}
            className={inputClass + " resize-none"}
            placeholder="Note any factors affecting rating confidence..."
          />
        </div>
      </div>
    );
  }

  const section = SECTIONS[activeSection];

  return (
    <div className="max-w-3xl space-y-5">
      <EncounterContextBanner encounterId={params.get("encounter_id")} patientId={form.client_id} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/assessments" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Addiction Severity Index</h1>
            <p className="text-slate-400 text-xs mt-0.5">ASI 5th Edition — McLellan et al.</p>
            {patientName && <p className="text-teal-600 text-sm font-medium mt-0.5">{patientName}</p>}
          </div>
        </div>
        <button
          onClick={() => handleSave("draft")}
          disabled={!form.client_id || saving}
          className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
          Save Draft
        </button>
      </div>

      {/* Section progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-1 flex-wrap">
          {SECTIONS.map((s, i) => (
            <button key={s.id}
              onClick={() => { setActiveSection(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                i === activeSection ? "bg-[#0d1b2e] text-white" : "border border-slate-200 text-slate-500 hover:border-slate-300"
              }`}>
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{i + 1}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 text-sm font-semibold text-slate-700">
          {section.icon} {section.label} <span className="text-slate-400 font-normal text-xs">({activeSection + 1} of {SECTIONS.length})</span>
        </div>
        <div className="mt-2 bg-slate-100 rounded-full h-1.5">
          <div className="bg-teal-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((activeSection + 1) / SECTIONS.length) * 100}%` }} />
        </div>
      </div>

      {/* ── Section 0: Interview Information ── */}
      {activeSection === 0 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">📋 Interview Information</h2>

          {/* Patient search */}
          {!form.client_id ? (
            <div>
              <label className={labelClass}>Client / Patient *</label>
              <input
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                className={inputClass}
                placeholder="Search by name or MRN..."
              />
              {patients.length > 0 && (
                <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {patients.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => {
                        setForm(f => ({ ...f, client_id: p.id }));
                        setPatientName(`${p.last_name}, ${p.first_name}`);
                        setPatientSearch("");
                        setPatients([]);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-900">{p.last_name}, {p.first_name}</span>
                      {p.mrn && <span className="ml-2 text-xs text-slate-400">MRN: {p.mrn}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
              <span className="text-sm font-semibold text-teal-800">{patientName}</span>
              <button onClick={() => { setForm(f => ({ ...f, client_id: "" })); setPatientName(""); }}
                className="text-xs text-teal-600 hover:text-teal-800">Change</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Assessment Date</label>
              <input type="date" value={form.assessment_date}
                onChange={e => set("assessment_date", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Assessor Name & Credentials</label>
              <input value={form.assessor_name}
                onChange={e => set("assessor_name", e.target.value)}
                className={inputClass} placeholder="Name, LCSW" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Interview Type</label>
              {radioGroup("interview_type", [
                { value: "intake", label: "Intake" },
                { value: "followup", label: "Follow-up" },
              ])}
            </div>
            <div>
              <label className={labelClass}>Interview Number</label>
              <input value={form.interview_number}
                onChange={e => set("interview_number", e.target.value)}
                className={inputClass} placeholder="1" />
            </div>
            <div>
              <label className={labelClass}>Contact Type</label>
              {radioGroup("contact_type", [
                { value: "in_person", label: "In Person" },
                { value: "phone",     label: "Phone" },
                { value: "video",     label: "Video" },
              ])}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
            <strong>Instructions:</strong> The ASI is a structured clinical interview covering 7 problem areas. 
            Rate each domain using standardized scales — the client provides self-ratings (0–4) and the 
            interviewer provides composite severity ratings (0–9) based on the full clinical picture.
          </div>
        </div>
      )}

      {/* ── Section 1: Medical Status ── */}
      {activeSection === 1 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🏥 Medical Status</h2>
          <p className="text-xs text-slate-500">Assess physical health, chronic conditions, and healthcare utilization.</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Hospitalizations (lifetime, not psych)</label>
              <input value={form.med_hospitalized_lifetime}
                onChange={e => set("med_hospitalized_lifetime", e.target.value)}
                className={inputClass} placeholder="Number of times" type="number" min="0" />
            </div>
            <div>
              <label className={labelClass}>Days with Medical Problems (past 30)</label>
              <input value={form.med_hospitalized_days30}
                onChange={e => set("med_hospitalized_days30", e.target.value)}
                className={inputClass} placeholder="0–30" type="number" min="0" max="30" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Chronic Medical Conditions / Diagnoses</label>
            <textarea value={form.med_chronic_conditions}
              onChange={e => set("med_chronic_conditions", e.target.value)}
              rows={3} className={inputClass + " resize-none"}
              placeholder="List all chronic conditions, recent diagnoses, and significant medical history..." />
          </div>

          <div>
            <label className={labelClass}>Currently Taking Prescribed Medications?</label>
            {radioGroup("med_medication", YES_NO)}
          </div>
          {form.med_medication === "yes" && (
            <div>
              <label className={labelClass}>Medication Details</label>
              <textarea value={form.med_medication_details}
                onChange={e => set("med_medication_details", e.target.value)}
                rows={2} className={inputClass + " resize-none"}
                placeholder="Medication name, dose, prescribing provider..." />
            </div>
          )}

          <div>
            <label className={labelClass}>Disability or Physical Limitation?</label>
            {radioGroup("med_disability", YES_NO)}
          </div>
          {form.med_disability === "yes" && (
            <div>
              <label className={labelClass}>Disability Details</label>
              <input value={form.med_disability_details}
                onChange={e => set("med_disability_details", e.target.value)}
                className={inputClass} placeholder="Type, severity, functional impact..." />
            </div>
          )}

          {domainRatingBox({
            clientTroubled: "med_client_troubled",
            clientImportance: "med_client_importance",
            severity: "med_severity",
            comments: "med_comments",
          })}
        </div>
      )}

      {/* ── Section 2: Employment & Support ── */}
      {activeSection === 2 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">💼 Employment & Support Status</h2>
          <p className="text-xs text-slate-500">Assess education, vocational history, and financial situation.</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Years of Education Completed</label>
              <input value={form.emp_education_years}
                onChange={e => set("emp_education_years", e.target.value)}
                className={inputClass} placeholder="e.g., 12" type="number" min="0" max="30" />
            </div>
            <div>
              <label className={labelClass}>Years of Paid Work (lifetime)</label>
              <input value={form.emp_work_years}
                onChange={e => set("emp_work_years", e.target.value)}
                className={inputClass} placeholder="e.g., 5" type="number" min="0" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Vocational Training or Technical Education?</label>
            {radioGroup("emp_training", YES_NO)}
          </div>
          {form.emp_training === "yes" && (
            <div>
              <label className={labelClass}>Training Details</label>
              <input value={form.emp_training_details}
                onChange={e => set("emp_training_details", e.target.value)}
                className={inputClass} placeholder="Type and duration of training..." />
            </div>
          )}

          <div>
            <label className={labelClass}>Current Work Status</label>
            <select value={form.emp_work_status}
              onChange={e => set("emp_work_status", e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              <option value="full_time">Employed full-time (≥35 hrs/wk)</option>
              <option value="part_time">Employed part-time (&lt;35 hrs/wk)</option>
              <option value="unemployed_seeking">Unemployed — seeking work</option>
              <option value="unemployed_not_seeking">Unemployed — not seeking work</option>
              <option value="student">Student</option>
              <option value="homemaker">Homemaker</option>
              <option value="retired">Retired</option>
              <option value="disabled">Disability / unable to work</option>
              <option value="incarcerated">Incarcerated</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Days Unemployed (past 30)</label>
            <input value={form.emp_unemployment_days30}
              onChange={e => set("emp_unemployment_days30", e.target.value)}
              className={inputClass} placeholder="0–30" type="number" min="0" max="30" />
          </div>

          <div>
            <label className={labelClass}>Sources of Income (past 30 days — select all that apply)</label>
            {multiSelect("emp_income_sources", [
              "Employment wages", "Disability/SSI", "Welfare/public assistance",
              "Unemployment benefits", "Family/friends support", "Illegal activities", "Other",
            ])}
          </div>

          <div>
            <label className={labelClass}>Estimated Income (past 30 days)</label>
            <input value={form.emp_income_amount30}
              onChange={e => set("emp_income_amount30", e.target.value)}
              className={inputClass} placeholder="$ amount" />
          </div>

          <div>
            <label className={labelClass}>Number of Dependents</label>
            <input value={form.emp_dependents}
              onChange={e => set("emp_dependents", e.target.value)}
              className={inputClass} placeholder="Number of people financially dependent on client" type="number" min="0" />
          </div>

          {domainRatingBox({
            clientTroubled: "emp_client_troubled",
            clientImportance: "emp_client_importance",
            severity: "emp_severity",
            comments: "emp_comments",
          })}
        </div>
      )}

      {/* ── Section 3: Alcohol Use ── */}
      {activeSection === 3 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🍺 Alcohol Use</h2>
          <p className="text-xs text-slate-500">Document alcohol use history, patterns, and related problems.</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Age at First Use</label>
              <input value={form.alc_age_first_use}
                onChange={e => set("alc_age_first_use", e.target.value)}
                className={inputClass} placeholder="Age" type="number" min="0" />
            </div>
            <div>
              <label className={labelClass}>Years of Heavy Drinking (lifetime)</label>
              <input value={form.alc_years_heavy_use}
                onChange={e => set("alc_years_heavy_use", e.target.value)}
                className={inputClass} placeholder="Years" type="number" min="0" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Days Intoxicated (past 30)</label>
            <input value={form.alc_intox_days30}
              onChange={e => set("alc_intox_days30", e.target.value)}
              className={inputClass} placeholder="0–30" type="number" min="0" max="30" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Experienced Withdrawal?</label>
              {radioGroup("alc_withdrawal", YES_NO)}
            </div>
            <div>
              <label className={labelClass}>Withdrawal Seizure?</label>
              {radioGroup("alc_withdrawal_seizure", YES_NO)}
            </div>
            <div>
              <label className={labelClass}>Delirium Tremens?</label>
              {radioGroup("alc_delirium", YES_NO)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prior Treatment Episodes</label>
              <input value={form.alc_treatment_episodes}
                onChange={e => set("alc_treatment_episodes", e.target.value)}
                className={inputClass} placeholder="Number" type="number" min="0" />
            </div>
            <div>
              <label className={labelClass}>Last Treatment (approximate date)</label>
              <input value={form.alc_last_treatment}
                onChange={e => set("alc_last_treatment", e.target.value)}
                className={inputClass} placeholder="Month/Year or 'Never'" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Money Spent on Alcohol (past 30 days)</label>
            <input value={form.alc_money_spent30}
              onChange={e => set("alc_money_spent30", e.target.value)}
              className={inputClass} placeholder="$ amount" />
          </div>

          {domainRatingBox({
            clientTroubled: "alc_client_troubled",
            clientImportance: "alc_client_importance",
            severity: "alc_severity",
            comments: "alc_comments",
          })}
        </div>
      )}

      {/* ── Section 4: Drug Use ── */}
      {activeSection === 4 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">💊 Drug Use</h2>
          <p className="text-xs text-slate-500">Document use of each substance category — lifetime and past 30 days.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 text-slate-500 font-semibold">Substance</th>
                  <th className="text-center py-2 px-2 text-slate-500 font-semibold">Ever Used?</th>
                  <th className="text-center py-2 px-2 text-slate-500 font-semibold">Days (past 30)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: "Heroin",              ever: "drug_heroin_ever",       days: "drug_heroin_days30" },
                  { label: "Methadone",            ever: "drug_methadone_ever",    days: "drug_methadone_days30" },
                  { label: "Other Opioids",        ever: "drug_other_opioid_ever", days: "drug_other_opioid_days30" },
                  { label: "Barbiturates",         ever: "drug_barbiturate_ever",  days: "drug_barbiturate_days30" },
                  { label: "Benzodiazepines",      ever: "drug_benzo_ever",        days: "drug_benzo_days30" },
                  { label: "Cocaine / Crack",      ever: "drug_cocaine_ever",      days: "drug_cocaine_days30" },
                  { label: "Amphetamines / Meth",  ever: "drug_amphetamine_ever",  days: "drug_amphetamine_days30" },
                  { label: "Cannabis / Marijuana", ever: "drug_cannabis_ever",     days: "drug_cannabis_days30" },
                  { label: "Hallucinogens",        ever: "drug_hallucinogen_ever", days: "drug_hallucinogen_days30" },
                  { label: "Inhalants",            ever: "drug_inhalant_ever",     days: "drug_inhalant_days30" },
                  { label: "Other",                ever: "drug_other_ever",        days: "drug_other_days30" },
                ].map(row => (
                  <tr key={row.ever}>
                    <td className="py-2 pr-4 font-medium text-slate-700">{row.label}</td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex justify-center gap-1">
                        {YES_NO.map(o => (
                          <button key={o.value} type="button"
                            onClick={() => set(row.ever, o.value)}
                            className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors ${
                              (form as unknown as Record<string, string>)[row.ever] === o.value
                                ? "bg-teal-500 text-white border-teal-500"
                                : "border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number" min="0" max="30"
                        value={(form as unknown as Record<string, string>)[row.days] || ""}
                        onChange={e => set(row.days, e.target.value)}
                        disabled={(form as unknown as Record<string, string>)[row.ever] !== "yes"}
                        className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-30 disabled:bg-slate-50"
                        placeholder="0–30"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {form.drug_other_ever === "yes" && (
            <div>
              <label className={labelClass}>Other Substance Details</label>
              <input value={form.drug_other_details}
                onChange={e => set("drug_other_details", e.target.value)}
                className={inputClass} placeholder="Substance name, route..." />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Primary Substance of Use</label>
              <input value={form.drug_primary_substance}
                onChange={e => set("drug_primary_substance", e.target.value)}
                className={inputClass} placeholder="Most problematic substance..." />
            </div>
            <div>
              <label className={labelClass}>Secondary Substance of Use</label>
              <input value={form.drug_secondary_substance}
                onChange={e => set("drug_secondary_substance", e.target.value)}
                className={inputClass} placeholder="Second most problematic..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>History of Injection Drug Use?</label>
              {radioGroup("drug_injection_ever", YES_NO)}
            </div>
            {form.drug_injection_ever === "yes" && (
              <div>
                <label className={labelClass}>Days Injected (past 30)</label>
                <input value={form.drug_injection_days30}
                  onChange={e => set("drug_injection_days30", e.target.value)}
                  className={inputClass} placeholder="0–30" type="number" min="0" max="30" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Lifetime Overdoses</label>
              <input value={form.drug_overdose_lifetime}
                onChange={e => set("drug_overdose_lifetime", e.target.value)}
                className={inputClass} placeholder="Number" type="number" min="0" />
            </div>
            <div>
              <label className={labelClass}>Prior Drug Treatment Episodes</label>
              <input value={form.drug_treatment_episodes}
                onChange={e => set("drug_treatment_episodes", e.target.value)}
                className={inputClass} placeholder="Number" type="number" min="0" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Money Spent on Drugs (past 30 days)</label>
            <input value={form.drug_money_spent30}
              onChange={e => set("drug_money_spent30", e.target.value)}
              className={inputClass} placeholder="$ amount" />
          </div>

          {domainRatingBox({
            clientTroubled: "drug_client_troubled",
            clientImportance: "drug_client_importance",
            severity: "drug_severity",
            comments: "drug_comments",
          })}
        </div>
      )}

      {/* ── Section 5: Legal Status ── */}
      {activeSection === 5 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">⚖️ Legal Status</h2>
          <p className="text-xs text-slate-500">Document legal history, charges, and current legal situation.</p>

          <div>
            <label className={labelClass}>Ever Arrested or Charged?</label>
            {radioGroup("legal_charged_ever", YES_NO)}
          </div>

          {form.legal_charged_ever === "yes" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Drug Charges (number)</label>
                  <input value={form.legal_drug_charges}
                    onChange={e => set("legal_drug_charges", e.target.value)}
                    className={inputClass} placeholder="Number of charges" type="number" min="0" />
                </div>
                <div>
                  <label className={labelClass}>DUI / DWI Charges (number)</label>
                  <input value={form.legal_dui}
                    onChange={e => set("legal_dui", e.target.value)}
                    className={inputClass} placeholder="Number of charges" type="number" min="0" />
                </div>
                <div>
                  <label className={labelClass}>Theft / Property Charges</label>
                  <input value={form.legal_theft}
                    onChange={e => set("legal_theft", e.target.value)}
                    className={inputClass} placeholder="Number of charges" type="number" min="0" />
                </div>
                <div>
                  <label className={labelClass}>Assault / Violent Charges</label>
                  <input value={form.legal_assault}
                    onChange={e => set("legal_assault", e.target.value)}
                    className={inputClass} placeholder="Number of charges" type="number" min="0" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Other Charges</label>
                <input value={form.legal_other_charges}
                  onChange={e => set("legal_other_charges", e.target.value)}
                  className={inputClass} placeholder="Describe other legal charges..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Total Months Incarcerated (lifetime)</label>
                  <input value={form.legal_incarcerated_months}
                    onChange={e => set("legal_incarcerated_months", e.target.value)}
                    className={inputClass} placeholder="Months" type="number" min="0" />
                </div>
                <div>
                  <label className={labelClass}>Date of Last Incarceration</label>
                  <input value={form.legal_last_incarcerated}
                    onChange={e => set("legal_last_incarcerated", e.target.value)}
                    className={inputClass} placeholder="Month/Year or 'Never'" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className={labelClass}>Currently on Probation or Parole?</label>
            {radioGroup("legal_probation", YES_NO)}
          </div>

          <div>
            <label className={labelClass}>Currently Awaiting Charges, Trial, or Sentencing?</label>
            {radioGroup("legal_awaiting_charges", YES_NO)}
          </div>
          {form.legal_awaiting_charges === "yes" && (
            <div>
              <label className={labelClass}>Details</label>
              <input value={form.legal_awaiting_details}
                onChange={e => set("legal_awaiting_details", e.target.value)}
                className={inputClass} placeholder="Describe pending legal matters..." />
            </div>
          )}

          <div>
            <label className={labelClass}>Days Engaged in Illegal Activity (past 30)</label>
            <input value={form.legal_illegal_activity_days30}
              onChange={e => set("legal_illegal_activity_days30", e.target.value)}
              className={inputClass} placeholder="0–30" type="number" min="0" max="30" />
          </div>

          {domainRatingBox({
            clientTroubled: "legal_client_troubled",
            clientImportance: "legal_client_importance",
            severity: "legal_severity",
            comments: "legal_comments",
          })}
        </div>
      )}

      {/* ── Section 6: Family & Social ── */}
      {activeSection === 6 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">👨‍👩‍👧 Family & Social Relationships</h2>
          <p className="text-xs text-slate-500">Assess family dynamics, social support, and interpersonal conflicts.</p>

          <div>
            <label className={labelClass}>Marital Status</label>
            <select value={form.fam_marital_status}
              onChange={e => set("fam_marital_status", e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              <option value="never">Never married</option>
              <option value="married">Married</option>
              <option value="cohabiting">Cohabiting / Partnered</option>
              <option value="separated">Separated</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Satisfaction with Marital/Relationship Status (0–4)</label>
            {severitySlider("fam_satisfied_marital", 4, "Satisfaction with current relationship status")}
          </div>

          <div>
            <label className={labelClass}>Currently Living With (select all that apply)</label>
            {multiSelect("fam_living_with", [
              "Sexual partner", "Children", "Parents", "Other family",
              "Friends / roommates", "Alone", "Controlled environment (halfway house, etc.)", "Other",
            ])}
          </div>

          <div>
            <label className={labelClass}>Satisfaction with Living Situation (0–4)</label>
            {severitySlider("fam_satisfied_living", 4, "Satisfaction with living arrangement")}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Days with Family Conflicts (past 30)</label>
              <input value={form.fam_conflict_family_days30}
                onChange={e => set("fam_conflict_family_days30", e.target.value)}
                className={inputClass} placeholder="0–30" type="number" min="0" max="30" />
            </div>
            <div>
              <label className={labelClass}>Days with Social Conflicts (past 30)</label>
              <input value={form.fam_conflict_social_days30}
                onChange={e => set("fam_conflict_social_days30", e.target.value)}
                className={inputClass} placeholder="0–30" type="number" min="0" max="30" />
            </div>
          </div>

          <div>
            <label className={labelClass}>History of Abuse or Neglect?</label>
            {radioGroup("fam_abuse_past", YES_NO)}
          </div>
          {form.fam_abuse_past === "yes" && (
            <div>
              <label className={labelClass}>Type(s) of Abuse</label>
              <input value={form.fam_abuse_type}
                onChange={e => set("fam_abuse_type", e.target.value)}
                className={inputClass} placeholder="Physical, emotional, sexual, neglect..." />
            </div>
          )}

          <div>
            <label className={labelClass}>Family History (select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "fam_family_alcohol", label: "Alcohol problems" },
                { key: "fam_family_drug",    label: "Drug problems" },
                { key: "fam_family_psych",   label: "Psychiatric problems" },
              ].map(item => (
                <button key={item.key} type="button"
                  onClick={() => set(item.key, (form as unknown as Record<string, string>)[item.key] === "yes" ? "no" : "yes")}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                    (form as unknown as Record<string, string>)[item.key] === "yes"
                      ? "bg-teal-500 text-white border-teal-500"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}>
                  {(form as unknown as Record<string, string>)[item.key] === "yes" ? "✓ " : ""}{item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Number of Close Contacts (supportive friends/family)</label>
            <input value={form.fam_close_contacts}
              onChange={e => set("fam_close_contacts", e.target.value)}
              className={inputClass} placeholder="Number" type="number" min="0" />
          </div>

          {domainRatingBox({
            clientTroubled: "fam_client_troubled",
            clientImportance: "fam_client_importance",
            severity: "fam_severity",
            comments: "fam_comments",
          })}
        </div>
      )}

      {/* ── Section 7: Psychiatric Status ── */}
      {activeSection === 7 && (
        <div className={sectionClass}>
          <h2 className="font-bold text-slate-900">🧠 Psychiatric Status</h2>
          <p className="text-xs text-slate-500">Assess psychiatric symptoms, treatment history, and current mental health needs.</p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            ⚠️ Do not include symptoms that are solely due to substance use. Focus on psychiatric symptoms experienced 
            during periods of sobriety when possible.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Psychiatric Hospitalizations (lifetime)</label>
              <input value={form.psy_hospitalized_lifetime}
                onChange={e => set("psy_hospitalized_lifetime", e.target.value)}
                className={inputClass} placeholder="Number" type="number" min="0" />
            </div>
            <div>
              <label className={labelClass}>Outpatient Psychiatric Treatment (lifetime)</label>
              <input value={form.psy_outpatient_lifetime}
                onChange={e => set("psy_outpatient_lifetime", e.target.value)}
                className={inputClass} placeholder="Number of episodes" type="number" min="0" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Currently Prescribed Psychiatric Medications?</label>
            {radioGroup("psy_medication_psych", YES_NO)}
          </div>
          {form.psy_medication_psych === "yes" && (
            <div>
              <label className={labelClass}>Psychiatric Medication Details</label>
              <textarea value={form.psy_medication_details}
                onChange={e => set("psy_medication_details", e.target.value)}
                rows={2} className={inputClass + " resize-none"}
                placeholder="Medication, dose, compliance..." />
            </div>
          )}

          <div>
            <label className={labelClass}>Symptoms (past 30 days) — enter days experienced</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "psy_depression_days30",         label: "Depression / hopelessness" },
                { key: "psy_anxiety_days30",             label: "Anxiety / panic" },
                { key: "psy_hallucinations_days30",      label: "Hallucinations" },
                { key: "psy_cognitive_problems_days30",  label: "Cognitive / memory problems" },
                { key: "psy_violent_days30",             label: "Violent thoughts or behavior" },
                { key: "psy_suicidal_ideation_days30",   label: "Suicidal ideation" },
              ].map(item => (
                <div key={item.key}>
                  <label className={labelClass}>{item.label}</label>
                  <input
                    type="number" min="0" max="30"
                    value={(form as unknown as Record<string, string>)[item.key] || ""}
                    onChange={e => set(item.key, e.target.value)}
                    className={inputClass} placeholder="0–30 days"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Lifetime Suicide Attempts</label>
            <input value={form.psy_suicide_attempt_lifetime}
              onChange={e => set("psy_suicide_attempt_lifetime", e.target.value)}
              className={inputClass} placeholder="Number" type="number" min="0" />
          </div>

          <div>
            <label className={labelClass}>Current Psychiatric Diagnoses</label>
            <textarea value={form.psy_current_diagnoses}
              onChange={e => set("psy_current_diagnoses", e.target.value)}
              rows={3} className={inputClass + " resize-none"}
              placeholder="List confirmed or suspected DSM-5 diagnoses..." />
          </div>

          {domainRatingBox({
            clientTroubled: "psy_client_troubled",
            clientImportance: "psy_client_importance",
            severity: "psy_severity",
            comments: "psy_comments",
          })}
        </div>
      )}

      {/* ── Section 8: Summary ── */}
      {activeSection === 8 && (
        <div className="space-y-5">
          <div className={sectionClass}>
            <h2 className="font-bold text-slate-900">📊 Summary — Composite Severity Profile</h2>
            <p className="text-xs text-slate-500">Overview of interviewer severity ratings across all 7 ASI domains.</p>

            <div className="space-y-3">
              {ASI_DOMAINS.map(domain => {
                const rating = interviewerRatings[domain.id] ?? 0;
                const band = getSeverityBand(rating);
                return (
                  <div key={domain.id} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center">{domain.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{domain.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${band.color}`}>{rating}/9</span>
                          <span className="text-xs text-slate-400">{band.label}</span>
                        </div>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            rating >= 7 ? "bg-red-500" :
                            rating >= 5 ? "bg-orange-400" :
                            rating >= 3 ? "bg-amber-400" :
                            "bg-emerald-400"
                          }`}
                          style={{ width: `${(rating / 9) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Composite Average</span>
              <span className={`text-lg font-bold px-3 py-1 rounded-xl ${getSeverityBand(Math.round(compositeScore)).color}`}>
                {compositeScore} / 9
              </span>
            </div>
          </div>

          <div className={sectionClass}>
            <h2 className="font-bold text-slate-900">Interviewer Summary Notes</h2>
            <textarea
              value={form.interviewer_comments}
              onChange={e => set("interviewer_comments", e.target.value)}
              rows={6}
              className={inputClass + " resize-none"}
              placeholder="Overall clinical impression, notable findings, treatment recommendations, level of care suggestion..." />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setActiveSection(Math.max(0, activeSection - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          disabled={activeSection === 0}
          className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-30">
          ← Previous
        </button>
        <span className="text-xs text-slate-400">{activeSection + 1} of {SECTIONS.length}</span>
        {activeSection < SECTIONS.length - 1 ? (
          <button
            onClick={() => { setActiveSection(activeSection + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
            Next →
          </button>
        ) : (
          <button
            onClick={() => handleSave("completed")}
            disabled={!form.client_id || saving}
            className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
            {saving ? "Saving..." : "Complete Assessment ✓"}
          </button>
        )}
      </div>

      {form.client_id && <ClientTimelineDrawer clientId={form.client_id} />}
    </div>
  );
}

export default function NewASIPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <ASIForm />
    </Suspense>
  );
}
