import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

const FUNCTION_LABELS: Record<string, string> = {
  attention: "Attention",
  escape: "Escape/Avoidance",
  tangible: "Tangible",
  sensory: "Sensory (Auto)",
  unknown: "Unknown",
  multiple: "Multiple",
};

const TYPE_COLORS: Record<string, string> = {
  target: "bg-red-100 text-red-700",
  replacement: "bg-emerald-100 text-emerald-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  reduced: "bg-teal-100 text-teal-700",
  eliminated: "bg-violet-100 text-violet-700",
  on_hold: "bg-amber-100 text-amber-700",
  discontinued: "bg-slate-100 text-slate-400",
};

const MEASUREMENT_LABELS: Record<string, string> = {
  frequency: "Frequency",
  rate: "Rate",
  duration: "Duration",
  interval: "Interval",
  abc_only: "ABC Narrative",
};

export default async function ABAPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; behavior_type?: string; client_id?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const params = await searchParams;
  const statusFilter = params.status || "";
  const typeFilter = params.behavior_type || "";
  const clientFilter = params.client_id || "";

  let query = supabaseAdmin
    .from("behavior_programs")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (typeFilter) query = query.eq("behavior_type", typeFilter);
  if (clientFilter) query = query.eq("client_id", clientFilter);

  const { data: programs } = await query;

  const active = programs?.filter(p => p.status === "active").length || 0;
  const reduced = programs?.filter(p => p.status === "reduced").length || 0;
  const eliminated = programs?.filter(p => p.status === "eliminated").length || 0;
  const clientCount = new Set(programs?.map(p => p.client_id)).size;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Behavior Tracking (ABA)</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Applied Behavior Analysis — track target behaviors, collect ABC data, and measure intervention outcomes
          </p>
        </div>
        <Link
          href="/dashboard/aba/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm"
        >
          + New Behavior Program
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Programs", value: active, color: "bg-emerald-50 border-emerald-100" },
          { label: "Reduced", value: reduced, color: reduced > 0 ? "bg-teal-50 border-teal-100" : "bg-slate-50 border-slate-200" },
          { label: "Eliminated", value: eliminated, color: eliminated > 0 ? "bg-violet-50 border-violet-100" : "bg-slate-50 border-slate-200" },
          { label: "Individuals", value: clientCount, color: "bg-slate-50 border-slate-200" },
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
          {[
            ["", "All"],
            ["active", "Active"],
            ["reduced", "Reduced"],
            ["eliminated", "Eliminated"],
            ["on_hold", "On Hold"],
            ["discontinued", "Discontinued"],
          ].map(([val, label]) => (
            <Link
              key={val}
              href={`/dashboard/aba?status=${val}${typeFilter ? `&behavior_type=${typeFilter}` : ""}${clientFilter ? `&client_id=${clientFilter}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Behavior type filter */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[
            ["", "All Types"],
            ["target", "Target (Reduce)"],
            ["replacement", "Replacement (Increase)"],
          ].map(([val, label]) => (
            <Link
              key={val}
              href={`/dashboard/aba?${statusFilter ? `status=${statusFilter}&` : ""}behavior_type=${val}${clientFilter ? `&client_id=${clientFilter}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${typeFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Programs list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!programs?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🧠</div>
            <p className="font-semibold text-slate-900 mb-1">No behavior programs yet</p>
            <p className="text-slate-500 text-sm mb-4">
              Create behavior programs to track target behaviors and collect ABC data
            </p>
            <Link
              href="/dashboard/aba/new"
              className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block"
            >
              + New Behavior Program
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Behavior</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Individual</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Function</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Measurement</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {programs.map(program => {
                const client = Array.isArray(program.client) ? program.client[0] : program.client;
                return (
                  <tr key={program.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 text-sm">{program.behavior_name}</div>
                      {program.operational_definition && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{program.operational_definition}</div>
                      )}
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
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[program.behavior_type] || "bg-slate-100 text-slate-600"}`}>
                        {program.behavior_type === "target" ? "↓ Target" : "↑ Replacement"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {program.behavior_function ? FUNCTION_LABELS[program.behavior_function] || program.behavior_function : "—"}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {MEASUREMENT_LABELS[program.measurement_type] || program.measurement_type}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[program.status] || STATUS_COLORS.active}`}>
                        {program.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/aba/${program.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">
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
