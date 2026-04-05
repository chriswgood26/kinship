"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PLAN_PRICES, PLAN_LABELS, type Plan } from "@/lib/plans";
import NoteTemplatesManager from "./NoteTemplatesManager";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Org {
  id: string;
  name: string | null;
  npi: string | null;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  client_terminology: string | null;
  org_type: string | null;
  referral_due_days: number | null;
  referral_due_business_days: boolean | null;
  plan?: string | null;
  addons?: string[] | null;
  requested_plan?: string | null;
}

interface OrgForm {
  name: string;
  npi: string;
  tax_id: string;
  phone: string;
  email: string;
  website: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  client_terminology: string;
  org_type: string;
  referral_due_days: string;
  referral_due_business_days: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TERMS = ["client", "patient", "individual", "recipient", "resident", "consumer", "member"];
const ORG_TYPES = [
  { value: "behavioral_health",      label: "Behavioral Health" },
  { value: "developmental_disabilities", label: "Developmental Disabilities" },
  { value: "substance_use",          label: "Substance Use" },
  { value: "residential",            label: "Residential" },
  { value: "cmhc",                   label: "Community Mental Health Center" },
  { value: "outpatient",             label: "Outpatient" },
];

const PLAN_ORDER: Plan[] = ["starter", "growth", "practice", "agency", "custom"];

const PLAN_HIGHLIGHTS: Record<Plan, string[]> = {
  starter:  ["Up to 5 users", "5 GB storage", "Clients, Scheduling, Encounters", "Billing & Claims", "Client Portal"],
  growth:   ["Up to 15 users", "20 GB storage", "Everything in Starter", "Assessments & Treatment Plans", "Supervisor Review", "Telehealth", "CCBHC support"],
  practice: ["Up to 30 users", "30 GB storage", "Everything in Growth", "eMAR", "DD Modules & ISP", "Bed Management", "Prior Auth Tracking", "Advanced Reports"],
  agency:   ["Up to 50 users", "50 GB storage", "Everything in Practice", "Multi-location", "SLA guarantee"],
  custom:   ["Unlimited users", "Unlimited storage", "Everything in Agency", "Custom integrations", "Dedicated support"],
};

const PLAN_COLORS: Record<Plan, { border: string; badge: string; btn: string }> = {
  starter:  { border: "border-slate-200",  badge: "bg-slate-100 text-slate-600",   btn: "bg-slate-800 hover:bg-slate-700 text-white" },
  growth:   { border: "border-teal-300",   badge: "bg-teal-50 text-teal-700",      btn: "bg-teal-500 hover:bg-teal-400 text-white" },
  practice: { border: "border-violet-300", badge: "bg-violet-50 text-violet-700",  btn: "bg-violet-600 hover:bg-violet-500 text-white" },
  agency:   { border: "border-blue-300",   badge: "bg-blue-50 text-blue-700",      btn: "bg-blue-600 hover:bg-blue-500 text-white" },
  custom:   { border: "border-amber-300",  badge: "bg-amber-50 text-amber-700",    btn: "bg-amber-500 hover:bg-amber-400 text-white" },
};

// ─── Module definition type (for extensibility) ───────────────────────────

interface SettingItem {
  key: string;          // unique identifier
  label: string;
  description?: string;
  keywords?: string[];  // extra search terms
}

interface SettingsModule {
  id: string;
  icon: string;
  title: string;
  description: string;
  keywords: string[];   // module-level search keywords
  settings: SettingItem[];
}

const MODULES: SettingsModule[] = [
  {
    id: "organization",
    icon: "🏢",
    title: "Organization",
    description: "Basic information about your practice or agency",
    keywords: ["org", "practice", "agency", "name", "address", "contact", "npi", "tax"],
    settings: [
      { key: "name",             label: "Organization Name",    description: "Your agency's legal name" },
      { key: "npi",              label: "NPI Number",           description: "National Provider Identifier", keywords: ["provider", "national"] },
      { key: "tax_id",           label: "Tax ID / EIN",         description: "Federal Employer Identification Number", keywords: ["ein", "employer", "federal"] },
      { key: "phone",            label: "Phone Number",         description: "Main contact number" },
      { key: "email",            label: "Email Address",        description: "Main contact email" },
      { key: "website",          label: "Website",              description: "Your organization's website URL" },
      { key: "address",          label: "Street Address",       description: "Physical location address" },
      { key: "org_type",         label: "Organization Type",    description: "The type of services your agency provides", keywords: ["type", "kind", "specialty"] },
      { key: "client_terminology", label: "Client Terminology", description: "How you refer to the people you serve", keywords: ["patient", "individual", "consumer", "member", "recipient", "resident", "language", "term"] },
    ],
  },
  {
    id: "referrals",
    icon: "📋",
    title: "Referrals",
    description: "Defaults for referral workflow and due dates",
    keywords: ["referral", "intake", "due date", "deadline", "triage"],
    settings: [
      { key: "referral_due_days",           label: "Default Due Days",       description: "How many days after referral date to set the due date" },
      { key: "referral_due_business_days",  label: "Day Type",               description: "Whether due days count business days or calendar days", keywords: ["business", "calendar", "weekday", "weekend"] },
    ],
  },
  {
    id: "scheduling",
    icon: "📅",
    title: "Scheduling",
    description: "Appointment and calendar defaults",
    keywords: ["schedule", "appointment", "calendar", "session", "duration", "slot", "time"],
    settings: [
      { key: "default_session_duration", label: "Default Session Duration", description: "Default appointment length in minutes", keywords: ["minutes", "length", "time slot"] },
      { key: "timezone",                 label: "Timezone",                 description: "Organization's primary timezone for scheduling", keywords: ["time zone", "local time", "EST", "PST", "CST"] },
    ],
  },
  {
    id: "billing",
    icon: "💰",
    title: "Billing",
    description: "Billing contacts and financial settings",
    keywords: ["billing", "invoice", "payment", "financial", "claims", "revenue", "payer"],
    settings: [
      { key: "billing_email", label: "Billing Email", description: "Where billing notifications and invoices are sent", keywords: ["invoice", "email", "notification"] },
    ],
  },
  {
    id: "clinical",
    icon: "🩺",
    title: "Clinical",
    description: "Clinical workflow and documentation preferences",
    keywords: ["clinical", "documentation", "notes", "encounter", "soap", "workflow", "provider"],
    settings: [
      { key: "client_terminology", label: "Client Terminology", description: "How you refer to the people you serve (also in Organization)", keywords: ["patient", "individual", "language", "term"] },
    ],
  },
  {
    id: "note_templates",
    icon: "📝",
    title: "Note Templates",
    description: "Custom clinical note formats beyond SOAP (DAP, BIRP, GIRP, and more)",
    keywords: ["note", "template", "soap", "dap", "birp", "girp", "clinical", "documentation", "format", "custom"],
    settings: [
      { key: "note_templates", label: "Note Templates", description: "Create and manage custom note formats for your clinicians" },
    ],
  },
  {
    id: "plan",
    icon: "💳",
    title: "Plan & Billing",
    description: "Subscription plan and pricing",
    keywords: ["plan", "subscription", "upgrade", "downgrade", "pricing", "tier", "license"],
    settings: [
      { key: "current_plan",  label: "Current Plan",   description: "Your active subscription tier" },
      { key: "plan_change",   label: "Change Plan",    description: "Request a plan upgrade or downgrade", keywords: ["upgrade", "downgrade", "tier"] },
    ],
  },
];

// ─── Shared styles ────────────────────────────────────────────────────────

const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

// ─── Main Component ───────────────────────────────────────────────────────

export default function SettingsClient({ org, userRoles = ["clinician"] }: { org: Org | null; userRoles?: string[] }) {
  const router = useRouter();
  const isAdmin = userRoles.includes("admin");

  // Global search
  const [search, setSearch] = useState("");

  // Track which modules are expanded (all except note_templates expanded by default)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map(m => [m.id, m.id !== "note_templates"]))
  );

