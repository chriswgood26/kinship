"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

export const dynamic = "force-dynamic";

const FEATURE_DOCS = [
  {
    id: "timesheet",
    icon: "⏱️",
    title: "Timesheet & Time Tracking",
    summary: "Billable hours tracking, payroll export, all-staff reporting",
    features: [
      {
        name: "Log a Time Entry",
        workflow: [
          "Navigate to Reporting → ⏱️ Timesheet",
          "Click + Log Time",
          "Enter date, start time, end time (duration auto-calculates)",
          "Select activity type — billable/non-billable pre-set based on type",
          "Optionally link to a patient (search by name)",
          "Select funding source (Medicaid/CCBHC/Block Grant/etc.)",
          "Add activity description and notes if needed",
          "Check or uncheck Billable as needed",
          "Click Log Time → entry appears in weekly view",
        ],
        notes: "Shortcut: ⏱️ Log Time button on any encounter detail page opens timesheet directly. Time entries are linked to your logged-in profile automatically.",
      },
      {
        name: "Weekly Timesheet View",
        workflow: [
          "Use ← → arrows to navigate between weeks",
          "Click This week to return to current week",
          "Day headers show total hours for that day",
          "Summary cards show: Total Hours / Billable Hours / Non-Billable / Entry Count",
          "Each entry shows: date, activity, patient, time range, duration, billable badge",
          "Click ✕ on any entry to delete it",
        ],
        notes: "",
      },
      {
        name: "All Staff View (Admin/Supervisor)",
        workflow: [
          "Click 'All Staff' tab at top of timesheet page",
          "See all clinicians' entries for the selected week",
          "Filter to a specific clinician using the dropdown",
          "Totals update to reflect filtered view",
        ],
        notes: "Useful for supervisors reviewing productivity, payroll preparation, and funding source compliance reporting.",
      },
      {
        name: "Export for Payroll",
        workflow: [
          "Navigate to the week you want to export",
          "Click 📥 Export CSV",
          "CSV downloads with: Date, Clinician, Patient, Activity, Start, End, Hours, Billable, Funding Source, Notes",
          "Open in Excel/Google Sheets and map to your payroll system",
        ],
        notes: "For multi-funding-source agencies (CCBHC + Medicaid + Block Grant), the Funding Source column enables cost allocation reporting.",
      },
    ],
  },

  {
    id: "vitals",
    icon: "🩺",
    title: "Vitals",
    summary: "Physical health measurements, trend charts, BMI calculation",
    features: [
      {
        name: "Record Vitals",
        workflow: [
          "Patient detail → 🩺 Vitals button in header",
          "Click + Record Vitals",
          "Enter BP (systolic/diastolic), HR, temperature, O₂ sat, resp rate, weight, height, blood glucose",
          "Pain scale: drag slider 0–10",
          "BMI auto-calculates live as weight and height are entered",
          "Save → appears in history table and trend charts immediately",
        ],
        notes: "CCO-6 (Physical Health Screenings) measure is powered by vitals data — patients with vitals in the past 12 months count toward the benchmark.",
      },
      {
        name: "Trend Charts",
        workflow: [
          "Requires 2+ vitals entries to show charts",
          "Click tab: Blood Pressure / Heart Rate / Temperature / O₂ Sat / Weight / Pain",
          "Reference lines show clinical normal ranges",
          "Latest reading shown in summary cards with status label (Normal/Elevated/Fever/etc.)",
        ],
        notes: "BP card shows clinical stage (Normal / Elevated / Stage 1 / Stage 2 / Hypertensive Crisis). HR shows Bradycardia/Normal/Tachycardia.",
      },
    ],
  },
  {
    id: "problem-list",
    icon: "📋",
    title: "Problem List",
    summary: "Persistent active diagnosis list on patient record",
    features: [
      {
        name: "Managing the Problem List",
        workflow: [
          "Patient detail → right column → 📋 Problem List card",
          "Click + Add Problem",
          "Search by ICD-10 code or description using autocomplete",
          "Set status: Active / Chronic / In Remission / Resolved",
          "Optional: set onset date",
          "Save → appears in list with color-coded status badge",
          "Change status inline using dropdown on each item",
          "Resolved problems collapse under 'Show X resolved' link",
        ],
        notes: "Problem List persists across encounters — it is not per-visit. This is the patient's longitudinal diagnosis history.",
      },
    ],
  },
  {
    id: "discharge",
    icon: "🚪",
    title: "Discharge Summary",
    summary: "Structured discharge documentation template",
    features: [
      {
        name: "Creating a Discharge Summary",
        workflow: [
          "Patient detail → 📋 Discharge button in header",
          "Enter discharge date and type (Planned / AMA / Transfer / Step Down / etc.)",
          "Enter 'Discharged To' destination",
          "Use ICD-10 autocomplete for primary diagnoses at discharge",
          "Complete Treatment Summary, Goals Achieved, Goals Not Achieved",
          "Document medications at discharge",
          "Enter follow-up plan, referrals made, patient instructions",
          "Clinician name and credentials auto-fill from your user profile",
          "Click Save & Sign Discharge Summary",
        ],
        notes: "Discharge summaries are saved as encounter records (type: discharge_summary). They appear in the encounters list.",
      },
    ],
  },
  {
    id: "copay",
    icon: "💵",
    title: "Copay Collection",
    summary: "Collect copays at check-in with auto-populated amounts",
    features: [
      {
        name: "Copay at Check-In",
        workflow: [
          "Scheduling page → day view → appointment row shows green '✓ Check In' button",
          "Click Check In → Copay Collection Modal opens",
          "Copay pre-fills from patient's insurance record (if on file)",
          "Select payment method: Cash / Check / Credit Card / Debit Card / Waived / Skip",
          "For checks: enter check number",
          "Click 'Collect $XX & Check In' → appointment marked Arrived + paid charge created",
          "Or 'Check In Without Copay' to skip collection",
        ],
        notes: "A paid charge record is automatically created when copay is collected. Waived copays are noted in the charge record for audit purposes.",
      },
      {
        name: "Setting Copay on Patient Insurance",
        workflow: [
          "Patient detail → Edit button → Insurance section → Copay Amount field",
          "Or: Sidebar → Financial Eligibility → click patient → Edit Insurance → Copay field",
          "Also enter: Annual Deductible, Deductible Met (YTD), Out-of-Pocket Max",
          "Save → copay auto-populates on next check-in",
        ],
        notes: "",
      },
    ],
  },
  {
    id: "clearinghouse",
    icon: "🏥",
    title: "Clearinghouse Setup",
    summary: "5-step enrollment wizard to connect to a claims clearinghouse",
    features: [
      {
        name: "Clearinghouse Enrollment Wizard",
        workflow: [
          "Admin → 🏥 Clearinghouse in sidebar",
          "Step 1: Select clearinghouse — Office Ally (recommended), Availity, Change Healthcare",
          "Step 2: Enroll — enter practice name, NPI, Tax ID, billing contact",
          "Click Submit Enrollment → confirmation sent to clearinghouse (3–5 business days)",
          "Step 3: Select payers — check each insurance company you bill",
          "Step 4: Test mode — awaiting credentials from clearinghouse",
          "Step 5: Go Live — activate live submission once credentials approved",
        ],
        notes: "Each payer enrollment takes 2–4 weeks after clearinghouse account is active. Start with your most common payers (BCBS, Medicaid, Aetna, Cigna, UHC).",
      },
    ],
  },
  {
    id: "stripe",
    icon: "💳",
    title: "Online Patient Payments",
    summary: "Stripe Connect for patient invoice payments",
    features: [
      {
        name: "Connect Stripe",
        workflow: [
          "Admin → Settings → scroll to Online Payments section",
          "Click 'Connect Stripe' → redirected to Stripe Express onboarding (5 min)",
          "Enter bank account details in Stripe",
          "Return to DN → shows ✓ Connected status",
        ],
        notes: "Payments go directly to your bank account. DrCloud Neo charges a 0.5% platform fee. Stripe charges 2.9% + 30¢ per transaction.",
      },
      {
        name: "Send Payment Link to Patient",
        workflow: [
          "Billing → Invoices → click any unpaid invoice",
          "Scroll to '💳 Accept Online Payment' section",
          "Click 'Generate Payment Link' → Stripe Checkout opens in new tab",
          "Copy the URL and send to patient via email or portal message",
          "Patient pays with card → invoice auto-marked paid → billing staff notified",
        ],
        notes: "Requires Stripe to be connected in Admin → Settings first.",
      },
    ],
  },
  {
    id: "programs",
    icon: "🏥",
    title: "Programs & Services",
    summary: "Program enrollment, census, and caseload management",
    features: [
      {
        name: "Configure Programs",
        workflow: [
          "Admin → Programs & Services in sidebar",
          "Click + New Program",
          "Enter name, code, program type, description, capacity",
          "Save → program available for patient enrollment",
        ],
        notes: "Default programs seeded: Adult Outpatient MH, IOP, DD Day Program, CCBHC Services, Crisis Stabilization Unit.",
      },
      {
        name: "Enroll Patient in Program",
        workflow: [
          "Patient detail → right column → 🏥 Programs & Services card",
          "Click + Enroll",
          "Select program from dropdown",
          "Set admission date, status (Active/Pending/On Hold), assigned worker",
          "Click Enroll → patient enrolled immediately",
          "Click Discharge to end enrollment",
        ],
        notes: "",
      },
      {
        name: "Program Census View",
        workflow: [
          "Admin → Programs & Services",
          "Click any program in the left panel",
          "Right panel shows Active Census — all enrolled patients",
          "Click patient name → goes to their detail page",
        ],
        notes: "",
      },
    ],
  },
  {
    id: "financial-eligibility",
    icon: "💲",
    title: "Financial Eligibility",
    summary: "Income assessment, SFS, insurance, and payer information hub",
    features: [
      {
        name: "Financial Eligibility Hub",
        workflow: [
          "Sidebar → 💲 Financial Eligibility",
          "Shows all active patients with FPL%, SFS status, insurance, and quick actions",
          "Filter by: No Assessment / Expired / Expiring Soon / No Insurance",
          "Click 'Update SFS' or '+ SFS Assessment' to go to patient's income page",
          "Click 'Edit Insurance' to update payer info",
        ],
        notes: "Use this page as your daily worklist for financial eligibility follow-up.",
      },
      {
        name: "Income Assessment + Insurance on Patient",
        workflow: [
          "Patient detail → 💲 SFS button in header",
          "Section 1: Complete income assessment (annual income + family size → FPL auto-calculates)",
          "Section 2: Insurance / Payer Information (provider, member ID, group, copay, deductible)",
          "Section 3: Supporting Documents (upload pay stubs, insurance cards, EOBs)",
          "Section 4: Assessment history",
        ],
        notes: "Income assessments expire annually. The Financial Eligibility hub flags expired assessments.",
      },
    ],
  },
  {
    id: "sliding-fee",
    icon: "📊",
    title: "Sliding Fee Scale",
    summary: "FPL-based income assessment and automatic charge discounts",
    features: [
      {
        name: "Configure Sliding Fee Schedule",
        workflow: [
          "Admin → 💲 Sliding Fee",
          "Edit tiers: FPL range, discount type (flat $ or %), discount value",
          "Live preview shows what a $180 charge costs at each tier",
          "Click Save Schedule → applies to future auto-generated charges",
        ],
        notes: "Default 5 tiers: Tier A $5 (≤100% FPL) through Full Pay (>251% FPL). Uses 2026 HHS Federal Poverty Guidelines.",
      },
      {
        name: "Auto-Adjustment on Charge",
        workflow: [
          "Complete patient income assessment (see Financial Eligibility)",
          "When clinician signs an encounter → draft charge auto-created",
          "System checks patient's active income assessment",
          "Calculates SFS discount → creates charge_adjustment record",
          "patient_responsibility field updated automatically",
          "Biller reviews in Billing → Draft tab → sees patient responsibility pre-calculated",
        ],
        notes: "",
      },
    ],
  },
  {
    id: "auth-renewal",
    icon: "🔄",
    title: "Prior Authorization Renewal",
    summary: "Proactive renewal alerts and one-click renewal workflow",
    features: [
      {
        name: "Auth Renewal Workflow",
        workflow: [
          "Authorizations list → amber banner shows when auths expire within 30 days → click 'View Expiring →'",
          "Click any expiring authorization to open detail page",
          "Amber banner shows '🔄 Renew Auth →' button",
          "Click → opens New Authorization form pre-filled with same payer, CPT, patient",
          "Update dates and submit as new authorization",
        ],
        notes: "Sessions low (≤3 remaining) also triggers the renewal alert. Check Authorizations before month-end to ensure uninterrupted service.",
      },
    ],
  },
  {
    id: "portal-messaging",
    icon: "💬",
    title: "Portal Messaging",
    summary: "Secure two-way messaging between patients and care team",
    features: [
      {
        name: "Patient Sends Message (Portal Side)",
        workflow: [
          "Patient logs into portal at /portal/sign-in",
          "Navigates to Messages → Send Message to Care Team",
          "Enter subject and message → Send",
          "Appears in history as 'From you'",
        ],
        notes: "⚠️ 911 reminder always visible. Not monitored 24/7.",
      },
      {
        name: "Staff Receives and Replies",
        workflow: [
          "Inbox → Portal Msgs tab (blue badge shows unread count)",
          "Click 'View patient & reply →'",
          "Patient profile → 💬 Portal Messages section → click ↩ Reply",
          "Compose reply → Send to Portal → appears in patient's portal",
        ],
        notes: "",
      },
    ],
  },
  {
    id: "roi-signatures",
    icon: "✍️",
    title: "ROI Signatures & 42 CFR Part 2",
    summary: "Electronic and written signature capture, substance use compliance",
    features: [
      {
        name: "Written Signature Workflow",
        workflow: [
          "Create ROI → Signature Method: Written",
          "Print ROI → patient signs → scan → upload via drag-and-drop",
          "Click ✓ Mark Patient Signed → Activate",
        ],
        notes: "",
      },
      {
        name: "Electronic Signature",
        workflow: [
          "Create ROI → Signature Method: Electronic",
          "Canvas pad appears on ROI detail page",
          "Patient draws signature with mouse or finger",
          "Click ✓ Capture Signature & Activate ROI",
        ],
        notes: "",
      },
      {
        name: "42 CFR Part 2 — Substance Use Records",
        workflow: [
          "On ROI form → check ☑ This ROI involves substance use disorder records",
          "Federal redisclosure language previews immediately",
          "'42 CFR Part 2' amber badge on list and detail views",
          "Verbatim language included on printed ROI",
        ],
        notes: "Required by federal law for any SUD treatment records. Language is mandated verbatim.",
      },
    ],
  },
  {
    id: "clinical-documentation",
    icon: "⚕️",
    title: "Clinical Documentation",
    summary: "SOAP notes, supervisor review, DD progress notes",
    features: [
      {
        name: "SOAP Notes",
        workflow: [
          "Start encounter from patient detail, scheduling, or Encounters page",
          "Select encounter type",
          "Write note in 4 tabs: Subjective → Objective → Assessment → Plan",
          "Search and add ICD-10 diagnosis codes",
          "Click Sign & Lock → note is timestamped and immutable",
        ],
        notes: "Signed notes show ✓ Signed badge. Unsigned notes appear in reports and supervisor queue.",
      },
      {
        name: "Supervisor Review & Co-Signature",
        workflow: [
          "Clinician signs note → supervisor receives in-app notification",
          "Supervisor → Clinical → Supervisor Review",
          "Review pending notes → add optional feedback → click Co-sign",
          "Clinician receives notification that their note was co-signed",
        ],
        notes: "Required for associate-level clinicians (LCSW-A, LPC Associate). Counts toward CCO-4 compliance.",
      },
      {
        name: "DD Progress Notes",
        workflow: [
          "Clinical → DD Progress Notes → + New Progress Note",
          "Select client, date, shift (auto-detected by time)",
          "Complete 8 documentation sections",
          "Rate ISP goals: Made progress / No opportunity / Did not meet / Achieved",
          "Save → redirects to note list",
        ],
        notes: "",
      },
    ],
  },
  {
    id: "assessments",
    icon: "📊",
    title: "Assessments & Screenings",
    summary: "PHQ-9, GAD-7, C-SSRS, IM+CANS with scoring and alerts",
    features: [
      {
        name: "PHQ-9 (Depression Screening)",
        workflow: [
          "Clinical → Assessments → + New PHQ-9",
          "Search and select patient",
          "Answer 9 questions (0-3 buttons)",
          "Live score updates → Sign and save",
          "Severity: Minimal (0-4) / Mild (5-9) / Moderate (10-14) / Moderately Severe (15-19) / Severe (20-27)",
        ],
        notes: "Question 9 (suicidal ideation) triggers a red alert if answered > 0.",
      },
      {
        name: "C-SSRS (Columbia Suicide Risk)",
        workflow: [
          "Clinical → Assessments → + New C-SSRS",
          "Step 1 — Ideation: 5 YES/NO questions",
          "EMERGENCY alert fires immediately if Level 5 (specific plan + intent)",
          "Step 2 — Intensity, Step 3 — Behavior",
          "Step 4 — Results: Low/Moderate/High/Imminent risk level + safety plan notes",
        ],
        notes: "Save button turns red for High/Imminent risk. Immediate intervention required.",
      },
    ],
  },
  {
    id: "scheduling",
    icon: "📅",
    title: "Scheduling",
    summary: "Individual, group, multi-provider, and provider-only appointments",
    features: [
      {
        name: "Individual Appointments",
        workflow: [
          "Scheduling → + New Appointment",
          "Search patient, select type, date, time, duration",
          "Status: Scheduled → Confirmed → Arrived (via Check In) → Completed",
          "Provider filter: pill buttons to filter by staff member or 'My Schedule'",
        ],
        notes: "",
      },
      {
        name: "Provider-Only Appointments",
        workflow: [
          "New Appointment → check '📅 Provider-only appointment'",
          "Select type: Staff Meeting / Supervision / Training / Admin / Lunch / PTO / On-Call",
          "No patient required → save",
          "Appears as grey block on calendar",
        ],
        notes: "",
      },
      {
        name: "Check-In with Copay",
        workflow: [
          "Scheduling day view → ✓ Check In button on each appointment",
          "Modal shows pre-filled copay from insurance record",
          "Select payment method → Collect & Check In",
        ],
        notes: "See Copay Collection section for full workflow.",
      },
    ],
  },
  {
    id: "billing",
    icon: "💰",
    title: "Billing & Revenue Cycle",
    summary: "Charge capture, 837P claims, invoices, sliding fee",
    features: [
      {
        name: "Auto-Draft Charges on Sign",
        workflow: [
          "Clinician signs a note → draft charge auto-created",
          "CPT mapped by encounter type (Individual→90837, Group→90853, etc.)",
          "SFS adjustment auto-calculated if patient has active income assessment",
          "Billing page shows amber 'X draft charges need review' banner",
          "Click ✓ Approve on each draft → moves to Pending",
        ],
        notes: "",
      },
      {
        name: "837P Claim Submission",
        workflow: [
          "Billing → Submit Claims → click 🔍 Run Scrub",
          "Fix any errors flagged (8 validation rules)",
          "Select charges → Preview 837P → Download EDI file",
          "Upload to clearinghouse → Mark Submitted",
        ],
        notes: "",
      },
      {
        name: "Patient Invoices",
        workflow: [
          "Billing → Patient Invoices → + New Invoice",
          "Select patient → import paid charges → adjust amounts",
          "Set due date → Create Invoice → Mark Sent",
          "Record payment (cash/check/card/ACH) or generate online payment link",
        ],
        notes: "",
      },
    ],
  },
  {
    id: "patient-portal",
    icon: "🌐",
    title: "Patient Portal",
    summary: "Secure patient and family access to health information",
    features: [
      {
        name: "Creating Portal Access",
        workflow: [
          "Admin → 🌐 Patient Portal → + Create Portal Account",
          "Search patient → enter name, email, relationship, access permissions",
          "Go to Clerk dashboard → invite the email",
          "Patient visits /portal/sign-in → sets password → logs in",
        ],
        notes: "",
      },
      {
        name: "What Patients See",
        workflow: [
          "Appointments: upcoming and past",
          "Care Plan: goals in plain language",
          "Visit Summaries: Plan section only from signed notes",
          "Billing: invoices and balance (no CPT/ICD codes)",
          "Messages: secure messaging to care team",
          "Authorizations: view ROIs, submit new ROI requests",
        ],
        notes: "Clinical S/O/A sections are never visible to patients. Only the Plan section is shared.",
      },
    ],
  },
  {
    id: "dd-residential",
    icon: "🏠",
    title: "DD & Residential",
    summary: "ISP, incident reports, eMAR, bed management",
    features: [
      {
        name: "Individual Support Plans (ISP)",
        workflow: [
          "Clinical → 🧩 Support Plans (ISP) → + New ISP",
          "Tab 1: Individual info, Tab 2: Person-centered background",
          "Tab 3: Goals (ADL categories, baselines, targets, methods)",
          "Tab 4: Signatures (4-party: Guardian, Individual, Coordinator, Supervisor)",
          "All 4 signatures → ISP activates",
        ],
        notes: "Required for all DD waiver recipients. Annual review required to maintain waiver eligibility.",
      },
      {
        name: "Incident Reports",
        workflow: [
          "Clinical → 🚨 Incident Reports → + Report Incident",
          "Select category, type, severity",
          "Complete ABC analysis: Antecedent → Behavior → Consequence",
          "Flag state reporting if applicable",
          "Status: Open → Under Review → Submitted to State → Closed",
        ],
        notes: "State reporting flags trigger 24-72hr deadline alerts.",
      },
    ],
  },
  {
    id: "compliance",
    icon: "✅",
    title: "CCBHC Compliance",
    summary: "8 live compliance measures with drill-down",
    features: [
      {
        name: "CCBHC Dashboard",
        workflow: [
          "Reports → CCBHC Performance Measures",
          "8 measures with ✅ Passing / ⚠️ Warning / ❌ Failing status",
          "Click any measure → detail page with live data and action items",
          "CCO-6 powered by vitals data (patients with vitals in past 12 months)",
        ],
        notes: "CCO-4 (note completion) links to unsigned notes list. CCO-3 (treatment plans) links to patients without active plans.",
      },
    ],
  },
];

