import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SupervisorReviewClient from "./SupervisorReviewClient";

export const dynamic = "force-dynamic";

export default async function SupervisorPage({
  searchParams,
}: { searchParams: Promise<{ clinician?: string; from?: string; to?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, role, roles, first_name, last_name")
    .eq("clerk_user_id", user.id)
    .single();

  // Only supervisors and admins
  if (!profile?.roles?.some((r: string) => ["supervisor", "admin"].includes(r))) {
    redirect("/dashboard");
  }

  // Get all supervisees (users where supervisor_id = this user's profile id)
  const { data: supervisees } = await supabaseAdmin
    .from("user_profiles")
    .select("id, first_name, last_name, credentials, role, clerk_user_id")
    .eq("supervisor_id", profile?.id || "")
    .eq("is_active", true)
    .order("last_name");

  // Also get all clinicians in the org for admin view
  const { data: allClinicians } = await supabaseAdmin
    .from("user_profiles")
    .select("id, first_name, last_name, credentials, role, clerk_user_id, organization_id")
    .overlaps("roles", ["clinician", "supervisor"])
    .order("last_name");

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const fromDate = params.from || thirtyDaysAgo;
  const toDate = params.to || today;
  const clinicianFilter = params.clinician || "";

  // Get signed notes from supervisees needing review
  const superviseeIds = (supervisees || []).map(s => s.clerk_user_id).filter(Boolean);
  
  let notesQuery = supabaseAdmin
    .from("clinical_notes")
    .select("*, encounter:encounter_id(encounter_date, encounter_type, client:client_id(first_name, last_name, mrn, preferred_name))")
    .eq("is_signed", true)
    .eq("supervisor_signed", false)
    .gte("signed_at", fromDate + "T00:00:00")
    .lte("signed_at", toDate + "T23:59:59")
    .order("signed_at", { ascending: false })
    .limit(100);

  const { data: pendingNotes } = await notesQuery;

  // Get already co-signed notes for history
  const { data: reviewedNotes } = await supabaseAdmin
    .from("clinical_notes")
    .select("*, encounter:encounter_id(encounter_date, encounter_type, client:client_id(first_name, last_name, mrn))")
    .eq("is_signed", true)
    .eq("supervisor_signed", true)
    .gte("supervisor_signed_at", fromDate + "T00:00:00")
    .order("supervisor_signed_at", { ascending: false })
    .limit(20);

  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supervisor Review</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {supervisees?.length || 0} supervisee{(supervisees?.length || 0) !== 1 ? "s" : ""} · {pendingNotes?.length || 0} notes pending co-signature
          </p>
        </div>
        <Link
          href="/dashboard/supervisor/billable-hours"
          className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 flex items-center gap-2"
        >
          ⏱ Billable Hours Dashboard
        </Link>
      </div>

      {/* Supervisees summary */}
      {(supervisees?.length || 0) === 0 && profile?.role !== "admin" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
          ⚠️ No supervisees are assigned to you yet. Go to <Link href="/dashboard/admin/users" className="font-semibold underline">User Management</Link> and assign yourself as supervisor for clinicians you supervise.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(supervisees || []).map(s => (
            <div key={s.id} className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
              <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{s.first_name?.[0]}{s.last_name?.[0]}</div>
              <span className="text-sm font-medium text-teal-900">{s.first_name} {s.last_name}{s.credentials ? `, ${s.credentials}` : ""}</span>
            </div>
          ))}
        </div>
      )}

      <SupervisorReviewClient
        pendingNotes={pendingNotes || []}
        reviewedNotes={reviewedNotes || []}
        supervisorName={userName}
        supervisorClerkId={user.id}
        fromDate={fromDate}
        toDate={toDate}
      />
    </div>
  );
}
