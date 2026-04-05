"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLAN_LABELS, PLAN_PRICES, type Plan } from "@/lib/plans";

interface OrgData {
  id: string;
  name: string | null;
  plan: string | null;
  requested_plan?: string | null;
  addons: string[] | null;
  is_active: boolean;
  org_type: string | null;
  created_at: string;
  client_terminology: string | null;
  disabled_forms: string[] | null;
  disabled_modules: string[] | null;
  ccbhc_reporting_enabled: boolean | null;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string;
}

interface FeedbackItem {
  id: string;
  type: string;
  problem: string | null;
  impact: string | null;
  ideal: string | null;
  status: string;
  created_at: string;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  admin_notes: string | null;
}

interface Props {
  org: OrgData;
  users: UserProfile[];
  feedback: FeedbackItem[];
  lifetimeRevenue: number;
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-slate-100 text-slate-600",
  growth: "bg-teal-100 text-teal-700",
  practice: "bg-blue-100 text-blue-700",
  agency: "bg-purple-100 text-purple-700",
  custom: "bg-amber-100 text-amber-700",
};

const ALL_FORMS = [
  { key: "intake", label: "Intake / Enrollment Form" },
  { key: "consent", label: "Consent to Treatment" },
  { key: "roi", label: "Release of Information (ROI)" },
  { key: "phq9", label: "PHQ-9 Depression Screen" },
  { key: "gad7", label: "GAD-7 Anxiety Screen" },
  { key: "cssrs", label: "C-SSRS Suicide Risk Assessment" },
  { key: "safety_plan", label: "Safety Plan" },
  { key: "treatment_plan", label: "Treatment Plan" },
  { key: "progress_note", label: "Progress Notes" },
  { key: "isp", label: "Individual Support Plan (ISP)" },
  { key: "incident_report", label: "Incident Report" },
  { key: "med_log", label: "Medication Administration Log" },
  { key: "discharge", label: "Discharge Summary" },
  { key: "sliding_fee", label: "Sliding Fee Application" },
  { key: "telehealth_consent", label: "Telehealth Consent" },
];

const ALL_MODULES = [
  { key: "scheduling", label: "Scheduling & Appointments" },
  { key: "encounters", label: "Encounters & Clinical Notes" },
  { key: "billing", label: "Billing & Claims" },
  { key: "portal", label: "Patient Portal" },
  { key: "assessments", label: "Assessments (PHQ-9, GAD-7, C-SSRS)" },
  { key: "treatmentPlans", label: "Treatment Plans" },
  { key: "telehealth", label: "Telehealth (Video Sessions)" },
  { key: "supervisorReview", label: "Supervisor Review & Co-sign" },
  { key: "emar", label: "eMAR (Medication Management)" },
  { key: "ddModules", label: "DD Modules (ISP, Incidents)" },
  { key: "bedManagement", label: "Bed Management" },
  { key: "priorAuth", label: "Prior Authorizations" },
  { key: "advancedReports", label: "Advanced Reports" },
  { key: "ccbhc", label: "CCBHC Dashboard" },
  { key: "multiLocation", label: "Multi-Location Support" },
  { key: "timesheet", label: "Timesheet & Time Tracking" },
  { key: "inbox", label: "Secure Messaging / Inbox" },
];

const FEEDBACK_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  reviewed: "bg-purple-100 text-purple-700",
  planned: "bg-amber-100 text-amber-700",
  shipped: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-500",
};

const ADDON_OPTIONS = [
  { key: "ccbhc", label: "CCBHC Module" },
  { key: "emar", label: "eMAR" },
  { key: "dd", label: "DD Modules" },
  { key: "sms", label: "SMS Reminders" },
];

