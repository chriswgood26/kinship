"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ── Common EBPs in behavioral health ─────────────────────────────────────────
const COMMON_EBPS = [
  { name: "Cognitive Behavioral Therapy (CBT)", category: "psychotherapy", evidence_level: "well_supported" },
  { name: "Dialectical Behavior Therapy (DBT)", category: "psychotherapy", evidence_level: "well_supported" },
  { name: "Acceptance and Commitment Therapy (ACT)", category: "psychotherapy", evidence_level: "well_supported" },
  { name: "Motivational Interviewing (MI)", category: "substance_use", evidence_level: "well_supported" },
  { name: "Trauma-Focused CBT (TF-CBT)", category: "trauma", evidence_level: "well_supported" },
  { name: "EMDR", category: "trauma", evidence_level: "well_supported" },
  { name: "Prolonged Exposure (PE)", category: "trauma", evidence_level: "well_supported" },
  { name: "Seeking Safety", category: "trauma", evidence_level: "well_supported" },
  { name: "Illness Management & Recovery (IMR)", category: "psychotherapy", evidence_level: "well_supported" },
  { name: "Supported Employment / IPS", category: "community", evidence_level: "well_supported" },
  { name: "Assertive Community Treatment (ACT)", category: "community", evidence_level: "well_supported" },
  { name: "Multisystemic Therapy (MST)", category: "family", evidence_level: "well_supported" },
  { name: "Functional Family Therapy (FFT)", category: "family", evidence_level: "well_supported" },
  { name: "Parent-Child Interaction Therapy (PCIT)", category: "family", evidence_level: "well_supported" },
  { name: "Cognitive Processing Therapy (CPT)", category: "trauma", evidence_level: "well_supported" },
  { name: "Medication-Assisted Treatment (MAT)", category: "medication", evidence_level: "well_supported" },
  { name: "WRAP (Wellness Recovery Action Plan)", category: "psychotherapy", evidence_level: "supported" },
  { name: "Skills Training in Affective & Interpersonal Regulation (STAIR)", category: "trauma", evidence_level: "supported" },
];

// ── Fidelity checklist templates by EBP category ──────────────────────────────
const DEFAULT_CHECKLIST: Record<string, string[]> = {
  psychotherapy: [
    "Clinician has completed required EBP training",
    "Weekly/biweekly supervision with EBP-trained supervisor",
    "Session structure follows manualized protocol",
    "Treatment goals are aligned with EBP model",
    "Outcome measures administered at designated intervals",
    "Session recordings available for supervision review",
    "Client engagement and attendance documented",
    "Homework/between-session practice assigned and reviewed",
    "EBP techniques (not just talk therapy) demonstrated",
    "Progress toward goals tracked systematically",
  ],
  substance_use: [
    "Clinician trained in MI / SUD EBP",
    "OARS micro-skills demonstrated in sessions",
    "Ambivalence explored non-judgmentally",
    "Client change talk evoked and reinforced",
    "Sustain talk de-emphasized",
    "Collaborative goal-setting documented",
    "Relapse prevention planning integrated",
    "Regular urine drug screens per protocol",
    "Family/support system involvement (where appropriate)",
    "Outcome measures (e.g., AUDIT, DAST) tracked",
  ],
  trauma: [
    "Clinician has trauma-focused EBP certification",
    "Trauma-informed consent and psychoeducation provided",
    "Safety assessment conducted at intake and regularly",
    "Trauma processing techniques applied per protocol",
    "Stabilization skills taught before processing",
    "Caregiver involvement documented (for youth EBPs)",
    "Trauma narrative or exposure completed per protocol",
    "Outcome measures (e.g., PCL-5, CPSS) tracked",
    "Vicarious trauma prevention plan in place for staff",
    "Session structure follows EBP manual",
  ],
  family: [
    "All key family members engaged in treatment",
    "Family sessions held at required frequency",
    "Family therapist trained in model",
    "Ecological/systemic assessment completed",
    "Family strengths and risks identified",
    "Interventions target specified family domains",
    "Supervision and consultation with model developer/trainer",
    "Outcome measures administered",
    "Treatment dosage meets model requirements",
    "Adherence rated via session observation or recording",
  ],
  community: [
    "Team composition meets model requirements",
    "Staff-to-client ratios within model standards",
    "Services provided in community (not office-based)",
    "24/7 crisis support available",
    "Individualized treatment planning",
    "Employment/housing/education goals addressed",
    "Peer specialists integrated into team",
    "Regular team meetings held per model",
    "Outcome measures tracked at required intervals",
    "Fidelity scale administered by external reviewer",
  ],
  medication: [
    "Prescriber trained in medication-assisted treatment",
    "Informed consent documented",
    "Prescription monitoring program (PDMP) checked",
    "Induction protocol followed",
    "Medication adherence monitored",
    "Counseling integrated with medication",
    "UDS schedule followed per protocol",
    "Dose adjustments documented with rationale",
    "Overdose prevention education provided",
    "Transition/tapering plan documented when applicable",
  ],
  other: [
    "Clinician training completed",
    "Supervision consistent with model requirements",
    "Protocol followed per session",
    "Outcome measures tracked",
    "Documentation reflects EBP delivery",
  ],
};

