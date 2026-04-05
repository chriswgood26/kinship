import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

export default async function RevenueDashboardPage({
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

  // All charges in selected range
  const { data: charges } = await supabaseAdmin
    .from("charges")
    .select("id, service_date, cpt_code, cpt_description, charge_amount, paid_amount, status, icd10_codes, units")
    .eq("organization_id", orgId)
    .gte("service_date", from)
    .lte("service_date", to)
    .order("service_date", { ascending: false });

  // Last 6 months of charges for trend (regardless of range filter)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const trendStart = sixMonthsAgo.toISOString().split("T")[0];

  const { data: trendCharges } = await supabaseAdmin
    .from("charges")
    .select("service_date, charge_amount, paid_amount, status")
    .eq("organization_id", orgId)
    .gte("service_date", trendStart)
    .lte("service_date", today);

  // All outstanding (pending + submitted) charges for AR aging
  const { data: outstandingCharges } = await supabaseAdmin
    .from("charges")
    .select("service_date, charge_amount, status")
    .eq("organization_id", orgId)
    .in("status", ["pending", "submitted"]);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const totalCharged = charges?.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0) ?? 0;
  const paidCharges = charges?.filter(c => c.status === "paid") ?? [];
  const deniedCharges = charges?.filter(c => c.status === "denied") ?? [];
  const pendingCharges = charges?.filter(c => c.status === "pending") ?? [];
  const submittedCharges = charges?.filter(c => c.status === "submitted") ?? [];

  const totalPaid = paidCharges.reduce(
    (s, c) => s + (Number(c.paid_amount) || Number(c.charge_amount) || 0),
    0
  );
  const totalDenied = deniedCharges.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0);
  const totalOutstanding =
    [...pendingCharges, ...submittedCharges].reduce(
      (s, c) => s + (Number(c.charge_amount) || 0),
      0
    );
  const collectionRate =
    totalCharged > 0 ? Math.round((totalPaid / totalCharged) * 100) : 0;
  const denialRate =
    totalCharged > 0 ? Math.round((totalDenied / totalCharged) * 100) : 0;

  // ── Monthly revenue trend ────────────────────────────────────────────────
  const monthLabels: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    monthLabels.push({ key, label });
  }

  const monthlyData: Record<string, { charged: number; paid: number }> = {};
  monthLabels.forEach(m => (monthlyData[m.key] = { charged: 0, paid: 0 }));
  trendCharges?.forEach(c => {
    const monthKey = c.service_date?.slice(0, 7);
    if (monthKey && monthlyData[monthKey]) {
      monthlyData[monthKey].charged += Number(c.charge_amount) || 0;
      if (c.status === "paid") {
        monthlyData[monthKey].paid +=
          Number(c.paid_amount) || Number(c.charge_amount) || 0;
      }
    }
  });
  const maxMonthly = Math.max(...Object.values(monthlyData).map(m => m.charged), 1);

  // ── Revenue by CPT code ──────────────────────────────────────────────────
  const byCPT: Record<
    string,
    { desc: string; count: number; charged: number; paid: number; denied: number }
  > = {};
  charges?.forEach(c => {
    if (!c.cpt_code) return;
    if (!byCPT[c.cpt_code]) {
      byCPT[c.cpt_code] = { desc: c.cpt_description || "", count: 0, charged: 0, paid: 0, denied: 0 };
    }
    byCPT[c.cpt_code].count++;
    byCPT[c.cpt_code].charged += Number(c.charge_amount) || 0;
    if (c.status === "paid") byCPT[c.cpt_code].paid += Number(c.paid_amount) || Number(c.charge_amount) || 0;
    if (c.status === "denied") byCPT[c.cpt_code].denied += Number(c.charge_amount) || 0;
  });
  const cptEntries = Object.entries(byCPT).sort((a, b) => b[1].charged - a[1].charged);
  const maxCPT = Math.max(...cptEntries.map(([, v]) => v.charged), 1);

  // ── AR Aging ──────────────────────────────────────────────────────────────
  const todayMs = Date.now();
  const aging = { "0–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };
  outstandingCharges?.forEach(c => {
    const days = Math.floor((todayMs - new Date(c.service_date + "T12:00:00").getTime()) / 86400000);
    const amt = Number(c.charge_amount) || 0;
    if (days <= 30) aging["0–30"] += amt;
    else if (days <= 60) aging["31–60"] += amt;
    else if (days <= 90) aging["61–90"] += amt;
    else aging["90+"] += amt;
  });
  const totalAging = Object.values(aging).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Financial Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">Revenue analytics and AR management</p>
          </div>
        </div>
        <ReportActions reportTitle="Financial Dashboard" />
      </div>

      {/* Date range filter */}
      <form method="GET" className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 items-end">
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
        <div className="ml-auto flex gap-2">
          {[
            { label: "This Month", from: firstOfMonth, to: today },
            {
              label: "Last 30d",
              from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
              to: today,
            },
            {
              label: "Last 90d",
              from: new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0],
              to: today,
            },
          ].map(p => (
            <Link
              key={p.label}
              href={`/dashboard/reports/revenue?from=${p.from}&to=${p.to}`}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium transition-colors"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </form>

      {/* KPI cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Total Charged",
            value: `$${totalCharged.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            sub: `${charges?.length ?? 0} claims`,
            color: "bg-slate-50 border-slate-200",
            textColor: "text-slate-900",
          },
          {
            label: "Collected",
            value: `$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            sub: `${paidCharges.length} paid`,
            color: "bg-emerald-50 border-emerald-100",
            textColor: "text-emerald-700",
          },
          {
            label: "Outstanding",
            value: `$${totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            sub: `${pendingCharges.length + submittedCharges.length} open`,
            color: "bg-amber-50 border-amber-100",
            textColor: "text-amber-700",
          },
          {
            label: "Denied",
            value: `$${totalDenied.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            sub: `${deniedCharges.length} claims`,
            color: deniedCharges.length > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200",
            textColor: deniedCharges.length > 0 ? "text-red-600" : "text-slate-900",
          },
          {
            label: "Collection Rate",
            value: `${collectionRate}%`,
            sub: denialRate > 10 ? `⚠️ ${denialRate}% denial` : `${denialRate}% denial rate`,
            color: collectionRate >= 80 ? "bg-teal-50 border-teal-100" : "bg-amber-50 border-amber-100",
            textColor: collectionRate >= 80 ? "text-teal-700" : "text-amber-700",
          },
        ].map(k => (
          <div key={k.label} className={`${k.color} border rounded-2xl p-4`}>
            <div className={`text-2xl font-bold ${k.textColor}`}>{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
            <div className="text-xs text-slate-400 mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Monthly revenue trend + AR Aging */}
      <div className="grid grid-cols-3 gap-4">
        {/* Monthly trend — 2/3 width */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">6-Month Revenue Trend</h3>
          <div className="flex items-end gap-3 h-40">
            {monthLabels.map(m => {
              const data = monthlyData[m.key];
              const chargedH = maxMonthly > 0 ? (data.charged / maxMonthly) * 100 : 0;
              const paidH = maxMonthly > 0 ? (data.paid / maxMonthly) * 100 : 0;
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-0.5 h-32">
                    {/* Charged bar */}
                    <div
                      className="flex-1 bg-slate-200 rounded-t-md transition-all"
                      style={{ height: `${chargedH}%` }}
                      title={`Charged: $${data.charged.toFixed(0)}`}
                    />
                    {/* Paid bar */}
                    <div
                      className="flex-1 bg-teal-500 rounded-t-md transition-all"
                      style={{ height: `${paidH}%` }}
                      title={`Collected: $${data.paid.toFixed(0)}`}
                    />
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{m.label}</span>
                  <span className="text-xs font-semibold text-slate-700">
                    ${data.charged >= 1000 ? (data.charged / 1000).toFixed(1) + "k" : data.charged.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-slate-200" />
              <span className="text-xs text-slate-500">Charged</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-teal-500" />
              <span className="text-xs text-slate-500">Collected</span>
            </div>
          </div>
        </div>

        {/* AR Aging — 1/3 width */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-1">AR Aging</h3>
          <p className="text-xs text-slate-400 mb-4">Outstanding balances by age</p>
          <div className="space-y-3">
            {(
              [
                { label: "0–30 days", key: "0–30", color: "bg-teal-500" },
                { label: "31–60 days", key: "31–60", color: "bg-amber-400" },
                { label: "61–90 days", key: "61–90", color: "bg-orange-500" },
                { label: "90+ days", key: "90+", color: "bg-red-500" },
              ] as const
            ).map(bucket => {
              const amt = aging[bucket.key];
              const pct = totalAging > 0 ? (amt / totalAging) * 100 : 0;
              return (
                <div key={bucket.key}>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>{bucket.label}</span>
                    <span className="font-semibold">
                      ${amt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-2 ${bucket.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
              <span className="text-slate-500">Total Outstanding</span>
              <span className="font-bold text-slate-900">
                ${totalAging.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by CPT */}
      {cptEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Revenue by CPT Code</h3>
            <Link
              href="/dashboard/reports/cpt"
              className="text-xs text-teal-600 hover:text-teal-800 font-medium"
            >
              Full CPT Report →
            </Link>
          </div>
          <div className="space-y-3">
            {cptEntries.slice(0, 10).map(([cpt, data]) => {
              const collRate = data.charged > 0 ? Math.round((data.paid / data.charged) * 100) : 0;
              return (
                <div key={cpt} className="flex items-center gap-3">
                  <div className="w-20 flex-shrink-0">
                    <span className="font-mono text-sm font-bold text-slate-700">{cpt}</span>
                    <div className="text-xs text-slate-400 truncate">{data.count} claims</div>
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-7 overflow-hidden relative">
                    {/* Charged full width backdrop already is slate-100 */}
                    <div
                      className="absolute left-0 top-0 bg-slate-300 h-7 rounded-full"
                      style={{ width: `${(data.charged / maxCPT) * 100}%` }}
                    />
                    <div
                      className="absolute left-0 top-0 bg-teal-500 h-7 rounded-full flex items-center px-2"
                      style={{ width: `${(data.paid / maxCPT) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-xs font-semibold text-slate-900 z-10">
                        ${data.charged.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                      {data.desc && (
                        <span className="text-xs text-slate-500 ml-2 truncate z-10">{data.desc}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-16 text-right flex-shrink-0">
                    <span
                      className={`text-xs font-semibold ${
                        collRate >= 80
                          ? "text-teal-600"
                          : collRate >= 50
                          ? "text-amber-600"
                          : "text-slate-500"
                      }`}
                    >
                      {collRate}%
                    </span>
                    <div className="text-xs text-slate-400">collected</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {/* Payment rate card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Claim Outcomes</h3>
          <div className="space-y-3">
            {[
              {
                label: "Paid",
                count: paidCharges.length,
                pct: charges?.length ? Math.round((paidCharges.length / charges.length) * 100) : 0,
                color: "bg-emerald-500",
              },
              {
                label: "Submitted",
                count: submittedCharges.length,
                pct: charges?.length ? Math.round((submittedCharges.length / charges.length) * 100) : 0,
                color: "bg-blue-400",
              },
              {
                label: "Pending",
                count: pendingCharges.length,
                pct: charges?.length ? Math.round((pendingCharges.length / charges.length) * 100) : 0,
                color: "bg-amber-400",
              },
              {
                label: "Denied",
                count: deniedCharges.length,
                pct: charges?.length ? Math.round((deniedCharges.length / charges.length) * 100) : 0,
                color: "bg-red-400",
              },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-16 flex-shrink-0">{s.label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`${s.color} h-5 rounded-full flex items-center justify-end pr-2`}
                    style={{ width: `${s.pct}%` }}
                  >
                    {s.pct >= 15 && (
                      <span className="text-white text-xs font-bold">{s.pct}%</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-700 w-12 text-right flex-shrink-0">
                  {s.count} claims
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Revenue Reports</h3>
          <div className="space-y-2">
            {[
              { label: "Charge Summary", desc: "Detailed charge register", href: "/dashboard/reports/charges", icon: "🧾" },
              { label: "Claims Outcome", desc: "Paid vs denied analysis", href: "/dashboard/reports/claims", icon: "📋" },
              { label: "Revenue by CPT", desc: "Procedure code breakdown", href: "/dashboard/reports/cpt", icon: "💳" },
              { label: "Billing Queue", desc: "Manage pending charges", href: "/dashboard/billing", icon: "💰" },
            ].map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors no-underline"
              >
                <span className="text-xl">{link.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{link.label}</div>
                  <div className="text-xs text-slate-400">{link.desc}</div>
                </div>
                <span className="text-slate-300 text-sm">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {!charges?.length && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-semibold text-slate-700 mb-1">No charges in this period</p>
          <p className="text-sm text-slate-400 mb-4">Adjust the date range or add charges to see revenue analytics.</p>
          <Link href="/dashboard/billing/new"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
            + Add Charge
          </Link>
        </div>
      )}
    </div>
  );
}
