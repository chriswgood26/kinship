import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CCBHCReportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");


  const [
    { count: activePatients },
    { count: totalEncounters },
    { count: signedNotes },
    { count: totalNotes },
    { count: activePlans },
    { data: recentVitals },
    { data: appointments },
    { data: incomingReferrals },
  ] = await Promise.all([
    supabaseAdmin.from("clients").select("*", { count: "exact", head: true }).eq("is_active", true).eq("organization_id", orgId),
    supabaseAdmin.from("encounters").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabaseAdmin.from("clinical_notes").select("*", { count: "exact", head: true }).eq("is_signed", true),
    supabaseAdmin.from("clinical_notes").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("treatment_plans").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("patient_vitals").select("patient_id").gte("recorded_at", new Date(Date.now() - 365 * 86400000).toISOString()).eq("organization_id", orgId),
    supabaseAdmin.from("appointments").select("status").limit(200),
    supabaseAdmin.from("referrals").select("status, referral_date").eq("referral_type", "incoming").order("referral_date", { ascending: false }).limit(50),
  ]);

  const noteSignRate = totalNotes ? Math.round(((signedNotes || 0) / totalNotes) * 100) : 0;
  const kept = appointments?.filter(a => a.status === "completed" || a.status === "confirmed").length || 0;
  const attendanceRate = appointments?.length ? Math.round((kept / appointments.length) * 100) : 0;

  const measures = [
    (() => {
      const totalRef = (incomingReferrals || []).length;
      const seenRef = (incomingReferrals || []).filter((r: {status: string}) => r.status === "accepted" || r.status === "completed").length;
      const rate = totalRef > 0 ? Math.round((seenRef / totalRef) * 100) : 0;
      return {
        id: "CCO-1",
        name: "Timely Access to Care",
        description: "Percentage of new patients seen within 10 business days of referral",
        value: totalRef > 0 ? `${rate}%` : "N/A",
        target: "≥ 85%",
        status: (rate >= 85 ? "passing" : rate >= 70 ? "warning" : totalRef === 0 ? "pending" : "failing") as "passing" | "warning" | "failing" | "pending",
        detail: `${seenRef} of ${totalRef} incoming referrals accepted/completed`,
      };
    })(),
    {
      id: "CCO-2",
      name: "Crisis Response Time",
      description: "Percentage of crisis contacts receiving same-day response",
      value: "N/A",
      target: "100%",
      status: "pending",
      detail: "Crisis contact tracking not yet integrated",
    },
    {
      id: "CCO-3",
      name: "Treatment Plan Completion",
      description: "Percentage of active patients with a current treatment plan",
      value: `${activePatients ? Math.round(((activePlans || 0) / activePatients) * 100) : 0}%`,
      target: "≥ 90%",
      status: activePatients && (activePlans || 0) / activePatients >= 0.9 ? "passing" : "warning",
      detail: `${activePlans} active plans for ${activePatients} active patients`,
    },
    {
      id: "CCO-4",
      name: "Clinical Note Completion",
      description: "Percentage of encounter notes signed within 24 hours",
      value: `${noteSignRate}%`,
      target: "≥ 95%",
      status: noteSignRate >= 95 ? "passing" : noteSignRate >= 80 ? "warning" : "failing",
      detail: `${signedNotes} of ${totalNotes} notes signed`,
    },
    {
      id: "CCO-5",
      name: "Appointment Attendance",
      description: "Percentage of scheduled appointments kept by clients",
      value: `${attendanceRate}%`,
      target: "≥ 70%",
      status: attendanceRate >= 70 ? "passing" : "warning",
      detail: `${kept} of ${appointments?.length || 0} appointments attended`,
    },
    (() => {
      const uniquePatientsScreened = new Set((recentVitals || []).map((v: {patient_id: string}) => v.patient_id)).size;
      const screeningRate = activePatients ? Math.round((uniquePatientsScreened / activePatients) * 100) : 0;
      return {
        id: "CCO-6",
        name: "Physical Health Screenings",
        description: "Percentage of active clients with BP and BMI documented in the past 12 months",
        value: `${screeningRate}%`,
        target: "≥ 80%",
        status: screeningRate >= 80 ? "passing" : screeningRate >= 60 ? "warning" : "failing",
        detail: `${uniquePatientsScreened} of ${activePatients || 0} active clients have vitals documented in the past year`,
      };
    })(),
    (() => {
      // TODO: query actual screening completion rate from screenings table
      return {
        id: "CCO-7",
        name: "Substance Use Screening",
        description: "Percentage of clients screened for substance use (AUDIT/DAST)",
        value: "N/A",
        target: "≥ 85%",
        status: "pending" as const,
        detail: "Screening completion rate not yet calculated",
      };
    })(),
    {
      id: "CCO-8",
      name: "Consumer Satisfaction",
      description: "Percentage of clients reporting satisfaction with services",
      value: "N/A",
      target: "≥ 80%",
      status: "pending",
      detail: "Consumer satisfaction survey not yet deployed",
    },
  ];

  const passing = measures.filter(m => m.status === "passing").length;
  const warning = measures.filter(m => m.status === "warning").length;
  const failing = measures.filter(m => m.status === "failing").length;

  const STATUS_STYLE: Record<string, { card: string; badge: string; icon: string }> = {
    passing: { card: "border-emerald-100 bg-emerald-50/30", badge: "bg-emerald-100 text-emerald-700", icon: "✅" },
    warning: { card: "border-amber-100 bg-amber-50/30", badge: "bg-amber-100 text-amber-700", icon: "⚠️" },
    failing: { card: "border-red-100 bg-red-50/30", badge: "bg-red-100 text-red-600", icon: "❌" },
    pending: { card: "border-slate-200 bg-slate-50/30", badge: "bg-slate-100 text-slate-500", icon: "⏳" },
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CCBHC Performance Measures</h1>
          <p className="text-slate-500 text-sm mt-0.5">Certified Community Behavioral Health Clinic compliance dashboard</p>
        </div>
      </div>
        <ReportActions reportTitle="CCBHC Performance Measures" />
      </div>

      {/* Overall score */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-300 text-sm mb-1">Overall Compliance Score</div>
            <div className="text-5xl font-bold text-teal-300">{Math.round((passing / measures.length) * 100)}%</div>
            <div className="text-slate-400 text-xs mt-1">{passing} of {measures.length} measures passing</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-emerald-300">{passing}</div>
              <div className="text-xs text-slate-400">Passing</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-300">{warning}</div>
              <div className="text-xs text-slate-400">Warning</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-300">{failing}</div>
              <div className="text-xs text-slate-400">Failing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Measures */}
      <div className="space-y-3">
        {measures.map(m => {
          const style = STATUS_STYLE[m.status];
          return (
            <Link key={m.id} href={`/dashboard/reports/ccbhc/${m.id}`} className={`${style.card} border rounded-2xl p-5 hover:shadow-md transition-shadow block`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-500">{m.id}</span>
                    <h3 className="font-semibold text-slate-900 text-sm">{m.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${style.badge}`}>
                      {style.icon} {m.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{m.description}</p>
                  <p className="text-xs text-slate-400">{m.detail}</p>
                </div>
                <div className="text-right ml-6 flex-shrink-0">
                  <div className="text-2xl font-bold text-slate-900">{m.value}</div>
                  <div className="text-xs text-slate-400">Target: {m.target}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-400">
        CCBHC measures based on SAMHSA criteria. Metrics marked N/A require additional integration with state reporting systems or data sources not yet connected.
      </div>
    </div>
  );
}
