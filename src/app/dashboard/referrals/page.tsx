import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import ReferralEditButton from "@/components/ReferralEditButton";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-teal-100 text-teal-700",
  completed: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-600",
  cancelled: "bg-slate-100 text-slate-500",
};

const TYPE_COLORS: Record<string, string> = {
  incoming: "bg-blue-100 text-blue-700",
  outgoing: "bg-purple-100 text-purple-700",
  internal: "bg-teal-100 text-teal-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  routine: "text-slate-500",
  urgent: "text-amber-600",
  emergent: "text-red-600",
};

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; q?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const type = params.type || "";
  const status = params.status || "";
  const q = (params.q || "").toLowerCase();

  // Get org slug for external intake link
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = profile?.organization_id || "34e600b3-beb0-440c-88c4-20032185e727";
  const { data: orgData } = await supabaseAdmin
    .from("organizations")
    .select("slug")
    .eq("id", orgId)
    .single();
  const orgSlug = orgData?.slug;

  let query = supabaseAdmin
    .from("referrals")
    .select("*, client:client_id(first_name, last_name, mrn)")
    .order("referral_date", { ascending: false })
    .limit(50);

  if (type) query = query.eq("referral_type", type);
  if (status) query = query.eq("status", status);

  let { data: referrals } = await query;
  if (q && referrals) {
    referrals = referrals.filter(r => {
      const patientName = `${r.patient?.first_name || ''} ${r.patient?.last_name || ''}`.toLowerCase();
      const referredTo = (r.referred_to || '').toLowerCase();
      const referredOrg = (r.referred_to_org || '').toLowerCase();
      const referredBy = (r.referred_by || '').toLowerCase();
      const notes = (r.notes || '').toLowerCase();
      // Extract applicant name from notes for incoming referrals
      const applicantMatch = notes.match(/applicant: ([^|\n]+)/i);
      const applicantName = applicantMatch ? applicantMatch[1].trim().toLowerCase() : '';
      return patientName.includes(q) || referredTo.includes(q) || referredOrg.includes(q) || referredBy.includes(q) || applicantName.includes(q);
    });
  }

  const counts = {
    all: referrals?.length || 0,
    incoming: referrals?.filter(r => r.referral_type === "incoming").length || 0,
    outgoing: referrals?.filter(r => r.referral_type === "outgoing").length || 0,
    pending: referrals?.filter(r => r.status === "pending").length || 0,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Referrals</h1>
          <p className="text-slate-500 text-sm mt-0.5">Incoming, outgoing, and internal referrals</p>
        </div>
        <div className="flex items-center gap-2">
          {orgSlug && (
            <Link
              href={`/intake/${orgSlug}`}
              target="_blank"
              className="border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm flex items-center gap-1.5">
              <span>🔗</span> Intake Form Link
            </Link>
          )}
          <Link href="/dashboard/referrals/new"
            className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
            + New Referral
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.all, color: "bg-slate-50 border-slate-200" },
          { label: "Incoming", value: counts.incoming, color: "bg-blue-50 border-blue-100" },
          { label: "Outgoing", value: counts.outgoing, color: "bg-purple-50 border-purple-100" },
          { label: "Pending Action", value: counts.pending, color: "bg-amber-50 border-amber-100" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <SearchInput placeholder="Search patient, provider, organization..." />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {["", "incoming", "outgoing", "internal"].map(t => (
            <Link key={t} href={`/dashboard/referrals?type=${t}&status=${status}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${type === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {t || "All Types"}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {["", "pending", "accepted", "completed"].map(s => (
            <Link key={s} href={`/dashboard/referrals?type=${type}&status=${s}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${status === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {s || "All Statuses"}
            </Link>
          ))}
        </div>
      </div>

      {/* Referrals list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!referrals || referrals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🔄</div>
            <p className="font-semibold text-slate-900 mb-1">
              {status ? `No ${status} referrals yet` : "No referrals yet"}
            </p>
            <p className="text-slate-500 text-sm mb-4">
              {status ? `No referrals with status "${status}" were found` : "Create your first referral to get started"}
            </p>
            <Link href="/dashboard/referrals/new"
              className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
              + New Referral
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient / Applicant</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Referred To/From</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {referrals.map(ref => {
                const patient = Array.isArray(ref.patient) ? ref.patient[0] : ref.patient;
                return (
                  <tr key={ref.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/referrals/${ref.id}`} className="no-underline">
                        <div className="font-semibold text-slate-900 text-sm hover:text-teal-600 transition-colors">
                          {patient
                            ? `${patient.last_name}, ${patient.first_name}`
                            : ref.referral_type === "incoming" && ref.notes
                            ? (() => {
                                const match = ref.notes.match(/^Applicant: ([^\|]+)/);
                                return match ? match[1].trim() : "Pending intake";
                              })()
                            : "Pending intake"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {patient?.mrn || (ref.referral_type === "incoming" ? "Applicant" : "—")}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${TYPE_COLORS[ref.referral_type]}`}>
                        {ref.referral_type}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      <div>{ref.referral_type === "incoming" ? ref.referred_by : ref.referred_to}</div>
                      {ref.referred_to_org && <div className="text-xs text-slate-400">{ref.referred_to_org}</div>}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {new Date(ref.referral_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold capitalize ${PRIORITY_COLORS[ref.priority || "routine"]}`}>
                        {ref.priority || "routine"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[ref.status]}`}>
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {ref.referral_type === "incoming" && !ref.client_id && (
                          <Link
                            href={`/dashboard/clients/new?from_referral=${ref.id}&notes=${encodeURIComponent(ref.notes || "")}`}
                            className="text-xs bg-teal-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-teal-400 whitespace-nowrap">
                            Convert to Patient
                          </Link>
                        )}
                        <ReferralEditButton referral={ref} />
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
