import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {

  const [
    { data: orgs },
    { data: waitlist },
    { data: allUsers },
  ] = await Promise.all([
    supabaseAdmin.from("organizations").select("id, name, plan, requested_plan, addons, is_active, org_type, created_at, client_terminology, user_profiles(count)").order("created_at", { ascending: false }),
    supabaseAdmin.from("waitlist").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("user_profiles").select("organization_id, is_active"),
  ]);

  // Calculate MRR
  const PLAN_MRR: Record<string, number> = { starter: 149, growth: 349, practice: 599, agency: 899, custom: 0 };
  const mrr = (orgs || []).filter(o => o.is_active).reduce((s, o) => s + (PLAN_MRR[o.plan || "starter"] || 0), 0);
  const arr = mrr * 12;

  // Active and inactive user counts per org
  const userCountByOrg: Record<string, number> = {};
  const activeUserCountByOrg: Record<string, number> = {};
  const inactiveUserCountByOrg: Record<string, number> = {};
  (allUsers || []).forEach(u => {
    if (u.organization_id) {
      userCountByOrg[u.organization_id] = (userCountByOrg[u.organization_id] || 0) + 1;
      if (u.is_active) {
        activeUserCountByOrg[u.organization_id] = (activeUserCountByOrg[u.organization_id] || 0) + 1;
      } else {
        inactiveUserCountByOrg[u.organization_id] = (inactiveUserCountByOrg[u.organization_id] || 0) + 1;
      }
    }
  });

  return (
    <AdminClient
      orgs={orgs || []}
      waitlist={waitlist || []}
      userCountByOrg={userCountByOrg}
      activeUserCountByOrg={activeUserCountByOrg}
      inactiveUserCountByOrg={inactiveUserCountByOrg}
      mrr={mrr}
      arr={arr}
    />
  );
}
