import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  // Verify requester is supervisor or admin
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, roles, role")
    .eq("clerk_user_id", userId)
    .single();

  const roles: string[] = profile?.roles || (profile?.role ? [profile.role] : []);
  if (!roles.some((r) => ["supervisor", "admin"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const clinicianId = req.nextUrl.searchParams.get("clinician_id") || null;

  // Fetch time entries for the org in the date range
  let query = supabaseAdmin
    .from("time_entries")
    .select("clinician_clerk_id, clinician_name, clinician_role, duration_minutes, is_billable, activity_type, entry_date, status")
    .eq("organization_id", orgId);

  if (from) query = query.gte("entry_date", from);
  if (to) query = query.lte("entry_date", to);
  if (clinicianId) query = query.eq("clinician_clerk_id", clinicianId);

  const { data: entries, error } = await query.limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type ClinicianAgg = {
    clerk_id: string;
    name: string;
    role: string;
    total_minutes: number;
    billable_minutes: number;
    by_activity: Record<string, { total: number; billable: number }>;
    entry_count: number;
  };

  // Aggregate by clinician
  const map = new Map<string, ClinicianAgg>();

  for (const e of entries || []) {
    const key = e.clinician_clerk_id || "unknown";
    const existing: ClinicianAgg = map.get(key) || {
      clerk_id: key,
      name: e.clinician_name || "Unknown",
      role: e.clinician_role || "clinician",
      total_minutes: 0,
      billable_minutes: 0,
      by_activity: {} as Record<string, { total: number; billable: number }>,
      entry_count: 0,
    };
    existing.total_minutes += e.duration_minutes || 0;
    if (e.is_billable) existing.billable_minutes += e.duration_minutes || 0;
    existing.entry_count++;
    const act: string = e.activity_type || "other";
    if (!existing.by_activity[act]) existing.by_activity[act] = { total: 0, billable: 0 };
    existing.by_activity[act].total += e.duration_minutes || 0;
    if (e.is_billable) existing.by_activity[act].billable += e.duration_minutes || 0;
    map.set(key, existing);
  }

  const clinicians = Array.from(map.values()).sort((a, b) => b.billable_minutes - a.billable_minutes);

  // Org totals
  const org_total_minutes = clinicians.reduce((s, c) => s + c.total_minutes, 0);
  const org_billable_minutes = clinicians.reduce((s, c) => s + c.billable_minutes, 0);

  return NextResponse.json({ clinicians, org_total_minutes, org_billable_minutes });
}
