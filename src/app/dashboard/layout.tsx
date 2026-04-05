import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTerminology } from "@/lib/terminology";
import { TerminologyProvider } from "@/components/TerminologyProvider";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import UpdateBanner from "@/components/UpdateBanner";
import SessionTimeout from "@/components/SessionTimeout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // MFA enforcement — disabled until Clerk plan supports MFA
  // TODO: Re-enable when Clerk is upgraded to a plan with MFA support
  // const headersList = await headers();
  // const pathname = headersList.get("x-pathname") || "";
  // if (!user.twoFactorEnabled && pathname !== "/dashboard/mfa-setup") {
  //   redirect("/dashboard/mfa-setup");
  // }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role, roles, title, organization_id")
    .eq("clerk_user_id", user.id)
    .single();

  const orgId = profile?.organization_id;
  if (!orgId) redirect("/sign-in");

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("client_terminology, plan, name")
    .eq("id", orgId)
    .single();

  const terminology = getTerminology(org?.client_terminology);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-teal-500 z-[9999]" />
      <UpdateBanner />
      <SessionTimeout />
      <div className="flex h-screen bg-slate-50 overflow-hidden pt-[3px]">
        <Sidebar terminology={terminology} userRoles={profile?.roles || [profile?.role || "clinician"]} plan={org?.plan || "starter"} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar user={{ firstName: user.firstName, lastName: user.lastName, email: user.emailAddresses[0]?.emailAddress, roles: profile?.roles || [profile?.role || "clinician"], title: profile?.title }} orgName={org?.name ?? undefined} />
          <main className="flex-1 overflow-auto p-6">
            <TerminologyProvider terminology={terminology}>
              {children}
            </TerminologyProvider>
          </main>
        </div>
      </div>
    </>
  );
}
