import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

// Common Medicaid payer name patterns (case-insensitive matching)
const MEDICAID_KEYWORDS = [
  "medicaid", "ahcccs", "medi-cal", "medi cal", "dmas", "tenncare", "molina",
  "amerigroup", "wellcare", "centene", "magellan", "beacon health", "optum",
  "united behavioral", "aetna better health", "anthem bcbs medicaid",
  "community health plan", "caresource", "health first colorado",
  "ky health", "la health", "star health", "superior health",
  "fee-for-service", "fee for service", "state plan",
];

function isMedicaid(payer?: string | null): boolean {
  if (!payer) return false;
  const lower = payer.toLowerCase();
  return MEDICAID_KEYWORDS.some(kw => lower.includes(kw));
}

const MEDICAID_SERVICE_CATEGORIES: Record<string, string> = {
  "90791": "Psychiatric Diagnostic Evaluation",
  "90792": "Psychiatric Diagnostic Eval w/ Medical",
  "90832": "Psychotherapy, 30 min",
  "90834": "Psychotherapy, 45 min",
  "90837": "Psychotherapy, 60 min",
  "90847": "Family Psychotherapy w/ Patient",
  "90853": "Group Psychotherapy",
  "90839": "Psychotherapy for Crisis, 30–74 min",
  "90840": "Psychotherapy for Crisis, additional 30 min",
  "H0001": "Alcohol/Drug Assessment",
  "H0004": "Behavioral Health Counseling",
  "H0005": "Alcohol/Drug Group Counseling",
  "H0015": "Substance Abuse Treatment",
  "H0031": "Mental Health Assessment",
  "H0035": "Mental Health Day Treatment",
  "H0036": "Community Psychiatric Supportive Treatment",
  "H0037": "Community Psychiatric Support Group",
  "H2011": "Crisis Intervention",
  "H2014": "Skills Training",
  "H2016": "Comprehensive Community Support",
  "H2019": "Therapeutic Behavioral Services",
  "T1015": "CCBHC Clinic Services (PPS)",
  "99213": "Office Visit – Established, Low",
  "99214": "Office Visit – Established, Moderate",
  "99215": "Office Visit – Established, High",
};

