import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalAppointmentsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users").select("*").eq("clerk_user_id", user.id).single();
  if (!portalUser || !portalUser.access_settings?.appointments) redirect("/portal/dashboard");

  const today = new Date().toISOString().split("T")[0];

  const { data: upcoming } = await supabaseAdmin
    .from("appointments")
    .select("id, appointment_date, start_time, appointment_type, status, notes")
    .eq("client_id", portalUser.client_id)
    .gte("appointment_date", today)
    .order("appointment_date")
    .limit(20);

  const { data: past } = await supabaseAdmin
    .from("appointments")
    .select("id, appointment_date, start_time, appointment_type, status")
    .eq("client_id", portalUser.client_id)
    .lt("appointment_date", today)
    .order("appointment_date", { ascending: false })
    .limit(10);

  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    confirmed: { label: "Confirmed ✓", color: "bg-teal-100 text-teal-700" },
    scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700" },
    completed: { label: "Completed", color: "bg-slate-100 text-slate-500" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-500" },
    no_show: { label: "Missed", color: "bg-orange-100 text-orange-600" },
  };

  function ApptCard({ appt, showNotes = false }: { appt: Record<string, string>; showNotes?: boolean }) {
    const s = STATUS_LABEL[appt.status] || STATUS_LABEL.scheduled;
    return (
      <div className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50">
        <div className="w-14 h-14 bg-teal-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
          <div className="text-xs font-bold text-teal-600">{new Date(appt.appointment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}</div>
          <div className="text-xl font-bold text-teal-800 leading-none">{new Date(appt.appointment_date + "T12:00:00").getDate()}</div>
        </div>
        <div className="flex-1">
          <div className="font-medium text-slate-900">{appt.appointment_type || "Appointment"}</div>
          <div className="text-sm text-slate-500 mt-0.5">
            {new Date(appt.appointment_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {appt.start_time && ` · ${new Date(`2000-01-01T${appt.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
          </div>
          {showNotes && appt.notes && (
            <div className="text-xs text-slate-400 mt-1 bg-slate-50 rounded-lg px-3 py-1.5">{appt.notes}</div>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${s.color}`}>{s.label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Upcoming</h2>
        </div>
        {!upcoming?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="text-3xl mb-2">📅</div>
            <p>No upcoming appointments scheduled</p>
            <p className="text-xs mt-1">Contact your care team to schedule an appointment</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {upcoming.map(appt => <ApptCard key={appt.id} appt={appt as Record<string, string>} showNotes />)}
          </div>
        )}
      </div>

      {past && past.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Past Appointments</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {past.map(appt => <ApptCard key={appt.id} appt={appt as Record<string, string>} />)}
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-500 text-center">
        To reschedule or cancel an appointment, please contact your care team directly.
      </div>
    </div>
  );
}
