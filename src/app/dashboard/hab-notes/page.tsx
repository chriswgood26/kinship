import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  in_home_hab: "In-Home Hab",
  community_hab: "Community Hab",
  day_hab: "Day Hab",
  supported_employment: "Supported Employment",
  supported_living: "Supported Living",
  respite: "Respite",
  prevocational: "Prevocational",
  other: "Other",
};

const SERVICE_TYPE_COLORS: Record<string, string> = {
  in_home_hab: "bg-teal-100 text-teal-700",
  community_hab: "bg-emerald-100 text-emerald-700",
  day_hab: "bg-sky-100 text-sky-700",
  supported_employment: "bg-violet-100 text-violet-700",
  supported_living: "bg-blue-100 text-blue-700",
  respite: "bg-amber-100 text-amber-700",
  prevocational: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-600",
};

const ENGAGEMENT_LABELS: Record<string, string> = {
  fully_engaged: "Fully Engaged",
  partially_engaged: "Partially Engaged",
  minimal_engagement: "Minimal Engagement",
  refused: "Refused",
};

const ENGAGEMENT_COLORS: Record<string, string> = {
  fully_engaged: "bg-emerald-100 text-emerald-700",
  partially_engaged: "bg-amber-100 text-amber-700",
  minimal_engagement: "bg-orange-100 text-orange-700",
  refused: "bg-red-100 text-red-600",
};

export default async function HabNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; service_type?: string; date?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const params = await searchParams;
  const clientFilter = params.client_id || "";
  const typeFilter = params.service_type || "";
  const dateFilter = params.date || "";

  let query = supabaseAdmin
    .from("hab_notes")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("service_date", { ascending: false })
    .limit(100);

  if (clientFilter) query = query.eq("client_id", clientFilter);
  if (typeFilter) query = query.eq("service_type", typeFilter);
  if (dateFilter) query = query.eq("service_date", dateFilter);

  const { data: notes } = await query;

  const safetyConcernCount = notes?.filter(n => n.safety_concern).length || 0;
  const clientCount = new Set(notes?.map(n => n.client_id)).size;
  const billableCount = notes?.filter(n => n.is_billable).length || 0;
  const reviewedCount = notes?.filter(n => n.supervisor_reviewed).length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Habilitation Notes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Structured documentation for habilitation services</p>
        </div>
        <Link
          href="/dashboard/hab-notes/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm"
        >
          + New Hab Note
        </Link>
      </div>

      {safetyConcernCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <span className="text-sm text-red-800 font-medium">
            {safetyConcernCount} note{safetyConcernCount > 1 ? "s" : ""} with safety concerns — review required
          </span>
        </div>
      )}

      {/* Summary cards */}
      {notes && notes.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Notes", value: notes.length, color: "bg-slate-50 border-slate-200" },
            { label: "Clients Served", value: clientCount, color: "bg-teal-50 border-teal-100" },
            { label: "Billable", value: billableCount, color: "bg-emerald-50 border-emerald-100" },
            { label: "Supervisor Reviewed", value: reviewedCount, color: "bg-blue-50 border-blue-100" },
          ].map(s => (
            <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
              <div className="text-3xl font-bold text-slate-900">{s.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[["", "All Types"], ...Object.entries(SERVICE_TYPE_LABELS).map(([v, l]) => [v, l])].map(([val, label]) => (
            <Link
              key={val}
              href={`/dashboard/hab-notes?service_type=${val}${clientFilter ? `&client_id=${clientFilter}` : ""}${dateFilter ? `&date=${dateFilter}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${typeFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Notes list */}
      {!notes?.length ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">🏠</div>
          <p className="font-semibold text-slate-900 mb-1">No habilitation notes yet</p>
          <p className="text-slate-400 text-sm mb-4">Document in-home, community, and day habilitation services with structured progress notes</p>
          <Link
            href="/dashboard/hab-notes/new"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block"
          >
            + New Hab Note
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => {
            const client = Array.isArray(note.client) ? note.client[0] : note.client;
            return (
              <Link
                key={note.id}
                href={`/dashboard/hab-notes/${note.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-teal-300 hover:shadow-sm transition-all no-underline block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                      {client?.first_name?.[0]}{client?.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {client ? `${client.last_name}, ${client.first_name}` : "—"}
                        {client?.preferred_name && (
                          <span className="text-slate-400 font-normal ml-1.5 text-sm">&ldquo;{client.preferred_name}&rdquo;</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">MRN: {client?.mrn || "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${SERVICE_TYPE_COLORS[note.service_type] || "bg-slate-100 text-slate-600"}`}>
                      {SERVICE_TYPE_LABELS[note.service_type] || note.service_type}
                    </span>
                    {note.engagement_level && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ENGAGEMENT_COLORS[note.engagement_level] || "bg-slate-100 text-slate-500"}`}>
                        {ENGAGEMENT_LABELS[note.engagement_level]}
                      </span>
                    )}
                    {note.safety_concern && (
                      <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">🚨 Safety</span>
                    )}
                    {note.supervisor_reviewed && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">✓ Reviewed</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-600">Date: </span>
                    <span className="text-slate-900">
                      {note.service_date
                        ? new Date(note.service_date + "T12:00:00").toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">Staff: </span>
                    <span className="text-slate-900">{note.staff_name}</span>
                    {note.staff_credentials && (
                      <span className="text-slate-400"> · {note.staff_credentials}</span>
                    )}
                  </div>
                  {note.duration_minutes != null && (
                    <div>
                      <span className="font-medium text-slate-600">Duration: </span>
                      <span className="text-slate-900">{note.duration_minutes} min</span>
                    </div>
                  )}
                </div>
                {note.service_summary && (
                  <div className="mt-2 text-sm text-slate-600 line-clamp-2">
                    <span className="font-medium">Summary: </span>{note.service_summary}
                  </div>
                )}
                {note.skill_areas && note.skill_areas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {note.skill_areas.slice(0, 4).map((area: string) => (
                      <span key={area} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {area}
                      </span>
                    ))}
                    {note.skill_areas.length > 4 && (
                      <span className="text-xs text-slate-400">+{note.skill_areas.length - 4} more</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