export default async function MedicaidReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; state?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const from = params.from || firstOfMonth;
  const to = params.to || today;
  const selectedState = params.state || "";

  // ── Fetch org info ─────────────────────────────────────────────────────────
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("name, state, npi")
    .eq("id", orgId)
    .single();

  // ── Fetch all clients with insurance info ─────────────────────────────────
  const { data: allClients } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, mrn, date_of_birth, gender, race, ethnicity, state, zip, insurance_provider, insurance_member_id, is_active, status")
    .eq("organization_id", orgId);

  // ── Fetch charges in range ─────────────────────────────────────────────────
  const { data: charges } = await supabaseAdmin
    .from("charges")
    .select("id, client_id, service_date, cpt_code, cpt_description, icd10_codes, units, charge_amount, paid_amount, status, modifier")
    .eq("organization_id", orgId)
    .gte("service_date", from)
    .lte("service_date", to)
    .order("service_date", { ascending: false });

  // ── Fetch encounters in range ──────────────────────────────────────────────
  const { data: encounters } = await supabaseAdmin
    .from("encounters")
    .select("id, client_id, encounter_date, encounter_type, status, provider_id, duration_minutes")
    .eq("organization_id", orgId)
    .gte("encounter_date", from)
    .lte("encounter_date", to);

  // ── Build Medicaid client set ──────────────────────────────────────────────
  type ClientRow = NonNullable<typeof allClients>[number];
  const clientMap = new Map<string, ClientRow>();
  allClients?.forEach(c => clientMap.set(c.id, c));

  const medicaidClients = (allClients || []).filter(c => isMedicaid(c.insurance_provider));
  const medicaidClientIds = new Set(medicaidClients.map(c => c.id));

  // ── Filter charges for Medicaid clients ────────────────────────────────────
  const medicaidCharges = (charges || []).filter(ch => medicaidClientIds.has(ch.client_id));
  const medicaidEncounters = (encounters || []).filter(enc => medicaidClientIds.has(enc.client_id));

  // ── Active Medicaid clients with encounters in range ───────────────────────
  const activeInPeriod = new Set(medicaidEncounters.map(e => e.client_id));

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalMedicaidClients = medicaidClients.length;
  const activeMedicaidClients = medicaidClients.filter(c => c.is_active).length;
  const seenInPeriod = activeInPeriod.size;
  const totalChargesAmount = medicaidCharges.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0);
  const totalPaidAmount = medicaidCharges.reduce((s, c) => s + (Number(c.paid_amount) || 0), 0);
  const totalEncountersCount = medicaidEncounters.length;

  // ── By CPT code ────────────────────────────────────────────────────────────
  const byCpt: Record<string, { desc: string; count: number; units: number; charged: number; paid: number }> = {};
  medicaidCharges.forEach(ch => {
    const code = ch.cpt_code || "Unknown";
    const desc = ch.cpt_description || MEDICAID_SERVICE_CATEGORIES[code] || "—";
    if (!byCpt[code]) byCpt[code] = { desc, count: 0, units: 0, charged: 0, paid: 0 };
    byCpt[code].count++;
    byCpt[code].units += ch.units || 1;
    byCpt[code].charged += Number(ch.charge_amount) || 0;
    byCpt[code].paid += Number(ch.paid_amount) || 0;
  });
  const cptEntries = Object.entries(byCpt).sort((a, b) => b[1].charged - a[1].charged);

  // ── By diagnosis ───────────────────────────────────────────────────────────
  const diagCounts: Record<string, number> = {};
  medicaidCharges.forEach(ch => {
    (ch.icd10_codes || []).forEach((code: string) => {
      diagCounts[code] = (diagCounts[code] || 0) + 1;
    });
  });
  const diagEntries = Object.entries(diagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxDiag = diagEntries[0]?.[1] || 1;

  // ── By charge status ───────────────────────────────────────────────────────
  const byStatus: Record<string, number> = {};
  medicaidCharges.forEach(ch => {
    const s = ch.status || "unknown";
    byStatus[s] = (byStatus[s] || 0) + 1;
  });

  // ── Monthly trend (last 6 months) ─────────────────────────────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const trendStart = sixMonthsAgo.toISOString().split("T")[0];

  const { data: trendCharges } = await supabaseAdmin
    .from("charges")
    .select("service_date, charge_amount, paid_amount, client_id")
    .eq("organization_id", orgId)
    .gte("service_date", trendStart)
    .lte("service_date", today);

  const monthLabels: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    monthLabels.push({ key, label });
  }

  const monthlyTrend: Record<string, { charged: number; paid: number; claims: number }> = {};
  monthLabels.forEach(m => (monthlyTrend[m.key] = { charged: 0, paid: 0, claims: 0 }));
  trendCharges?.forEach(ch => {
    if (!medicaidClientIds.has(ch.client_id)) return;
    const key = ch.service_date?.slice(0, 7);
    if (key && monthlyTrend[key]) {
      monthlyTrend[key].charged += Number(ch.charge_amount) || 0;
      monthlyTrend[key].paid += Number(ch.paid_amount) || 0;
      monthlyTrend[key].claims++;
    }
  });
  const maxTrend = Math.max(...Object.values(monthlyTrend).map(m => m.charged), 1);

  // ── Per-client summary (for export table) ─────────────────────────────────
  const clientSummary: Record<string, {
    id: string; name: string; mrn: string; dob: string; memberId: string;
    payer: string; encCount: number; charged: number; paid: number;
    diagCodes: Set<string>;
  }> = {};

  medicaidEncounters.forEach(enc => {
    if (!clientSummary[enc.client_id]) {
      const c = clientMap.get(enc.client_id);
      clientSummary[enc.client_id] = {
        id: enc.client_id,
        name: c ? `${c.last_name}, ${c.first_name}` : "Unknown",
        mrn: c?.mrn || "",
        dob: c?.date_of_birth || "",
        memberId: c?.insurance_member_id || "",
        payer: c?.insurance_provider || "",
        encCount: 0,
        charged: 0,
        paid: 0,
        diagCodes: new Set(),
      };
    }
    clientSummary[enc.client_id].encCount++;
  });

  medicaidCharges.forEach(ch => {
    if (!clientSummary[ch.client_id]) {
      const c = clientMap.get(ch.client_id);
      if (!c) return;
      clientSummary[ch.client_id] = {
        id: ch.client_id,
        name: c ? `${c.last_name}, ${c.first_name}` : "Unknown",
        mrn: c?.mrn || "",
        dob: c?.date_of_birth || "",
        memberId: c?.insurance_member_id || "",
        payer: c?.insurance_provider || "",
        encCount: 0,
        charged: 0,
        paid: 0,
        diagCodes: new Set(),
      };
    }
    clientSummary[ch.client_id].charged += Number(ch.charge_amount) || 0;
    clientSummary[ch.client_id].paid += Number(ch.paid_amount) || 0;
    (ch.icd10_codes || []).forEach((d: string) => clientSummary[ch.client_id]?.diagCodes.add(d));
  });

  const clientRows = Object.values(clientSummary)
    .sort((a, b) => b.charged - a.charged)
    .map(r => ({ ...r, diagCodes: Array.from(r.diagCodes).join("; ") }));

  // ── Claim detail rows (for full export) ───────────────────────────────────
  const claimDetailRows = medicaidCharges.map(ch => {
    const c = clientMap.get(ch.client_id);
    return {
      mrn: c?.mrn || "",
      client_name: c ? `${c.last_name}, ${c.first_name}` : "",
      date_of_birth: c?.date_of_birth || "",
      member_id: c?.insurance_member_id || "",
      payer: c?.insurance_provider || "",
      service_date: ch.service_date,
      cpt_code: ch.cpt_code,
      modifier: ch.modifier || "",
      units: ch.units || 1,
      icd10_codes: (ch.icd10_codes || []).join("; "),
      charge_amount: Number(ch.charge_amount || 0).toFixed(2),
      paid_amount: Number(ch.paid_amount || 0).toFixed(2),
      status: ch.status,
    };
  });

  const collectionRate = totalChargesAmount > 0
    ? Math.round((totalPaidAmount / totalChargesAmount) * 100)
    : 0;

  const STATUS_BADGE: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    denied: "bg-red-100 text-red-700",
    submitted: "bg-blue-100 text-blue-700",
    voided: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">State Medicaid Compliance Export</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Medicaid client services, billing summary, and state compliance data
              {org?.state ? ` · ${org.state}` : ""}
            </p>
          </div>
        </div>
        <ReportActions reportTitle="Medicaid_Compliance_Report" />
      </div>

      {/* Date range filter */}
      <form method="GET" className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 items-end flex-wrap">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From</label>
          <input type="date" name="from" defaultValue={from}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To</label>
          <input type="date" name="to" defaultValue={to}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button type="submit" className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
          Apply
        </button>
        <div className="ml-auto flex gap-2 flex-wrap">
          {[
            { label: "This Month", from: firstOfMonth, to: today },
            { label: "Last 30d", from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], to: today },
            { label: "Last Quarter", from: new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0], to: today },
            { label: "Last 6 Mo", from: new Date(Date.now() - 180 * 86400000).toISOString().split("T")[0], to: today },
            { label: "YTD", from: `${new Date().getFullYear()}-01-01`, to: today },
          ].map(p => (
            <Link
              key={p.label}
              href={`/dashboard/reports/medicaid?from=${p.from}&to=${p.to}`}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium transition-colors"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </form>

      {/* Compliance notice banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3.5 flex items-start gap-3">
        <span className="text-blue-500 text-lg mt-0.5">ℹ️</span>
        <div>
          <p className="text-sm font-semibold text-blue-900">State Medicaid Compliance Export</p>
          <p className="text-xs text-blue-700 mt-0.5">
            This report identifies clients covered by Medicaid/managed Medicaid plans and summarizes
            services rendered. Use the CSV export for state reporting submissions. Verify payer
            identification against your state{"'"}s Medicaid managed care roster.
          </p>
        </div>
      </div>

      {/* Hero metrics */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6">
        <div className="grid grid-cols-5 gap-6 text-center">
          <div>
            <div className="text-4xl font-bold text-teal-300">{totalMedicaidClients}</div>
            <div className="text-slate-300 text-sm mt-1">Medicaid Clients</div>
            <div className="text-slate-500 text-xs mt-0.5">enrolled / ever</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white">{activeMedicaidClients}</div>
            <div className="text-slate-300 text-sm mt-1">Active Medicaid</div>
            <div className="text-slate-500 text-xs mt-0.5">currently active</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-300">{seenInPeriod}</div>
            <div className="text-slate-300 text-sm mt-1">Seen in Period</div>
            <div className="text-slate-500 text-xs mt-0.5">had encounter</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-emerald-300">
              ${totalChargesAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-slate-300 text-sm mt-1">Total Billed</div>
            <div className="text-slate-500 text-xs mt-0.5">{medicaidCharges.length} claims</div>
          </div>
          <div>
            <div className={`text-4xl font-bold ${collectionRate >= 80 ? "text-teal-300" : collectionRate >= 60 ? "text-amber-400" : "text-red-400"}`}>
              {collectionRate}%
            </div>
            <div className="text-slate-300 text-sm mt-1">Collection Rate</div>
            <div className="text-slate-500 text-xs mt-0.5">
              ${totalPaidAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })} collected
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Encounters", value: totalEncountersCount, icon: "⚕️", color: "bg-teal-50 border-teal-100", text: "text-teal-700" },
          { label: "Paid Claims", value: byStatus["paid"] || 0, icon: "✅", color: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
          { label: "Pending Claims", value: byStatus["pending"] || 0, icon: "⏳", color: (byStatus["pending"] || 0) > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200", text: (byStatus["pending"] || 0) > 0 ? "text-amber-700" : "text-slate-700" },
          { label: "Denied Claims", value: byStatus["denied"] || 0, icon: "🚫", color: (byStatus["denied"] || 0) > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200", text: (byStatus["denied"] || 0) > 0 ? "text-red-600" : "text-slate-700" },
        ].map(k => (
          <div key={k.label} className={`${k.color} border rounded-2xl p-4`}>
            <div className="text-2xl mb-1">{k.icon}</div>
            <div className={`text-3xl font-bold ${k.text}`}>{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Trend + Diagnoses */}
      <div className="grid grid-cols-3 gap-4">
        {/* 6-month billing trend */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-1">6-Month Medicaid Billing Trend</h3>
          <p className="text-xs text-slate-400 mb-4">Monthly billed vs. collected (Medicaid clients only)</p>
          {Object.values(monthlyTrend).every(m => m.claims === 0) ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No Medicaid billing data in the last 6 months</div>
          ) : (
            <>
              <div className="flex items-end gap-3 h-40">
                {monthLabels.map(m => {
                  const data = monthlyTrend[m.key];
                  const chargedH = maxTrend > 0 ? (data.charged / maxTrend) * 100 : 0;
                  const paidH = maxTrend > 0 ? (data.paid / maxTrend) * 100 : 0;
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center gap-0.5 h-32">
                        <div className="flex-1 bg-teal-400 rounded-t-sm transition-all" style={{ height: `${chargedH}%` }}
                          title={`Charged: $${data.charged.toFixed(0)}`} />
                        <div className="flex-1 bg-emerald-400 rounded-t-sm transition-all" style={{ height: `${paidH}%` }}
                          title={`Paid: $${data.paid.toFixed(0)}`} />
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{m.label}</span>
                      <span className="text-xs font-semibold text-slate-700">{data.claims}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-5 mt-3">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-teal-400" /><span className="text-xs text-slate-500">Billed</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /><span className="text-xs text-slate-500">Collected</span></div>
                <span className="text-xs text-slate-400 ml-auto">Numbers = claim count</span>
              </div>
            </>
          )}
        </div>

        {/* Top diagnoses */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Top Diagnosis Codes</h3>
          <p className="text-xs text-slate-400 mb-4">On Medicaid claims in period</p>
          {diagEntries.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-6">No diagnosis data</div>
          ) : (
            <div className="space-y-2.5">
              {diagEntries.map(([code, count]) => {
                const pct = maxDiag > 0 ? (count / maxDiag) * 100 : 0;
                return (
                  <div key={code}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-semibold text-slate-700">{code}</span>
                      <span className="text-slate-500">{count} claim{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CPT code breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Service Code (CPT/HCPCS) Breakdown</h3>
          <p className="text-xs text-slate-400 mt-0.5">Medicaid claims by procedure code — {from} to {to}</p>
        </div>
        {cptEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No Medicaid charges in this period</div>
        ) : (
          <>
            <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-6 gap-4">
              <span>Code</span>
              <span className="col-span-2">Description</span>
              <span className="text-right">Claims</span>
              <span className="text-right">Billed</span>
              <span className="text-right">Collected</span>
            </div>
            <div className="divide-y divide-slate-50">
              {cptEntries.map(([code, data]) => {
                const collRate = data.charged > 0 ? Math.round((data.paid / data.charged) * 100) : 0;
                return (
                  <div key={code} className="grid grid-cols-6 gap-4 px-5 py-3 items-center hover:bg-slate-50">
                    <div className="font-mono text-sm font-semibold text-teal-700">{code}</div>
                    <div className="col-span-2 text-sm text-slate-700 truncate">{data.desc}</div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">{data.count}</span>
                      <span className="text-xs text-slate-400 ml-1">({data.units} units)</span>
                    </div>
                    <div className="text-right text-sm text-slate-700">
                      ${data.charged.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-700">
                        ${data.paid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {data.charged > 0 && (
                        <div className={`text-xs ${collRate >= 80 ? "text-emerald-600" : collRate >= 60 ? "text-amber-600" : "text-red-500"}`}>
                          {collRate}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 grid grid-cols-6 gap-4 text-sm font-semibold">
              <div className="col-span-2 text-slate-700">Total</div>
              <div />
              <div className="text-right text-slate-700">{medicaidCharges.length}</div>
              <div className="text-right text-slate-900">
                ${totalChargesAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-right text-emerald-700">
                ${totalPaidAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Client summary table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Medicaid Client Summary</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clients with Medicaid insurance who had encounters or charges in the selected period
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
            {clientRows.length} clients
          </span>
        </div>
        {clientRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No Medicaid clients with activity in this period
          </div>
        ) : (
          <>
            <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-7 gap-3">
              <span>MRN</span>
              <span className="col-span-2">Client</span>
              <span>Member ID</span>
              <span>Encounters</span>
              <span className="text-right">Billed</span>
              <span className="text-right">Collected</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
              {clientRows.map(row => (
                <Link
                  key={row.id}
                  href={`/dashboard/clients/${row.id}`}
                  className="grid grid-cols-7 gap-3 px-5 py-3 items-center hover:bg-slate-50 no-underline"
                >
                  <div className="font-mono text-xs text-slate-500">{row.mrn}</div>
                  <div className="col-span-2">
                    <div className="font-medium text-sm text-slate-900">{row.name}</div>
                    <div className="text-xs text-slate-400 truncate">{row.payer}</div>
                  </div>
                  <div className="text-xs text-slate-600">{row.memberId || <span className="text-slate-300">—</span>}</div>
                  <div className="text-sm font-semibold text-teal-700">{row.encCount}</div>
                  <div className="text-right text-sm text-slate-700">
                    {row.charged > 0
                      ? `$${row.charged.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : <span className="text-slate-300">—</span>
                    }
                  </div>
                  <div className="text-right text-sm font-semibold text-emerald-700">
                    {row.paid > 0
                      ? `$${row.paid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : <span className="text-slate-300 font-normal">—</span>
                    }
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Claim detail export table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Claim Detail — State Submission View</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Line-level export data: MRN, member ID, service date, CPT, modifier, ICD-10, amounts
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
            {claimDetailRows.length} lines
          </span>
        </div>
        {claimDetailRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No Medicaid claim lines in this period</div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-9 gap-2">
              <span>MRN</span>
              <span className="col-span-2">Client</span>
              <span>Svc Date</span>
              <span>CPT / Mod</span>
              <span>ICD-10</span>
              <span className="text-right">Units</span>
              <span className="text-right">Billed</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
              {claimDetailRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-9 gap-2 px-4 py-2.5 items-center hover:bg-slate-50 text-xs">
                  <div className="font-mono text-slate-500">{row.mrn}</div>
                  <div className="col-span-2 font-medium text-slate-900 truncate">{row.client_name}</div>
                  <div className="text-slate-600">{row.service_date}</div>
                  <div>
                    <span className="font-mono font-semibold text-teal-700">{row.cpt_code}</span>
                    {row.modifier && <span className="text-slate-400 ml-1">{row.modifier}</span>}
                  </div>
                  <div className="text-slate-600 truncate">{row.icd10_codes || <span className="text-slate-300">—</span>}</div>
                  <div className="text-right text-slate-700">{row.units}</div>
                  <div className="text-right font-semibold text-slate-900">${row.charge_amount}</div>
                  <div>
                    <span className={`px-1.5 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[row.status] || "bg-slate-100 text-slate-500"}`}>
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* State-specific guidance */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">State Submission Checklist</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              title: "Encounter Data Submission",
              items: [
                "Verify member IDs against Medicaid eligibility file",
                "Confirm service dates match claim submission window",
                "Include rendering provider NPI on each claim line",
                "Validate ICD-10 codes for medical necessity",
              ],
              icon: "📋",
            },
            {
              title: "Billing Compliance",
              items: [
                "Check CPT codes are Medicaid-reimbursable in your state",
                "Apply correct modifiers (U1–U8, HN, HO, HP)",
                "Ensure prior authorizations are on file for auth-required services",
                "Match units billed to documented service duration",
              ],
              icon: "✅",
            },
            {
              title: "Documentation Requirements",
              items: [
                "All encounters must have signed clinical notes",
                "Treatment plans must be current and signed",
                "Diagnoses must be documented in clinical record",
                "Provider credentials must be on file and current",
              ],
              icon: "📁",
            },
          ].map(section => (
            <div key={section.title} className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{section.icon}</span>
                <span className="font-semibold text-sm text-slate-900">{section.title}</span>
              </div>
              <ul className="space-y-1.5">
                {section.items.map(item => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <span className="text-teal-500 mt-0.5 flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Credentials Report", desc: "Provider license & NPI status", href: "/dashboard/reports/credentials", icon: "🪪" },
          { label: "Unsigned Notes", desc: "Notes pending clinician signature", href: "/dashboard/encounters?status=in_progress", icon: "📝" },
          { label: "Pending Billing", desc: "Charges awaiting submission", href: "/dashboard/billing?status=pending", icon: "💰" },
          { label: "Prior Authorizations", desc: "Auth tracking and expiry", href: "/dashboard/authorizations", icon: "🔐" },
        ].map(link => (
          <Link
            key={link.label}
            href={link.href}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition-shadow no-underline"
          >
            <span className="text-2xl">{link.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">{link.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{link.desc}</div>
            </div>
            <span className="text-slate-300 text-sm">→</span>
          </Link>
        ))}
      </div>

      {totalMedicaidClients === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">🏥</div>
          <p className="font-semibold text-slate-700 mb-1">No Medicaid clients identified</p>
          <p className="text-sm text-slate-400 mb-4">
            Medicaid clients are identified by their insurance provider field. Make sure client
            insurance is recorded in the client profile.
          </p>
          <Link href="/dashboard/clients"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
            View Clients
          </Link>
        </div>
      )}
    </div>
  );
}