  // Save states per module
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  // Form state — unified
  const [form, setForm] = useState<OrgForm>({
    name:                      org?.name || "",
    npi:                       org?.npi || "",
    tax_id:                    org?.tax_id || "",
    phone:                     org?.phone || "",
    email:                     org?.email || "",
    website:                   org?.website || "",
    address_line1:             org?.address_line1 || "",
    city:                      org?.city || "",
    state:                     org?.state || "",
    zip:                       org?.zip || "",
    client_terminology:        org?.client_terminology || "client",
    org_type:                  org?.org_type || "behavioral_health",
    referral_due_days:         org?.referral_due_days?.toString() || "3",
    referral_due_business_days: org?.referral_due_business_days !== false,
  });

  // Extended form fields (not in Org type yet — stored via API's allowed list)
  const [extForm, setExtForm] = useState({
    default_session_duration: "60",
    timezone: "America/New_York",
    billing_email: "",
  });

  // Plan state
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [planRequestPending, setPlanRequestPending] = useState(!!org?.requested_plan);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>((org?.requested_plan as Plan) || null);
  const [planRequestSaving, setPlanRequestSaving] = useState(false);
  const [planRequestMsg, setPlanRequestMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const currentPlan = (org?.plan || "starter") as Plan;

  // ── Search filtering ──────────────────────────────────────────────────
  const q = search.toLowerCase().trim();

  const visibleModules = useMemo(() => {
    if (!q) return MODULES;
    return MODULES.filter(mod => {
      const modMatches =
        mod.title.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.keywords.some(k => k.toLowerCase().includes(q));
      const settingMatches = mod.settings.some(s =>
        s.label.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.keywords || []).some(k => k.toLowerCase().includes(q))
      );
      return modMatches || settingMatches;
    });
  }, [q]);

