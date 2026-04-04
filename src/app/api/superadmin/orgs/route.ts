import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPERADMIN_IDS = process.env.SUPERADMIN_USER_IDS?.split(",") || [];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !SUPERADMIN_IDS.includes(userId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ data: orgs }, { data: allUsers }] = await Promise.all([
    supabaseAdmin
      .from("organizations")
      .select("id, name, plan, addons, is_active, org_type, created_at, client_terminology, disabled_forms, disabled_modules, ccbhc_reporting_enabled")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("user_profiles")
      .select("organization_id, is_active"),
  ]);

  const activeByOrg: Record<string, number> = {};
  const inactiveByOrg: Record<string, number> = {};
  (allUsers || []).forEach((u) => {
    if (!u.organization_id) return;
    if (u.is_active) activeByOrg[u.organization_id] = (activeByOrg[u.organization_id] || 0) + 1;
    else inactiveByOrg[u.organization_id] = (inactiveByOrg[u.organization_id] || 0) + 1;
  });

  return NextResponse.json({ orgs: orgs || [], activeByOrg, inactiveByOrg });
}
