import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AttendanceReportPage({
  searchParams,
}: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const from = params.from || thirtyDaysAgo;
  const to = params.to || today;

  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .order("appointment_date", { ascending: false })
    .limit(200);

  const kept = appointments?.filter(a => a.status === "completed" || a.status === "confirmed").length || 0;
  const noShow = appointments?.filter(a => a.status === "no_show").length || 0;
  const cancelled = appointments?.filter(a => a.status === "cancelled").length || 0;
  const total = appointments?.length || 0;
  const attendanceRate = total > 0 ? Math.round((kept / total) * 100) : 0;

  const STATUS_COLORS: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    confirmed: "bg-blue-100 text-blue-700",
    scheduled: "bg-slate-100 text-slate-600",
    no_show: "bg-red-100 text-red-600",
    cancelled: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">No-show and cancellation tracking</p>
        </div>
      </div>
        <ReportActions reportTitle="Attendance Report" />
      </div>

      <form method="GET" className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From</label>
          <input type="date" name="from" defaultValue={from} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To</label>
          <input type="date" name="to" defaultValue={to} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button type="submit" className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">Apply</button>
      </form>

      {/* Attendance rate hero */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6 text-white text-center">
        <div className="text-6xl font-bold text-teal-300">{attendanceRate}%</div>
        <div className="text-slate-300 mt-1">Attendance Rate</div>
        <div className="text-slate-400 text-xs mt-0.5">{from} to {to}</div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Appointments", value: total, color: "bg-slate-50 border-slate-200" },
          { label: "Kept", value: kept, color: "bg-emerald-50 border-emerald-100" },
          { label: "No-Show", value: noShow, color: noShow > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "Cancelled", value: cancelled, color: cancelled > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-4 gap-4">
          <span>Patient</span><span>Date</span><span>Type</span><span>Status</span>
        </div>
        {!appointments?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No appointments in this range</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {appointments.map(appt => {
              const patient = Array.isArray(appt.patient) ? appt.patient[0] : appt.patient;
              return (
                <div key={appt.id} className="grid grid-cols-4 gap-4 px-5 py-3.5 items-center hover:bg-slate-50">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
                    <div className="text-xs text-slate-400">{patient?.mrn}</div>
                  </div>
                  <div className="text-sm text-slate-600">{new Date(appt.appointment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  <div className="text-sm text-slate-600 capitalize">{appt.appointment_type || "—"}</div>
                  <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[appt.status] || "bg-slate-100 text-slate-500"}`}>{appt.status?.replace("_", " ")}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
