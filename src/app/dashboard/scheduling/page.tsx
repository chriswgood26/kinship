import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

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
}: { searchParams: Promise<{ date?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", user.id).single();
  const orgId = profile?.organization_id;

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const selectedDate = params.date || today;

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

  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId || "")
    .eq("appointment_date", selectedDate)
    .order("start_time");

  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scheduling</h1>
          <p className="text-slate-500 text-sm mt-0.5">{formatDate(selectedDate)}</p>
        </div>
        <Link href={`/dashboard/scheduling/new?date=${selectedDate}`}
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New Appointment
        </Link>
      </div>

      {/* Calendar nav */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/scheduling?date=${prevDate.toISOString().split("T")[0]}`} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">←</Link>
            <Link href={`/dashboard/scheduling?date=${today}`} className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg">Today</Link>
            <Link href={`/dashboard/scheduling?date=${nextDate.toISOString().split("T")[0]}`} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">→</Link>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => {
            const isSelected = day === selectedDate;
            const isToday = day === today;
            return (
              <Link key={day} href={`/dashboard/scheduling?date=${day}`}
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
            <div className="px-5 py-3 bg-slate-50 grid grid-cols-5 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Time</span><span className="col-span-2">Client</span><span>Type</span><span>Status</span>
            </div>
            {appointments.map(appt => {
              const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
              return (
                <div key={appt.id} className="grid grid-cols-5 gap-4 px-5 py-4 items-center hover:bg-slate-50 transition-colors">
                  <div className="text-sm font-semibold text-slate-900">
                    {appt.start_time ? new Date(`2000-01-01T${appt.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
                  </div>
                  <div className="col-span-2">
                    <Link href={`/dashboard/clients/${appt.client_id}`} className="font-semibold text-slate-900 text-sm hover:text-teal-600 no-underline">
                      {client ? `${client.last_name}, ${client.first_name}` : "—"}
                    </Link>
                    <div className="text-xs text-slate-400">{client?.mrn || "—"}</div>
                  </div>
                  <div className="text-sm text-slate-600 capitalize">{appt.appointment_type || "—"}</div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize w-fit ${STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled}`}>{appt.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
