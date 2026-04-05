import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";
import { getFPLLabel } from "@/lib/fpl";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function StatCard({
  label,
  value,
  sub,
  color = "bg-white",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: string;
}) {
  return (
    <div className={`${color} rounded-2xl border border-slate-200 p-5`}>
      {icon && <div className="text-2xl mb-2">{icon}</div>}
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, total, color = "bg-teal-500" }: { label: string; value: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="text-slate-700">{label}</span>
        <div className="text-right">
          <span className="font-semibold text-slate-900">{fmtInt(value)}</span>
          <span className="text-slate-400 ml-1 text-xs">({pct}%)</span>
        </div>
      </div>
      <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  "≤100% FPL":    "bg-red-50 border-red-200 text-red-700",
  "101–150% FPL": "bg-orange-50 border-orange-200 text-orange-700",
  "151–200% FPL": "bg-amber-50 border-amber-200 text-amber-700",
  "201–250% FPL": "bg-yellow-50 border-yellow-200 text-yellow-700",
  "251–300% FPL": "bg-blue-50 border-blue-200 text-blue-700",
  ">300% FPL":    "bg-slate-50 border-slate-200 text-slate-600",
};

export default async function SlidingFeeReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
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

  // ── Data fetching ──────────────────────────────────────────────────────────
  const [
    { data: adjustments },
    { data: allChargesInRange },
    { data: activeAssessments },
    { data: retroAdj },
  ] = await Promise.all([
    // SFS adjustments applied in date range (based on charge service_date)
    supabaseAdmin
      .from("charge_adjustments")
      .select("id, adjustment_amount, patient_responsibility, fpl_percent, tier_label, created_at, client_id")
      .eq("organization_id", orgId)
      .eq("adjustment_type", "sliding_fee")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false }),

    // All charges in date range — to compute total billed and SFS-adjusted subset
    supabaseAdmin
      .from("charges")
      .select("id, charge_amount, patient_responsibility, status, service_date, cpt_code, cpt_description")
      .eq("organization_id", orgId)
      .gte("service_date", from)
      .lte("service_date", to)
      .order("service_date", { ascending: false }),

    // Active income assessments — for FPL distribution snapshot
    supabaseAdmin
      .from("client_income_assessments")
      .select("id, client_id, fpl_percent, effective_date, expiration_date, status")
      .eq("organization_id", orgId)
      .eq("status", "active"),

    // Recent retroactive adjustments
    supabaseAdmin
      .from("sfs_retroactive_adjustments")
      .select("id, client_id, old_fpl_percent, new_fpl_percent, charges_affected, total_adjustment_delta, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const adjs = adjustments || [];
  const charges = allChargesInRange || [];
  const assessments = activeAssessments || [];
  const retro = retroAdj || [];

  // ── KPI calculations ───────────────────────────────────────────────────────
  const totalBilled = charges.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0);
  const chargesWithSFS = charges.filter(c => c.patient_responsibility != null && Number(c.patient_responsibility) < Number(c.charge_amount));
  const totalSFSAdjustment = adjs.reduce((s, a) => s + (Number(a.adjustment_amount) || 0), 0);
  const totalPatientResponsibility = adjs.reduce((s, a) => s + (Number(a.patient_responsibility) || 0), 0);
  const adjCount = adjs.length;
  const uniqueClients = new Set(adjs.map(a => a.client_id)).size;
  const avgFPL = assessments.length > 0
    ? Math.round(assessments.reduce((s, a) => s + (Number(a.fpl_percent) || 0), 0) / assessments.length)
    : 0;
  const expiringSoon = assessments.filter(a => {
    if (!a.expiration_date) return false;
    const exp = new Date(a.expiration_date);
    const diff = (exp.getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 30;
  });
  const expired = assessments.filter(a => a.expiration_date && new Date(a.expiration_date) < new Date());

  // ── FPL band breakdown ─────────────────────────────────────────────────────
  const fplBands: Record<string, { clients: number; adjustmentAmount: number; patientOwes: number }> = {
    "≤100% FPL":    { clients: 0, adjustmentAmount: 0, patientOwes: 0 },
    "101–150% FPL": { clients: 0, adjustmentAmount: 0, patientOwes: 0 },
    "151–200% FPL": { clients: 0, adjustmentAmount: 0, patientOwes: 0 },
    "201–250% FPL": { clients: 0, adjustmentAmount: 0, patientOwes: 0 },
    "251–300% FPL": { clients: 0, adjustmentAmount: 0, patientOwes: 0 },
    ">300% FPL":    { clients: 0, adjustmentAmount: 0, patientOwes: 0 },
  };

  // Adjustments by FPL band
  const seenClientsByBand: Record<string, Set<string>> = {};
  for (const adj of adjs) {
    const band = getFPLLabel(Number(adj.fpl_percent) || 0);
    if (!fplBands[band]) fplBands[band] = { clients: 0, adjustmentAmount: 0, patientOwes: 0 };
    if (!seenClientsByBand[band]) seenClientsByBand[band] = new Set();
    seenClientsByBand[band].add(adj.client_id);
    fplBands[band].adjustmentAmount += Number(adj.adjustment_amount) || 0;
    fplBands[band].patientOwes += Number(adj.patient_responsibility) || 0;
  }
  for (const band of Object.keys(fplBands)) {
    fplBands[band].clients = seenClientsByBand[band]?.size || 0;
  }

  // Active clients by FPL band
  const activeFPLBands: Record<string, number> = {};
  for (const a of assessments) {
    const band = getFPLLabel(Number(a.fpl_percent) || 0);
    activeFPLBands[band] = (activeFPLBands[band] || 0) + 1;
  }

  // ── Tier (label) breakdown from adjustments ───────────────────────────────
  const tierBreakdown: Record<string, { count: number; totalAdj: number }> = {};
  for (const adj of adjs) {
    const lbl = adj.tier_label || "Unknown";
    if (!tierBreakdown[lbl]) tierBreakdown[lbl] = { count: 0, totalAdj: 0 };
    tierBreakdown[lbl].count++;
    tierBreakdown[lbl].totalAdj += Number(adj.adjustment_amount) || 0;
  }
  const tierRows = Object.entries(tierBreakdown).sort((a, b) => b[1].totalAdj - a[1].totalAdj);

  // ── CPT breakdown ─────────────────────────────────────────────────────────
  const cptMap: Record<string, { count: number; totalBilled: number; totalAdj: number }> = {};
  for (const c of chargesWithSFS) {
    const key = c.cpt_code || "Unknown";
    if (!cptMap[key]) cptMap[key] = { count: 0, totalBilled: 0, totalAdj: 0 };
    cptMap[key].count++;
    cptMap[key].totalBilled += Number(c.charge_amount) || 0;
    const adj = Number(c.charge_amount) - Number(c.patient_responsibility);
    cptMap[key].totalAdj += adj > 0 ? adj : 0;
  }
  const cptRows = Object.entries(cptMap)
    .sort((a, b) => b[1].totalAdj - a[1].totalAdj)
    .slice(0, 10);

  const discountRate = totalBilled > 0 ? Math.round((totalSFSAdjustment / totalBilled) * 100) : 0;

  const csvData: Record<string, unknown>[] = adjs.map(a => ({
    date: a.created_at ? new Date(a.created_at).toLocaleDateString() : "",
    client_id: a.client_id,
    tier_label: a.tier_label || "",
    fpl_percent: a.fpl_percent,
    adjustment_amount: a.adjustment_amount,
    patient_responsibility: a.patient_responsibility,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700 text-sm">← Reports</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sliding Fee Adjustment Report</h1>
            <p className="text-slate-500 text-sm mt-0.5">SFS discount impact, FPL distribution, tier breakdown</p>
          </div>
        </div>
        <ReportActions
          reportTitle="Sliding Fee Adjustment Report"
          data={csvData}
          columns={[
            { key: "date", label: "Date" },
            { key: "client_id", label: "Client ID" },
            { key: "tier_label", label: "Tier" },
            { key: "fpl_percent", label: "FPL %" },
            { key: "adjustment_amount", label: "Adjustment ($)" },
            { key: "patient_responsibility", label: "Patient Owes ($)" },
          ]}
        />
      </div>

      {/* Date range filter */}
      <form method="GET" className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 no-print">
        <span className="text-sm font-medium text-slate-600">Period:</span>
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <span className="text-slate-400 text-sm">to</span>
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400"
        >
          Apply
        </button>
        {(params.from || params.to) && (
          <Link href="/dashboard/reports/sliding-fee" className="text-xs text-slate-400 hover:text-slate-600">
            Reset
          </Link>
        )}
      </form>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total SFS Adjustments"
          value={`$${fmt(totalSFSAdjustment)}`}
          sub={`${adjCount} adjustment${adjCount !== 1 ? "s" : ""} applied`}
          icon="💸"
          color="bg-teal-50"
        />
        <StatCard
          label="Clients Receiving SFS"
          value={String(uniqueClients)}
          sub={`${assessments.length} active assessments on file`}
          icon="👥"
        />
        <StatCard
          label="Total Patient Responsibility"
          value={`$${fmt(totalPatientResponsibility)}`}
          sub={`After SFS discounts applied`}
          icon="🧾"
        />
        <StatCard
          label="Avg Discount Rate"
          value={`${discountRate}%`}
          sub={`of $${fmt(totalBilled)} total billed`}
          icon="📉"
          color={discountRate > 0 ? "bg-amber-50" : "bg-white"}
        />
      </div>

      {/* Alerts row */}
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div className="flex gap-4">
          {expired.length > 0 && (
            <div className="flex-1 bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="font-semibold text-red-800 text-sm">⛔ {expired.length} Expired Assessment{expired.length !== 1 ? "s" : ""}</div>
              <p className="text-xs text-red-600 mt-1">
                These clients have overdue annual income redeterminations — SFS discounts may not be valid.
              </p>
              <Link href="/dashboard/financial-eligibility" className="text-xs text-red-700 font-semibold hover:underline mt-2 block">
                Review in Financial Eligibility →
              </Link>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="font-semibold text-amber-800 text-sm">⚠️ {expiringSoon.length} Assessment{expiringSoon.length !== 1 ? "s" : ""} Expiring in 30 Days</div>
              <p className="text-xs text-amber-700 mt-1">
                Annual redeterminations due soon — complete new income assessments to maintain SFS eligibility.
              </p>
              <Link href="/dashboard/financial-eligibility" className="text-xs text-amber-700 font-semibold hover:underline mt-2 block">
                Review in Financial Eligibility →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Two-column: FPL breakdown + active population */}
      <div className="grid grid-cols-2 gap-6">
        {/* FPL band — adjustment impact */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Adjustments by FPL Band</h2>
            <p className="text-xs text-slate-400 mt-0.5">Discount dollars applied per income tier — {from} to {to}</p>
          </div>
          {adjs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No SFS adjustments in this period</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {Object.entries(fplBands)
                .filter(([, v]) => v.adjustmentAmount > 0)
                .sort((a, b) => b[1].adjustmentAmount - a[1].adjustmentAmount)
                .map(([band, data]) => (
                  <div key={band} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${TIER_COLORS[band] || "bg-slate-100 border-slate-200 text-slate-600"}`}>
                        {band}
                      </span>
                      <div className="text-right text-xs text-slate-500">
                        <span className="font-semibold text-slate-900">${fmt(data.adjustmentAmount)}</span>
                        <span className="ml-2">discounted</span>
                        <span className="ml-2 text-slate-400">{data.clients} client{data.clients !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-teal-500 h-1.5 rounded-full"
                        style={{ width: `${totalSFSAdjustment > 0 ? Math.round((data.adjustmentAmount / totalSFSAdjustment) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              {Object.values(fplBands).every(v => v.adjustmentAmount === 0) && (
                <div className="p-6 text-center text-slate-400 text-sm">No adjustments in selected range</div>
              )}
            </div>
          )}
        </div>

        {/* Active client FPL distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Active Client FPL Distribution</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {assessments.length} client{assessments.length !== 1 ? "s" : ""} with active assessments
              {avgFPL > 0 && ` · avg ${avgFPL}% FPL`}
            </p>
          </div>
          {assessments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No active income assessments on file</div>
          ) : (
            <div className="p-5 space-y-3">
              {Object.entries(activeFPLBands)
                .sort((a, b) => b[1] - a[1])
                .map(([band, count]) => (
                  <BarRow
                    key={band}
                    label={band}
                    value={count}
                    total={assessments.length}
                    color={
                      band === "≤100% FPL" ? "bg-red-400" :
                      band === "101–150% FPL" ? "bg-orange-400" :
                      band === "151–200% FPL" ? "bg-amber-400" :
                      band === "201–250% FPL" ? "bg-yellow-400" :
                      band === "251–300% FPL" ? "bg-blue-400" :
                      "bg-slate-400"
                    }
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Tier-label breakdown table */}
      {tierRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Adjustment by Tier Label</h2>
            <p className="text-xs text-slate-400 mt-0.5">Breakdown by the tier name applied to each adjustment</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tier</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Adjustments</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total Discounted</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tierRows.map(([label, data]) => (
                <tr key={label} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{label}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{data.count}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">${fmt(data.totalAdj)}</td>
                  <td className="px-5 py-3 text-right text-slate-500">
                    {totalSFSAdjustment > 0 ? Math.round((data.totalAdj / totalSFSAdjustment) * 100) : 0}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-5 py-3 text-slate-900">Total</td>
                <td className="px-5 py-3 text-right text-slate-900">{adjCount}</td>
                <td className="px-5 py-3 text-right text-teal-700">${fmt(totalSFSAdjustment)}</td>
                <td className="px-5 py-3 text-right text-slate-500">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* CPT code breakdown */}
      {cptRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Top Services Receiving SFS Discounts</h2>
            <p className="text-xs text-slate-400 mt-0.5">CPT codes with sliding fee adjustments applied — {from} to {to}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">CPT Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Charges</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total Billed</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total Discounted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cptRows.map(([cpt, data]) => {
                const match = chargesWithSFS.find(c => c.cpt_code === cpt);
                return (
                  <tr key={cpt} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-semibold text-slate-900">{cpt}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{match?.cpt_description || "—"}</td>
                    <td className="px-5 py-3 text-right text-slate-700">{data.count}</td>
                    <td className="px-5 py-3 text-right text-slate-900">${fmt(data.totalBilled)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-teal-700">${fmt(data.totalAdj)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Retroactive adjustment log */}
      {retro.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Retroactive Adjustments</h2>
              <p className="text-xs text-slate-400 mt-0.5">Prior charges re-calculated after income tier changes</p>
            </div>
            <Link href="/dashboard/admin/sliding-fee" className="text-xs text-teal-600 font-medium hover:text-teal-800">
              Manage SFS Settings →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Old FPL %</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">New FPL %</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Charges Affected</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Net Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {retro.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-700">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500">{r.old_fpl_percent ?? "—"}%</td>
                  <td className="px-5 py-3 text-right text-slate-900 font-semibold">{r.new_fpl_percent ?? "—"}%</td>
                  <td className="px-5 py-3 text-right text-slate-700">{r.charges_affected}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${Number(r.total_adjustment_delta) < 0 ? "text-teal-700" : "text-red-600"}`}>
                    {Number(r.total_adjustment_delta) < 0 ? "−" : "+"}${fmt(Math.abs(Number(r.total_adjustment_delta)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No data state */}
      {adjs.length === 0 && charges.length === 0 && assessments.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">💸</div>
          <div className="font-semibold text-slate-900">No sliding fee data found</div>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            SFS adjustments appear here once income assessments are on file and notes with charges are signed.
          </p>
          <div className="flex items-center gap-3 justify-center mt-4">
            <Link href="/dashboard/financial-eligibility" className="text-sm text-teal-600 font-semibold hover:underline">
              Open Financial Eligibility →
            </Link>
            <Link href="/dashboard/admin/sliding-fee" className="text-sm text-slate-500 hover:underline">
              Configure SFS Schedule →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
