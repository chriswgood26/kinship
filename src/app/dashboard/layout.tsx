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

  // Enforce MFA for all staff — skip check only on the MFA setup page itself
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  if (!user.twoFactorEnabled && pathname !== "/dashboard/mfa-setup") {
    redirect("/dashboard/mfa-setup");
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role, title, organization_id")
    .eq("clerk_user_id", user.id)
    .single();

  const orgId = profile?.organization_id || "34e600b3-beb0-440c-88c4-20032185e727";

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("client_terminology, plan")
    .eq("id", orgId)
    .single();

  const terminology = getTerminology(org?.client_terminology);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-teal-500 z-[9999]" />
      <UpdateBanner />
      <SessionTimeout />
      <div className="flex h-screen bg-slate-50 overflow-hidden pt-[3px]">
        <Sidebar terminology={terminology} userRole={profile?.role || "clinician"} plan={org?.plan || "starter"} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar user={{ firstName: user.firstName, lastName: user.lastName, email: user.emailAddresses[0]?.emailAddress, role: profile?.role, title: profile?.title }} />
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
