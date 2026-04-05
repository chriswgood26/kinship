import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

function countBy<T>(arr: T[], key: keyof T): Record<string, number> {
  const result: Record<string, number> = {};
  arr.forEach(item => {
    const val = String(item[key] || "Unknown");
    result[val] = (result[val] || 0) + 1;
  });
  return result;
}

function sortedEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

function BarRow({ label, count, total, color = "bg-teal-500" }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-700">{label}</span>
        <div className="text-right">
          <span className="font-semibold text-slate-900 text-sm">{count}</span>
          <span className="text-slate-400 text-xs ml-1">({pct}%)</span>
        </div>
      </div>
      <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function DemographicsReportPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const { data: clients } = await supabaseAdmin
    .from("clients")
    .select("date_of_birth, gender, race, ethnicity, primary_language, insurance_provider, status, is_active")
    .eq("organization_id", orgId);

  const all = clients || [];
  const active = all.filter(c => c.is_active);
  const total = all.length;
  const activeTotal = active.length;

  // Age calculation
  const today = new Date();
  const ageBuckets: Record<string, number> = {
    "0–17": 0,
    "18–25": 0,
    "26–35": 0,
    "36–45": 0,
    "46–55": 0,
    "56–65": 0,
    "65+": 0,
    "Unknown": 0,
  };
  all.forEach(c => {
    if (!c.date_of_birth) { ageBuckets["Unknown"]++; return; }
    const dob = new Date(c.date_of_birth + "T12:00:00");
    const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    if (age < 18) ageBuckets["0–17"]++;
    else if (age <= 25) ageBuckets["18–25"]++;
    else if (age <= 35) ageBuckets["26–35"]++;
    else if (age <= 45) ageBuckets["36–45"]++;
    else if (age <= 55) ageBuckets["46–55"]++;
    else if (age <= 65) ageBuckets["56–65"]++;
    else ageBuckets["65+"]++;
  });

  const genderCounts = countBy(all, "gender");
  const raceCounts = countBy(all, "race");
  const ethnicityCounts = countBy(all, "ethnicity");
  const languageCounts = countBy(all, "primary_language");
  const insuranceCounts = countBy(all, "insurance_provider");

  const statusCounts = countBy(all, "status");

  const BAR_COLORS = [
    "bg-teal-500",
    "bg-blue-500",
    "bg-violet-500",
    "bg-amber-400",
    "bg-rose-400",
    "bg-emerald-500",
    "bg-slate-400",
    "bg-orange-400",
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Population Demographics</h1>
            <p className="text-slate-500 text-sm mt-0.5">Patient population breakdown across all demographic dimensions</p>
          </div>
        </div>
        <ReportActions reportTitle="Population Demographics Report" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Patients", value: total, color: "bg-teal-50 border-teal-100" },
          { label: "Active", value: activeTotal, color: "bg-emerald-50 border-emerald-100" },
          { label: "Discharged", value: statusCounts["discharged"] || 0, color: "bg-slate-50 border-slate-200" },
          { label: "Waitlist", value: statusCounts["waitlist"] || 0, color: "bg-amber-50 border-amber-100" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-2 gap-5">

        {/* Age Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Age Distribution</h2>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(ageBuckets).map(([bucket, count], i) => (
              count > 0 && (
                <BarRow
                  key={bucket}
                  label={bucket}
                  count={count}
                  total={total}
                  color={BAR_COLORS[i % BAR_COLORS.length]}
                />
              )
            ))}
            {total === 0 && <div className="text-center text-slate-400 text-sm py-4">No data</div>}
          </div>
        </div>

        {/* Gender */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Gender</h2>
          </div>
          <div className="p-5 space-y-3">
            {sortedEntries(genderCounts).map(([gender, count], i) => (
              <BarRow
                key={gender}
                label={gender === "Unknown" || !gender ? "Not Specified" : gender}
                count={count}
                total={total}
                color={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
            {total === 0 && <div className="text-center text-slate-400 text-sm py-4">No data</div>}
          </div>
        </div>

        {/* Race */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Race</h2>
          </div>
          <div className="p-5 space-y-3">
            {sortedEntries(raceCounts).map(([race, count], i) => (
              <BarRow
                key={race}
                label={race === "Unknown" ? "Not Reported" : race}
                count={count}
                total={total}
                color={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
            {total === 0 && <div className="text-center text-slate-400 text-sm py-4">No data</div>}
          </div>
        </div>

        {/* Ethnicity */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Ethnicity</h2>
          </div>
          <div className="p-5 space-y-3">
            {sortedEntries(ethnicityCounts).map(([eth, count], i) => (
              <BarRow
                key={eth}
                label={eth === "Unknown" ? "Not Reported" : eth}
                count={count}
                total={total}
                color={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
            {total === 0 && <div className="text-center text-slate-400 text-sm py-4">No data</div>}
          </div>
        </div>

        {/* Primary Language */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Primary Language</h2>
          </div>
          <div className="p-5 space-y-3">
            {sortedEntries(languageCounts).map(([lang, count], i) => (
              <BarRow
                key={lang}
                label={lang === "Unknown" ? "Not Specified" : lang}
                count={count}
                total={total}
                color={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
            {total === 0 && <div className="text-center text-slate-400 text-sm py-4">No data</div>}
          </div>
        </div>

        {/* Insurance / Payer */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Insurance / Payer</h2>
          </div>
          <div className="p-5 space-y-3">
            {sortedEntries(insuranceCounts).map(([ins, count], i) => (
              <BarRow
                key={ins}
                label={ins === "Unknown" ? "Uninsured / Not Listed" : ins}
                count={count}
                total={total}
                color={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
            {total === 0 && <div className="text-center text-slate-400 text-sm py-4">No data</div>}
          </div>
        </div>

      </div>

      {/* Active vs Inactive status breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Patient Status Breakdown</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-5 gap-4">
            {(["active", "discharged", "waitlist", "transferred", "deceased"] as const).map((st, i) => {
              const count = statusCounts[st] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const bgColors: Record<string, string> = {
                active: "bg-emerald-50 border-emerald-200 text-emerald-700",
                discharged: "bg-slate-50 border-slate-200 text-slate-600",
                waitlist: "bg-amber-50 border-amber-200 text-amber-700",
                transferred: "bg-blue-50 border-blue-200 text-blue-700",
                deceased: "bg-rose-50 border-rose-200 text-rose-700",
              };
              return (
                <div key={st} className={`border rounded-xl p-4 text-center ${bgColors[st]}`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs font-medium capitalize mt-0.5">{st}</div>
                  {total > 0 && <div className="text-xs opacity-70 mt-0.5">{pct}%</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