export default function OrgDetailClient({ org, users, feedback, lifetimeRevenue }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "users" | "feedback" | "forms" | "modules">("overview");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Plan editing
  const [editPlan, setEditPlan] = useState(org.plan || "starter");
  const [editAddons, setEditAddons] = useState<string[]>(org.addons || []);

  // Form toggles (disabled_forms is an array of DISABLED form keys)
  const [disabledForms, setDisabledForms] = useState<string[]>(org.disabled_forms || []);

  // Module toggles (disabled_modules is an array of DISABLED module keys)
  const [disabledModules, setDisabledModules] = useState<string[]>(org.disabled_modules || []);

  // CCBHC reporting
  const [ccbhcEnabled, setCcbhcEnabled] = useState(org.ccbhc_reporting_enabled ?? false);

  // Active status
  const [isActive, setIsActive] = useState(org.is_active);

  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);
  const plan = (org.plan || "starter") as Plan;
  const planMrr = PLAN_PRICES[plan]?.monthly || 0;

  async function save(payload: Record<string, unknown>, successMsg = "Saved") {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/superadmin/orgs/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Save failed");
      } else {
        setSuccess(successMsg);
        setTimeout(() => setSuccess(""), 3000);
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function toggleForm(key: string) {
    setDisabledForms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleModule(key: string) {
    setDisabledModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Back nav */}
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin"
            className="text-sm text-slate-500 hover:text-teal-600 transition-colors flex items-center gap-1"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{org.name || "Unnamed Organization"}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${PLAN_COLORS[plan]}`}>
                {PLAN_LABELS[plan]}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                {isActive ? "Active" : "Inactive"}
              </span>
              {org.org_type && (
                <span className="text-xs text-slate-400 capitalize">{org.org_type.replace(/_/g, " ")}</span>
              )}
              <span className="text-xs font-mono text-slate-300">{org.id.slice(0, 8)}…</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Monthly Revenue</div>
            <div className="text-2xl font-bold text-emerald-600">${planMrr.toLocaleString()}/mo</div>
            <div className="text-xs text-slate-400">
              Joined {new Date(org.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
            ❌ {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Active Users", value: activeUsers.length, color: "bg-teal-50 border-teal-100" },
            { label: "Inactive Users", value: inactiveUsers.length, color: "bg-slate-50 border-slate-200" },
            { label: "Plan Tier", value: PLAN_LABELS[plan], color: "bg-blue-50 border-blue-100" },
            { label: "Lifetime Revenue", value: `$${lifetimeRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "bg-emerald-50 border-emerald-100" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
              <div className="text-xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* CCBHC Reporting Banner */}
        <div className={`rounded-2xl border p-4 flex items-center justify-between ${ccbhcEnabled ? "bg-violet-50 border-violet-200" : "bg-slate-50 border-slate-200"}`}>
          <div>
            <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${ccbhcEnabled ? "bg-violet-500" : "bg-slate-300"}`} />
              CCBHC Reporting Measures
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {ccbhcEnabled
                ? "CCBHC reporting measures are ENABLED for this organization"
                : "CCBHC reporting measures are DISABLED for this organization"}
            </div>
          </div>
          <button
            onClick={() => {
              setCcbhcEnabled(!ccbhcEnabled);
              save({ ccbhc_reporting_enabled: !ccbhcEnabled }, `CCBHC reporting ${!ccbhcEnabled ? "enabled" : "disabled"}`);
            }}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              ccbhcEnabled
                ? "bg-violet-500 text-white hover:bg-violet-400"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}
          >
            {ccbhcEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {[
            ["overview", "Overview & Plan"],
            ["users", `Users (${users.length})`],
            ["feedback", `Feedback (${feedback.length})`],
            ["forms", "Form Controls"],
            ["modules", "Module Controls"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Pending plan change request banner */}
            {org.requested_plan && org.requested_plan !== org.plan && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-600 font-bold text-sm">📋 Pending Plan Change Request</span>
                    </div>
                    <p className="text-sm text-amber-800">
                      This organization has requested to change their plan from{" "}
                      <span className="font-semibold">{PLAN_LABELS[(org.plan || "starter") as Plan]}</span>
                      {" "}to{" "}
                      <span className="font-semibold">{PLAN_LABELS[org.requested_plan as Plan] || org.requested_plan}</span>.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Click &ldquo;Approve&rdquo; to apply the change, or &ldquo;Dismiss&rdquo; to cancel the request without changing the plan.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditPlan(org.requested_plan as string);
                        save({ plan: org.requested_plan, requested_plan: null }, `Plan changed to ${PLAN_LABELS[org.requested_plan as Plan] || org.requested_plan}`);
                      }}
                      disabled={saving}
                      className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {saving ? "Applying…" : "✓ Approve"}
                    </button>
                    <button
                      onClick={() => save({ requested_plan: null }, "Plan request dismissed")}
                      disabled={saving}
                      className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Plan management */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <h2 className="font-semibold text-slate-900">Plan & Add-ons</h2>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                  Subscription Plan
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(["starter", "growth", "practice", "agency", "custom"] as Plan[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setEditPlan(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                        editPlan === p
                          ? "bg-teal-500 text-white border-teal-500"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {PLAN_LABELS[p]} — ${PLAN_PRICES[p].monthly}/mo
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                  Add-ons
                </label>
                <div className="flex gap-2 flex-wrap">
                  {ADDON_OPTIONS.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() =>
                        setEditAddons((prev) =>
                          prev.includes(a.key) ? prev.filter((x) => x !== a.key) : [...prev, a.key]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        editAddons.includes(a.key)
                          ? "bg-teal-500 text-white border-teal-500"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => save({ plan: editPlan, addons: editAddons }, "Plan & add-ons updated")}
                disabled={saving}
                className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Plan Changes"}
              </button>
            </div>

            {/* Active / Inactive toggle */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-3">Organization Status</h2>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-700">
                    This organization is currently{" "}
                    <span className={`font-semibold ${isActive ? "text-emerald-600" : "text-red-500"}`}>
                      {isActive ? "active" : "inactive"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Disabling will prevent staff from logging in
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsActive(!isActive);
                    save({ is_active: !isActive }, `Organization ${!isActive ? "activated" : "deactivated"}`);
                  }}
                  disabled={saving}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  }`}
                >
                  {isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>

            {/* Org details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-3">Organization Details</h2>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Organization ID", org.id],
                  ["Type", org.org_type?.replace(/_/g, " ") || "—"],
                  ["Client Terminology", org.client_terminology || "client"],
                  ["Created", new Date(org.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
                  ["Active Users", activeUsers.length],
                  ["Inactive Users", inactiveUsers.length],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex flex-col gap-0.5">
                    <dt className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</dt>
                    <dd className="text-slate-900 font-medium font-mono text-xs">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {users.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">No users enrolled in this organization</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-slate-50 ${!u.is_active ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-sm text-slate-900">
                          {u.first_name || ""} {u.last_name || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-teal-600 font-medium">{u.email || "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 capitalize">{u.role || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* FEEDBACK TAB */}
        {tab === "feedback" && (
          <div className="space-y-3">
            {feedback.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
                No feedback received from this organization yet
              </div>
            ) : (
              feedback.map((f) => (
                <div key={f.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${FEEDBACK_STATUS_COLORS[f.status] || "bg-slate-100 text-slate-500"}`}>
                        {f.status}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">{f.type}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  {f.submitted_by_name && (
                    <div className="text-xs text-slate-500 font-medium">
                      From: {f.submitted_by_name} {f.submitted_by_email ? `(${f.submitted_by_email})` : ""}
                    </div>
                  )}
                  {f.problem && (
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Problem</div>
                      <p className="text-sm text-slate-700 mt-0.5">{f.problem}</p>
                    </div>
                  )}
                  {f.impact && (
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Impact</div>
                      <p className="text-sm text-slate-700 mt-0.5">{f.impact}</p>
                    </div>
                  )}
                  {f.ideal && (
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ideal Solution</div>
                      <p className="text-sm text-slate-700 mt-0.5">{f.ideal}</p>
                    </div>
                  )}
                  {f.admin_notes && (
                    <div className="bg-amber-50 rounded-xl px-3 py-2">
                      <div className="text-xs font-semibold text-amber-700">Admin Notes</div>
                      <p className="text-xs text-amber-900 mt-0.5">{f.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* FORMS TAB */}
        {tab === "forms" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Form Controls</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Toggle individual forms on/off for this organization. Disabled forms are hidden from staff.
                </p>
              </div>
              <button
                onClick={() => save({ disabled_forms: disabledForms }, "Form settings saved")}
                disabled={saving}
                className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Form Settings"}
              </button>
            </div>

            <div className="space-y-2">
              {ALL_FORMS.map((form) => {
                const isEnabled = !disabledForms.includes(form.key);
                return (
                  <div
                    key={form.key}
                    className="flex items-center justify-between py-2.5 px-4 rounded-xl border border-slate-100 hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">{form.label}</div>
                      <div className="text-xs text-slate-400 font-mono">{form.key}</div>
                    </div>
                    <button
                      onClick={() => toggleForm(form.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        isEnabled ? "bg-teal-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODULES TAB */}
        {tab === "modules" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Module Controls</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Override module access for this organization. Disabled modules are hidden from all staff regardless of plan.
                </p>
              </div>
              <button
                onClick={() => save({ disabled_modules: disabledModules }, "Module settings saved")}
                disabled={saving}
                className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Module Settings"}
              </button>
            </div>

            <div className="space-y-2">
              {ALL_MODULES.map((mod) => {
                const isEnabled = !disabledModules.includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    className="flex items-center justify-between py-2.5 px-4 rounded-xl border border-slate-100 hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">{mod.label}</div>
                      <div className="text-xs text-slate-400 font-mono">{mod.key}</div>
                    </div>
                    <button
                      onClick={() => toggleModule(mod.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        isEnabled ? "bg-teal-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
