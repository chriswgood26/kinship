"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLAN_LABELS, PLAN_PRICES, PLAN_FEATURES, type Plan } from "@/lib/plans";

interface Org {
  id: string; name: string | null; plan: string | null; requested_plan?: string | null; is_active: boolean;
  client_terminology: string | null; org_type: string | null;
  created_at: string; addons?: string[];
}
interface WaitlistEntry {
  id: string; email: string; name: string | null; agency_name: string | null;
  agency_type: string | null; agency_size: string | null; created_at: string;
}

interface Props {
  orgs: Org[];
  waitlist: WaitlistEntry[];
  userCountByOrg: Record<string, number>;
  activeUserCountByOrg: Record<string, number>;
  inactiveUserCountByOrg: Record<string, number>;
  mrr: number;
  arr: number;
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-slate-100 text-slate-600",
  growth: "bg-teal-100 text-teal-700",
  practice: "bg-blue-100 text-blue-700",
  agency: "bg-purple-100 text-purple-700",
  custom: "bg-amber-100 text-amber-700",
};

export default function AdminClient({ orgs, waitlist, userCountByOrg, activeUserCountByOrg, inactiveUserCountByOrg, mrr, arr }: Props) {
  const [tab, setTab] = useState<"orgs" | "waitlist" | "features" | "requests">("orgs");
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editAddons, setEditAddons] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [approvingOrg, setApprovingOrg] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const router = useRouter();

  // Orgs with pending plan change requests
  const pendingRequests = orgs.filter(o => o.requested_plan && o.requested_plan !== o.plan);

  async function savePlan(orgId: string) {
    setSaving(true);
    await fetch(`/api/superadmin/org/${orgId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ plan: editPlan, addons: editAddons }),
    });
    setSaving(false); setEditingOrg(null);
    setSuccess("Plan updated"); router.refresh();
    setTimeout(() => setSuccess(""), 3000);
  }

  async function approvePlanRequest(orgId: string, newPlan: string) {
    setApprovingOrg(orgId);
    await fetch(`/api/superadmin/orgs/${orgId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ plan: newPlan, requested_plan: null }),
    });
    setApprovingOrg(null);
    setSuccess(`Plan changed to ${PLAN_LABELS[newPlan as Plan] || newPlan}`);
    router.refresh();
    setTimeout(() => setSuccess(""), 3000);
  }

  async function denyPlanRequest(orgId: string) {
    setApprovingOrg(orgId);
    await fetch(`/api/superadmin/orgs/${orgId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ requested_plan: null }),
    });
    setApprovingOrg(null);
    setSuccess("Plan request dismissed");
    router.refresh();
    setTimeout(() => setSuccess(""), 3000);
  }

  const activeOrgs = orgs.filter(o => o.is_active);
  const ADDON_OPTIONS = [
    { key: "ccbhc", label: "CCBHC Module +$49" },
    { key: "emar", label: "eMAR +$49" },
    { key: "dd", label: "DD Modules +$49" },
    { key: "sms", label: "SMS Reminders +$29" },
  ];

  return (
    <div>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">🔑 Kinship Admin</h1>
            <p className="text-slate-500 text-sm mt-0.5">Internal dashboard — Chris Goodbaudy only</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Current MRR</div>
            <div className="text-3xl font-bold text-teal-600">${mrr.toLocaleString()}</div>
            <div className="text-xs text-slate-400">ARR: ${arr.toLocaleString()}</div>
          </div>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">✅ {success}</div>}

        {/* Summary cards */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Active Orgs", value: activeOrgs.length, color: "bg-teal-50 border-teal-100" },
            { label: "MRR", value: `$${mrr.toLocaleString()}`, color: "bg-emerald-50 border-emerald-100" },
            { label: "ARR", value: `$${arr.toLocaleString()}`, color: "bg-blue-50 border-blue-100" },
            { label: "Waitlist", value: waitlist.length, color: "bg-amber-50 border-amber-100" },
            { label: "Total Users", value: `${Object.values(activeUserCountByOrg).reduce((s, n) => s + n, 0)} active`, color: "bg-slate-50 border-slate-200" },
          ].map(s => (
            <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Revenue by plan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Revenue by Plan</h2>
          <div className="grid grid-cols-5 gap-3">
            {(["starter", "growth", "practice", "agency", "custom"] as Plan[]).map(plan => {
              const count = activeOrgs.filter(o => (o.plan || "starter") === plan).length;
              const planMrr = count * (PLAN_PRICES[plan]?.monthly || 0);
              return (
                <div key={plan} className={`rounded-xl p-3 ${PLAN_COLORS[plan]} bg-opacity-30`}>
                  <div className="font-bold text-sm capitalize">{PLAN_LABELS[plan]}</div>
                  <div className="text-2xl font-bold mt-1">{count}</div>
                  <div className="text-xs opacity-70">orgs</div>
                  {planMrr > 0 && <div className="text-xs font-semibold mt-1">${planMrr}/mo</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan Requests Banner */}
        {pendingRequests.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-800 font-medium">
              <span className="text-lg">📋</span>
              <span>{pendingRequests.length} pending plan change {pendingRequests.length === 1 ? "request" : "requests"} from customers</span>
            </div>
            <button onClick={() => setTab("requests")} className="text-xs font-semibold text-amber-700 border border-amber-300 px-3 py-1 rounded-lg hover:bg-amber-100">
              Review Requests →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {[
            ["orgs", "Organizations"],
            ["requests", `Plan Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}`],
            ["waitlist", `Waitlist (${waitlist.length})`],
            ["features", "Feature Matrix"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as typeof tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"} ${key === "requests" && pendingRequests.length > 0 ? "text-amber-600" : ""}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ORGANIZATIONS TAB */}
        {tab === "orgs" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Organization</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Users (Active / Inactive)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">MRR</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orgs.map(org => {
                  const plan = (org.plan || "starter") as Plan;
                  const orgMrr = PLAN_PRICES[plan]?.monthly || 0;
                  const users = userCountByOrg[org.id] || 0;
                  const activeUsers = activeUserCountByOrg[org.id] || 0;
                  const inactiveUsers = inactiveUserCountByOrg[org.id] || 0;
                  return (
                    <>
                      <tr key={org.id} className={`hover:bg-slate-50 transition-colors ${!org.is_active ? "opacity-40" : ""}`}>
                        <td className="px-5 py-3.5">
                          <Link href={`/superadmin/orgs/${org.id}`} className="group">
                            <div className="font-semibold text-sm text-slate-900 group-hover:text-teal-600 transition-colors">{org.name || "Unnamed"}</div>
                            <div className="text-xs text-slate-400 font-mono">{org.id.slice(0,8)}...</div>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${PLAN_COLORS[plan]}`}>
                            {PLAN_LABELS[plan]}
                          </span>
                          {(org.addons?.length ?? 0) > 0 && (
                            <div className="text-xs text-slate-400 mt-0.5">{(org.addons || []).join(", ")}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm">
                          <span className="font-semibold text-slate-900">{activeUsers}</span>
                          <span className="text-slate-400 text-xs"> / {inactiveUsers}</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-bold text-emerald-700">${orgMrr}/mo</td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 capitalize">{org.org_type?.replace("_", " ") || "—"}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-400">{new Date(org.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td className="px-4 py-3.5 flex items-center gap-2">
                          <Link href={`/superadmin/orgs/${org.id}`}
                            className="text-xs text-teal-600 font-medium hover:text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg">
                            Details
                          </Link>
                          <button onClick={() => { setEditingOrg(editingOrg === org.id ? null : org.id); setEditPlan(plan); setEditAddons(org.addons || []); }}
                            className="text-xs text-slate-500 font-medium hover:text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg">
                            {editingOrg === org.id ? "Cancel" : "Quick Edit"}
                          </button>
                        </td>
                      </tr>
                      {editingOrg === org.id && (
                        <tr key={`${org.id}-edit`}>
                          <td colSpan={7} className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                            <div className="flex items-start gap-6">
                              <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Plan</label>
                                <div className="flex gap-2">
                                  {(["starter", "growth", "practice", "agency", "custom"] as Plan[]).map(p => (
                                    <button key={p} onClick={() => setEditPlan(p)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${editPlan === p ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                                      {PLAN_LABELS[p]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Add-ons</label>
                                <div className="flex gap-2">
                                  {ADDON_OPTIONS.map(a => (
                                    <button key={a.key} type="button"
                                      onClick={() => setEditAddons(prev => prev.includes(a.key) ? prev.filter(x => x !== a.key) : [...prev, a.key])}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${editAddons.includes(a.key) ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600"}`}>
                                      {a.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-end">
                                <button onClick={() => savePlan(org.id)} disabled={saving}
                                  className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
                                  {saving ? "Saving..." : "Save Changes"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PLAN REQUESTS TAB */}
        {tab === "requests" && (
          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
                <div className="text-4xl mb-3">✅</div>
                <div className="text-sm font-medium">No pending plan change requests</div>
                <div className="text-xs mt-1">When a customer requests a plan change, it will appear here for review.</div>
              </div>
            ) : (
              pendingRequests.map(org => {
                const currentPlan = (org.plan || "starter") as Plan;
                const requestedPlan = org.requested_plan as Plan;
                const isUpgrade = (["starter", "growth", "practice", "agency", "custom"] as Plan[]).indexOf(requestedPlan) >
                  (["starter", "growth", "practice", "agency", "custom"] as Plan[]).indexOf(currentPlan);
                return (
                  <div key={org.id} className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
                    <div className="bg-amber-50 px-5 py-3 border-b border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{org.name || "Unnamed Org"}</span>
                        <span className="text-xs font-mono text-slate-400">{org.id.slice(0, 8)}…</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isUpgrade ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-600"}`}>
                        {isUpgrade ? "⬆ Upgrade Request" : "⬇ Downgrade Request"}
                      </span>
                    </div>
                    <div className="px-5 py-4">
                      <div className="flex items-center gap-6">
                        <div className="flex-1">
                          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Current Plan</div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm px-2.5 py-1 rounded-full font-semibold capitalize ${PLAN_COLORS[currentPlan]}`}>
                              {PLAN_LABELS[currentPlan]}
                            </span>
                            <span className="text-xs text-slate-400">${PLAN_PRICES[currentPlan]?.monthly || 0}/mo</span>
                          </div>
                        </div>

                        <div className="text-xl text-slate-300">→</div>

                        <div className="flex-1">
                          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Requested Plan</div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm px-2.5 py-1 rounded-full font-semibold capitalize ${PLAN_COLORS[requestedPlan]}`}>
                              {PLAN_LABELS[requestedPlan]}
                            </span>
                            <span className="text-xs text-slate-400">${PLAN_PRICES[requestedPlan]?.monthly || 0}/mo</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approvePlanRequest(org.id, requestedPlan)}
                            disabled={approvingOrg === org.id}
                            className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50"
                          >
                            {approvingOrg === org.id ? "Applying…" : "✓ Approve"}
                          </button>
                          <button
                            onClick={() => denyPlanRequest(org.id)}
                            disabled={approvingOrg === org.id}
                            className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                          <Link href={`/superadmin/orgs/${org.id}`}
                            className="text-xs text-teal-600 font-medium hover:text-teal-700 border border-teal-200 px-3 py-2 rounded-xl">
                            View Org
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* WAITLIST TAB */}
        {tab === "waitlist" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {waitlist.length === 0 ? (
              <div className="p-10 text-center text-slate-400">No waitlist signups yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agency</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Signed up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {waitlist.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-sm text-slate-900">{w.name || "—"}</div>
                        <div className="text-xs text-teal-600 font-medium">{w.email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-700">{w.agency_name || "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{w.agency_type || "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{w.agency_size || "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">{new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* FEATURE MATRIX TAB */}
        {tab === "features" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Feature</th>
                  {(["starter", "growth", "practice", "agency"] as Plan[]).map(p => (
                    <th key={p} className="text-center px-4 py-3 font-semibold text-slate-600 capitalize">{PLAN_LABELS[p]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {([
                  ["Clients & Scheduling", "clients"],
                  ["Encounters & Notes", "encounters"],
                  ["Billing & Claims", "billing"],
                  ["Patient Portal", "portal"],
                  ["Treatment Plans", "treatmentPlans"],
                  ["CCBHC Dashboard", "ccbhc"],
                  ["Assessments (PHQ-9, GAD-7, C-SSRS)", "assessments"],
                  ["Supervisor Review", "supervisorReview"],
                  ["eMAR", "emar"],
                  ["DD Modules (ISP, Incidents)", "ddModules"],
                  ["Bed Management", "bedManagement"],
                  ["Prior Authorizations", "priorAuth"],
                  ["Advanced Reports", "advancedReports"],
                  ["Multi-Location", "multiLocation"],
                  ["SLA Guarantee", "sla"],
                ] as [string, keyof typeof PLAN_FEATURES.starter][]).map(([label, key]) => (
                  <tr key={key} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-slate-700 font-medium">{label}</td>
                    {(["starter", "growth", "practice", "agency"] as Plan[]).map(p => (
                      <td key={p} className="text-center px-4 py-2.5">
                        {PLAN_FEATURES[p][key]
                          ? <span className="text-emerald-500 text-base">✓</span>
                          : <span className="text-slate-200 text-base">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="px-5 py-2.5 font-bold text-slate-900">Max Staff Users</td>
                  {(["starter", "growth", "practice", "agency"] as Plan[]).map(p => (
                    <td key={p} className="text-center px-4 py-2.5 font-bold text-slate-900">{PLAN_FEATURES[p].maxUsers}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-5 py-2.5 font-bold text-slate-900">Storage</td>
                  {(["starter", "growth", "practice", "agency"] as Plan[]).map(p => (
                    <td key={p} className="text-center px-4 py-2.5 font-bold text-slate-900">{PLAN_FEATURES[p].storageGB}GB</td>
                  ))}
                </tr>
                <tr className="bg-teal-50">
                  <td className="px-5 py-2.5 font-bold text-teal-900">Monthly Price</td>
                  {(["starter", "growth", "practice", "agency"] as Plan[]).map(p => (
                    <td key={p} className="text-center px-4 py-2.5 font-bold text-teal-700">${PLAN_PRICES[p].monthly}/mo</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
