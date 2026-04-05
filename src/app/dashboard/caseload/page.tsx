import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTerminology } from "@/lib/terminology";
import CaseloadClient from "./CaseloadClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CaseloadPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, roles, role")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = profile?.organization_id;
  if (!orgId) redirect("/sign-in");

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("client_terminology, plan")
    .eq("id", orgId)
    .single();

  const term = getTerminology(org?.client_terminology);

  // Load all active clinicians / care coordinators
  const [{ data: clinicians }, { data: allClients }] = await Promise.all([
    supabaseAdmin
      .from("user_profiles")
      .select("id, first_name, last_name, credentials, role, roles, title, caseload_capacity")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("last_name"),
    supabaseAdmin
      .from("clients")
      .select("id, primary_clinician_id, status")
      .eq("organization_id", orgId)
      .eq("is_active", true),
  ]);

  // Build count map
  const countMap: Record<string, { active: number; total: number }> = {};
  for (const c of allClients || []) {
    if (!c.primary_clinician_id) continue;
    if (!countMap[c.primary_clinician_id]) countMap[c.primary_clinician_id] = { active: 0, total: 0 };
    countMap[c.primary_clinician_id].total++;
    if (c.status === "active") countMap[c.primary_clinician_id].active++;
  }

  const unassignedCount = (allClients || []).filter(c => !c.primary_clinician_id).length;
  const totalActive = (allClients || []).filter(c => c.status === "active").length;

  const summary = (clinicians || [])
    .filter(c => {
      const roles = c.roles || [c.role];
      return roles.some((r: string) => ["clinician", "supervisor", "care_coordinator"].includes(r));
    })
    .map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      credentials: c.credentials,
      title: c.title,
      role: c.role,
      count: countMap[c.id]?.active || 0,
      total_count: countMap[c.id]?.total || 0,
      caseload_capacity: c.caseload_capacity ?? null,
    }))
    .sort((a, b) => b.count - a.count);

  const activeClinicians = summary.filter(c => c.count > 0).length;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Caseload Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {activeClinicians} clinician{activeClinicians !== 1 ? "s" : ""} with active panels · {totalActive} active {term.plural.toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/reports/caseload"
            className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            📊 Caseload Report
          </Link>
          <Link
            href="/dashboard/clients"
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 transition-colors"
          >
            All {term.plural}
          </Link>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: `Active ${term.plural}`, value: totalActive, color: "bg-teal-50 border-teal-100", textColor: "text-teal-700" },
          { label: "Assigned", value: totalActive - unassignedCount, color: "bg-emerald-50 border-emerald-100", textColor: "text-emerald-700" },
          { label: "Unassigned", value: unassignedCount, color: unassignedCount > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200", textColor: unassignedCount > 0 ? "text-amber-700" : "text-slate-600" },
          { label: "Active Clinicians", value: activeClinicians, color: "bg-slate-50 border-slate-200", textColor: "text-slate-700" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className={`text-3xl font-bold ${s.textColor}`}>{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <CaseloadClient
        summary={summary}
        unassignedCount={unassignedCount}
        totalActive={totalActive}
        clientTermSingular={term.singular}
        clientTermPlural={term.plural}
      />
    </div>
  );
}
