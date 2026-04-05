import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import ClaimAppealsClient from "./ClaimAppealsClient";

export const dynamic = "force-dynamic";

export default async function ClaimAppealsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await getOrgId(userId);

  // Fetch existing appeal records with nested denial + charge + client
  const { data: appeals } = await supabaseAdmin
    .from("claim_appeals")
    .select(`
      *,
      denial:denial_id(
        id, denial_date, denial_reason_code, denial_reason_description,
        denial_category, payer_name, payer_claim_number, denied_amount,
        charge:charge_id(
          id, service_date, cpt_code, cpt_description, charge_amount,
          client:client_id(id, first_name, last_name, mrn)
        )
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(300);

  // Fetch open denials that don't yet have an appeal filed (appeal_status = none or in_progress)
  const { data: appealableDenials } = await supabaseAdmin
    .from("claim_denials")
    .select(`
      id, denial_date, denial_reason_code, denial_reason_description,
      payer_name, payer_claim_number, denied_amount, appeal_status,
      charge:charge_id(
        id, service_date, cpt_code, cpt_description, charge_amount,
        client:client_id(id, first_name, last_name, mrn)
      )
    `)
    .eq("organization_id", orgId)
    .in("appeal_status", ["none", "in_progress", "submitted"])
    .is("resolution", null)
    .order("denial_date", { ascending: false })
    .limit(200);

  return (
    <ClaimAppealsClient
      initialAppeals={appeals || []}
      appealableDenials={appealableDenials || []}
    />
  );
}
