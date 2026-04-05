import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SESSION_TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  group: "Group",
  phone: "Phone",
  telehealth: "Telehealth",
  text_outreach: "Text Outreach",
  community: "Community",
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  individual: "bg-teal-100 text-teal-700",
  group: "bg-violet-100 text-violet-700",
  phone: "bg-blue-100 text-blue-700",
  telehealth: "bg-sky-100 text-sky-700",
  text_outreach: "bg-amber-100 text-amber-700",
  community: "bg-emerald-100 text-emerald-700",
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

export default async function PeerSupportPage({
  searchParams,
}: { searchParams: Promise<{ client_id?: string; date?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = profile?.organization_id;
  if (!orgId) redirect("/sign-in");

  const params = await searchParams;
  const clientFilter = params.client_id || "";

  let query = supabaseAdmin
    .from("peer_support_sessions")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("session_date", { ascending: false })
    .limit(50);

  if (clientFilter) query = query.eq("client_id", clientFilter);

  const { data: sessions } = await query;

  const crisisCount = sessions?.filter(s => s.crisis_indicated).length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Peer Support Sessions</h1>
          <p className="text-slate-500 text-sm mt-0.5">CCBHC peer support documentation · H0038</p>
        </div>
        <Link
          href="/dashboard/peer-support/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm"
        >
          + New Session
        </Link>
      </div>

      {crisisCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <span className="text-sm text-red-800 font-medium">
            {crisisCount} session{crisisCount > 1 ? "s" : ""} with crisis indicated — review required
          </span>
        </div>
      )}

      {/* Summary stats */}
      {sessions && sessions.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{sessions.length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Total Sessions</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-teal-600">{sessions.filter(s => s.session_type === "individual").length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Individual</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-violet-600">{sessions.filter(s => s.session_type === "group").length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Group</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">
              {sessions.filter(s => s.supervisor_reviewed).length}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Supervisor Reviewed</div>
          </div>
        </div>
      )}

      {/* Session list */}
      {!sessions?.length ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">🤝</div>
          <p className="font-semibold text-slate-900 mb-1">No peer support sessions yet</p>
          <p className="text-slate-400 text-sm mb-4">Document CCBHC peer support services with H0038 billing</p>
          <Link
            href="/dashboard/peer-support/new"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block"
          >
            + New Session
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const client = Array.isArray(session.client) ? session.client[0] : session.client;
            return (
              <Link
                key={session.id}
                href={`/dashboard/peer-support/${session.id}`}
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
                          <span className="text-slate-400 font-normal ml-1.5 text-sm">"{client.preferred_name}"</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">MRN: {client?.mrn || "—"} · {session.billing_code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${SESSION_TYPE_COLORS[session.session_type] || "bg-slate-100 text-slate-600"}`}>
                      {SESSION_TYPE_LABELS[session.session_type] || session.session_type}
                    </span>
                    {session.engagement_level && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ENGAGEMENT_COLORS[session.engagement_level] || "bg-slate-100 text-slate-500"}`}>
                        {ENGAGEMENT_LABELS[session.engagement_level]}
                      </span>
                    )}
                    {session.crisis_indicated && (
                      <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">🚨 Crisis</span>
                    )}
                    {session.supervisor_reviewed && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">✓ Reviewed</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-600">Date: </span>
                    <span className="text-slate-900">
                      {session.session_date
                        ? new Date(session.session_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">Specialist: </span>
                    <span className="text-slate-900">{session.specialist_name}</span>
                    {session.specialist_credentials && (
                      <span className="text-slate-400"> · {session.specialist_credentials}</span>
                    )}
                  </div>
                  {session.duration_minutes && (
                    <div>
                      <span className="font-medium text-slate-600">Duration: </span>
                      <span className="text-slate-900">{session.duration_minutes} min</span>
                    </div>
                  )}
                </div>
                {session.session_summary && (
                  <div className="mt-2 text-sm text-slate-600 line-clamp-2">
                    <span className="font-medium">Summary: </span>{session.session_summary}
                  </div>
                )}
                {session.session_focus && session.session_focus.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {session.session_focus.slice(0, 4).map((focus: string) => (
                      <span key={focus} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {focus}
                      </span>
                    ))}
                    {session.session_focus.length > 4 && (
                      <span className="text-xs text-slate-400">+{session.session_focus.length - 4} more</span>
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
