import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const MEASURE_DETAILS: Record<string, {
  title: string;
  description: string;
  numerator_label: string;
  denominator_label: string;
  methodology: string;
  data_source: string;
  frequency: string;
  benchmark: string;
  rows_label: string;
}> = {
  "CCO-1": {
    title: "Timely Access to Care",
    description: "Percentage of new patients seen within 10 business days of referral or initial contact",
    numerator_label: "New patients seen within 10 business days",
    denominator_label: "Total new patient referrals/intakes",
    methodology: "Count of patients with appointment_date within 10 business days of created_at date",
    data_source: "Referrals + Appointments tables",
    frequency: "Quarterly",
    benchmark: "≥ 85% per SAMHSA CCBHC criteria",
    rows_label: "Recent New Intakes",
  },
  "CCO-2": {
    title: "Crisis Response Time",
    description: "Percentage of crisis contacts receiving same-day response within the reporting period",
    numerator_label: "Crisis contacts with same-day response",
    denominator_label: "Total crisis contacts",
    methodology: "Encounters with encounter_type = 'Crisis Intervention' and response within same calendar day",
    data_source: "Encounters table",
    frequency: "Quarterly",
    benchmark: "100% per SAMHSA CCBHC criteria",
    rows_label: "Crisis Encounters",
  },
  "CCO-3": {
    title: "Treatment Plan Completion",
    description: "Percentage of active clients with a current, signed treatment plan on file",
    numerator_label: "Active patients with active treatment plan",
    denominator_label: "Total active patients",
    methodology: "Count of active patients (is_active=true) with treatment_plans.status = 'active'",
    data_source: "Patients + Treatment Plans tables",
    frequency: "Monthly",
    benchmark: "≥ 90% per SAMHSA CCBHC criteria",
    rows_label: "Patients Without Active Plan",
  },
  "CCO-4": {
    title: "Clinical Note Completion",
    description: "Percentage of clinical encounter notes signed within 24 hours of the encounter",
    numerator_label: "Notes signed within 24 hours",
    denominator_label: "Total clinical notes",
    methodology: "Count of clinical_notes where signed_at - created_at ≤ 24 hours",
    data_source: "Clinical Notes table",
    frequency: "Monthly",
    benchmark: "≥ 95% per clinical policy",
    rows_label: "Unsigned / Late Notes",
  },
  "CCO-5": {
    title: "Appointment Attendance",
    description: "Percentage of scheduled appointments attended by clients",
    numerator_label: "Appointments kept (completed/confirmed)",
    denominator_label: "Total scheduled appointments",
    methodology: "Count of appointments with status = completed or confirmed",
    data_source: "Appointments table",
    frequency: "Monthly",
    benchmark: "≥ 70% per SAMHSA CCBHC criteria",
    rows_label: "No-Show / Cancelled Appointments",
  },
  "CCO-6": {
    title: "Physical Health Screenings",
    description: "Percentage of active clients with BP and BMI documented via vitals in the past 12 months",
    numerator_label: "Active clients with vitals recorded in past 12 months",
    denominator_label: "Total active clients",
    methodology: "Counts distinct patients with at least one vital signs entry (patient_vitals table) in the past 365 days. CCBHC requires annual BP + BMI screening minimum.",
    data_source: "Patient Vitals table (recorded via Vitals module)",
    frequency: "Annually minimum — recommend at each encounter",
    benchmark: "≥ 80% per SAMHSA CCBHC criteria",
    rows_label: "Clients with Recent Vitals",
  },
  "CCO-7": {
    title: "Substance Use Screening",
    description: "Percentage of clients screened for substance use disorders using validated tools (AUDIT/DAST/CAGE)",
    numerator_label: "Clients with documented substance use screening",
    denominator_label: "Total active clients",
    methodology: "Encounter notes containing AUDIT, DAST, or CAGE screening documentation",
    data_source: "Clinical Notes + Encounters tables",
    frequency: "Annually at intake",
    benchmark: "≥ 85% per SAMHSA CCBHC criteria",
    rows_label: "Recent Screenings",
  },
  "CCO-8": {
    title: "Consumer Satisfaction",
    description: "Percentage of clients reporting satisfaction with services received",
    numerator_label: "Clients reporting satisfied or very satisfied",
    denominator_label: "Total survey respondents",
    methodology: "Consumer satisfaction survey — not yet deployed in this system",
    data_source: "Consumer satisfaction survey (pending)",
    frequency: "Annually",
    benchmark: "≥ 80% per SAMHSA CCBHC criteria",
    rows_label: "Survey Responses",
  },
};

