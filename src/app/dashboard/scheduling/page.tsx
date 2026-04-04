import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasFeature } from "@/lib/plans";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-teal-100 text-teal-700",
  arrived: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-100 text-red-600",
  no_show: "bg-orange-100 text-orange-700",
};

export default async function SchedulingPage({
  searchParams,
}: { searchParams: Promise<{ date?: string; provider?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", user.id).single();
  const orgId = profile?.organization_id;

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const selectedDate = params.date || today;
  const filterProvider = params.provider || "";

  const selDate = new Date(selectedDate + "T12:00:00");
  const dayOfWeek = selDate.getDay();
  const weekStart = new Date(selDate);
  weekStart.setDate(selDate.getDate() - dayOfWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    return d.toISOString().split("T")[0];
  });
  const prevDate = new Date(selDate); prevDate.setDate(selDate.getDate() - 1);
  const nextDate = new Date(selDate); nextDate.setDate(selDate.getDate() + 1);

  let query = supabaseAdmin
    .from("appointments")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name), provider:provider_id(first_name, last_name, title)")
    .eq("organization_id", orgId || "")
    .eq("appointment_date", selectedDate)
    .order("start_time");
  if (filterProvider) query = query.eq("provider_id", filterProvider);
  const { data: appointments } = await query;

  // Providers for filter
  const { data: providers } = await supabaseAdmin
    .from("user_profiles")
    .select("id, first_name, last_name, title, role")
    .eq("organization_id", orgId || "")
    .in("role", ["clinician", "supervisor", "admin"])
    .order("last_name");

  const { data: org } = await supabaseAdmin.from("organizations").select("plan, addons").eq("id", orgId || "").single();

  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Quick stats
  const totalCount = appointments?.length || 0;
  const confirmedCount = appointments?.filter(a => a.status === "confirmed" || a.status === "arrived").length || 0;
  const providerOnlyCount = appointments?.filter(a => a.is_provider_only).length || 0;
  const recurringCount = appointments?.filter(a => a.is_recurring_instance || a.recurrence_rule).length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scheduling</h1>
          <p className="text-slate-500 text-sm mt-0.5">{formatDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Calendar Export */}
          <a href="/api/calendar?days=90&format=ics" download="kinship-schedule.ics"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            title="Export to Google/Outlook/Apple Calendar">
            📅 Export iCal
          </a>
          <Link href="/dashboard/scheduling/front-office"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            🏥 Front Office
          </Link>
          <Link href={`/dashboard/scheduling/multi?date=${selectedDate}`}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            👥 Multi-Provider
          </Link>
          <Link href={`/dashboard/scheduling/new?date=${selectedDate}`}
            className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
            + New Appointment
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      {totalCount > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Scheduled", value: totalCount, icon: "📅", color: "bg-blue-50 border-blue-100" },
            { label: "Confirmed / Arrived", value: confirmedCount, icon: "✅", color: "bg-teal-50 border-teal-100" },
            { label: "Provider Blocks", value: providerOnlyCount, icon: "🗓", color: "bg-slate-50 border-slate-200" },
            { label: "Recurring", value: recurringCount, icon: "🔁", color: "bg-purple-50 border-purple-100" },
          ].map(s => (
            <div key={s.label} className={`${s.color} border rounded-2xl p-3`}>
              <div className="text-xl font-bold text-slate-900">{s.icon} {s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar nav */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/scheduling?date=${prevDate.toISOString().split("T")[0]}`} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">←</Link>
            <Link href={`/dashboard/scheduling?date=${today}`} className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg">Today</Link>
            <Link href={`/dashboard/scheduling?date=${nextDate.toISOString().split("T")[0]}`} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">→</Link>
          </div>
          {/* Provider filter */}
          {providers && providers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter:</span>
              <Link href={`/dashboard/scheduling?date=${selectedDate}`}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${!filterProvider ? "bg-teal-500 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                All
              </Link>
              {providers.map(p => (
                <Link key={p.id} href={`/dashboard/scheduling?date=${selectedDate}&provider=${p.id}`}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${filterProvider === p.id ? "bg-teal-500 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {p.first_name} {p.last_name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => {
            const isSelected = day === selectedDate;
            const isToday = day === today;
            return (
              <Link key={day} href={`/dashboard/scheduling?date=${day}${filterProvider ? `&provider=${filterProvider}` : ""}`}
                className={`py-2 px-1 rounded-xl text-center transition-colors ${isSelected ? "bg-teal-500 text-white" : isToday ? "bg-teal-50 text-teal-600" : "hover:bg-slate-50 text-slate-600"}`}>
                <div className="text-xs font-medium">{new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div className={`text-lg font-bold ${isSelected ? "text-white" : ""}`}>{new Date(day + "T12:00:00").getDate()}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Appointments */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!appointments?.length ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm">No appointments scheduled</p>
            <Link href={`/dashboard/scheduling/new?date=${selectedDate}`} className="mt-3 text-xs text-teal-600 font-medium hover:text-teal-700">+ Schedule appointment →</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            <div className="px-5 py-3 bg-slate-50 grid grid-cols-6 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Time</span><span className="col-span-2">Client / Event</span><span>Type</span><span>Status</span><span>Actions</span>
            </div>
            {appointments.map(appt => {
              const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
              const provider = Array.isArray(appt.provider) ? appt.provider[0] : appt.provider;
              const isTelehealth = appt.is_telehealth || appt.appointment_type?.toLowerCase().includes("telehealth");
              const telehealthEnabled = hasFeature(org?.plan, "telehealth", org?.addons ?? []);
              return (
                <div key={appt.id} className={`grid grid-cols-6 gap-4 px-5 py-4 items-center hover:bg-slate-50 transition-colors ${appt.is_provider_only ? "bg-slate-50/60" : ""}`}>
                  <div className="text-sm font-semibold text-slate-900">
                    {appt.start_time ? new Date(`2000-01-01T${appt.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
                    {appt.is_recurring_instance && <span className="ml-1 text-[10px] text-purple-500" title="Recurring">🔁</span>}
                  </div>
                  <div className="col-span-2">
                    {appt.is_provider_only ? (
                      <div>
                        <div className="font-semibold text-slate-600 text-sm flex items-center gap-1.5">
                          <span>🗓</span>{appt.appointment_type || "Block"}
                        </div>
                        {provider && <div className="text-xs text-slate-400">{provider.first_name} {provider.last_name}</div>}
                      </div>
                    ) : (
                      <div>
                        {client ? (
                          <Link href={`/dashboard/clients/${appt.client_id}`} className="font-semibold text-slate-900 text-sm hover:text-teal-600 no-underline">
                            {client.last_name}, {client.first_name}
                          </Link>
                        ) : <span className="text-slate-400 text-sm">—</span>}
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          {client?.mrn && <span>MRN: {client.mrn}</span>}
                          {provider && <span>· {provider.first_name} {provider.last_name}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 capitalize flex items-center gap-1">
                    {isTelehealth && <span title="Telehealth">🎥</span>}
                    {appt.appointment_type || "—"}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize w-fit ${STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled}`}>{appt.status}</span>
                  <div>
                    {isTelehealth && !appt.is_provider_only && telehealthEnabled && appt.status !== "completed" && appt.status !== "cancelled" ? (
                      <Link href={`/dashboard/telehealth/${appt.id}`}
                        className="text-xs bg-teal-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-teal-400 transition-colors inline-flex items-center gap-1">
                        🎥 Join
                      </Link>
                    ) : isTelehealth && !telehealthEnabled ? (
                      <span className="text-xs text-slate-400">Upgrade →</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar sync info */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-xl">📅</span>
        <div>
          <div className="font-semibold text-blue-900 text-sm">Sync with your calendar</div>
          <p className="text-xs text-blue-700 mt-0.5">
            Export your schedule as an iCal (.ics) file to import into{" "}
            <strong>Google Calendar</strong>, <strong>Outlook</strong>, or <strong>Apple Calendar</strong>.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <a href="/api/calendar?days=90&format=ics" download="kinship-schedule.ics"
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              ⬇ Download .ics (90 days)
            </a>
            <a href="/api/calendar?days=30&format=ics" download="kinship-schedule.ics"
              className="text-xs border border-blue-300 text-blue-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 transition-colors">
              30 days
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
