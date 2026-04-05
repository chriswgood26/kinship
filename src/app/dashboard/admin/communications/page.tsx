import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CommunicationsClient from "./CommunicationsClient";

export const dynamic = "force-dynamic";

export default async function CommunicationsAdminPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, role")
    .eq("clerk_user_id", user.id)
    .single();

  const orgId = profile?.organization_id;
  if (!orgId) redirect("/sign-in");

  const [rulesRes, templatesRes, optOutsRes, deliveryRes] = await Promise.all([
    supabaseAdmin
      .from("comm_rules")
      .select("*, comm_templates(id, name, channel)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("comm_templates")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("comm_opt_outs")
      .select("*, clients(first_name, last_name, email, phone_primary)")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("opted_out_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("comm_delivery_log")
      .select("*, clients(first_name, last_name)")
      .eq("organization_id", orgId)
      .order("sent_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/settings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communications Automation</h1>
          <p className="text-slate-500 text-sm mt-0.5">Event-triggered notifications, configurable rules, message templates, opt-out tracking</p>
        </div>
      </div>

      <CommunicationsClient
        rules={rulesRes.data || []}
        templates={templatesRes.data || []}
        optOuts={optOutsRes.data || []}
        deliveryLogs={deliveryRes.data || []}
      />
    </div>
  );
}
