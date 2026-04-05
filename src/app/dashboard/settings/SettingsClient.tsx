"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLAN_FEATURES, PLAN_PRICES, PLAN_LABELS, type Plan } from "@/lib/plans";

interface Org { id: string; name: string | null; npi: string | null; phone: string | null; address_line1: string | null; city: string | null; state: string | null; zip: string | null; client_terminology: string | null; org_type: string | null; referral_due_days: number | null; referral_due_business_days: boolean | null; plan?: string | null; addons?: string[] | null; }

const TERMS = ["client", "patient", "individual", "recipient", "resident", "consumer", "member"];
const ORG_TYPES = ["behavioral_health", "developmental_disabilities", "substance_use", "residential", "cmhc", "outpatient"];

const PLAN_ORDER: Plan[] = ["starter", "growth", "practice", "agency", "custom"];

const PLAN_HIGHLIGHTS: Record<Plan, string[]> = {
  starter:  ["Up to 5 users", "5 GB storage", "Clients, Scheduling, Encounters", "Billing & Claims", "Client Portal"],
  growth:   ["Up to 15 users", "20 GB storage", "Everything in Starter", "Assessments & Treatment Plans", "Supervisor Review", "Telehealth (Zoom/Jitsi)", "CCBHC support"],
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

export default function SettingsClient({ org, userRole = "clinician" }: { org: Org | null; userRole?: string }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    name: org?.name || "",
    npi: org?.npi || "",
    phone: org?.phone || "",
    address_line1: org?.address_line1 || "",
    city: org?.city || "",
    state: org?.state || "",
    zip: org?.zip || "",
    client_terminology: org?.client_terminology || "client",
    org_type: org?.org_type || "behavioral_health",
    referral_due_days: org?.referral_due_days?.toString() || "3",
    referral_due_business_days: org?.referral_due_business_days !== false,
  });

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true); setEditing(false); router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  const fields = [
    { label: "Organization Name", value: form.name },
    { label: "NPI", value: form.npi },
    { label: "Phone", value: form.phone },
    { label: "Address", value: [form.address_line1, form.city && `${form.city}, ${form.state} ${form.zip}`].filter(Boolean).join(", ") },
    { label: "Client Terminology", value: form.client_terminology?.charAt(0).toUpperCase() + (form.client_terminology?.slice(1) || "") },
    { label: "Organization Type", value: form.org_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) },
    { label: "Referral Due Date Default", value: `${form.referral_due_days} ${form.referral_due_business_days ? "business" : "calendar"} days` },
  ];

  const currentPlan = (org?.plan || "starter") as Plan;
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Organization configuration</p>
      </div>

      {saved && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-sm text-emerald-700 font-medium">✅ Settings saved</div>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">🏢 Organization</h2>
          <button onClick={() => setEditing(!editing)}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-50">
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing ? (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Organization Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>NPI</label><input value={form.npi} onChange={e => setForm(f => ({ ...f, npi: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Organization Type</label>
                <select value={form.org_type} onChange={e => setForm(f => ({ ...f, org_type: e.target.value }))} className={inputClass}>
                  {ORG_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className={labelClass}>Address</label><input value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelClass}>State</label><input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>ZIP</label><input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} className={inputClass} /></div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Client Terminology — how do you refer to the people you serve?</label>
              <div className="flex flex-wrap gap-2">
                {TERMS.map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, client_terminology: t }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors ${form.client_terminology === t ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Referral Due Date Default</label>
              <div className="flex items-center gap-3">
                <input type="number" min="1" max="90" value={form.referral_due_days}
                  onChange={e => setForm(f => ({ ...f, referral_due_days: e.target.value }))}
                  className={inputClass + " w-20"} />
                <select value={form.referral_due_business_days ? "business" : "calendar"}
                  onChange={e => setForm(f => ({ ...f, referral_due_business_days: e.target.value === "business" }))}
                  className={inputClass + " w-48"}>
                  <option value="business">Business days</option>
                  <option value="calendar">Calendar days</option>
                </select>
                <span className="text-xs text-slate-400">after referral date</span>
              </div>
            </div>

            <button onClick={save} disabled={saving}
              className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {fields.map(f => (
              <div key={f.label} className="flex items-center justify-between px-6 py-3.5">
                <span className="text-sm text-slate-500">{f.label}</span>
                <span className="text-sm font-medium text-slate-900">{f.value || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan & Billing */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">💳 Plan &amp; Billing</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Currently on{" "}
              <span className={`font-semibold px-1.5 py-0.5 rounded ${PLAN_COLORS[currentPlan].badge}`}>
                {PLAN_LABELS[currentPlan]}
              </span>
            </p>
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

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PLAN_ORDER.map((plan) => {
              const isCurrent = plan === currentPlan;
              const price = PLAN_PRICES[plan];
              const colors = PLAN_COLORS[plan];
              const isDowngrade = PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(currentPlan);

              return (
                <div key={plan}
                  className={`relative rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${colors.border} ${isCurrent ? "ring-2 ring-offset-1 ring-teal-400" : ""}`}>
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-teal-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase">Current</span>
                    </div>
                  )}

                  <div>
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md mb-2 ${colors.badge}`}>
                      {PLAN_LABELS[plan]}
                    </span>
                    {plan === "custom" ? (
                      <div className="text-2xl font-bold text-slate-900">Custom</div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">
                          ${billingCycle === "monthly"
                            ? price.monthly.toLocaleString()
                            : Math.round(price.annual / 12).toLocaleString()}
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
                        <span className="text-teal-500 mt-0.5 shrink-0">✓</span>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  {userRole === "admin" && (
                    isCurrent ? (
                      <div className="text-center text-xs text-slate-400 py-1.5 font-medium">Active Plan</div>
                    ) : plan === "custom" ? (
                      <a href="mailto:sales@kinshipehr.com"
                        className={`w-full text-center text-xs font-semibold py-2 rounded-xl transition-colors ${colors.btn}`}>
                        Contact Sales
                      </a>
                    ) : isDowngrade ? (
                      <button disabled className="w-full text-center text-xs font-medium py-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed">
                        Downgrade
                      </button>
                    ) : (
                      <a href="mailto:sales@kinshipehr.com?subject=Upgrade%20to%20{plan}"
                        className={`w-full text-center text-xs font-semibold py-2 rounded-xl transition-colors ${colors.btn}`}>
                        Upgrade
                      </a>
                    )
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-slate-400 text-center">
            Need help choosing a plan? <a href="mailto:sales@kinshipehr.com" className="text-teal-600 hover:underline">Contact our team →</a>
          </p>
        </div>
      </div>
    </div>
  );
}
