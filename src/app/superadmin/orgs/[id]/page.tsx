import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import OrgDetailClient from "./OrgDetailClient";

export const dynamic = "force-dynamic";

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [
    { data: org },
    { data: users },
    { data: feedback },
    { data: charges },
  ] = await Promise.all([
    supabaseAdmin.from("organizations").select("*").eq("id", id).single(),
    supabaseAdmin
      .from("user_profiles")
      .select("id, first_name, last_name, email, role, is_active, created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("feedback")
      .select("id, type, problem, impact, ideal, status, created_at, submitted_by_name, submitted_by_email, admin_notes")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("charges")
      .select("amount, status, created_at")
      .eq("organization_id", id),
  ]);

  if (!org) redirect("/superadmin");

  const lifetimeRevenue = (charges || [])
    .filter((c) => ["posted", "paid", "submitted"].includes(c.status || ""))
    .reduce((sum, c) => sum + (parseFloat(String(c.amount)) || 0), 0);

  return (
    <OrgDetailClient
      org={org}
      users={users || []}
      feedback={feedback || []}
      lifetimeRevenue={lifetimeRevenue}
    />
  );
}
