import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasFeature } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function TelehealthDashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = profile?.organization_id;

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("plan, addons")
    .eq("id", orgId || "")
    .single();

  const telehealthEnabled = hasFeature(org?.plan, "telehealth", org?.addons ?? []);

  const today = new Date().toISOString().split("T")[0];

  // Upcoming telehealth appointments
  const { data: upcomingAppts } = await supabaseAdmin
    .from("appointments")
    .select("*, client:client_id(first_name, last_name, preferred_name, mrn)")
    .eq("organization_id", orgId || "")
    .eq("is_telehealth", true)
    .gte("appointment_date", today)
    .not("status", "in", '("completed","cancelled")')
    .order("appointment_date")
    .order("start_time")
    .limit(10);

  // Recent telehealth sessions
  const { data: recentAppts } = await supabaseAdmin
    .from("appointments")
    .select("*, client:client_id(first_name, last_name, preferred_name, mrn)")
    .eq("organization_id", orgId || "")
    .eq("is_telehealth", true)
    .eq("status", "completed")
    .order("appointment_date", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Telehealth</h1>
          <p className="text-slate-500 text-sm mt-0.5">Embedded video sessions with Zoom, Webex, or Kinship Video</p>
        </div>
        <Link href="/dashboard/scheduling/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + Schedule Telehealth
        </Link>
      </div>

      {!telehealthEnabled ? (
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-200 rounded-2xl p-8 text-center space-y-4">
          <div className="text-5xl">🎥</div>
          <h2 className="text-xl font-bold text-slate-900">Telehealth Available on Growth Plan</h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Upgrade to Growth or higher to enable embedded video sessions with Zoom, Webex, or Kinship Video (Jitsi).
            HIPAA-compliant, no extra software required.
          </p>
          <Link href="/dashboard/admin/settings"
            className="inline-block bg-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-400 transition-colors">
            Upgrade Plan →
          </Link>
        </div>
      ) : (
        <>
          {/* Platform cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { platform: "jitsi", icon: "🎬", name: "Kinship Video", desc: "Free, encrypted video via Jitsi Meet. No account needed — works out of the box.", badge: "Default", badgeColor: "bg-teal-100 text-teal-700" },
              { platform: "zoom", icon: "🎥", name: "Zoom", desc: "Connect your Zoom account via Server-to-Server OAuth. Requires Zoom API credentials.", badge: "Requires setup", badgeColor: "bg-slate-100 text-slate-500" },
              { platform: "webex", icon: "📡", name: "Webex", desc: "Use Cisco Webex meetings. Requires a Webex access token in admin settings.", badge: "Requires setup", badgeColor: "bg-slate-100 text-slate-500" },
            ].map(p => (
              <div key={p.platform} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{p.icon}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.badgeColor}`}>{p.badge}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Upcoming sessions */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm">Upcoming Sessions</h2>
              <Link href="/dashboard/scheduling" className="text-xs text-teal-600 hover:text-teal-700 font-medium">View schedule →</Link>
            </div>
            {!upcomingAppts?.length ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <p className="text-sm">No upcoming telehealth sessions</p>
                <Link href="/dashboard/scheduling/new" className="mt-2 text-xs text-teal-600 font-medium">+ Schedule one →</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {upcomingAppts.map(appt => {
                  const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
                  const apptDate = new Date(appt.appointment_date + "T12:00:00");
                  const isToday = appt.appointment_date === today;
                  return (
                    <div key={appt.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[48px]">
                          <div className="text-xs text-slate-400">{apptDate.toLocaleDateString("en-US", { weekday: "short" })}</div>
                          <div className={`text-lg font-bold ${isToday ? "text-teal-600" : "text-slate-700"}`}>{apptDate.getDate()}</div>
                          {isToday && <div className="text-[10px] text-teal-500 font-semibold">Today</div>}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {client ? `${client.last_name}, ${client.first_name}` : "—"}
                            {client?.preferred_name && <span className="text-slate-400 font-normal ml-1.5 text-xs">"{client.preferred_name}"</span>}
                          </p>
                          <p className="text-xs text-slate-400">
                            {appt.start_time && new Date(`2000-01-01T${appt.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            {" · "}{appt.duration_minutes || 60} min
                            {" · "}{appt.appointment_type || "Telehealth"}
                            {appt.telehealth_platform && <span className="ml-1 capitalize">({appt.telehealth_platform === "jitsi" ? "Kinship Video" : appt.telehealth_platform})</span>}
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/telehealth/${appt.id}`}
                        className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1 ${isToday ? "bg-teal-500 text-white hover:bg-teal-400" : "border border-teal-300 text-teal-600 hover:bg-teal-50"}`}>
                        🎥 {isToday ? "Join Now" : "Prepare"}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          {(recentAppts?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 text-sm">Recent Completed Sessions</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {recentAppts!.map(appt => {
                  const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
                  return (
                    <div key={appt.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{client ? `${client.last_name}, ${client.first_name}` : "—"}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(appt.appointment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" · "}{appt.appointment_type || "Telehealth"}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Completed</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