export default function FeatureDocsPage() {
  const [activeSection, setActiveSection] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q && !activeSection) return FEATURE_DOCS;
    return FEATURE_DOCS
      .filter(section => !activeSection || section.id === activeSection)
      .map(section => ({
        ...section,
        features: section.features.filter(f =>
          !q ||
          f.name.toLowerCase().includes(q) ||
          f.workflow.some(w => w.toLowerCase().includes(q)) ||
          (f.notes || "").toLowerCase().includes(q) ||
          section.title.toLowerCase().includes(q)
        ),
      }))
      .filter(section => section.features.length > 0);
  }, [search, activeSection]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <a href="/dashboard/release-notes" className="text-slate-400 hover:text-slate-700 text-sm">← Release Notes</a>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Feature Documentation</h1>
          <p className="text-slate-500 text-sm mt-0.5">Step-by-step workflows for all modules — v0.5 POC</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search workflows, features, keywords..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">✕</button>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setActiveSection("")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${!activeSection ? "bg-[#0d1b2e] text-white border-[#0d1b2e]" : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"}`}>
          All
        </button>
        {FEATURE_DOCS.map(section => (
          <button key={section.id} onClick={() => setActiveSection(activeSection === section.id ? "" : section.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${activeSection === section.id ? "bg-[#0d1b2e] text-white border-[#0d1b2e]" : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"}`}>
            {section.icon} {section.title}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          <div className="text-3xl mb-2">🔍</div>
          <p>No workflows found for "{search}"</p>
        </div>
      ) : (
        filtered.map(section => (
          <div key={section.id} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{section.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
                <p className="text-slate-500 text-sm">{section.summary}</p>
              </div>
            </div>
            {section.features.map((feature, fi) => (
              <div key={fi} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900">{feature.name}</h3>
                </div>
                <div className="px-6 py-5">
                  <div className="mb-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Step-by-step workflow</div>
                    <ol className="space-y-2">
                      {feature.workflow.map((step, si) => (
                        <li key={si} className="flex items-start gap-3">
                          <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{si + 1}</span>
                          <span className="text-sm text-slate-700 leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  {feature.notes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
                      <span className="font-semibold">📌 Note: </span>{feature.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