  // When searching, auto-expand matched modules
  const effectiveExpanded = q
    ? Object.fromEntries(visibleModules.map(m => [m.id, true]))
    : expanded;

  // ── Save helpers ──────────────────────────────────────────────────────

  async function saveModule(moduleId: string, payload: Record<string, unknown>) {
    setSaving(s => ({ ...s, [moduleId]: true }));
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      setSaved(s => ({ ...s, [moduleId]: true }));
      router.refresh();
      setTimeout(() => setSaved(s => ({ ...s, [moduleId]: false })), 3000);
    } finally {
      setSaving(s => ({ ...s, [moduleId]: false }));
    }
  }

  async function requestPlanChange(plan: Plan) {
    setPlanRequestSaving(true);
    setPlanRequestMsg(null);
    try {
      const res = await fetch("/api/settings/request-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requested_plan: plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlanRequestMsg({ type: "error", text: data.error || "Failed to submit request" });
      } else {
        setPlanRequestPending(true);
        setPendingPlan(plan);
        setPlanRequestMsg({ type: "success", text: "Plan change request submitted! Our team will review and apply it shortly." });
        router.refresh();
      }
    } catch {
      setPlanRequestMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setPlanRequestSaving(false);
    }
  }

  async function cancelPlanRequest() {
    setPlanRequestSaving(true);
    try {
      await fetch("/api/settings/request-plan", { method: "DELETE", credentials: "include" });
      setPlanRequestPending(false);
      setPendingPlan(null);
      setPlanRequestMsg({ type: "success", text: "Plan change request cancelled." });
      router.refresh();
    } catch {
      setPlanRequestMsg({ type: "error", text: "Failed to cancel request." });
    } finally {
      setPlanRequestSaving(false);
    }
  }

  // ── Section renderers ─────────────────────────────────────────────────

  function renderOrganizationSettings() {
    return (
      <div className="divide-y divide-slate-50">
        {/* Name + NPI row */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Organization Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>NPI Number</label>
            <input value={form.npi} onChange={e => setForm(f => ({ ...f, npi: e.target.value }))} className={inputClass} placeholder="1234567890" />
          </div>
        </div>

        {/* Tax ID + Phone + Email row */}
        <div className="px-6 py-5 grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Tax ID / EIN</label>
            <input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} className={inputClass} placeholder="XX-XXXXXXX" />
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="(555) 555-5555" />
          </div>
          <div>
            <label className={labelClass}>Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="info@agency.org" />
          </div>
        </div>

        {/* Website + Org Type */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Website</label>
            <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} placeholder="https://yourorg.org" />
          </div>
          <div>
            <label className={labelClass}>Organization Type</label>
            <select value={form.org_type} onChange={e => setForm(f => ({ ...f, org_type: e.target.value }))} className={inputClass}>
              {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Address */}
        <div className="px-6 py-5 space-y-3">
          <label className={labelClass}>Address</label>
          <input value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} className={inputClass} placeholder="123 Main Street" />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} placeholder="City" />
            </div>
            <div>
              <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputClass} placeholder="State" maxLength={2} />
            </div>
            <div>
              <input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} className={inputClass} placeholder="ZIP" />
            </div>
          </div>
        </div>

        {/* Client Terminology */}
        <div className="px-6 py-5">
          <label className={labelClass}>Client Terminology — how do you refer to the people you serve?</label>
          <p className="text-xs text-slate-400 mb-3">This term will appear throughout the platform wherever "client" would normally show.</p>
          <div className="flex flex-wrap gap-2">
            {TERMS.map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, client_terminology: t }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors ${form.client_terminology === t ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
          {saved.organization ? (
            <span className="text-sm text-emerald-600 font-medium">✅ Saved</span>
          ) : <span />}
          {isAdmin && (
            <button
              onClick={() => saveModule("organization", {
                name: form.name, npi: form.npi, tax_id: form.tax_id,
                phone: form.phone, email: form.email, website: form.website,
                address_line1: form.address_line1, city: form.city,
                state: form.state, zip: form.zip,
                client_terminology: form.client_terminology,
                org_type: form.org_type,
              })}
              disabled={saving.organization}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving.organization ? "Saving…" : "Save Organization"}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderReferralsSettings() {
    return (
      <div className="divide-y divide-slate-50">
        <div className="px-6 py-5">
          <label className={labelClass}>Default Due Days After Referral</label>
          <p className="text-xs text-slate-400 mb-3">When a new referral is created, the due date will default to this many days from the referral date.</p>
          <div className="flex items-center gap-3">
            <input type="number" min="1" max="90" value={form.referral_due_days}
              onChange={e => setForm(f => ({ ...f, referral_due_days: e.target.value }))}
              className={inputClass + " w-24"} />
            <select value={form.referral_due_business_days ? "business" : "calendar"}
              onChange={e => setForm(f => ({ ...f, referral_due_business_days: e.target.value === "business" }))}
              className={inputClass + " w-52"}>
              <option value="business">Business days (Mon–Fri)</option>
              <option value="calendar">Calendar days (all days)</option>
            </select>
            <span className="text-sm text-slate-400">after referral date</span>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
          {saved.referrals ? <span className="text-sm text-emerald-600 font-medium">✅ Saved</span> : <span />}
          {isAdmin && (
            <button
              onClick={() => saveModule("referrals", {
                referral_due_days: parseInt(form.referral_due_days),
                referral_due_business_days: form.referral_due_business_days,
              })}
              disabled={saving.referrals}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving.referrals ? "Saving…" : "Save Referral Defaults"}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderSchedulingSettings() {
    return (
      <div className="divide-y divide-slate-50">
        <div className="px-6 py-5 grid grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Default Session Duration</label>
            <p className="text-xs text-slate-400 mb-3">Default appointment length when creating new appointments.</p>
            <div className="flex items-center gap-2">
              <select value={extForm.default_session_duration}
                onChange={e => setExtForm(f => ({ ...f, default_session_duration: e.target.value }))}
                className={inputClass + " w-40"}>
                {["15","20","25","30","45","50","60","75","90","120"].map(d => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <p className="text-xs text-slate-400 mb-3">Primary timezone for scheduling and calendar display.</p>
            <select value={extForm.timezone}
              onChange={e => setExtForm(f => ({ ...f, timezone: e.target.value }))}
              className={inputClass}>
              {[
                ["America/New_York",     "Eastern Time (ET)"],
                ["America/Chicago",      "Central Time (CT)"],
                ["America/Denver",       "Mountain Time (MT)"],
                ["America/Los_Angeles",  "Pacific Time (PT)"],
                ["America/Anchorage",    "Alaska Time (AK)"],
                ["Pacific/Honolulu",     "Hawaii Time (HI)"],
              ].map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
          {saved.scheduling ? <span className="text-sm text-emerald-600 font-medium">✅ Saved</span> : <span />}
          {isAdmin && (
            <button
              onClick={() => saveModule("scheduling", {
                default_session_duration: parseInt(extForm.default_session_duration),
                timezone: extForm.timezone,
              })}
              disabled={saving.scheduling}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving.scheduling ? "Saving…" : "Save Scheduling Defaults"}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderBillingSettings() {
    return (
      <div className="divide-y divide-slate-50">
        <div className="px-6 py-5">
          <label className={labelClass}>Billing Email</label>
          <p className="text-xs text-slate-400 mb-3">Where billing notifications, invoice copies, and payment alerts are sent.</p>
          <input type="email" value={extForm.billing_email}
            onChange={e => setExtForm(f => ({ ...f, billing_email: e.target.value }))}
            className={inputClass + " max-w-sm"}
            placeholder="billing@yourorg.org" />
        </div>

        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
          {saved.billing ? <span className="text-sm text-emerald-600 font-medium">✅ Saved</span> : <span />}
          {isAdmin && (
            <button
              onClick={() => saveModule("billing", { billing_email: extForm.billing_email })}
              disabled={saving.billing}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving.billing ? "Saving…" : "Save Billing Settings"}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderClinicalSettings() {
    return (
      <div className="divide-y divide-slate-50">
        {/* Client Terminology (shared reference) */}
        <div className="px-6 py-5">
          <label className={labelClass}>Client Terminology</label>
          <p className="text-xs text-slate-400 mb-3">How you refer to the people you serve. This affects labels across notes, encounters, and reports.</p>
          <div className="flex flex-wrap gap-2">
            {TERMS.map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, client_terminology: t }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors ${form.client_terminology === t ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            ℹ️ Also configurable in the{" "}
            <button onClick={() => {
              const el = document.getElementById("module-organization");
              el?.scrollIntoView({ behavior: "smooth" });
            }} className="text-teal-600 hover:underline">Organization</button> section above.
          </p>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
          {saved.clinical ? <span className="text-sm text-emerald-600 font-medium">✅ Saved</span> : <span />}
          {isAdmin && (
            <button
              onClick={() => saveModule("clinical", { client_terminology: form.client_terminology })}
              disabled={saving.clinical}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving.clinical ? "Saving…" : "Save Clinical Settings"}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderPlanSettings() {
    return (
      <div className="divide-y divide-slate-50">
        <div className="px-6 py-5 space-y-5">
          {/* Billing cycle toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Current plan:
                <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-md ${PLAN_COLORS[currentPlan].badge}`}>
                  {PLAN_LABELS[currentPlan]}
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Plan changes are reviewed and applied by our team within 1 business day.</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 text-xs font-medium">
              <button onClick={() => setBillingCycle("monthly")}
                className={`px-3 py-1 rounded-md transition-colors ${billingCycle === "monthly" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                Monthly
              </button>
              <button onClick={() => setBillingCycle("annual")}
                className={`px-3 py-1 rounded-md transition-colors ${billingCycle === "annual" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                Annual <span className="text-teal-600 font-semibold">–20%</span>
              </button>
            </div>
          </div>

          {/* Pending plan request */}
          {planRequestPending && pendingPlan && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-amber-800">
                  📋 Plan change requested:{" "}
                  <span className={`px-1.5 py-0.5 rounded text-xs ${PLAN_COLORS[pendingPlan].badge}`}>{PLAN_LABELS[pendingPlan]}</span>
                </div>
                <div className="text-xs text-amber-600 mt-0.5">Our team is reviewing your request and will apply the change shortly.</div>
              </div>
              <button onClick={cancelPlanRequest} disabled={planRequestSaving}
                className="text-xs text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 disabled:opacity-50 shrink-0">
                Cancel Request
              </button>
            </div>
          )}

          {planRequestMsg && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${planRequestMsg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-600"}`}>
              {planRequestMsg.type === "success" ? "✅" : "❌"} {planRequestMsg.text}
            </div>
          )}

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PLAN_ORDER.map((plan) => {
              const isCurrent = plan === currentPlan;
              const isPendingRequest = plan === pendingPlan && planRequestPending;
              const price = PLAN_PRICES[plan];
              const colors = PLAN_COLORS[plan];
              const isDowngrade = PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(currentPlan);

              return (
                <div key={plan}
                  className={`relative rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${colors.border} ${isCurrent ? "ring-2 ring-offset-1 ring-teal-400" : ""} ${isPendingRequest ? "ring-2 ring-offset-1 ring-amber-400" : ""}`}>
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-teal-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase">Current</span>
                    </div>
                  )}
                  {isPendingRequest && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase">Requested</span>
                    </div>
                  )}
                  <div>
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md mb-2 ${colors.badge}`}>{PLAN_LABELS[plan]}</span>
                    {plan === "custom" ? (
                      <div className="text-2xl font-bold text-slate-900">Custom</div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">
                          ${billingCycle === "monthly" ? price.monthly.toLocaleString() : Math.round(price.annual / 12).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">/mo</span>
                      </div>
                    )}
                    {billingCycle === "annual" && plan !== "custom" && (
                      <p className="text-[11px] text-slate-400">${price.annual.toLocaleString()} billed annually</p>
                    )}
                  </div>
                  <ul className="flex-1 space-y-1.5">
                    {PLAN_HIGHLIGHTS[plan].map((feat) => (
                      <li key={feat} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <span className="text-teal-500 mt-0.5 shrink-0">✓</span>{feat}
                      </li>
                    ))}
                  </ul>
                  {isAdmin && (
                    isCurrent ? (
                      <div className="text-center text-xs text-slate-400 py-1.5 font-medium">Active Plan</div>
                    ) : isPendingRequest ? (
                      <div className="text-center text-xs text-amber-600 py-1.5 font-medium border border-amber-200 rounded-xl bg-amber-50">Request Pending…</div>
                    ) : plan === "custom" ? (
                      <a href="mailto:sales@kinshipehr.com" className={`w-full text-center text-xs font-semibold py-2 rounded-xl transition-colors ${colors.btn}`}>Contact Sales</a>
                    ) : planRequestPending ? (
                      <button disabled className="w-full text-center text-xs font-medium py-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed">
                        {isDowngrade ? "Downgrade" : "Upgrade"}
                      </button>
                    ) : isDowngrade ? (
                      <button onClick={() => requestPlanChange(plan)} disabled={planRequestSaving}
                        className="w-full text-center text-xs font-medium py-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 disabled:opacity-50">
                        {planRequestSaving ? "Requesting…" : "Request Downgrade"}
                      </button>
                    ) : (
                      <button onClick={() => requestPlanChange(plan)} disabled={planRequestSaving}
                        className={`w-full text-center text-xs font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 ${colors.btn}`}>
                        {planRequestSaving ? "Requesting…" : "Request Upgrade"}
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 text-center">
            Questions about plans?{" "}
            <a href="mailto:sales@kinshipehr.com" className="text-teal-600 hover:underline">Contact sales →</a>
          </p>
        </div>
      </div>
    );
  }

  function renderNoteTemplatesSettings() {
    return (
      <div className="px-6 py-5">
        <p className="text-xs text-slate-400 mb-4">
          Create custom note templates for your clinicians. SOAP is always available as a built-in option.
          Custom templates appear in the template selector when writing notes.
        </p>
        <NoteTemplatesManager />
      </div>
    );
  }

  function renderModuleContent(moduleId: string) {
    switch (moduleId) {
      case "organization":    return renderOrganizationSettings();
      case "referrals":       return renderReferralsSettings();
      case "scheduling":      return renderSchedulingSettings();
      case "billing":         return renderBillingSettings();
      case "clinical":        return renderClinicalSettings();
      case "note_templates":  return renderNoteTemplatesSettings();
      case "plan":            return renderPlanSettings();
      default:                return null;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Organization-wide configuration, organized by module</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search settings… (e.g. timezone, NPI, referral, plan)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* No results */}
      {q && visibleModules.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-12 text-center">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-slate-600 font-medium">No settings found for &quot;{search}&quot;</p>
          <p className="text-slate-400 text-sm mt-1">Try different keywords or{" "}
            <button onClick={() => setSearch("")} className="text-teal-600 hover:underline">clear the search</button>.
          </p>
        </div>
      )}

      {/* Module sections */}
      {visibleModules.map(mod => {
        const isOpen = effectiveExpanded[mod.id] !== false;
        return (
          <div key={mod.id} id={`module-${mod.id}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Module header */}
            <button
              onClick={() => !q && setExpanded(e => ({ ...e, [mod.id]: !e[mod.id] }))}
              className={`w-full px-6 py-4 border-b border-slate-100 flex items-center justify-between text-left transition-colors ${!q ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{mod.icon}</span>
                <div>
                  <h2 className="font-semibold text-slate-900">{mod.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>
                </div>
              </div>
              {!q && (
                <svg className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* Module content */}
            {isOpen && renderModuleContent(mod.id)}
          </div>
        );
      })}

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-700">
          <span className="font-semibold">Read-only view.</span> You need admin permissions to modify organization settings.
        </div>
      )}
    </div>
  );
}
