import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import WorkflowRulesClient from "./WorkflowRulesClient";

export const dynamic = "force-dynamic";

export default async function WorkflowRulesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, role, roles")
    .eq("clerk_user_id", user.id)
    .single();

  const orgId = profile?.organization_id;
  if (!orgId) redirect("/sign-in");

  const roles: string[] = profile?.roles || [profile?.role || "clinician"];
  const isAdmin = roles.some(r => ["admin", "superadmin"].includes(r));
  if (!isAdmin) redirect("/dashboard");

  const { data: rules } = await supabaseAdmin
    .from("workflow_rules")
    .select("*")
    .eq("organization_id", orgId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/settings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workflow Rules Engine</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configurable business rules for clinical workflows — automate alerts, flags, and requirements based on clinical events
          </p>
        </div>
      </div>

      <WorkflowRulesClient initialRules={rules || []} />
    </div>
  );
}
