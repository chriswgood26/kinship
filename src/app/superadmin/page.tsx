import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

const SUPERADMIN_IDS = process.env.SUPERADMIN_USER_IDS?.split(",") || [];

export default async function SuperAdminPage() {
  const user = await currentUser();
  if (!user || !SUPERADMIN_IDS.includes(user.id)) redirect("/dashboard");

  const [
    { data: orgs },
    { data: waitlist },
    { data: allUsers },
  ] = await Promise.all([
    supabaseAdmin.from("organizations").select("*, user_profiles(count)").order("created_at", { ascending: false }),
    supabaseAdmin.from("waitlist").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("user_profiles").select("organization_id, is_active"),
  ]);

  // Calculate MRR
  const PLAN_MRR: Record<string, number> = { starter: 149, growth: 349, practice: 599, agency: 899, custom: 0 };
  const mrr = (orgs || []).filter(o => o.is_active).reduce((s, o) => s + (PLAN_MRR[o.plan || "starter"] || 0), 0);
  const arr = mrr * 12;

  // User counts per org
  const userCountByOrg: Record<string, number> = {};
  (allUsers || []).forEach(u => {
    if (u.organization_id) userCountByOrg[u.organization_id] = (userCountByOrg[u.organization_id] || 0) + 1;
  });

  return (
    <AdminClient
      orgs={orgs || []}
      waitlist={waitlist || []}
      userCountByOrg={userCountByOrg}
      mrr={mrr}
      arr={arr}
    />
  );
}
