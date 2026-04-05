import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  daily_living: "Daily Living",
  communication: "Communication",
  social: "Social",
  academic: "Academic",
  vocational: "Vocational",
  self_care: "Self-Care",
  motor: "Motor",
  safety: "Safety",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  mastered: "bg-teal-100 text-teal-700",
  on_hold: "bg-amber-100 text-amber-700",
  discontinued: "bg-slate-100 text-slate-400",
};

const CATEGORY_COLORS: Record<string, string> = {
  daily_living: "bg-blue-100 text-blue-700",
  communication: "bg-violet-100 text-violet-700",
  social: "bg-pink-100 text-pink-700",
  academic: "bg-yellow-100 text-yellow-700",
  vocational: "bg-orange-100 text-orange-700",
  self_care: "bg-teal-100 text-teal-700",
  motor: "bg-green-100 text-green-700",
  safety: "bg-red-100 text-red-700",
  other: "bg-slate-100 text-slate-600",
};

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; client_id?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const params = await searchParams;
  const statusFilter = params.status || "";
  const categoryFilter = params.category || "";
  const clientFilter = params.client_id || "";

  let query = supabaseAdmin
    .from("skill_programs")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (categoryFilter) query = query.eq("category", categoryFilter);
  if (clientFilter) query = query.eq("client_id", clientFilter);

  const { data: skills } = await query;

  const active = skills?.filter(s => s.status === "active").length || 0;
  const mastered = skills?.filter(s => s.status === "mastered").length || 0;
  const onHold = skills?.filter(s => s.status === "on_hold").length || 0;

  // Unique clients
  const clientCount = new Set(skills?.map(s => s.client_id)).size;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Skill Tracking</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track skill acquisition and measure progress toward ISP goals</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/reports/skills"
            className="border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors text-sm"
          >
            📊 Progress Report
          </Link>
          <Link
            href="/dashboard/skills/new"
            className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm"
          >
            + New Skill Program
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Programs", value: active, color: "bg-emerald-50 border-emerald-100" },
          { label: "Mastered", value: mastered, color: mastered > 0 ? "bg-teal-50 border-teal-100" : "bg-slate-50 border-slate-200" },
          { label: "On Hold", value: onHold, color: onHold > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Clients Tracked", value: clientCount, color: "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status filter */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[["", "All"], ["active", "Active"], ["mastered", "Mastered"], ["on_hold", "On Hold"], ["discontinued", "Discontinued"]].map(([val, label]) => (
            <Link
              key={val}
              href={`/dashboard/skills?status=${val}${categoryFilter ? `&category=${categoryFilter}` : ""}${clientFilter ? `&client_id=${clientFilter}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Category filter */}
        <select
          defaultValue={categoryFilter}
          onChange={(e) => {
            const url = new URL(window.location.href);
            url.searchParams.set("category", e.target.value);
            window.location.href = url.toString();
          }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Skills list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!skills?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <p className="font-semibold text-slate-900 mb-1">No skill programs yet</p>
            <p className="text-slate-500 text-sm mb-4">Create skill acquisition programs linked to ISP goals</p>
            <Link
              href="/dashboard/skills/new"
              className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block"
            >
              + New Skill Program
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Skill</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Individual</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Target</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {skills.map(skill => {
                const client = Array.isArray(skill.client) ? skill.client[0] : skill.client;
                return (
                  <tr key={skill.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 text-sm">{skill.skill_name}</div>
                      {skill.description && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{skill.description}</div>
                      )}
                      <div className="text-xs text-slate-400 mt-0.5 capitalize">{skill.measurement_type?.replace(/_/g, " ")}</div>
                    </td>
                    <td className="px-4 py-4">
                      {client ? (
                        <Link href={`/dashboard/clients/${client.id}`} className="no-underline">
                          <div className="font-medium text-sm text-slate-900 hover:text-teal-600">
                            {client.last_name}, {client.first_name}
                          </div>
                          <div className="text-xs text-slate-400">MRN: {client.mrn || "—"}</div>
                        </Link>
                      ) : <span className="text-slate-400 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[skill.category] || "bg-slate-100 text-slate-600"}`}>
                        {CATEGORY_LABELS[skill.category] || skill.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {skill.measurement_type === "percent_correct" && skill.target_value != null
                        ? `${skill.target_value}% correct`
                        : skill.target_value != null
                        ? skill.target_value
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[skill.status] || STATUS_COLORS.active}`}>
                        {skill.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/skills/${skill.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
