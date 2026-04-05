import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTodayInTimezone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-teal-100 text-teal-800 border-teal-200",
  arrived: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
  no_show: "bg-orange-100 text-orange-700 border-orange-200",
};

const HOURS = Array.from({ length: 11 }, (_, i) => i + 7); // 7am–5pm

export default async function MultiProviderSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id || "34e600b3-beb0-440c-88c4-20032185e727";


  const params = await searchParams;
  const today = getTodayInTimezone("America/Los_Angeles");
  const selectedDate = params.date || today;

  const selDate = new Date(selectedDate + "T12:00:00");
  const prevDate = new Date(selDate); prevDate.setDate(selDate.getDate() - 1);
  const nextDate = new Date(selDate); nextDate.setDate(selDate.getDate() + 1);
  const dayOfWeek = selDate.getDay();
  const weekStart = new Date(selDate); weekStart.setDate(selDate.getDate() - dayOfWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  // Get all providers
  const { data: providers } = await supabaseAdmin
    .from("user_profiles")
    .select("id, clerk_user_id, first_name, last_name, title, credentials, role")
    .eq("organization_id", orgId)
    .overlaps("roles", ["clinician", "supervisor", "admin"])
    .eq("is_active", true)
    .order("last_name");

  // Get all appointments for the day
  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .eq("appointment_date", selectedDate)
    .order("start_time");

  // Group appointments by provider (using notes field as provider tag for now)
  // In production this would use a provider_id field on appointments
  const totalAppts = appointments?.length || 0;
  const confirmedAppts = appointments?.filter(a => a.status === "confirmed" || a.status === "arrived").length || 0;
  const availableSlots = (providers?.length || 0) * 8; // rough estimate

  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/scheduling" className="text-slate-400 hover:text-slate-700 text-sm">← Single View</Link>
            <h1 className="text-2xl font-bold text-slate-900">Multi-Provider Schedule</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">{formatDate(selectedDate)}</p>
        </div>
        <Link href={`/dashboard/scheduling/new?date=${selectedDate}`}
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New Appointment
        </Link>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Providers Scheduled", value: providers?.length || 0, color: "bg-slate-50 border-slate-200" },
          { label: "Total Appointments", value: totalAppts, color: "bg-blue-50 border-blue-100" },
          { label: "Confirmed / Arrived", value: confirmedAppts, color: "bg-teal-50 border-teal-100" },
          { label: "No Show / Cancelled", value: appointments?.filter(a => a.status === "no_show" || a.status === "cancelled").length || 0, color: "bg-red-50 border-red-100" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Date nav */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/scheduling/multi?date=${prevDate.toISOString().split("T")[0]}`}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">←</Link>
            <Link href={`/dashboard/scheduling/multi?date=${today}`}
              className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg">Today</Link>
            <Link href={`/dashboard/scheduling/multi?date=${nextDate.toISOString().split("T")[0]}`}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">→</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/scheduling?date=${selectedDate}&view=day`}
              className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50">Day View</Link>
            <span className="text-xs bg-[#0d1b2e] text-white px-3 py-1.5 rounded-lg font-semibold">Multi View</span>
          </div>
        </div>

        {/* Week strip */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => {
            const isSelected = day === selectedDate;
            const isToday = day === today;
            const dayAppts = appointments?.filter(() => true).length || 0; // all on selected date
            return (
              <Link key={day} href={`/dashboard/scheduling/multi?date=${day}`}
                className={`py-2 px-1 rounded-xl text-center transition-colors ${isSelected ? "bg-[#0d1b2e] text-white" : isToday ? "bg-teal-50 text-teal-600" : "hover:bg-slate-50 text-slate-600"}`}>
                <div className="text-xs font-medium">{new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div className={`text-lg font-bold ${isSelected ? "text-white" : ""}`}>{new Date(day + "T12:00:00").getDate()}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Multi-provider grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!providers || providers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No providers configured. Add staff in Admin → Users.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: `${(providers.length * 180) + 80}px` }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="w-16 px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide sticky left-0 bg-slate-50 border-r border-slate-200">Time</th>
                  {providers.map(provider => (
                    <th key={provider.id} className="px-3 py-3 text-left border-r border-slate-100 last:border-r-0" style={{ minWidth: "180px" }}>
                      <div className="font-semibold text-slate-900 text-sm">{provider.first_name} {provider.last_name}</div>
                      <div className="text-xs text-slate-400 capitalize">{provider.title || provider.role?.replace("_", " ")}</div>
                      {/* Appointment count badge */}
                      {(() => {
                        const count = appointments?.length || 0;
                        return count > 0 ? (
                          <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">{count} appts</span>
                        ) : (
                          <span className="text-xs text-slate-300">Open</span>
                        );
                      })()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => {
                  const timeLabel = new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                  const halfTimeLabel = new Date(2000, 0, 1, hour, 30).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

                  return (
                    <>
                      {/* Full hour row */}
                      <tr key={`${hour}:00`} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-xs text-slate-500 font-medium sticky left-0 bg-white border-r border-slate-200 w-16 align-top">{timeLabel}</td>
                        {providers.map(provider => {
                          const appt = appointments?.find(a => {
                            if (!a.start_time) return false;
                            const apptHour = parseInt(a.start_time.split(":")[0]);
                            const apptMin = parseInt(a.start_time.split(":")[1]);
                            return apptHour === hour && apptMin < 30;
                          });
                          const patient = appt && (Array.isArray(appt.patient) ? appt.patient[0] : appt.patient);
                          return (
                            <td key={provider.id} className="px-2 py-1.5 border-r border-slate-100 last:border-r-0 align-top" style={{ minWidth: "180px", height: "48px" }}>
                              {appt && patient ? (
                                <Link href={`/dashboard/scheduling?date=${selectedDate}&view=day`}
                                  className={`block rounded-lg border px-2 py-1.5 text-xs no-underline hover:opacity-80 transition-opacity ${STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled}`}>
                                  <div className="font-semibold truncate">{patient.last_name}, {patient.first_name}</div>
                                  <div className="opacity-70 truncate">{appt.appointment_type?.split(" ")[0]}</div>
                                </Link>
                              ) : (
                                <Link href={`/dashboard/scheduling/new?date=${selectedDate}&time=${hour}:00`}
                                  className="block h-full w-full rounded-lg border border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Half hour row */}
                      <tr key={`${hour}:30`} className="border-b border-slate-50 hover:bg-slate-50/30">
                        <td className="px-3 py-1.5 text-xs text-slate-300 sticky left-0 bg-white border-r border-slate-200 w-16 align-top">{halfTimeLabel}</td>
                        {providers.map(provider => {
                          const appt = appointments?.find(a => {
                            if (!a.start_time) return false;
                            const apptHour = parseInt(a.start_time.split(":")[0]);
                            const apptMin = parseInt(a.start_time.split(":")[1]);
                            return apptHour === hour && apptMin >= 30;
                          });
                          const patient = appt && (Array.isArray(appt.patient) ? appt.patient[0] : appt.patient);
                          return (
                            <td key={provider.id} className="px-2 py-1 border-r border-slate-50 last:border-r-0 align-top" style={{ minWidth: "180px", height: "36px" }}>
                              {appt && patient ? (
                                <Link href={`/dashboard/scheduling?date=${selectedDate}&view=day`}
                                  className={`block rounded-lg border px-2 py-1 text-xs no-underline hover:opacity-80 ${STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled}`}>
                                  <div className="font-semibold truncate">{patient.last_name}, {patient.first_name}</div>
                                </Link>
                              ) : (
                                <Link href={`/dashboard/scheduling/new?date=${selectedDate}&time=${hour}:30`}
                                  className="block h-full w-full rounded border border-dashed border-slate-100 hover:border-teal-200 hover:bg-teal-50/50 transition-colors" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <div key={status} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cls}`}>
            <span className="capitalize font-medium">{status.replace("_", " ")}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-400">
          <span>Click to schedule</span>
        </div>
      </div>
    </div>
  );
}
