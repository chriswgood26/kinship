import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClaimsReportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: charges } = await supabaseAdmin
    .from("charges")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .in("status", ["paid", "denied", "submitted"])
    .order("service_date", { ascending: false })
    .limit(200);

  const paid = charges?.filter(c => c.status === "paid") || [];
  const denied = charges?.filter(c => c.status === "denied") || [];
  const submitted = charges?.filter(c => c.status === "submitted") || [];

  const paidAmt = paid.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0);
  const deniedAmt = denied.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0);
  const submittedAmt = submitted.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0);
  const totalAmt = paidAmt + deniedAmt + submittedAmt;
  const payRate = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
  const denialRate = totalAmt > 0 ? Math.round((deniedAmt / totalAmt) * 100) : 0;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Claims Outcome Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">Paid vs denied claim analysis</p>
        </div>
      </div>
        <ReportActions reportTitle="Claims Outcome Report" />
      </div>

      {/* Rate cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
          <div className="text-5xl font-bold text-emerald-600">{payRate}%</div>
          <div className="text-slate-600 mt-1 font-medium">Payment Rate</div>
          <div className="text-slate-400 text-xs mt-0.5">${paidAmt.toFixed(2)} of ${totalAmt.toFixed(2)} collected</div>
        </div>
        <div className={`${denialRate > 10 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200"} border rounded-2xl p-6 text-center`}>
          <div className={`text-5xl font-bold ${denialRate > 10 ? "text-red-500" : "text-slate-700"}`}>{denialRate}%</div>
          <div className="text-slate-600 mt-1 font-medium">Denial Rate</div>
          <div className="text-slate-400 text-xs mt-0.5">${deniedAmt.toFixed(2)} in denied claims</div>
          {denialRate > 10 && <div className="text-red-500 text-xs mt-1 font-semibold">⚠️ Above 10% threshold</div>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Paid Claims", value: paid.length, amount: paidAmt, color: "bg-emerald-50 border-emerald-100" },
          { label: "Denied Claims", value: denied.length, amount: deniedAmt, color: denied.length > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "Submitted / Pending", value: submitted.length, amount: submittedAmt, color: "bg-blue-50 border-blue-100" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="text-sm font-semibold text-slate-700 mt-1">${s.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {denied.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-semibold text-red-700 mb-3">⚠️ Denied Claims — Action Required</h3>
          <div className="space-y-2">
            {denied.map(c => {
              const patient = Array.isArray(c.patient) ? c.patient[0] : c.patient;
              return (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-red-100">
                  <div>
                    <span className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</span>
                    <span className="text-slate-400 text-xs ml-2">{new Date(c.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-700">{c.cpt_code}</span>
                    <span className="font-semibold text-red-600">${Number(c.charge_amount).toFixed(2)}</span>
                    <button className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg font-medium hover:bg-red-200">Appeal</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All claims table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">All Processed Claims</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {charges?.map(c => {
            const patient = Array.isArray(c.patient) ? c.patient[0] : c.patient;
            const STATUS = { paid: "bg-emerald-100 text-emerald-700", denied: "bg-red-100 text-red-600", submitted: "bg-blue-100 text-blue-700" };
            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                <div className="flex-1">
                  <span className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</span>
                  <span className="text-slate-400 text-xs ml-2">{new Date(c.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
                <span className="font-mono text-sm font-bold text-slate-700">{c.cpt_code}</span>
                <span className="font-semibold text-sm text-slate-900">${Number(c.charge_amount).toFixed(2)}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS[c.status as keyof typeof STATUS] || "bg-slate-100 text-slate-500"}`}>{c.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
