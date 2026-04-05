import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ReleaseNotesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const releases = [
    {
      version: "v0.7",
      date: "2026-04-04",
      label: "Phase 7 — Security, Compliance & Clinical Intelligence",
      labelColor: "bg-red-100 text-red-700",
      features: [
        // Audit Logging
        "HIPAA Audit Logging — all PHI access (views, creates, updates, deletes) logged with user, IP, timestamp, resource type, and description (45 CFR §164.312(b))",
        "Audit Log on All API Routes — vitals, ROI, client programs, encounters, notes, billing, and more now log access events",

        // Session Timeout
        "30-Minute Session Timeout — auto-logout after inactivity with warning modal at 25 minutes; resets on any user interaction",

        // Multi-tenancy
        "Multi-Tenancy Hardened — removed all hardcoded org IDs; dynamic org lookup via getOrgId() on every API route; full RLS on PHI tables",
        "Separate Dev/Staging/Prod Databases — environment-based Supabase project isolation",

        // Clinical
        "Bidirectional Portal Messaging — patients and staff can reply to each other; email notifications on new messages",
        "Appointment Reminders Automation — confirmation email on booking, 24hr reminder, 1hr reminder, no-show follow-up",
        "Safety Plan Documentation — CCBHC-required safety plans integrated with C-SSRS screening results",
        "AUDIT & DAST-10 Screening — standardized substance use screening tools for CCO-7 compliance",
        "Allergy Documentation — patient allergy capture for medication safety",
        "Auto-Save / Draft Notes — clinical notes auto-save every 30 seconds; draft recovery on reconnect",
        "Amendment / Addendum to Signed Notes — corrections to locked notes with full audit trail",
        "Clinical Intelligence — auto-suggest ICD-10 codes from PHQ-9, GAD-7, C-SSRS, and IM+CANS assessment scores",

        // Scheduling
        "Scheduling Phase 2 — recurring appointments (weekly/biweekly/monthly), provider-only blocks (meetings, PTO, supervision), front office scheduling, calendar sync prep",

        // Communications
        "Patient Communications Engine — event-triggered notifications, configurable rules, message templates, opt-out tracking",
        "Referral Management Phase 2 — external intake form, submission notifications, outgoing referral email, status tracking",

        // Compliance
        "MFA Enforcement — multi-factor authentication required for all staff accounts",
        "FHIR R4 API Endpoints — Patient, Encounter, Condition, Observation, CarePlan, MedicationRequest for 21st Century Cures Act compliance",

        // Admin
        "CMS-1500 Claim Form Print — generate printable CMS-1500 forms for manual claim submission",
        "OCR Document Extraction — text extraction from uploaded/scanned documents",
        "Superadmin Org Management — full org detail pages with management controls",

        // Infrastructure
        "Kinship EHR Branding — rebranded from DrCloud Neo to Kinship EHR",
        "Staging/Production Deployment Workflow — automated staging deploys with manual production promotion",
      ],
    },
    {
      version: "v0.6 POC",
      date: "2026-04-01",
      label: "Phase 6 — Time Tracking, Search & Assessment History",
      labelColor: "bg-violet-100 text-violet-700",
      features: [
        // Timesheet
        "Timesheet Module — Reporting → ⏱️ Timesheet — weekly billable hours tracking per clinician",
        "16 Activity Types — Individual Therapy, Group, Case Management, Documentation, Supervision, Training, Admin, and more; auto-marks billable vs non-billable",
        "Time Entry Form — start/end times with auto-calculated duration, patient linkage, funding source (Medicaid/CCBHC/Block Grant), activity description",
        "Weekly Calendar View — day-by-day hours summary with total, billable, and non-billable totals",
        "All Staff View — supervisors/admins see all clinicians' hours in one view, filterable by individual",
        "CSV Export — payroll-ready export with all fields (date, clinician, patient, activity, hours, billable, funding source)",
        "⏱️ Log Time button on encounter detail page for quick access",

        // Search
        "Search Bars — added to 6 pages: Referrals (patient/provider/org), ROIs (patient/recipient/org), Authorizations (patient/payer/auth#), Encounters (patient/type), Treatment Plans (patient), Financial Eligibility (patient/insurance/financial class)",

        // Assessment history
        "Assessment Seed Data — all 8 patients now have full assessment history: PHQ-9×6, GAD-7×6, C-SSRS×2, IM+CANS, and BPS with realistic score trajectories over 12 months",

        // Financial Eligibility
        "Financial Class Seeded — all patients have financial class (Medicaid, Medicare, Commercial, Self-Pay, Pending) and insurance with copay/deductible data",

        // Demographics Analysis
        "Demographics State Reporting Analysis — comprehensive report mapping universal vs state-specific demographic fields across all 50 states (saved to Reports/)",

        // Presentation
        "DN vs Phoenix Deck Rebuilt — readable font sizes, 13 slides, new AI Development Experience slide with 5 practical points including Massive Information Synthesis capability",
      ],
    },
    {
      version: "v0.5 POC",
      date: "2026-03-31",
      label: "Phase 5 — Billing, Payments & Clinical Depth",
      labelColor: "bg-blue-100 text-blue-700",
      features: [
        // Clearinghouse
        "Clearinghouse Enrollment Wizard — Admin → 🏥 Clearinghouse — 5-step guided setup: select clearinghouse (Office Ally/Availity/Change Healthcare), enroll with NPI + Tax ID, select payers, test mode, go live",

        // Stripe Connect
        "Stripe Connect Integration — Admin → Settings → Online Payments — connect your Stripe account; patients pay invoices online; payments go directly to agency bank account; 0.5% platform fee",
        "Pay Online Button — Invoice detail shows '💳 Accept Online Payment' section with 'Generate Payment Link' button; opens Stripe Checkout in new tab",
        "Stripe Webhook — invoice auto-marked paid when patient completes payment; billing staff notified via bell",

        // Copay at Check-in
        "Copay Collection at Check-in — scheduling day view now shows green '✓ Check In' button per appointment",
        "Copay Collection Modal — pre-fills copay from insurance record; payment method picker (Cash/Check/Credit/Debit/Waived/Skip); creates paid charge record",
        "Copay on Insurance Record — patient edit form + Financial Eligibility page now capture Copay, Deductible, Deductible Met (YTD), Out-of-Pocket Max",

        // Problem List
        "Problem List — persistent active diagnosis list on patient detail (right column); ICD-10 autocomplete search; status (Active/Chronic/In Remission/Resolved); onset date; resolved diagnoses collapsible",

        // Prior Auth Renewal
        "Prior Auth Renewal Alert — authorization list shows 'View Expiring →' link when auths expire within 30 days",
        "Prior Auth Renewal Button — auth detail shows amber banner with '🔄 Renew Auth →' button pre-filling a new auth from the expiring one",

        // No-Show Follow-up
        "No-Show Follow-up Prompt — when marking appointment as no-show, modal prompts staff to send SMS follow-up message to patient",

        // Discharge Summary
        "Discharge Summary Template — patient header → 📋 Discharge button → structured form with: discharge type, diagnoses, treatment summary, goals achieved/not achieved, medications, follow-up plan, referrals, patient instructions, clinician signature",

        // Vitals + CCO-6 (from overnight session)
        "Vitals Module — patient header → 🩺 Vitals → BP, HR, temp, O₂, weight/BMI, respiratory rate, blood glucose, pain scale (0–10 slider); BMI auto-calculated",
        "Vitals Trend Charts — 6 selectable line charts with clinical reference lines; colored status labels (Normal/Elevated/Fever/etc.)",
        "CCO-6 Live Data — Physical Health Screenings now powered by real vitals data",

        // Multi-tenancy
        "Dynamic Org ID — removed hardcoded org UUID from all 45 API routes and 23 server components; getOrgId() helper; multi-tenant ready",

        // Infrastructure
        "Patient Problems SQL — patient_problems table ready for Problem List",
        "Patient Vitals SQL — patient_vitals table for vitals module",
        "Stripe columns on organizations table",
      ],
    },
    {
      version: "v0.4 POC",
      date: "2026-03-31",
      label: "Phase 4 — Infrastructure, UX & Intelligence",
      labelColor: "bg-emerald-100 text-emerald-700",
      features: [
        // UX & Navigation
        "Collapsible Sidebar — icon-only when collapsed, smooth hover/pin to expand; section icons (👤⚕️💰📊⚙️); state persists per user",
        "RBAC Sidebar — clinicians see only clinical modules; supervisors see Supervisor Review; billing sees billing only; admin sees everything",
        "CollapsibleCard — 6 patient detail cards now collapse/expand with ▾ chevron; state persists per user per card",
        "Update Banner — auto-detects new deployments; shows 'Refresh now' toast; polls every 5 min + on tab focus; no more manual cache clearing",
        "Vercel Cache Headers — JS/CSS bundles cached 1 year (immutable); HTML always fresh; correct browser caching behavior",

        // Clinical
        "Vitals Module — BP, heart rate, temperature, O₂ saturation, weight/BMI, respiratory rate, blood glucose, pain scale (0–10 slider)",
        "Vitals Trend Charts — 6 selectable line charts with clinical reference lines (Recharts); latest readings with status labels (Normal/Elevated/Fever/etc.)",
        "BMI Auto-calculation — live BMI preview with category (Normal/Overweight/Obese) as weight and height are entered",
        "CCO-6 Live Data — Physical Health Screenings measure now powered by real vitals data (counts patients with vitals in past 12 months)",
        "Provider-Only Appointments — staff meetings, supervision, admin blocks, PTO; no patient required; grey on calendar",
        "Provider Filter on Scheduling — pill buttons to filter calendar by individual provider or 'My Schedule'",

        // Messaging & Communication
        "New Message Recipient Picker — /api/org-users created; shows all org staff with name, credentials, role; search filter",
        "Supervisor Notification on Note Sign — when clinician signs, supervisor receives in-app notification with patient and encounter details",
        "Clinician Notification on Co-Sign — supervisor co-signs → clinician notified immediately",

        // Compliance & RBAC
        "Demo RBAC Accounts — supervisor@drcloud-demo.com and clinician@drcloud-demo.com with proper role-based sidebar differences",
        "Supervisor Review Fixed — no longer redirects non-supervisors; shows friendly access message; pending notes scoped to supervisee profiles",

        // Infrastructure (Major)
        "Dynamic Org ID — removed hardcoded org UUID from all 45 API routes and 23 server components; getOrgId() helper reads from user_profiles; fallback to demo org",
        "Multi-tenancy Ready — new org deployment = create org record + user profile; dynamic org isolation already in place",
        "EHR Feature Requirements Analysis — 200+ requirements across 18 categories with DrCloud Neo coverage matrix saved to Reports/",
        "ARCHITECTURE.md — full developer onboarding guide committed to repo (project structure, patterns, conventions, pre-production checklist)",
        "DN→KS Sync Script — sync-to-kinship.js updated with 30 new modules; automatic patient→client renaming; SYNC_STATUS.md tracking divergence",
        "Programs & Services — 5 programs seeded; 10 patient enrollments; census view per program",
        "Vitals Seed — record vitals to power CCO-6 live reporting",

        // Scheduling & Calendar
        "Thursday April 2 Demo Schedule — 9 appointments seeded (individual, group, provider-only)",
        "Patient Vitals SQL — patient_vitals table created; vitals module fully live",
      ],
    },
    {
      version: "v0.3 POC",
      date: "2026-03-29",
      label: "Phase 3 — Billing, Compliance & Portal",
      labelColor: "bg-amber-100 text-amber-700",
      features: [
        // Billing & Revenue Cycle
        "Auto-Draft Charges on Sign — when a clinician signs a note, a draft charge is automatically created with the correct CPT code based on encounter type (Individual→90837, Group→90853, Assessment→90791, Crisis→90839, Medication Management→99213, Telehealth→90837)",
        "Draft Charge Review — billing page shows amber alert banner for pending draft charges; biller clicks ✓ Approve to move to Pending; draft filter tab added",
        "Sliding Fee Scale — complete FPL-based discount system using 2026 HHS Federal Poverty Guidelines; 5-tier default schedule (Tier A $5 nominal through Full Pay)",
        "Income Assessment — per-patient annual household income + family size entry; auto-calculates FPL%, live tier preview, 12-month expiration tracking with renewal alerts",
        "Sliding Fee Admin — org-configurable tier schedule (flat $ copay or % discount per FPL band); live preview showing what a $180 charge costs per tier",
        "Auto-Adjustment on Charge — when encounter is signed and patient has active income assessment, SFS adjustment automatically created and patient responsibility calculated",
        "Charge Adjustments Table — new DB table tracking adjustment type, amount, patient responsibility, FPL%, tier label per charge",
        "Claim Scrubbing — 8 pre-submission validation rules documented: BL001 (MH CPT needs MH dx), BL002 (eval CPT auth advisory), BL003 (units max), BL004 (dx required), BL005 (max 4 dx), BL006 (payer session limit), BL007 (no future dates), BL008 (90-day timely filing)",

        // Clinical Documentation
        "42 CFR Part 2 — ROI forms now include ☑ checkbox for substance use disorder records; when checked, verbatim federal redisclosure prohibition language appears on detail page and print; badge in ROI list",
        "Electronic Signature Pad — canvas-based finger/mouse signature capture directly on ROI detail page; one-click captures signature image and activates ROI",
        "Written Signature Workflow — ROI detail shows step-by-step written signature instructions; drag-and-drop document upload for scanned signed copies (PDF/JPG/PNG/HEIC, 10MB max)",
        "ROI 'All Records' Button — moved to top of Information to Release section as full-width button for quick selection",

        // Communication & Messaging
        "Two-Way Portal Messaging — patients send messages from portal → staff notified via bell + inbox Portal Msgs tab; staff reply from patient profile → reply appears in patient's portal",
        "Patient Profile Messages Tab — 💬 Portal Messages section on every patient detail page showing full inbound/outbound history with reply button",
        "Staff Inbox Portal Tab — new 'Portal Msgs' tab in inbox showing all patient portal messages org-wide with patient name links and blue unread badge",
        "Portal Message Notifications — on patient message, all clinicians/admins in org receive in-app notification with link to patient record",
        "Internal Referral Provider Selection — internal referral type now uses staff dropdown picker instead of free text; shows name, title, role",
        "Internal Referral Notifications — referred provider receives in-app notification with patient name, priority, and reason when internal referral is created",
        "New Notifications API — /api/notifications/create endpoint for programmatic notification creation from any workflow",
        "Communication Sidebar Badge — unread count now shows on COMMUNICATION section header even when section is collapsed",

        // Patient Portal
        "Dedicated Portal Sign-In Page — /portal/sign-in with org branding, patient-facing copy, 911 reminder, staff portal link; patients are redirected here from all portal routes",
        "Portal Sign-In Redirect — unauthenticated portal visitors redirected to /portal/sign-in instead of generic staff sign-in",

        // Administration & Settings
        "Client Terminology Persistence — fixed: org settings PATCH was silently failing due to unknown DB column (billing_contact); now strips unknown columns before saving; terminology saves to DB and persists across hard reloads",
        "Terminology Live Sync — saving terminology fires custom browser event so sidebar updates instantly without page reload; localStorage + DB fully in sync",
        "Sidebar Section State Persistence — open/collapsed state of all sidebar sections persists in localStorage (drcloud_sidebar_sections key)",
        "Sidebar Terminology Sync — section label 'Patients' also swaps to match selected terminology (e.g. 'Clients', 'Consumers') not just the nav item",
        "Sliding Fee Sidebar Link — Admin → 💲 Sliding Fee added to sidebar nav",
        "Feedback Form — Admin → 💬 Submit Feedback added to DN sidebar; same 4-question discovery format as Kinship",

        // Documentation & Release Notes
        "Feature Documentation Page — /dashboard/release-notes/features with step-by-step numbered workflows for 7 module categories; linked from all release versions",
        "About the Architect Slide — added to company presentation deck with 5th Gear → EnSoftek → modern tooling credibility narrative",
        "Roadmap Additions — SFS Phase 2 (program-area overrides, grant schedules, payer exclusions), Document Management Phase 2 (thumbnails, scanner/OCR), Referral Management Phase 2 (external intake form, outgoing email)",

        // Referrals
        "Referrals Empty State — context-aware empty message shows status name (e.g. 'No completed referrals yet' instead of generic 'No referrals yet')",
      ],
    },
    {
      version: "v0.2 POC",
      date: "2026-03-27",
      label: "Phase 2 — DD & Compliance",
      labelColor: "bg-purple-100 text-purple-700",
      features: [
        // Clinical Documentation
        "Individual Support Plans (ISP) — person-centered DD waiver planning with 4-tab form, ADL goals, signature tracking (Guardian/Individual/Coordinator/Supervisor), annual review alerts",
        "Incident Reports — full ABC analysis, severity levels (minor/moderate/serious/critical), injury tracking, guardian/supervisor notification timestamps, state reporting flags, client/staff/visitor/property categories",
        "eMAR — medication orders (QD/BID/TID/QID/PRN), scheduled administration with check-off, controlled substance witness tracking, missed dose alerts",
        "DD Progress Notes — shift-based daily documentation with ISP goal tracking, mood/affect picker, follow-up flags, supervisor review",
        "Supervisor Review Queue — pending note list with batch co-sign, individual review with notes, co-signature status on encounter detail",
        "Group Appointments — multi-patient scheduling with participant search and group name",
        "Treatment Plan Goals — interactive objective status buttons (Not Started/In Progress/Achieved), progress bar per goal",
        "Encounter Detail Page — full signed note display, billing status, insurance info, quick actions",
        
        // Assessments
        "PHQ-9 Depression Screening — 9 questions, live severity scoring, clinical recommendations",
        "GAD-7 Anxiety Screening — 7 questions, live severity scoring, clinical recommendations",
        "C-SSRS Columbia Suicide Severity Rating Scale — 4-step assessment (Ideation/Intensity/Behavior/Results), imminent risk alerts, safety plan documentation",
        
        // Patient & Care
        "Care Team — primary clinician assignment with search, care team members with 12 roles (internal + external providers), visible on patient detail",
        "Family & Support Network — relationship types with legal guardian/emergency contact/caregiver/portal flags, reciprocal display on both patient charts",
        "Releases of Information (ROI) — HIPAA-compliant authorization forms, signature tracking, expiry alerts, revocation workflow, portal ROI requests",
        "My Caseload — patient list toggle showing only assigned/encountered patients; dashboard stat card shows caseload count",
        "Preferred Name Toggle — persists across entire app (patient list, scheduling, encounters, reports, dashboard, eMAR)",
        
        // Billing & Revenue Cycle
        "Patient Invoices — statements with line items, insurance reconciliation, payment recording (cash/check/card/ACH), balance tracking",
        "Billing Rules Engine — 8 claim validation rules (diagnosis-CPT match, units, auth, timely filing, future dates)",
        "837P Claim Submission — batch select, EDI preview with syntax highlighting, download, mark submitted",
        "Claim Scrubber — pre-submission validation across all pending charges",
        
        // Portal
        "Patient Portal — role-based access (patient/parent/guardian/parole officer/case manager/community member)",
        "Portal Page: Appointments — upcoming/past with status, care team notes",
        "Portal Page: Care Plan — goals and objectives (patient language), strengths, progress bar",
        "Portal Page: Billing — invoices and statements only (no CPT/ICD codes visible to patient)",
        "Portal Page: Visit Summaries — Plan section only from signed notes (no clinical S/O/A)",
        "Portal Page: Messages — secure one-way patient-to-staff messaging with 911 reminder",
        "Portal Page: Authorizations — view existing ROIs, submit new ROI request (3-step wizard)",
        
        // Administration
        "Supervisor Review — assign supervisors to clinicians in User Management; review queue with batch co-sign",
        "User Management — inline edit, activate/deactivate, invite modal, document uploads per staff member",
        "Settings — all 4 sections editable (org info, clinical, billing, compliance); client terminology configurable",
        "ROI Badge — sidebar live count of pending portal ROI requests",
        "Messages Badge — sidebar live unread count with 15s polling",
        
        // Reports & Analytics
        "Workflow Efficiency Report — 10-workflow comparison showing 72%+ fewer clicks vs legacy",
        "CCBHC Measure Drill-downs — each measure links to detail page with live stats, data tables, methodology",
        "Print & Export — print mode hides sidebar/nav, CSV/JSON export on all reports and billing",
        "10 Live Report Sub-Pages — encounters, unsigned notes, charges, caseload, diagnoses, attendance, claims, referrals, treatment plans, CCBHC",
        
        // Other
        "Bed Management — multi-facility census, color-coded bed grid, admit/discharge workflow",
        "IM+CANS Assessment — 6 domains, 50+ items, 0-3 rating scale, level of care recommendation",
        "Group Scheduling — multi-provider view for receptionists",
        "Document Uploads — drag-and-drop with magic-byte file type validation, staff and patient document storage",
        "ICD-10 Autocomplete — 200+ behavioral health codes searchable by code, description, or category",
        "Client Terminology — configurable per org (Patient/Client/Individual/Recipient/Resident/Consumer)",
      ],
    },
    {
      version: "v0.1 POC",
      date: "2026-03-26",
      label: "Phase 1 — Core EHR",
      labelColor: "bg-teal-100 text-teal-700",
      features: [
        "Dashboard — live metrics, today's schedule, quick actions, messages + notifications widgets",
        "Patient Management — demographics, search, preferred name, pronouns, add, edit, detail view",
        "Scheduling — week/day calendar, appointment booking, edit modal",
        "Encounters — SOAP notes, sign & lock, encounter detail page",
        "Clinical Notes — list with signed/unsigned filter, SOAP preview",
        "Billing — charge capture with CPT picker, ICD-10 codes, payer/clearinghouse columns",
        "Referrals — incoming/outgoing/internal, applicant intake form, convert to patient",
        "Treatment Plans — goals, objectives, interventions, review tracking",
        "Reports — 10 live sub-pages across Clinical, Billing, Patient, Compliance categories",
        "CCBHC Performance Dashboard — 8 measures with passing/warning/failing status",
        "Internal Messaging — thread-based messaging with notification bell",
        "Admin — user management, organization settings",
        "Release Notes — version history (this page)",
      ],
    },
  ];

  const roadmap = [
    {
      phase: "Phase 5 — Billing Completion",
      color: "bg-teal-50 border-teal-200",
      badge: "bg-teal-100 text-teal-700",
      items: [
        "Clearinghouse Integration — direct 837P submission to Availity/Change Healthcare",
        "ERA/EOB Auto-posting — automatic payment posting from remittance files",
        "Patient Payment Portal — credit card / ACH collection for invoices",
        "Copay Collection at Check-in — quick copay capture integrated with scheduling",
        "Prior Auth Renewal Workflow — auto-alert before expiry, resubmit flow",
        "SFS Phase 2 — program-area overrides, grant schedules, payer exclusions",
        "Sliding Fee Adjustment Report — total discounts by tier, period, program",
      ],
    },
    {
      phase: "Phase 6 — Clinical Intelligence",
      color: "bg-purple-50 border-purple-200",
      badge: "bg-purple-100 text-purple-700",
      items: [
        "ePrescribing — DoseSpot (KS); DrFirst/Rcopia (DN enterprise)",
        "Vitals screening alerts — auto-flag abnormal readings to care team",
        "Assessment auto-suggest from vitals — pull PHQ-9/GAD-7 suggestions from score trends",
        "Pull diagnostic codes from assessments into treatment plan",
        "AI Clinical Scribe — ambient documentation from session audio",
        "Natural Language Reporting — ask data questions in plain English",
        "Program-based assessment requirements — required forms per program with advisory alerts",
        "Group Therapy Session Notes — group-level documentation with per-client addenda",
        "Treatment Plan Edit Flow — edit existing plans without creating new version",
      ],
    },
    {
      phase: "Phase 7 — Patient Engagement",
      color: "bg-blue-50 border-blue-200",
      badge: "bg-blue-100 text-blue-700",
      items: [
        "Appointment Reminders — automated SMS/email before appointments",
        "Appointment Request from Portal — patient requests, staff confirms",
        "Patient Demographic Updates via Portal — patient can update contact info",
        "Recall / Follow-up Automation — auto-message patients who miss appointments",
        "Separate Portal Clerk App — isolate portal users from staff auth",
        "Portal Email Invitation Flow — automated invite with secure link",
        "Scanner / OCR Integration — scan ID cards and insurance cards, auto-populate demographics",
        "Image thumbnail previews — inline preview of uploaded photos and PDFs",
      ],
    },
    {
      phase: "Phase 8 — Scheduling & Workflows",
      color: "bg-amber-50 border-amber-200",
      badge: "bg-amber-100 text-amber-700",
      items: [
        "Recurring Appointments — weekly/biweekly/monthly with exception handling",
        "Waitlist Management — add to waitlist, auto-notify when slot opens",
        "Provider Schedule Templates — set weekly availability blocks",
        "Calendar Sync — Google Calendar, Outlook, Apple Calendar via iCal/CalDAV",
        "Front Office Scheduling of Provider Appointments — receptionist books admin blocks for providers",
        "Referral External Intake Form — public form for outside providers to submit referrals",
        "Outgoing Referral Email — formatted summary sent to receiving provider at referral creation",
        "Drag-to-Reorder Patient Detail Cards — clinicians customize chart layout, saved per user",
        "Collapsible Cards — all remaining patient detail cards (Encounters, Charges, ROI, etc.)",
      ],
    },
    {
      phase: "Phase 9 — Compliance & Reporting",
      color: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-700",
      items: [
        "Supabase Row Level Security (RLS) — database-level org isolation for HIPAA",
        "Audit Log Viewer — full PHI access trail with export",
        "Session Timeout — auto-logout after 30 min inactivity",
        "CCBHC State Reporting — automated report export to state systems",
        "UDS Reporting — HRSA data submission for FQHC/CCBHC programs",
        "Credential Expiration Tracking — alerts for provider license renewals",
        "AUDIT/DAST Assessments — substance use screening tools for CCO-7",
        "ACE / SDOH Screenings — adverse childhood experiences and social determinants",
        "Physical Health Screening Form — structured vitals screening for CCO-6 compliance",
        "Consumer Satisfaction Survey — CCO-8 completion",
      ],
    },
    {
      phase: "Phase 10 — Platform & Interoperability",
      color: "bg-slate-50 border-slate-200",
      badge: "bg-slate-100 text-slate-700",
      items: [
        "FHIR R4 Compliance — standardized API for hospital/HIE integration (21st Century Cures Act)",
        "SMART on FHIR Auth — OAuth 2.0 for third-party app access",
        "HL7 v2 Messaging — ADT notifications and lab results from hospitals",
        "Telehealth Integration — Zoom/Webex session launch from scheduling",
        "Lab Results Integration — HL7/FHIR import and display",
        "Custom Forms Builder — drag-and-drop form builder, program-scoped, library + custom",
        "Org Provisioning API — automated new customer setup in minutes",
        "Mobile App — iOS/Android companion for staff and patients",
        "ABA / Skills Data Collection — discrete trial and task analysis tracking",
        "Org Name in Top Nav — display organization name before date for multi-org context",
      ],
    },
  ];

  const stats = [
    { value: "30+", label: "Modules" },
    { value: "100+", label: "Pages" },
    { value: "70+", label: "API Routes" },
    { value: "72%", label: "Fewer Clicks vs Legacy" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Release Notes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Kinship EHR version history</p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6 text-white">
        <div className="grid grid-cols-4 gap-4 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-teal-300">{s.value}</div>
              <div className="text-xs text-slate-300 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-slate-400 text-xs">Kinship EHR · v0.7</div>
      </div>

      {releases.map(release => (
        <div key={release.version} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900 text-xl">{release.version}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${release.labelColor}`}>
                {release.label}
              </span>
            </div>
            <span className="text-slate-400 text-sm">{release.date}</span>
          </div>
          <ul className="px-6 py-4 space-y-2">
            {release.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="text-teal-500 mt-0.5 flex-shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="px-6 pb-4">
            <Link href="/dashboard/release-notes/features"
              className="inline-flex items-center gap-2 text-sm text-teal-600 font-semibold hover:text-teal-700 border border-teal-200 px-4 py-2 rounded-xl hover:bg-teal-50 transition-colors">
              📖 View detailed workflows & documentation →
            </Link>
          </div>
        </div>
      ))}

      {/* Roadmap — phased */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900 text-xl">Roadmap</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">Coming Soon</span>
        </div>
        {roadmap.map((phase, pi) => (
          <div key={pi} className={`rounded-2xl border p-5 ${phase.color}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${phase.badge}`}>{phase.phase}</span>
            </div>
            <ul className="space-y-1.5">
              {phase.items.map((item, ii) => (
                <li key={ii} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-slate-400 mt-0.5 flex-shrink-0">◦</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-teal-50 rounded-2xl border border-teal-100 p-5 text-center">
        <p className="text-teal-800 text-sm font-medium">Built by Chris Goodbaudy + Jarvis (AI)</p>
        <p className="text-teal-600 text-xs mt-1">Kinship EHR — Modern Behavioral Health & DD EHR · v0.7</p>
      </div>
    </div>
  );
}
