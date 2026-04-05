import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  declined: "bg-red-100 text-red-600",
  cancelled: "bg-slate-100 text-slate-500",
};

const TYPE_COLORS: Record<string, string> = {
  outgoing: "bg-purple-100 text-purple-700",
  incoming: "bg-teal-100 text-teal-700",
  internal: "bg-blue-100 text-blue-700",
};

export default async function ReferralsReportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: referrals } = await supabaseAdmin
    .from("referrals")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .order("referral_date", { ascending: false })
    .limit(100);

  const incoming = referrals?.filter(r => r.referral_type === "incoming") || [];
  const outgoing = referrals?.filter(r => r.referral_type === "outgoing") || [];
  const internal = referrals?.filter(r => r.referral_type === "internal") || [];
  const pending = referrals?.filter(r => r.status === "pending") || [];

  const avgDays = referrals?.filter(r => r.status === "completed" && r.due_date)
    .map(r => Math.abs(new Date(r.due_date).getTime() - new Date(r.referral_date).getTime()) / 86400000)
    .reduce((s, d, _, arr) => s + d / arr.length, 0) || 0;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Referral Summary</h1>
          <p className="text-slate-500 text-sm mt-0.5">Incoming, outgoing, and internal referral tracking</p>
        </div>
      </div>
        <ReportActions reportTitle="Referral Summary Report" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Incoming", value: incoming.length, color: "bg-teal-50 border-teal-100" },
          { label: "Outgoing", value: outgoing.length, color: "bg-purple-50 border-purple-100" },
          { label: "Internal", value: internal.length, color: "bg-blue-50 border-blue-100" },
          { label: "Pending Action", value: pending.length, color: pending.length > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-800 mb-3">⏳ Pending Referrals</h3>
          <div className="space-y-2">
            {pending.map(r => {
              const patient = Array.isArray(r.patient) ? r.patient[0] : r.patient;
              const daysOld = Math.round((Date.now() - new Date(r.referral_date).getTime()) / 86400000);
              return (
                <div key={r.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                  <div>
                    <span className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</span>
                    <span className={`text-xs ml-2 px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[r.referral_type] || ""}`}>{r.referral_type}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-600">{r.referred_to || r.referred_by || "—"}</div>
                    <div className={`text-xs font-semibold ${daysOld > 7 ? "text-red-500" : "text-amber-600"}`}>{daysOld}d old</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-5 gap-4">
          <span>Patient</span><span>Type</span><span>Referred To/By</span><span>Reason</span><span>Status</span>
        </div>
        {!referrals?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No referrals recorded</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {referrals.map(r => {
              const patient = Array.isArray(r.patient) ? r.patient[0] : r.patient;
              return (
                <div key={r.id} className="grid grid-cols-5 gap-4 px-5 py-3.5 items-center hover:bg-slate-50">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
                    <div className="text-xs text-slate-400">{new Date(r.referral_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </div>
                  <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[r.referral_type] || ""}`}>{r.referral_type}</span></div>
                  <div className="text-xs text-slate-600 truncate">{r.referral_type === "incoming" ? r.referred_by : r.referred_to || "—"}</div>
                  <div className="text-xs text-slate-500 truncate">{r.reason || "—"}</div>
                  <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[r.status] || ""}`}>{r.status}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
