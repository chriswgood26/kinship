import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import SessionTimeout from "@/components/SessionTimeout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role, organization:organization_id(name, client_terminology)")
    .eq("clerk_user_id", user.id)
    .single();

  const org = Array.isArray(profile?.organization) ? profile?.organization[0] : profile?.organization;
  const term = org?.client_terminology || "client";
  const termPlural = term === "client" ? "Clients" : term === "patient" ? "Patients" : term === "individual" ? "Individuals" : term.charAt(0).toUpperCase() + term.slice(1) + "s";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <SessionTimeout />
      <Sidebar orgName={org?.name} clientTermPlural={termPlural} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar firstName={user.firstName} lastName={user.lastName} role={profile?.role} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