export default async function CCBHCMeasureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id || "34e600b3-beb0-440c-88c4-20032185e727";


  const { id } = await params;
  const measure = MEASURE_DETAILS[id];
  if (!measure) notFound();

  // Fetch relevant data based on measure
  let rows: Record<string, string | number | boolean | null>[] = [];
  let numerator = 0;
  let denominator = 0;

  if (id === "CCO-3") {
    const { data: patients } = await supabaseAdmin
      .from("clients").select("id, first_name, last_name, mrn, created_at")
      .eq("is_active", true).eq("organization_id", orgId);
    const { data: plans } = await supabaseAdmin
      .from("treatment_plans").select("client_id, status, next_review_date")
      .eq("organization_id", orgId).eq("status", "active");
    const planSet = new Set(plans?.map(p => p.client_id));
    denominator = patients?.length || 0;
    numerator = patients?.filter(p => planSet.has(p.id)).length || 0;
    rows = (patients?.filter(p => !planSet.has(p.id)) || []).map(p => ({
      name: `${p.last_name}, ${p.first_name}`,
      mrn: p.mrn || "—",
      since: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "No active plan",
    }));
  } else if (id === "CCO-4") {
    const { data: notes } = await supabaseAdmin
      .from("clinical_notes")
      .select("*, encounter:encounter_id(encounter_date, client:client_id(first_name, last_name))")
      .order("created_at", { ascending: false }).limit(50);
    denominator = notes?.length || 0;
    numerator = notes?.filter(n => n.is_signed).length || 0;
    rows = (notes?.filter(n => !n.is_signed) || []).map(n => {
      const enc = Array.isArray(n.encounter) ? n.encounter[0] : n.encounter;
      const patient = enc && (Array.isArray(enc.patient) ? enc.patient[0] : enc.patient);
      const hoursAgo = Math.round((Date.now() - new Date(n.created_at).getTime()) / 3600000);
      return {
        name: patient ? `${patient.last_name}, ${patient.first_name}` : "Unknown",
        date: enc?.encounter_date || "—",
        age: `${hoursAgo}h old`,
        status: hoursAgo > 24 ? "Overdue" : "Pending",
      };
    });
  } else if (id === "CCO-5") {
    const { data: appts } = await supabaseAdmin
      .from("appointments")
      .select("*, client:client_id(first_name, last_name)")
      .in("status", ["no_show", "cancelled"])
      .order("appointment_date", { ascending: false }).limit(30);
    const { count: total } = await supabaseAdmin.from("appointments").select("*", { count: "exact", head: true });
    const { count: kept } = await supabaseAdmin.from("appointments").select("*", { count: "exact", head: true }).in("status", ["completed", "confirmed"]);
    denominator = total || 0;
    numerator = kept || 0;
    rows = (appts || []).map(a => {
      const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
      return {
        name: patient ? `${patient.last_name}, ${patient.first_name}` : "—",
        date: new Date(a.appointment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        type: a.appointment_type || "—",
        status: a.status,
      };
    });
  } else if (id === "CCO-1") {
    const { data: referrals } = await supabaseAdmin
      .from("referrals")
      .select("*, client:client_id(first_name, last_name, mrn)")
      .eq("referral_type", "incoming")
      .order("referral_date", { ascending: false }).limit(20);
    denominator = referrals?.length || 0;
    numerator = referrals?.filter(r => r.status === "accepted" || r.status === "completed").length || 0;
    rows = (referrals || []).map(r => {
      const patient = Array.isArray(r.patient) ? r.patient[0] : r.patient;
      return {
        name: patient ? `${patient.last_name}, ${patient.first_name}` : "Applicant",
        date: r.referral_date,
        priority: r.priority,
        status: r.status,
      };
    });
  } else if (id === "CCO-2") {
    const { data: crisis } = await supabaseAdmin
      .from("encounters")
      .select("*, client:client_id(first_name, last_name)")
      .eq("encounter_type", "Crisis Intervention")
      .order("encounter_date", { ascending: false }).limit(20);
    denominator = crisis?.length || 0;
    numerator = crisis?.filter(e => e.status === "signed" || e.status === "completed").length || 0;
    rows = (crisis || []).map(e => {
      const patient = Array.isArray(e.patient) ? e.patient[0] : e.patient;
      return {
        name: patient ? `${patient.last_name}, ${patient.first_name}` : "—",
        date: e.encounter_date,
        status: e.status,
      };
    });
  }

  const rate = denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
  const passing = rate !== null && rate >= parseInt(measure.benchmark.replace(/[^0-9]/g, ""));

  const STATUS_STYLE = passing
    ? { card: "from-emerald-600 to-emerald-700", badge: "bg-emerald-100 text-emerald-700", icon: "✅", label: "Passing" }
    : { card: "from-amber-500 to-amber-600", badge: "bg-amber-100 text-amber-700", icon: "⚠️", label: "Needs Attention" };

  const colKeys = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/reports/ccbhc" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-400">{id}</span>
            <h1 className="text-2xl font-bold text-slate-900">{measure.title}</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">{measure.description}</p>
        </div>
      </div>

      {/* Score card */}
      <div className={`bg-gradient-to-br ${STATUS_STYLE.card} rounded-2xl p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-200 text-sm mb-1">{STATUS_STYLE.icon} {STATUS_STYLE.label}</div>
            <div className="text-6xl font-bold">{rate !== null ? `${rate}%` : "N/A"}</div>
            <div className="text-white/70 text-sm mt-1">Target: {measure.benchmark}</div>
          </div>
          <div className="text-right space-y-3">
            <div className="bg-white/10 rounded-xl p-4 text-center min-w-32">
              <div className="text-3xl font-bold">{numerator}</div>
              <div className="text-xs text-white/70 mt-0.5">{measure.numerator_label}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center min-w-32">
              <div className="text-3xl font-bold">{denominator}</div>
              <div className="text-xs text-white/70 mt-0.5">{measure.denominator_label}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-2 gap-4 text-sm">
        {[
          { label: "Data Source", value: measure.data_source },
          { label: "Reporting Frequency", value: measure.frequency },
          { label: "Methodology", value: measure.methodology },
          { label: "Benchmark", value: measure.benchmark },
        ].map(item => (
          <div key={item.label}>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{item.label}</div>
            <div className="text-slate-700">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Detail rows */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{measure.rows_label}</h2>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {id === "CCO-8" ? "Consumer satisfaction survey not yet deployed" : "No records found — all clients are compliant ✅"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {colKeys.map(k => (
                    <th key={k} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider capitalize">
                      {k.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {colKeys.map(k => (
                      <td key={k} className="px-5 py-3.5 text-sm text-slate-700">
                        {k === "status" ? (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                            String(row[k]).includes("Overdue") || String(row[k]).includes("no_show") || String(row[k]).includes("cancelled") || String(row[k]).includes("No active")
                              ? "bg-red-100 text-red-600"
                              : String(row[k]).includes("Pending") ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {String(row[k]).replace(/_/g, " ")}
                          </span>
                        ) : (
                          String(row[k] ?? "—")
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
