import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const ORG_ID = orgId;

function getFPLLabel(pct: number) {
  if (pct <= 100) return "≤100% FPL";
  if (pct <= 150) return "101–150% FPL";
  if (pct <= 200) return "151–200% FPL";
  if (pct <= 250) return "201–250% FPL";
  if (pct <= 300) return "251–300% FPL";
  return ">300% FPL";
}

function fplColor(pct: number) {
  if (pct <= 100) return "bg-red-50 border-red-200 text-red-800";
  if (pct <= 150) return "bg-orange-50 border-orange-200 text-orange-800";
  if (pct <= 200) return "bg-amber-50 border-amber-200 text-amber-800";
  if (pct <= 250) return "bg-yellow-50 border-yellow-200 text-yellow-800";
  return "bg-slate-50 border-slate-200 text-slate-600";
}

export default async function FinancialEligibilityPage({
  searchParams,
}: { searchParams: Promise<{ filter?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id || profile?.organization_id || "";


  const params = await searchParams;
  const filter = params.filter || "all";

  // Get all active patients
  const { data: patients } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, mrn, insurance_provider, insurance_member_id, status")
    .eq("organization_id", ORG_ID)
    .eq("status", "active")
    .order("last_name");

  // Get all active income assessments for these patients
  const patientIds = patients?.map(p => p.id) || [];
  const { data: assessments } = patientIds.length > 0
    ? await supabaseAdmin
        .from("client_income_assessments")
        .select("*")
        .in("client_id", patientIds)
        .eq("status", "active")
    : { data: [] };

  const assessmentMap = Object.fromEntries((assessments || []).map(a => [a.client_id, a]));

  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86400000);

  const enriched = (patients || []).map(p => {
    const a = assessmentMap[p.id];
    const expDate = a?.expiration_date ? new Date(a.expiration_date + "T12:00:00") : null;
    const expired = expDate && expDate < now;
    const expiringSoon = expDate && !expired && expDate < soon;
    return { ...p, assessment: a || null, expired, expiringSoon };
  });

  const filtered = filter === "no_assessment"
    ? enriched.filter(p => !p.assessment)
    : filter === "expired"
    ? enriched.filter(p => p.expired)
    : filter === "expiring"
    ? enriched.filter(p => p.expiringSoon)
    : filter === "no_insurance"
    ? enriched.filter(p => !p.insurance_provider)
    : enriched;

  const counts = {
    all: enriched.length,
    no_assessment: enriched.filter(p => !p.assessment).length,
    expired: enriched.filter(p => p.expired).length,
    expiring: enriched.filter(p => p.expiringSoon).length,
    no_insurance: enriched.filter(p => !p.insurance_provider).length,
  };

  const FILTERS = [
    { key: "all", label: "All Active", color: "bg-slate-100 text-slate-700" },
    { key: "no_assessment", label: "No Assessment", color: "bg-red-100 text-red-700" },
    { key: "expired", label: "Assessment Expired", color: "bg-red-100 text-red-700" },
    { key: "expiring", label: "Expiring Soon", color: "bg-amber-100 text-amber-700" },
    { key: "no_insurance", label: "No Insurance on File", color: "bg-blue-100 text-blue-700" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Eligibility</h1>
          <p className="text-slate-500 text-sm mt-0.5">Self-pay sliding fee assessment & insurance coverage — all active patients</p>
        </div>
      </div>

      {/* Alert cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "No Assessment", count: counts.no_assessment, color: "border-red-200 bg-red-50", textColor: "text-red-700", filter: "no_assessment" },
          { label: "Expired", count: counts.expired, color: "border-red-200 bg-red-50", textColor: "text-red-700", filter: "expired" },
          { label: "Expiring Soon", count: counts.expiring, color: "border-amber-200 bg-amber-50", textColor: "text-amber-700", filter: "expiring" },
          { label: "No Insurance", count: counts.no_insurance, color: "border-blue-200 bg-blue-50", textColor: "text-blue-700", filter: "no_insurance" },
        ].map(c => (
          <Link key={c.filter} href={`/dashboard/financial-eligibility?filter=${c.filter}`}
            className={`rounded-2xl border-2 p-4 text-center hover:shadow-sm transition-shadow ${c.color} ${filter === c.filter ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}>
            <div className={`text-3xl font-bold ${c.textColor}`}>{c.count}</div>
            <div className={`text-xs font-semibold mt-1 ${c.textColor}`}>{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {FILTERS.map(f => (
          <Link key={f.key} href={`/dashboard/financial-eligibility?filter=${f.key}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === f.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {f.label}
            {counts[f.key as keyof typeof counts] > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${f.key !== "all" ? f.color : "bg-slate-200 text-slate-600"}`}>
                {counts[f.key as keyof typeof counts]}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Patient table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="text-3xl mb-2">✅</div>
            <p className="font-semibold text-slate-700">All clear for this filter</p>
            <p className="text-sm mt-1">No patients match this criteria</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">FPL / Tier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">SFS Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Insurance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => {
                const expDate = p.assessment?.expiration_date ? new Date(p.assessment.expiration_date + "T12:00:00") : null;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/clients/${p.id}`} className="font-semibold text-slate-900 hover:text-teal-600">
                        {p.last_name}, {p.first_name}
                      </Link>
                      <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}</div>
                    </td>
                    <td className="px-4 py-4">
                      {p.assessment ? (
                        <div>
                          <span className="font-bold text-slate-900">{p.assessment.fpl_percent}%</span>
                          <div className={`mt-1 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${fplColor(p.assessment.fpl_percent)}`}>
                            {getFPLLabel(p.assessment.fpl_percent)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not assessed</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {!p.assessment ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">⚠️ Needed</span>
                      ) : p.expired ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">⛔ Expired</span>
                      ) : p.expiringSoon ? (
                        <div>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">⚠️ Expiring</span>
                          {expDate && <div className="text-xs text-slate-400 mt-1">{expDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">✓ Active</span>
                          {expDate && <div className="text-xs text-slate-400 mt-1">Exp {expDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {p.insurance_provider ? (
                        <div>
                          <div className="font-medium text-slate-900 text-xs">{p.insurance_provider}</div>
                          {p.insurance_member_id && <div className="text-xs text-slate-400">ID: {p.insurance_member_id}</div>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None on file</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <Link href={`/dashboard/clients/${p.id}/income`}
                          className="text-xs text-teal-600 font-semibold hover:text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg hover:bg-teal-50">
                          {p.assessment ? "Update SFS" : "+ SFS Assessment"}
                        </Link>
                        <Link href={`/dashboard/clients/${p.id}/edit`}
                          className="text-xs text-slate-500 font-medium hover:text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50">
                          Edit Insurance
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
