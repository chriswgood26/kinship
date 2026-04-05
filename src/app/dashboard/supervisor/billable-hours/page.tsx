import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import BillableHoursDashboardClient from "./BillableHoursDashboardClient";

export const dynamic = "force-dynamic";

export default async function BillableHoursPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, role, roles, organization_id")
    .eq("clerk_user_id", user.id)
    .single();

  const roles: string[] = profile?.roles || (profile?.role ? [profile.role] : []);
  if (!roles.some((r: string) => ["supervisor", "admin"].includes(r))) {
    redirect("/dashboard");
  }

  // Get all clinicians in the org
  const { data: clinicians } = await supabaseAdmin
    .from("user_profiles")
    .select("clerk_user_id, first_name, last_name, role")
    .eq("organization_id", profile?.organization_id || "")
    .eq("is_active", true)
    .overlaps("roles", ["clinician", "supervisor"])
    .order("last_name");

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/supervisor" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Billable Hours Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Supervisor view · Productivity benchmarks · {clinicians?.length || 0} staff members
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/supervisor"
          className="text-sm text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 font-medium"
        >
          ← Supervisor Review
        </Link>
      </div>

      <BillableHoursDashboardClient
        initialFrom={thirtyDaysAgo}
        initialTo={today}
        clinicians={clinicians || []}
        targetBillableHours={25}
        targetBillableRatio={0.7}
      />
    </div>
  );
}
