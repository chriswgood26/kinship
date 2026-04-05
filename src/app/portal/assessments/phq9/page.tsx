import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PortalAssessmentForm from "../PortalAssessmentForm";
import { PHQ9 } from "@/lib/screenings";

export const dynamic = "force-dynamic";

export default async function PortalPHQ9Page() {
  const user = await currentUser();
  if (!user) redirect("/portal/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("id")
    .eq("clerk_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!portalUser) redirect("/portal/dashboard");

  return (
    <Suspense fallback={<div className="p-8 text-slate-400 text-center">Loading questionnaire...</div>}>
      <PortalAssessmentForm tool={PHQ9} />
    </Suspense>
  );
}