// ── Fidelity domain templates ────────────────────────────────────────────────
const DOMAIN_TEMPLATES = [
  { key: "training_competence", label: "Training & Competence" },
  { key: "supervision", label: "Supervision" },
  { key: "session_structure", label: "Session Structure / Protocol Adherence" },
  { key: "client_engagement", label: "Client Engagement" },
  { key: "technique_fidelity", label: "EBP Technique Fidelity" },
  { key: "documentation", label: "Documentation Quality" },
  { key: "outcome_monitoring", label: "Outcome Monitoring" },
  { key: "cultural_adaptation", label: "Cultural Responsiveness" },
];

type Practice = {
  id: string;
  practice_name: string;
  practice_category: string;
  fidelity_tool?: string;
};

type ChecklistItem = {
  item: string;
  met: boolean | null;
  notes: string;
};

function EBPNewPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const mode = params.get("mode") || "assessment"; // "practice" | "assessment"
  const preselectedPracticeId = params.get("practice_id") || "";

  const [saving, setSaving] = useState(false);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [useCommonEBP, setUseCommonEBP] = useState(true);

  // ── Practice form ────────────────────────────────────────────────────────
  const [practiceForm, setPracticeForm] = useState({
    practice_name: "",
    practice_category: "psychotherapy",
    evidence_level: "well_supported",
    target_population: "",
    description: "",
    trained_staff_count: "",
    training_completed_date: "",
    go_live_date: "",
    fidelity_tool: "",
    fidelity_tool_max_score: "",
    status: "active",
    notes: "",
  });

  // ── Assessment form ───────────────────────────────────────────────────────
  const [assessForm, setAssessForm] = useState({
    ebp_practice_id: preselectedPracticeId,
    assessment_date: new Date().toISOString().split("T")[0],
    assessor_name: "",
    clinician_assessed: "",
    program_assessed: "",
    assessment_type: "self_assessment",
    strengths: "",
    areas_for_improvement: "",
    recommendations: "",
    action_plan: "",
    follow_up_date: "",
    notes: "",
    status: "completed",
  });

  const [domainScores, setDomainScores] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Load practices for the assessment form
  useEffect(() => {
    fetch("/api/ebp-fidelity", { credentials: "include" })
      .then(r => r.json())
      .then(d => setPractices(d.practices || []));
  }, []);

  // Load checklist when practice selected
  useEffect(() => {
    if (!assessForm.ebp_practice_id) return;
    const practice = practices.find(p => p.id === assessForm.ebp_practice_id);
    if (!practice) return;
    const cat = practice.practice_category || "psychotherapy";
    const items = DEFAULT_CHECKLIST[cat] || DEFAULT_CHECKLIST.other;
    setChecklist(items.map(item => ({ item, met: null, notes: "" })));
  }, [assessForm.ebp_practice_id, practices]);

  // Compute overall score from domain scores
  const domainValues = Object.values(domainScores)
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v) && v >= 0 && v <= 100);
  const computedScore = domainValues.length > 0
    ? Math.round(domainValues.reduce((s, v) => s + v, 0) / domainValues.length)
    : null;

  // Also factor in checklist completion
  const checklistMet = checklist.filter(c => c.met === true).length;
  const checklistTotal = checklist.filter(c => c.met !== null).length;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistMet / checklistTotal) * 100) : null;

  const overallScore = computedScore !== null
    ? checklistPct !== null
      ? Math.round((computedScore + checklistPct) / 2)
      : computedScore
    : checklistPct;

  const fidelityLevel =
    overallScore === null ? null :
    overallScore >= 80 ? "High" :
    overallScore >= 60 ? "Moderate" :
    overallScore >= 40 ? "Low" : "Non-Adherent";

  const fidelityColor =
    fidelityLevel === "High" ? "text-emerald-700" :
    fidelityLevel === "Moderate" ? "text-amber-700" :
    fidelityLevel === "Low" ? "text-orange-700" :
    fidelityLevel === "Non-Adherent" ? "text-red-700" :
    "text-slate-400";

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  async function handleSavePractice() {
    if (!practiceForm.practice_name) return;
    setSaving(true);
    const res = await fetch("/api/ebp-fidelity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: "practice", ...practiceForm }),
    });
    if (res.ok) {
      router.push("/dashboard/assessments/ebp");
    } else {
      setSaving(false);
    }
  }

  async function handleSaveAssessment() {
    if (!assessForm.ebp_practice_id || !assessForm.assessor_name) return;
    setSaving(true);

    const itemsMet = checklist.filter(c => c.met === true).length;
    const itemsTotal = checklist.length;

    const res = await fetch("/api/ebp-fidelity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type: "assessment",
        ...assessForm,
        domain_scores: Object.fromEntries(
          Object.entries(domainScores)
            .filter(([, v]) => v !== "" && !isNaN(parseFloat(v)))
            .map(([k, v]) => [k, parseFloat(v)])
        ),
        checklist_items: checklist,
        items_met: itemsMet,
        items_total: itemsTotal,
        overall_score: overallScore,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/dashboard/assessments/ebp/${data.assessment.id}`);
    } else {
      setSaving(false);
    }
  }

  // ── Render: Add Practice mode ────────────────────────────────────────────
  if (mode === "practice") {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/assessments/ebp" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Register Evidence-Based Practice</h1>
            <p className="text-slate-500 text-sm mt-0.5">Add an EBP your agency is implementing</p>
          </div>
        </div>

        {/* Quick select */}
        {useCommonEBP && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <label className={labelClass}>Quick Select Common EBP</label>
              <button
                type="button"
                onClick={() => setUseCommonEBP(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Enter custom →
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
              {COMMON_EBPS.map(ebp => (
                <button
                  key={ebp.name}
                  type="button"
                  onClick={() => {
                    setPracticeForm(f => ({
                      ...f,
                      practice_name: ebp.name,
                      practice_category: ebp.category,
                      evidence_level: ebp.evidence_level,
                    }));
                    setUseCommonEBP(false);
                  }}
                  className="text-left px-4 py-2.5 border border-slate-100 rounded-xl hover:bg-teal-50 hover:border-teal-200 transition-colors"
                >
                  <div className="text-sm font-medium text-slate-900">{ebp.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{ebp.category.replace("_", " ")} · {ebp.evidence_level.replace("_", " ")}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <label className={labelClass}>Practice Name *</label>
            <input
              value={practiceForm.practice_name}
              onChange={e => setPracticeForm(f => ({ ...f, practice_name: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Cognitive Behavioral Therapy (CBT)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={practiceForm.practice_category}
                onChange={e => setPracticeForm(f => ({ ...f, practice_category: e.target.value }))}
                className={inputClass}
              >
                <option value="psychotherapy">Psychotherapy</option>
                <option value="substance_use">Substance Use</option>
                <option value="trauma">Trauma-Focused</option>
                <option value="family">Family</option>
                <option value="community">Community</option>
                <option value="medication">Medication</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Evidence Level</label>
              <select
                value={practiceForm.evidence_level}
                onChange={e => setPracticeForm(f => ({ ...f, evidence_level: e.target.value }))}
                className={inputClass}
              >
                <option value="well_supported">Well-Supported</option>
                <option value="supported">Supported</option>
                <option value="promising">Promising</option>
                <option value="emerging">Emerging</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Target Population</label>
            <input
              value={practiceForm.target_population}
              onChange={e => setPracticeForm(f => ({ ...f, target_population: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Adults with PTSD, Youth ages 5–18"
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={practiceForm.description}
              onChange={e => setPracticeForm(f => ({ ...f, description: e.target.value }))}
              className={inputClass}
              rows={3}
              placeholder="Brief description of this EBP and how your agency uses it"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Trained Staff Count</label>
              <input
                type="number"
                min={0}
                value={practiceForm.trained_staff_count}
                onChange={e => setPracticeForm(f => ({ ...f, trained_staff_count: e.target.value }))}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Training Completed</label>
              <input
                type="date"
                value={practiceForm.training_completed_date}
                onChange={e => setPracticeForm(f => ({ ...f, training_completed_date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Go-Live Date</label>
              <input
                type="date"
                value={practiceForm.go_live_date}
                onChange={e => setPracticeForm(f => ({ ...f, go_live_date: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Fidelity Tool / Scale</label>
              <input
                value={practiceForm.fidelity_tool}
                onChange={e => setPracticeForm(f => ({ ...f, fidelity_tool: e.target.value }))}
                className={inputClass}
                placeholder="e.g. SAMHSA DBT Fidelity Scale"
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={practiceForm.status}
                onChange={e => setPracticeForm(f => ({ ...f, status: e.target.value }))}
                className={inputClass}
              >
                <option value="planning">Planning</option>
                <option value="training">In Training</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={practiceForm.notes}
              onChange={e => setPracticeForm(f => ({ ...f, notes: e.target.value }))}
              className={inputClass}
              rows={2}
              placeholder="Implementation notes, contacts, resources..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/assessments/ebp" className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </Link>
          <button
            onClick={handleSavePractice}
            disabled={!practiceForm.practice_name || saving}
            className="bg-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-400 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Register EBP"}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Fidelity Assessment mode ────────────────────────────────────
  const selectedPractice = practices.find(p => p.id === assessForm.ebp_practice_id);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/assessments/ebp" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fidelity Assessment</h1>
          <p className="text-slate-500 text-sm mt-0.5">Rate EBP implementation quality</p>
        </div>
      </div>

      {/* EBP + Assessment Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Assessment Information</h2>

        <div>
          <label className={labelClass}>Evidence-Based Practice *</label>
          {practices.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              No EBPs registered yet.{" "}
              <Link href="/dashboard/assessments/ebp/new?mode=practice" className="underline font-semibold">
                Add one first →
              </Link>
            </div>
          ) : (
            <select
              value={assessForm.ebp_practice_id}
              onChange={e => setAssessForm(f => ({ ...f, ebp_practice_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">Select an EBP…</option>
              {practices.map(p => (
                <option key={p.id} value={p.id}>{p.practice_name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Assessment Date *</label>
            <input
              type="date"
              value={assessForm.assessment_date}
              onChange={e => setAssessForm(f => ({ ...f, assessment_date: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Assessment Type</label>
            <select
              value={assessForm.assessment_type}
              onChange={e => setAssessForm(f => ({ ...f, assessment_type: e.target.value }))}
              className={inputClass}
            >
              <option value="self_assessment">Self-Assessment</option>
              <option value="peer_review">Peer Review</option>
              <option value="supervisor_review">Supervisor Review</option>
              <option value="external_review">External Review</option>
              <option value="chart_audit">Chart Audit</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Assessor Name *</label>
            <input
              value={assessForm.assessor_name}
              onChange={e => setAssessForm(f => ({ ...f, assessor_name: e.target.value }))}
              className={inputClass}
              placeholder="Person conducting review"
            />
          </div>
          <div>
            <label className={labelClass}>Clinician / Staff Assessed</label>
            <input
              value={assessForm.clinician_assessed}
              onChange={e => setAssessForm(f => ({ ...f, clinician_assessed: e.target.value }))}
              className={inputClass}
              placeholder="Name (if individual review)"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Program / Unit Assessed</label>
          <input
            value={assessForm.program_assessed}
            onChange={e => setAssessForm(f => ({ ...f, program_assessed: e.target.value }))}
            className={inputClass}
            placeholder="e.g. Outpatient Adult Program, ACT Team B (optional)"
          />
        </div>
      </div>

      {/* Domain Scores */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Domain Ratings</h2>
          <span className="text-xs text-slate-400">Score each domain 0–100</span>
        </div>

        <div className="space-y-3">
          {DOMAIN_TEMPLATES.map(d => (
            <div key={d.key} className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm text-slate-700">{d.label}</label>
              </div>
              <div className="w-28 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={domainScores[d.key] || ""}
                  onChange={e => setDomainScores(s => ({ ...s, [d.key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="—"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
              {domainScores[d.key] && (
                <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden flex-shrink-0">
                  <div
                    className={`h-1.5 rounded-full ${
                      parseFloat(domainScores[d.key]) >= 80 ? "bg-emerald-500" :
                      parseFloat(domainScores[d.key]) >= 60 ? "bg-amber-400" :
                      "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(parseFloat(domainScores[d.key]), 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {computedScore !== null && (
          <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
            Domain average: <span className="font-bold text-slate-900">{computedScore}%</span>
          </div>
        )}
      </div>

      {/* Fidelity Checklist */}
      {checklist.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Fidelity Checklist</h2>
            <span className="text-xs text-slate-400">
              {checklistMet}/{checklist.filter(c => c.met !== null).length} met
              {checklistPct !== null && ` (${checklistPct}%)`}
            </span>
          </div>

          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className={`border rounded-xl p-3 ${
                item.met === true ? "border-emerald-200 bg-emerald-50" :
                item.met === false ? "border-red-200 bg-red-50" :
                "border-slate-200 bg-white"
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setChecklist(cl => cl.map((c, idx) => idx === i ? { ...c, met: true } : c))}
                      className={`w-7 h-7 rounded-lg text-xs font-bold border transition-colors ${
                        item.met === true
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-200 text-slate-400 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >✓</button>
                    <button
                      type="button"
                      onClick={() => setChecklist(cl => cl.map((c, idx) => idx === i ? { ...c, met: false } : c))}
                      className={`w-7 h-7 rounded-lg text-xs font-bold border transition-colors ${
                        item.met === false
                          ? "bg-red-500 border-red-500 text-white"
                          : "border-slate-200 text-slate-400 hover:border-red-300 hover:bg-red-50"
                      }`}
                    >✗</button>
                    <button
                      type="button"
                      onClick={() => setChecklist(cl => cl.map((c, idx) => idx === i ? { ...c, met: null } : c))}
                      className="w-7 h-7 rounded-lg text-xs border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors"
                    >—</button>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-800">{item.item}</div>
                    {item.met !== null && (
                      <input
                        value={item.notes}
                        onChange={e => setChecklist(cl => cl.map((c, idx) => idx === i ? { ...c, notes: e.target.value } : c))}
                        className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        placeholder="Notes (optional)"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live score summary */}
      {overallScore !== null && (
        <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Overall Fidelity Score</div>
            <div className={`text-3xl font-bold mt-0.5 ${fidelityColor}`}>{overallScore}%</div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${fidelityColor}`}>{fidelityLevel}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {fidelityLevel === "High" ? "≥ 80%" :
               fidelityLevel === "Moderate" ? "60–79%" :
               fidelityLevel === "Low" ? "40–59%" : "< 40%"}
            </div>
          </div>
        </div>
      )}

      {/* Narrative */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Narrative Summary</h2>

        <div>
          <label className={labelClass}>Strengths</label>
          <textarea
            value={assessForm.strengths}
            onChange={e => setAssessForm(f => ({ ...f, strengths: e.target.value }))}
            className={inputClass}
            rows={3}
            placeholder="What is being done well? Highlight fidelity successes…"
          />
        </div>

        <div>
          <label className={labelClass}>Areas for Improvement</label>
          <textarea
            value={assessForm.areas_for_improvement}
            onChange={e => setAssessForm(f => ({ ...f, areas_for_improvement: e.target.value }))}
            className={inputClass}
            rows={3}
            placeholder="What gaps or drift were identified?..."
          />
        </div>

        <div>
          <label className={labelClass}>Recommendations</label>
          <textarea
            value={assessForm.recommendations}
            onChange={e => setAssessForm(f => ({ ...f, recommendations: e.target.value }))}
            className={inputClass}
            rows={3}
            placeholder="Specific action items to improve fidelity…"
          />
        </div>

        <div>
          <label className={labelClass}>Action Plan</label>
          <textarea
            value={assessForm.action_plan}
            onChange={e => setAssessForm(f => ({ ...f, action_plan: e.target.value }))}
            className={inputClass}
            rows={3}
            placeholder="Who will do what by when?..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Follow-up Date</label>
            <input
              type="date"
              value={assessForm.follow_up_date}
              onChange={e => setAssessForm(f => ({ ...f, follow_up_date: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={assessForm.status}
              onChange={e => setAssessForm(f => ({ ...f, status: e.target.value }))}
              className={inputClass}
            >
              <option value="draft">Save as Draft</option>
              <option value="completed">Mark as Completed</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Additional Notes</label>
          <textarea
            value={assessForm.notes}
            onChange={e => setAssessForm(f => ({ ...f, notes: e.target.value }))}
            className={inputClass}
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/dashboard/assessments/ebp" className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Cancel
        </Link>
        <button
          onClick={handleSaveAssessment}
          disabled={!assessForm.ebp_practice_id || !assessForm.assessor_name || saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-400 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : assessForm.status === "completed" ? "Complete Assessment" : "Save Draft"}
        </button>
      </div>
    </div>
  );
}

export default function EBPNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading…</div>}>
      <EBPNewPageInner />
    </Suspense>
  );
}
